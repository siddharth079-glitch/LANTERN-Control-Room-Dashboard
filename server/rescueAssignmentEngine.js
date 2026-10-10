/**
 * LANTERN Rescue Assignment Engine (v1.1.0)
 * 
 * Recommends and ranks response resources based on Section 10 of the LANTERN Roadmap:
 * - Capability match against incident hazards & emergency types
 * - Travel time & distance estimation (Haversine formula in disaster terrain)
 * - Team availability & current active workload penalty
 * - Transparent explanation ("Why recommended" + alternatives)
 * - Safe dynamic reassignment impact preview
 */

// Haversine distance calculation in kilometers
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 5.0; // fallback default
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Estimate travel time (min) in damaged infrastructure (approx 30 km/h avg speed)
function estimateTravelTimeMinutes(distanceKm) {
  const avgSpeedKmH = 28; // rubble and grid disruption speed
  const hours = distanceKm / avgSpeedKmH;
  return Math.max(3, Math.round(hours * 60));
}

// Map incident emergency types to required team capabilities
function getRequiredCapabilities(emergencyType, hazards = []) {
  const req = [];
  const type = (emergencyType || '').toUpperCase();

  if (type === 'TRAPPED' || type === 'BUILDING_COLLAPSE') {
    req.push('STRUCTURAL_COLLAPSE', 'HEAVY_EXTRICATION');
  } else if (type === 'FIRE') {
    req.push('FIRE_SUPPRESSION');
  } else if (type === 'MEDICAL' || type === 'MEDICAL_INJURY') {
    req.push('ADVANCED_MEDICAL_TRIAGE');
  } else if (type === 'EVACUATION') {
    req.push('EVACUATION_TRANSPORT');
  } else if (type === 'SUPPLIES' || type === 'SUPPLIES_WATER') {
    req.push('LOGISTICS_SUPPLY');
  } else if (type === 'MISSING' || type === 'MISSING_PERSON') {
    req.push('SEARCH_AND_RESCUE', 'DRONE_RECON');
  }

  // Hazards check
  hazards.forEach((h) => {
    const hz = h.toLowerCase();
    if (hz.includes('gas') || hz.includes('chem') || hz.includes('hazmat')) {
      if (!req.includes('HAZMAT_CONTAINMENT')) req.push('HAZMAT_CONTAINMENT');
    }
    if (hz.includes('flood') || hz.includes('water')) {
      if (!req.includes('SWIFTWATER_RESCUE')) req.push('SWIFTWATER_RESCUE');
    }
    if (hz.includes('bleeding') || hz.includes('unconscious')) {
      if (!req.includes('ADVANCED_MEDICAL_TRIAGE')) req.push('ADVANCED_MEDICAL_TRIAGE');
    }
  });

  if (req.length === 0) {
    req.push('GENERAL_RESCUE');
  }

  return req;
}

/**
 * Ranks all eligible teams and provides detailed recommendation reasoning.
 * @param {Object} incident The target incident object
 * @param {Array} teams List of available team records
 * @param {Array} activeIncidents List of all active incidents (to detect conflicts/workload)
 */
function rankRescueTeams(incident, teams = [], activeIncidents = []) {
  const incLocation = incident.payload?.location || { latitude: 37.7749, longitude: -122.4194 };
  const requiredCaps = getRequiredCapabilities(incident.payload?.emergency_type, incident.payload?.hazards);
  const victimsCount = incident.payload?.people_affected || 1;

  const evaluatedCandidates = teams.map((team) => {
    // 1. Capability match check
    const matchedCaps = requiredCaps.filter((cap) => team.capabilities.includes(cap));
    const capabilityScore = (matchedCaps.length / requiredCaps.length) * 50;

    // 2. Distance and ETA
    const distanceKm = calculateDistanceKm(
      incLocation.latitude,
      incLocation.longitude,
      team.current_location?.latitude || incLocation.latitude + 0.02,
      team.current_location?.longitude || incLocation.longitude + 0.02
    );
    const etaMinutes = estimateTravelTimeMinutes(distanceKm);
    // Lower ETA gets higher score (max 30 pts)
    const etaScore = Math.max(0, 30 - etaMinutes * 0.7);

    // 3. Status and Workload penalty
    let statusScore = 0;
    let workloadPenalty = 0;
    let conflictIncident = null;

    if (team.status === 'AVAILABLE') {
      statusScore = 20;
    } else if (team.status === 'RETURNING') {
      statusScore = 12;
      workloadPenalty = 5;
    } else if (team.status === 'ASSIGNED' || team.status === 'EN_ROUTE') {
      statusScore = 5;
      workloadPenalty = 20;
      conflictIncident = activeIncidents.find((inc) => inc.assigned_team_id === team.id);
    } else {
      // ON_SCENE, RESTING, OFFLINE
      statusScore = -50;
      workloadPenalty = 50;
    }

    // 4. Capacity fit
    const capacityFit = team.personnel_count >= victimsCount ? 5 : 2;

    const totalScore = Math.round(capabilityScore + etaScore + statusScore + capacityFit - workloadPenalty);

    return {
      team_id: team.id,
      team_name: team.name,
      team_type: team.type,
      status: team.status,
      personnel_count: team.personnel_count,
      equipment: team.equipment,
      distance_km: Number(distanceKm.toFixed(1)),
      eta_minutes: etaMinutes,
      matched_capabilities: matchedCaps,
      missing_capabilities: requiredCaps.filter((cap) => !team.capabilities.includes(cap)),
      ranking_score: totalScore,
      conflict_incident: conflictIncident ? { id: conflictIncident.id, title: conflictIncident.payload?.emergency_type } : null,
      explanation_points: [
        matchedCaps.length === requiredCaps.length
          ? 'Full capability match for emergency type and hazards'
          : `Partial capability match (${matchedCaps.join(', ')})`,
        `Estimated travel time: ~${etaMinutes} mins (${distanceKm.toFixed(1)} km)`,
        `Available personnel: ${team.personnel_count} responders (victim count: ${victimsCount})`,
        team.status === 'AVAILABLE'
          ? 'Unit is immediately operational with zero active assignments'
          : `Unit is currently ${team.status}${conflictIncident ? ` on #${conflictIncident.id.slice(0, 8)}` : ''}`,
      ],
    };
  });

  // Filter out completely offline or resting teams if active ones exist, sort by score descending
  evaluatedCandidates.sort((a, b) => b.ranking_score - a.ranking_score);

  const topMatch = evaluatedCandidates[0] || null;
  const alternatives = evaluatedCandidates.slice(1, 4);

  return {
    incident_id: incident.id,
    required_capabilities: requiredCaps,
    recommended_team: topMatch,
    alternatives,
    reassignment_warning: topMatch && topMatch.conflict_incident
      ? `Attention: Reassigning ${topMatch.team_name} will withdraw them from active incident #${topMatch.conflict_incident.id.slice(0, 8)}!`
      : null,
  };
}

module.exports = {
  rankRescueTeams,
  getRequiredCapabilities,
  calculateDistanceKm,
  estimateTravelTimeMinutes,
};

/**
 * LANTERN Flame Engine - Prioritization Rules Engine (v1.2.0)
 * 
 * Deterministic, fully explainable scoring based on Section 9 of LANTERN Roadmap:
 * - Immediate life threat (0-35)
 * - People affected (0-20)
 * - Injury severity (0-20)
 * - Structural/fire/environmental hazards (0-15)
 * - Waiting time (0-10)
 * - Vulnerability indicators (0-10)
 * - Location confidence & response window factors
 */

const ENGINE_VERSION = 'v1.2.0-deterministic';

/**
 * Calculates deterministic Flame priority score, categories, and explainability breakdown.
 * @param {Object} incidentPayload SOS message payload
 * @param {number} waitingMinutes Minutes elapsed since incident creation
 * @param {Object} [options] Additional operational parameters
 */
function evaluateFlamePriority(incidentPayload, waitingMinutes = 0, options = {}) {
  const breakdown = {
    immediateLifeThreat: 0,
    peopleAffected: 0,
    injurySeverity: 0,
    hazards: 0,
    waitingTime: 0,
    vulnerabilities: 0,
  };
  const reasons = [];

  const {
    emergency_type = 'OTHER',
    severity = 'MEDIUM',
    people_affected = 1,
    injuries = 0,
    hazards = [],
    vulnerabilities = [],
    location = {},
    manual_override = null,
  } = incidentPayload;

  // 1. Immediate Life Threat (0 - 35 points)
  const normType = (emergency_type || '').toUpperCase();
  const normSeverity = (severity || '').toUpperCase();

  if (normType === 'TRAPPED' || normType === 'BUILDING_COLLAPSE') {
    breakdown.immediateLifeThreat += 35;
    reasons.push('Active structural collapse / victims trapped under rubble (+35)');
  } else if (normType === 'FIRE') {
    breakdown.immediateLifeThreat += normSeverity === 'CRITICAL' ? 32 : 24;
    reasons.push(`Active fire threat with ${normSeverity.toLowerCase()} escalation risk (+${breakdown.immediateLifeThreat})`);
  } else if (normType === 'MEDICAL' || normType === 'MEDICAL_INJURY') {
    if (normSeverity === 'CRITICAL') {
      breakdown.immediateLifeThreat += 30;
      reasons.push('Life-threatening medical trauma / uncontrolled bleeding (+30)');
    } else {
      breakdown.immediateLifeThreat += 18;
      reasons.push('Medical emergency requiring field stabilization (+18)');
    }
  } else if (normType === 'EVACUATION') {
    breakdown.immediateLifeThreat += normSeverity === 'CRITICAL' ? 25 : 15;
    reasons.push(`Emergency evacuation cutoff (+${breakdown.immediateLifeThreat})`);
  } else if (normType === 'SUPPLIES' || normType === 'SUPPLIES_WATER') {
    breakdown.immediateLifeThreat += normSeverity === 'CRITICAL' ? 15 : 8;
    reasons.push(`Critical resource depletion (+${breakdown.immediateLifeThreat})`);
  } else if (normType === 'MISSING' || normType === 'MISSING_PERSON') {
    breakdown.immediateLifeThreat += 16;
    reasons.push('Missing person search in disaster zone (+16)');
  } else {
    breakdown.immediateLifeThreat += 10;
    reasons.push('General distress report (+10)');
  }

  // 2. People Affected (0 - 20 points)
  const count = Number(people_affected) || 1;
  if (count >= 10) {
    breakdown.peopleAffected = 20;
    reasons.push(`Mass casualty exposure: ${count} people reported (+20)`);
  } else if (count >= 5) {
    breakdown.peopleAffected = 16;
    reasons.push(`High victim count: ${count} people affected (+16)`);
  } else if (count >= 3) {
    breakdown.peopleAffected = 12;
    reasons.push(`Multiple individuals affected: ${count} people (+12)`);
  } else if (count >= 2) {
    breakdown.peopleAffected = 8;
    reasons.push(`Multiple victims: ${count} people (+8)`);
  } else {
    breakdown.peopleAffected = 5;
    reasons.push(`Single individual affected (+5)`);
  }

  // 3. Injury Severity (0 - 20 points)
  const injuryCount = Number(injuries) || 0;
  if (injuryCount > 0) {
    if (normSeverity === 'CRITICAL' || hazards.includes('severe_bleeding') || hazards.includes('unconscious')) {
      breakdown.injurySeverity = 20;
      reasons.push(`${injuryCount} critical/unconscious/severe hemorrhage injury reported (+20)`);
    } else if (injuryCount >= 3) {
      breakdown.injurySeverity = 16;
      reasons.push(`Multiple injured casualties (${injuryCount}) requiring field triage (+16)`);
    } else {
      breakdown.injurySeverity = Math.min(20, 10 + injuryCount * 2);
      reasons.push(`${injuryCount} injury(ies) documented (+${breakdown.injurySeverity})`);
    }
  }

  // 4. Structural / Fire / Environmental Hazards (0 - 15 points)
  const hazardList = Array.isArray(hazards) ? hazards : [];
  let hazardScore = 0;
  hazardList.forEach((h) => {
    const hz = h.toLowerCase();
    if (hz.includes('collapse') || hz.includes('unstable') || hz.includes('gas_leak')) {
      hazardScore += 6;
    } else if (hz.includes('fire') || hz.includes('smoke') || hz.includes('flood') || hz.includes('electrical')) {
      hazardScore += 5;
    } else if (hz.includes('chemical') || hz.includes('hazmat') || hz.includes('downed_wires')) {
      hazardScore += 6;
    } else {
      hazardScore += 3;
    }
  });
  breakdown.hazards = Math.min(15, hazardScore);
  if (breakdown.hazards > 0) {
    reasons.push(`Active secondary hazards: [${hazardList.join(', ')}] (+${breakdown.hazards})`);
  }

  // 5. Waiting Time Factor (0 - 10 points) - +1 per 3 minutes unserviced
  const waitMin = Math.max(0, Number(waitingMinutes) || 0);
  breakdown.waitingTime = Math.min(10, Math.floor(waitMin / 3));
  if (breakdown.waitingTime > 0) {
    reasons.push(`Elapsed wait duration without dispatch: ${waitMin} min (+${breakdown.waitingTime})`);
  }

  // 6. Vulnerabilities (0 - 10 points)
  const vulnList = Array.isArray(vulnerabilities) ? vulnerabilities : [];
  let vulnCount = vulnList.length;
  if (vulnCount > 0) {
    breakdown.vulnerabilities = Math.min(10, vulnCount * 4);
    reasons.push(`Vulnerable populations identified: [${vulnList.join(', ')}] (+${breakdown.vulnerabilities})`);
  }

  // Total raw score (0 - 100)
  const rawScore = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
  const cappedScore = Math.min(100, Math.max(0, rawScore));

  // Determine Priority Category
  let category = 'LOW';
  if (cappedScore >= 80) {
    category = 'CRITICAL';
  } else if (cappedScore >= 60) {
    category = 'HIGH';
  } else if (cappedScore >= 35) {
    category = 'MEDIUM';
  } else {
    category = 'LOW';
  }

  // Safeguard: Location confidence is kept separate from life-value score
  const accuracy = location && location.accuracy_meters ? Number(location.accuracy_meters) : 999;
  let confidenceLevel = 'MEDIUM';
  if (location && location.latitude && location.longitude) {
    if (accuracy <= 30) confidenceLevel = 'HIGH';
    else if (accuracy <= 100) confidenceLevel = 'MEDIUM';
    else confidenceLevel = 'LOW';
  } else {
    confidenceLevel = 'MANUAL_LANDMARK';
  }

  return {
    engine_version: ENGINE_VERSION,
    calculated_at: new Date().toISOString(),
    score: manual_override ? manual_override.override_score : cappedScore,
    raw_calculated_score: cappedScore,
    category: manual_override ? manual_override.override_category : category,
    raw_category: category,
    breakdown,
    reasons,
    confidence: {
      level: confidenceLevel,
      accuracy_meters: accuracy === 999 ? 'Unknown/Landmark' : `${accuracy}m`,
      source: location?.source || 'MANUAL',
    },
    is_overridden: Boolean(manual_override),
    override_meta: manual_override || null,
  };
}

module.exports = {
  evaluateFlamePriority,
  ENGINE_VERSION,
};

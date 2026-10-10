/**
 * LANTERN In-Memory Incident Store & Audit Journal
 * 
 * Manages incident lifecycles, deduplication, audit trails, and engine evaluations.
 */

const { evaluateFlamePriority } = require('./flameEngine');
const { rankRescueTeams } = require('./rescueAssignmentEngine');
const { verifyEnvelope } = require('./messageVerification');
const { INITIAL_TEAMS, INITIAL_GATEWAYS, INITIAL_INCIDENTS_SEED } = require('./mockData');

class IncidentStore {
  constructor() {
    this.incidents = new Map();
    this.processedMessageIds = new Set();
    this.teams = new Map();
    this.gateways = new Map();
    this.auditLog = [];
    this.reset();
  }

  reset() {
    this.incidents.clear();
    this.processedMessageIds.clear();
    this.teams.clear();
    this.gateways.clear();
    this.auditLog = [];

    // Initialize Teams
    INITIAL_TEAMS.forEach((team) => {
      this.teams.set(team.id, { ...team });
    });

    // Initialize Gateways
    INITIAL_GATEWAYS.forEach((gw) => {
      this.gateways.set(gw.id, { ...gw });
    });

    // Seed Initial Incidents
    INITIAL_INCIDENTS_SEED.forEach((seed) => {
      const envelope = seed.envelope;
      this.processedMessageIds.add(envelope.message_id);

      const createdTime = new Date(envelope.created_at).getTime();
      const waitingMinutes = Math.floor((Date.now() - createdTime) / 60000);
      const flame = evaluateFlamePriority(envelope.payload, waitingMinutes);

      const incident = {
        id: envelope.incident_id,
        primary_message_id: envelope.message_id,
        schema_version: envelope.schema_version,
        origin_device_key_id: envelope.origin_device_key_id,
        created_at: envelope.created_at,
        received_at: new Date().toISOString(),
        status: seed.status,
        hop_count: envelope.hop_count,
        payload: envelope.payload,
        flame_evaluation: flame,
        assigned_team_id: seed.assigned_team_id,
        relayed_via: seed.relayed_via || [],
        audit_trail: [
          {
            timestamp: envelope.created_at,
            actor: 'ORIGIN_DEVICE',
            action: 'SOS_CREATED',
            details: `Created offline on device ${envelope.origin_device_key_id}`,
          },
          {
            timestamp: new Date(Date.now() - 300000).toISOString(),
            actor: seed.relayed_via[seed.relayed_via.length - 1] || 'GATEWAY_01',
            action: 'GATEWAY_INGESTION',
            details: `Ingested via gateway with ${envelope.hop_count} hops`,
          },
          {
            timestamp: new Date(Date.now() - 250000).toISOString(),
            actor: 'FLAME_ENGINE',
            action: 'PRIORITY_EVALUATED',
            details: `Calculated priority ${flame.category} (Score: ${flame.score})`,
          },
        ],
      };

      if (seed.assigned_team_id) {
        const team = this.teams.get(seed.assigned_team_id);
        if (team) {
          team.status = 'ASSIGNED';
          incident.audit_trail.push({
            timestamp: new Date(Date.now() - 100000).toISOString(),
            actor: 'DISPATCHER_SARAH',
            action: 'TEAM_ASSIGNED',
            details: `Dispatched ${team.name} to scene`,
          });
        }
      }

      this.incidents.set(incident.id, incident);
    });

    this.logAudit('SYSTEM', 'RESET_INIT', 'Disaster state initialized with Metro 7.1 scenario');
  }

  logAudit(actor, action, details, incidentId = null) {
    const entry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      actor,
      action,
      details,
      incident_id: incidentId,
    };
    this.auditLog.unshift(entry);
    return entry;
  }

  getAllIncidents() {
    const list = Array.from(this.incidents.values());
    const teamsList = Array.from(this.teams.values());

    return list.map((inc) => {
      // Refresh waiting time & Flame score dynamically if unassigned
      const createdTime = new Date(inc.created_at).getTime();
      const waitingMinutes = Math.floor((Date.now() - createdTime) / 60000);
      inc.flame_evaluation = evaluateFlamePriority(
        { ...inc.payload, manual_override: inc.flame_evaluation.override_meta },
        waitingMinutes
      );

      // Refresh rescue team recommendations
      const assignmentRec = rankRescueTeams(inc, teamsList, list);
      return {
        ...inc,
        recommendations: assignmentRec,
        assigned_team: inc.assigned_team_id ? this.teams.get(inc.assigned_team_id) : null,
      };
    });
  }

  getIncidentById(id) {
    const inc = this.incidents.get(id);
    if (!inc) return null;
    const teamsList = Array.from(this.teams.values());
    const allList = Array.from(this.incidents.values());

    const createdTime = new Date(inc.created_at).getTime();
    const waitingMinutes = Math.floor((Date.now() - createdTime) / 60000);
    inc.flame_evaluation = evaluateFlamePriority(
      { ...inc.payload, manual_override: inc.flame_evaluation.override_meta },
      waitingMinutes
    );

    return {
      ...inc,
      recommendations: rankRescueTeams(inc, teamsList, allList),
      assigned_team: inc.assigned_team_id ? this.teams.get(inc.assigned_team_id) : null,
    };
  }

  /**
   * Ingest a batch of envelopes from a gateway
   */
  ingestGatewayBatch(batch, gatewayId = 'GATEWAY_UNKNOWN') {
    const results = {
      accepted: [],
      duplicates: [],
      rejected: [],
    };

    const gw = this.gateways.get(gatewayId);
    if (gw) {
      gw.last_sync = new Date().toISOString();
      gw.messages_forwarded += (batch.messages || []).length;
    }

    const messages = Array.isArray(batch.messages) ? batch.messages : [batch];

    messages.forEach((envelope) => {
      const verification = verifyEnvelope(envelope);
      if (!verification.is_valid) {
        results.rejected.push({
          message_id: envelope.message_id,
          reasons: verification.errors,
        });
        this.logAudit(gatewayId, 'ENVELOPE_REJECTED', `Validation failed: ${verification.errors.join('; ')}`, envelope.incident_id);
        return;
      }

      // Deduplication check
      if (this.processedMessageIds.has(envelope.message_id)) {
        results.duplicates.push({
          message_id: envelope.message_id,
          incident_id: envelope.incident_id,
        });
        return;
      }

      this.processedMessageIds.add(envelope.message_id);

      // Check if incident already exists (e.g. newer update or re-transmitted)
      let incident = this.incidents.get(envelope.incident_id);

      if (!incident) {
        // Brand new incident
        const createdTime = new Date(envelope.created_at).getTime();
        const waitingMinutes = Math.floor((Date.now() - createdTime) / 60000);
        const flame = evaluateFlamePriority(envelope.payload, waitingMinutes);

        incident = {
          id: envelope.incident_id,
          primary_message_id: envelope.message_id,
          schema_version: envelope.schema_version,
          origin_device_key_id: envelope.origin_device_key_id,
          created_at: envelope.created_at,
          received_at: new Date().toISOString(),
          status: 'SERVER_ACCEPTED',
          hop_count: envelope.hop_count,
          payload: envelope.payload,
          flame_evaluation: flame,
          assigned_team_id: null,
          relayed_via: [gatewayId],
          audit_trail: [
            {
              timestamp: envelope.created_at,
              actor: 'ORIGIN_DEVICE',
              action: 'SOS_CREATED',
              details: `Originated on offline client ${envelope.origin_device_key_id}`,
            },
            {
              timestamp: new Date().toISOString(),
              actor: gatewayId,
              action: 'GATEWAY_INGESTION',
              details: `Delivered via hop_count: ${envelope.hop_count}`,
            },
            {
              timestamp: new Date().toISOString(),
              actor: 'FLAME_ENGINE',
              action: 'PRIORITY_EVALUATED',
              details: `Category: ${flame.category} (${flame.score} pts)`,
            },
          ],
        };

        this.incidents.set(incident.id, incident);
        results.accepted.push(incident);

        this.logAudit(gatewayId, 'INCIDENT_INGESTED', `New SOS ${incident.id} received (${flame.category})`, incident.id);
      } else {
        // Incident update / higher hop or newer payload
        incident.hop_count = Math.min(incident.hop_count, envelope.hop_count);
        if (!incident.relayed_via.includes(gatewayId)) {
          incident.relayed_via.push(gatewayId);
        }
        incident.audit_trail.push({
          timestamp: new Date().toISOString(),
          actor: gatewayId,
          action: 'INCIDENT_UPDATE_RELAY',
          details: `Additional relay packet received via ${gatewayId}`,
        });

        results.accepted.push(incident);
        this.logAudit(gatewayId, 'INCIDENT_UPDATED', `Additional packet for ${incident.id}`, incident.id);
      }
    });

    return results;
  }

  acknowledgeIncident(id, operatorId = 'DISPATCHER') {
    const inc = this.incidents.get(id);
    if (!inc) return null;
    inc.status = 'ACKNOWLEDGED';
    const audit = {
      timestamp: new Date().toISOString(),
      actor: operatorId,
      action: 'OPERATOR_ACKNOWLEDGED',
      details: 'Incident verified by command desk',
    };
    inc.audit_trail.push(audit);
    this.logAudit(operatorId, 'INCIDENT_ACKNOWLEDGED', `Acknowledged incident #${id.slice(0, 8)}`, id);
    return inc;
  }

  overridePriority(id, { override_category, override_score, override_reason, operator_id = 'DISPATCHER_CHIEF' }) {
    const inc = this.incidents.get(id);
    if (!inc) return null;

    const previousCategory = inc.flame_evaluation.category;
    const previousScore = inc.flame_evaluation.score;

    inc.flame_evaluation.override_meta = {
      operator_id,
      override_category,
      override_score: Number(override_score),
      override_reason,
      overridden_at: new Date().toISOString(),
      previous_category: previousCategory,
      previous_score: previousScore,
    };
    inc.flame_evaluation.category = override_category;
    inc.flame_evaluation.score = Number(override_score);
    inc.flame_evaluation.is_overridden = true;

    const auditEntry = {
      timestamp: new Date().toISOString(),
      actor: operatorId,
      action: 'OPERATOR_OVERRIDE',
      details: `Changed from ${previousCategory} (${previousScore}) to ${override_category} (${override_score}). Reason: ${override_reason}`,
    };
    inc.audit_trail.push(auditEntry);
    this.logAudit(operatorId, 'OPERATOR_OVERRIDE', auditEntry.details, id);

    return inc;
  }

  assignTeam(id, teamId, operatorId = 'DISPATCHER') {
    const inc = this.incidents.get(id);
    const team = this.teams.get(teamId);
    if (!inc || !team) return null;

    // Release any previous team if assigned
    if (inc.assigned_team_id && inc.assigned_team_id !== teamId) {
      const prevTeam = this.teams.get(inc.assigned_team_id);
      if (prevTeam) prevTeam.status = 'AVAILABLE';
    }

    inc.assigned_team_id = teamId;
    inc.status = 'ASSIGNED';
    team.status = 'ASSIGNED';

    const auditEntry = {
      timestamp: new Date().toISOString(),
      actor: operatorId,
      action: 'DISPATCH_ASSIGNED',
      details: `Assigned rescue team ${team.name} (${team.callsign}) to incident`,
    };
    inc.audit_trail.push(auditEntry);
    this.logAudit(operatorId, 'DISPATCH_ASSIGNED', `Assigned ${team.name} to #${id.slice(0, 8)}`, id);

    return { incident: inc, team };
  }

  updateIncidentStatus(id, newStatus, operatorId = 'FIELD_RESPONDER') {
    const inc = this.incidents.get(id);
    if (!inc) return null;

    const prevStatus = inc.status;
    inc.status = newStatus;

    if (newStatus === 'RESOLVED') {
      if (inc.assigned_team_id) {
        const team = this.teams.get(inc.assigned_team_id);
        if (team) team.status = 'AVAILABLE';
      }
    } else if (newStatus === 'EN_ROUTE') {
      if (inc.assigned_team_id) {
        const team = this.teams.get(inc.assigned_team_id);
        if (team) team.status = 'EN_ROUTE';
      }
    } else if (newStatus === 'ON_SCENE') {
      if (inc.assigned_team_id) {
        const team = this.teams.get(inc.assigned_team_id);
        if (team) team.status = 'ON_SCENE';
      }
    }

    const auditEntry = {
      timestamp: new Date().toISOString(),
      actor: operatorId,
      action: 'STATUS_TRANSITION',
      details: `Status shifted from ${prevStatus} to ${newStatus}`,
    };
    inc.audit_trail.push(auditEntry);
    this.logAudit(operatorId, 'STATUS_TRANSITION', auditEntry.details, id);

    return inc;
  }

  getAllTeams() {
    return Array.from(this.teams.values());
  }

  getAllGateways() {
    return Array.from(this.gateways.values());
  }

  getSystemHealth() {
    const incidents = Array.from(this.incidents.values());
    const teams = Array.from(this.teams.values());
    const gateways = Array.from(this.gateways.values());

    const criticalCount = incidents.filter((i) => i.flame_evaluation?.category === 'CRITICAL' && i.status !== 'RESOLVED').length;
    const activeAssignments = incidents.filter((i) => ['ASSIGNED', 'EN_ROUTE', 'ON_SCENE'].includes(i.status)).length;
    const resolvedCount = incidents.filter((i) => i.status === 'RESOLVED').length;
    const totalHops = incidents.reduce((sum, i) => sum + (i.hop_count || 0), 0);
    const avgHops = incidents.length ? (totalHops / incidents.length).toFixed(1) : '0';

    return {
      status: 'OPERATIONAL',
      active_incidents_count: incidents.length,
      critical_unresolved_count: criticalCount,
      active_assignments_count: activeAssignments,
      resolved_count: resolvedCount,
      registered_teams_count: teams.length,
      available_teams_count: teams.filter((t) => t.status === 'AVAILABLE').length,
      online_gateways_count: gateways.filter((g) => g.status === 'ONLINE').length,
      average_relay_hops: avgHops,
      processed_packets_total: this.processedMessageIds.size,
      gateways: gateways,
    };
  }
}

const store = new IncidentStore();

module.exports = store;

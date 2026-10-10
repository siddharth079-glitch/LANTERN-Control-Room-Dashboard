/**
 * LANTERN Command & Control Express Application
 * Exportable app configuration for local server and Vercel serverless functions.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const incidentStore = require('./incidentStore');
const { generateSignature } = require('./messageVerification');

const app = express();

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Broadcast hook for WebSocket server (when active)
let broadcastHandler = null;

function setBroadcast(fn) {
  broadcastHandler = fn;
}

function broadcast(eventType, data) {
  if (typeof broadcastHandler === 'function') {
    try {
      broadcastHandler(eventType, data);
    } catch (err) {
      console.warn('[Broadcast Warning]', err.message);
    }
  }
}

// ---------------- REST API ROUTES ---------------- //

// 1. Incidents
app.get('/api/incidents', (req, res) => {
  res.json({
    success: true,
    data: incidentStore.getAllIncidents(),
  });
});

app.get('/api/incidents/:id', (req, res) => {
  const incident = incidentStore.getIncidentById(req.params.id);
  if (!incident) {
    return res.status(404).json({ success: false, error: 'Incident not found' });
  }
  res.json({ success: true, data: incident });
});

// 2. Gateway Ingestion Batch API
app.post('/api/gateway/upload', (req, res) => {
  const { gateway_id, batch } = req.body;
  if (!batch) {
    return res.status(400).json({ success: false, error: 'Missing batch payload' });
  }

  const results = incidentStore.ingestGatewayBatch(batch, gateway_id || 'GW-MOBILE-UPLINK');

  // Broadcast any newly created or updated incidents
  results.accepted.forEach((inc) => {
    broadcast('INCIDENT_INGESTED', inc);
  });
  broadcast('HEALTH_UPDATE', incidentStore.getSystemHealth());

  res.json({
    success: true,
    results: {
      accepted_count: results.accepted.length,
      duplicate_count: results.duplicates.length,
      rejected_count: results.rejected.length,
      rejected_details: results.rejected,
    },
    system_health: incidentStore.getSystemHealth(),
  });
});

// 3. Dispatcher Acknowledgement
app.post('/api/incidents/:id/ack', (req, res) => {
  const { operator_id } = req.body;
  const inc = incidentStore.acknowledgeIncident(req.params.id, operator_id || 'DISPATCHER_DESK');
  if (!inc) {
    return res.status(404).json({ success: false, error: 'Incident not found' });
  }
  broadcast('INCIDENT_UPDATE', inc);
  res.json({ success: true, data: inc });
});

// 4. Operator Priority Override (Section 9.2)
app.post('/api/incidents/:id/override', (req, res) => {
  const { override_category, override_score, override_reason, operator_id } = req.body;
  if (!override_category || override_score === undefined || !override_reason) {
    return res.status(400).json({
      success: false,
      error: 'Manual override requires category, score, and mandatory operational reason',
    });
  }

  const inc = incidentStore.overridePriority(req.params.id, {
    override_category,
    override_score,
    override_reason,
    operator_id: operator_id || 'COMMAND_LEAD',
  });

  if (!inc) {
    return res.status(404).json({ success: false, error: 'Incident not found' });
  }

  broadcast('INCIDENT_UPDATE', inc);
  broadcast('HEALTH_UPDATE', incidentStore.getSystemHealth());
  res.json({ success: true, data: inc });
});

// 5. Rescue Assignment & Dispatch (Section 10)
app.post('/api/incidents/:id/assign', (req, res) => {
  const { team_id, operator_id } = req.body;
  if (!team_id) {
    return res.status(400).json({ success: false, error: 'team_id is required' });
  }

  const result = incidentStore.assignTeam(req.params.id, team_id, operator_id || 'DISPATCHER_DESK');
  if (!result) {
    return res.status(404).json({ success: false, error: 'Incident or Team not found' });
  }

  broadcast('INCIDENT_UPDATE', result.incident);
  broadcast('TEAM_UPDATE', result.team);
  broadcast('HEALTH_UPDATE', incidentStore.getSystemHealth());

  res.json({ success: true, data: result });
});

// 6. Incident Status Lifecycle
app.post('/api/incidents/:id/status', (req, res) => {
  const { status, operator_id } = req.body;
  if (!status) {
    return res.status(400).json({ success: false, error: 'status is required' });
  }

  const inc = incidentStore.updateIncidentStatus(req.params.id, status, operator_id || 'RESPONDER_CREW');
  if (!inc) {
    return res.status(404).json({ success: false, error: 'Incident not found' });
  }

  broadcast('INCIDENT_UPDATE', inc);
  broadcast('TEAMS_SYNC', incidentStore.getAllTeams());
  broadcast('HEALTH_UPDATE', incidentStore.getSystemHealth());

  res.json({ success: true, data: inc });
});

// 7. Team Registry
app.get('/api/teams', (req, res) => {
  res.json({ success: true, data: incidentStore.getAllTeams() });
});

// 8. Gateways
app.get('/api/gateways', (req, res) => {
  res.json({ success: true, data: incidentStore.getAllGateways() });
});

// 9. System Health & Observability (Section 11 & 15)
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: incidentStore.getSystemHealth() });
});

// 10. Audit Log & Export (Section 11.57)
app.get('/api/audit', (req, res) => {
  res.json({ success: true, data: incidentStore.auditLog });
});

// 11. Seed / Reset Scenario
app.post('/api/reset', (req, res) => {
  incidentStore.reset();
  broadcast('INIT_SYNC', {
    incidents: incidentStore.getAllIncidents(),
    teams: incidentStore.getAllTeams(),
    health: incidentStore.getSystemHealth(),
  });
  res.json({ success: true, message: 'Scenario reset successfully' });
});

// 12. Helper endpoint to sign mobile client payloads
app.post('/api/crypto/sign', (req, res) => {
  const envelope = req.body;
  const signature = generateSignature(envelope);
  res.json({ success: true, signature });
});

// 13. System Root Info
app.get('/api', (req, res) => {
  res.json({
    name: 'LANTERN Emergency Command & Control API',
    status: 'OPERATIONAL',
    timestamp: new Date().toISOString(),
  });
});

module.exports = {
  app,
  setBroadcast,
  incidentStore,
};

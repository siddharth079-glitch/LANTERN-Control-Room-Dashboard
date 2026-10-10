import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Flame,
  Shield,
  Radio,
  Activity,
  Smartphone,
  RotateCcw,
  Bell,
  Layers,
  Sun,
  Moon,
} from 'lucide-react';

import TacticalMap from './components/TacticalMap';
import IncidentQueue from './components/IncidentQueue';
import IncidentDetail from './components/IncidentDetail';
import RescueTeamBoard from './components/RescueTeamBoard';
import MeshSimulatorLab from './components/MeshSimulatorLab';
import SystemHealthMonitor from './components/SystemHealthMonitor';
import MobileVictimSimulator from './components/MobileVictimSimulator';

export default function App() {
  const [incidents, setIncidents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [health, setHealth] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [activeTab, setActiveTab] = useState('COMMAND'); // 'COMMAND' | 'TEAMS' | 'MESH_LAB' | 'HEALTH'
  const [isMobileSimOpen, setIsMobileSimOpen] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [notification, setNotification] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('lantern_theme') || 'light');

  const wsRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('lantern_theme', theme);
  }, [theme]);

  const showNotification = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // 1. REST Data Fetch
  const fetchData = useCallback(async (isPolling = false) => {
    try {
      const [incRes, teamsRes, gwRes, healthRes, auditRes] = await Promise.all([
        fetch('/api/incidents').then((r) => r.json()),
        fetch('/api/teams').then((r) => r.json()),
        fetch('/api/gateways').then((r) => r.json()),
        fetch('/api/health').then((r) => r.json()),
        fetch('/api/audit').then((r) => r.json()),
      ]);

      if (incRes?.success) setIncidents(incRes.data);
      if (teamsRes?.success) setTeams(teamsRes.data);
      if (gwRes?.success) setGateways(gwRes.data);
      if (healthRes?.success) setHealth(healthRes.data);
      if (auditRes?.success) setAuditLogs(auditRes.data);

      if (!isPolling && incRes?.data && incRes.data.length > 0) {
        setSelectedIncidentId((curr) => curr || incRes.data[0].id);
      }
    } catch (e) {
      if (!isPolling) console.error('Data fetch error', e);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (active) await fetchData();
    };
    load();
    return () => {
      active = false;
    };
  }, [fetchData]);

  // Fallback Polling when WebSocket is not available (e.g., Vercel Serverless environment)
  useEffect(() => {
    if (wsConnected) return;

    const pollTimer = setInterval(() => {
      fetchData(true);
    }, 3500);

    return () => clearInterval(pollTimer);
  }, [wsConnected, fetchData]);

  // 2. WebSocket Real-Time Connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:3001`;

    let ws = null;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'INIT_SYNC') {
            if (payload.data.incidents) setIncidents(payload.data.incidents);
            if (payload.data.teams) setTeams(payload.data.teams);
            if (payload.data.health) setHealth(payload.data.health);
          } else if (payload.type === 'INCIDENT_INGESTED') {
            setIncidents((prev) => {
              const existingIdx = prev.findIndex((i) => i.id === payload.data.id);
              if (existingIdx >= 0) {
                const updated = [...prev];
                updated[existingIdx] = payload.data;
                return updated;
              }
              return [payload.data, ...prev];
            });
            setSelectedIncidentId(payload.data.id);
            showNotification(`🚨 NEW INGESTION: ${payload.data.payload?.emergency_type} (Flame Score: ${payload.data.flame_evaluation?.score})`, 'critical');
          } else if (payload.type === 'INCIDENT_UPDATE') {
            setIncidents((prev) => prev.map((i) => (i.id === payload.data.id ? payload.data : i)));
          } else if (payload.type === 'TEAM_UPDATE') {
            setTeams((prev) => prev.map((t) => (t.id === payload.data.id ? payload.data : t)));
          } else if (payload.type === 'TEAMS_SYNC') {
            setTeams(payload.data);
          } else if (payload.type === 'HEALTH_UPDATE') {
            setHealth(payload.data);
          }
        } catch (err) {
          console.error('Error handling WebSocket message', err);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
      };
    } catch (err) {
      console.warn('WebSocket connection not available; continuing via REST polling', err);
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  // Selected incident object
  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId) || incidents[0] || null;

  // Dispatcher Actions
  const handleAcknowledge = async (id) => {
    try {
      const res = await fetch(`/api/incidents/${id}/ack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operator_id: 'DISPATCHER_DESK' }),
      });
      const data = await res.json();
      if (data.success) {
        setIncidents((prev) => prev.map((i) => (i.id === id ? data.data : i)));
        showNotification('Incident verified and acknowledged by command.', 'success');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignTeam = async (incidentId, teamId) => {
    try {
      const res = await fetch(`/api/incidents/${incidentId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: teamId, operator_id: 'DISPATCHER_DESK' }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Dispatched rescue unit to incident #${incidentId.slice(0, 8)}`, 'success');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStatus = async (incidentId, newStatus) => {
    try {
      const res = await fetch(`/api/incidents/${incidentId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, operator_id: 'COMMAND_DISPATCH' }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Status updated to ${newStatus}`, 'info');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOverridePriority = async (incidentId, overrideData) => {
    try {
      const res = await fetch(`/api/incidents/${incidentId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(overrideData),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Operator priority override applied: ${overrideData.override_category} (${overrideData.override_score} pts)`, 'warning');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetScenario = async () => {
    try {
      await fetch('/api/reset', { method: 'POST' });
      showNotification('Scenario reset: Metro 7.1 Seismic Disaster initialized.', 'info');
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="app-container">
      {/* TACTICAL HEADER BAR */}
      <header className="top-nav">
        <div className="brand-section">
          <div className="brand-logo-icon">
            <Flame size={20} color="#FFFFFF" />
          </div>
          <div className="brand-titles">
            <div className="brand-name">
              <span>LANTERN</span>
              <span className="brand-badge">WATCHTOWER COMMAND</span>
            </div>
            <div className="brand-subtitle">
              OFFLINE DISASTER RESPONSE PLATFORM • PROTOCOL v1.2
            </div>
          </div>
        </div>

        {/* Telemetry Pills */}
        <div className="telemetry-bar">
          <div className="telemetry-item">
            <span className="telemetry-label">ACTIVE INCIDENTS</span>
            <span className="telemetry-val">{incidents.length}</span>
          </div>

          <div className="telemetry-item">
            <span className="telemetry-label">CRITICAL (FLAME ≥ 80)</span>
            <span className="telemetry-val critical">
              {incidents.filter((i) => i.flame_evaluation?.category === 'CRITICAL' && i.status !== 'RESOLVED').length}
            </span>
          </div>

          <div className="telemetry-item">
            <span className="telemetry-label">RESCUE UNITS READY</span>
            <span className="telemetry-val healthy">
              {teams.filter((t) => t.status === 'AVAILABLE').length} / {teams.length}
            </span>
          </div>

          <div className="telemetry-item">
            <span className="telemetry-label">MESH BACKHAUL</span>
            <span className="telemetry-val" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: wsConnected ? '#10B981' : '#F59E0B',
                }}
              />
              {wsConnected ? 'LIVE FEED' : 'REST SYNC'}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="nav-tabs">
          <button
            className={`tab-btn ${activeTab === 'COMMAND' ? 'active' : ''}`}
            onClick={() => setActiveTab('COMMAND')}
          >
            <Layers size={14} /> Command Desk
          </button>
          <button
            className={`tab-btn ${activeTab === 'TEAMS' ? 'active' : ''}`}
            onClick={() => setActiveTab('TEAMS')}
          >
            <Shield size={14} /> Team Board
          </button>
          <button
            className={`tab-btn ${activeTab === 'MESH_LAB' ? 'active' : ''}`}
            onClick={() => setActiveTab('MESH_LAB')}
          >
            <Radio size={14} /> Mesh Lab
          </button>
          <button
            className={`tab-btn ${activeTab === 'HEALTH' ? 'active' : ''}`}
            onClick={() => setActiveTab('HEALTH')}
          >
            <Activity size={14} /> Telemetry & Logs
          </button>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            className="btn-theme-toggle"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'White'} Theme`}
          >
            {theme === 'light' ? <Moon size={14} color="#0F172A" /> : <Sun size={14} color="#FACC15" />}
            <span>{theme === 'light' ? 'Dark Mode' : 'White Theme'}</span>
          </button>

          <button
            className="btn-action btn-mobile-trigger"
            onClick={() => setIsMobileSimOpen(!isMobileSimOpen)}
          >
            <Smartphone size={14} />
            <span>{isMobileSimOpen ? 'Hide Victim Phone' : 'Launch Victim Phone'}</span>
          </button>

          <button
            className="btn-action btn-secondary"
            onClick={handleResetScenario}
            title="Reset Disaster Scenario Data"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </header>

      {/* NOTIFICATION TOAST */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '4.5rem',
            right: '1.5rem',
            zIndex: 3000,
            background: notification.type === 'critical' ? 'var(--flame-critical)' : 'var(--bg-card)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-subtle)',
            padding: '0.75rem 1.25rem',
            borderRadius: 8,
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.82rem',
            fontWeight: 600,
            animation: 'slideUp 0.2s ease',
          }}
        >
          <Bell size={16} />
          <span>{notification.msg}</span>
        </div>
      )}

      {/* WORKSPACE BODY */}
      <main className="workspace-body">
        {activeTab === 'COMMAND' && (
          <div className="command-split-view">
            {/* 1. Incident Queue */}
            <IncidentQueue
              incidents={incidents}
              selectedIncident={selectedIncident}
              onSelectIncident={(inc) => setSelectedIncidentId(inc.id)}
            />

            {/* 2. Tactical Live Map */}
            <div className="map-column">
              <TacticalMap
                incidents={incidents}
                teams={teams}
                gateways={gateways}
                selectedIncident={selectedIncident}
                onSelectIncident={(inc) => setSelectedIncidentId(inc.id)}
                theme={theme}
              />
            </div>

            {/* 3. Incident Detail / Flame Inspector / Assignment */}
            <IncidentDetail
              incident={selectedIncident}
              teams={teams}
              onAcknowledge={handleAcknowledge}
              onAssignTeam={handleAssignTeam}
              onUpdateStatus={handleUpdateStatus}
              onOverridePriority={handleOverridePriority}
            />
          </div>
        )}

        {activeTab === 'TEAMS' && (
          <RescueTeamBoard
            teams={teams}
            incidents={incidents}
            onSelectIncident={(inc) => {
              setSelectedIncidentId(inc.id);
              setActiveTab('COMMAND');
            }}
          />
        )}

        {activeTab === 'MESH_LAB' && (
          <MeshSimulatorLab
            onTriggerUpload={() => {
              fetchData();
              showNotification('Mesh packet arrived at Gateway & uploaded to Command Center!', 'success');
            }}
          />
        )}

        {activeTab === 'HEALTH' && (
          <SystemHealthMonitor
            health={health}
            gateways={gateways}
            auditLogs={auditLogs}
          />
        )}
      </main>

      {/* DOCKED / FLOATING MOBILE VICTIM APP SIMULATOR */}
      {isMobileSimOpen && (
        <MobileVictimSimulator
          onClose={() => setIsMobileSimOpen(false)}
          onSosSubmittedToGateway={(incId) => {
            fetchData();
            setSelectedIncidentId(incId);
            setActiveTab('COMMAND');
            showNotification('New SOS received from mobile device via Gateway Van 01!', 'critical');
          }}
        />
      )}
    </div>
  );
}

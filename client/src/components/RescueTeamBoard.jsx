import React, { useState } from 'react';
import { Shield, Users, Truck, CheckCircle2 } from 'lucide-react';

export default function RescueTeamBoard({
  teams = [],
  incidents = [],
  onSelectIncident = () => {},
}) {
  const [selectedCapFilter, setSelectedCapFilter] = useState('ALL');

  const allCapabilities = [
    'STRUCTURAL_COLLAPSE',
    'HEAVY_EXTRICATION',
    'ADVANCED_MEDICAL_TRIAGE',
    'SWIFTWATER_RESCUE',
    'HAZMAT_CONTAINMENT',
    'DRONE_RECON',
  ];

  const filteredTeams = teams.filter((t) => {
    if (selectedCapFilter === 'ALL') return true;
    return t.capabilities.includes(selectedCapFilter);
  });

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: 'var(--bg-space)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={22} color="#059669" /> RESCUE RESOURCE REGISTRY
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Operational units, specialized taskforces, equipment payloads, and live tactical workload.
          </p>
        </div>

        {/* Filter by Capability */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            className={`filter-chip ${selectedCapFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setSelectedCapFilter('ALL')}
          >
            All Units
          </button>
          {allCapabilities.map((cap) => (
            <button
              key={cap}
              className={`filter-chip ${selectedCapFilter === cap ? 'active' : ''}`}
              onClick={() => setSelectedCapFilter(cap)}
              style={{ fontSize: '0.72rem' }}
            >
              {cap.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Teams */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem' }}>
        {filteredTeams.map((team) => {
          const assignedIncident = incidents.find((i) => i.assigned_team_id === team.id && i.status !== 'RESOLVED');

          let statusColor = '#059669';
          let statusBg = 'rgba(16, 185, 129, 0.15)';
          if (team.status === 'ASSIGNED' || team.status === 'EN_ROUTE') {
            statusColor = '#0284C7';
            statusBg = 'rgba(2, 132, 199, 0.15)';
          } else if (team.status === 'ON_SCENE') {
            statusColor = '#D97706';
            statusBg = 'rgba(217, 119, 6, 0.15)';
          }

          return (
            <div
              key={team.id}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                position: 'relative',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 700, color: '#0284C7', background: 'var(--flame-low-bg)', padding: '2px 6px', borderRadius: 4 }}>
                      {team.callsign}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Radio: <b style={{ color: 'var(--text-main)' }}>{team.radio_channel}</b>
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>
                    {team.name}
                  </h3>
                </div>

                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    color: statusColor,
                    background: statusBg,
                    border: `1px solid ${statusColor}`,
                  }}
                >
                  {team.status}
                </span>
              </div>

              {/* Personnel & Equipment */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Users size={14} color="var(--text-muted)" /> {team.personnel_count} Crew Members
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Truck size={14} color="var(--text-muted)" /> {team.type.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Capabilities */}
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Validated Capabilities:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {(team.capabilities || []).map((cap, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '0.68rem',
                        padding: '2px 7px',
                        borderRadius: 4,
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      ✓ {cap.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>

              {/* Equipment Inventory */}
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Onboard Gear:
                </span>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {(team.equipment || []).join(' • ')}
                </div>
              </div>

              {/* Active Incident Link if Assigned */}
              {assignedIncident ? (
                <div
                  style={{
                    marginTop: 'auto',
                    padding: '0.65rem',
                    background: 'var(--flame-low-bg)',
                    border: '1px solid var(--flame-low-border)',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                  onClick={() => onSelectIncident(assignedIncident)}
                >
                  <div style={{ fontSize: '0.72rem', color: '#0284C7', fontWeight: 700 }}>
                    DISPATCHED TO ACTIVE INCIDENT
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 600 }}>
                    #{assignedIncident.id.slice(0, 10)} - {assignedIncident.payload?.emergency_type}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Status: {assignedIncident.status} • Click to inspect
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 'auto', fontSize: '0.72rem', color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={13} /> Unit standby and ready for immediate deployment
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import {
  Flame,
  Shield,
  Clock,
  MapPin,
  CheckCircle2,
  Send,
  Sliders,
  ChevronRight,
  Lock,
  Activity,
  UserCheck,
  RotateCcw,
} from 'lucide-react';

export default function IncidentDetail({
  incident,
  onAcknowledge = () => {},
  onAssignTeam = () => {},
  onUpdateStatus = () => {},
  onOverridePriority = () => {},
}) {
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideCategory, setOverrideCategory] = useState('CRITICAL');
  const [overrideScore, setOverrideScore] = useState(90);
  const [overrideReason, setOverrideReason] = useState('');
  const [operatorId, setOperatorId] = useState('DISPATCHER_CHIEF');
  const [showRawEnvelope, setShowRawEnvelope] = useState(false);
  const [selectedAltTeamId, setSelectedAltTeamId] = useState('');

  if (!incident) {
    return (
      <div className="detail-column" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: '#64748B' }}>
        <div style={{ textAlign: 'center' }}>
          <Activity size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <h3 style={{ color: '#94A3B8', fontSize: '1rem', marginBottom: '0.5rem' }}>No Incident Selected</h3>
          <p style={{ fontSize: '0.8rem' }}>Select an incident from the queue or click on a marker on the tactical map to inspect Flame Engine scores and assign rescue units.</p>
        </div>
      </div>
    );
  }

  const flame = incident.flame_evaluation || {};
  const breakdown = flame.breakdown || {};
  const payload = incident.payload || {};
  const recs = incident.recommendations || {};
  const topTeam = recs.recommended_team;
  const alternatives = recs.alternatives || [];

  const handleOpenOverride = () => {
    setOverrideCategory(flame.category || 'CRITICAL');
    setOverrideScore(flame.score || 85);
    setOverrideReason('');
    setShowOverrideModal(true);
  };

  const handleConfirmOverride = () => {
    if (!overrideReason.trim()) {
      alert('Operational safeguard: An operator justification reason is mandatory for priority overrides.');
      return;
    }
    onOverridePriority(incident.id, {
      override_category: overrideCategory,
      override_score: overrideScore,
      override_reason: overrideReason,
      operator_id: operatorId,
    });
    setShowOverrideModal(false);
  };

  // Status Lifecycle Progression
  const lifecycleStates = [
    'STORED_OFFLINE',
    'RELAYED',
    'GATEWAY_RECEIVED',
    'SERVER_ACCEPTED',
    'ACKNOWLEDGED',
    'ASSIGNED',
    'EN_ROUTE',
    'ON_SCENE',
    'RESOLVED',
  ];

  return (
    <div className="detail-column">
      {/* Detail Header */}
      <div className="detail-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#64748B' }}>
            INCIDENT ID: #{incident.id.slice(0, 12)}
          </span>
          <span className={`flame-badge ${flame.category?.toLowerCase() || 'medium'}`}>
            <Flame size={12} />
            <span>{flame.score} {flame.category}</span>
          </span>
        </div>

        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.3 }}>
          {payload.emergency_type?.replace(/_/g, ' ')}
        </h2>

        {/* Honest Delivery State Lifecycle Tracker */}
        <div className="status-tracker">
          <div style={{ position: 'absolute', top: 12, left: 16, right: 16, height: 2, background: 'var(--border-subtle)', zIndex: 1 }} />
          {[
            { key: 'SERVER_ACCEPTED', label: 'Accepted' },
            { key: 'ACKNOWLEDGED', label: 'Verified' },
            { key: 'ASSIGNED', label: 'Assigned' },
            { key: 'EN_ROUTE', label: 'En Route' },
            { key: 'RESOLVED', label: 'Resolved' },
          ].map((st) => {
            const isCompleted = lifecycleStates.indexOf(incident.status) >= lifecycleStates.indexOf(st.key);
            const isCurrent = incident.status === st.key;
            return (
              <div key={st.key} className={`status-step-node ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                <div className="status-step-circle">
                  {isCompleted ? '✓' : ''}
                </div>
                <div className="status-step-label">{st.label}</div>
              </div>
            );
          })}
        </div>

        {/* Primary Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          {incident.status === 'SERVER_ACCEPTED' && (
            <button
              className="btn-action btn-primary"
              onClick={() => onAcknowledge(incident.id)}
              style={{ background: '#2563EB', borderColor: '#3B82F6' }}
            >
              <UserCheck size={14} /> Acknowledge SOS
            </button>
          )}

          {incident.status === 'ASSIGNED' && (
            <button
              className="btn-action btn-secondary"
              onClick={() => onUpdateStatus(incident.id, 'EN_ROUTE')}
              style={{ color: '#60A5FA', borderColor: '#2563EB' }}
            >
              <Send size={14} /> Confirm En Route
            </button>
          )}

          {incident.status === 'EN_ROUTE' && (
            <button
              className="btn-action btn-secondary"
              onClick={() => onUpdateStatus(incident.id, 'ON_SCENE')}
              style={{ color: '#F59E0B', borderColor: '#D97706' }}
            >
              <MapPin size={14} /> Unit Arrived On Scene
            </button>
          )}

          {incident.status === 'ON_SCENE' && (
            <button
              className="btn-action btn-primary"
              onClick={() => onUpdateStatus(incident.id, 'RESOLVED')}
              style={{ background: '#059669', borderColor: '#10B981' }}
            >
              <CheckCircle2 size={14} /> Close / Resolved
            </button>
          )}

          {incident.status === 'RESOLVED' && (
            <button
              className="btn-action btn-secondary"
              onClick={() => onUpdateStatus(incident.id, 'ASSIGNED')}
              style={{ color: '#94A3B8' }}
            >
              <RotateCcw size={14} /> Reopen Incident
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: FLAME ENGINE PRIORITIZATION */}
      <div className="detail-section">
        <div className="section-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Flame size={15} color="#EF4444" />
            <span>FLAME ENGINE TRIAGE ({flame.engine_version || 'v1.2'})</span>
          </span>
          <button
            onClick={handleOpenOverride}
            style={{
              background: 'transparent',
              border: '1px solid #334155',
              color: '#94A3B8',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: '0.7rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Sliders size={12} /> Override Priority
          </button>
        </div>

        <div className="flame-breakdown-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>DETERMINISTIC SCORE</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-main)' }}>
                {flame.score} <span style={{ fontSize: '0.85rem', color: '#64748B' }}>/ 100</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>LOCATION CONFIDENCE</span>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38BDF8' }}>
                {flame.confidence?.level} ({flame.confidence?.accuracy_meters})
              </div>
            </div>
          </div>

          {/* Factor Breakdown Bars */}
          <div className="breakdown-bar-item">
            <div className="breakdown-bar-label">
              <span>Immediate Life Threat</span>
              <span className="mono">{breakdown.immediateLifeThreat || 0} / 35</span>
            </div>
            <div className="breakdown-track">
              <div className="breakdown-fill" style={{ width: `${((breakdown.immediateLifeThreat || 0) / 35) * 100}%` }} />
            </div>
          </div>

          <div className="breakdown-bar-item">
            <div className="breakdown-bar-label">
              <span>People Affected</span>
              <span className="mono">{breakdown.peopleAffected || 0} / 20</span>
            </div>
            <div className="breakdown-track">
              <div className="breakdown-fill" style={{ width: `${((breakdown.peopleAffected || 0) / 20) * 100}%` }} />
            </div>
          </div>

          <div className="breakdown-bar-item">
            <div className="breakdown-bar-label">
              <span>Injury Severity</span>
              <span className="mono">{breakdown.injurySeverity || 0} / 20</span>
            </div>
            <div className="breakdown-track">
              <div className="breakdown-fill" style={{ width: `${((breakdown.injurySeverity || 0) / 20) * 100}%` }} />
            </div>
          </div>

          <div className="breakdown-bar-item">
            <div className="breakdown-bar-label">
              <span>Hazards & Structural Risks</span>
              <span className="mono">{breakdown.hazards || 0} / 15</span>
            </div>
            <div className="breakdown-track">
              <div className="breakdown-fill" style={{ width: `${((breakdown.hazards || 0) / 15) * 100}%` }} />
            </div>
          </div>

          <div className="breakdown-bar-item">
            <div className="breakdown-bar-label">
              <span>Waiting Time Escalation</span>
              <span className="mono">{breakdown.waitingTime || 0} / 10</span>
            </div>
            <div className="breakdown-track">
              <div className="breakdown-fill" style={{ width: `${((breakdown.waitingTime || 0) / 10) * 100}%` }} />
            </div>
          </div>

          {/* Explainable Reasons */}
          <div style={{ marginTop: '0.85rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>
              Explainable Decision Factors:
            </span>
            <ul className="reason-bullets">
              {(flame.reasons || []).map((r, i) => (
                <li key={i} className="reason-bullet">
                  <span style={{ color: '#EF4444' }}>•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Operator Override Notice if active */}
          {flame.is_overridden && (
            <div style={{ marginTop: '0.75rem', padding: '0.65rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 6 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F59E0B' }}>
                ⚠️ MANUAL OPERATOR OVERRIDE ACTIVE
              </div>
              <div style={{ fontSize: '0.72rem', color: '#E2E8F0', marginTop: 2 }}>
                Overridden by: <b>{flame.override_meta?.operator_id}</b>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 2 }}>
                Reason: "{flame.override_meta?.override_reason}"
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: RESCUE ASSIGNMENT ENGINE */}
      <div className="detail-section">
        <div className="section-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shield size={15} color="#10B981" />
            <span>RESCUE ASSIGNMENT ENGINE</span>
          </span>
          {incident.assigned_team && (
            <span style={{ fontSize: '0.7rem', color: '#34D399', fontWeight: 600 }}>
              UNIT DEPLOYED
            </span>
          )}
        </div>

        {/* Active Assigned Team */}
        {incident.assigned_team ? (
          <div className="assignment-card" style={{ borderColor: '#059669', background: 'rgba(5, 150, 105, 0.1)' }}>
            <div className="assignment-top">
              <div>
                <span style={{ fontSize: '0.7rem', color: '#34D399', fontWeight: 700, textTransform: 'uppercase' }}>
                  Currently Assigned Unit
                </span>
                <div className="team-title">{incident.assigned_team.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                  Callsign: <b style={{ color: 'var(--text-main)' }}>{incident.assigned_team.callsign}</b> | Radio: {incident.assigned_team.radio_channel}
                </div>
              </div>
              <span className="eta-badge">{incident.status}</span>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {(incident.assigned_team.capabilities || []).map((cap, i) => (
                <span key={i} className="hazard-pill" style={{ color: '#34D399', borderColor: 'rgba(52, 211, 153, 0.3)' }}>
                  ✓ {cap}
                </span>
              ))}
            </div>
          </div>
        ) : (
          /* Recommended Candidate Team */
          topTeam ? (
            <div className="assignment-card recommended">
              <div className="assignment-top">
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 700, letterSpacing: '0.04em' }}>
                    ★ #1 RECOMMENDED RESPONSE TEAM
                  </span>
                  <div className="team-title">{topTeam.team_name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                    Distance: <b>{topTeam.distance_km} km</b> | Crew: <b>{topTeam.personnel_count} responders</b>
                  </div>
                </div>
                <span className="eta-badge">~{topTeam.eta_minutes}m ETA</span>
              </div>

              {/* Explanations */}
              <ul className="reason-bullets" style={{ marginTop: '0.4rem', paddingTop: '0.4rem' }}>
                {(topTeam.explanation_points || []).map((pt, i) => (
                  <li key={i} className="reason-bullet">
                    <span style={{ color: '#10B981' }}>✓</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>

              {/* Reassignment Warning Safeguard */}
              {recs.reassignment_warning && (
                <div style={{ margin: '0.6rem 0', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', borderRadius: 6, fontSize: '0.72rem', color: '#FCA5A5' }}>
                  ⚠️ {recs.reassignment_warning}
                </div>
              )}

              {/* Dispatch Button */}
              <button
                className="btn-action btn-primary"
                onClick={() => onAssignTeam(incident.id, topTeam.team_id)}
                style={{ width: '100%', marginTop: '0.75rem', justifyContent: 'center' }}
              >
                <Shield size={14} /> Dispatch {topTeam.team_name}
              </button>

              {/* Alternative Units Selector */}
              {alternatives.length > 0 && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #1E293B' }}>
                  <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>
                    Or select alternate unit:
                  </span>
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                    <select
                      className="search-input"
                      style={{ paddingLeft: '0.6rem', fontSize: '0.75rem' }}
                      value={selectedAltTeamId}
                      onChange={(e) => setSelectedAltTeamId(e.target.value)}
                    >
                      <option value="">Choose alternative...</option>
                      {alternatives.map((alt) => (
                        <option key={alt.team_id} value={alt.team_id}>
                          {alt.team_name} (~{alt.eta_minutes}m ETA - {alt.status})
                        </option>
                      ))}
                    </select>
                    {selectedAltTeamId && (
                      <button
                        className="btn-action btn-secondary"
                        onClick={() => {
                          onAssignTeam(incident.id, selectedAltTeamId);
                          setSelectedAltTeamId('');
                        }}
                      >
                        Dispatch
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>No operational response units available</div>
          )
        )}
      </div>

      {/* SECTION 3: MESH RELAY & CRYPTOGRAPHIC VERIFICATION */}
      <div className="detail-section">
        <div className="section-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Lock size={14} color="#38BDF8" />
            <span>RELAY PATHWAY & CRYPTOGRAPHIC LINEAGE</span>
          </span>
          <button
            onClick={() => setShowRawEnvelope(!showRawEnvelope)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#38BDF8',
              fontSize: '0.7rem',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {showRawEnvelope ? 'Hide Envelope' : 'Inspect JSON Envelope'}
          </button>
        </div>

        {/* Visual Multi-hop chain */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', padding: '0.5rem 0' }}>
          <div style={{ background: 'var(--bg-surface)', padding: '4px 8px', borderRadius: 4, fontSize: '0.72rem', color: 'var(--text-main)', whiteSpace: 'nowrap', border: '1px solid var(--border-subtle)' }}>
            📱 {incident.origin_device_key_id?.slice(0, 10)} (Origin)
          </div>
          <ChevronRight size={14} color="var(--text-muted)" />
          {(incident.relayed_via || []).map((node, i) => (
            <React.Fragment key={i}>
              <div style={{ background: 'var(--flame-low-bg)', padding: '4px 8px', borderRadius: 4, fontSize: '0.72rem', color: 'var(--flame-low)', whiteSpace: 'nowrap', border: '1px solid var(--flame-low-border)' }}>
                📡 {node}
              </div>
              <ChevronRight size={14} color="var(--text-muted)" />
            </React.Fragment>
          ))}
          <div style={{ background: 'var(--status-emerald-bg)', padding: '4px 8px', borderRadius: 4, fontSize: '0.72rem', color: 'var(--status-emerald)', whiteSpace: 'nowrap', border: '1px solid rgba(5, 150, 105, 0.3)' }}>
            🏛️ Watchtower Command
          </div>
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', marginTop: '0.4rem' }}>
          <span>Hop Count: <b style={{ color: 'var(--text-main)' }}>{incident.hop_count}</b></span>
          <span>Schema: <b style={{ color: 'var(--text-main)' }}>v{incident.schema_version}</b></span>
          <span style={{ color: 'var(--status-emerald)' }}>Signature: <b>VERIFIED HMAC-SHA256</b></span>
        </div>

        {showRawEnvelope && (
          <pre
            style={{
              background: 'var(--bg-secondary)',
              padding: '0.75rem',
              borderRadius: 6,
              border: '1px solid var(--border-subtle)',
              fontSize: '0.68rem',
              color: 'var(--text-main)',
              overflowX: 'auto',
              maxHeight: '180px',
              marginTop: '0.5rem',
            }}
          >
            {JSON.stringify(
              {
                message_id: incident.primary_message_id,
                incident_id: incident.id,
                schema_version: incident.schema_version,
                origin_device_key_id: incident.origin_device_key_id,
                created_at: incident.created_at,
                hop_count: incident.hop_count,
                payload: incident.payload,
              },
              null,
              2
            )}
          </pre>
        )}
      </div>

      {/* SECTION 4: TAMPER-EVIDENT AUDIT TRAIL */}
      <div className="detail-section">
        <div className="section-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} color="#94A3B8" />
            <span>TAMPER-EVIDENT AUDIT JOURNAL</span>
          </span>
        </div>

        <div className="audit-timeline">
          {(incident.audit_trail || []).map((entry, idx) => (
            <div key={idx} className="audit-node">
              <div className="audit-dot" />
              <div className="audit-time">{new Date(entry.timestamp).toLocaleTimeString()}</div>
              <div className="audit-actor">[{entry.actor}] - {entry.action}</div>
              <div className="audit-text">{entry.details}</div>
            </div>
          ))}
        </div>
      </div>

      {/* OPERATOR PRIORITY OVERRIDE MODAL */}
      {showOverrideModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sliders size={18} color="#D97706" /> Operator Priority Override
              </h3>
              <button
                onClick={() => setShowOverrideModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Safety Rule (Section 9.2): Every score adjustment is logged to the audit journal and requires a named operator plus mandatory operational justification.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>OPERATOR CALLSIGN / ID</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ paddingLeft: '0.75rem', marginTop: 4 }}
                  value={operatorId}
                  onChange={(e) => setOperatorId(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>CATEGORY</label>
                  <select
                    className="search-input"
                    style={{ paddingLeft: '0.75rem', marginTop: 4 }}
                    value={overrideCategory}
                    onChange={(e) => setOverrideCategory(e.target.value)}
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>SCORE (0 - 100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="search-input"
                    style={{ paddingLeft: '0.75rem', marginTop: 4 }}
                    value={overrideScore}
                    onChange={(e) => setOverrideScore(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  MANDATORY OPERATIONAL JUSTIFICATION <span style={{ color: 'var(--flame-critical)' }}>*</span>
                </label>
                <textarea
                  className="search-input"
                  rows={3}
                  style={{ paddingLeft: '0.75rem', marginTop: 4, resize: 'vertical' }}
                  placeholder="e.g., Confirmed secondary gas explosion via field scout radio, elevating priority immediately."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button className="btn-action btn-secondary" onClick={() => setShowOverrideModal(false)}>
                Cancel
              </button>
              <button className="btn-action btn-primary" onClick={handleConfirmOverride}>
                Commit Override to Audit Trail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

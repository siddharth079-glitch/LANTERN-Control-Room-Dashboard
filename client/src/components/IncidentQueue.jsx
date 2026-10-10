import React, { useState, useEffect } from 'react';
import { Search, Flame, Users, Clock, ShieldCheck, MapPin } from 'lucide-react';

export default function IncidentQueue({
  incidents = [],
  selectedIncident = null,
  onSelectIncident = () => {},
}) {
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Filtering logic
  const filteredIncidents = incidents.filter((inc) => {
    const cat = inc.flame_evaluation?.category || 'LOW';
    const status = inc.status || 'SERVER_ACCEPTED';

    if (filterPriority !== 'ALL' && cat !== filterPriority) {
      return false;
    }

    if (filterStatus === 'UNASSIGNED' && (inc.assigned_team_id || status === 'RESOLVED')) {
      return false;
    }
    if (filterStatus === 'ACTIVE' && (status !== 'ASSIGNED' && status !== 'EN_ROUTE' && status !== 'ON_SCENE')) {
      return false;
    }
    if (filterStatus === 'RESOLVED' && status !== 'RESOLVED') {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const type = (inc.payload?.emergency_type || '').toLowerCase();
      const landmark = (inc.payload?.landmark || '').toLowerCase();
      const hazards = (inc.payload?.hazards || []).join(' ').toLowerCase();
      const id = (inc.id || '').toLowerCase();
      return type.includes(q) || landmark.includes(q) || hazards.includes(q) || id.includes(q);
    }

    return true;
  });

  // Sort by Flame score descending by default
  const sortedIncidents = [...filteredIncidents].sort((a, b) => {
    return (b.flame_evaluation?.score || 0) - (a.flame_evaluation?.score || 0);
  });

  return (
    <div className="queue-column">
      <div className="queue-header">
        <div className="queue-title-row">
          <div className="queue-title">
            <Flame size={18} color="#EF4444" />
            <span>INCIDENT QUEUE</span>
            <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 500 }}>
              ({filteredIncidents.length}/{incidents.length})
            </span>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#64748B' }} />
          <input
            type="text"
            className="search-input"
            placeholder="Search emergency type, landmark, hazard..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Priority Filter Chips */}
        <div className="filter-chips">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
            <button
              key={p}
              className={`filter-chip ${filterPriority === p ? 'active' : ''}`}
              onClick={() => setFilterPriority(p)}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Status Filter Sub-chips */}
        <div className="filter-chips" style={{ borderTop: '1px solid #1E293B', paddingTop: '4px' }}>
          {[
            { id: 'ALL', label: 'All Status' },
            { id: 'UNASSIGNED', label: '⚡ Dispatch Needed' },
            { id: 'ACTIVE', label: '🛡️ Dispatched' },
            { id: 'RESOLVED', label: '✓ Resolved' },
          ].map((st) => (
            <button
              key={st.id}
              className={`filter-chip ${filterStatus === st.id ? 'active' : ''}`}
              onClick={() => setFilterStatus(st.id)}
              style={{ fontSize: '0.68rem', padding: '2px 6px' }}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Incidents List */}
      <div className="queue-list">
        {sortedIncidents.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
            No incidents matching current criteria
          </div>
        ) : (
          sortedIncidents.map((inc) => {
            const isSelected = selectedIncident && selectedIncident.id === inc.id;
            const flame = inc.flame_evaluation || { score: 50, category: 'MEDIUM' };
            const payload = inc.payload || {};
            const createdTime = new Date(inc.created_at).getTime();
            const elapsedMins = Math.max(1, Math.round((currentTime - createdTime) / 60000));

            return (
              <div
                key={inc.id}
                className={`incident-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectIncident(inc)}
              >
                <div className="incident-card-top">
                  <div className={`flame-badge ${flame.category.toLowerCase()}`}>
                    <Flame size={12} />
                    <span>{flame.score} {flame.category}</span>
                  </div>

                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontFamily: 'monospace',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: inc.status === 'RESOLVED' ? '#065F46' : inc.assigned_team_id ? '#1E3A8A' : '#374151',
                      color: inc.status === 'RESOLVED' ? '#34D399' : inc.assigned_team_id ? '#93C5FD' : '#9CA3AF',
                    }}
                  >
                    {inc.status}
                  </span>
                </div>

                <div className="card-title">
                  <span>{payload.emergency_type?.replace(/_/g, ' ')}</span>
                  {inc.flame_evaluation?.is_overridden && (
                    <span style={{ fontSize: '0.65rem', color: '#F59E0B', background: 'rgba(245,158,11,0.2)', padding: '1px 4px', borderRadius: 3 }}>
                      OVERRIDDEN
                    </span>
                  )}
                </div>

                <div className="card-meta-row">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Users size={12} /> {payload.people_affected || 1} victims ({payload.injuries || 0} injured)
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Clock size={12} /> {elapsedMins}m ago
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#38BDF8' }}>
                    📡 {inc.hop_count || 0} hops
                  </span>
                </div>

                {payload.landmark && (
                  <div style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'flex', alignItems: 'flex-start', gap: 4, marginBottom: 4 }}>
                    <MapPin size={12} style={{ flexShrink: 0, marginTop: 2, color: '#CBD5E1' }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {payload.landmark}
                    </span>
                  </div>
                )}

                {payload.hazards && payload.hazards.length > 0 && (
                  <div className="hazard-pills">
                    {payload.hazards.map((h, idx) => (
                      <span key={idx} className="hazard-pill">
                        ⚠️ {h.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}

                {/* Assigned Team Footer */}
                {inc.assigned_team && (
                  <div
                    style={{
                      marginTop: '0.5rem',
                      paddingTop: '0.4rem',
                      borderTop: '1px solid #1E293B',
                      fontSize: '0.72rem',
                      color: '#34D399',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontWeight: 600,
                    }}
                  >
                    <ShieldCheck size={13} />
                    <span>Assigned: {inc.assigned_team.name} ({inc.assigned_team.callsign})</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

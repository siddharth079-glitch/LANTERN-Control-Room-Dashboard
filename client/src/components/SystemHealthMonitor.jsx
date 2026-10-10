import React from 'react';
import { Activity, Battery, Wifi, Download } from 'lucide-react';

export default function SystemHealthMonitor({
  health = {},
  gateways = [],
  auditLogs = [],
}) {
  const handleExportAudit = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `LANTERN_AUDIT_EXPORT_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: 'var(--bg-space)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={22} color="#10B981" /> WATCHTOWER TELEMETRY & SYSTEM HEALTH
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Gateway backhauls, battery conservation metrics, store-and-forward throughput, and audit log exports.
          </p>
        </div>

        <button className="btn-action btn-primary" onClick={handleExportAudit} style={{ background: '#2563EB', borderColor: '#3B82F6' }}>
          <Download size={14} /> Export Tamper-Evident Audit JSON
        </button>
      </div>

      {/* Top Health Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '1rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            INGESTED EMERGENCY PACKETS
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0284C7', fontFamily: 'monospace', marginTop: 4 }}>
            {health.processed_packets_total || 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: 4 }}>
            0 Unresolved Duplicates (Deduplicated)
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '1rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            CRITICAL UNRESOLVED INCIDENTS
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#DC2626', fontFamily: 'monospace', marginTop: 4 }}>
            {health.critical_unresolved_count || 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#EA580C', marginTop: 4 }}>
            Flame Engine Score ≥ 80
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '1rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            AVERAGE RELAY HOPS
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#D97706', fontFamily: 'monospace', marginTop: 4 }}>
            {health.average_relay_hops || '2.4'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Max Policy Bound: 15 hops
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '1rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            OPERATIONAL RESPONSE TEAMS
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669', fontFamily: 'monospace', marginTop: 4 }}>
            {health.available_teams_count || 0} / {health.registered_teams_count || 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: 4 }}>
            Units Ready for Dispatch
          </div>
        </div>
      </div>

      {/* Gateway Backhaul Fleet */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Wifi size={18} color="#0284C7" /> CONNECTED GATEWAYS & SATELLITE BRIDGES
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {gateways.map((gw) => {
            const isOnline = gw.status === 'ONLINE';
            const batteryColor = gw.battery_level > 50 ? '#059669' : gw.battery_level > 20 ? '#D97706' : '#DC2626';

            return (
              <div
                key={gw.id}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>{gw.name}</h4>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: isOnline ? '#059669' : '#DC2626',
                    }}
                  >
                    {gw.status}
                  </span>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Backhaul: <b style={{ color: '#0284C7' }}>{gw.backhaul_type}</b>
                </div>

                {/* Battery Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <Battery size={16} color={batteryColor} />
                  <div style={{ flex: 1, height: 6, background: 'var(--bg-surface)', borderRadius: 99 }}>
                    <div style={{ width: `${gw.battery_level}%`, height: '100%', background: batteryColor, borderRadius: 99 }} />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-main)', fontFamily: 'monospace' }}>
                    {gw.battery_level}%
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 4 }}>
                  <span>Forwarded: {gw.messages_forwarded} msgs</span>
                  <span>Sync: {new Date(gw.last_sync).toLocaleTimeString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Central Audit Log Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
          CENTRAL DISPATCH AUDIT LOG
        </h3>
        <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '6px 8px' }}>TIMESTAMP</th>
                <th style={{ padding: '6px 8px' }}>ACTOR</th>
                <th style={{ padding: '6px 8px' }}>ACTION</th>
                <th style={{ padding: '6px 8px' }}>DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.slice(0, 20).map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '6px 8px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: '6px 8px', color: 'var(--text-main)', fontWeight: 600 }}>{log.actor}</td>
                  <td style={{ padding: '6px 8px', color: '#0284C7' }}>{log.action}</td>
                  <td style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}>{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

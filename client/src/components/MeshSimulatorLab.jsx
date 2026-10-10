import React, { useState } from 'react';
import {
  Wifi,
  Radio,
  Smartphone,
  Truck,
  Server,
  ArrowRight,
  Play,
  RotateCcw,
  CheckCircle,
  Lock,
} from 'lucide-react';

export default function MeshSimulatorLab({ onTriggerUpload = () => {} }) {
  const [currentHopIndex, setCurrentHopIndex] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationLog, setSimulationLog] = useState([]);
  const [batteryMode, setBatteryMode] = useState('NORMAL'); // NORMAL, SAVER, EMERGENCY
  const [packetStatus, setPacketStatus] = useState('IDLE'); // IDLE, IN_FLIGHT, DELIVERED, DROPPED

  const nodes = [
    {
      id: 'node-victim',
      title: 'Victim Phone (Origin)',
      type: 'DISCONNECTED_PHONE',
      icon: <Smartphone size={24} color="#DC2626" />,
      transport: 'Bluetooth LE Periodic Broadcast',
      desc: 'Zero cell towers or Wi-Fi. Signs SOS with secp256r1 key and broadcasts ephemeral BLE advertisement frames.',
    },
    {
      id: 'node-citizen',
      title: 'Citizen Phone (Relay #1)',
      type: 'OPPORTUNISTIC_COURIER',
      icon: <Smartphone size={24} color="#0284C7" />,
      transport: 'BLE / Wi-Fi Direct Peer Sync',
      desc: 'Civilian walking through disaster perimeter. Stores encrypted envelope locally (Store-and-Forward protocol).',
    },
    {
      id: 'node-vehicle',
      title: 'First Responder Patrol',
      type: 'MOBILE_CONVOY_MULE',
      icon: <Truck size={24} color="#059669" />,
      transport: 'Sub-GHz Mesh / LoRa 915MHz',
      desc: 'Vehicle traveling toward base camp. Ingests packet at 15km/h, appends hop verification metadata.',
    },
    {
      id: 'node-gateway',
      title: 'Solar Repeater Gateway',
      type: 'GATEWAY_NODE',
      icon: <Wifi size={24} color="#D97706" />,
      transport: 'HTTPS via Starlink Satellite Uplink',
      desc: 'Tower on hill with battery & high-gain dish. Buffers batched envelopes and uploads to LANTERN Watchtower.',
    },
    {
      id: 'node-server',
      title: 'Command Watchtower',
      type: 'CENTRAL_C2_SERVER',
      icon: <Server size={24} color="#7C3AED" />,
      transport: 'Express Engine & WebSocket Core',
      desc: 'Verifies detached signatures, evaluates Flame Engine triage priority score, and matches rescue teams.',
    },
  ];

  const addLog = (text) => {
    const timestamp = new Date().toLocaleTimeString();
    setSimulationLog((prev) => [{ id: Math.random().toString(), time: timestamp, text }, ...prev]);
  };

  const resetSimulation = () => {
    setIsSimulating(false);
    setCurrentHopIndex(0);
    setPacketStatus('IDLE');
    setSimulationLog([]);
    addLog('Simulation reset to initial offline state.');
  };

  const handleStepHop = () => {
    if (currentHopIndex >= nodes.length - 1) return;

    const nextIndex = currentHopIndex + 1;
    setCurrentHopIndex(nextIndex);
    setPacketStatus('IN_FLIGHT');

    const srcNode = nodes[currentHopIndex];
    const dstNode = nodes[nextIndex];

    addLog(`Hop ${nextIndex}: Packet transferred from [${srcNode.title}] to [${dstNode.title}] via ${dstNode.transport}`);

    if (nextIndex === nodes.length - 1) {
      setPacketStatus('DELIVERED');
      addLog('🎉 SUCCESS: Emergency Packet ingested into Command Center! Flame Engine triggered.');
      onTriggerUpload();
    }
  };

  const handleRunFullSimulation = () => {
    setIsSimulating(true);
    setCurrentHopIndex(0);
    setPacketStatus('IN_FLIGHT');
    setSimulationLog([]);
    addLog('Initiating Store-and-Forward Mesh Transfer pipeline...');

    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      if (step < nodes.length) {
        setCurrentHopIndex(step);
        addLog(`Hop ${step}: Transferred to [${nodes[step].title}] (${nodes[step].transport})`);
      } else {
        clearInterval(interval);
        setIsSimulating(false);
        setPacketStatus('DELIVERED');
        addLog('🎉 INGESTION COMPLETE: Watchtower received SOS. Incident priority calculated!');
        onTriggerUpload();
      }
    }, 1200);
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: 'var(--bg-space)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Radio size={22} color="#0284C7" /> STORE-AND-FORWARD MESH LAB
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Interactive simulation of opportunistic peer discovery, cryptographic envelope verification, and gateway backhaul upload (Sections 6 & 8).
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            className="btn-action btn-primary"
            disabled={isSimulating}
            onClick={handleRunFullSimulation}
            style={{ background: '#0284C7', borderColor: '#38BDF8' }}
          >
            <Play size={14} /> Run Full Multi-Hop Transfer
          </button>
          <button
            className="btn-action btn-secondary"
            disabled={isSimulating || currentHopIndex >= nodes.length - 1}
            onClick={handleStepHop}
          >
            <ArrowRight size={14} /> Step Single Hop ({currentHopIndex} → {currentHopIndex + 1})
          </button>
          <button className="btn-action btn-secondary" onClick={resetSimulation}>
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Battery & Radio Profile Bar */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>BATTERY MANAGEMENT POLICY</span>
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: 4 }}>
              {['NORMAL', 'POWER_SAVING', 'EMERGENCY_5%'].map((mode) => (
                <button
                  key={mode}
                  className={`filter-chip ${batteryMode === mode ? 'active' : ''}`}
                  onClick={() => setBatteryMode(mode)}
                  style={{ fontSize: '0.72rem' }}
                >
                  {mode.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
          <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '1.5rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>RELAY DISCOVERY FREQUENCY</span>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
              {batteryMode === 'NORMAL' ? 'Every 30s BLE ping' : batteryMode === 'POWER_SAVING' ? 'Every 2m burst' : 'Emergency 10m scan'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>PACKET STATUS</span>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, fontFamily: 'monospace', color: packetStatus === 'DELIVERED' ? '#059669' : packetStatus === 'IN_FLIGHT' ? '#0284C7' : 'var(--text-muted)' }}>
              {packetStatus}
            </div>
          </div>
          <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '1.5rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>DELIVERY INTEGRITY</span>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Lock size={13} /> Detached HMAC Signatures Enforced
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Hop Pipeline Diagram */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', position: 'relative' }}>
        {nodes.map((node, idx) => {
          const isPassed = idx < currentHopIndex;
          const isCurrent = idx === currentHopIndex;
          const isUpcoming = idx > currentHopIndex;

          let cardBorder = 'var(--border-subtle)';
          let cardBg = 'var(--bg-card)';
          if (isCurrent) {
            cardBorder = 'var(--flame-low)';
            cardBg = 'var(--flame-low-bg)';
          } else if (isPassed) {
            cardBorder = 'var(--status-emerald)';
            cardBg = 'var(--status-emerald-bg)';
          }

          return (
            <div
              key={node.id}
              style={{
                background: cardBg,
                border: `2px solid ${cardBorder}`,
                borderRadius: 12,
                padding: '1.15rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                position: 'relative',
                transition: 'all 0.3s ease',
                boxShadow: isCurrent ? '0 0 16px rgba(2, 132, 199, 0.2)' : 'var(--shadow-sm)',
                opacity: isUpcoming ? 0.7 : 1,
              }}
            >
              {/* Step indicator */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: isCurrent ? 'var(--flame-low)' : isPassed ? 'var(--status-emerald)' : 'var(--bg-surface)',
                    color: isCurrent || isPassed ? '#FFFFFF' : 'var(--text-secondary)',
                  }}
                >
                  HOP #{idx}
                </span>

                {isCurrent && (
                  <span className="pulse-dot" style={{ background: '#0284C7', boxShadow: '0 0 10px #0284C7' }} />
                )}
                {isPassed && <CheckCircle size={14} color="#059669" />}
              </div>

              {/* Node Icon & Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <div style={{ background: 'var(--bg-surface)', padding: 8, borderRadius: 8 }}>
                  {node.icon}
                </div>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)' }}>{node.title}</h4>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{node.type}</div>
                </div>
              </div>

              {/* Transport Protocol */}
              <div style={{ marginTop: '0.2rem', padding: '0.4rem', background: 'var(--bg-secondary)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  PHYSICAL TRANSPORT
                </span>
                <div style={{ fontSize: '0.72rem', color: '#0284C7', fontWeight: 600 }}>
                  {node.transport}
                </div>
              </div>

              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {node.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Real-time Transfer Event Log */}
      <div style={{ marginTop: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '1rem', boxShadow: 'var(--shadow-sm)' }}>
        <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          LIVE MESH TRANSMISSION JOURNAL
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: '180px', overflowY: 'auto' }}>
          {simulationLog.length === 0 ? (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Press "Run Full Multi-Hop Transfer" or "Step Single Hop" to observe packet propagation.
            </div>
          ) : (
            simulationLog.map((log) => (
              <div key={log.id} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                <span style={{ color: 'var(--text-muted)' }}>[{log.time}]</span> {log.text}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

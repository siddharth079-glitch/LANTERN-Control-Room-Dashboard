import React, { useState } from 'react';
import {
  Flame,
  Battery,
  WifiOff,
  Send,
  X,
  RefreshCw,
  CheckCircle2,
  Radio,
} from 'lucide-react';

export default function MobileVictimSimulator({
  onClose = () => {},
  onSosSubmittedToGateway = () => {},
}) {
  const [step, setStep] = useState('FORM'); // 'FORM' | 'SAVED'
  const [emergencyType, setEmergencyType] = useState('TRAPPED');
  const [severity, setSeverity] = useState('CRITICAL');
  const [peopleAffected, setPeopleAffected] = useState(3);
  const [injuries, setInjuries] = useState(1);
  const [hazards, setHazards] = useState(['unstable_structure', 'severe_bleeding']);
  const [vulnerabilities, setVulnerabilities] = useState(['elderly']);
  const [landmark, setLandmark] = useState('Basement laundry room, door blocked by fallen beam');
  const [deviceKeyId] = useState(() => 'dev-pixel7-' + Math.random().toString(36).substr(2, 6));

  // Delivery Lifecycle state on device
  const [deliveryState, setDeliveryState] = useState('STORED_OFFLINE'); // STORED_OFFLINE, RELAYED, GATEWAY_RECEIVED, SERVER_ACCEPTED, ASSIGNED
  const [hopCount, setHopCount] = useState(0);
  const [currentEnvelope, setCurrentEnvelope] = useState(null);
  const [isRelaying, setIsRelaying] = useState(false);

  const toggleHazard = (h) => {
    setHazards((prev) => (prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]));
  };

  const toggleVuln = (v) => {
    setVulnerabilities((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  };

  const handleCreateAndSignSOS = () => {
    const incId = 'inc-user-' + Math.random().toString(36).substr(2, 7);
    const msgId = 'msg-' + Math.random().toString(36).substr(2, 7);
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 48 * 3600000).toISOString();

    // Coordinates jittered around epicenter
    const lat = 37.7749 + (Math.random() - 0.5) * 0.02;
    const lng = -122.4194 + (Math.random() - 0.5) * 0.02;

    const envelope = {
      message_id: msgId,
      incident_id: incId,
      schema_version: 1,
      origin_device_key_id: deviceKeyId,
      created_at: now,
      expires_at: expiresAt,
      message_type: 'SOS_CREATED',
      payload: {
        emergency_type: emergencyType,
        severity,
        people_affected: Number(peopleAffected),
        injuries: Number(injuries),
        hazards,
        vulnerabilities,
        location: {
          latitude: Number(lat.toFixed(6)),
          longitude: Number(lng.toFixed(6)),
          accuracy_meters: 20,
          source: 'GPS',
        },
        landmark,
      },
      previous_message_hash: null,
      hop_count: 0,
      signature: 'detached-hmac-sha256-sig-' + Math.random().toString(36).substr(2, 10),
    };

    setCurrentEnvelope(envelope);
    setDeliveryState('STORED_OFFLINE');
    setHopCount(0);
    setStep('SAVED');
  };

  const handleSimulateRelayPeer = () => {
    setIsRelaying(true);
    setTimeout(() => {
      setIsRelaying(false);
      setDeliveryState('RELAYED');
      setHopCount(1);
    }, 800);
  };

  const handleSimulateGatewayUpload = async () => {
    if (!currentEnvelope) return;
    setIsRelaying(true);

    const relayedEnvelope = {
      ...currentEnvelope,
      hop_count: hopCount + 1,
    };

    try {
      const res = await fetch('/api/gateway/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateway_id: 'GW-MOBILE-VAN-01',
          batch: {
            messages: [relayedEnvelope],
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDeliveryState('SERVER_ACCEPTED');
        setHopCount((prev) => prev + 1);
        onSosSubmittedToGateway(relayedEnvelope.incident_id);
      }
    } catch (e) {
      console.error('Gateway upload error', e);
    } finally {
      setIsRelaying(false);
    }
  };

  const handleResetForm = () => {
    setStep('FORM');
    setDeliveryState('STORED_OFFLINE');
    setCurrentEnvelope(null);
  };

  return (
    <div className="mobile-simulator-dock">
      {/* Top Phone Casing Speaker / Notch */}
      <div className="phone-speaker-notch">
        <div className="camera-lens" />
      </div>

      {/* Phone Screen Canvas */}
      <div className="phone-screen">
        {/* Status Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: '#94A3B8', borderBottom: '1px solid #1E293B', paddingBottom: '0.4rem', marginBottom: '0.5rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#EF4444', fontWeight: 700 }}>
            <WifiOff size={12} /> NO CELLULAR (BLE MESH)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Battery size={13} color="#10B981" /> 78%
          </span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>

        {/* Brand Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 22, height: 22, borderRadius: 5, background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Flame size={14} color="#FFFFFF" />
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.04em' }}>LANTERN OFFLINE</span>
          </div>
          <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: '#64748B' }}>
            {deviceKeyId}
          </span>
        </div>

        {/* STEP 1: SOS CREATION FORM */}
        {step === 'FORM' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, padding: '0.5rem', fontSize: '0.72rem', color: '#FCA5A5' }}>
              ⚠️ Zero cellular or Wi-Fi required. Your message will be cryptographically signed and opportunistically carried by nearby phones until reaching a gateway.
            </div>

            {/* Emergency Type Selection */}
            <div>
              <label style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>
                1. Select Emergency Category
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 4 }}>
                {[
                  { id: 'TRAPPED', label: '🏚️ Trapped / Collapse' },
                  { id: 'MEDICAL_INJURY', label: '🩹 Medical Injury' },
                  { id: 'FIRE', label: '🔥 Active Fire' },
                  { id: 'EVACUATION', label: '🌊 Flood Evac' },
                  { id: 'SUPPLIES_WATER', label: '💧 Water / Supplies' },
                  { id: 'MISSING_PERSON', label: '🔍 Missing Person' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setEmergencyType(item.id)}
                    style={{
                      background: emergencyType === item.id ? '#DC2626' : 'var(--bg-secondary)',
                      color: emergencyType === item.id ? '#FFFFFF' : 'var(--text-secondary)',
                      border: '1px solid',
                      borderColor: emergencyType === item.id ? '#DC2626' : 'var(--border-subtle)',
                      borderRadius: 6,
                      padding: '0.4rem 0.3rem',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Victim Counts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 700 }}>PEOPLE AFFECTED</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  className="search-input"
                  style={{ padding: '0.35rem 0.5rem', marginTop: 3 }}
                  value={peopleAffected}
                  onChange={(e) => setPeopleAffected(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 700 }}>INJURIES</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  className="search-input"
                  style={{ padding: '0.35rem 0.5rem', marginTop: 3 }}
                  value={injuries}
                  onChange={(e) => setInjuries(e.target.value)}
                />
              </div>
            </div>

            {/* Severity Level Selector */}
            <div>
              <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Severity Assessment
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginTop: 4 }}>
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => {
                  const isSelected = severity === lvl;
                  const bg = lvl === 'CRITICAL' ? '#DC2626' : lvl === 'HIGH' ? '#EA580C' : lvl === 'MEDIUM' ? '#CA8A04' : '#0284C7';
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSeverity(lvl)}
                      style={{
                        padding: '4px 2px',
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        borderRadius: 4,
                        border: '1px solid',
                        borderColor: isSelected ? bg : 'var(--border-subtle)',
                        background: isSelected ? bg : 'var(--bg-secondary)',
                        color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hazards Checkboxes */}
            <div>
              <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                2. Immediate Hazards
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                {[
                  { id: 'unstable_structure', label: 'Unstable Structure' },
                  { id: 'severe_bleeding', label: 'Severe Bleeding' },
                  { id: 'gas_leak', label: 'Gas Smell/Leak' },
                  { id: 'electrical', label: 'Downed Power Lines' },
                  { id: 'smoke_inhalation', label: 'Heavy Smoke' },
                ].map((hz) => (
                  <button
                    key={hz.id}
                    onClick={() => toggleHazard(hz.id)}
                    style={{
                      fontSize: '0.66rem',
                      padding: '2px 6px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      border: '1px solid',
                      background: hazards.includes(hz.id) ? 'var(--flame-critical-bg)' : 'var(--bg-secondary)',
                      borderColor: hazards.includes(hz.id) ? 'var(--flame-critical-border)' : 'var(--border-subtle)',
                      color: hazards.includes(hz.id) ? 'var(--flame-critical)' : 'var(--text-secondary)',
                    }}
                  >
                    {hazards.includes(hz.id) ? '✓ ' : '+ '}
                    {hz.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Vulnerability Indicators */}
            <div>
              <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                3. High-Risk Vulnerabilities
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                {[
                  { id: 'elderly', label: 'Elderly / Senior' },
                  { id: 'infant_children', label: 'Infant / Children' },
                  { id: 'mobility_impaired', label: 'Mobility Impaired' },
                  { id: 'medical_dependent', label: 'Oxygen / Meds Needed' },
                ].map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => toggleVuln(v.id)}
                    style={{
                      fontSize: '0.66rem',
                      padding: '2px 6px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      border: '1px solid',
                      background: vulnerabilities.includes(v.id) ? 'var(--flame-low-bg)' : 'var(--bg-secondary)',
                      borderColor: vulnerabilities.includes(v.id) ? 'var(--flame-low-border)' : 'var(--border-subtle)',
                      color: vulnerabilities.includes(v.id) ? 'var(--flame-low)' : 'var(--text-secondary)',
                    }}
                  >
                    {vulnerabilities.includes(v.id) ? '✓ ' : '+ '}
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Landmark & Manual Location */}
            <div>
              <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                4. Physical Landmark & Floor
              </label>
              <textarea
                className="search-input"
                rows={2}
                style={{ padding: '0.4rem', marginTop: 3, resize: 'none' }}
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g., 2nd floor staircase near collapsed east wall"
              />
            </div>

            {/* Big Send SOS Button */}
            <button
              onClick={handleCreateAndSignSOS}
              style={{
                background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '0.75rem',
                fontSize: '0.88rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)',
                marginTop: '0.25rem',
              }}
            >
              <Send size={15} /> GENERATE & SIGN OFFLINE SOS
            </button>
          </div>
        ) : (
          /* STEP 2: HONEST DELIVERY STATE LIFECYCLE TRACKER */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '0.75rem', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                CURRENT DELIVERY STATUS
              </div>
              <div
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: deliveryState === 'SERVER_ACCEPTED' ? '#059669' : deliveryState === 'RELAYED' ? '#0284C7' : '#D97706',
                  marginTop: 2,
                }}
              >
                {deliveryState === 'STORED_OFFLINE' && '💾 Saved on this device'}
                {deliveryState === 'RELAYED' && '📡 Relayed to nearby device'}
                {deliveryState === 'SERVER_ACCEPTED' && '🏛️ Received by Command Center'}
              </div>

              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Hops Traversed: <b style={{ color: 'var(--text-main)' }}>{hopCount}</b> | Retries: 0
              </div>
            </div>

            {/* Honest Status Progression Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: 'var(--text-main)' }}>
                <CheckCircle2 size={15} color="#059669" />
                <span>1. Encrypted locally on phone (Stored Offline)</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: hopCount >= 1 ? 'var(--text-main)' : 'var(--text-muted)' }}>
                {hopCount >= 1 ? <CheckCircle2 size={15} color="#059669" /> : <div style={{ width: 15, height: 15, borderRadius: '50%', border: '1px solid var(--border-medium)' }} />}
                <span>2. Relayed to nearby BLE peer</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: deliveryState === 'SERVER_ACCEPTED' ? 'var(--text-main)' : 'var(--text-muted)' }}>
                {deliveryState === 'SERVER_ACCEPTED' ? <CheckCircle2 size={15} color="#059669" /> : <div style={{ width: 15, height: 15, borderRadius: '50%', border: '1px solid var(--border-medium)' }} />}
                <span>3. Reached connected Gateway</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: deliveryState === 'SERVER_ACCEPTED' ? 'var(--text-main)' : 'var(--text-muted)' }}>
                {deliveryState === 'SERVER_ACCEPTED' ? <CheckCircle2 size={15} color="#059669" /> : <div style={{ width: 15, height: 15, borderRadius: '50%', border: '1px solid var(--border-medium)' }} />}
                <span>4. Ingested & Flame Evaluated at Command</span>
              </div>
            </div>

            {/* Strategic Product Principle Notice (Section 21) */}
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic', borderLeft: '2px solid #D97706', paddingLeft: '0.5rem' }}>
              "Your request is protected, carried whenever a path becomes available, and clearly labeled at every delivery stage."
            </div>

            {/* Interactive Simulation Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: '0.25rem' }}>
              {deliveryState === 'STORED_OFFLINE' && (
                <button
                  className="btn-action btn-secondary"
                  disabled={isRelaying}
                  onClick={handleSimulateRelayPeer}
                  style={{ width: '100%', justifyContent: 'center', fontSize: '0.75rem', borderColor: '#38BDF8', color: '#38BDF8' }}
                >
                  <Radio size={14} /> Simulate Bluetooth Peer Discovery (Hop +1)
                </button>
              )}

              {deliveryState !== 'SERVER_ACCEPTED' && (
                <button
                  className="btn-action btn-primary"
                  disabled={isRelaying}
                  onClick={handleSimulateGatewayUpload}
                  style={{ width: '100%', justifyContent: 'center', fontSize: '0.75rem', background: '#0284C7' }}
                >
                  <Send size={14} /> Simulate Reaching Gateway & Uploading to Cloud
                </button>
              )}

              {deliveryState === 'SERVER_ACCEPTED' && (
                <div style={{ padding: '0.65rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10B981', borderRadius: 8, textAlign: 'center', fontSize: '0.75rem', color: '#34D399', fontWeight: 600 }}>
                  ✓ SOS successfully ingested into Watchtower Command queue! Check the main screen queue.
                </div>
              )}

              <button
                className="btn-action btn-secondary"
                onClick={handleResetForm}
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.72rem', marginTop: 4 }}
              >
                <RefreshCw size={12} /> Create Another SOS
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

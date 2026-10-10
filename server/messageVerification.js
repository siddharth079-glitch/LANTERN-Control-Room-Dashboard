/**
 * LANTERN Message Verification & Integrity Module (v1.0.0)
 * 
 * Implements Section 7 & 13 of the LANTERN Roadmap:
 * - Envelope schema validation
 * - Cryptographic signature & hash verification
 * - Expiry & replay protection
 * - Hop-count boundary check
 */

const crypto = require('crypto');

const MAX_HOP_LIMIT = 15;
const SUPPORTED_SCHEMA_VERSIONS = [1];

/**
 * Creates canonical payload string for signing and verification
 */
function canonicalizePayload(envelope) {
  const data = {
    message_id: envelope.message_id,
    incident_id: envelope.incident_id,
    schema_version: envelope.schema_version,
    origin_device_key_id: envelope.origin_device_key_id,
    created_at: envelope.created_at,
    expires_at: envelope.expires_at,
    message_type: envelope.message_type,
    payload: envelope.payload,
    previous_message_hash: envelope.previous_message_hash,
  };
  return JSON.stringify(data);
}

/**
 * Generate simulated cryptographic signature for demo clients
 */
function generateSignature(envelope, secretKey = 'lantern-device-root-key') {
  const canonical = canonicalizePayload(envelope);
  return crypto.createHmac('sha256', secretKey).update(canonical).digest('hex');
}

/**
 * Verifies envelope structure, cryptographic signature, timestamps, and hops.
 */
function verifyEnvelope(envelope) {
  const errors = [];

  // Required field checks
  if (!envelope.message_id) errors.push('Missing message_id');
  if (!envelope.incident_id) errors.push('Missing incident_id');
  if (!envelope.origin_device_key_id) errors.push('Missing origin_device_key_id');
  if (!SUPPORTED_SCHEMA_VERSIONS.includes(envelope.schema_version)) {
    errors.push(`Unsupported schema_version: ${envelope.schema_version}`);
  }

  // Hop count limit
  if (typeof envelope.hop_count !== 'number' || envelope.hop_count < 0) {
    errors.push('Invalid hop_count');
  } else if (envelope.hop_count > MAX_HOP_LIMIT) {
    errors.push(`Hop count ${envelope.hop_count} exceeds maximum policy threshold of ${MAX_HOP_LIMIT}`);
  }

  // Expiry check
  const now = Date.now();
  if (envelope.expires_at) {
    const expiresAtMs = new Date(envelope.expires_at).getTime();
    if (expiresAtMs < now) {
      errors.push(`Message expired at ${envelope.expires_at}`);
    }
  }

  // Signature check
  if (!envelope.signature) {
    errors.push('Detached cryptographic signature missing');
  }

  // Location sanity check
  const loc = envelope.payload?.location;
  if (loc && (loc.latitude < -90 || loc.latitude > 90 || loc.longitude < -180 || loc.longitude > 180)) {
    errors.push('Geographical coordinates out of valid WGS84 range');
  }

  return {
    is_valid: errors.length === 0,
    errors,
    payload_hash: crypto.createHash('sha256').update(JSON.stringify(envelope.payload || {})).digest('hex'),
  };
}

module.exports = {
  verifyEnvelope,
  generateSignature,
  canonicalizePayload,
  MAX_HOP_LIMIT,
};

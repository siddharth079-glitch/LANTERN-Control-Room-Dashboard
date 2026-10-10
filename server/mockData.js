/**
 * LANTERN Mock Data & Initial Disaster Scenario
 * Scenario: Magnitude 7.1 Seismic Disaster - Metro Harbor District
 */

const crypto = require('crypto');
const { generateSignature } = require('./messageVerification');

// Coordinates centered around San Francisco / Bay Area disaster zone simulation
const BASE_LAT = 37.7749;
const BASE_LNG = -122.4194;

const INITIAL_TEAMS = [
  {
    id: 'team-alpha-1',
    name: 'USAR Taskforce Alpha-1',
    type: 'HEAVY_RESCUE',
    capabilities: ['STRUCTURAL_COLLAPSE', 'HEAVY_EXTRICATION', 'SEARCH_AND_RESCUE', 'GENERAL_RESCUE'],
    personnel_count: 8,
    equipment: ['Hydraulic Shears', 'Search Cams', 'Concrete Breakers', 'K9 Search Unit'],
    status: 'AVAILABLE',
    current_location: { latitude: BASE_LAT + 0.012, longitude: BASE_LNG - 0.015 },
    callsign: 'T-ALPHA-1',
    radio_channel: 'TAC-3',
  },
  {
    id: 'team-medstar-4',
    name: 'MedStar Tactical EMS-4',
    type: 'PARAMEDIC_TRIAGE',
    capabilities: ['ADVANCED_MEDICAL_TRIAGE', 'GENERAL_RESCUE'],
    personnel_count: 4,
    equipment: ['Field Blood Plasma', 'Portable Ventilator', 'Triage Splints', 'Tourniquet Kits'],
    status: 'AVAILABLE',
    current_location: { latitude: BASE_LAT - 0.008, longitude: BASE_LNG + 0.011 },
    callsign: 'MED-4',
    radio_channel: 'MED-1',
  },
  {
    id: 'team-marine-6',
    name: 'Pacific Swiftwater Rescue-6',
    type: 'WATER_RESCUE',
    capabilities: ['SWIFTWATER_RESCUE', 'EVACUATION_TRANSPORT', 'GENERAL_RESCUE'],
    personnel_count: 6,
    equipment: ['Zodiac Rescue Boats', 'Drysuits', 'High-line Rigging'],
    status: 'AVAILABLE',
    current_location: { latitude: BASE_LAT - 0.022, longitude: BASE_LNG - 0.035 },
    callsign: 'WATER-6',
    radio_channel: 'TAC-5',
  },
  {
    id: 'team-hazmat-9',
    name: 'HazMat Containment Squad 9',
    type: 'HAZMAT',
    capabilities: ['HAZMAT_CONTAINMENT', 'STRUCTURAL_COLLAPSE'],
    personnel_count: 5,
    equipment: ['Level A Suits', 'Multi-Gas Detectors', 'Decontamination Pod'],
    status: 'AVAILABLE',
    current_location: { latitude: BASE_LAT + 0.025, longitude: BASE_LNG + 0.018 },
    callsign: 'HAZ-9',
    radio_channel: 'SPECIAL-OPS',
  },
  {
    id: 'team-skyeye-drone',
    name: 'SkyEye Aerial Recon Unit',
    type: 'DRONE_SURVEILLANCE',
    capabilities: ['DRONE_RECON', 'SEARCH_AND_RESCUE'],
    personnel_count: 2,
    equipment: ['Thermal FLIR Drones', 'Satellite Mesh Tether', 'RF Beacon Finder'],
    status: 'AVAILABLE',
    current_location: { latitude: BASE_LAT + 0.005, longitude: BASE_LNG + 0.002 },
    callsign: 'SKY-1',
    radio_channel: 'AIR-2',
  },
];

const INITIAL_GATEWAYS = [
  {
    id: 'gw-mobile-van-01',
    name: 'Mobile Gateway Vehicle 01 (Starlink Backhaul)',
    type: 'MOBILE_VEHICLE',
    status: 'ONLINE',
    battery_level: 88,
    backhaul_type: 'STARLINK_SATELLITE',
    last_sync: new Date(Date.now() - 45000).toISOString(),
    messages_forwarded: 42,
    location: { latitude: BASE_LAT + 0.004, longitude: BASE_LNG - 0.009 },
  },
  {
    id: 'gw-tower-hilltop',
    name: 'Twin Peaks Solar Relay Hub',
    type: 'FIXED_SOLAR',
    status: 'ONLINE',
    battery_level: 95,
    backhaul_type: 'EMERGENCY_MICROWAVE',
    last_sync: new Date(Date.now() - 15000).toISOString(),
    messages_forwarded: 118,
    location: { latitude: BASE_LAT - 0.018, longitude: BASE_LNG - 0.028 },
  },
  {
    id: 'gw-shelter-harbor',
    name: 'Civic Shelter Gateway #2',
    type: 'SHELTER_GENERATOR',
    status: 'DEGRADED',
    battery_level: 42,
    backhaul_type: 'CELLULAR_LTE_INTERMITTENT',
    last_sync: new Date(Date.now() - 180000).toISOString(),
    messages_forwarded: 67,
    location: { latitude: BASE_LAT + 0.031, longitude: BASE_LNG - 0.019 },
  },
];

// Helper to construct sample signed envelopes
function createSampleEnvelope({
  message_id,
  incident_id,
  emergency_type,
  severity,
  people_affected,
  injuries,
  hazards,
  vulnerabilities = [],
  latitude,
  longitude,
  accuracy_meters = 25,
  landmark,
  hop_count = 2,
  minutesAgo = 10,
}) {
  const createdAt = new Date(Date.now() - minutesAgo * 60000).toISOString();
  const expiresAt = new Date(Date.now() + 48 * 3600000).toISOString();

  const env = {
    message_id,
    incident_id,
    schema_version: 1,
    origin_device_key_id: `pubkey-${crypto.randomBytes(4).toString('hex')}`,
    created_at: createdAt,
    expires_at: expiresAt,
    message_type: 'SOS_CREATED',
    payload: {
      emergency_type,
      severity,
      people_affected,
      injuries,
      hazards,
      vulnerabilities,
      location: {
        latitude,
        longitude,
        accuracy_meters,
        source: 'GPS',
      },
      landmark,
    },
    previous_message_hash: null,
    hop_count,
    signature: '',
  };

  env.signature = generateSignature(env);
  return env;
}

const INITIAL_INCIDENTS_SEED = [
  {
    envelope: createSampleEnvelope({
      message_id: 'msg-seed-101',
      incident_id: 'inc-quake-trapped-01',
      emergency_type: 'TRAPPED',
      severity: 'CRITICAL',
      people_affected: 4,
      injuries: 2,
      hazards: ['unstable_structure', 'severe_bleeding', 'gas_leak'],
      vulnerabilities: ['elderly', 'child'],
      latitude: BASE_LAT + 0.008,
      longitude: BASE_LNG - 0.012,
      accuracy_meters: 15,
      landmark: 'Collapsed 3-story parking garage, lower tier B3',
      hop_count: 3,
      minutesAgo: 22,
    }),
    status: 'ACKNOWLEDGED',
    assigned_team_id: null,
    relayed_via: ['device-pixel7-9812', 'device-samsung21-4410', 'gw-mobile-van-01'],
  },
  {
    envelope: createSampleEnvelope({
      message_id: 'msg-seed-102',
      incident_id: 'inc-quake-medical-02',
      emergency_type: 'MEDICAL_INJURY',
      severity: 'CRITICAL',
      people_affected: 2,
      injuries: 1,
      hazards: ['severe_bleeding', 'unconscious'],
      vulnerabilities: ['diabetic_shock'],
      latitude: BASE_LAT - 0.005,
      longitude: BASE_LNG + 0.008,
      accuracy_meters: 30,
      landmark: 'Market Street sidewalk outside pharmacy',
      hop_count: 2,
      minutesAgo: 14,
    }),
    status: 'ASSIGNED',
    assigned_team_id: 'team-medstar-4',
    relayed_via: ['device-moto-g-3321', 'gw-mobile-van-01'],
  },
  {
    envelope: createSampleEnvelope({
      message_id: 'msg-seed-103',
      incident_id: 'inc-water-flood-03',
      emergency_type: 'EVACUATION',
      severity: 'HIGH',
      people_affected: 7,
      injuries: 0,
      hazards: ['rising_flood_water', 'power_down'],
      vulnerabilities: ['mobility_impaired'],
      latitude: BASE_LAT - 0.019,
      longitude: BASE_LNG - 0.022,
      accuracy_meters: 45,
      landmark: 'Harbor apartment basement stairs flooded',
      hop_count: 4,
      minutesAgo: 38,
    }),
    status: 'SERVER_ACCEPTED',
    assigned_team_id: null,
    relayed_via: ['device-oneplus-11', 'device-pixel6a-77', 'device-galaxyA-52', 'gw-tower-hilltop'],
  },
  {
    envelope: createSampleEnvelope({
      message_id: 'msg-seed-104',
      incident_id: 'inc-supplies-04',
      emergency_type: 'SUPPLIES_WATER',
      severity: 'MEDIUM',
      people_affected: 12,
      injuries: 0,
      hazards: ['no_potable_water'],
      vulnerabilities: ['infants'],
      latitude: BASE_LAT + 0.021,
      longitude: BASE_LNG + 0.015,
      accuracy_meters: 80,
      landmark: 'St. Jude Community Hall shelter cutoff',
      hop_count: 2,
      minutesAgo: 55,
    }),
    status: 'SERVER_ACCEPTED',
    assigned_team_id: null,
    relayed_via: ['device-redmi-note10', 'gw-shelter-harbor'],
  },
];

module.exports = {
  BASE_LAT,
  BASE_LNG,
  INITIAL_TEAMS,
  INITIAL_GATEWAYS,
  INITIAL_INCIDENTS_SEED,
  createSampleEnvelope,
};

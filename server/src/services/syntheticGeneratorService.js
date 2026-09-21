/**
 * CONSTELLATION — Multi-Scenario Synthetic Intelligence Generator Service
 *
 * Generates rich, coherent, structurally-sound fictional investigation scenarios:
 * - Scenario A: Organized Syndicate (Centrality, bridge entities, front companies, communities)
 * - Scenario B: Communication Network (Burner phones, IMEI sharing, call bursts, VoIP relays)
 * - Scenario C: Multi-Location Investigation (Transnational & interstate movement, transit hubs)
 * - Scenario D: Transaction Network (Hawala tokens, mule accounts, crypto OTC wash, laundering chains)
 * - Scenario E: Cross-Case Investigation (Multiple cases, shared suspects, overlapping evidence)
 * - Scenario F: Large Network Stress Test (Parametric scalable graph for performance testing)
 *
 * All generated records are tagged with:
 * - source: 'synthetic'
 * - provenance: 'SYNTHETIC / DEMONSTRATION DATA'
 *
 * Direct integration into the canonical ingestion pipeline:
 * GENERATOR -> INGESTION -> VALIDATION -> NORMALIZATION -> ENTITY RESOLUTION -> DATASTORE
 */
import { ENTITY_TYPES, RELATIONSHIP_TYPES } from '@constellation/shared/constants.js';
import { ingestionService } from './ingestionService.js';
import { store } from '../data/store.js';

export const SCENARIO_DEFINITIONS = Object.freeze({
  SCENARIO_A: {
    id: 'SCENARIO_A',
    name: 'Organized Syndicate',
    description: 'Hierarchical transnational crime syndicate with Kingpin, lieutenants, hawaladars, logistics cutouts, and front companies.',
    focus: ['Centrality', 'Bridge Nodes', 'Community Clusters'],
  },
  SCENARIO_B: {
    id: 'SCENARIO_B',
    name: 'Communication Network',
    description: 'Burner phone fleet with high-frequency call bursts, encrypted VoIP matrix relays, and shared hardware IMEI anomalies.',
    focus: ['Telecommunications', 'Shared IMEI', 'Burst Calls'],
  },
  SCENARIO_C: {
    id: 'SCENARIO_C',
    name: 'Multi-Location Investigation',
    description: 'Inter-state and international operational movement across Delhi, Mumbai, Dubai, Kandla, Bengaluru, and Ahmedabad.',
    focus: ['Geospatial Clusters', 'Transit Hubs', 'Movement Routes'],
  },
  SCENARIO_D: {
    id: 'SCENARIO_D',
    name: 'Transaction Network',
    description: 'Complex financial layering network using Hawala tokens, rural cooperative mule accounts, and crypto OTC wash counters.',
    focus: ['Financial Flow', 'Mule Rings', 'Layering Chains'],
  },
  SCENARIO_E: {
    id: 'SCENARIO_E',
    name: 'Cross-Case Investigation',
    description: 'Multi-FIR investigation uncovering common suspects, burner phones, and safehouses shared between independent active cases.',
    focus: ['Cross-Case Nexus', 'Multi-Agency Linkage', 'Cold Case Links'],
  },
  SCENARIO_F: {
    id: 'SCENARIO_F',
    name: 'Large Network Stress Test',
    description: 'Scalable parametric network designed for performance, betweenness centrality, and graph layout stress testing.',
    focus: ['High Scale', 'Algorithmic Stress', 'Complex Topology'],
  },
});

export const PRESET_CONFIGS = Object.freeze({
  SMALL: {
    label: 'Small (Tactical Cell)',
    entities: 20,
    locations: 6,
    events: 8,
    evidence: 5,
  },
  MEDIUM: {
    label: 'Medium (Regional Syndicate)',
    entities: 50,
    locations: 15,
    events: 25,
    evidence: 12,
  },
  LARGE: {
    label: 'Large (Transnational Syndicate)',
    entities: 120,
    locations: 30,
    events: 50,
    evidence: 25,
  },
  STRESS_TEST: {
    label: 'Stress Test (Mega Network)',
    entities: 300,
    locations: 60,
    events: 100,
    evidence: 50,
  },
});

// Fictional realistic naming pools
const FIRST_NAMES = ['Arjun', 'Kabir', 'Rohan', 'Sameer', 'Vikram', 'Dinesh', 'Farhan', 'Rajesh', 'Dev', 'Manish', 'Imran', 'Bilal', 'Karan', 'Sanjay', 'Aditya', 'Naveen', 'Pradeep', 'Siddharth', 'Vishal', 'Aman'];
const LAST_NAMES = ['Singhania', 'Merchant', 'Khatri', 'Malhotra', 'Sheikh', 'Solanki', 'Baig', 'Chopra', 'Varma', 'Qureshi', 'Kapoor', 'Agrawal', 'Deshmukh', 'Patel', 'Reddy', 'Chauhan', 'Mehta', 'Nair', 'Sharma', 'Gupta'];
const ALIASES = ['Viper', 'Shadow', 'Falcon', 'Ghost', 'Blade', 'Munshi', 'Doctor', 'Tiger', 'Capo', 'Proxy', 'Navigator', 'Cashier', 'Architect', 'Operator', 'Anchor', 'Broker'];
const ORG_NAMES = ['Apex Global Trading FZE', 'Blue Horizon Logistics Ltd', 'Golden Gateway FinTech', 'Royal Crest Bullion Corp', 'Al-Noor Maritime Charters', 'Starlight Real Estate Holdings', 'Zenith Cloud Services LLP', 'Indus Valley Agro Exports', 'Falcon Freight Forwarders', 'Matrix Cyber Security Systems'];
const CITIES = [
  { city: 'New Delhi', state: 'Delhi', country: 'India', lat: 28.6139, lng: 77.2090 },
  { city: 'Mumbai', state: 'Maharashtra', country: 'India', lat: 19.0760, lng: 72.8777 },
  { city: 'Bengaluru', state: 'Karnataka', country: 'India', lat: 12.9716, lng: 77.5946 },
  { city: 'Ahmedabad', state: 'Gujarat', country: 'India', lat: 23.0225, lng: 72.5714 },
  { city: 'Kandla', state: 'Gujarat', country: 'India', lat: 23.0167, lng: 70.2167 },
  { city: 'Kolkata', state: 'West Bengal', country: 'India', lat: 22.5726, lng: 88.3639 },
  { city: 'Hyderabad', state: 'Telangana', country: 'India', lat: 17.3850, lng: 78.4867 },
  { city: 'Dubai', state: 'Dubai Emirate', country: 'UAE', lat: 25.2048, lng: 55.2708 },
];

export class SyntheticGeneratorService {
  constructor(ingestSvc = ingestionService, dataStore = store) {
    this.ingestService = ingestSvc;
    this.store = dataStore;
  }

  /**
   * Generates a coherent fictional dataset according to scenario and parameters
   */
  generateDataset({
    scenario = 'SCENARIO_A',
    preset = 'MEDIUM',
    entityCount = null,
    caseId = 'CASE-2024-VORTEX',
    density = 1.0,
  } = {}) {
    const presetConfig = PRESET_CONFIGS[preset] || PRESET_CONFIGS.MEDIUM;
    const targetEntities = entityCount ? Math.min(600, Math.max(10, parseInt(entityCount, 10))) : presetConfig.entities;
    const targetLocations = Math.min(100, Math.max(4, Math.round(presetConfig.locations * (targetEntities / presetConfig.entities))));
    const targetEvents = Math.min(150, Math.max(5, Math.round(presetConfig.events * (targetEntities / presetConfig.entities))));
    const targetEvidence = Math.min(80, Math.max(3, Math.round(presetConfig.evidence * (targetEntities / presetConfig.entities))));

    const timestampBase = Date.now();
    const runId = Math.random().toString(36).substring(2, 6).toUpperCase();

    const entities = [];
    const relationships = [];
    const locations = [];
    const events = [];
    const evidence = [];

    // Helper randoms
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randPhone = () => `+91 ${randInt(90000, 99999)} ${randInt(10000, 99999)}`;
    const randIMEI = () => `864${randInt(100000000000, 999999999999)}`;
    const randPlate = () => {
      const state = pick(['DL', 'MH', 'GJ', 'KA', 'TS', 'WB']);
      return `${state}-${randInt(1, 12)}-${pick(['AB', 'CD', 'EF', 'XY'])}-${randInt(1000, 9999)}`;
    };

    // 1. Generate Target Case(s)
    let activeCaseIds = [caseId];
    if (scenario === 'SCENARIO_E') {
      // Cross-case investigation creates secondary linked case
      const crossCaseId = `CASE-2024-NEXUS-${runId}`;
      activeCaseIds = [caseId, crossCaseId];
      if (!this.store.getCase(crossCaseId)) {
        this.store.addCase({
          id: crossCaseId,
          title: `Operation NEXUS-${runId} — Inter-State Cyber-Contraband Cold Link`,
          firNumber: `FIR-${randInt(100, 999)}/2024-CYBER-SPL`,
          status: 'ACTIVE',
          leadAgency: 'Inter-State Joint Task Force',
          leadInvestigator: 'Inspector General S. K. Mukherjee',
          summary: 'Synthetic cross-jurisdictional intelligence probe investigating shared burner hardware, money mules, and safehouses across operations.',
          keySections: ['IPC 120B', 'PMLA Sec 4', 'IT Act Sec 66D'],
          priority: 'CRITICAL',
        });
      }
    }

    // 2. Generate Core Key Entities based on Scenario Structure
    // Central Boss / Kingpin
    const bossId = `PER-BOSS-${runId}`;
    const bossName = `${pick(FIRST_NAMES)} "${pick(ALIASES)}" ${pick(LAST_NAMES)}`;
    entities.push({
      id: bossId,
      type: ENTITY_TYPES.CRIMINAL,
      label: bossName,
      subType: 'Syndicate Kingpin',
      caseIds: activeCaseIds,
      confidence: 0.99,
      source: 'SYNTHETIC / DEMONSTRATION DATA',
      attributes: {
        alias: bossName.split('"')[1] || 'Apex',
        nationality: 'Indian',
        riskLevel: 'EXTREME',
        role: 'Central Coordinator',
        isSynthetic: true,
        scenario,
      },
    });

    // Bridge Entity (Betweenness Centrality Node)
    const bridgeId = `PER-BRIDGE-${runId}`;
    const bridgeName = `${pick(FIRST_NAMES)} "${pick(ALIASES)}" ${pick(LAST_NAMES)}`;
    entities.push({
      id: bridgeId,
      type: ENTITY_TYPES.SUSPECT,
      label: bridgeName,
      subType: 'Key Bridge & Intermediary',
      caseIds: activeCaseIds,
      confidence: 0.95,
      source: 'SYNTHETIC / DEMONSTRATION DATA',
      attributes: {
        alias: bridgeName.split('"')[1] || 'Liaison',
        specialty: 'Layering & Cross-Branch Intermediary',
        riskLevel: 'CRITICAL',
        isSynthetic: true,
        scenario,
      },
    });

    // Link Boss -> Bridge
    relationships.push({
      id: `REL-BOSS-BRIDGE-${runId}`,
      source: bossId,
      target: bridgeId,
      type: RELATIONSHIP_TYPES.COMMUNICATED_WITH,
      label: 'Direct Order',
      confidence: 0.95,
      caseIds: activeCaseIds,
      provenance: 'SYNTHETIC / DEMONSTRATION DATA',
      classification: 'FACT',
      timestamp: new Date(timestampBase - 14 * 86400000).toISOString(),
    });

    // 3. Generate Scenario-Specific Structures
    const remainingEntitiesCount = targetEntities - 2;
    const generatedPersonIds = [bossId, bridgeId];
    const generatedPhoneIds = [];
    const generatedVehicleIds = [];
    const generatedOrgIds = [];

    // Shared Burner Hardware Anomaly (Planted for scenarios B, A, E)
    const sharedBurnerIMEI = randIMEI();

    for (let i = 0; i < remainingEntitiesCount; i++) {
      const idx = i + 1;
      let type = ENTITY_TYPES.PERSON;
      let subType = 'Associate';
      let entId = `ENT-${runId}-${idx}`;
      let label = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
      const attrs = { isSynthetic: true, scenario };

      // Type allocation depending on scenario
      const mod = idx % 10;
      if (scenario === 'SCENARIO_B') {
        // Communication heavy: 40% phones/devices
        if (mod < 4) {
          type = ENTITY_TYPES.PHONE;
          subType = 'Burner Mobile';
          const pnum = randPhone();
          label = pnum;
          attrs.phoneNumber = pnum;
          if (mod === 0 || mod === 1) attrs.imei = sharedBurnerIMEI; // Shared anomaly
        } else if (mod < 7) {
          type = ENTITY_TYPES.SUSPECT;
          subType = 'Caller / Cell Member';
        } else {
          type = ENTITY_TYPES.DEVICE;
          subType = 'VoIP Gateway';
          attrs.hardwareId = randIMEI();
        }
      } else if (scenario === 'SCENARIO_D') {
        // Financial heavy: transactions, accounts, front orgs
        if (mod < 3) {
          type = ENTITY_TYPES.ORGANIZATION;
          subType = 'Shell Trading Co';
          label = pick(ORG_NAMES) + ` (Branch ${runId}-${idx})`;
        } else if (mod < 6) {
          type = ENTITY_TYPES.TRANSACTION;
          subType = 'Hawala Token Settlement';
          label = `Hawala Trx #HAW-${randInt(10000, 99999)}`;
          attrs.amount = `₹${randInt(10, 80)} Lakhs`;
          attrs.currency = 'INR';
        } else {
          type = ENTITY_TYPES.SUSPECT;
          subType = 'Money Mule / Account Holder';
        }
      } else {
        // Balanced distribution (Scenarios A, C, E, F)
        if (mod === 0 || mod === 1) {
          type = ENTITY_TYPES.ORGANIZATION;
          subType = 'Front Corporation';
          label = `${pick(ORG_NAMES)} ${idx}`;
        } else if (mod === 2 || mod === 3) {
          type = ENTITY_TYPES.PHONE;
          subType = 'Operational Line';
          const pnum = randPhone();
          label = pnum;
          attrs.phoneNumber = pnum;
          if (mod === 2) attrs.imei = sharedBurnerIMEI;
        } else if (mod === 4) {
          type = ENTITY_TYPES.VEHICLE;
          subType = 'Logistics Transport';
          const plt = randPlate();
          label = plt;
          attrs.plate = plt;
        } else if (mod === 5) {
          type = ENTITY_TYPES.DEVICE;
          subType = 'Encrypted Communicator';
          attrs.imei = randIMEI();
        } else {
          type = ENTITY_TYPES.SUSPECT;
          subType = 'Syndicate Operative';
          label = `${pick(FIRST_NAMES)} "${pick(ALIASES)}" ${pick(LAST_NAMES)}`;
        }
      }

      // Assign case
      const entCaseIds = (scenario === 'SCENARIO_E' && idx % 3 === 0)
        ? activeCaseIds
        : [activeCaseIds[idx % activeCaseIds.length]];

      const entObj = {
        id: entId,
        type,
        label,
        subType,
        caseIds: entCaseIds,
        confidence: Number((0.80 + Math.random() * 0.19).toFixed(2)),
        source: 'SYNTHETIC / DEMONSTRATION DATA',
        attributes: attrs,
      };

      entities.push(entObj);

      if (type === ENTITY_TYPES.PERSON || type === ENTITY_TYPES.SUSPECT || type === ENTITY_TYPES.CRIMINAL) {
        generatedPersonIds.push(entId);
      } else if (type === ENTITY_TYPES.PHONE) {
        generatedPhoneIds.push(entId);
      } else if (type === ENTITY_TYPES.VEHICLE) {
        generatedVehicleIds.push(entId);
      } else if (type === ENTITY_TYPES.ORGANIZATION) {
        generatedOrgIds.push(entId);
      }
    }

    // 4. Generate Relationships & Network Edges
    // Connect persons to bridge and boss
    const relTypes = [
      RELATIONSHIP_TYPES.COMMUNICATED_WITH,
      RELATIONSHIP_TYPES.CALLED,
      RELATIONSHIP_TYPES.ASSOCIATED_WITH,
      RELATIONSHIP_TYPES.KNOWS,
      RELATIONSHIP_TYPES.MEMBER_OF,
    ];

    let relIndex = 1;
    // Connect half the network to Bridge entity to create high betweenness
    for (let i = 2; i < Math.min(entities.length, Math.floor(targetEntities * 0.7)); i++) {
      const ent = entities[i];
      const targetId = (i % 2 === 0) ? bridgeId : bossId;

      relationships.push({
        id: `REL-${runId}-${relIndex++}`,
        source: ent.id,
        target: targetId,
        type: pick(relTypes),
        label: 'Direct Contact',
        confidence: Number((0.82 + Math.random() * 0.16).toFixed(2)),
        caseIds: activeCaseIds,
        provenance: 'SYNTHETIC / DEMONSTRATION DATA',
        classification: 'FACT',
        timestamp: new Date(timestampBase - randInt(1, 30) * 86400000).toISOString(),
      });
    }

    // Additional cross-links for density
    const numExtraLinks = Math.round(targetEntities * density * 0.8);
    for (let k = 0; k < numExtraLinks; k++) {
      const srcEnt = pick(entities);
      const tgtEnt = pick(entities);
      if (srcEnt.id !== tgtEnt.id) {
        let relType = pick(relTypes);
        if (tgtEnt.type === ENTITY_TYPES.ORGANIZATION) relType = RELATIONSHIP_TYPES.MEMBER_OF;
        if (tgtEnt.type === ENTITY_TYPES.PHONE) relType = RELATIONSHIP_TYPES.USED;
        if (tgtEnt.type === ENTITY_TYPES.VEHICLE) relType = RELATIONSHIP_TYPES.USED;

        relationships.push({
          id: `REL-${runId}-${relIndex++}`,
          source: srcEnt.id,
          target: tgtEnt.id,
          type: relType,
          label: relType.replace(/_/g, ' '),
          confidence: Number((0.75 + Math.random() * 0.23).toFixed(2)),
          caseIds: activeCaseIds,
          provenance: 'SYNTHETIC / DEMONSTRATION DATA',
          classification: Math.random() > 0.3 ? 'FACT' : 'INFERRED',
          timestamp: new Date(timestampBase - randInt(1, 45) * 86400000).toISOString(),
        });
      }
    }

    // 5. Generate Locations
    for (let locIdx = 1; locIdx <= targetLocations; locIdx++) {
      const cityData = pick(CITIES);
      const latOffset = (Math.random() - 0.5) * 0.08;
      const lngOffset = (Math.random() - 0.5) * 0.08;
      const assignedEnt = pick(entities);

      locations.push({
        id: `LOC-${runId}-${locIdx}`,
        name: `${cityData.city} Safehouse & Operational Node #${locIdx}`,
        address: `Plot ${randInt(12, 880)}, Sector ${randInt(1, 62)}, ${cityData.city}`,
        city: cityData.city,
        state: cityData.state,
        country: cityData.country,
        latitude: Number((cityData.lat + latOffset).toFixed(6)),
        longitude: Number((cityData.lng + lngOffset).toFixed(6)),
        entityId: assignedEnt ? assignedEnt.id : null,
        caseId: activeCaseIds[0],
        locationType: pick(['OPERATIONAL_SITE', 'MEETING_POINT', 'TRANSIT_HUB', 'RESIDENCE']),
        source: 'SYNTHETIC / DEMONSTRATION DATA',
        confidence: 0.94,
        timestamp: new Date(timestampBase - randInt(2, 60) * 86400000).toISOString(),
      });
    }

    // 6. Generate Timeline Events
    const eventTypes = ['CALL', 'COMMUNICATION', 'TRANSACTION', 'LOCATION_VISIT', 'MEETING', 'CASE_EVENT', 'RAID_SEIZURE'];
    for (let evIdx = 1; evIdx <= targetEvents; evIdx++) {
      const evType = pick(eventTypes);
      const ent1 = pick(entities);
      const ent2 = pick(entities);
      const entIds = [ent1.id];
      if (ent2 && ent2.id !== ent1.id) entIds.push(ent2.id);

      events.push({
        id: `EVT-${runId}-${evIdx}`,
        title: `${evType.replace(/_/g, ' ')}: Intercept #${runId}-${evIdx}`,
        description: `Correlated temporal occurrence recorded between ${ent1.label} and network nodes.`,
        eventType: evType,
        timestamp: new Date(timestampBase - randInt(1, 90) * 86400000).toISOString(),
        entityIds: entIds,
        caseId: activeCaseIds[0],
        severity: pick(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
        classification: 'FACT',
        metadata: {
          isSynthetic: true,
          scenario,
          confidence: 0.92,
        },
      });
    }

    // 7. Generate Evidence Items with Chain of Custody & Hash
    const evidenceTypes = ['DOCUMENT', 'CDR_LOG', 'BANK_STATEMENT', 'CCTV_STILL', 'SEIZED_DEVICE', 'FORENSIC_REPORT'];
    for (let eviIdx = 1; eviIdx <= targetEvidence; eviIdx++) {
      const evType = pick(evidenceTypes);
      const ent = pick(entities);
      evidence.push({
        id: `EVI-${runId}-${eviIdx}`,
        title: `${evType.replace(/_/g, ' ')} — Exhibit #${runId}/${eviIdx}`,
        description: `Forensically logged ${evType.toLowerCase()} recovered during active surveillance on ${ent.label}.`,
        evidenceType: evType,
        source: 'POLICE_EVIDENCE_LOCKER',
        confidence: 0.98,
        hash: `SHA256:${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`,
        caseId: activeCaseIds[0],
        entityIds: [ent.id],
        timestamp: new Date(timestampBase - randInt(5, 60) * 86400000).toISOString(),
        classification: 'FACT',
        metadata: {
          isSynthetic: true,
          scenario,
        },
      });
    }

    return {
      scenario,
      preset,
      caseId: activeCaseIds[0],
      activeCaseIds,
      entities,
      relationships,
      locations,
      events,
      evidence,
    };
  }

  /**
   * Generates synthetic dataset and pipes it directly through the real Ingestion Pipeline
   */
  async generateAndIngest(options = {}) {
    const dataset = this.generateDataset(options);

    const ingestResult = await this.ingestService.ingest({
      source: 'synthetic',
      caseId: dataset.caseId,
      entities: dataset.entities,
      relationships: dataset.relationships,
      locations: dataset.locations,
      events: dataset.events,
      evidence: dataset.evidence,
      metadata: {
        scenario: dataset.scenario,
        preset: dataset.preset,
        isSynthetic: true,
        generatedAt: new Date().toISOString(),
      },
      validateOnly: false,
    });

    return {
      success: ingestResult.success,
      batchId: ingestResult.batchId,
      scenario: dataset.scenario,
      preset: dataset.preset,
      caseId: dataset.caseId,
      summary: ingestResult.summary,
      rejections: ingestResult.rejections,
      resolutionLog: ingestResult.resolutionLog,
    };
  }
}

export const syntheticGeneratorService = new SyntheticGeneratorService();
export default syntheticGeneratorService;

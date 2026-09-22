/**
 * CONSTELLATION — Dynamic Grounded Moriarty Adversarial Engine
 * 
 * Generates case-grounded, deterministic counter-hypotheses and challenges assumptions.
 * Adheres strictly to:
 * - Deterministic rule-based evaluation (zero external LLMs, zero hallucinated data)
 * - Strict dataset isolation: context derived exclusively from the active case
 * - Explicit distinction between FACT, COMPUTED, HYPOTHESIS, and RECOMMENDED_VERIFICATION
 * - Citations to real Evidence Locker IDs where available; explicit acknowledgment when evidence is missing
 */
import { store } from '../data/store.js';
import { AnalyticsService } from './analyticsService.js';

export class MoriartyEngine {
  /**
   * Evaluates active case data to generate adversarial counter-hypotheses.
   */
  static generateAssessments({ caseId = 'CASE-2024-VORTEX', selectedEntityId = null }) {
    const caseObj = store.getCase(caseId);
    const entities = store.getEntitiesByCase(caseId);
    const relationships = store.getRelationshipsByCase(caseId);
    const evidence = store.getEvidenceByCase(caseId);
    const events = store.getEventsByCase(caseId);
    const locations = store.getLocationsByCase(caseId);

    if (entities.length === 0) {
      return {
        caseId,
        caseTitle: caseObj?.title || `Case ${caseId}`,
        adversarialAssessments: [],
        datasetStats: { entityCount: 0, relationshipCount: 0, evidenceCount: 0, eventCount: 0 },
        methodology: 'Deterministic Adversarial Graph Analysis',
        disclaimer: 'No entities found in active case to formulate adversarial counter-hypotheses.',
        generatedAt: new Date().toISOString(),
        agent: 'MORIARTY_ANALYTICAL_ENGINE',
      };
    }

    const analytics = AnalyticsService.runFullAnalytics(caseId);
    const assessments = [];
    let assessmentIndex = 1;

    // Fast lookup maps
    const entityMap = new Map(entities.map(e => [e.id, e]));
    const evidenceByEntity = new Map();
    for (const ev of evidence) {
      for (const entId of (ev.entityIds || [])) {
        if (!evidenceByEntity.has(entId)) evidenceByEntity.set(entId, []);
        evidenceByEntity.get(entId).push(ev);
      }
    }

    // -------------------------------------------------------------------------
    // SIGNAL A: HIGH-BETWEENNESS CENTRALITY VULNERABILITY
    // -------------------------------------------------------------------------
    const bridgeCandidates = analytics.bridgeCandidates || [];
    const topBetweenness = analytics.centrality?.betweenness || [];

    // Target selected entity if specified, else highest betweenness node
    let targetBridge = null;
    if (selectedEntityId && entityMap.has(selectedEntityId)) {
      targetBridge = entityMap.get(selectedEntityId);
    } else if (bridgeCandidates.length > 0) {
      targetBridge = bridgeCandidates[0].entity;
    } else if (topBetweenness.length > 0) {
      targetBridge = topBetweenness[0].entity;
    }

    if (targetBridge) {
      const bridgeScore = topBetweenness.find(b => b.entity?.id === targetBridge.id)?.normalized || 0.0;
      const connectedRels = relationships.filter(r => r.source === targetBridge.id || r.target === targetBridge.id);
      const linkedEvidence = evidenceByEntity.get(targetBridge.id) || [];
      const physicalEvidence = linkedEvidence.filter(e => e.evidenceType === 'SEIZED_DEVICE' || e.evidenceType === 'CCTV_STILL');

      const facts = [
        `Entity "${targetBridge.label}" (${targetBridge.id}) has a normalized betweenness centrality of ${bridgeScore}.`,
        `Directly connected to ${connectedRels.length} adjacent network nodes across the active case graph.`,
      ];
      if (linkedEvidence.length > 0) {
        facts.push(`Corroborated by ${linkedEvidence.length} evidence exhibit(s): [${linkedEvidence.map(e => e.id).join(', ')}].`);
      } else {
        facts.push(`Zero direct physical or digital exhibits recorded in Evidence Locker for this entity.`);
      }

      const computed = [
        `Topological role: Node operates as a primary structural articulation point bridging distinct subgraphs.`,
        `Direct physical evidence corroboration ratio: ${(physicalEvidence.length / (connectedRels.length || 1)).toFixed(2)}.`,
      ];

      const hypothesis = `Subject may operate as an unwitting commercial or administrative intermediary (such as an independent accountant, logistics clearing agent, or common service provider) whose high betweenness reflects standard multi-client business aggregation rather than conspiratorial intent.`;

      const recommendedVerification = physicalEvidence.length === 0
        ? `Procure independent physical or biometric verification (CCTV ingress, signed receipts, or authenticated voice intercepts) before asserting knowing participation in a conspiracy.`
        : `Subject seized exhibits to forensic document and digital audit to verify whether communication was instructional or merely ministerial.`;

      assessments.push({
        id: `MORIARTY-HYP-${String(assessmentIndex++).padStart(2, '0')}`,
        title: `Structural Intermediary Vulnerability: ${targetBridge.label}`,
        targetEntity: targetBridge.label,
        targetEntityId: targetBridge.id,
        signalType: 'HIGH_BETWEENNESS_VULNERABILITY',
        confidenceScore: 0.65,
        claimChallenged: `Subject is a knowing coordinator and central conspirator in the criminal network.`,
        facts,
        computed,
        counterHypothesis: hypothesis,
        recommendedVerification,
        weaknessesInProsecution: recommendedVerification,
        classification: 'HYPOTHESIS',
      });
    }

    // -------------------------------------------------------------------------
    // SIGNAL B: SHARED IDENTIFIER AMBIGUITY (Duplicate IMEIs, Plates, Numbers)
    // -------------------------------------------------------------------------
    const identifierMap = new Map(); // key -> [{ entityId, label, idType }]
    entities.forEach(ent => {
      const attrs = ent.attributes || {};
      if (attrs.imei) {
        const key = `IMEI:${attrs.imei}`;
        if (!identifierMap.has(key)) identifierMap.set(key, []);
        identifierMap.get(key).push({ entityId: ent.id, label: ent.label, idType: 'Hardware IMEI', value: attrs.imei });
      }
      if (attrs.plate) {
        const key = `PLATE:${attrs.plate}`;
        if (!identifierMap.has(key)) identifierMap.set(key, []);
        identifierMap.get(key).push({ entityId: ent.id, label: ent.label, idType: 'Vehicle Plate', value: attrs.plate });
      }
      if (attrs.phoneNumber) {
        const key = `PHONE:${attrs.phoneNumber}`;
        if (!identifierMap.has(key)) identifierMap.set(key, []);
        identifierMap.get(key).push({ entityId: ent.id, label: ent.label, idType: 'Phone Number', value: attrs.phoneNumber });
      }
    });

    const sharedIdentifiers = Array.from(identifierMap.entries()).filter(([_, list]) => list.length > 1);

    if (sharedIdentifiers.length > 0) {
      const [idKey, sharedList] = sharedIdentifiers[0];
      const idType = sharedList[0].idType;
      const idValue = sharedList[0].value;
      const entityNames = sharedList.map(s => `"${s.label}" (${s.entityId})`).join(' and ');

      const facts = [
        `Identical ${idType} (${idValue}) is registered to multiple distinct entities: ${entityNames}.`,
      ];
      const computed = [
        `Identifier collision across ${sharedList.length} entities in the active case dataset.`,
      ];
      const hypothesis = idType === 'Hardware IMEI'
        ? `Grey-market electronic devices frequently duplicate factory default IMEIs across thousands of production units. Physical conspiracy cannot be proven solely through handset IMEI matching without corresponding subscriber IMSI binding.`
        : `Shared identifier may represent proxy ownership, secondary commercial resale, or spoofed telecommunication metadata rather than shared operational control.`;

      const recommendedVerification = `Subpoena CDR IMSI subscriber records and tower cell-ID dumps to establish distinct subscriber identities before concluding single-actor device control.`;

      assessments.push({
        id: `MORIARTY-HYP-${String(assessmentIndex++).padStart(2, '0')}`,
        title: `Hardware/Identifier Collision: ${idType} (${idValue})`,
        targetEntity: sharedList[0].label,
        targetEntityId: sharedList[0].entityId,
        signalType: 'SHARED_IDENTIFIER_AMBIGUITY',
        confidenceScore: 0.78,
        claimChallenged: `Direct operational unity between ${entityNames} based on shared hardware/identifier.`,
        facts,
        computed,
        counterHypothesis: hypothesis,
        recommendedVerification,
        weaknessesInProsecution: recommendedVerification,
        classification: 'HYPOTHESIS',
      });
    }

    // -------------------------------------------------------------------------
    // SIGNAL C: UNCORROBORATED RELATIONSHIP (Zero or weak evidence)
    // -------------------------------------------------------------------------
    const uncorroboratedRel = relationships.find(r => (!r.evidenceIds || r.evidenceIds.length === 0) && r.confidence >= 0.7);

    if (uncorroboratedRel) {
      const src = entityMap.get(uncorroboratedRel.source);
      const tgt = entityMap.get(uncorroboratedRel.target);
      const srcLabel = src ? src.label : uncorroboratedRel.source;
      const tgtLabel = tgt ? tgt.label : uncorroboratedRel.target;

      const facts = [
        `Relationship "${uncorroboratedRel.type}" connects ${srcLabel} ➔ ${tgtLabel} with assigned confidence ${(uncorroboratedRel.confidence * 100).toFixed(0)}%.`,
        `Assigned provenance: "${uncorroboratedRel.provenance || 'INVESTIGATIVE_NOTE'}".`,
      ];
      const computed = [
        `Corroborating Evidence Locker exhibits: 0 independent items linked to this relationship.`,
      ];
      const hypothesis = `The link between ${srcLabel} and ${tgtLabel} may represent unverified informant hearsay, casual acquaintance, or an administrative logging assumption rather than an active criminal nexus.`;
      const recommendedVerification = `Gather primary digital or physical exhibits (e.g., CDR call detail records, authenticated bank transfers, or surveillance logs) before relying on this relationship for prosecutorial filings.`;

      assessments.push({
        id: `MORIARTY-HYP-${String(assessmentIndex++).padStart(2, '0')}`,
        title: `Uncorroborated Link Nexus: ${srcLabel} ➔ ${tgtLabel}`,
        targetEntity: srcLabel,
        targetEntityId: uncorroboratedRel.source,
        signalType: 'UNCORROBORATED_RELATIONSHIP',
        confidenceScore: 0.58,
        claimChallenged: `Substantive operational partnership between ${srcLabel} and ${tgtLabel}.`,
        facts,
        computed,
        counterHypothesis: hypothesis,
        recommendedVerification,
        weaknessesInProsecution: recommendedVerification,
        classification: 'HYPOTHESIS',
      });
    }

    // -------------------------------------------------------------------------
    // SIGNAL D: FINANCIAL AMBIGUITY (High-value transfers without contract/invoice)
    // -------------------------------------------------------------------------
    const financialRel = relationships.find(r =>
      ['TRANSFERRED_TO', 'TRANSACTED_WITH', 'HAWALA', 'FINANCIALLY_LINKED'].some(k => (r.type || '').toUpperCase().includes(k))
    );

    if (financialRel) {
      const src = entityMap.get(financialRel.source);
      const tgt = entityMap.get(financialRel.target);
      const srcLabel = src ? src.label : financialRel.source;
      const tgtLabel = tgt ? tgt.label : financialRel.target;
      const financialEvidence = evidence.filter(e => e.evidenceType === 'BANK_STATEMENT');

      const facts = [
        `Value channel "${financialRel.type}" recorded between ${srcLabel} and ${tgtLabel}.`,
        `Total linked documentary bank statement exhibits in Evidence Locker: ${financialEvidence.length}.`,
      ];
      const computed = [
        `Occurrence count: ${financialRel.metadata?.occurrenceCount || 1} logged transactions.`,
      ];
      const hypothesis = `Transfers between these entities may represent legitimate debt settlement, commercial advance payments, or standard trade escrow rather than money laundering or illicit hawala value routing.`;
      const recommendedVerification = `Subpoena certified corporate bank ledgers, GST invoices, and audited balance sheets under the Bankers' Books Evidence Act to establish lack of consideration.`;

      assessments.push({
        id: `MORIARTY-HYP-${String(assessmentIndex++).padStart(2, '0')}`,
        title: `Commercial Transaction Ambiguity: ${srcLabel} ➔ ${tgtLabel}`,
        targetEntity: srcLabel,
        targetEntityId: financialRel.source,
        signalType: 'FINANCIAL_AMBIGUITY',
        confidenceScore: 0.62,
        claimChallenged: `Financial flows represent illicit proceeds of crime or hawala transfers.`,
        facts,
        computed,
        counterHypothesis: hypothesis,
        recommendedVerification,
        weaknessesInProsecution: recommendedVerification,
        classification: 'HYPOTHESIS',
      });
    }

    // -------------------------------------------------------------------------
    // SIGNAL E: TEMPORAL INCONSISTENCY (Chronological gaps or multi-site movement)
    // -------------------------------------------------------------------------
    if (events.length >= 2) {
      const sortedEvents = [...events].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      const firstEv = sortedEvents[0];
      const lastEv = sortedEvents[sortedEvents.length - 1];
      const timespanHours = Math.abs(new Date(lastEv.timestamp) - new Date(firstEv.timestamp)) / (1000 * 60 * 60);

      const facts = [
        `Case timeline encompasses ${sortedEvents.length} recorded events spanning ${timespanHours.toFixed(1)} hours.`,
        `Earliest: "${firstEv.title}" (${firstEv.timestamp}) | Latest: "${lastEv.title}" (${lastEv.timestamp}).`,
      ];
      const computed = [
        `Event density: ${(sortedEvents.length / Math.max(1, timespanHours)).toFixed(2)} events per hour.`,
      ];
      const hypothesis = `Broad temporal intervals between logged incidents allow for unmonitored intervening causes, third-party custody handoffs, or device transfers that break the continuous chain of causation.`;
      const recommendedVerification = `Conduct cell-site sector analysis and continuous timeline verification to fill chronological intervals between logged operations.`;

      assessments.push({
        id: `MORIARTY-HYP-${String(assessmentIndex++).padStart(2, '0')}`,
        title: `Timeline Continuity Vulnerability`,
        targetEntity: caseObj?.title || caseId,
        targetEntityId: caseId,
        signalType: 'TEMPORAL_INCONSISTENCY',
        confidenceScore: 0.55,
        claimChallenged: `Continuous, uninterrupted conspiracy across the entire investigative timeframe.`,
        facts,
        computed,
        counterHypothesis: hypothesis,
        recommendedVerification,
        weaknessesInProsecution: recommendedVerification,
        classification: 'HYPOTHESIS',
      });
    }

    return {
      caseId,
      caseTitle: caseObj?.title || `Case ${caseId}`,
      adversarialAssessments: assessments,
      datasetStats: {
        entityCount: entities.length,
        relationshipCount: relationships.length,
        evidenceCount: evidence.length,
        eventCount: events.length,
      },
      methodology: 'Deterministic Adversarial Graph Analysis',
      disclaimer: 'Adversarial signals are generated to challenge prosecutorial assumptions and prevent confirmation bias. Counter-hypotheses are classified as HYPOTHESIS and must not be treated as factual findings.',
      generatedAt: new Date().toISOString(),
      agent: 'MORIARTY_ANALYTICAL_ENGINE',
    };
  }
}

export default MoriartyEngine;

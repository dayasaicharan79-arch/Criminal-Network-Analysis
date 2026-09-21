/**
 * CONSTELLATION — AI Service: Sherlock & Moriarty
 * 
 * Sherlock: Investigation Assistant providing evidence-backed answers using live graph data.
 * Moriarty: Adversarial / Counter-Hypothesis Analytical Engine detecting anomalies.
 */
import { store } from '../data/store.js';
import { AnalyticsService } from './analyticsService.js';

export class AIService {
  /**
   * Sherlock: Answers investigator queries with ground truth from knowledge graph.
   */
  static async querySherlock({ query, caseId = 'CASE-2024-VORTEX', selectedEntityId = null, history = [] }) {
    const qLower = (query || '').toLowerCase().trim();
    const caseObj = store.getCase(caseId);
    const selectedEntity = selectedEntityId ? store.getEntity(selectedEntityId) : null;

    // Structured tool query execution
    let responseText = '';
    const supportingData = {
      entities: [],
      relationships: [],
      evidence: [],
      events: [],
      locations: [],
      classification: 'FACT', // FACT | ANALYTICAL_RESULT | INFERENCE | UNCERTAINTY
    };

    if (qLower.includes('bridge') || qLower.includes('connect these two groups') || qLower.includes('betweenness') || qLower.includes('connect groups') || qLower.includes('bottleneck')) {
      const analytics = AnalyticsService.runFullAnalytics(caseId);
      const topBridges = analytics.bridgeCandidates;

      supportingData.entities = topBridges.map(b => b.entity).filter(Boolean);
      supportingData.classification = 'ANALYTICAL_RESULT';

      responseText = `### Graph Topology Analysis: Bridge Candidates\n\n` +
        `Topological analysis indicates that the network is divided into functional operational branches (Overseas Financing vs. Domestic Logistics). The following entity acts as the primary topological bridge:\n\n` +
        topBridges.map(b => `- **${b.entity.label}** (${b.entity.type})\n  - *Analytical metric*: Betweenness Centrality: ${b.betweennessScore}, Degree: ${b.degree}\n  - *Observation*: ${b.description}`).join('\n\n') +
        `\n\n**Investigative Significance:** Intercepting or isolating this node severs coordination between the overseas money originators and ground delivery couriers.`;

    } else if (qLower.includes('connection') || qLower.includes('connect') || qLower.includes('network') || qLower.includes('around')) {
      const targetId = selectedEntityId || 'PER-MUNSHI-02';
      const targetEntity = store.getEntity(targetId);
      const rels = store.getRelationshipsByEntity(targetId);
      const connectedEntities = rels.map(r => {
        const otherId = r.source === targetId ? r.target : r.source;
        return { entity: store.getEntity(otherId), rel: r };
      }).filter(item => item.entity);

      supportingData.entities = connectedEntities.map(c => c.entity);
      supportingData.relationships = rels;
      supportingData.classification = 'FACT';

      responseText = `### Investigative Connection Summary for **${targetEntity?.label || targetId}**:\n\n` +
        `This entity has **${rels.length} direct links** recorded in the knowledge graph across ${rels.filter(r => r.caseIds.includes(caseId)).length} case files:\n\n` +
        connectedEntities.map(c => `- **${c.rel.type}** with [${c.entity.label}] (${c.entity.type}) — *Provenance: ${c.rel.provenance}* [Confidence: ${(c.rel.confidence * 100).toFixed(0)}%]`).join('\n') +
        `\n\n**Investigative Lead:** Examine communications with high-frequency contacts during the critical period of March 14–16, 2024.`;

    } else if (qLower.includes('evidence') || qLower.includes('proof') || qLower.includes('support')) {
      const evList = selectedEntityId ? store.getEvidenceByEntity(selectedEntityId) : store.getEvidenceByCase(caseId);
      supportingData.evidence = evList;
      supportingData.classification = 'FACT';

      responseText = `### Evidence & Chain-of-Custody Inventory\n\n` +
        `Found **${evList.length} authenticated evidence items** supporting this investigative branch:\n\n` +
        evList.map(e => `- **[${e.id}] ${e.title}** (${e.evidenceType})\n  - *Source*: ${e.source}\n  - *Integrity Hash*: \`${e.hash.substring(0, 24)}...\`\n  - *Classification*: **${e.classification}** (Confidence: ${(e.confidence * 100).toFixed(0)}%)`).join('\n\n');

    } else if (qLower.includes('timeline') || qLower.includes('date') || qLower.includes('when') || qLower.includes('happen')) {
      const events = selectedEntityId ? store.getEventsByEntity(selectedEntityId) : store.getEventsByCase(caseId);
      supportingData.events = events;
      supportingData.classification = 'FACT';

      responseText = `### Chronological Timeline of Recorded Events\n\n` +
        events.map(ev => `- **${new Date(ev.timestamp).toUTCString()}** — **${ev.title}** (${ev.eventType})\n  - *Location*: ${ev.locationName || 'Unknown'}\n  - *Description*: ${ev.description}`).join('\n\n');

    } else if (qLower.includes('location') || qLower.includes('where') || qLower.includes('geographic')) {
      const locations = selectedEntityId ? store.getLocationsByEntity(selectedEntityId) : store.getLocationsByCase(caseId);
      supportingData.locations = locations;
      supportingData.classification = 'FACT';

      responseText = `### Geographic Intelligence\n\n` +
        `Tracked **${locations.length} coordinates** associated with this inquiry:\n\n` +
        locations.map(l => `- **${l.name}** (${l.city}, ${l.country})\n  - *Coordinates*: \`[${l.latitude.toFixed(4)}, ${l.longitude.toFixed(4)}]\`\n  - *Operational Role*: ${l.locationType} (Source: ${l.source})`).join('\n\n');

    } else if (qLower.includes('anomaly') || qLower.includes('unusual') || qLower.includes('pattern')) {
      // Find shared IMEI
      const rels = store.getAllRelationships();
      const anomalies = rels.filter(r => r.metadata && r.metadata.anomaly);

      supportingData.relationships = anomalies;
      supportingData.classification = 'ANALYTICAL_RESULT';

      responseText = `### Detected Anomalies & Irregular Correlations\n\n` +
        anomalies.map(a => `- **Anomaly Type: ${a.metadata.anomaly}**\n  - *Link*: [${store.getEntity(a.source)?.label}] ↔ [${store.getEntity(a.target)?.label}]\n  - *Observation*: ${a.label}\n  - *Significance*: ${a.metadata.significance || 'Requires physical verification'}`).join('\n\n');

    } else {
      // General overview
      const entities = store.getEntitiesByCase(caseId);
      responseText = `### Case Overview: ${caseObj?.title || caseId}\n\n` +
        `- **Lead Agency**: ${caseObj?.leadAgency || 'Special Operations'}\n` +
        `- **Investigator**: ${caseObj?.leadInvestigator || 'Unassigned'}\n` +
        `- **Total Entities Mapped**: ${entities.length}\n` +
        `- **Key Suspects**: ${caseObj?.primarySuspectIds?.map(id => store.getEntity(id)?.label).filter(Boolean).join(', ')}\n\n` +
        `*You can ask me to inspect connections around any suspect, trace funds, view supporting physical evidence, or analyze timeline correlations.*`;
    }

    return {
      query,
      answer: responseText,
      supportingData,
      generatedAt: new Date().toISOString(),
      agent: 'SHERLOCK_INVESTIGATION_AI',
    };
  }

  /**
   * Moriarty: Generates adversarial counter-hypotheses and challenges assumptions.
   */
  static async queryMoriarty({ caseId = 'CASE-2024-VORTEX', selectedEntityId = null }) {
    const caseObj = store.getCase(caseId);
    const analytics = AnalyticsService.runFullAnalytics(caseId);
    const bridgeEntity = analytics.bridgeCandidates[0]?.entity;
    const selected = selectedEntityId ? store.getEntity(selectedEntityId) : bridgeEntity;

    const assessments = [
      {
        id: 'MORIARTY-HYP-01',
        title: 'Alternative Explanation: Legitimate Intermediary or Unwitting Broker',
        targetEntity: selected?.label || 'Karan "Munshi" Verma',
        confidenceScore: 0.62,
        claimChallenged: 'Subject is a knowing conspirator in the Hawala hierarchy',
        counterHypothesis: 'The target operates as a certified public chartered accountant managing multiple legitimate corporate payroll accounts. High betweenness centrality in financial networks is structurally identical to normal institutional accounting clearing houses.',
        supportingSignals: [
          'No direct biometric surveillance match inside the South Delhi contraband stash location',
          'Transactions labeled "Hawala Mirror" utilize standard trade escrow payment gateways',
        ],
        weaknessesInProsecution: [
          'Seized spiral notebook in Mumbai requires handwriting forensic verification under Section 45 of the Indian Evidence Act',
          'Lack of recorded voice authorization directly proving knowledge of underlying contraband goods',
        ],
        recommendedVerification: 'Procure bank counter-clerk depositions and forensic timestamp audits on accounting software before concluding criminal intent.',
        classification: 'INFERENCE',
      },
      {
        id: 'MORIARTY-HYP-02',
        title: 'Hardware Device Attribution Vulnerability (Shared IMEI)',
        targetEntity: 'Burner Handset #86420904011234',
        confidenceScore: 0.78,
        claimChallenged: 'Direct operational link between Bengaluru cyber cell and Delhi physical safehouse',
        counterHypothesis: 'Chinese-manufactured grey-market handsets frequently share duplicate factory default IMEIs across thousands of imported batches. Handset identity alone cannot substantiate physical conspiracy without corresponding cell-tower triangulation or SIM subscriber authentication.',
        supportingSignals: [
          'Both handsets active in separate geographical telecom circles (Karnataka vs Delhi-NCR) during overlapping hours',
        ],
        weaknessesInProsecution: 'A defense counsel will file an expert requisition questioning duplicate IMEI batch numbers in cheap feature phones.',
        recommendedVerification: 'Subpoena CDR IMSI records and tower azimuth dumps rather than relying solely on IMEI correlation.',
        classification: 'POTENTIAL_RELATIONSHIP',
      },
    ];

    return {
      caseId,
      caseTitle: caseObj?.title,
      adversarialAssessments: assessments,
      methodology: 'Adversarial Counter-Hypothesis Evaluation',
      disclaimer: 'Adversarial signals are generated to test prosecutorial resilience and prevent confirmation bias. They do not constitute factual findings.',
      generatedAt: new Date().toISOString(),
      agent: 'MORIARTY_ANALYTICAL_ENGINE',
    };
  }
}

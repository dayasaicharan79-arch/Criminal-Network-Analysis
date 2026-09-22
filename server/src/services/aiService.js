/**
 * CONSTELLATION — AI Service: Sherlock & Moriarty
 * 
 * Sherlock: Investigation Assistant providing evidence-backed answers using live graph data.
 * Moriarty: Adversarial / Counter-Hypothesis Analytical Engine detecting anomalies.
 */
import { store } from '../data/store.js';
import { AnalyticsService } from './analyticsService.js';
import { MoriartyEngine } from './moriartyEngine.js';

export class AIService {
  /**
   * Helper: Resolves candidate entity from natural language query or selectedEntityId
   */
  static resolveEntityFromQuery(query, caseEntities, selectedEntity = null) {
    if (selectedEntity) return selectedEntity;
    if (!query) return null;

    const q = query.toLowerCase();

    // 1. Check exact ID
    for (const ent of caseEntities) {
      if (q.includes(ent.id.toLowerCase())) return ent;
    }

    // 2. Check full label
    for (const ent of caseEntities) {
      if (q.includes(ent.label.toLowerCase())) return ent;
    }

    // 3. Check alias or nickname (e.g. "Blade", "Munshi", "Sultan", "Cipher")
    for (const ent of caseEntities) {
      const alias = ent.attributes?.alias;
      if (alias && q.includes(alias.toLowerCase())) return ent;

      // Check quoted nickname inside label (e.g. Karan "Munshi" Verma -> Munshi)
      const quoteMatch = ent.label.match(/"([^"]+)"/);
      if (quoteMatch && q.includes(quoteMatch[1].toLowerCase())) {
        return ent;
      }

      // Check first name or last name
      const nameParts = ent.label.replace(/"[^"]+"/g, '').trim().split(/\s+/);
      for (const part of nameParts) {
        if (part.length > 3 && q.includes(part.toLowerCase())) {
          return ent;
        }
      }
    }

    return null;
  }

  /**
   * Sherlock: Answers investigator queries with ground truth from knowledge graph.
   */
  static async querySherlock({ query = '', caseId = 'CASE-2024-VORTEX', selectedEntityId = null, history = [] }) {
    const qLower = (query || '').toLowerCase().trim();
    const caseObj = store.getCase(caseId);
    const caseEntities = store.getEntitiesByCase(caseId);
    const selectedEntity = selectedEntityId ? store.getEntity(selectedEntityId) : null;

    let responseText = '';
    const supportingData = {
      entities: [],
      relationships: [],
      evidence: [],
      events: [],
      locations: [],
      classification: 'FACT', // FACT | ANALYTICAL_RESULT | INFERENCE | UNCERTAINTY
    };

    // -------------------------------------------------------------------------
    // 1. SHORTEST PATH / NETWORK CONNECTION ROUTE QUERIES
    // e.g. "How is X connected to Y?", "Path from X to Y", "Shortest route between X and Y"
    // -------------------------------------------------------------------------
    const isPathQuery = /path|route|connected to|between .* and/i.test(qLower) &&
      (qLower.includes('how') || qLower.includes('find') || qLower.includes('shortest') || qLower.includes('trace') || qLower.includes('connect'));

    if (isPathQuery) {
      // Find two entities mentioned in query
      const mentioned = [];
      for (const ent of caseEntities) {
        const entName = ent.label.toLowerCase();
        const cleanName = ent.label.replace(/"[^"]+"/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
        const alias = (ent.attributes?.alias || '').toLowerCase();
        const quoteMatch = ent.label.match(/"([^"]+)"/);
        const nickname = quoteMatch ? quoteMatch[1].toLowerCase() : '';
        const nameParts = ent.label.replace(/"[^"]+"/g, '').trim().toLowerCase().split(/\s+/);

        if (
          qLower.includes(entName) ||
          (cleanName && qLower.includes(cleanName)) ||
          (alias && qLower.includes(alias)) ||
          (nickname && qLower.includes(nickname)) ||
          (nameParts.length >= 2 && nameParts.every(p => p.length > 2 && qLower.includes(p)))
        ) {
          if (!mentioned.some(m => m.id === ent.id)) {
            mentioned.push(ent);
          }
        }
      }

      if (mentioned.length >= 2) {
        const entA = mentioned[0];
        const entB = mentioned[1];
        const { nodes, links } = store.getGraph({ caseId });
        const pathResult = AnalyticsService.findShortestPath(nodes, links, entA.id, entB.id);

        if (pathResult) {
          supportingData.entities = pathResult.nodes;
          supportingData.relationships = pathResult.links;
          supportingData.classification = 'ANALYTICAL_RESULT';

          responseText = `### Shortest Path Analysis: **${entA.label}** ➔ **${entB.label}**\n\n` +
            `Found a direct connecting corridor of **${pathResult.distance} hop(s)** (${pathResult.nodes.length} entities involved):\n\n` +
            pathResult.nodes.map((n, i) => `${i + 1}. **${n.label}** (${n.type})`).join(' ➔ ') + '\n\n' +
            `**Connecting Relationships:**\n` +
            pathResult.links.map(l => {
              const src = store.getEntity(l.source)?.label || l.source;
              const tgt = store.getEntity(l.target)?.label || l.target;
              return `- **${src}** ➔ **${tgt}** [${l.type}] — *Confidence: ${(l.confidence * 100).toFixed(0)}%*`;
            }).join('\n');
        } else {
          supportingData.entities = [entA, entB];
          supportingData.classification = 'ANALYTICAL_RESULT';
          responseText = `### Shortest Path Analysis: **${entA.label}** ➔ **${entB.label}**\n\n` +
            `No connecting graph path found between **${entA.label}** and **${entB.label}** within the active case network. They belong to completely separate graph components.`;
        }
        return { query, answer: responseText, supportingData, generatedAt: new Date().toISOString(), agent: 'SHERLOCK_INVESTIGATION_AI' };
      }
    }

    // -------------------------------------------------------------------------
    // 2. IDENTIFIER QUERIES (Hardware IMEI, Phone number, Vehicle Plate)
    // -------------------------------------------------------------------------
    const imeiMatch = query.match(/\b\d{14,16}\b/);
    const phoneMatch = query.match(/\+?\d{10,13}\b/);
    const plateMatch = query.match(/\b[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,2}[-\s]?\d{4}\b/i);

    if (imeiMatch || phoneMatch || plateMatch) {
      const targetVal = (imeiMatch || phoneMatch || plateMatch)[0].trim();
      const matched = caseEntities.filter(e => {
        const attrs = e.attributes || {};
        return (attrs.imei && (attrs.imei.includes(targetVal) || targetVal.includes(attrs.imei))) ||
               (attrs.phoneNumber && (attrs.phoneNumber.includes(targetVal) || targetVal.includes(attrs.phoneNumber))) ||
               (attrs.plate && attrs.plate.toLowerCase().replace(/[-\s]/g, '').includes(targetVal.toLowerCase().replace(/[-\s]/g, ''))) ||
               e.id.includes(targetVal);
      });

      if (matched.length > 0) {
        supportingData.entities = matched;
        const allRels = [];
        matched.forEach(m => allRels.push(...store.getRelationshipsByEntity(m.id)));
        supportingData.relationships = allRels;
        supportingData.classification = 'FACT';

        responseText = `### Live Identifier Lookup: \`${targetVal}\`\n\n` +
          `Located **${matched.length} entity record(s)** associated with this identifier in the active DataStore:\n\n` +
          matched.map(m => `- **${m.label}** (${m.type}) — ID: \`${m.id}\`\n  - *Attributes*: \`${JSON.stringify(m.attributes)}\``).join('\n\n') +
          `\n\n**Connected Network:** Linked across ${allRels.length} operational relationship(s).`;

        return { query, answer: responseText, supportingData, generatedAt: new Date().toISOString(), agent: 'SHERLOCK_INVESTIGATION_AI' };
      }
    }

    // -------------------------------------------------------------------------
    // 3. TEMPORAL / DATE RANGE FILTERING QUERIES
    // e.g. "events on 2024-03-15", "timeline after March 10", "what happened on 2024-03-15"
    // -------------------------------------------------------------------------
    const dateRegexMatch = query.match(/\b\d{4}-\d{2}-\d{2}\b/);
    if (dateRegexMatch) {
      const targetDateStr = dateRegexMatch[0];
      const allEvents = selectedEntityId ? store.getEventsByEntity(selectedEntityId) : store.getEventsByCase(caseId);
      const filteredEvents = allEvents.filter(ev => ev.timestamp && ev.timestamp.startsWith(targetDateStr));

      supportingData.events = filteredEvents;
      supportingData.classification = 'FACT';

      if (filteredEvents.length > 0) {
        responseText = `### Timeline Events on ${targetDateStr}\n\n` +
          `Found **${filteredEvents.length} recorded event(s)** matching this timeframe:\n\n` +
          filteredEvents.map(ev => `- **${new Date(ev.timestamp).toLocaleTimeString()}** — **${ev.title}** (${ev.eventType})\n  - *Description*: ${ev.description || 'Logged incident'}\n  - *Entities involved*: ${ev.entityIds?.join(', ') || 'N/A'}`).join('\n\n');
      } else {
        responseText = `### Timeline Events on ${targetDateStr}\n\n` +
          `No recorded timeline incidents found in the active case repository for date \`${targetDateStr}\`.`;
      }
      return { query, answer: responseText, supportingData, generatedAt: new Date().toISOString(), agent: 'SHERLOCK_INVESTIGATION_AI' };
    }

    // -------------------------------------------------------------------------
    // 4. TOPOLOGICAL BRIDGE & BOTTLENECK QUERIES
    // -------------------------------------------------------------------------
    if (qLower.includes('bridge') || qLower.includes('betweenness') || qLower.includes('bottleneck') || qLower.includes('connect groups') || qLower.includes('connect these two groups')) {
      const analytics = AnalyticsService.runFullAnalytics(caseId);
      const topBridges = analytics.bridgeCandidates || [];

      supportingData.entities = topBridges.map(b => b.entity).filter(Boolean);
      supportingData.classification = 'ANALYTICAL_RESULT';

      responseText = `### Graph Topology Analysis: Bridge Candidates\n\n` +
        `Topological analysis indicates that the network is divided into functional operational branches. The following entity acts as the primary topological bridge:\n\n` +
        topBridges.map(b => `- **${b.entity.label}** (${b.entity.type})\n  - *Analytical metric*: Betweenness Centrality: ${b.betweennessScore}, Degree: ${b.degree}\n  - *Observation*: ${b.description}`).join('\n\n') +
        `\n\n**Investigative Significance:** Intercepting or isolating this node severs coordination between distinct network branches.`;

      return { query, answer: responseText, supportingData, generatedAt: new Date().toISOString(), agent: 'SHERLOCK_INVESTIGATION_AI' };
    }

    // -------------------------------------------------------------------------
    // 5. CONNECTIONS & RELATIONSHIPS QUERIES (Dynamic Entity Resolution)
    // e.g. "Who does Blade talk to?", "Who is Munshi connected with?", "connections around X"
    // -------------------------------------------------------------------------
    if (qLower.includes('connection') || qLower.includes('connect') || qLower.includes('talk to') || qLower.includes('communicate') || qLower.includes('network') || qLower.includes('around') || qLower.includes('who does')) {
      const targetEntity = AIService.resolveEntityFromQuery(query, caseEntities, selectedEntity) || (caseEntities.length > 0 ? caseEntities[0] : null);

      if (targetEntity) {
        const rels = store.getRelationshipsByEntity(targetEntity.id);
        const connectedEntities = rels.map(r => {
          const otherId = r.source === targetEntity.id ? r.target : r.source;
          return { entity: store.getEntity(otherId), rel: r };
        }).filter(item => item.entity);

        supportingData.entities = [targetEntity, ...connectedEntities.map(c => c.entity)];
        supportingData.relationships = rels;
        supportingData.classification = 'FACT';

        responseText = `### Investigative Connection Summary for **${targetEntity.label}** (${targetEntity.id}):\n\n` +
          `This entity has **${rels.length} direct link(s)** recorded in the knowledge graph:\n\n` +
          (connectedEntities.length > 0
            ? connectedEntities.map(c => `- **${c.rel.type}** with [${c.entity.label}] (${c.entity.type}) — *Provenance: ${c.rel.provenance || 'INTELLIGENCE_FILE'}* [Confidence: ${(c.rel.confidence * 100).toFixed(0)}%]`).join('\n')
            : `*No direct adjacent links recorded for this entity in the active graph.*`);

        return { query, answer: responseText, supportingData, generatedAt: new Date().toISOString(), agent: 'SHERLOCK_INVESTIGATION_AI' };
      }
    }

    // -------------------------------------------------------------------------
    // 6. EVIDENCE & EXHIBITS QUERIES
    // -------------------------------------------------------------------------
    if (qLower.includes('evidence') || qLower.includes('proof') || qLower.includes('support') || qLower.includes('exhibit')) {
      const targetEntity = AIService.resolveEntityFromQuery(query, caseEntities, selectedEntity);
      const evList = targetEntity ? store.getEvidenceByEntity(targetEntity.id) : store.getEvidenceByCase(caseId);

      supportingData.evidence = evList;
      supportingData.classification = 'FACT';

      responseText = `### Evidence & Chain-of-Custody Inventory\n\n` +
        `Found **${evList.length} authenticated evidence items** supporting this investigative inquiry:\n\n` +
        evList.map(e => `- **[${e.id}] ${e.title}** (${e.evidenceType})\n  - *Source*: ${e.source}\n  - *Integrity Hash*: \`${(e.hash || '').substring(0, 32)}...\`\n  - *Classification*: **${e.classification}** (Confidence: ${(e.confidence * 100).toFixed(0)}%)`).join('\n\n');

      return { query, answer: responseText, supportingData, generatedAt: new Date().toISOString(), agent: 'SHERLOCK_INVESTIGATION_AI' };
    }

    // -------------------------------------------------------------------------
    // 7. TIMELINE GENERAL QUERIES
    // -------------------------------------------------------------------------
    if (qLower.includes('timeline') || qLower.includes('when') || qLower.includes('chronolog') || qLower.includes('happen')) {
      const targetEntity = AIService.resolveEntityFromQuery(query, caseEntities, selectedEntity);
      const events = targetEntity ? store.getEventsByEntity(targetEntity.id) : store.getEventsByCase(caseId);

      supportingData.events = events;
      supportingData.classification = 'FACT';

      responseText = `### Chronological Timeline of Recorded Events\n\n` +
        events.map(ev => `- **${new Date(ev.timestamp).toUTCString()}** — **${ev.title}** (${ev.eventType})\n  - *Location*: ${ev.locationName || 'Unknown'}\n  - *Description*: ${ev.description}`).join('\n\n');

      return { query, answer: responseText, supportingData, generatedAt: new Date().toISOString(), agent: 'SHERLOCK_INVESTIGATION_AI' };
    }

    // -------------------------------------------------------------------------
    // 8. GEOSPATIAL INTELLIGENCE QUERIES
    // -------------------------------------------------------------------------
    if (qLower.includes('location') || qLower.includes('where') || qLower.includes('geographic') || qLower.includes('coordinates') || qLower.includes('city')) {
      const targetEntity = AIService.resolveEntityFromQuery(query, caseEntities, selectedEntity);
      const locations = targetEntity ? store.getLocationsByEntity(targetEntity.id) : store.getLocationsByCase(caseId);

      supportingData.locations = locations;
      supportingData.classification = 'FACT';

      responseText = `### Geographic Intelligence\n\n` +
        `Tracked **${locations.length} coordinates** associated with this inquiry:\n\n` +
        locations.map(l => `- **${l.name}** (${l.city}, ${l.country})\n  - *Coordinates*: \`[${l.latitude.toFixed(4)}, ${l.longitude.toFixed(4)}]\`\n  - *Operational Role*: ${l.locationType} (Source: ${l.source})`).join('\n\n');

      return { query, answer: responseText, supportingData, generatedAt: new Date().toISOString(), agent: 'SHERLOCK_INVESTIGATION_AI' };
    }

    // -------------------------------------------------------------------------
    // 9. GENERAL / FALLBACK INQUIRY
    // -------------------------------------------------------------------------
    responseText = `### Case Overview: ${caseObj?.title || caseId}\n\n` +
      `- **Lead Agency**: ${caseObj?.leadAgency || 'Special Operations'}\n` +
      `- **Investigator**: ${caseObj?.leadInvestigator || 'Unassigned'}\n` +
      `- **Total Entities Mapped**: ${caseEntities.length}\n` +
      `- **Key Entities**: ${caseEntities.slice(0, 5).map(e => e.label).join(', ')}\n\n` +
      `*You can ask me to find shortest paths between entities, inspect communication networks around any person/alias, look up hardware IMEIs/phone numbers, or filter events by date.*`;

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
   * Delegates dynamically to case-grounded MoriartyEngine.
   */
  static async queryMoriarty({ caseId = 'CASE-2024-VORTEX', selectedEntityId = null }) {
    return MoriartyEngine.generateAssessments({ caseId, selectedEntityId });
  }
}

export default AIService;

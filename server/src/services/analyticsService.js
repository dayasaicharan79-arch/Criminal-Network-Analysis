/**
 * CONSTELLATION — Graph Analytics Service
 * 
 * Computes deterministic graph metrics on real investigation networks:
 * - Degree Centrality
 * - Betweenness Centrality (Brandes' Algorithm)
 * - Closeness Centrality
 * - Bridge / Articulation Point Candidates (Tarjan's algorithm)
 * - Connected Components (BFS)
 * - Community Detection (Label Propagation)
 * - Shortest Path (BFS)
 * - Network Density
 * 
 * NOTE: Terminology is kept strictly objective and analytical:
 * "high connectivity", "bridge candidate", "central node", "strongly connected group".
 */
import { store } from '../data/store.js';

export class AnalyticsService {
  /**
   * Builds an adjacency list from nodes and links.
   */
  static buildAdjacency(nodes, links) {
    const adj = new Map();
    const nodeMap = new Map();

    for (const node of nodes) {
      adj.set(node.id, new Set());
      nodeMap.set(node.id, node);
    }

    for (const link of links) {
      const src = typeof link.source === 'object' ? link.source.id : link.source;
      const tgt = typeof link.target === 'object' ? link.target.id : link.target;

      if (adj.has(src) && adj.has(tgt)) {
        adj.get(src).add(tgt);
        adj.get(tgt).add(src); // Undirected for topological structural analysis
      }
    }

    return { adj, nodeMap };
  }

  /**
   * Computes degree centrality for each node.
   */
  static computeDegreeCentrality(adj, nodeCount) {
    const degrees = {};
    const normalized = {};
    const maxPossible = nodeCount > 1 ? nodeCount - 1 : 1;

    for (const [nodeId, neighbors] of adj.entries()) {
      degrees[nodeId] = neighbors.size;
      normalized[nodeId] = Number((neighbors.size / maxPossible).toFixed(4));
    }

    return { raw: degrees, normalized };
  }

  /**
   * Computes betweenness centrality using Brandes' algorithm.
   */
  static computeBetweennessCentrality(adj, nodeIds) {
    const cb = {};
    for (const id of nodeIds) cb[id] = 0;

    for (const s of nodeIds) {
      const S = [];
      const P = {};
      const sigma = {};
      const d = {};

      for (const v of nodeIds) {
        P[v] = [];
        sigma[v] = 0;
        d[v] = -1;
      }

      sigma[s] = 1;
      d[s] = 0;
      const Q = [s];

      while (Q.length > 0) {
        const v = Q.shift();
        S.push(v);

        const neighbors = adj.get(v) || new Set();
        for (const w of neighbors) {
          if (d[w] < 0) {
            Q.push(w);
            d[w] = d[v] + 1;
          }
          if (d[w] === d[v] + 1) {
            sigma[w] += sigma[v];
            P[w].push(v);
          }
        }
      }

      const delta = {};
      for (const v of nodeIds) delta[v] = 0;

      while (S.length > 0) {
        const w = S.pop();
        for (const v of P[w]) {
          delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
        }
        if (w !== s) {
          cb[w] += delta[w];
        }
      }
    }

    // Halve because graph is undirected
    const normalized = {};
    const scale = nodeIds.length > 2 ? ((nodeIds.length - 1) * (nodeIds.length - 2)) / 2 : 1;

    for (const id of nodeIds) {
      cb[id] = cb[id] / 2;
      normalized[id] = Number((cb[id] / scale).toFixed(4));
    }

    return { raw: cb, normalized };
  }

  /**
   * Computes closeness centrality.
   */
  static computeClosenessCentrality(adj, nodeIds) {
    const closeness = {};

    for (const s of nodeIds) {
      const d = {};
      for (const v of nodeIds) d[v] = -1;
      d[s] = 0;
      const Q = [s];
      let totalDist = 0;
      let reachable = 0;

      while (Q.length > 0) {
        const v = Q.shift();
        const neighbors = adj.get(v) || new Set();
        for (const w of neighbors) {
          if (d[w] < 0) {
            d[w] = d[v] + 1;
            totalDist += d[w];
            reachable++;
            Q.push(w);
          }
        }
      }

      if (reachable > 0 && totalDist > 0) {
        closeness[s] = Number(((reachable / (nodeIds.length - 1)) * (reachable / totalDist)).toFixed(4));
      } else {
        closeness[s] = 0;
      }
    }

    return closeness;
  }

  /**
   * Identifies connected components using BFS.
   */
  static computeConnectedComponents(adj, nodeIds) {
    const visited = new Set();
    const components = [];

    for (const node of nodeIds) {
      if (!visited.has(node)) {
        const comp = [];
        const queue = [node];
        visited.add(node);

        while (queue.length > 0) {
          const curr = queue.shift();
          comp.push(curr);
          for (const neighbor of (adj.get(curr) || [])) {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push(neighbor);
            }
          }
        }
        components.push(comp);
      }
    }

    return components;
  }

  /**
   * Identifies bridge candidates (articulation points) using Tarjan's DFS.
   */
  static computeBridgeCandidates(adj, nodeIds) {
    const visited = new Set();
    const tin = {};
    const low = {};
    let timer = 0;
    const articulationPoints = new Set();

    function dfs(v, p = -1) {
      visited.add(v);
      tin[v] = low[v] = ++timer;
      let children = 0;

      for (const to of (adj.get(v) || [])) {
        if (to === p) continue;
        if (visited.has(to)) {
          low[v] = Math.min(low[v], tin[to]);
        } else {
          dfs(to, v);
          low[v] = Math.min(low[v], low[to]);
          if (low[to] >= tin[v] && p !== -1) {
            articulationPoints.add(v);
          }
          children++;
        }
      }

      if (p === -1 && children > 1) {
        articulationPoints.add(v);
      }
    }

    for (const node of nodeIds) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return Array.from(articulationPoints);
  }

  /**
   * Community Detection using synchronous Label Propagation.
   */
  static computeCommunities(adj, nodeIds, maxIterations = 20) {
    const labels = {};
    nodeIds.forEach((id, idx) => {
      labels[id] = `community_${idx}`;
    });

    for (let iter = 0; iter < maxIterations; iter++) {
      let changed = false;

      for (const node of nodeIds) {
        const neighbors = Array.from(adj.get(node) || []);
        if (neighbors.length === 0) continue;

        const count = {};
        for (const n of neighbors) {
          const lbl = labels[n];
          count[lbl] = (count[lbl] || 0) + 1;
        }

        let maxCount = 0;
        let bestLabel = labels[node];

        for (const [lbl, c] of Object.entries(count)) {
          if (c > maxCount) {
            maxCount = c;
            bestLabel = lbl;
          }
        }

        if (bestLabel !== labels[node]) {
          labels[node] = bestLabel;
          changed = true;
        }
      }

      if (!changed) break;
    }

    // Group by community label
    const communities = {};
    for (const [nodeId, comm] of Object.entries(labels)) {
      if (!communities[comm]) communities[comm] = [];
      communities[comm].push(nodeId);
    }

    return Object.values(communities);
  }

  /**
   * Computes shortest path between two nodes using BFS.
   */
  static findShortestPath(fromId, toId, caseId = null) {
    const { nodes, links } = store.getGraph({ caseId });
    const { adj } = AnalyticsService.buildAdjacency(nodes, links);

    if (!adj.has(fromId) || !adj.has(toId)) {
      return null;
    }

    const queue = [[fromId]];
    const visited = new Set([fromId]);

    while (queue.length > 0) {
      const path = queue.shift();
      const curr = path[path.length - 1];

      if (curr === toId) {
        // Collect connecting links
        const edgePath = [];
        for (let i = 0; i < path.length - 1; i++) {
          const u = path[i];
          const v = path[i + 1];
          const rel = links.find(
            l => (l.source === u && l.target === v) || (l.source === v && l.target === u)
          );
          if (rel) edgePath.push(rel);
        }

        return {
          nodes: path.map(id => store.getEntity(id)),
          links: edgePath,
          distance: path.length - 1,
        };
      }

      for (const neighbor of (adj.get(curr) || [])) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }

    return null;
  }

  /**
   * Full Analytics suite evaluation for a case or whole network.
   */
  static runFullAnalytics(caseId = null) {
    const { nodes, links } = store.getGraph({ caseId });
    const { adj, nodeMap } = AnalyticsService.buildAdjacency(nodes, links);
    const nodeIds = Array.from(adj.keys());

    const degree = AnalyticsService.computeDegreeCentrality(adj, nodeIds.length);
    const betweenness = AnalyticsService.computeBetweennessCentrality(adj, nodeIds);
    const closeness = AnalyticsService.computeClosenessCentrality(adj, nodeIds);
    const components = AnalyticsService.computeConnectedComponents(adj, nodeIds);
    const bridgeCandidates = AnalyticsService.computeBridgeCandidates(adj, nodeIds);
    const communities = AnalyticsService.computeCommunities(adj, nodeIds);

    // Calculate network density
    const numNodes = nodeIds.length;
    const numEdges = links.length;
    const maxEdges = numNodes > 1 ? (numNodes * (numNodes - 1)) / 2 : 1;
    const density = Number((numEdges / maxEdges).toFixed(4));

    // Sort top central nodes
    const rankedDegree = [...nodeIds]
      .sort((a, b) => degree.raw[b] - degree.raw[a])
      .map(id => ({
        entity: nodeMap.get(id),
        score: degree.raw[id],
        normalized: degree.normalized[id],
        category: 'High Connectivity Node',
      }));

    // Sort top bridge candidates (high betweenness)
    const rankedBetweenness = [...nodeIds]
      .sort((a, b) => betweenness.normalized[b] - betweenness.normalized[a])
      .map(id => ({
        entity: nodeMap.get(id),
        score: betweenness.raw[id],
        normalized: betweenness.normalized[id],
        isArticulationPoint: bridgeCandidates.includes(id),
        category: 'Information/Resource Connector Candidate',
      }));

    return {
      caseId,
      summary: {
        totalNodes: numNodes,
        totalLinks: numEdges,
        networkDensity: density,
        connectedComponentCount: components.length,
        communityCount: communities.length,
        bridgeCandidateCount: bridgeCandidates.length,
      },
      centrality: {
        degree: rankedDegree.slice(0, 10),
        betweenness: rankedBetweenness.slice(0, 10),
        closeness: nodeIds.map(id => ({ entity: nodeMap.get(id), score: closeness[id] })),
      },
      bridgeCandidates: bridgeCandidates.map(id => ({
        entity: nodeMap.get(id),
        description: 'Removal of this node fragments or disconnects subgraphs',
        degree: degree.raw[id],
        betweennessScore: betweenness.normalized[id],
      })),
      communities: communities.map((comm, idx) => ({
        id: `COMMUNITY-${idx + 1}`,
        size: comm.length,
        memberEntities: comm.map(id => nodeMap.get(id)),
      })),
      components: components.map((comp, idx) => ({
        id: `COMPONENT-${idx + 1}`,
        size: comp.length,
        memberEntities: comp.map(id => nodeMap.get(id)),
      })),
    };
  }
}

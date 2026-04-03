import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as d3 from 'd3';

const API = 'http://localhost:8000';

const STATE_COLORS = {
  strong:     { fill: '#22c55e', stroke: '#16a34a', bg: 'rgba(34,197,94,0.12)', label: 'Strong' },
  developing: { fill: '#fdd34d', stroke: '#eab308', bg: 'rgba(253,211,77,0.12)', label: 'Developing' },
  weak:       { fill: '#ff716c', stroke: '#ef4444', bg: 'rgba(255,113,108,0.12)', label: 'Weak' },
  locked:     { fill: '#555555', stroke: '#444444', bg: 'rgba(85,85,85,0.12)', label: 'Locked' },
};

const TIER_LABELS = {
  0: 'Foundations',
  1: 'Expressions',
  2: 'Linear Equations',
  3: 'Linear Functions',
  4: 'Systems of Equations',
};

export default function KnowledgeDAGPage() {
  const [dagData, setDagData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [blameResult, setBlameResult] = useState(null);
  const [blameInput, setBlameInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [blameLoading, setBlameLoading] = useState(false);
  const [unlockStatus, setUnlockStatus] = useState([]);
  const svgRef = useRef(null);
  const simulationRef = useRef(null);

  const fetchDAG = useCallback(() => {
    setLoading(true);
    fetch(`${API}/api/dag?student_id=default`)
      .then(r => r.json())
      .then(data => {
        setDagData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch DAG:', err);
        setLoading(false);
      });
  }, []);

  const fetchUnlockStatus = useCallback(() => {
    fetch(`${API}/api/dag/unlock-status?student_id=default`)
      .then(r => r.json())
      .then(data => setUnlockStatus(data))
      .catch(err => console.error('Failed to fetch unlock status:', err));
  }, []);

  useEffect(() => {
    fetchDAG();
    fetchUnlockStatus();
  }, [fetchDAG, fetchUnlockStatus]);

  const runBlame = useCallback(() => {
    if (!blameInput.trim()) return;
    setBlameLoading(true);
    const mcIds = blameInput.split(',').map(s => s.trim()).filter(Boolean);
    fetch(`${API}/api/dag/blame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        misconception_ids: mcIds,
        student_id: 'default',
        max_items: 10,
      }),
    })
      .then(r => r.json())
      .then(data => {
        setBlameResult(data);
        setBlameLoading(false);
      })
      .catch(err => {
        console.error('Blame propagation failed:', err);
        setBlameLoading(false);
      });
  }, [blameInput]);

  const fetchConceptDetail = useCallback((conceptId) => {
    fetch(`${API}/api/dag/concept/${conceptId}?student_id=default`)
      .then(r => r.json())
      .then(data => setSelectedNode(data))
      .catch(err => console.error('Failed to fetch concept:', err));
  }, []);

  useEffect(() => {
    if (!dagData || !svgRef.current) return;

    const container = svgRef.current.parentElement;
    const width = container.clientWidth;
    const height = 520;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const defs = svg.append('defs');

    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 28)
      .attr('refY', 0)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', 'rgba(255, 143, 111, 0.5)');

    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
    filter.append('feMerge').call(m => {
      m.append('feMergeNode').attr('in', 'blur');
      m.append('feMergeNode').attr('in', 'SourceGraphic');
    });

    const g = svg.append('g');

    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    const blameLookup = {};
    if (blameResult?.full_blame_chain) {
      blameResult.full_blame_chain.forEach(b => {
        blameLookup[b.concept_id] = b;
      });
    }

    const tierGroups = {};
    dagData.nodes.forEach(n => {
      if (!tierGroups[n.tier]) tierGroups[n.tier] = [];
      tierGroups[n.tier].push(n);
    });

    const tiers = Object.keys(tierGroups).sort((a, b) => a - b);
    const tierSpacing = height / (tiers.length + 1);

    const nodes = dagData.nodes.map(n => {
      const tierIdx = tiers.indexOf(String(n.tier));
      const nodesInTier = tierGroups[n.tier];
      const idxInTier = nodesInTier.indexOf(n);
      const xSpacing = width / (nodesInTier.length + 1);
      return {
        ...n,
        x: xSpacing * (idxInTier + 1),
        y: tierSpacing * (tierIdx + 1),
        isBlamed: !!blameLookup[n.id],
        blameWeight: blameLookup[n.id]?.blame_weight || 0,
        priorityScore: blameLookup[n.id]?.priority_score || 0,
        isRoot: blameLookup[n.id]?.is_root || false,
      };
    });

    const nodeById = {};
    nodes.forEach(n => { nodeById[n.id] = n; });

    const links = dagData.edges.map(e => ({
      source: nodeById[e.from],
      target: nodeById[e.to],
    })).filter(l => l.source && l.target);

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(100).strength(0.3))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('y', d3.forceY(d => {
        const tierIdx = tiers.indexOf(String(d.tier));
        return tierSpacing * (tierIdx + 1);
      }).strength(0.8))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('collision', d3.forceCollide(40));

    simulationRef.current = simulation;

    tiers.forEach((tier, idx) => {
      const y = tierSpacing * (idx + 1) - tierSpacing / 2;
      g.append('rect')
        .attr('x', 0).attr('y', y)
        .attr('width', width).attr('height', tierSpacing)
        .attr('fill', idx % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent')
        .attr('rx', 0);

      g.append('text')
        .attr('x', 16).attr('y', y + 18)
        .text(`Tier ${tier} — ${TIER_LABELS[tier] || ''}`)
        .attr('fill', 'rgba(255,255,255,0.15)')
        .attr('font-size', '11px')
        .attr('font-weight', 600)
        .attr('font-family', 'Plus Jakarta Sans, sans-serif');
    });

    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => {
        if (blameLookup[d.source.id] && blameLookup[d.target.id]) return '#ff8f6f';
        return 'rgba(255, 143, 111, 0.2)';
      })
      .attr('stroke-width', d => {
        if (blameLookup[d.source.id] && blameLookup[d.target.id]) return 3;
        return 1.5;
      })
      .attr('stroke-dasharray', d => {
        if (blameLookup[d.source.id] && blameLookup[d.target.id]) return 'none';
        return '4,4';
      })
      .attr('marker-end', 'url(#arrowhead)');

    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        fetchConceptDetail(d.id);
      })
      .call(d3.drag()
        .on('start', (event) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          event.subject.fx = event.subject.x;
          event.subject.fy = event.subject.y;
        })
        .on('drag', (event) => {
          event.subject.fx = event.x;
          event.subject.fy = event.y;
        })
        .on('end', (event) => {
          if (!event.active) simulation.alphaTarget(0);
          event.subject.fx = null;
          event.subject.fy = null;
        }));

    node.filter(d => d.isBlamed)
      .append('circle')
      .attr('r', 30)
      .attr('fill', 'none')
      .attr('stroke', d => d.isRoot ? '#ff716c' : '#ff8f6f')
      .attr('stroke-width', 2)
      .attr('opacity', d => Math.max(0.3, d.blameWeight))
      .attr('filter', 'url(#glow)');

    node.append('circle')
      .attr('r', 22)
      .attr('fill', '#1a1a1a')
      .attr('stroke', d => {
        const state = d.state || 'weak';
        return STATE_COLORS[state]?.stroke || '#555';
      })
      .attr('stroke-width', d => d.isBlamed ? 3.5 : 2.5);

    node.append('text')
      .attr('dy', 1)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .text(d => (d.mastery !== undefined ? Math.round(d.mastery) + '%' : '—'))
      .attr('font-size', '10px')
      .attr('fill', '#fff')
      .attr('font-weight', 700)
      .attr('font-family', 'Inter, sans-serif')
      .style('pointer-events', 'none');

    node.append('text')
      .attr('dy', 36)
      .attr('text-anchor', 'middle')
      .text(d => d.id)
      .attr('font-size', '9px')
      .attr('fill', '#adaaaa')
      .attr('font-weight', 700)
      .attr('font-family', 'Inter, sans-serif')
      .style('pointer-events', 'none');

    node.append('text')
      .attr('dy', 48)
      .attr('text-anchor', 'middle')
      .text(d => d.name.length > 22 ? d.name.slice(0, 20) + '…' : d.name)
      .attr('font-size', '9px')
      .attr('fill', '#777')
      .attr('font-weight', 500)
      .attr('font-family', 'Inter, sans-serif')
      .style('pointer-events', 'none');

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${
        Math.max(35, Math.min(width - 35, d.x))
      },${
        Math.max(35, Math.min(height - 55, d.y))
      })`);
    });

    return () => simulation.stop();
  }, [dagData, blameResult, fetchConceptDetail]);

  const BLAME_PRESETS = [
    { label: 'M11 — Sign error on variable move', value: 'M11' },
    { label: 'M20 — Substitution into same equation', value: 'M20' },
    { label: 'M05 — Unlike terms combined', value: 'M05' },
    { label: 'M07 — Partial distribution', value: 'M07' },
    { label: 'M13 — Inverted slope', value: 'M13' },
    { label: 'M23,M22 — Multiple elimination errors', value: 'M23,M22' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-on-surface-variant">Loading Knowledge DAG...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {}
      <nav className="w-full top-0 sticky bg-[#0e0e0e]/95 backdrop-blur-xl z-50 border-b border-white/5">
        <div className="flex justify-between items-center px-8 py-4 max-w-screen-2xl mx-auto">
          <Link to="/" className="text-2xl font-bold tracking-tighter text-primary font-headline">Episteme</Link>
          <div className="hidden md:flex gap-8 items-center font-headline text-sm font-medium tracking-wide">
            <Link to="/dashboard" className="text-stone-400 hover:text-stone-100 transition-colors">Dashboard</Link>
            <Link to="/fault-tree-demo" className="text-stone-400 hover:text-stone-100 transition-colors">Fault Tree</Link>
            <span className="text-primary font-bold border-b-2 border-primary pb-1">Knowledge DAG</span>
            <Link to="/behavior-tree" className="text-stone-400 hover:text-stone-100 transition-colors">Behavior Tree</Link>
            <Link to="/session" className="text-stone-400 hover:text-stone-100 transition-colors">Live Session</Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">
              {dagData?.nodes?.length || 0} Concepts
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-screen-2xl mx-auto px-8 py-8 flex-grow w-full">
        {}
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight font-headline mb-2">
              Prerequisite DAG
            </h1>
            <p className="text-on-surface-variant text-lg">
              Interactive concept dependency graph with <span className="text-primary font-semibold">blame backpropagation</span>
            </p>
          </div>
          <div className="flex gap-2">
            {Object.entries(STATE_COLORS).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: val.bg }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: val.fill }}></div>
                <span className="text-xs font-medium" style={{ color: val.fill }}>{val.label}</span>
              </div>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {}
          <section className="lg:col-span-8 bg-surface-container rounded-3xl overflow-hidden relative">
            <div className="p-6 pb-0 flex justify-between items-center">
              <div>
                <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-1 block">Interactive Graph</span>
                <h2 className="text-xl font-bold font-headline">Concept Dependency Network</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Click nodes • Drag to reposition</span>
              </div>
            </div>
            <div style={{ width: '100%', height: '520px', position: 'relative' }}>
              <svg ref={svgRef} style={{ width: '100%', height: '100%' }}></svg>
            </div>

            {}
            <div className="p-6 pt-2 grid grid-cols-4 gap-3">
              {[
                { label: 'Total Concepts', value: dagData?.nodes?.length || 0 },
                { label: 'Prerequisite Edges', value: dagData?.edges?.length || 0 },
                { label: 'Weak Concepts', value: dagData?.nodes?.filter(n => n.state === 'weak').length || 0, color: 'text-error' },
                { label: 'Strong Concepts', value: dagData?.nodes?.filter(n => n.state === 'strong').length || 0, color: 'text-green-400' },
              ].map(s => (
                <div key={s.label} className="bg-surface-container-low p-3 rounded-2xl">
                  <div className="text-on-surface-variant text-xs mb-1">{s.label}</div>
                  <div className={`text-xl font-bold ${s.color || ''}`}>{s.value}</div>
                </div>
              ))}
            </div>
          </section>

          {}
          <div className="lg:col-span-4 space-y-6">

            {}
            <section className="bg-surface-container rounded-3xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>neurology</span>
                <h2 className="text-lg font-bold font-headline">Blame Propagation</h2>
              </div>
              <p className="text-sm text-on-surface-variant mb-4">
                Enter misconception IDs to trace blame backwards through the DAG and find root-cause gaps.
              </p>

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={blameInput}
                  onChange={e => setBlameInput(e.target.value)}
                  placeholder="e.g. M11 or M20,M05"
                  className="flex-grow bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-stone-600 focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  onClick={runBlame}
                  disabled={blameLoading || !blameInput.trim()}
                  className="bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-bold hover:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {blameLoading ? '...' : 'Trace'}
                </button>
              </div>

              {}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {BLAME_PRESETS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => { setBlameInput(p.value); }}
                    className="text-xs bg-surface-container-low border border-outline-variant/10 text-on-surface-variant px-2.5 py-1 rounded-lg hover:border-primary/40 hover:text-primary transition-all"
                  >
                    {p.value}
                  </button>
                ))}
              </div>

              {}
              {blameResult && (
                <div className="space-y-2 mt-4">
                  <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                    Repair Queue — {blameResult.root_concepts?.join(', ')} blame chain
                  </div>
                  {blameResult.repair_queue?.map((item, i) => (
                    <div
                      key={item.concept_id}
                      className={`p-3 rounded-xl border transition-all cursor-pointer hover:border-primary/40 ${
                        item.is_root
                          ? 'bg-error/10 border-error/30'
                          : 'bg-surface-container-low border-white/5'
                      }`}
                      onClick={() => fetchConceptDetail(item.concept_id)}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-primary">#{i + 1}</span>
                          <span className="font-bold text-sm">{item.concept_id}</span>
                          {item.is_root && (
                            <span className="text-[10px] bg-error/20 text-error px-1.5 py-0.5 rounded font-bold">ROOT</span>
                          )}
                        </div>
                        <span className="text-xs font-mono text-primary font-bold">
                          P: {item.priority_score.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-on-surface-variant">{item.concept_name}</div>
                      <div className="flex gap-3 mt-1.5 text-[10px] text-stone-500">
                        <span>Blame: {item.blame_weight}</span>
                        <span>Mastery: {item.mastery}%</span>
                        <span>Gap: {(item.mastery_gap * 100).toFixed(0)}%</span>
                        <span>Deps: {item.num_dependents}</span>
                      </div>
                    </div>
                  ))}
                  {blameResult.repair_queue?.length === 0 && (
                    <p className="text-sm text-stone-500">No blame chain found for these misconceptions.</p>
                  )}
                </div>
              )}
            </section>

            {}
            {selectedNode && (
              <section className="bg-surface-container rounded-3xl p-6 animate-[fadeIn_0.3s_ease]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                    <h2 className="text-lg font-bold font-headline">Concept Detail</h2>
                  </div>
                  <button onClick={() => setSelectedNode(null)} className="text-stone-500 hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-on-surface-variant mb-1">ID</div>
                    <div className="text-xl font-bold font-headline text-primary">{selectedNode.id}</div>
                  </div>
                  <div>
                    <div className="text-xs text-on-surface-variant mb-1">Name</div>
                    <div className="text-sm font-semibold">{selectedNode.name}</div>
                  </div>
                  {selectedNode.description && (
                    <div>
                      <div className="text-xs text-on-surface-variant mb-1">Description</div>
                      <div className="text-sm text-on-surface-variant leading-relaxed">{selectedNode.description}</div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-surface-container-low p-3 rounded-xl text-center">
                      <div className="text-xs text-on-surface-variant mb-1">Tier</div>
                      <div className="font-bold">{selectedNode.tier}</div>
                    </div>
                    <div className="bg-surface-container-low p-3 rounded-xl text-center">
                      <div className="text-xs text-on-surface-variant mb-1">Mastery</div>
                      <div className="font-bold">{Math.round(selectedNode.mastery || 0)}%</div>
                    </div>
                    <div className="bg-surface-container-low p-3 rounded-xl text-center">
                      <div className="text-xs text-on-surface-variant mb-1">State</div>
                      <div className="font-bold capitalize" style={{ color: STATE_COLORS[selectedNode.state]?.fill || '#fff' }}>
                        {selectedNode.state}
                      </div>
                    </div>
                  </div>

                  {}
                  {selectedNode.prerequisites?.length > 0 && (
                    <div>
                      <div className="text-xs text-on-surface-variant mb-2">Direct Prerequisites</div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedNode.prerequisites.map(p => (
                          <span key={p} className="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-lg font-bold cursor-pointer hover:bg-primary/20 transition-colors"
                            onClick={() => fetchConceptDetail(p)}>
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {}
                  {selectedNode.dependents?.length > 0 && (
                    <div>
                      <div className="text-xs text-on-surface-variant mb-2">Direct Dependents</div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedNode.dependents.map(d => (
                          <span key={d} className="bg-secondary/10 text-secondary text-xs px-2.5 py-1 rounded-lg font-bold cursor-pointer hover:bg-secondary/20 transition-colors"
                            onClick={() => fetchConceptDetail(d)}>
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {}
                  <div>
                    <div className="text-xs text-on-surface-variant mb-1">Bloom's Level</div>
                    <div className="h-2 bg-surface-container-low rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-700"
                        style={{ width: `${((selectedNode.bloom_level || 1) / 6) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-[10px] text-stone-500 mt-1">Level {selectedNode.bloom_level || 1} of 6</div>
                  </div>
                </div>
              </section>
            )}

            {}
            <section className="bg-surface-container rounded-3xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-tertiary-dim" style={{ fontVariationSettings: "'FILL' 1" }}>route</span>
                <h2 className="text-lg font-bold font-headline">Topological Study Order</h2>
              </div>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-2">
                {dagData?.topological_order?.map((cid, i) => {
                  const nodeData = dagData.nodes.find(n => n.id === cid);
                  const state = nodeData?.state || 'weak';
                  return (
                    <div
                      key={cid}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => fetchConceptDetail(cid)}
                    >
                      <span className="text-xs font-mono text-stone-600 w-5">{String(i + 1).padStart(2, '0')}</span>
                      <div className="w-2 h-2 rounded-full" style={{ background: STATE_COLORS[state]?.fill }}></div>
                      <span className="text-sm font-medium flex-grow">{cid}</span>
                      <span className="text-xs text-stone-500">{nodeData?.name?.slice(0, 20)}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

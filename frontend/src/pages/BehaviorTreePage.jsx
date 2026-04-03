import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';

import { API } from '../api';

export default function BehaviorTreePage() {
  const [treeStructure, setTreeStructure] = useState(null);
  const [btResult, setBtResult] = useState(null);
  const [learnerState, setLearnerState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const svgRef = useRef(null);

  const [overrides, setOverrides] = useState({
    calibration_state: 'well_calibrated',
    fatigue_score: 0.3,
    top_priority_blame: 0.4,
    current_concept_mastery: 65,
    consecutive_correct_streak: 1,
    consecutive_wrong_streak: 0,
    theta_se: 0.5,
    items_in_session: 3,
    active_misconception_id: '',
  });

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/bt/structure`).then(r => r.json()),
      fetch(`${API}/api/bt/state/default`).then(r => r.json()),
    ]).then(([structure, state]) => {
      setTreeStructure(structure);
      setLearnerState(state);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const runTick = useCallback(async () => {
    setSimulating(true);
    try {
      const stateOverrides = { ...overrides };
      if (!stateOverrides.active_misconception_id) {
        stateOverrides.active_misconception_id = null;
      }
      stateOverrides.fatigue_score = parseFloat(stateOverrides.fatigue_score);
      stateOverrides.top_priority_blame = parseFloat(stateOverrides.top_priority_blame);
      stateOverrides.current_concept_mastery = parseFloat(stateOverrides.current_concept_mastery);
      stateOverrides.consecutive_correct_streak = parseInt(stateOverrides.consecutive_correct_streak);
      stateOverrides.consecutive_wrong_streak = parseInt(stateOverrides.consecutive_wrong_streak);
      stateOverrides.theta_se = parseFloat(stateOverrides.theta_se);
      stateOverrides.items_in_session = parseInt(stateOverrides.items_in_session);

      const response = await fetch(`${API}/api/bt/tick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: 'default', state_overrides: stateOverrides }),
      });
      const data = await response.json();
      setBtResult(data);
    } catch (err) {
      console.error('BT tick failed:', err);
    } finally {
      setSimulating(false);
    }
  }, [overrides]);

  useEffect(() => {
    if (!svgRef.current || !treeStructure) return;

    const width = 1100;
    const height = 650; 
    const margin = { top: 60, right: 40, bottom: 80, left: 40 };

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'btGlow');
    filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const treeLayout = d3.tree()
      .size([width - margin.left - margin.right, height - margin.top - margin.bottom])
      .separation((a, b) => (a.parent === b.parent ? 1.2 : 1.5));

    const root = d3.hierarchy(treeStructure);
    treeLayout(root);

    const firedBranches = new Set();
    const evaluatedBranches = new Set();

    if (btResult?.action?.trace) {
      btResult.action.trace.forEach(t => {
        evaluatedBranches.add(t.branch);
        if (t.fired) firedBranches.add(t.branch);
      });
    }

    g.selectAll('.btLink')
      .data(root.links())
      .enter().append('path')
      .attr('class', 'btLink')
      .attr('d', d3.linkVertical().x(d => d.x).y(d => d.y))
      .attr('fill', 'none')
      .attr('stroke', d => {

        const name = d.target.data.name || '';
        const parentName = d.source.data.name || '';

        const isFiredBranch = firedBranches.has(name) || firedBranches.has(parentName);
        if (isFiredBranch) {
          if (name.includes('DANGER')) return '#ff716c';
          if (name.includes('FATIGUE')) return '#fdd34d';
          if (name.includes('PREREQ') || name.includes('MISCONCEPTION')) return '#ff8f6f';
          if (name.includes('ADVANCE')) return '#22c55e';
          if (name.includes('INTERLEAVING')) return '#fdd34d';
          if (name.includes('DEFAULT') || name.includes('CAT')) return '#ffffff';
        }

        if (evaluatedBranches.has(name) && !firedBranches.has(name)) {
          return 'rgba(255,255,255,0.2)';
        }

        return 'rgba(255,255,255,0.08)';
      })
      .attr('stroke-width', d => {
        const name = d.target.data.name || '';
        const parentName = d.source.data.name || '';
        return (firedBranches.has(name) || firedBranches.has(parentName)) ? 3 : 1.5;
      });

    const nodeW = 135;
    const nodeH = 50;

    const node = g.selectAll('.btNode')
      .data(root.descendants())
      .enter().append('g')
      .attr('class', 'btNode')
      .attr('transform', d => `translate(${d.x},${d.y})`);

    node.append('rect')
      .attr('width', nodeW).attr('height', nodeH)
      .attr('x', -nodeW / 2).attr('y', -nodeH / 2)
      .attr('rx', 12)
      .attr('fill', d => {
        const name = d.data.name || '';
        const parentName = d.parent ? d.parent.data.name : '';
        const isFired = firedBranches.has(name) || firedBranches.has(parentName);

        if (isFired) {
          if (name.includes('DANGER') || parentName.includes('DANGER')) return 'rgba(255,113,108,0.2)';
          if (name.includes('FATIGUE') || parentName.includes('FATIGUE')) return 'rgba(253,211,77,0.2)';
          if (name.includes('PREREQ') || parentName.includes('PREREQ')) return 'rgba(255,143,111,0.2)';
          if (name.includes('MISCONCEPTION') || parentName.includes('MISCONCEPTION')) return 'rgba(255,143,111,0.2)';
          if (name.includes('ADVANCE') || parentName.includes('ADVANCE')) return 'rgba(34,197,94,0.2)';
          if (name.includes('INTERLEAVING') || parentName.includes('INTERLEAVING')) return 'rgba(253,211,77,0.2)';
          if (name.includes('DEFAULT') || name.includes('CAT')) return 'rgba(255,255,255,0.15)';
        }
        return '#151515';
      })
      .attr('stroke', d => {
        if (d.data.type === 'selector') return '#ff8f6f';
        if (d.data.type === 'sequence') return '#22c55e';
        if (d.data.type === 'condition') return '#fdd34d';
        if (d.data.type === 'action') return '#ff8f6f';
        return 'rgba(255,255,255,0.12)';
      })
      .attr('stroke-width', d => {
        const name = d.data.name || '';
        const isFired = firedBranches.has(name) || (d.parent && firedBranches.has(d.parent.data.name));
        return isFired ? 2.5 : 1;
      })
      .attr('filter', d => {
        const name = d.data.name || '';
        const isFired = firedBranches.has(name) || (d.parent && firedBranches.has(d.parent.data.name));
        return isFired ? 'url(#btGlow)' : 'none';
      });

    node.append('text')
      .attr('dy', d => d.data.description ? -4 : 4)
      .attr('text-anchor', 'middle')
      .text(d => d.data.name.length > 20 ? d.data.name.substring(0, 18) + '...' : d.data.name)
      .attr('font-size', '10px')
      .attr('fill', 'rgba(255,255,255,0.95)')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-weight', 700)
      .style('pointer-events', 'none');

    node.append('text')
      .attr('dy', 12)
      .attr('text-anchor', 'middle')
      .text(d => {
        const t = d.data.description || '';
        return t.length > 22 ? t.substring(0, 20) + '..' : t;
      })
      .attr('font-size', '8px')
      .attr('fill', 'rgba(255,255,255,0.5)')
      .attr('font-family', 'ui-monospace, monospace')
      .style('pointer-events', 'none');

  }, [treeStructure, btResult]);

  const updateOverride = (key, value) => {
    setOverrides(prev => ({ ...prev, [key]: value }));
  };

  const actionColor = {
    CONTRAST_CASE: 'text-error',
    PACE_REDUCTION: 'text-secondary',
    DRILL_PREREQUISITE: 'text-primary',
    WORKED_EXAMPLE: 'text-primary',
    ADVANCE_CONCEPT: 'text-green-400',
    INTERLEAVED_REVIEW: 'text-secondary',
    NEXT_CAT_ITEM: 'text-on-surface-variant',
  };

  const actionBg = {
    CONTRAST_CASE: 'bg-error/10 border-error/30',
    PACE_REDUCTION: 'bg-secondary/10 border-secondary/30',
    DRILL_PREREQUISITE: 'bg-primary/10 border-primary/30',
    WORKED_EXAMPLE: 'bg-primary/10 border-primary/30',
    ADVANCE_CONCEPT: 'bg-green-500/10 border-green-500/30',
    INTERLEAVED_REVIEW: 'bg-secondary/10 border-secondary/30',
    NEXT_CAT_ITEM: 'bg-surface-container border-white/10',
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface">
      {}
      <nav className="w-full top-0 sticky bg-[#0e0e0e]/95 backdrop-blur-xl z-50 border-b border-white/5">
        <div className="flex justify-between items-center px-8 py-4 max-w-screen-2xl mx-auto">
          <Link to="/" className="text-2xl font-bold tracking-tighter text-primary font-headline">Episteme</Link>
          <div className="hidden md:flex gap-8 items-center font-headline text-sm font-medium tracking-wide">
            <Link to="/dashboard" className="text-stone-400 hover:text-stone-100 transition-colors">Dashboard</Link>
            <Link to="/fault-tree-demo" className="text-stone-400 hover:text-stone-100 transition-colors">Fault Tree</Link>
            <Link to="/knowledge-dag" className="text-stone-400 hover:text-stone-100 transition-colors">Knowledge DAG</Link>
            <span className="text-primary font-bold border-b-2 border-primary pb-1">Behavior Tree</span>
            <Link to="/session" className="text-stone-400 hover:text-stone-100 transition-colors">Live Session</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="flex items-center gap-2 bg-surface-container-lowest px-4 py-2 rounded-full border border-outline-variant/10 hover:border-primary/30 transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant text-sm">person</span>
              <span className="text-sm font-bold text-on-surface">Account</span>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-screen-2xl mx-auto px-8 py-10 flex-grow w-full">
        {}
        <header className="mb-8">
          <h1 className="text-4xl font-extrabold font-headline tracking-tight mb-2">Behavior Tree — Decision Architecture</h1>
          <p className="text-on-surface-variant text-lg max-w-2xl">
            Interactive visualization of the 7-branch remediation sequencer. Adjust the learner state vector to simulate different scenarios and see which branch fires.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-surface-container rounded-3xl p-6 border border-white/5">
              <h2 className="text-lg font-bold font-headline mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">tune</span>
                Learner State Vector
              </h2>

              <div className="space-y-4">
                {}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Calibration State</label>
                  <select
                    value={overrides.calibration_state}
                    onChange={e => updateOverride('calibration_state', e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-2.5 text-on-surface text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="well_calibrated">Well Calibrated</option>
                    <option value="overconfident">Overconfident ⚠</option>
                    <option value="underconfident">Underconfident</option>
                    <option value="poor_performer">Poor Performer</option>
                  </select>
                </div>

                {}
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Fatigue Score</label>
                    <span className="text-primary font-bold text-sm">{parseFloat(overrides.fatigue_score).toFixed(2)}</span>
                  </div>
                  <input type="range" min="0" max="1" step="0.05" value={overrides.fatigue_score}
                    onChange={e => updateOverride('fatigue_score', e.target.value)}
                    className="w-full accent-primary h-1.5 bg-on-surface/10 rounded-lg appearance-none"
                  />
                </div>

                {}
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Top Blame Weight</label>
                    <span className="text-primary font-bold text-sm">{parseFloat(overrides.top_priority_blame).toFixed(2)}</span>
                  </div>
                  <input type="range" min="0" max="1" step="0.05" value={overrides.top_priority_blame}
                    onChange={e => updateOverride('top_priority_blame', e.target.value)}
                    className="w-full accent-primary h-1.5 bg-on-surface/10 rounded-lg appearance-none"
                  />
                </div>

                {}
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Current Concept Mastery</label>
                    <span className="text-primary font-bold text-sm">{overrides.current_concept_mastery}%</span>
                  </div>
                  <input type="range" min="0" max="100" step="5" value={overrides.current_concept_mastery}
                    onChange={e => updateOverride('current_concept_mastery', e.target.value)}
                    className="w-full accent-primary h-1.5 bg-on-surface/10 rounded-lg appearance-none"
                  />
                </div>

                {}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">✓ Streak</label>
                    <input type="number" min="0" max="20" value={overrides.consecutive_correct_streak}
                      onChange={e => updateOverride('consecutive_correct_streak', e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-3 py-2 text-on-surface text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">✗ Streak</label>
                    <input type="number" min="0" max="20" value={overrides.consecutive_wrong_streak}
                      onChange={e => updateOverride('consecutive_wrong_streak', e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-3 py-2 text-on-surface text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {}
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">θ Standard Error</label>
                    <span className="text-primary font-bold text-sm">{parseFloat(overrides.theta_se).toFixed(2)}</span>
                  </div>
                  <input type="range" min="0.05" max="2" step="0.05" value={overrides.theta_se}
                    onChange={e => updateOverride('theta_se', e.target.value)}
                    className="w-full accent-primary h-1.5 bg-on-surface/10 rounded-lg appearance-none"
                  />
                </div>

                {}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Items in Session</label>
                  <input type="number" min="0" max="100" value={overrides.items_in_session}
                    onChange={e => updateOverride('items_in_session', e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-3 py-2 text-on-surface text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                {}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Active Misconception ID</label>
                  <input type="text" placeholder="e.g. M11 (leave empty for none)"
                    value={overrides.active_misconception_id}
                    onChange={e => updateOverride('active_misconception_id', e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-3 py-2 text-on-surface text-sm focus:outline-none focus:border-primary placeholder:text-stone-600"
                  />
                </div>
              </div>

              <button onClick={runTick} disabled={simulating}
                className="w-full mt-6 bg-primary hover:bg-primary-container text-on-primary font-bold py-3.5 rounded-xl disabled:opacity-50 transition-all text-sm shadow-[0_4px_14px_rgba(255,143,111,0.2)]"
              >
                {simulating ? 'Evaluating...' : '▶ Run BT Tick'}
              </button>
            </div>

            {}
            <AnimatePresence>
              {btResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`rounded-3xl p-6 border ${actionBg[btResult.action?.type] || 'bg-surface-container border-white/5'}`}
                >
                  <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-2">Decision Output</h3>
                  <div className={`text-2xl font-extrabold font-headline mb-2 ${actionColor[btResult.action?.type] || ''}`}>
                    {btResult.action?.type?.replace(/_/g, ' ')}
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-4">{btResult.action?.reason}</p>

                  <details className="group">
                    <summary className="text-xs font-bold uppercase tracking-widest text-on-surface-variant cursor-pointer flex items-center gap-2">
                      Branch Evaluation Trace
                      <span className="material-symbols-outlined text-sm transition-transform group-open:rotate-180">expand_more</span>
                    </summary>
                    <div className="mt-3 space-y-1.5 font-mono text-xs">
                      {btResult.action?.trace?.map((t, i) => (
                        <div key={i} className={`flex items-center gap-2 ${t.fired ? 'text-primary' : 'text-stone-600'}`}>
                          <span>{t.fired ? '●' : '○'}</span>
                          <span>{t.branch}</span>
                          <span className={t.fired ? 'text-green-400' : 'text-stone-700'}>{t.fired ? '→ FIRED' : '→ skipped'}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {}
          <div className="lg:col-span-8">
            <div className="bg-surface-container rounded-3xl overflow-hidden border border-white/5">
              <div className="p-6 pb-2 flex justify-between items-center">
                <div>
                  <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-1 block">Interactive Visualization</span>
                  <h2 className="text-xl font-bold font-headline">Decision Tree — 7 Branches</h2>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${btResult ? 'bg-green-500/20 text-green-400' : 'bg-primary/10 text-primary animate-pulse'}`}>
                  {btResult ? 'EVALUATED' : 'WAITING'}
                </span>
              </div>
              <div className="px-4 pb-4">
                {loading ? (
                  <div className="h-[560px] bg-surface-container-low rounded-2xl animate-pulse" />
                ) : (
                  <svg ref={svgRef} viewBox="0 0 1100 560" preserveAspectRatio="xMidYMid meet" className="w-full" style={{ height: '560px' }} />
                )}
              </div>
              {}
              <div className="px-6 pb-6 flex flex-wrap gap-4">
                {[
                  { color: '#ff8f6f', label: 'Selector / Action' },
                  { color: '#22c55e', label: 'Sequence' },
                  { color: '#fdd34d', label: 'Condition' },
                  { color: '#ff716c', label: 'Fired (Danger)' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <div className="w-3 h-3 rounded-full" style={{ background: l.color }} />
                    {l.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

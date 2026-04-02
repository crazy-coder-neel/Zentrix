import React from 'react'
import { Link } from 'react-router'
import BehaviorTreeVisuals from '../components/BehaviorTreeVisuals'
import DashboardDAG from '../components/DashboardDAG'

export default function DashboardPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* TopAppBar */}
      <nav className="w-full top-0 sticky bg-[#0e0e0e]/95 backdrop-blur-xl z-50 border-b border-white/5">
        <div className="flex justify-between items-center px-8 py-4 max-w-screen-2xl mx-auto">
          <Link to="/" className="text-2xl font-bold tracking-tighter text-primary font-headline">Episteme</Link>
          <div className="hidden md:flex gap-8 items-center font-headline text-sm font-medium tracking-wide">
            <a className="text-primary font-bold border-b-2 border-primary pb-1" href="#dag">Knowledge DAG</a>
            <a className="text-stone-400 hover:text-stone-100 transition-colors" href="#behavior-tree">Behavior Tree</a>
            <a className="text-stone-400 hover:text-stone-100 transition-colors" href="#session">Live Session</a>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center bg-surface-container-lowest px-4 py-2 rounded-full border border-outline-variant/10">
              <span className="material-symbols-outlined text-on-surface-variant text-sm mr-2">search</span>
              <input className="bg-transparent border-none focus:ring-0 focus:outline-none text-sm text-on-surface placeholder:text-stone-600 w-48" placeholder="Search concepts..." type="text" />
            </div>
            <button className="bg-primary text-on-primary font-bold px-5 py-2 rounded-full hover:scale-95 transition-all duration-200 text-sm">
              Profile
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-screen-2xl mx-auto px-8 py-10 flex-grow w-full">
        {/* Header */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight font-headline mb-2">Welcome back, Curator.</h1>
            <p className="text-on-surface-variant text-lg">Your cognitive resonance is at <span className="text-secondary font-bold">88.4%</span> capacity today.</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-surface-container-low p-1 rounded-full flex gap-1">
              <button className="bg-surface-container-highest text-on-surface px-6 py-2 rounded-full text-sm font-medium shadow-xl">Overview</button>
              <button className="text-on-surface-variant px-6 py-2 rounded-full text-sm font-medium hover:text-on-surface transition-colors">Deep Dive</button>
            </div>
          </div>
        </header>

        {/* ═══ BENTO GRID ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

          {/* ─── Knowledge DAG (Interactive D3) ─── */}
          <section className="md:col-span-8 bg-surface-container rounded-3xl overflow-hidden relative flex flex-col" id="dag">
            <div className="p-8 pb-4 flex justify-between items-center relative z-10">
              <div>
                <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-1 block">Graph Visualizer</span>
                <h2 className="text-2xl font-bold font-headline">Knowledge DAG</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Drag nodes to explore</span>
                <button className="bg-surface-variant/50 hover:bg-surface-variant p-2 rounded-xl transition-all">
                  <span className="material-symbols-outlined text-sm">fullscreen</span>
                </button>
              </div>
            </div>
            <div className="px-8 pb-2">
              <DashboardDAG />
            </div>
            <div className="p-8 pt-4 grid grid-cols-3 gap-4 relative z-10">
              <div className="bg-surface-container-low p-4 rounded-2xl">
                <div className="text-on-surface-variant text-xs mb-1">Total Nodes</div>
                <div className="text-xl font-bold">15–20</div>
              </div>
              <div className="bg-surface-container-low p-4 rounded-2xl">
                <div className="text-on-surface-variant text-xs mb-1">Weak Links</div>
                <div className="text-xl font-bold text-error">3</div>
              </div>
              <div className="bg-surface-container-low p-4 rounded-2xl">
                <div className="text-on-surface-variant text-xs mb-1">Graph Density</div>
                <div className="text-xl font-bold text-secondary">0.76</div>
              </div>
            </div>
          </section>

          {/* ─── Mastery Archetypes ─── */}
          <section className="md:col-span-4 grid grid-cols-1 gap-6">
            <div className="bg-tertiary text-on-tertiary-fixed rounded-3xl p-8 flex flex-col justify-between min-h-[240px] shadow-2xl transition-transform hover:-translate-y-1">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="material-symbols-outlined text-3xl p-3 bg-on-tertiary-fixed/5 rounded-2xl">trending_up</span>
                  <span className="font-bold text-xl">82%</span>
                </div>
                <h3 className="text-2xl font-bold font-headline mb-2">Mastery Score</h3>
                <p className="text-sm opacity-80 leading-relaxed">Composite: 0.5 × test + 0.3 × practice + 0.2 × retention. Currently above the "Strong" threshold.</p>
              </div>
              <div className="h-1.5 w-full bg-on-tertiary-fixed/10 rounded-full mt-6">
                <div className="h-full w-[82%] bg-on-tertiary-fixed rounded-full transition-all duration-1000"></div>
              </div>
            </div>

            <div className="bg-secondary text-on-secondary-fixed rounded-3xl p-8 flex flex-col justify-between min-h-[240px] shadow-2xl transition-transform hover:-translate-y-1 glow-yellow">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="material-symbols-outlined text-3xl p-3 bg-on-secondary-fixed/5 rounded-2xl">speed</span>
                  <span className="font-bold text-xl">0.12</span>
                </div>
                <h3 className="text-2xl font-bold font-headline mb-2">Brier Score</h3>
                <p className="text-sm opacity-80 leading-relaxed">Confidence calibration is excellent. Student predicts own performance with high accuracy.</p>
              </div>
              <div className="h-1.5 w-full bg-on-secondary-fixed/10 rounded-full mt-6">
                <div className="h-full w-[88%] bg-on-secondary-fixed rounded-full transition-all duration-1000"></div>
              </div>
            </div>
          </section>

          {/* ─── Behavior Tree Visualization (Full-width interactive D3) ─── */}
          <section className="md:col-span-12 bg-surface-container rounded-3xl overflow-hidden" id="behavior-tree">
            <div className="p-8 pb-0 flex justify-between items-center">
              <div>
                <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-1 block">Remediation Engine</span>
                <h2 className="text-2xl font-bold font-headline">Behavior Tree — Decision Architecture</h2>
              </div>
              <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full animate-pulse">LIVE</span>
            </div>
            <BehaviorTreeVisuals />
          </section>

          {/* ─── Active Session (Code View) ─── */}
          <section className="md:col-span-7 bg-surface-container-low rounded-3xl overflow-hidden shadow-sm" id="session">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-surface-container">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-error animate-pulse"></div>
                <h2 className="text-lg font-bold font-headline">Active Diagnosis: Quadratic Factorization</h2>
              </div>
              <div className="text-on-surface-variant font-label text-xs tracking-widest">FAULT TREE TRACE</div>
            </div>
            <div className="font-mono text-sm leading-relaxed text-on-surface-variant">
              <div className="p-6 bg-surface-container-lowest">
                <div className="flex gap-4 mb-1"><span className="text-stone-600 select-none w-6">01</span><span><span className="text-primary">evaluate</span>(node):</span></div>
                <div className="flex gap-4 mb-1"><span className="text-stone-600 select-none w-6">02</span><span className="pl-4"><span className="text-secondary">if</span> node.type == <span className="text-tertiary">"LEAF"</span>:</span></div>
                <div className="flex gap-4 mb-1"><span className="text-stone-600 select-none w-6">03</span><span className="pl-8"><span className="text-primary">return</span> node.condition</span></div>
                <div className="flex gap-4 mb-1"><span className="text-stone-600 select-none w-6">04</span><span className="pl-4"><span className="text-secondary">if</span> node.type == <span className="text-tertiary">"AND"</span>:</span></div>
                <div className="flex gap-4 mb-1"><span className="text-stone-600 select-none w-6">05</span><span className="pl-8"><span className="text-primary">return</span> intersection(children)</span></div>
                <div className="flex gap-4 mb-1"><span className="text-stone-600 select-none w-6">06</span><span className="pl-4"><span className="text-secondary">if</span> node.type == <span className="text-tertiary">"OR"</span>:</span></div>
                <div className="flex gap-4"><span className="text-stone-600 select-none w-6">07</span><span className="pl-8"><span className="text-primary">return</span> <span className="text-error">minimal</span>(children) <span className="text-stone-500">← Root Cause</span></span></div>
              </div>
              <div className="p-5 bg-surface-container border-t border-white/5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-on-surface">
                    <span className="text-error font-bold">Root Cause Found:</span> Missing prerequisite — "Difference of Squares" mastery at 38%.
                  </p>
                  <button className="bg-primary text-on-primary px-5 py-2 rounded-xl text-xs font-bold hover:bg-primary-container transition-colors">
                    Run Remediation
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ─── Recent Trajectory ─── */}
          <section className="md:col-span-5 bg-surface-container rounded-3xl p-8 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-bold font-headline mb-6">Error History &amp; Trajectory</h2>
              <div className="space-y-5">
                {[
                  { icon: 'bolt', iconColor: 'text-primary', bg: 'bg-primary/15', title: 'Slip Detected', time: '2m ago', desc: 'Fast incorrect on Q12 — "Retry Hint" action triggered.' },
                  { icon: 'psychology', iconColor: 'text-secondary', bg: 'bg-secondary/15', title: 'Misconception Flagged', time: '15m ago', desc: 'Repeated sign error in factoring → Blame propagated to "Integer Properties".' },
                  { icon: 'verified', iconColor: 'text-green-400', bg: 'bg-green-500/15', title: 'Mastery Updated', time: '1h ago', desc: 'Quadratic Forms mastery rose from 72% → 82% after successful drill.' },
                  { icon: 'calendar_month', iconColor: 'text-tertiary', bg: 'bg-tertiary/15', title: 'Revision Scheduled', time: '1h ago', desc: '"Difference of Squares" queued for review in 3 days.' },
                ].map(item => (
                  <div key={item.title} className="flex items-start gap-4">
                    <div className={`${item.bg} p-2.5 rounded-xl`}>
                      <span className={`material-symbols-outlined ${item.iconColor}`} style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}>{item.icon}</span>
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="font-bold text-on-surface text-sm">{item.title}</span>
                        <span className="text-xs text-stone-500 shrink-0">{item.time}</span>
                      </div>
                      <p className="text-sm text-on-surface-variant leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button className="w-full mt-6 py-3.5 rounded-2xl border border-outline-variant/20 text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all font-medium text-sm">
              View Full Error History
            </button>
          </section>

        </div>

        {/* ═══ Featured Resource ═══ */}
        <section className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 relative h-[280px] rounded-3xl overflow-hidden group">
            <img className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDFa6l8kG6W4Np_nNChY5R4zexO21KnMakjRFPngzfRtMBgMA4mh4gbQO2UGRbIjgwc1gufuI1Byv_0d1PCv-p6iQQ7li0g3p6aVOuGGPd4B7YAqhMqiRsfTyRLn5ZqXoHTCaSr9ZOn8Pzv9ns-AXHg4HbVQXVUpAxLpEwPEy3__TO1R4Rm7CDFdW2VAbhl3T8vO8JDqVCVgZlHu6xs1tzDP_RDhZsKVuaMmFslW8BtrdsOtxURjFHrRyor6HzoIPb3AiWyKrirGbJR" alt="Neural network visualization" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent"></div>
            <div className="absolute bottom-0 left-0 p-8">
              <span className="bg-primary px-3 py-1 rounded-full text-[10px] font-black text-on-primary uppercase tracking-wider mb-3 inline-block">Explainability Engine</span>
              <h2 className="text-2xl font-bold font-headline mb-2 max-w-md">Full Decision Trace</h2>
              <p className="text-on-surface-variant max-w-sm text-sm">Every diagnosis produces a complete trace: Fault Tree path, blame propagation, mastery reasoning, and the Behavior Tree decision.</p>
            </div>
          </div>
          <div className="bg-primary text-on-primary rounded-3xl p-8 flex flex-col justify-center glow-orange">
            <span className="material-symbols-outlined text-4xl mb-4">science</span>
            <h3 className="text-2xl font-bold font-headline mb-3">MVP Scope</h3>
            <div className="space-y-2 text-on-primary/80 text-sm">
              <div className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">check_circle</span> 15–20 algebra concepts</div>
              <div className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">check_circle</span> 40–60 diagnostic questions</div>
              <div className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">check_circle</span> Fault tree per question</div>
              <div className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">check_circle</span> Full DAG + Behavior Tree</div>
            </div>
          </div>
        </section>
      </main>

      {/* FAB */}
      <button className="fixed bottom-8 right-8 bg-primary text-on-primary w-14 h-14 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(255,143,111,0.4)] hover:scale-110 transition-transform active:scale-95 group z-50">
        <span className="material-symbols-outlined text-2xl group-hover:rotate-90 transition-transform duration-300">add</span>
      </button>
    </div>
  )
}

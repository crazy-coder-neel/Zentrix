import React from 'react'
import { Link } from 'react-router'

export default function LandingPage() {
  return (
    <>
      {/* Navbar */}
      <nav className="w-full top-0 sticky bg-[#0e0e0e]/95 backdrop-blur-xl z-50 border-b border-white/5">
        <div className="flex justify-between items-center px-8 py-4 max-w-screen-2xl mx-auto">
          <div className="text-2xl font-bold tracking-tighter text-primary font-headline">Episteme</div>
          <div className="hidden md:flex items-center gap-8 font-headline text-sm font-medium tracking-wide">
            <a className="text-primary font-bold border-b-2 border-primary pb-1" href="#features">Features</a>
            <a className="text-stone-400 hover:text-stone-100 transition-colors" href="#how-it-works">How It Works</a>
            <a className="text-stone-400 hover:text-stone-100 transition-colors" href="#system">System</a>
            <a
              href="/dashboard"
              className="flex items-center gap-2 bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border border-violet-500/30 text-violet-300 hover:text-violet-100 hover:border-violet-400/60 hover:bg-violet-600/25 transition-all duration-200 px-4 py-1.5 rounded-full"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.8)] animate-pulse"></span>
              IntelliRev
            </a>
          </div>
        </div>
      </nav>

      <main>
        {/* ═══ HERO ═══ */}
        <section className="relative pt-24 pb-36 overflow-hidden">
          <div className="max-w-7xl mx-auto px-8 relative z-10">
            <div className="max-w-4xl">
              <span className="font-label text-xs uppercase tracking-[0.25em] text-primary font-bold mb-5 block">Deterministic Intelligence · No LLMs</span>
              <h1 className="font-headline text-6xl md:text-8xl font-extrabold tracking-tighter mb-8 leading-[0.9]">
                Diagnose.<br />
                Understand.<br />
                <span className="text-secondary">Master.</span>
              </h1>
              <p className="text-on-surface-variant text-xl max-w-xl mb-10 leading-relaxed">
                Episteme is a deterministic AI system that diagnoses <strong className="text-on-surface">why</strong> students make mistakes in algebra — not just whether they're wrong — using Fault Trees, Knowledge DAGs, and Behavior Trees.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/dashboard" className="bg-primary text-on-primary px-8 py-4 rounded-full font-headline font-bold text-lg hover:scale-95 duration-200 transition-all shadow-xl glow-orange inline-block">
                  Start Diagnosing
                </Link>
                <a href="#features" className="glass-card text-on-surface px-8 py-4 rounded-full font-headline font-bold text-lg hover:bg-white/10 transition-all">
                  Explore the Engine
                </a>
              </div>
            </div>
          </div>
          {/* Background image */}
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-30 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-l from-primary/20 to-transparent"></div>
            <img className="w-full h-full object-cover mix-blend-overlay" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC_4fFA_hfdcG6yFXCHYjvDXsmEOBdR0dxR5sKDah0wEgRrEs1PF3XgCpb-5bfSOGi2frSRODYpz9-lGxiYNiToOM9Y5AgsQhNMiADGXNdddB_uz7lHct7Yaq5zsF3klUMO2Lchy9TrFU3wtA8kj0dVnuhJyFB18Gcd7A5YG3VNbUR7V22eIoNp5vcKP3Q-3-TutX6YWs6LFUeElnXPUHvj8_Ld2iQqdGoFjHWFPNvxCfWOVKlElJDcntHSjFNTfLrhxPTkPLKpRmcY" alt="Abstract 3D flowing shapes" />
          </div>
        </section>

        {/* ═══ BENTO FEATURES (from PRD sections 6.1–6.8) ═══ */}
        <section className="py-24 bg-surface-container-low" id="features">
          <div className="max-w-7xl mx-auto px-8">
            <span className="font-label text-xs uppercase tracking-[0.25em] text-primary font-bold mb-3 block">Core Engine Components</span>
            <h2 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight mb-14">The Intelligence Stack</h2>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

              {/* Fault Tree Engine — Large orange card */}
              <div className="md:col-span-8 bg-primary rounded-3xl p-10 flex flex-col justify-between min-h-[420px] glow-orange relative overflow-hidden group">
                <div className="relative z-10">
                  <span className="material-symbols-outlined text-4xl text-on-primary mb-6" style={{ fontVariationSettings: "'FILL' 1" }}>account_tree</span>
                  <h3 className="font-headline text-4xl font-bold text-on-primary mb-4 leading-tight">Fault Tree Engine</h3>
                  <p className="text-on-primary/80 text-lg max-w-lg">Traverses AND/OR fault trees to evaluate conditions and return the <strong className="text-on-primary">Minimal Cut Set</strong> — the precise root causes of student errors. Each question carries its own diagnostic tree.</p>
                </div>
                <div className="mt-8 flex flex-wrap gap-3 relative z-10">
                  {['AND Gates', 'OR Gates', 'Leaf Conditions', 'Minimal Cut Set'].map(tag => (
                    <span key={tag} className="bg-on-primary/15 text-on-primary text-xs font-bold px-3 py-1.5 rounded-full">{tag}</span>
                  ))}
                </div>
                <div className="absolute right-0 bottom-0 w-1/2 h-full opacity-20 group-hover:scale-110 transition-transform duration-700">
                  <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAJ9dTwWpPNvM0L1wLJ1LEfTJZg3L0dXeole64jIjIX0HA4yz7lj6BNq4Mo26z6OL_5c19FF9bW8ns9wFNQqAKxLDwTOvQTIfaKia3DxgFrdZ223EdhyBNh_Jvjb2-A6JTlPVnXkEVJpKO_u8OSZ7z6noU00VM-8HV_oIrOiccRTWoA11lcd0aF1oE82aChvRgf7NEmOoh3ZUeKN9CGNYYTvRvvRgX80fRUkCtQVG9xS1Cg8TaX-bcZn3xtk0dMSjTd8niesjw83c6X" alt="Grid pattern" />
                </div>
              </div>

              {/* Error Classifier — Yellow card */}
              <div className="md:col-span-4 bg-secondary rounded-3xl p-10 flex flex-col justify-between glow-yellow group">
                <div>
                  <span className="material-symbols-outlined text-4xl text-on-secondary mb-6">psychology</span>
                  <h3 className="font-headline text-3xl font-bold text-on-secondary mb-4 leading-tight">Error Classifier</h3>
                  <p className="text-on-secondary/80 text-sm leading-relaxed">Classifies student errors into three categories using response time and pattern analysis — no ML required.</p>
                </div>
                <div className="mt-8 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-on-secondary/60 text-sm">bolt</span>
                    <span className="text-on-secondary text-sm font-semibold">Fast incorrect → <span className="text-on-secondary/70">Slip</span></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-on-secondary/60 text-sm">hourglass_top</span>
                    <span className="text-on-secondary text-sm font-semibold">Slow incorrect → <span className="text-on-secondary/70">Mistake</span></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-on-secondary/60 text-sm">replay</span>
                    <span className="text-on-secondary text-sm font-semibold">Repeated error → <span className="text-on-secondary/70">Misconception</span></span>
                  </div>
                </div>
              </div>

              {/* Knowledge DAG — Cream/Beige card */}
              <div className="md:col-span-5 bg-tertiary rounded-3xl p-10 flex flex-col min-h-[420px] shadow-2xl group">
                <span className="material-symbols-outlined text-4xl text-on-tertiary mb-6" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
                <h3 className="font-headline text-3xl font-bold text-on-tertiary mb-3">Knowledge DAG</h3>
                <p className="text-on-tertiary/70 text-base mb-6">A Directed Acyclic Graph of algebra concepts. Supports forward traversal for learning paths and reverse BFS for blame propagation.</p>
                <div className="mt-auto space-y-3">
                  {[
                    { color: 'bg-primary', concept: 'Factorization', mastery: '92%' },
                    { color: 'bg-secondary', concept: 'Quadratic Forms ← Prerequisites', mastery: '75%' },
                    { color: 'bg-error', concept: 'Mod p Arithmetic (Weak Link)', mastery: '40%' },
                  ].map(item => (
                    <div key={item.concept} className="flex items-center justify-between bg-surface/5 p-4 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${item.color}`}></div>
                        <span className="font-label text-sm text-on-tertiary font-medium">{item.concept}</span>
                      </div>
                      <span className="text-xs font-bold text-on-tertiary/60">{item.mastery}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Behavior Tree — Dark card with interactive preview */}
              <div className="md:col-span-7 bg-surface-container rounded-3xl p-10 flex flex-col justify-between relative overflow-hidden group">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-headline text-3xl font-bold text-on-surface mb-2">Behavior Tree Engine</h3>
                    <p className="text-on-surface-variant text-sm max-w-sm">Selector + Sequence nodes decide the next remediation action based on error type.</p>
                  </div>
                  <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1.5 rounded-full">INTERACTIVE</span>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {[
                    { icon: 'compare', name: 'Contrast Case', desc: 'Show correct vs incorrect pattern' },
                    { icon: 'school', name: 'Prerequisite Drill', desc: 'Strengthen foundational gaps' },
                    { icon: 'refresh', name: 'Retry Question', desc: 'Reattempt with hints' },
                    { icon: 'arrow_forward', name: 'Next Topic', desc: 'Advance if mastered' },
                  ].map(action => (
                    <div key={action.name} className="bg-surface-container-low p-4 rounded-2xl group/card hover:bg-surface-container-high transition-colors cursor-pointer">
                      <span className="material-symbols-outlined text-primary text-xl mb-2 block">{action.icon}</span>
                      <div className="text-on-surface text-sm font-bold mb-1">{action.name}</div>
                      <div className="text-on-surface-variant text-xs">{action.desc}</div>
                    </div>
                  ))}
                </div>
                <Link to="/dashboard" className="mt-6 inline-flex items-center gap-2 text-primary font-bold text-sm hover:gap-3 transition-all">
                  View Live Tree <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ HOW IT WORKS — User Flow from PRD §7 ═══ */}
        <section className="py-24" id="how-it-works">
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center mb-16">
              <span className="font-label text-xs uppercase tracking-[0.25em] text-secondary font-bold mb-3 block">Diagnostic Pipeline</span>
              <h2 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight mb-4">How Episteme Works</h2>
              <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">A 10-step deterministic pipeline — from student answer to targeted remediation — all without a single LLM call.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { step: '01', icon: 'edit', title: 'Answer', desc: 'Student submits answer' },
                { step: '02', icon: 'psychology', title: 'Classify', desc: 'Slip, Mistake, or Misconception' },
                { step: '03', icon: 'account_tree', title: 'Fault Tree', desc: 'Identify root cause' },
                { step: '04', icon: 'hub', title: 'DAG Blame', desc: 'Propagate through concept graph' },
                { step: '05', icon: 'auto_fix_high', title: 'Remediate', desc: 'Behavior Tree selects action' },
              ].map(item => (
                <div key={item.step} className="bg-surface-container rounded-2xl p-6 hover:bg-surface-container-high transition-all group cursor-default">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-primary font-headline font-black text-2xl">{item.step}</span>
                    <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                  </div>
                  <h4 className="font-headline text-lg font-bold text-on-surface mb-1">{item.title}</h4>
                  <p className="text-on-surface-variant text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ SYSTEM COMPONENTS — More from PRD ═══ */}
        <section className="py-24 bg-surface-container-low" id="system">
          <div className="max-w-7xl mx-auto px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Mastery Model */}
              <div className="bg-surface-container rounded-3xl p-8">
                <span className="material-symbols-outlined text-3xl text-secondary mb-4 block" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
                <h3 className="font-headline text-xl font-bold mb-3">Mastery Model</h3>
                <p className="text-on-surface-variant text-sm mb-6">Composite score from test accuracy, practice accuracy, and retention.</p>
                <div className="bg-surface-container-lowest rounded-2xl p-4 font-mono text-sm text-on-surface-variant">
                  <span className="text-secondary">mastery</span> = 0.5 × test + 0.3 × practice + 0.2 × retention
                </div>
                <div className="mt-4 flex gap-2">
                  <span className="text-xs font-bold bg-error/15 text-error px-2.5 py-1 rounded-full">&lt;60 Weak</span>
                  <span className="text-xs font-bold bg-secondary/15 text-secondary px-2.5 py-1 rounded-full">60–80 Improving</span>
                  <span className="text-xs font-bold bg-green-500/15 text-green-400 px-2.5 py-1 rounded-full">&gt;80 Strong</span>
                </div>
              </div>

              {/* IRT / Ability Estimation */}
              <div className="bg-surface-container rounded-3xl p-8">
                <span className="material-symbols-outlined text-3xl text-primary mb-4 block" style={{ fontVariationSettings: "'FILL' 1" }}>functions</span>
                <h3 className="font-headline text-xl font-bold mb-3">Ability Estimation (IRT)</h3>
                <p className="text-on-surface-variant text-sm mb-6">Uses the 3-Parameter Logistic model with Newton-Raphson updates to estimate student ability (θ).</p>
                <div className="bg-surface-container-lowest rounded-2xl p-4 font-mono text-xs text-on-surface-variant leading-relaxed">
                  P(θ) = c + (1−c) / (1 + e<sup>−a(θ−b)</sup>)
                </div>
              </div>

              {/* Confidence Calibration */}
              <div className="bg-surface-container rounded-3xl p-8">
                <span className="material-symbols-outlined text-3xl text-tertiary mb-4 block" style={{ fontVariationSettings: "'FILL' 1" }}>speed</span>
                <h3 className="font-headline text-xl font-bold mb-3">Confidence Calibration</h3>
                <p className="text-on-surface-variant text-sm mb-6">Tracks the gap between a student's confidence and their actual performance using the Brier Score.</p>
                <div className="bg-surface-container-lowest rounded-2xl p-4 font-mono text-sm text-on-surface-variant">
                  <span className="text-tertiary">BS</span> = (confidence − outcome)<sup>2</sup>
                </div>
                <p className="text-on-surface-variant text-xs mt-3">Rolling average over last 20 responses.</p>
              </div>
            </div>

            {/* Revision Scheduler */}
            <div className="mt-6 bg-surface-container rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <span className="material-symbols-outlined text-3xl text-primary mb-4 block" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
                <h3 className="font-headline text-xl font-bold mb-2">Spaced Revision Scheduler</h3>
                <p className="text-on-surface-variant text-sm max-w-md">Priority queue-based scheduling at optimal intervals to maximize long-term retention.</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {['1 day', '3 days', '7 days', '14 days', '30 days'].map((interval, i) => (
                  <div key={interval} className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                      {interval.split(' ')[0]}
                    </div>
                    <span className="text-[10px] text-on-surface-variant mt-1">{interval.split(' ')[1]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ CTA ═══ */}
        <section className="py-32 relative">
          <div className="max-w-5xl mx-auto px-8 text-center">
            <h2 className="font-headline text-5xl md:text-7xl font-black mb-8 tracking-tighter">Ready to diagnose<br />root causes?</h2>
            <p className="text-on-surface-variant text-xl mb-12 max-w-2xl mx-auto">A deterministic AI system that diagnoses why students make mistakes in algebra and fixes the root cause using structured reasoning.</p>
            <div className="inline-flex items-center gap-4 bg-surface-container-high p-2 pl-6 rounded-full">
              <span className="text-on-surface font-medium text-sm">No LLMs. No hallucinations. Pure logic.</span>
              <Link to="/dashboard" className="bg-primary text-on-primary px-8 py-3 rounded-full font-headline font-bold hover:bg-primary-container transition-all">
                Launch Dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer className="w-full border-t border-white/5 pt-12 pb-8 bg-[#0e0e0e]">
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <div className="text-lg font-black text-on-surface font-headline">Episteme</div>
            <p className="text-stone-500 max-w-sm font-body text-sm leading-relaxed">
              Algebra Misconception Root-Cause Engine. Deterministic diagnosis without LLMs.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-xs uppercase tracking-widest text-stone-500 font-bold">Engine</h4>
              <nav className="flex flex-col gap-2">
                <span className="text-sm text-stone-500">Fault Trees</span>
                <span className="text-sm text-stone-500">Knowledge DAG</span>
                <span className="text-sm text-stone-500">Behavior Trees</span>
              </nav>
            </div>
            <div className="space-y-4">
              <h4 className="text-xs uppercase tracking-widest text-stone-500 font-bold">Models</h4>
              <nav className="flex flex-col gap-2">
                <span className="text-sm text-stone-500">Mastery Scoring</span>
                <span className="text-sm text-stone-500">IRT 3PL</span>
                <span className="text-sm text-stone-500">Brier Score</span>
              </nav>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-8 mt-12 pt-6 border-t border-white/5 flex justify-between items-center">
          <span className="text-xs uppercase tracking-widest text-stone-500">© 2025 Episteme Engine</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            <span className="text-[10px] uppercase tracking-widest text-stone-500">Deterministic · &lt;200ms latency</span>
          </div>
        </div>
      </footer>
    </>
  )
}

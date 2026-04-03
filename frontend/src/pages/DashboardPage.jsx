import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import BehaviorTreeVisuals from '../components/BehaviorTreeVisuals'
import DashboardDAG from '../components/DashboardDAG'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  const [uploadTab, setUploadTab] = useState('text') 
  const [text, setText] = useState('')
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [file, setFile] = useState(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef()

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && f.name.endsWith('.pdf')) { setFile(f); setFileName(f.name) }
  }

  const handleSubmit = async () => {
    if (!user) { setUploadError('Please login to upload.'); return }
    if (uploadTab === 'text' && text.trim().length < 50) { setUploadError('Enter at least 50 characters.'); return }
    if ((uploadTab === 'pdf' || uploadTab === 'book') && !file) { setUploadError('Select a PDF.'); return }

    setUploadLoading(true)
    setUploadError('')

    try {
      const formData = new FormData()
      formData.append('user_id', user.id)
      let endpoint = `${API}/intellirev/upload`

      if (uploadTab === 'text') {
        formData.append('text', text)
      } else if (uploadTab === 'book') {
        formData.append('file', file)
        endpoint = `${API}/intellirev/upload-book`
      } else {
        formData.append('file', file)
      }

      const res = await fetch(endpoint, { method: 'POST', body: formData })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)

      const data = await res.json()
      sessionStorage.setItem('intellirev_plan', JSON.stringify(data))
      navigate('/intellirev/plan')
    } catch (e) {
      setUploadError(e.message || 'Failed. Check backend.')
    } finally {
      setUploadLoading(false)
    }
  }

  const [masteryData, setMasteryData] = useState(null);
  const [irtData, setIrtData] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        Promise.all([
          fetch(`${API}/api/mastery/${user.id}`).then(r => r.json()),
          fetch(`${API}/api/irt/student/${user.id}`).then(r => r.json())
        ]).then(([mastery, irt]) => {
          setMasteryData(mastery);
          setIrtData(irt);
        }).catch(console.error);
      } else {
        navigate('/login');
      }
    });
  }, [navigate]);

  const numConcepts = masteryData ? Object.keys(masteryData.mastery || {}).length : 0;
  const avgMastery = numConcepts > 0 
    ? Object.values(masteryData.mastery).reduce((a, b) => a + b, 0) / numConcepts 
    : 0.0;
  const masteryPercentage = (avgMastery * 100).toFixed(1);

  const brierScore = irtData ? irtData.rolling_brier_score.toFixed(3) : 0.12;
  const calibrationState = irtData ? irtData.calibration_state : "well_calibrated";

  const getCalibrationDesc = (state) => {
    switch(state) {
        case "well_calibrated": return "Confidence calibration is excellent. Student predicts own performance with high accuracy.";
        case "overconfident": return "Student exhibits high confidence despite frequent errors. Prone to mistakes rather than slips.";
        case "underconfident": return "Student lacks confidence despite high competence. Needs encouragement to reduce anxiety.";
        case "poor_performer": return "Student is struggling and correctly identifies their low performance.";
        default: return "Analyzing cognitive calibration metrics...";
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {}
      <nav className="w-full top-0 sticky bg-[#0e0e0e]/95 backdrop-blur-xl z-50 border-b border-white/5">
        <div className="flex justify-between items-center px-8 py-4 max-w-screen-2xl mx-auto">
          <Link to="/" className="text-2xl font-bold tracking-tighter text-primary font-headline">Episteme</Link>
          <div className="hidden md:flex gap-8 items-center font-headline text-sm font-medium tracking-wide">
            <a className="text-primary font-bold border-b-2 border-primary pb-1" href="#intellirev">IntelliRev</a>
            <a className="text-stone-400 hover:text-stone-100 transition-colors" href="#dag">Knowledge DAG</a>
            <a className="text-stone-400 hover:text-stone-100 transition-colors" href="#behavior-tree">Behavior Tree</a>
            <Link to="/fault-tree-demo" className="text-stone-400 hover:text-stone-100 transition-colors">Fault Tree</Link>
            <a className="text-stone-400 hover:text-stone-100 transition-colors" href="#session">Live Session</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/intellirev/profile" className="text-stone-400 hover:text-stone-100 text-sm font-medium transition-colors">View Profile</Link>
            <Link to="/" className="bg-primary text-on-primary font-bold px-5 py-2 rounded-full hover:scale-95 transition-all duration-200 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">dashboard</span> Dashboard
            </Link>
            <Link to="/login" title="Log out" className="flex justify-center items-center p-2 rounded-full hover:bg-surface-variant transition-colors text-on-surface-variant group">
              <span className="material-symbols-outlined text-[22px] group-hover:text-error transition-colors duration-300">logout</span>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-screen-2xl mx-auto px-8 py-10 flex-grow w-full">
        {}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight font-headline mb-2">Welcome back, Curator.</h1>
            <p className="text-on-surface-variant text-lg">Your cognitive resonance is at <span className="text-secondary font-bold">88.4%</span> capacity today.</p>
          </div>
        </header>

        {}
        <section className="mb-10" id="intellirev">
          <div className="bg-gradient-to-br from-primary/10 to-secondary/5 border border-primary/20 rounded-3xl p-8 shadow-2xl shadow-primary/5">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-3xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              <div className="flex-1 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold font-headline text-white">IntelliRev — Adaptive Learning</h2>
                  <p className="text-stone-400 text-sm">Upload a syllabus, paste topics, or upload an entire book to start learning.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {}
              <div className="bg-surface-container/80 border border-white/5 rounded-2xl p-6">
                {}
                <div className="flex bg-black/40 p-1 rounded-xl mb-5 w-fit">
                  {[{ key: 'text', label: 'Paste Text' }, { key: 'pdf', label: 'Syllabus PDF' }].map(t => (
                    <button key={t.key} onClick={() => setUploadTab(t.key)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${uploadTab === t.key ? 'bg-primary text-on-primary shadow-lg shadow-primary/30' : 'text-stone-500 hover:text-stone-300'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {uploadTab === 'text' ? (
                  <textarea value={text} onChange={e => setText(e.target.value)}
                    placeholder={"Paste your syllabus, topics list, or chapter content here...\n\nExample:\nChapter 1: Neural Networks\nChapter 2: Convolutional Networks (CNN)"}
                    rows={6}
                    className="w-full bg-black/50 border border-white/5 rounded-xl p-4 text-white placeholder-stone-600 text-sm resize-none focus:outline-none focus:border-primary/50 transition-colors leading-relaxed"
                  />
                ) : (
                  <div
                    onDragOver={e => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-10 cursor-pointer transition-all text-center ${dragging ? 'border-primary bg-primary/10' : fileName ? 'border-green-500/50 bg-green-500/5' : 'border-white/10 hover:border-primary/40 hover:bg-primary/5'}`}
                  >
                    <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setFileName(f.name) } }} />
                    <span className="material-symbols-outlined text-3xl text-primary mb-2 block">{uploadTab === 'book' ? 'menu_book' : 'upload_file'}</span>
                    {fileName ? (
                      <div>
                        <p className="text-green-400 font-bold text-sm">{fileName}</p>
                        <p className="text-stone-500 text-xs mt-1">Click to change</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-white font-bold text-sm">{uploadTab === 'book' ? 'Drop your book PDF here' : 'Drop syllabus PDF here'}</p>
                        <p className="text-stone-500 text-xs mt-1">{uploadTab === 'book' ? 'Full textbook — chapters → topics → notes' : 'Syllabus or notes PDF'}</p>
                      </div>
                    )}
                  </div>
                )}

                {uploadError && (
                  <div className="mt-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2 rounded-lg">{uploadError}</div>
                )}

                <button onClick={handleSubmit} disabled={uploadLoading}
                  className="w-full mt-4 bg-primary hover:bg-primary-dim text-on-primary font-bold py-3 rounded-xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3 shadow-xl shadow-primary/20 text-sm">
                  {uploadLoading ? (
                    <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Processing...</>
                  ) : (
                    <><span className="material-symbols-outlined text-sm">auto_awesome</span>{uploadTab === 'book' ? 'Analyze Book & Generate Plan' : 'Generate Study Plan'}</>
                  )}
                </button>
              </div>

              {}
              <div className="space-y-4 flex flex-col justify-between">
                <div className="bg-surface-container/80 border border-white/5 rounded-2xl p-6 flex-1 flex flex-col justify-center relative overflow-hidden group">
                  <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform">
                     <span className="material-symbols-outlined text-[150px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                  </div>
                  <h3 className="font-headline text-2xl font-bold text-white mb-2 relative z-10">Your Learning Profile</h3>
                  <p className="text-stone-400 text-sm mb-6 relative z-10 max-w-sm">Track your daily streak, view your mastery DAG, and revise your weakest subjects.</p>
                  <Link to="/intellirev/profile" className="w-fit bg-secondary text-on-secondary font-bold px-6 py-2.5 rounded-full shadow-lg shadow-secondary/20 hover:scale-95 transition-transform flex items-center gap-2 relative z-10 text-sm">
                    Open Dashboard Profile →
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 text-center">
                    <div className="text-xl font-black text-primary">0</div>
                    <div className="text-[10px] text-stone-500 uppercase tracking-wider">LLMs Used</div>
                  </div>
                  <div className="bg-secondary/10 border border-secondary/20 rounded-xl px-4 py-3 text-center">
                    <div className="text-xl font-black text-secondary">NLP</div>
                    <div className="text-[10px] text-stone-500 uppercase tracking-wider">Engine</div>
                  </div>
                  <div className="bg-primary/5 border border-primary/10 rounded-xl px-4 py-3 text-center">
                    <div className="text-xl font-black text-primary">∞</div>
                    <div className="text-[10px] text-stone-500 uppercase tracking-wider">Revisions</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {}
          <section className="md:col-span-8 bg-surface-container rounded-3xl overflow-hidden relative flex flex-col" id="dag">
            <div className="p-8 pb-4 flex justify-between items-center relative z-10">
              <div>
                <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-1 block">Graph Visualizer</span>
                <h2 className="text-2xl font-bold font-headline">Knowledge DAG</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Drag nodes to explore</span>
                <Link to="/knowledge-dag" className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-xl transition-all text-xs font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  Explore
                </Link>
              </div>
            </div>
            <div className="px-8 pb-2"><DashboardDAG /></div>
            <div className="p-8 pt-4 grid grid-cols-3 gap-4 relative z-10">
              {[{ label: 'Total Nodes', value: '15–20' }, { label: 'Weak Links', value: '3', color: 'text-error' }, { label: 'Graph Density', value: '0.76', color: 'text-secondary' }].map(s => (
                <div key={s.label} className="bg-surface-container-low p-4 rounded-2xl">
                  <div className="text-on-surface-variant text-xs mb-1">{s.label}</div>
                  <div className={`text-xl font-bold ${s.color || ''}`}>{s.value}</div>
                </div>
              ))}
            </div>
          </section>

          {}
          <section className="md:col-span-4 grid grid-cols-1 gap-6">
            <div className="bg-tertiary text-on-tertiary-fixed rounded-3xl p-8 flex flex-col justify-between min-h-[240px] shadow-2xl transition-transform hover:-translate-y-1">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="material-symbols-outlined text-3xl p-3 bg-on-tertiary-fixed/5 rounded-2xl">trending_up</span>
                  <span className="font-bold text-xl">{masteryPercentage}%</span>
                </div>
                <h3 className="text-2xl font-bold font-headline mb-2">Mastery Score</h3>
                <p className="text-sm opacity-80 leading-relaxed">Composite: Bayesian Knowledge Tracing average across {numConcepts} tracked concepts.</p>
                <p className="text-sm opacity-80 leading-relaxed">0.5 × test + 0.3 × practice + 0.2 × retention.</p>
              </div>
              <div className="h-1.5 w-full bg-on-tertiary-fixed/10 rounded-full mt-6">
                <div className="h-full bg-on-tertiary-fixed rounded-full transition-all duration-1000" style={{width: `${masteryPercentage}%`}}></div>
              </div>
            </div>

            <div className={`text-on-secondary-fixed rounded-3xl p-8 flex flex-col justify-between min-h-[240px] shadow-2xl transition-transform hover:-translate-y-1 glow-yellow ${calibrationState === 'overconfident' ? 'bg-error text-on-error' : 'bg-secondary'}`}>
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="material-symbols-outlined text-3xl p-3 bg-on-secondary-fixed/5 rounded-2xl">speed</span>
                  <span className="font-bold text-xl">{brierScore}</span>
                </div>
                <h3 className="text-2xl font-bold font-headline mb-2">Brier Score</h3>
                <p className="text-sm opacity-80 leading-relaxed">{getCalibrationDesc(calibrationState)}</p>
                <div className="mt-2 inline-block px-3 py-1 bg-background/20 rounded-full text-xs font-bold uppercase tracking-wider">{calibrationState.replace('_', ' ')}</div>
              </div>
              <div className="h-1.5 w-full bg-on-secondary-fixed/10 rounded-full mt-6">
                <div className="h-full bg-on-secondary-fixed rounded-full transition-all duration-1000" style={{width: `${Math.max(10, 100 - (brierScore * 100))}%`}}></div>
              </div>
            </div>
          </section>

          {}
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

          {}
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
                  <p className="text-xs text-on-surface"><span className="text-error font-bold">Root Cause Found:</span> Missing prerequisite — "Difference of Squares" mastery at 38%.</p>
                  <button className="bg-primary text-on-primary px-5 py-2 rounded-xl text-xs font-bold hover:bg-primary-container transition-colors">Run Remediation</button>
                </div>
              </div>
            </div>
          </section>

          {}
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

        {}
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
          <div className="bg-primary text-on-primary rounded-3xl p-8 flex flex-col justify-between glow-orange">
            <div>
              <span className="material-symbols-outlined text-4xl mb-4">science</span>
              <h3 className="text-2xl font-bold font-headline mb-3">Engine Features</h3>
              <div className="space-y-2 text-on-primary/80 text-sm mb-6">
                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">check_circle</span> 18 concept knowledge graph</div>
                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">check_circle</span> 15 diagnostic questions</div>
                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">check_circle</span> Auto-generated fault trees</div>
                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">check_circle</span> Blame backpropagation DAG</div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Link to="/fault-tree-demo" className="bg-on-primary/10 hover:bg-on-primary/20 text-on-primary text-center py-2.5 rounded-xl text-sm font-bold transition-all">
                Try Fault Tree →
              </Link>
              <Link to="/knowledge-dag" className="bg-on-primary/10 hover:bg-on-primary/20 text-on-primary text-center py-2.5 rounded-xl text-sm font-bold transition-all">
                Explore DAG →
              </Link>
            </div>
          </div>
        </section>
      </main>

      {}
      <Link to="/quiz-generator" title="Start New Diagnostic" className="fixed bottom-8 right-8 bg-primary text-on-primary w-14 h-14 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(255,143,111,0.4)] hover:scale-110 transition-transform active:scale-95 group z-50">
        <span className="material-symbols-outlined text-2xl group-hover:rotate-90 transition-transform duration-300">add</span>
      </Link>
    </div>
  )
}

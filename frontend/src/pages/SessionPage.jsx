import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const API = 'http://localhost:8000';

export default function SessionPage() {
  const [question, setQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [confidence, setConfidence] = useState(50);
  const [startTime, setStartTime] = useState(Date.now());
  const [timerMs, setTimerMs] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNextQuestion();
  }, []);

  useEffect(() => {
    if (result) return;
    const interval = setInterval(() => setTimerMs(Date.now() - startTime), 100);
    return () => clearInterval(interval);
  }, [startTime, result]);

  const fetchNextQuestion = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/irt/next-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: 'default' }),
      });
      const data = await res.json();
      if (data.status === 'Success' && data.question) {
        setQuestion(data.question);
        resetState();
      } else {
        setQuestion(null);
      }
    } catch (err) {
      console.error('Failed to fetch question:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setSelectedAnswer(null);
    setConfidence(50);
    setStartTime(Date.now());
    setTimerMs(0);
    setResult(null);
  };

  const handleSubmit = async () => {
    if (!selectedAnswer || !question) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API}/api/session/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: 'default',
          question_id: question.id,
          answer_selected: selectedAnswer,
          time_taken_ms: timerMs,
          confidence: confidence,
          error_history: [],
          prior_error_patterns: [],
        }),
      });
      const data = await res.json();
      setResult(data);
      setSessionHistory(prev => [...prev, {
        question_id: question.id,
        is_correct: data.is_correct,
        error_type: data.error_type,
        bt_action: data.bt_action?.type,
        theta: data.irt_update?.theta_after,
      }]);
    } catch (err) {
      console.error('Session process failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    fetchNextQuestion();
  };

  const totalItems = sessionHistory.length;
  const correctItems = sessionHistory.filter(h => h.is_correct).length;
  const currentTheta = result?.irt_update?.theta_after ?? result?.calibration?.theta ?? 0;
  const currentBrier = result?.calibration?.rolling_brier_score ?? 0.25;
  const calibrationState = result?.calibration?.calibration_state ?? 'well_calibrated';

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
            <Link to="/behavior-tree" className="text-stone-400 hover:text-stone-100 transition-colors">Behavior Tree</Link>
            <span className="text-primary font-bold border-b-2 border-primary pb-1">Live Session</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="bg-surface-container-lowest px-4 py-2 rounded-full border border-outline-variant/10 text-sm font-bold text-on-surface hover:border-primary/30 transition-colors">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-screen-2xl mx-auto px-8 py-10 flex-grow w-full flex flex-col lg:flex-row gap-8">
        {}
        <div className="flex-grow max-w-3xl">
          {loading ? (
            <div className="h-96 bg-surface-container rounded-3xl animate-pulse" />
          ) : !question ? (
            <div className="bg-surface-container rounded-3xl p-12 text-center">
              <span className="material-symbols-outlined text-6xl text-secondary mb-4 block">celebration</span>
              <h2 className="text-3xl font-extrabold font-headline mb-3">Session Complete!</h2>
              <p className="text-on-surface-variant text-lg mb-6">You've answered all available questions. Great work!</p>
              <div className="flex gap-4 justify-center">
                <Link to="/dashboard" className="bg-primary text-on-primary px-6 py-3 rounded-xl font-bold hover:scale-105 transition-all">View Dashboard</Link>
              </div>
            </div>
          ) : (
            <div className="bg-surface-container rounded-3xl p-8 shadow-xl relative overflow-hidden">
              {}
              <div className="flex justify-between items-center mb-6">
                <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-full">
                  {question.id} — Concept {question.concept_id}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-on-surface-variant">Item #{totalItems + 1}</span>
                  <span className="font-mono text-sm text-secondary bg-secondary/10 px-3 py-1 rounded-full">
                    {(timerMs / 1000).toFixed(1)}s
                  </span>
                </div>
              </div>

              {}
              <h2 className="text-2xl md:text-3xl font-extrabold font-headline mb-8 tracking-tight">{question.stem}</h2>

              {}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {Object.entries(question.options).map(([key, option]) => {
                  let cls = 'border-outline-variant/30 hover:border-primary/50 bg-surface-container-low hover:bg-surface-container-highest cursor-pointer';
                  if (result) {
                    cls = 'border-outline-variant/10 opacity-50 cursor-not-allowed bg-surface-container-lowest';
                    if (key === result.correct_answer) cls = 'border-secondary/50 bg-secondary/10 text-secondary ring-1 ring-secondary pointer-events-none';
                    else if (key === selectedAnswer) cls = 'border-error/50 bg-error/10 text-error ring-1 ring-error pointer-events-none';
                  } else if (selectedAnswer === key) {
                    cls = 'border-primary bg-primary/10 ring-1 ring-primary';
                  }
                  return (
                    <button key={key} disabled={!!result} onClick={() => setSelectedAnswer(key)}
                      className={`p-5 rounded-2xl border-2 transition-all flex items-center gap-4 text-left ${cls}`}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold font-headline text-sm
                        ${(selectedAnswer === key && !result) ? 'bg-primary text-on-primary' :
                         (result && key === result.correct_answer) ? 'bg-secondary text-background' :
                         (result && key === selectedAnswer) ? 'bg-error text-background' :
                         'bg-surface-variant text-on-surface'}`}>{key}</div>
                      <span className="text-lg font-medium">{option.text}</span>
                    </button>
                  );
                })}
              </div>

              {}
              <AnimatePresence mode="wait">
                {!result ? (
                  <motion.div key="controls" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="bg-surface-container-low p-6 rounded-2xl border border-white/5"
                  >
                    <div className="mb-5">
                      <div className="flex justify-between items-end mb-2">
                        <label className="text-sm font-bold font-headline text-on-surface-variant">Confidence Level</label>
                        <span className="text-primary font-bold text-xl">{confidence}%</span>
                      </div>
                      <input type="range" min="0" max="100" step="10" value={confidence}
                        onChange={e => setConfidence(Number(e.target.value))}
                        className="w-full accent-primary h-2 bg-on-surface/10 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-stone-500 font-medium px-1 mt-2">
                        <span>Guessing</span><span>Unsure</span><span>Certain</span>
                      </div>
                    </div>
                    <button onClick={handleSubmit} disabled={!selectedAnswer || isSubmitting}
                      className="w-full bg-primary hover:bg-primary-container text-on-primary font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg shadow-[0_4px_14px_rgba(255,143,111,0.2)]"
                    >
                      {isSubmitting ? 'Processing...' : 'Submit Answer'}
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {}
                    <div className="bg-surface-container-lowest p-6 rounded-2xl border border-white/10">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-xl font-bold font-headline">Result</h3>
                        {result.is_correct ? (
                          <span className="bg-secondary/20 text-secondary border border-secondary/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Correct</span>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border
                            ${result.error_type === 'slip' ? 'bg-primary/20 text-primary border-primary/30' :
                              result.error_type === 'lapse' ? 'bg-tertiary/20 text-tertiary border-tertiary/30' :
                              'bg-error/20 text-error border-error/30'}`}>
                            {result.error_type}
                          </span>
                        )}
                      </div>

                      {}
                      {result.explanation?.summary && (
                        <p className="text-sm text-on-surface-variant leading-relaxed mb-4">{result.explanation.summary}</p>
                      )}

                      {}
                      {result.misconception_descriptions?.length > 0 && (
                        <div className="bg-error/5 border border-error/10 p-4 rounded-xl mb-4 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-error rounded-l-xl" />
                          <p className="font-bold text-error text-sm mb-2">Diagnosed Misconceptions:</p>
                          <ul className="space-y-2">
                            {result.misconception_descriptions.map(mc => (
                              <li key={mc.id} className="text-on-surface text-sm flex items-start gap-2">
                                <span className="bg-error/20 text-error px-2 py-0.5 rounded text-xs font-bold font-mono shrink-0 mt-0.5">{mc.id}</span>
                                <span>{mc.description}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {}
                      {result.bt_action && (
                        <div className="bg-surface-container p-4 rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-primary text-sm">account_tree</span>
                            <span className="text-sm font-bold text-on-surface">BT Decision: {result.bt_action.type?.replace(/_/g, ' ')}</span>
                          </div>
                          <p className="text-xs text-on-surface-variant">{result.bt_action.reason}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {result.bt_action.trace?.map((t, i) => (
                              <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${t.fired ? 'bg-primary/20 text-primary' : 'bg-surface-container-low text-stone-600'}`}>
                                {t.branch}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {}
                      {result.irt_update && (
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          <div className="bg-surface-container p-3 rounded-xl text-center">
                            <div className="text-xs text-on-surface-variant mb-1">θ Before</div>
                            <div className="text-lg font-bold">{result.irt_update.theta_before}</div>
                          </div>
                          <div className="bg-surface-container p-3 rounded-xl text-center">
                            <div className="text-xs text-on-surface-variant mb-1">θ After</div>
                            <div className="text-lg font-bold text-primary">{result.irt_update.theta_after}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {}
                    <details className="group bg-surface-container-low p-4 rounded-xl border border-white/5">
                      <summary className="font-bold text-sm text-on-surface hover:text-primary transition-colors flex justify-between items-center cursor-pointer outline-none">
                        Full Pipeline Decision Trace
                        <span className="material-symbols-outlined transition-transform group-open:rotate-180">expand_more</span>
                      </summary>
                      <div className="mt-4 font-mono text-xs text-stone-400 p-4 bg-background rounded-lg border border-white/5 space-y-1.5 max-h-64 overflow-y-auto">
                        <div className="text-primary"># Pipeline Result</div>
                        <div>error_type: <span className="text-secondary">{result.error_type}</span></div>
                        <div>minimal_cut_set: <span className="text-error">[{result.minimal_cut_set?.join(', ')}]</span></div>
                        <div>mastery: <span className="text-secondary">{result.mastery_update?.new_mastery}% ({result.mastery_update?.state})</span></div>
                        <div>theta: <span className="text-primary">{result.irt_update?.theta_before} → {result.irt_update?.theta_after}</span></div>
                        <div>calibration: <span className="text-secondary">{result.calibration?.calibration_state}</span></div>
                        <div>brier_score: <span className="text-tertiary">{result.calibration?.rolling_brier_score}</span></div>
                        <div>bt_action: <span className="text-error font-bold">{result.bt_action?.type}</span></div>
                        <div className="text-stone-600 mt-2"># Blame Propagation</div>
                        {result.blame_propagation?.map((b, i) => (
                          <div key={i}>  {b.concept_id}: blame={b.blame_weight} priority={b.priority_score}</div>
                        ))}
                      </div>
                    </details>

                    <button onClick={handleNext}
                      className="w-full bg-surface-variant hover:bg-white/10 text-on-surface font-bold py-3.5 rounded-xl transition-all"
                    >
                      Next Question →
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {}
        <div className="lg:w-80 shrink-0 space-y-6">
          {}
          <div className="bg-surface-container rounded-3xl p-6 border border-white/5">
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4">Session Stats</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-end mb-1">
                  <span className="text-xs text-on-surface-variant">Ability (θ)</span>
                  <span className="text-lg font-bold text-primary">{currentTheta.toFixed ? currentTheta.toFixed(3) : currentTheta}</span>
                </div>
                <div className="h-1.5 w-full bg-on-surface/10 rounded-full">
                  <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${Math.max(5, ((currentTheta + 4) / 8) * 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-end mb-1">
                  <span className="text-xs text-on-surface-variant">Brier Score</span>
                  <span className="text-lg font-bold text-secondary">{typeof currentBrier === 'number' ? currentBrier.toFixed(3) : currentBrier}</span>
                </div>
                <div className="h-1.5 w-full bg-on-surface/10 rounded-full">
                  <div className="h-full bg-secondary rounded-full transition-all duration-700" style={{ width: `${Math.max(5, (1 - currentBrier) * 100)}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-container-low p-3 rounded-xl text-center">
                  <div className="text-xs text-on-surface-variant mb-1">Progress</div>
                  <div className="text-xl font-bold">{totalItems}</div>
                </div>
                <div className="bg-surface-container-low p-3 rounded-xl text-center">
                  <div className="text-xs text-on-surface-variant mb-1">Accuracy</div>
                  <div className="text-xl font-bold text-secondary">{totalItems > 0 ? Math.round((correctItems / totalItems) * 100) : 0}%</div>
                </div>
              </div>
              <div className={`text-center py-2 rounded-xl text-xs font-bold uppercase tracking-wider
                ${calibrationState === 'well_calibrated' ? 'bg-green-500/10 text-green-400' :
                  calibrationState === 'overconfident' ? 'bg-error/10 text-error' :
                  calibrationState === 'underconfident' ? 'bg-secondary/10 text-secondary' :
                  'bg-surface-container-low text-on-surface-variant'}`}>
                {calibrationState.replace(/_/g, ' ')}
              </div>
            </div>
          </div>

          {}
          <div className="bg-surface-container rounded-3xl p-6 border border-white/5">
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4">History</h3>
            {sessionHistory.length === 0 ? (
              <p className="text-xs text-stone-600">No responses yet. Answer a question to begin.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {[...sessionHistory].reverse().map((h, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${h.is_correct ? 'bg-secondary/20 text-secondary' : 'bg-error/20 text-error'}`}>
                      {h.is_correct ? '✓' : '✗'}
                    </span>
                    <span className="text-on-surface font-medium flex-grow">{h.question_id}</span>
                    <span className="text-[10px] text-on-surface-variant font-mono">{h.bt_action?.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {}
          <div className="bg-primary/10 border border-primary/20 rounded-3xl p-6">
            <h3 className="text-sm font-bold text-primary mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link to="/fault-tree-demo" className="block text-sm text-on-surface-variant hover:text-primary transition-colors">→ View Fault Tree</Link>
              <Link to="/knowledge-dag" className="block text-sm text-on-surface-variant hover:text-primary transition-colors">→ Explore Knowledge DAG</Link>
              <Link to="/behavior-tree" className="block text-sm text-on-surface-variant hover:text-primary transition-colors">→ BT Simulator</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

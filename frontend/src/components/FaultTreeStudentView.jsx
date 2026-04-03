import React, { useState, useEffect } from 'react';

export default function FaultTreeStudentView({ question, onAdaptiveNext }) {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [confidence, setConfidence] = useState(50);
  const [timeTakenMs, setTimeTakenMs] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (result) return;
    const interval = setInterval(() => {
      setTimeTakenMs(Date.now() - startTime);
    }, 100);
    return () => clearInterval(interval);
  }, [startTime, result]);

  useEffect(() => {
    reset();
  }, [question.id]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('http://localhost:8000/api/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question_id: question.id,
          answer_selected: selectedAnswer,
          time_taken_ms: timeTakenMs,
          confidence: confidence,
          error_history: [], 
          prior_error_patterns: [] 
        }),
      });
      const data = await response.json();
      setResult({ ...data, statedConfidence: confidence });
    } catch (err) {
      console.error(err);
      alert("Failed to connect to backend");
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setSelectedAnswer(null);
    setConfidence(50);
    setStartTime(Date.now());
    setTimeTakenMs(0);
    setResult(null);
  };

  return (
    <div className="bg-surface-container w-full max-w-3xl rounded-3xl p-8 shadow-xl font-body relative overflow-hidden text-on-surface">
      <div className="flex justify-between items-center mb-6">
        <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-full">{question.id} — Concept {question.concept_id}</span>
        <span className="font-mono text-sm text-secondary bg-secondary/10 px-3 py-1 rounded-full animate-pulse">
            {(timeTakenMs / 1000).toFixed(1)}s
        </span>
      </div>

      <h2 className="text-3xl font-extrabold font-headline mb-8 tracking-tight">{question.stem}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {Object.entries(question.options).map(([key, option]) => {
          let stateClass = "border-outline-variant/30 hover:border-primary/50 bg-surface-container-low hover:bg-surface-container-highest cursor-pointer";

          if (result) {
            stateClass = "border-outline-variant/10 opacity-50 cursor-not-allowed bg-surface-container-lowest";
            if (key === question.correct_answer) {
              stateClass = "border-secondary/50 bg-secondary/10 text-secondary ring-1 ring-secondary pointer-events-none";
            } else if (key === selectedAnswer && key !== question.correct_answer) {
              stateClass = "border-error/50 bg-error/10 text-error ring-1 ring-error pointer-events-none";
            }
          } else if (selectedAnswer === key) {
            stateClass = "border-primary bg-primary/10 ring-1 ring-primary";
          }

          return (
            <button
              key={key}
              disabled={!!result}
              onClick={() => setSelectedAnswer(key)}
              className={`p-6 rounded-2xl border-2 transition-all flex items-center gap-4 text-left ${stateClass}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold font-headline text-sm
                ${(selectedAnswer === key && !result) ? 'bg-primary text-on-primary' : 
                 (result && key === question.correct_answer) ? 'bg-secondary text-background' :
                 (result && key === selectedAnswer) ? 'bg-error text-background' :
                 'bg-surface-variant text-on-surface'}`}>
                {key}
              </div>
              <span className="text-lg font-medium">{option.text}</span>
            </button>
          )
        })}
      </div>

      {}
      {!result ? (
        <div className="bg-surface-container-low p-6 rounded-2xl border border-white/5">
          <div className="mb-6 flex flex-col gap-2 relative">
             <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-bold font-headline text-on-surface-variant">Confidence Level</label>
                <span className="text-primary font-bold text-xl">{confidence}%</span>
             </div>
             <input 
                type="range" min="0" max="100" step="10" 
                value={confidence} 
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="w-full accent-primary h-2 bg-on-surface/10 rounded-lg appearance-none cursor-pointer"
             />
             <div className="flex justify-between text-xs text-stone-500 font-medium px-1 mt-2">
                <span>Guessing</span>
                <span>Unsure</span>
                <span>Certain</span>
             </div>
          </div>
          <button 
             onClick={handleSubmit}
             disabled={!selectedAnswer || isSubmitting}
             className="w-full bg-primary hover:bg-primary-container text-on-primary font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg shadow-[0_4px_14px_rgba(255,143,111,0.2)] hover:shadow-[0_6px_20px_rgba(255,143,111,0.3)] disabled:shadow-none"
          >
            {isSubmitting ? "Evaluating..." : "Submit Answer"}
          </button>
        </div>
      ) : (
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="flex justify-between items-start mb-4">
              <h3 className="text-2xl font-bold font-headline text-on-surface">Result</h3>
              {result.is_correct ? (
                <span className="bg-secondary/20 text-secondary border border-secondary/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Correct</span>
              ) : (
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border
                  ${result.error_type === 'slip' ? 'bg-primary/20 text-primary border-primary/30' : 
                    result.error_type === 'lapse' ? 'bg-tertiary/20 text-tertiary border-tertiary/30' : 
                    'bg-error/20 text-error border-error/30'}`}>
                  {result.error_type} Fault
                </span>
              )}
           </div>

           {!result.is_correct && (
              <div className="mb-6 space-y-4 text-sm text-on-surface-variant leading-relaxed">
                  <p>
                    You answered <strong className="text-on-surface">{selectedAnswer} ({question.options[selectedAnswer].text})</strong> with <strong className="text-on-surface">{result.statedConfidence}%</strong> confidence, but the correct answer is <strong className="text-secondary">{question.correct_answer} ({question.options[question.correct_answer].text})</strong>.
                  </p>

                  {result.misconception_descriptions && result.misconception_descriptions.length > 0 ? (
                      <div className="bg-error/5 border border-error/10 p-4 rounded-xl relative overflow-hidden group">
                           <div className="absolute top-0 left-0 w-1 h-full bg-error rounded-l-xl"></div>
                           <p className="font-bold text-error mb-2">Diagnosed Misconceptions:</p>
                           <ul className="space-y-2">
                               {result.misconception_descriptions.map(mc => (
                                   <li key={mc.id} className="text-on-surface flex items-start gap-2">
                                      <span className="bg-error/20 text-error px-2 py-0.5 rounded text-xs font-bold font-mono shrink-0 mt-0.5">{mc.id}</span>
                                      <span>{mc.description}</span>
                                   </li>
                               ))}
                           </ul>
                      </div>
                  ) : result.minimal_cut_set && result.minimal_cut_set.length > 0 && (
                      <div className="bg-error/5 border border-error/10 p-4 rounded-xl relative overflow-hidden group">
                           <div className="absolute top-0 left-0 w-1 h-full bg-error rounded-l-xl"></div>
                           <p className="font-bold text-error mb-1">Diagnosed Misconceptions:</p>
                           <ul className="list-disc list-inside space-y-1">
                               {result.minimal_cut_set.map(mc => (
                                   <li key={mc} className="text-on-surface">{mc} Detected</li>
                               ))}
                           </ul>
                      </div>
                  )}

                  <details className="group mt-4 bg-surface-container p-4 rounded-xl cursor-pointer">
                    <summary className="font-bold text-on-surface hover:text-primary transition-colors flex justify-between items-center outline-none">
                      Why this next action?
                      <span className="material-symbols-outlined transition-transform group-open:rotate-180">expand_more</span>
                    </summary>
                    <div className="mt-3 text-stone-400 font-mono text-xs p-3 bg-background rounded-lg border border-white/5 space-y-2">
                        <div className="text-primary font-bold"># Behavior Tree Evaluate</div>
                        {result.statedConfidence > 80 && result.error_type === "mistake" ? (
                            <>
                                <div className="text-stone-300">└─ condition: calibration == "overconfident" <span className="text-secondary">[TRUE]</span></div>
                                <div className="text-stone-300">└─ condition: misconception_id != null <span className="text-secondary">[TRUE]</span></div>
                                <div className="text-error font-bold mt-1">→ Action: DELIVER_CONTRAST_CASE</div>
                            </>
                        ) : result.error_type === "slip" ? (
                            <>
                                <div className="text-stone-300">└─ condition: error_type == "slip" <span className="text-secondary">[TRUE]</span></div>
                                <div className="text-tertiary font-bold mt-1">→ Action: DELIVER_PACE_REDUCTION</div>
                            </>
                        ) : (
                           <>
                                <div className="text-stone-300">└─ condition: misconception_id != null <span className="text-secondary">[TRUE]</span></div>
                                <div className="text-primary font-bold mt-1">→ Action: DRILL_PREREQUISITE</div>
                           </>
                        )}
                    </div>
                  </details>
              </div>
           )}

           <button onClick={() => { reset(); if (onAdaptiveNext) onAdaptiveNext(); }} className="mt-2 w-full bg-surface-variant hover:bg-white/10 text-on-surface font-bold py-3 rounded-xl transition-all">
             Next Question
           </button>
        </div>
      )}
    </div>
  );
}

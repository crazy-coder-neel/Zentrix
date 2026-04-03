import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import FaultTreeStudentView from '../components/FaultTreeStudentView';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function FaultTreePage() {
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/questions`)
      .then(res => res.json())
      .then(data => {
        setQuestions(data);
        if (data.length > 0) setCurrentQuestion(data[0]);
      })
      .catch(err => console.error("Failed to fetch questions:", err))
      .finally(() => setLoading(false));
  }, []);

  const fetchAdaptiveQuestion = async () => {

    try {
        const response = await fetch(`${API}/api/irt/next-question`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: 'default' })
        });
        const data = await response.json();
        if (data.status === 'success' && data.next_question) {
            setCurrentQuestion(data.next_question);
        } else {
            alert("Assessment Complete: " + data.message);
        }
    } catch (err) {
        console.error("Failed to fetch adaptive question:", err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {}
      <nav className="w-full top-0 sticky bg-[#0e0e0e]/95 backdrop-blur-xl z-50 border-b border-white/5">
        <div className="flex justify-between items-center px-8 py-4 max-w-screen-2xl mx-auto">
          <Link to="/" className="text-2xl font-bold tracking-tighter text-primary font-headline">Episteme</Link>
          <div className="hidden md:flex gap-8 items-center font-headline text-sm font-medium tracking-wide">
            <Link to="/dashboard" className="text-stone-400 hover:text-stone-100 transition-colors">Dashboard</Link>
            <span className="text-primary font-bold border-b-2 border-primary pb-1">Fault Tree Engine</span>
            <Link to="/knowledge-dag" className="text-stone-400 hover:text-stone-100 transition-colors">Knowledge DAG</Link>
            <Link to="/behavior-tree" className="text-stone-400 hover:text-stone-100 transition-colors">Behavior Tree</Link>
            <Link to="/session" className="text-stone-400 hover:text-stone-100 transition-colors">Live Session</Link>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center bg-surface-container-lowest px-4 py-2 rounded-full border border-outline-variant/10">
               <span className="material-symbols-outlined text-on-surface-variant text-sm mr-2">school</span>
               <span className="text-sm font-bold text-on-surface">Student View</span>
             </div>
          </div>
        </div>
      </nav>

      <main className="max-w-screen-2xl mx-auto px-8 py-12 flex-grow w-full flex flex-col md:flex-row gap-12 items-start justify-center">

        {}
        <div className="w-full md:w-1/3 space-y-6 shrink-0 mt-8">
            <div>
               <h1 className="text-4xl font-extrabold font-headline mb-4 tracking-tight">Fault Tree Diagnosis</h1>
               <p className="text-on-surface-variant leading-relaxed text-lg mb-6">
                 Select a dynamic question from our concept database to see the engine adapt its diagnosis.
               </p>

               {loading ? (
                  <p className="text-stone-400">Loading question bank...</p>
               ) : (
                  <div className="flex flex-col gap-3">
                     <h3 className="font-bold text-on-surface font-label uppercase tracking-widest text-xs mb-1">Question Bank</h3>
                     {questions.map(q => (
                       <button 
                         key={q.id}
                         onClick={() => setCurrentQuestion(q)}
                         className={`text-left p-4 rounded-2xl border transition-all ${currentQuestion?.id === q.id ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-container-low border-white/5 text-on-surface hover:border-primary/50'}`}
                       >
                         <div className="font-bold font-headline">{q.id}</div>
                         <div className="text-sm opacity-80 mt-1 line-clamp-1">{q.stem}</div>
                       </button>
                     ))}
                  </div>
               )}
            </div>

            <div className="bg-surface-container-low p-6 rounded-3xl border border-white/5 shadow-sm space-y-4">
               <div>
                  <h3 className="font-bold text-on-surface flex items-center gap-2 mb-1"><span className="material-symbols-outlined text-sm text-error">warning</span> Try This</h3>
                  <p className="text-sm text-on-surface-variant">Switch between questions and try selecting different wrong answers to see the tailored root-cause identification.</p>
               </div>
            </div>
        </div>

        {}
        <div className="w-full md:w-auto flex-grow flex justify-center mt-2">
            {!loading && currentQuestion ? (
                <FaultTreeStudentView question={currentQuestion} onAdaptiveNext={fetchAdaptiveQuestion} />
            ) : (
               <div className="w-full max-w-3xl h-64 bg-surface-container rounded-3xl animate-pulse"></div>
            )}
        </div>

      </main>
    </div>
  )
}

import React, { useState } from 'react'
import { Link } from 'react-router'

export default function QuizPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedOption, setSelectedOption] = useState(null)
  const [confidence, setConfidence] = useState(50)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)

  const quizData = {
    title: "Diagnostic: Quadratic Factorization",
    source: "Algebra 1 - Quadratic Equations",
    questions: [
      {
        id: 1,
        question: "When factoring the expression x² - 9, which of the following is the correct factored form?",
        options: [
          { id: 'A', text: "(x - 3)(x - 3)" },
          { id: 'B', text: "(x + 3)(x - 3)" },
          { id: 'C', text: "(x + 9)(x - 1)" },
          { id: 'D', text: "x(x - 9)" }
        ],
        correct: 'B',
        explanation: "This tests the 'Difference of Squares' concept. The pattern a² - b² factors to (a + b)(a - b). Here, a=x and b=3. If you selected A, you confused it with a perfect square trinomial."
      },
      {
        id: 2,
        question: "Solve for x in the equation: 2x² - 8 = 0",
        options: [
          { id: 'A', text: "x = 2" },
          { id: 'B', text: "x = 4" },
          { id: 'C', text: "x = 2, x = -2" },
          { id: 'D', text: "x = 4, x = -4" }
        ],
        correct: 'C',
        explanation: "First, add 8 to both sides: 2x² = 8. Divide by 2: x² = 4. Taking the square root of both sides yields x = ±2. Selecting A indicates a missing prerequisite skill regarding multiple roots in quadratics."
      }
    ]
  }

  const handleNext = () => {
    if (currentQuestion < quizData.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setSelectedOption(null)
      setConfidence(50)
      setIsSubmitted(false)
      setShowExplanation(false)
    } else {

    }
  }

  const handleSubmit = () => {
    setIsSubmitted(true)
    setShowExplanation(true)
  }

  const currentQ = quizData.questions[currentQuestion]
  const progress = ((currentQuestion + 1) / quizData.questions.length) * 100

  return (
    <div className="min-h-screen flex flex-col bg-[#0e0e0e] text-on-surface">
      {}
      <nav className="w-full top-0 sticky bg-[#0e0e0e]/95 backdrop-blur-xl z-50 border-b border-white/5">
        <div className="flex justify-between items-center px-8 py-4 max-w-screen-2xl mx-auto">
          <Link to="/" className="text-2xl font-bold tracking-tighter text-primary font-headline">Episteme</Link>
          <div className="hidden md:flex items-center gap-2">
            <span className="material-symbols-outlined text-stone-500 text-sm">account_tree</span>
            <span className="text-stone-400 font-medium text-sm">Source: {quizData.source}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-stone-400 hover:text-stone-100 transition-colors text-sm font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">close</span> End Session
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-10 flex-grow w-full flex flex-col">
        {}
        <div className="mb-8" data-aos="fade-down">
          <div className="flex justify-between items-center mb-4">
             <h1 className="text-3xl font-bold font-headline">{quizData.title}</h1>
             <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse">Live Diagnostic</span>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium">
            <span className="text-on-surface-variant">Question {currentQuestion + 1} of {quizData.questions.length}</span>
            <div className="flex-grow h-2 bg-surface-container-highest rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="text-primary">{Math.round(progress)}%</span>
          </div>
        </div>

        {}
        <div className="bg-surface-container rounded-3xl p-8 md:p-10 shadow-2xl relative" data-aos="fade-up" data-aos-delay="100">
          <h2 className="text-2xl font-medium leading-relaxed mb-8">{currentQ.question}</h2>

          <div className="space-y-4 mb-10">
            {currentQ.options.map((opt) => {
              const isSelected = selectedOption === opt.id
              const isCorrect = isSubmitted && opt.id === currentQ.correct
              const isWrong = isSubmitted && isSelected && opt.id !== currentQ.correct

              let optionClasses = "w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 "

              if (isSubmitted) {
                if (isCorrect) {
                  optionClasses += "bg-green-500/10 border-green-500/50 text-on-surface"
                } else if (isWrong) {
                  optionClasses += "bg-error/10 border-error/50 text-on-surface"
                } else {
                  optionClasses += "border-outline-variant/10 text-stone-500 opacity-50"
                }
              } else {
                optionClasses += isSelected 
                  ? "border-primary bg-primary/5 text-on-surface ring-1 ring-primary/20 shadow-md" 
                  : "border-outline-variant/20 hover:border-outline-variant/60 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface"
              }

              return (
                <button
                  key={opt.id}
                  onClick={() => !isSubmitted && setSelectedOption(opt.id)}
                  disabled={isSubmitted}
                  className={optionClasses}
                >
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border text-sm font-bold shrink-0 ${
                    isCorrect ? 'bg-green-500 text-white border-green-500' : 
                    isWrong ? 'bg-error text-white border-error' :
                    isSelected ? 'bg-primary text-on-primary border-primary' : 'border-stone-600 text-stone-400'
                  }`}>
                    {isSubmitted && isCorrect ? <span className="material-symbols-outlined text-[18px]">check</span> :
                     isSubmitted && isWrong ? <span className="material-symbols-outlined text-[18px]">close</span> :
                     opt.id}
                  </div>
                  <span className="text-lg font-medium">{opt.text}</span>
                </button>
              )
            })}
          </div>

          {}
          {!isSubmitted && (
             <div className="mb-10 bg-surface-container-lowest p-6 rounded-2xl border border-white/5" data-aos="fade-in">
               <div className="flex justify-between items-center mb-4">
                  <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary">speed</span>
                    Confidence Calibration
                  </label>
                  <span className="text-secondary font-bold font-mono">{confidence}%</span>
               </div>
               <p className="text-xs text-stone-500 mb-4">How confident are you in the selected answer? (Used to calculate your Brier Score)</p>
               <input 
                 type="range" 
                 min="0" 
                 max="100" 
                 step="10"
                 value={confidence}
                 onChange={(e) => setConfidence(e.target.value)}
                 className="w-full accent-secondary h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer"
               />
               <div className="flex justify-between text-xs text-stone-600 font-bold mt-2">
                 <span>Guessing (0%)</span>
                 <span>Fairly Sure (50%)</span>
                 <span>Absolutely Certain (100%)</span>
               </div>
             </div>
          )}

          {}
          {showExplanation && (
            <div className={`p-6 rounded-2xl mb-8 border transition-all duration-500 ${selectedOption === currentQ.correct ? 'bg-green-500/5 border-green-500/20' : 'bg-surface-container-highest border-error/20'}`} data-aos="fade-in">
              <div className="flex items-start gap-3 mb-2">
                <span className={`material-symbols-outlined ${selectedOption === currentQ.correct ? 'text-green-500' : 'text-error'}`}>
                   {selectedOption === currentQ.correct ? 'verified' : 'psychology_alt'}
                </span>
                <span className="font-bold text-sm uppercase tracking-wider mt-0.5 text-on-surface-variant">Fault Tree Trace Output</span>
              </div>
              <p className="text-on-surface leading-relaxed ml-9 mb-4">{currentQ.explanation}</p>

              {!isSubmitted || (selectedOption !== currentQ.correct && (
                 <div className="ml-9 p-4 bg-error/10 border border-error/20 rounded-xl flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-error animate-pulse"></div>
                   <span className="text-sm">Root Cause Diagnosed: <strong>Difference of Squares Misconception</strong> </span>
                 </div>
              ))}
            </div>
          )}

          {}
          <div className="flex justify-end pt-4 border-t border-white/5">
            {!isSubmitted ? (
               <button 
                 onClick={handleSubmit}
                 disabled={!selectedOption}
                 className="bg-primary text-on-primary px-8 py-3 rounded-full font-bold hover:scale-[0.98] transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2 shadow-[0_4px_15px_rgba(255,143,111,0.2)] disabled:shadow-none"
               >
                 Submit Answer
                 <span className="material-symbols-outlined text-[20px]">send</span>
               </button>
            ) : (
               <button 
                 onClick={handleNext}
                 className="bg-surface-container-highest border border-outline-variant/10 text-on-surface hover:bg-white/10 px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2"
               >
                 {currentQuestion < quizData.questions.length - 1 ? 'Next Question' : 'Finish Diagnostic'}
                 <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
               </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

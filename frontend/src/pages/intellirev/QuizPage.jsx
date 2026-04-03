import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase'
import { API } from '../../api';


const DEMO_QUESTIONS = [
  { id: 'q1', question_text: 'What are the main components of a Neural Network?', question_type: 'mcq', answer: 'Input, Hidden, and Output layers', options: ['Input and Output only', 'Input, Hidden, and Output layers', 'Neurons and wires', 'Software and Hardware'] },
  { id: 'q2', question_text: 'Which of the following best describes gradient descent?', question_type: 'mcq', answer: 'An optimization algorithm that minimizes loss', options: ['A sorting algorithm', 'An optimization algorithm that minimizes loss', 'A data preprocessing step', 'A type of neural network'] },
  { id: 'q3', question_text: 'Which technique is used to prevent overfitting by randomly dropping neurons?', question_type: 'mcq', answer: 'Dropout', options: ['Batch Normalization', 'Dropout', 'Data Augmentation', 'Early Stopping'] },
  { id: 'q4', question_text: 'Which activation function outputs values between 0 and 1?', question_type: 'mcq', answer: 'Sigmoid', options: ['ReLU', 'Tanh', 'Sigmoid', 'Softmax'] },
  { id: 'q5', question_text: 'The process of adjusting model weights using labeled data is called:', question_type: 'mcq', answer: 'Supervised Learning', options: ['Unsupervised Learning', 'Reinforcement Learning', 'Supervised Learning', 'Clustering'] },
]

export default function QuizPage() {
  const { topicId } = useParams()
  const [searchParams] = useSearchParams()
  const topicName = searchParams.get('name') || 'Topic'
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)
  const [timer, setTimer] = useState(0)
  const [questionStartTime, setQuestionStartTime] = useState(Date.now())

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUser(user)
      else navigate('/login')
    })
  }, [navigate])

  useEffect(() => {
    const interval = setInterval(() => setTimer(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (topicId === 'demo') {
      setQuestions(DEMO_QUESTIONS)
      setLoading(false)
      return
    }
    fetch(`${API}/intellirev/quiz/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic_id: topicId, topic_name: topicName }),
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setQuestions(data.questions || DEMO_QUESTIONS); setLoading(false) })
      .catch(() => { setQuestions(DEMO_QUESTIONS); setLoading(false) })
  }, [topicId, topicName])

  const q = questions[currentIdx]
  const progress = questions.length > 0 ? ((currentIdx) / questions.length) * 100 : 0

  const handleAnswer = (val) => {
    const timeTaken = Math.round((Date.now() - questionStartTime) / 1000)
    setAnswers(prev => ({ ...prev, [q.id]: { given_answer: val, time_taken_secs: timeTaken } }))
  }

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(i => i + 1)
      setQuestionStartTime(Date.now())
    } else {
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    const payload = {
      user_id: user?.id || 'guest_user_001',
      topic_id: topicId,
      answers: questions.map(q => ({
        question_id: q.id,
        given_answer: answers[q.id]?.given_answer || '',
        time_taken_secs: answers[q.id]?.time_taken_secs || 30,
      })),
    }
    try {
      const res = await fetch(`${API}/intellirev/quiz/submit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const data = res.ok ? await res.json() : null
      setResult(data || { score: 0, total: questions.length, percentage: 0, classification: 'medium', next_revision: 'Tomorrow', points_earned: 5 })
    } catch {

      let correct = 0
      questions.forEach(q => {
        if ((answers[q.id]?.given_answer || '').toLowerCase().trim() === q.answer.toLowerCase().trim()) correct++
      })
      setResult({ score: correct, total: questions.length, percentage: (correct / questions.length) * 100, classification: correct / questions.length > 0.8 ? 'strong' : correct / questions.length > 0.5 ? 'medium' : 'weak', next_revision: 'Tomorrow', points_earned: correct * 2 })
    }
    setSubmitted(true)
  }

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary-dim text-on-primary/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="material-symbols-outlined text-primary text-3xl">quiz</span>
          </div>
          <p className="text-white font-bold">Generating quiz questions...</p>
          <p className="text-stone-500 text-sm mt-1">Using spaCy POS tagging</p>
        </div>
      </div>
    )
  }

  if (submitted && result) {
    const pct = result.percentage || 0
    const cls = result.classification || 'medium'
    const clsColor = cls === 'strong' ? 'text-green-400' : cls === 'medium' ? 'text-yellow-400' : 'text-red-400'
    const clsBg = cls === 'strong' ? 'bg-green-500/10 border-green-500/20' : cls === 'medium' ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20'

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-surface-container border border-primary/20 rounded-3xl p-8 text-center">
            <div className={`w-24 h-24 rounded-full ${clsBg} border flex items-center justify-center mx-auto mb-6`}>
              <span className={`text-4xl font-black ${clsColor}`}>{Math.round(pct)}%</span>
            </div>
            <h2 className="font-headline text-3xl font-extrabold text-white mb-2">Quiz Complete!</h2>
            <p className="text-stone-400 mb-6">{result.score} / {result.total} correct on <span className="text-primary font-bold">{topicName}</span></p>
            <div className={`border ${clsBg} rounded-2xl p-4 mb-6`}>
              <p className={`font-black text-xl ${clsColor}`}>{cls.toUpperCase()}</p>
              <p className="text-stone-400 text-sm mt-1">
                {cls === 'strong' ? 'Excellent! Revision in 7 days.' : cls === 'medium' ? 'Good effort. Revision in 3 days.' : 'Needs work. Revision scheduled tomorrow.'}
              </p>
            </div>
            <div className="flex gap-3 justify-center mb-4">
              <div className="bg-primary-dim text-on-primary/10 border border-primary/20 rounded-xl px-5 py-3 text-center">
                <div className="text-xl font-black text-primary">+{result.points_earned || 10}</div>
                <div className="text-xs text-stone-500">Points</div>
              </div>
              <div className="bg-secondary/10 border border-secondary/20 rounded-xl px-5 py-3 text-center">
                <div className="text-xl font-black text-secondary">{formatTime(timer)}</div>
                <div className="text-xs text-stone-500">Time</div>
              </div>
            </div>
            <div className="flex gap-3">
              <Link to="/" className="flex-1 bg-background border border-white/10 hover:border-primary/30 text-white rounded-xl py-3 font-bold text-sm transition-all text-center">← Dashboard</Link>
              <Link to="/intellirev/profile" className="flex-1 bg-primary text-on-primary rounded-xl py-3 font-bold text-sm hover:scale-95 transition-all text-center shadow-lg shadow-primary/20">View Profile</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentAnswer = answers[q?.id]?.given_answer || ''

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {}
        <div className="w-full h-1 bg-white/5">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        {}
        <div className="flex items-center justify-between px-8 py-4 border-b border-primary/10">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-stone-500 hover:text-white transition-colors">
              <span className="material-symbols-outlined">dashboard</span>
            </Link>
            <div>
              <p className="text-white font-bold text-sm">{topicName}</p>
              <p className="text-stone-500 text-xs">Question {currentIdx + 1} of {questions.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-surface-container border border-white/5 px-4 py-2 rounded-full">
            <span className="material-symbols-outlined text-primary text-sm">timer</span>
            <span className="text-white font-mono font-bold">{formatTime(timer)}</span>
          </div>
        </div>

        {}
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="max-w-xl w-full">
            <div className="bg-surface-container border border-primary/20 rounded-3xl p-8 shadow-2xl shadow-primary/5">
              {}
              <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4 inline-block bg-primary/10 text-primary border border-primary/20">
                Multiple Choice
              </span>

              <h2 className="text-white text-xl font-bold leading-relaxed mb-8">{q?.question_text}</h2>

              {q?.options && (
                <div className="space-y-3">
                  {q.options.map((opt, i) => (
                    <button
                      key={opt}
                      onClick={() => handleAnswer(opt)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                        currentAnswer === opt
                          ? 'bg-primary border-primary text-on-primary font-bold'
                          : 'bg-background border-white/5 text-stone-300 hover:border-primary/30 hover:text-white'
                      }`}
                    >
                      <span className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm font-bold shrink-0 ${
                        currentAnswer === opt ? 'bg-primary-dim text-on-primary border-white/20' : 'border-white/20 text-stone-500'
                      }`}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-3 mt-8">
                {currentIdx > 0 && (
                  <button onClick={() => setCurrentIdx(i => i - 1)} className="border border-white/10 text-stone-400 hover:text-white rounded-xl px-6 py-3 transition-all font-bold text-sm">
                    ← Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  disabled={!currentAnswer}
                  className="flex-1 bg-primary hover:bg-primary-dim text-on-primary rounded-xl py-3 font-bold transition-all hover:scale-[1.02] disabled:opacity-50 shadow-lg shadow-primary/20"
                >
                  {currentIdx === questions.length - 1 ? 'Submit Quiz' : 'Next Question →'}
                </button>
              </div>
            </div>

            {}
            <div className="flex justify-center gap-2 mt-6">
              {questions.map((_, i) => (
                <button key={i} onClick={() => setCurrentIdx(i)} className={`rounded-full transition-all ${
                  i === currentIdx ? 'w-6 h-2.5 bg-primary' : answers[questions[i]?.id] ? 'w-2.5 h-2.5 bg-secondary' : 'w-2.5 h-2.5 bg-white/10'
                }`} />
              ))}
            </div>
          </div>
        </div>
      </div>
  )
}

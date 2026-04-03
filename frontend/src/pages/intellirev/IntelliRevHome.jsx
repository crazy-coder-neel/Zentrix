import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const USER_ID = 'guest_user_001' // Guest mode

const FEATURES = [
  { icon: 'calendar_month', title: 'Smart Study Plan', desc: '5-day adaptive schedule built from your syllabus using TF-IDF + NLP topic extraction.', color: 'from-primary/20 to-primary/5', accent: 'text-primary' },
  { icon: 'play_circle', title: 'Curated Videos', desc: 'Best YouTube tutorials auto-ranked by keyword match, views and duration — no API key needed.', color: 'from-secondary/20 to-secondary/5', accent: 'text-secondary' },
  { icon: 'article', title: 'TextRank Notes', desc: 'Extractive summarization via NetworkX PageRank on sentence similarity graphs. Zero hallucination.', color: 'from-primary/20 to-primary/5', accent: 'text-purple-400' },
  { icon: 'quiz', title: 'spaCy Quizzes', desc: 'Rule-based quiz generation using POS tagging and NER — fill-in-blank and MCQ auto-generated.', color: 'from-secondary/20 to-secondary/5', accent: 'text-fuchsia-400' },
  { icon: 'track_changes', title: 'Weakness Engine', desc: 'Confidence scores update after each quiz. Weak topics get scheduled for next-day revision.', color: 'from-primary/20 to-indigo-600/20', accent: 'text-primary' },
  { icon: 'insights', title: 'Consistency Graph', desc: 'GitHub-style activity heatmap tracks your daily learning streak and progress over time.', color: 'from-secondary/20 to-purple-600/20', accent: 'text-secondary' },
]

export default function IntelliRevHome() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('text') // 'text' | 'pdf'
  const [text, setText] = useState('')
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && f.name.endsWith('.pdf')) {
      setFile(f)
      setFileName(f.name)
    }
  }

  const handleSubmit = async () => {
    if (tab === 'text' && text.trim().length < 50) {
      setError('Please enter at least 50 characters of syllabus text.')
      return
    }
    if (tab === 'pdf' && !file) {
      setError('Please select a PDF file.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('user_id', USER_ID)
      if (tab === 'text') {
        formData.append('text', text)
      } else {
        formData.append('file', file)
      }

      const res = await fetch(`${API}/intellirev/upload`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)

      const data = await res.json()
      // Store plan in sessionStorage for plan page
      sessionStorage.setItem('intellirev_plan', JSON.stringify(data))
      navigate('/intellirev/plan')
    } catch (e) {
      setError(e.message || 'Failed to generate plan. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="w-full top-0 sticky bg-background/95 backdrop-blur-xl z-50 border-b border-primary/10">
        <div className="flex justify-between items-center px-8 py-4 max-w-screen-xl mx-auto">
          <Link to="/" className="text-xl font-bold tracking-tighter text-white font-headline flex items-center gap-2">
            <span className="text-stone-400">Episteme</span>
            <span className="text-stone-600">/</span>
            <span className="text-primary">IntelliRev</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link to="/intellirev/plan" className="text-stone-400 hover:text-primary transition-colors">My Plan</Link>
            <Link to="/intellirev/profile" className="text-stone-400 hover:text-primary transition-colors">Profile</Link>
            <Link to="/dashboard" className="bg-primary text-on-primary hover:bg-primary-dim text-on-primary text-white px-5 py-2 rounded-full font-bold transition-all hover:scale-95">
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        {/* Purple gradient blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary text-on-primary/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto px-8 text-center relative z-10">
          <span className="inline-flex items-center gap-2 bg-primary-dim text-on-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-[0.2em] px-4 py-2 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary text-on-primary animate-pulse" />
            Classical NLP · No LLMs · Deterministic
          </span>
          <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-tighter leading-[0.9] mb-6">
            <span className="text-white">Adaptive</span>
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">Learning Engine</span>
          </h1>
          <p className="text-stone-400 text-xl max-w-2xl mx-auto leading-relaxed mb-12">
            Upload your syllabus. IntelliRev extracts topics, builds a 5-day study plan, fetches curated videos, generates notes and quizzes — then tracks your weaknesses adaptively.
          </p>

          {/* Upload Card */}
          <div className="bg-surface-container border border-primary/20 rounded-3xl p-8 shadow-2xl shadow-primary/20 max-w-2xl mx-auto">
            {/* Tabs */}
            <div className="flex bg-background p-1 rounded-2xl mb-6 w-fit mx-auto">
              {['text', 'pdf'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                    tab === t
                      ? 'bg-primary text-on-primary text-white shadow-lg shadow-primary/30'
                      : 'text-stone-500 hover:text-stone-300'
                  }`}
                >
                  {t === 'text' ? 'Paste Text' : 'Upload PDF'}
                </button>
              ))}
            </div>

            {tab === 'text' ? (
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Paste your syllabus, topics list, or chapter content here...&#10;&#10;Example:&#10;Chapter 1: Neural Networks&#10;Chapter 2: Convolutional Networks (CNN)&#10;Chapter 3: Recurrent Networks (RNN, LSTM)&#10;Chapter 4: Transformers and Attention"
                rows={8}
                className="w-full bg-background border border-white/5 rounded-2xl p-4 text-white placeholder-stone-600 text-sm resize-none focus:outline-none focus:border-primary/50 transition-colors leading-relaxed"
              />
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-12 cursor-pointer transition-all text-center ${
                  dragging
                    ? 'border-primary bg-primary-dim text-on-primary/10'
                    : fileName
                    ? 'border-green-500/50 bg-green-500/5'
                    : 'border-white/10 hover:border-primary/40 hover:bg-primary-dim text-on-primary/5'
                }`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) { setFile(f); setFileName(f.name) }
                  }}
                />
                <span className="material-symbols-outlined text-4xl text-primary mb-3 block">upload_file</span>
                {fileName ? (
                  <div>
                    <p className="text-green-400 font-bold">{fileName}</p>
                    <p className="text-stone-500 text-sm mt-1">Click to change</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-white font-bold">Drop PDF here or click to browse</p>
                    <p className="text-stone-500 text-sm mt-1">Syllabus, notes, or textbook chapter</p>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="mt-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full mt-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3 shadow-xl shadow-primary/30"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Extracting topics & building plan...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">auto_awesome</span>
                  Generate Study Plan
                </>
              )}
            </button>
          </div>

          {/* Quick demo link */}
          <button
            onClick={() => {
              setText('Chapter 1: Introduction to Machine Learning\nChapter 2: Linear Regression and Gradient Descent\nChapter 3: Logistic Regression and Classification\nChapter 4: Neural Networks and Deep Learning\nChapter 5: Convolutional Neural Networks (CNNs)\nChapter 6: Recurrent Neural Networks (RNNs)\nChapter 7: Natural Language Processing\nChapter 8: Reinforcement Learning\nChapter 9: Model Evaluation and Cross-Validation\nChapter 10: Deployment and MLOps')
              setTab('text')
            }}
            className="mt-4 text-sm text-stone-500 hover:text-primary transition-colors underline underline-offset-2"
          >
            Try a demo syllabus →
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 max-w-screen-xl mx-auto px-8">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-primary mb-3 block">System Architecture</span>
          <h2 className="font-headline text-4xl font-extrabold text-white">The Intelligence Stack</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`bg-gradient-to-br ${f.color} border border-white/5 rounded-2xl p-6 hover:border-primary/30 transition-all group`}
            >
              <span className={`material-symbols-outlined text-3xl ${f.accent} mb-4 block`}
                style={{ fontVariationSettings: "'FILL' 1" }}>
                {f.icon}
              </span>
              <div className="text-xs font-bold text-stone-500 mb-1">Step {String(i + 1).padStart(2, '0')}</div>
              <h3 className="font-headline text-lg font-bold text-white mb-2">{f.title}</h3>
              <p className="text-stone-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Flow diagram */}
      <section className="py-12 border-t border-white/5">
        <div className="max-w-screen-xl mx-auto px-8">
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-bold">
            {['Upload', 'Extract Topics', 'Build Plan', 'Fetch Videos', 'Generate Notes', 'Take Quiz', 'Track Weakness', 'Revise', 'Improve'].map((step, i, arr) => (
              <div key={step} className="flex items-center gap-3">
                <span className="bg-primary-dim text-on-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-full">
                  {step}
                </span>
                {i < arr.length - 1 && (
                  <span className="material-symbols-outlined text-stone-700 text-sm">arrow_forward</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

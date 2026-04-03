import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function LearnPage() {
  const { topicId } = useParams()
  const [searchParams] = useSearchParams()
  const topicName = searchParams.get('name') || 'Topic'
  const navigate = useNavigate()

  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('notes')

  // Notes auto-gen
  const [notesLoading, setNotesLoading] = useState(false)
  const [notes, setNotes] = useState(null)
  const [notesKeywords, setNotesKeywords] = useState([])
  const [notesGenerated, setNotesGenerated] = useState(false)
  const [selectedBooks, setSelectedBooks] = useState([])
  const USER_ID = 'guest_user_001'

  // Summarizer
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [videoSummary, setVideoSummary] = useState(null)
  const [showSummary, setShowSummary] = useState(false)

  // Q&A
  const [qaQuestion, setQaQuestion] = useState('')
  const [qaAnswer, setQaAnswer] = useState(null)
  const [qaLoading, setQaLoading] = useState(false)
  const [suggestedQuestions, setSuggestedQuestions] = useState([])
  const [suggestLoading, setSuggestLoading] = useState(false)

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [searching, setSearching] = useState(false)

  // Fetch content on mount
  useEffect(() => {
    setLoading(true)
    setContent(null)
    setError('')
    setNotes(null)
    setNotesGenerated(false)
    setVideoSummary(null)
    setShowSummary(false)

    if (topicId === 'demo') {
      setTimeout(() => {
        setContent({
          topic_id: 'demo', topic_name: topicName,
          video: { video_id: 'dQw4w9WgXcQ', title: `${topicName} — Complete Tutorial`, url: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`, embed_url: `https://www.youtube.com/embed/dQw4w9WgXcQ`, duration: 720, views: 1200000 },
          summary: [`${topicName} is a foundational concept widely used in computer science.`, 'It provides a structured approach to solving complex problems.', 'Key components include data structures and algorithmic patterns.', 'Applications range from software development to AI.'],
          keywords: ['Algorithm', 'Data Structure', 'Complexity', 'Optimization'],
          resources: [{ title: `${topicName} — Wikipedia`, url: `https://en.wikipedia.org/wiki/${topicName.replace(' ', '_')}`, snippet: 'Comprehensive overview.' }],
        })
        setNotes([`${topicName} is a foundational concept widely used in computer science.`, 'It provides a structured approach to solving complex problems.', 'Key components include data structures and algorithmic patterns.', 'Applications range from software development to AI.'])
        setNotesGenerated(true)
        setLoading(false)
      }, 600)
      return
    }

    fetch(`${API}/intellirev/learn/${topicId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => {
        setContent(data)
        if (data.summary && data.summary.length > 0) {
          setNotes(data.summary)
          setNotesKeywords(data.keywords || [])
          setNotesGenerated(true)
        }
        setLoading(false)
      })
      .catch(() => { setError('Could not load content. Try from the study plan.'); setLoading(false) })
  }, [topicId, topicName])

  const generateNotes = useCallback(async (force = false) => {
    if ((notesGenerated && !force) || notesLoading || topicId === 'demo') return
    setNotesLoading(true)
    try {
      const res = await fetch(`${API}/intellirev/generate-notes/${topicId}${force ? '?force=true' : ''}`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      
      // Handle RAG error
      if (data.error === 'RAG_CONTEXT_EMPTY') {
        setNotes([]) // Show the upload portal
        setNotesGenerated(false)
        return
      }

      setNotes(data.summary || [])
      setNotesKeywords(data.keywords || [])
      setNotesGenerated(true)
    } catch {
      setNotes(null)
    } finally {
      setNotesLoading(false)
    }
  }, [topicId, notesGenerated, notesLoading])

  const handleBookSelect = (e) => {
    setSelectedBooks(Array.from(e.target.files))
  }

  const handleIndexContent = async () => {
    if (!selectedBooks.length) return
    setNotesLoading(true)
    
    for (let file of selectedBooks) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('user_id', USER_ID)
      formData.append('topic_id', topicId)
      try {
        await fetch(`${API}/intellirev/upload-book`, { method: 'POST', body: formData })
      } catch (err) { console.error("Upload failed", file.name) }
    }
    
    setSelectedBooks([])
    // Refresh to use new context
    await generateNotes(true)
  }

  useEffect(() => {
    if (activeTab === 'notes' && !notesGenerated && !notesLoading && !loading && content) {
      generateNotes()
    }
  }, [activeTab, notesGenerated, notesLoading, loading, content, generateNotes])

  // Summarize video
  const handleSummarize = async () => {
    if (!content?.video?.url || summaryLoading) return
    setSummaryLoading(true)
    setShowSummary(true)
    try {
      const formData = new FormData()
      formData.append('video_url', content.video.url)
      formData.append('topic_name', topicName)
      const res = await fetch(`${API}/intellirev/summarize`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setVideoSummary(data.summary || [])
    } catch {
      setVideoSummary(['Could not summarize this video. It may not have captions.'])
    } finally {
      setSummaryLoading(false)
    }
  }

  // Q&A
  const handleAskQuestion = async (q) => {
    const question = q || qaQuestion
    if (!question.trim()) return
    setQaLoading(true)
    setQaAnswer(null)
    try {
      const formData = new FormData()
      formData.append('question', question)
      formData.append('topic_id', topicId)
      const res = await fetch(`${API}/intellirev/qa`, { method: 'POST', body: formData })
      const data = await res.json()
      setQaAnswer(data.answer || 'No answer found.')
    } catch {
      setQaAnswer('Could not process your question. Try generating notes first.')
    } finally {
      setQaLoading(false)
    }
  }

  // Suggested questions
  const loadSuggestions = async () => {
    if (suggestLoading || topicId === 'demo') return
    setSuggestLoading(true)
    try {
      const res = await fetch(`${API}/intellirev/suggest-questions/${topicId}`)
      const data = await res.json()
      setSuggestedQuestions(data.questions || [])
    } catch {
      setSuggestedQuestions([`What is ${topicName}?`, `How does ${topicName} work?`])
    } finally {
      setSuggestLoading(false)
    }
  }

  useEffect(() => {
    if (!loading && content && topicId !== 'demo') {
      loadSuggestions()
    }
  }, [loading, content, topicId])

  // Search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`${API}/intellirev/search?q=${encodeURIComponent(searchQuery)}&user_id=guest_user_001`)
      setSearchResult(await res.json())
    } catch {
      setSearchResult({ answer: 'Search unavailable.', matched_keywords: [] })
    } finally { setSearching(false) }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Unified Learn Navigation */}
      <nav className="w-full top-0 sticky bg-background/95 backdrop-blur-xl z-50 border-b border-primary/10">
        <div className="flex justify-between items-center px-8 py-4 max-w-screen-xl mx-auto">
          <div className="flex items-center gap-2 text-xl font-bold tracking-tighter font-headline">
            <Link to="/" className="text-stone-400 hover:text-white transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
              Dashboard
            </Link>
            <span className="text-stone-700">/</span>
            <Link to="/" className="text-stone-400 hover:text-white transition-colors">Study Blueprint</Link>
            <span className="text-stone-700">/</span>
            <span className="text-primary truncate max-w-[200px] font-bold">{topicName}</span>
          </div>
          <button
            onClick={() => navigate(`/intellirev/quiz/${topicId}?name=${encodeURIComponent(topicName)}`)}
            className="bg-primary hover:bg-primary-dim text-on-primary font-bold px-6 py-2.5 rounded-full hover:scale-95 transition-all text-sm flex items-center gap-2 shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-sm">quiz</span>
            Start Quiz
          </button>
        </div>
      </nav>

      {loading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-white">
            <svg className="animate-spin w-10 h-10 text-primary-dim mx-auto mb-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="font-bold text-lg">Fetching content for</p>
            <p className="text-primary font-bold text-xl">{topicName}</p>
            <p className="text-stone-500 text-sm mt-2">Discovering videos & ranking resources...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
          <span className="material-symbols-outlined text-4xl text-red-500">error</span>
          <p className="text-white text-lg">{error}</p>
          <Link to="/" className="text-primary hover:text-primary underline">← Back to Dashboard</Link>
        </div>
      ) : (
        <div className="max-w-screen-xl mx-auto px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column — Video + Notes/Resources */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-primary mb-1 block">Active Learning Module</span>
                <h1 className="font-headline text-4xl font-black text-white leading-tight">{content?.topic_name || topicName}</h1>
              </div>

              {/* Video Player */}
              {content?.video ? (
                <div className="bg-surface-container border border-primary/20 rounded-2xl overflow-hidden">
                  <div className="aspect-video bg-black">
                    <iframe src={content.video.embed_url} title={content.video.title} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-white font-bold text-sm">{content.video.title}</p>
                      <div className="flex items-center gap-4 mt-1">
                        {content.video.duration && <span className="text-stone-500 text-xs">{Math.floor(content.video.duration / 60)}m</span>}
                        {content.video.views && <span className="text-stone-500 text-xs">{(content.video.views / 1000).toFixed(0)}K views</span>}
                      </div>
                    </div>
                    {/* Summarize Button */}
                    <button
                      onClick={handleSummarize}
                      disabled={summaryLoading}
                      className="flex items-center gap-2 bg-gradient-to-r from-primary/20 to-secondary/10 border border-primary/30 text-primary hover:text-white hover:border-primary/60 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                    >
                      {summaryLoading ? (
                        <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Summarizing...</>
                      ) : (
                        <><span className="material-symbols-outlined text-sm">auto_awesome</span>Summarize Video</>
                      )}
                    </button>
                  </div>

                  {/* Video Summary Panel */}
                  {showSummary && (
                    <div className="border-t border-primary/10 p-5 bg-surface-container/50">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-primary text-lg">summarize</span>
                        <h4 className="text-primary font-bold text-sm">Quick Video Summary</h4>
                      </div>
                      {summaryLoading ? (
                        <div className="flex items-center gap-3 text-stone-400 text-sm">
                          <svg className="animate-spin w-4 h-4 text-primary-dim" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Fetching transcript & running TextRank...
                        </div>
                      ) : (
                        <ul className="space-y-2">
                          {(videoSummary || []).map((s, i) => (
                            <li key={i} className="flex gap-3">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary-dim text-on-primary mt-2 shrink-0" />
                              <p className="text-stone-300 text-sm leading-relaxed">{s}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-surface-container border border-white/5 rounded-2xl p-8 text-center">
                  <span className="material-symbols-outlined text-4xl text-stone-600 mb-3 block">video_library</span>
                  <p className="text-stone-500">No video found. Try another topic.</p>
                </div>
              )}

              {/* RAG Book Upload Panel below Video */}
              <div className="bg-surface-container border border-primary/20 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 justify-between">
                <div>
                  <h3 className="text-white font-bold text-lg mb-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">library_books</span>
                    Build Knowledge Base
                  </h3>
                  <p className="text-stone-500 text-sm">Upload reference books/notes to generate specific, tailored insights.</p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <label className="flex-1 md:flex-none text-center bg-white/5 hover:bg-white/10 text-stone-300 border border-white/10 px-6 py-3 rounded-xl font-bold text-sm cursor-pointer transition-all">
                    {selectedBooks.length > 0 ? `${selectedBooks.length} Files Selected` : 'Select PDFs'}
                    <input type="file" multiple accept=".pdf" onChange={handleBookSelect} className="hidden" />
                  </label>
                  
                  <button 
                    onClick={handleIndexContent} 
                    disabled={selectedBooks.length === 0 || notesLoading}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary text-on-primary hover:bg-primary-dim text-on-primary disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-xl shadow-primary/20"
                  >
                    {notesLoading ? 'Indexing...' : 'Index Content'}
                  </button>
                </div>
              </div>

              {/* Tabs: Notes / Resources */}
              <div className="bg-surface-container border border-primary/20 rounded-2xl overflow-hidden">
                <div className="flex border-b border-white/5">
                  {['notes', 'resources'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === tab ? 'text-primary border-b-2 border-primary bg-primary-dim text-on-primary/5' : 'text-stone-500'}`}>
                      {tab === 'notes' ? '📝 Notes' : '🔗 Resources'}
                    </button>
                  ))}
                </div>
                <div className="p-6">
                  {activeTab === 'notes' ? (
                    <div className="space-y-6">
                      {notesLoading ? (
                        <div className="flex items-center gap-3 text-stone-400 py-8 justify-center">
                          <svg className="animate-spin w-6 h-6 text-primary-dim" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          <div className="text-left">
                            <p className="font-bold text-white uppercase tracking-tighter text-xs">Generating notes...</p>
                            <p className="text-[10px] text-stone-500 italic">Running TextRank Extraction...</p>
                          </div>
                        </div>
                      ) : notes && notes.length > 0 ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4">
                          <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-3">
                            <h3 className="text-xl font-headline font-black text-white italic tracking-tighter">The Blueprint</h3>
                            <button onClick={() => generateNotes(true)} className="text-[9px] bg-primary text-on-primary/10 border border-primary/20 hover:bg-primary text-on-primary/30 text-primary px-4 py-1.5 rounded-full font-black uppercase tracking-widest transition-all">
                              Clean & Regenerate
                            </button>
                          </div>
                          
                          <ul className="space-y-4">
                            {notes.map((sentence, i) => (
                              <li key={i} className="flex gap-4 group">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary-dim text-on-primary mt-2 shrink-0 group-hover:scale-150 transition-all shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                                <p className="text-stone-300 text-sm leading-relaxed">{sentence}</p>
                              </li>
                            ))}
                          </ul>

                          {notesKeywords.length > 0 && (
                            <div className="pt-8 border-t border-white/5 mt-8">
                              <p className="text-[10px] text-stone-600 uppercase tracking-[0.2em] mb-4 font-black">CORE TERMINOLOGY</p>
                              <div className="flex flex-wrap gap-2">
                                {notesKeywords.map((kw, i) => (
                                  <span key={i} className="bg-primary-dim text-on-primary/5 border border-primary/10 text-primary text-[10px] font-black px-4 py-2 rounded-xl hover:bg-primary-dim text-on-primary/10 transition-all cursor-default uppercase">
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-10 opacity-60">
                          <span className="material-symbols-outlined text-4xl text-stone-700 mb-2 block">description</span>
                          <p className="text-stone-500 text-sm mb-4">Learning content unavailable or insufficient context.</p>
                          <button onClick={() => generateNotes(true)} className="text-primary text-xs font-black uppercase tracking-widest hover:text-primary transition-colors">Force Refresh</button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {content?.resources?.map((r, i) => (
                        <a key={i} href={r.url} target="_blank" rel="noreferrer" className="block bg-black/40 border border-white/5 p-4 rounded-xl hover:border-primary/30 transition-all">
                          <p className="text-white font-bold text-sm mb-1">{r.title}</p>
                          <p className="text-stone-500 text-xs truncate">{r.url}</p>
                        </a>
                      )) || <p className="text-stone-500 italic">No additional resources.</p>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right column — Q&A + Search */}
            <div className="space-y-6">
              {/* Q&A Panel */}
              <div className="bg-surface-container border border-primary/20 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                  <h3 className="text-white font-bold text-lg">Ask a Question</h3>
                </div>
                <p className="text-stone-500 text-xs mb-4">Ask anything about this topic — answers from video transcripts & uploaded books.</p>

                <div className="flex gap-2 mb-4">
                  <input
                    value={qaQuestion}
                    onChange={e => setQaQuestion(e.target.value)}
                    placeholder="Type your question..."
                    onKeyDown={e => e.key === 'Enter' && handleAskQuestion()}
                    className="flex-1 bg-black border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/40"
                  />
                  <button onClick={() => handleAskQuestion()} disabled={qaLoading} className="bg-primary text-on-primary hover:bg-primary-dim text-on-primary px-4 rounded-xl transition-colors disabled:opacity-50">
                    {qaLoading
                      ? <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                      : <span className="material-symbols-outlined text-sm text-white">send</span>
                    }
                  </button>
                </div>

                {qaAnswer && (
                  <div className="p-4 bg-primary-dim text-on-primary/5 border border-primary/10 rounded-xl text-sm text-stone-300 leading-relaxed mb-4">
                    <p className="text-xs text-primary font-bold mb-2 uppercase tracking-wider">Answer</p>
                    {qaAnswer}
                  </div>
                )}

                {/* Suggested Questions (Adaptive Learning) */}
                {suggestedQuestions.length > 0 && (
                  <div className="space-y-4">
                    <div className="bg-primary text-on-primary/10 border border-primary/20 rounded-xl p-4">
                      <p className="text-[10px] text-primary font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                        Curator's Recommendation
                      </p>
                      <p className="text-white text-xs font-bold leading-tight">I think it's important you understand these 3 concepts before taking the quiz.</p>
                    </div>
                    
                    <div className="space-y-2">
                      {suggestedQuestions.slice(0, 3).map((q, i) => (
                        <button
                          key={i}
                          onClick={() => { setQaQuestion(q); handleAskQuestion(q) }}
                          className="w-full text-left bg-black/40 border border-white/5 hover:border-primary/30 text-stone-300 text-xs p-3 rounded-xl transition-all hover:bg-primary-dim text-on-primary/5 group"
                        >
                          <div className="flex items-start gap-2">
                            <span className="material-symbols-outlined text-primary text-sm shrink-0 mt-0.5 group-hover:rotate-12 transition-transform">help</span>
                            <span>{q}</span>
                          </div>
                          <p className="text-[9px] text-stone-600 mt-2 uppercase tracking-widest font-bold group-hover:text-primary-dim/70 transition-colors">Click to ask</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Explainability Search */}
              <div className="bg-surface-container border border-primary/20 rounded-2xl p-6">
                <h3 className="text-white font-bold text-lg mb-4">Search in Notes</h3>
                <div className="flex gap-2">
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search across all notes..."
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    className="flex-1 bg-black border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/40"
                  />
                  <button onClick={handleSearch} className="bg-primary text-on-primary px-3 rounded-xl"><span className="material-symbols-outlined text-sm text-white">search</span></button>
                </div>
                {searchResult && (
                  <div className="mt-4 p-3 bg-black/50 border border-primary/10 rounded-lg text-sm text-stone-300">{searchResult.answer}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

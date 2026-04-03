import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../supabase'
import { API } from '../../api'
import { useGoogleLogin } from '@react-oauth/google'


const DAY_COLORS = [
  'from-primary/20 to-primary/40',
  'from-secondary/20 to-secondary/40',
  'from-primary-dim/20 to-primary-dim/40',
  'from-primary/10 to-secondary/20',
  'from-secondary/10 to-primary/20',
]

const DAY_BORDER = [
  'border-primary/30',
  'border-secondary/30',
  'border-primary-dim/30',
  'border-primary-variant/30',
  'border-secondary-dim/30',
]

export default function StudyPlanPage() {
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [plan, setPlan] = useState(null)
  const [planId, setPlanId] = useState('')
  const [topicIds, setTopicIds] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [step, setStep] = useState('TIMINGS') 
  const [dailySlots, setDailySlots] = useState({ 
    1: [{ start: "09:00", end: "11:00" }], 
    2: [{ start: "11:00", end: "13:00" }], 
    3: [{ start: "15:00", end: "17:00" }], 
    4: [{ start: "17:00", end: "19:00" }], 
    5: [{ start: "20:00", end: "22:00" }] 
  })
  const [isUploadingBooks, setIsUploadingBooks] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const syncToCalendar = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsSyncing(true)
      try {
        const formData = new FormData()
        formData.append('user_id', user?.id || 'guest_user_001')
        formData.append('plan_id', planId)
        formData.append('access_token', tokenResponse.access_token)
        formData.append('daily_slots', JSON.stringify(dailySlots))

        const res = await fetch(`${API}/intellirev/sync-calendar`, {
          method: 'POST',
          body: formData
        })
        
        if (res.ok) {
          alert('Successfully synced your 5-day plan to Google Calendar!')
        }
      } catch (err) {
        console.error('Failed to sync calendar:', err)
        alert('Calendar sync failed, but you can still start studying.')
      } finally {
        setIsSyncing(false)
        completeConfirmation()
      }
    },
    onError: (error) => {
      console.error('Google Login Failed:', error)
      alert('Google authentication failed.')
    },
    scope: 'https://www.googleapis.com/auth/calendar.events'
  })

  function confirmAndSync() {
    syncToCalendar()
  }

  function completeConfirmation() {
    setStep('ACTIVE')
    localStorage.setItem('intellirev_study_phase', 'active')
    
    // Jump to first topic
    if (plan) {
      const firstDay = Object.keys(plan)[0]
      const topics = plan[firstDay] || []
      if (topics.length > 0) {
        const firstTopicName = topics[0]
        const firstTopicId = topicIds[firstTopicName]
        navigate(`/intellirev/learn/${firstTopicId || 'demo'}?name=${encodeURIComponent(firstTopicName)}`)
      }
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate('/login')
        return
      }
      setUser(user)

      const cached = sessionStorage.getItem('intellirev_plan')
      if (cached) {
        try {
          const data = JSON.parse(cached)
          setPlan(data.plan)
          setPlanId(data.plan_id || '')
          setTopicIds(data.topic_ids || {})
          setLoading(false)
          return
        } catch (e) {  }
      }
      fetch(`${API}/intellirev/plan/${user.id}`)
        .then(r => r.ok ? r.json() : Promise.reject(r))
        .then(data => {
          setPlan(data.plan)
          setPlanId(data.plan_id || '')
          setTopicIds(data.topic_ids || {})
          setLoading(false)
        })
        .catch(() => {
          setError('No study plan found. Upload a syllabus first.')
          setLoading(false)
        })
    })
  }, [navigate])

  const handleBookUpload = async (e) => {
    const files = e.target.files
    if (!files.length) return
    setIsUploadingBooks(true)

    for (let file of files) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('user_id', user.id)
      try {
        await fetch(`${API}/intellirev/upload-book`, { method: 'POST', body: formData })
      } catch (err) {
        console.error("Book failed", file.name)
      }
    }
    setIsUploadingBooks(false)
    alert("Reference books attached! Your notes will now include textbook content.")
  }


  if (loading) return <LoadingScreen />
  if (error || !plan) return <ErrorScreen error={error} />

  const updateSlot = (day, idx, field, val) => {
    setDailySlots(prev => {
      const slots = [...prev[day]]
      slots[idx] = { ...slots[idx], [field]: val }
      return { ...prev, [day]: slots }
    })
  }

  const addSlot = (day) => {
    setDailySlots(prev => ({ ...prev, [day]: [...prev[day], { start: "10:00", end: "12:00" }] }))
  }

  const removeSlot = (day, idx) => {
    setDailySlots(prev => ({ ...prev, [day]: prev[day].filter((_, i) => i !== idx) }))
  }

  if (step === 'TIMINGS') {
    return (
      <div className="min-h-screen bg-background px-4 py-8 md:p-12 flex flex-col items-center">
        <div className="w-full max-w-7xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16">
          <div className="text-left">
            <h2 className="text-6xl font-headline font-black text-white tracking-tight mb-2">Build Your Blueprint</h2>
            <p className="text-stone-500 text-lg">Define specific learning windows across your 5-day cycle.</p>
          </div>
          <button onClick={() => setStep('PREVIEW')} className="bg-primary text-on-primary text-white px-10 py-5 rounded-3xl font-black text-xl shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all">
            Generate Dynamic Plan
          </button>
        </div>

        <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map(dayNum => (
            <div key={dayNum} className="bg-surface-container border border-white/5 rounded-[40px] p-8 flex flex-col h-full shadow-2xl transition-all hover:border-primary/20 group">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] block mb-1">Session</span>
                  <div className="text-3xl font-headline font-black text-white">Day {dayNum}</div>
                </div>
                <button onClick={() => addSlot(dayNum)} className="w-10 h-10 bg-white/5 hover:bg-white/10 text-white rounded-2xl flex items-center justify-center border border-white/10 transition-all">+</button>
              </div>

              {}
              <div className="mb-6 p-4 bg-primary text-on-primary/5 border border-primary/10 rounded-2xl">
                <span className="text-[9px] text-primary/60 font-black uppercase tracking-widest block mb-2">Today's Topics</span>
                <div className="space-y-1.5">
                  {(plan[Object.keys(plan)[dayNum-1]] || []).slice(0, 3).map(t => (
                    <div key={t} className="text-[10px] text-stone-300 font-bold truncate">• {t}</div>
                  ))}
                  {(plan[Object.keys(plan)[dayNum-1]] || []).length > 3 && (
                    <div className="text-[9px] text-stone-600 font-bold italic">+ {(plan[Object.keys(plan)[dayNum-1]] || []).length - 3} more modules</div>
                  )}
                </div>
              </div>

              <div className="space-y-6 flex-1">
                {dailySlots[dayNum].map((slot, idx) => (
                  <div key={idx} className="bg-black/40 border border-white/5 rounded-3xl p-5 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] text-stone-600 font-bold uppercase tracking-widest">Window {idx+1}</span>
                      {dailySlots[dayNum].length > 1 && (
                        <button onClick={() => removeSlot(dayNum, idx)} className="text-stone-700 hover:text-red-400 transition-colors">
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-stone-700 font-bold uppercase px-2 mb-1">Start</span>
                        <input type="time" value={slot.start} onChange={(e) => updateSlot(dayNum, idx, 'start', e.target.value)}
                         className="bg-transparent text-white text-lg font-bold outline-none focus:text-primary px-2" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-stone-700 font-bold uppercase px-2 mb-1">End</span>
                        <input type="time" value={slot.end} onChange={(e) => updateSlot(dayNum, idx, 'end', e.target.value)}
                         className="bg-transparent text-white text-lg font-bold outline-none focus:text-primary px-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-white/5">
                <p className="text-[10px] text-stone-500 font-medium italic">Custom slots defined</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (step === 'PREVIEW') {
    return (
      <div className="min-h-screen bg-background py-20 px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-headline font-black text-white mb-4">Your Custom 5-Day Draft</h2>
            <p className="text-stone-400">Review your schedule based on your per-day availability.</p>
          </div>

          <div className="space-y-4 mb-10">
            {Object.entries(plan).slice(0, 5).map(([day, topics], idx) => (
              <div key={day} className="bg-surface-container border border-white/5 p-6 rounded-2xl flex items-center gap-6 group hover:border-primary/20 transition-all">
                <div className="w-12 h-12 rounded-full bg-primary text-on-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black shrink-0">
                  {idx + 1}
                </div>
                <div>
                  <h4 className="text-white font-bold">{day}</h4>
                  <p className="text-stone-500 text-sm">
                    {topics.length} modules • {dailySlots[idx + 1].map(s => `${s.start}-${s.end}`).join(", ")}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={confirmAndSync}
              disabled={isSyncing}
              className="w-full bg-primary text-on-primary text-white py-5 rounded-3xl font-black text-xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <span className="material-symbols-outlined">{isSyncing ? 'sync' : 'calendar_month'}</span>
              {isSyncing ? 'Syncing to Calendar...' : 'Confirm & Sync to Google'}
            </button>
            <button 
              onClick={completeConfirmation} 
              className="w-full bg-white/5 text-stone-400 py-4 rounded-3xl font-bold hover:bg-white/10 transition-all"
            >
              Start without Syncing
            </button>
            <button onClick={() => setStep('TIMINGS')} className="w-full text-stone-700 text-xs mt-2 hover:text-stone-300">
              ← Change timings
            </button>
          </div>
        </div>
      </div>
    )
  }


  const handleLearn = (topicName) => {
    const topicId = topicIds[topicName]
    navigate(`/intellirev/learn/${topicId || 'demo'}?name=${encodeURIComponent(topicName)}`)
  }

  const handleQuiz = (topicName) => {
    const topicId = topicIds[topicName]
    navigate(`/intellirev/quiz/${topicId || 'demo'}?name=${encodeURIComponent(topicName)}`)
  }
  return (
    <div className="min-h-screen bg-background">
      <nav className="w-full top-0 sticky bg-background/90 backdrop-blur-xl z-50 border-b border-white/5">
        <div className="flex justify-between items-center px-8 py-4 max-w-screen-xl mx-auto">
          <div className="flex items-center gap-2 text-xl font-bold tracking-tighter">
            <Link to="/" className="text-stone-400 hover:text-white transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
              Dashboard
            </Link>
            <span className="text-stone-800">/</span>
            <span className="text-primary">Study Blueprint</span>
          </div>
          <div className="flex items-center gap-4">
            <label className="cursor-pointer bg-white/5 border border-white/10 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-white/10 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">auto_stories</span>
              {isUploadingBooks ? 'Processing...' : 'Attach Reference Books'}
              <input type="file" multiple accept=".pdf" className="hidden" onChange={handleBookUpload} disabled={isUploadingBooks} />
            </label>
            <Link to="/" className="text-xs text-stone-500 hover:text-white">New Blueprint</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-screen-xl mx-auto px-8 py-12">
        <div className="mb-12">
          <span className="text-primary-dim font-black text-xs uppercase tracking-widest bg-primary-dim text-on-primary/10 px-3 py-1 rounded-full border border-primary/20">Active Session</span>
          <h1 className="text-5xl font-headline font-black text-white mt-4 tracking-tight">Your 5-Day Master Plan</h1>
          <p className="text-stone-400 mt-2 text-lg">Focus on Day 1 to build your foundation. Reference books will be integrated into notes.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Object.entries(plan).map(([day, topics], idx) => (
            <div key={day} className={`bg-surface-container/80 border ${DAY_BORDER[idx % 5]} rounded-3xl overflow-hidden flex flex-col group hover:scale-[1.02] transition-all`}>
              <div className={`bg-gradient-to-r ${DAY_COLORS[idx % 5]} p-5`}>
                <div className="text-[10px] font-black uppercase text-white/50 tracking-tighter">Phase {idx + 1}</div>
                <div className="text-xl font-black text-white">{day}</div>
                <div className="text-[10px] text-white/40 mt-1 uppercase font-bold tracking-widest">{topics.length} Modules</div>
              </div>
              <div className="p-4 space-y-3 flex-1">
                {topics.map(topic => (
                  <div key={topic} className="bg-black/40 border border-white/5 rounded-2xl p-4 transition-all hover:border-primary/10">
                    <p className="text-white text-sm font-bold mb-4 leading-snug">{topic}</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleLearn(topic)} className="flex-1 bg-primary text-white border border-primary/20 py-2.5 rounded-xl text-[10px] font-black uppercase hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95">Learn</button>
                      <button onClick={() => handleQuiz(topic)} className="flex-1 bg-white/5 border border-white/10 text-stone-400 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-white/10 transition-all">Quiz</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-stone-500 font-bold text-sm tracking-widest">BUILDING ARCHITECTURE...</p>
      </div>
    </div>
  )
}

function ErrorScreen({ error }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-6">
      <div className="text-red-500 text-6xl material-symbols-outlined">warning</div>
      <p className="text-white text-2xl font-black">{error || 'Session Expired'}</p>
      <Link to="/intellirev" className="bg-primary text-on-primary text-white px-8 py-4 rounded-full font-black shadow-lg shadow-violet-600/20">Start New Syllabus</Link>
    </div>
  )
}

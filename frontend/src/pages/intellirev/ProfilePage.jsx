import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase'

import { API } from '../../api';


function ConsistencyGrid({ activity }) {
  const weeks = 20
  const days = 7
  const today = new Date()

  const dateMap = {}
  ;(activity || []).forEach(a => { dateMap[a.date] = a.count })

  const cells = []
  for (let w = weeks - 1; w >= 0; w--) {
    const weekCells = []
    for (let d = 0; d < days; d++) {
      const date = new Date(today)
      date.setDate(today.getDate() - (w * 7 + (days - 1 - d)))
      const dateStr = date.toISOString().split('T')[0]
      const count = dateMap[dateStr] || 0
      weekCells.push({ dateStr, count })
    }
    cells.push(weekCells)
  }

  const getColor = (count) => {
    if (count === 0) return 'bg-white/5'
    if (count === 1) return 'bg-primary-dim/30'
    if (count === 2) return 'bg-primary-dim/50'
    if (count === 3) return 'bg-primary-dim/70'
    return 'bg-primary text-on-primary'
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        {cells.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map(({ dateStr, count }) => (
              <div
                key={dateStr}
                title={`${dateStr}: ${count} quiz${count !== 1 ? 'zes' : ''}`}
                className={`w-3 h-3 rounded-sm ${getColor(count)} hover:ring-1 hover:ring-primary transition-all cursor-default`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        Promise.allSettled([
          fetch(`${API}/intellirev/profile/${user.id}`).then(r => r.json()),
          fetch(`${API}/intellirev/leaderboard`).then(r => r.json()),
        ]).then(([profileRes, lbRes]) => {
          if (profileRes.status === 'fulfilled') setProfile(profileRes.value)
          else setProfile({
            user_id: user.id, total_score: 0, streak: 0,
            weak_topics: [], activity: [], revision_schedule: [],
          })
          if (lbRes.status === 'fulfilled') setLeaderboard(lbRes.value.leaderboard || [])
          setLoading(false)
        })
      } else {
        navigate('/login')
      }
    })
  }, [navigate])

  const displayProfile = profile || {
    user_id: user?.id || 'loading', total_score: 0, streak: 0,
    weak_topics: [],
    activity: [],
    revision_schedule: [],
  }

  const clsColor = (c) => c === 'strong' ? 'text-green-400' : c === 'medium' ? 'text-yellow-400' : 'text-red-400'
  const clsBg = (c) => c === 'strong' ? 'bg-green-500/10 border-green-500/20' : c === 'medium' ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20'
  const clsBar = (c) => c === 'strong' ? 'bg-green-500' : c === 'medium' ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="min-h-screen bg-background">
      <nav className="w-full top-0 sticky bg-background/95 backdrop-blur-xl z-50 border-b border-primary/10">
        <div className="flex justify-between items-center px-8 py-4 max-w-screen-xl mx-auto">
          <div className="flex items-center gap-2 text-xl font-bold tracking-tighter font-headline">
            <Link to="/" className="text-stone-400 hover:text-white transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
              Dashboard
            </Link>
            <span className="text-stone-700">/</span>
            <span className="text-primary">IntelliRev Profile</span>
          </div>
          <Link to="/" className="bg-primary hover:bg-primary-dim text-on-primary px-5 py-2 rounded-full text-sm font-bold transition-all hover:scale-95 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">dashboard</span> Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-screen-xl mx-auto px-8 py-10">
        <div className="mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-primary mb-1 block">IntelliRev</span>
          <h1 className="font-headline text-4xl font-extrabold text-white">
            {user?.user_metadata?.full_name || 'Student'}'s Learning Profile
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {}
          <div className="lg:col-span-2 space-y-6">
            {}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Score', value: displayProfile.total_score, icon: 'emoji_events', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
                { label: 'Day Streak', value: `${displayProfile.streak}🔥`, icon: 'local_fire_department', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
                { label: 'Weak Topics', value: displayProfile.weak_topics.filter(t => t.classification === 'weak').length, icon: 'warning', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                { label: 'Strong Topics', value: displayProfile.weak_topics.filter(t => t.classification === 'strong').length, icon: 'verified', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} border rounded-2xl p-5`}>
                  <span className={`material-symbols-outlined text-2xl ${s.color} mb-2 block`} style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                  <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-stone-500 uppercase tracking-wider mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {}
            <div className="bg-surface-container border border-primary/20 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>grid_view</span>
                    Consistency Grid
                  </h3>
                  <p className="text-stone-500 text-xs mt-0.5">Daily quiz activity — last 20 weeks</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-stone-600">
                  <span>Less</span>
                  {['bg-white/5', 'bg-primary-container/60', 'bg-violet-700/70', 'bg-primary-dim text-on-primary/80', 'bg-primary text-on-primary'].map(c => (
                    <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
                  ))}
                  <span>More</span>
                </div>
              </div>
              <div className="overflow-x-auto pb-2">
                <ConsistencyGrid activity={displayProfile.activity} />
              </div>
            </div>

            {}
            <div className="bg-surface-container border border-primary/20 rounded-2xl p-6">
              <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-400" style={{ fontVariationSettings: "'FILL' 1" }}>trending_down</span>
                Topic Mastery Overview
              </h3>
              {displayProfile.weak_topics.length === 0 ? (
                <p className="text-stone-500 italic text-sm">No topic data yet. Take some quizzes!</p>
              ) : (
                <div className="space-y-4">
                  {displayProfile.weak_topics.map(topic => (
                    <div key={topic.topic_id || topic.topic_name} className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white text-sm font-medium truncate">{topic.topic_name}</span>
                          <span className={`text-xs font-bold ${clsColor(topic.classification)}`}>{topic.classification.toUpperCase()}</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${clsBar(topic.classification)} rounded-full transition-all duration-700`}
                            style={{ width: `${topic.confidence_score}%` }}
                          />
                        </div>
                      </div>
                      <span className={`text-sm font-black w-10 text-right ${clsColor(topic.classification)}`}>
                        {Math.round(topic.confidence_score)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {}
          <div className="space-y-6">
            {}
            <div className="bg-surface-container border border-primary/20 rounded-2xl p-6">
              <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>event_repeat</span>
                Revision Schedule
              </h3>
              {displayProfile.revision_schedule.length === 0 ? (
                <p className="text-stone-500 italic text-sm">No revision scheduled. Take quizzes to trigger scheduling.</p>
              ) : (
                <div className="space-y-3">
                  {displayProfile.revision_schedule.slice(0, 5).map((r, i) => {
                    const date = new Date(r.next_revision)
                    const today = new Date()
                    const diffDays = Math.round((date - today) / 86400000)
                    const label = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : `In ${diffDays} days`
                    return (
                      <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${clsBg(r.classification)}`}>
                        <div>
                          <p className="text-white text-sm font-medium">{r.topic_name || `Topic ${i + 1}`}</p>
                          <p className={`text-xs font-bold ${clsColor(r.classification)}`}>{r.classification}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white text-sm font-bold">{label}</p>
                          <p className="text-stone-500 text-xs">{r.next_revision}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {}
            <div className="bg-surface-container border border-primary/20 rounded-2xl p-6">
              <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-yellow-400" style={{ fontVariationSettings: "'FILL' 1" }}>leaderboard</span>
                Leaderboard
              </h3>
              {leaderboard.length === 0 ? (
                <div className="space-y-3">
                  {[{ rank: 1, user_id: 'student_alpha', total_score: 520, streak: 12 },
                    { rank: 2, user_id: 'learner_bravo', total_score: 410, streak: 8 },
                    { rank: 3, user_id: 'guest_user_001', total_score: 320, streak: 5 }].map(e => (
                    <div key={e.user_id} className={`flex items-center gap-3 p-3 rounded-xl ${e.user_id === (user?.id || 'guest_user_001') ? 'bg-primary-dim text-on-primary/10 border border-primary/20' : 'bg-background border border-white/5'}`}>
                      <span className={`text-lg font-black w-8 text-center ${e.rank === 1 ? 'text-yellow-400' : e.rank === 2 ? 'text-stone-400' : 'text-orange-700'}`}>#{e.rank}</span>
                      <div className="flex-1">
                        <p className={`text-sm font-bold ${e.user_id === (user?.id || 'guest_user_001') ? 'text-primary' : 'text-white'}`}>{e.user_id}</p>
                        <p className="text-stone-500 text-xs">{e.streak}🔥 streak</p>
                      </div>
                      <span className="text-yellow-400 font-black">{e.total_score}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map(e => (
                    <div key={e.user_id} className={`flex items-center gap-3 p-3 rounded-xl ${e.user_id === (user?.id || 'guest_user_001') ? 'bg-primary-dim text-on-primary/10 border border-primary/20' : 'bg-background border border-white/5'}`}>
                      <span className={`text-lg font-black w-8 text-center ${e.rank === 1 ? 'text-yellow-400' : e.rank === 2 ? 'text-stone-400' : 'text-stone-600'}`}>#{e.rank}</span>
                      <div className="flex-1"><p className="text-sm font-bold text-white">{e.user_id}</p></div>
                      <span className="text-yellow-400 font-black">{e.total_score}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {}
            <div className="space-y-2">
              <Link to="/" className="flex items-center gap-3 bg-surface-container border border-white/5 hover:border-primary/30 text-stone-400 hover:text-white rounded-xl p-4 transition-all text-sm">
                <span className="material-symbols-outlined text-primary">dashboard</span>
                Main Dashboard
              </Link>
              <Link to="/intellirev/plan" className="flex items-center gap-3 bg-surface-container border border-white/5 hover:border-primary/30 text-stone-400 hover:text-white rounded-xl p-4 transition-all text-sm">
                <span className="material-symbols-outlined text-secondary">calendar_month</span>
                Study Plan
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

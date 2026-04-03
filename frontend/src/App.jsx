import { useEffect } from 'react'
import AOS from 'aos'
import 'aos/dist/aos.css'
import './index.css'
import { BrowserRouter, Routes, Route } from 'react-router'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import IntelliRevHome from './pages/intellirev/IntelliRevHome'
import StudyPlanPage from './pages/intellirev/StudyPlanPage'
import LearnPage from './pages/intellirev/LearnPage'
import QuizPage from './pages/intellirev/QuizPage'
import ProfilePage from './pages/intellirev/ProfilePage'

export default function App() {
  useEffect(() => {
    AOS.init({ duration: 800, once: true })
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/welcome" element={<LandingPage />} />
        <Route path="/intellirev/plan" element={<StudyPlanPage />} />
        <Route path="/intellirev/learn/:topicId" element={<LearnPage />} />
        <Route path="/intellirev/learn/:topicId" element={<LearnPage />} />
        <Route path="/intellirev/quiz/:topicId" element={<QuizPage />} />
        <Route path="/intellirev/profile" element={<ProfilePage />} />
      </Routes>
    </BrowserRouter>
  )
}

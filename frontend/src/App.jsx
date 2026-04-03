import { useEffect } from 'react'
import AOS from 'aos'
import 'aos/dist/aos.css'
import './index.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import StudyPlanPage from './pages/intellirev/StudyPlanPage'
import LearnPage from './pages/intellirev/LearnPage'
import QuizPage from './pages/intellirev/QuizPage'
import ProfilePage from './pages/intellirev/ProfilePage'
import FaultTreePage from './pages/FaultTreePage'
import KnowledgeDAGPage from './pages/KnowledgeDAGPage'
import BehaviorTreePage from './pages/BehaviorTreePage'
import SessionPage from './pages/SessionPage'
import RegisterPage from './pages/RegisterPage'
import LoginPage from './pages/LoginPage'
import QuizGeneratorPage from './pages/QuizGeneratorPage'

export default function App() {
  useEffect(() => {
    AOS.init({ duration: 800, once: true })
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/welcome" element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/intellirev/plan" element={<StudyPlanPage />} />
        <Route path="/intellirev/learn/:topicId" element={<LearnPage />} />
        <Route path="/intellirev/quiz/:topicId" element={<QuizPage />} />
        <Route path="/intellirev/profile" element={<ProfilePage />} />
        <Route path="/fault-tree-demo" element={<FaultTreePage />} />
        <Route path="/knowledge-dag" element={<KnowledgeDAGPage />} />
        <Route path="/behavior-tree" element={<BehaviorTreePage />} />
        <Route path="/session" element={<SessionPage />} />
        <Route path="/quiz-generator" element={<QuizGeneratorPage />} />
      </Routes>
    </BrowserRouter>
  )
}

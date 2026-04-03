import { useEffect } from 'react'
import AOS from 'aos'
import 'aos/dist/aos.css'
import './index.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import FaultTreePage from './pages/FaultTreePage'
import KnowledgeDAGPage from './pages/KnowledgeDAGPage'

export default function App() {
  useEffect(() => {
    AOS.init({ duration: 800, once: true })
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/fault-tree-demo" element={<FaultTreePage />} />
        <Route path="/knowledge-dag" element={<KnowledgeDAGPage />} />
      </Routes>
    </BrowserRouter>
  )
}

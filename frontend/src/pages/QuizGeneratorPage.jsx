import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function QuizGeneratorPage() {
  const [activeTab, setActiveTab] = useState('pdf')
  const [linkInput, setLinkInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const navigate = useNavigate()

  // Dummy existing resources (the "Notebooks")
  const [resources, setResources] = useState([
    { id: 1, type: 'pdf', name: 'Algebra 1 - Quadratic Equations', date: '2 days ago', selected: true },
    { id: 2, type: 'youtube', name: 'Factoring Polynomials Overview', date: '5 days ago', selected: false },
    { id: 3, type: 'pdf', name: 'Functions and Identities Worksheet', date: '1 week ago', selected: false },
  ])

  // Context for main view
  const [showAddNew, setShowAddNew] = useState(false)

  const toggleResource = (id) => {
    setResources(resources.map(r => r.id === id ? { ...r, selected: !r.selected } : r))
  }

  const handleAddSource = (e) => {
    e.preventDefault()
    if (activeTab === 'youtube' && !linkInput) return

    const newResource = {
      id: Date.now(),
      type: activeTab,
      name: activeTab === 'pdf' ? 'New Uploaded Document' : 'Imported YouTube Video',
      date: 'Just now',
      selected: true
    }

    setResources([newResource, ...resources])
    setShowAddNew(false)
    setLinkInput('')
  }

  const handleGenerate = () => {
    setIsGenerating(true)
    // Simulate generation time
    setTimeout(() => {
      navigate('/quiz')
    }, 2000)
  }

  const selectedCount = resources.filter(r => r.selected).length

  return (
    <div className="min-h-screen flex flex-col bg-[#0e0e0e] text-on-surface">
      {/* TopAppBar */}
      <nav className="w-full top-0 sticky bg-[#0e0e0e]/95 backdrop-blur-xl z-50 border-b border-white/5">
        <div className="flex justify-between items-center px-8 py-4 max-w-screen-2xl mx-auto">
          <Link to="/" className="text-2xl font-bold tracking-tighter text-primary font-headline">Episteme</Link>
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-stone-400 hover:text-stone-100 transition-colors text-sm font-medium">Dashboard</Link>
            <button className="bg-primary text-on-primary font-bold px-5 py-2 rounded-full hover:scale-95 transition-all duration-200 text-sm">
              Profile
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-screen-2xl mx-auto px-4 md:px-8 py-8 flex-grow w-full grid grid-cols-1 md:grid-cols-12 gap-8 relative">
        
        {/* Left Sidebar - Knowledge Sources */}
        <section className="md:col-span-4 lg:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-2xl">library_books</span>
              <h2 className="text-xl font-bold font-headline">Sources</h2>
            </div>
            <button 
              onClick={() => setShowAddNew(true)}
              className="bg-surface-container-high hover:bg-surface-variant text-on-surface p-2 rounded-full transition-colors flex items-center justify-center shrink-0 border border-outline-variant/10 shadow-sm"
              title="Add New Source"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
            </button>
          </div>
          
          <div className="space-y-3 flex-grow overflow-y-auto pr-2 pb-10">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 mt-4">Active Knowledge Base</p>
            {resources.map(res => (
              <div 
                key={res.id} 
                onClick={() => toggleResource(res.id)}
                className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                  res.selected 
                  ? 'bg-primary/10 border-primary/50 ring-1 ring-primary/30 shadow-[0_4px_20px_rgba(255,143,111,0.05)]' 
                  : 'bg-surface-container border-outline-variant/5 hover:border-outline-variant/20 hover:bg-surface-container-high'
                }`}
              >
                <div className="flex gap-4">
                  <div className={`mt-0.5 ${res.selected ? 'text-primary' : 'text-stone-500'}`}>
                    <span className="material-symbols-outlined">
                      {res.type === 'pdf' ? 'picture_as_pdf' : 'smart_display'}
                    </span>
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className={`text-sm font-bold leading-tight mb-1 truncate ${res.selected ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                      {res.name}
                    </p>
                    <p className="text-xs text-stone-500">{res.date}</p>
                  </div>
                  <div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                      res.selected ? 'bg-primary border-primary text-on-primary' : 'border-outline-variant/30'
                    }`}>
                      {res.selected && <span className="material-symbols-outlined text-[14px]">check</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right Main Area */}
        <section className="md:col-span-8 lg:col-span-9 flex flex-col">
          {showAddNew ? (
            <div className="bg-surface-container rounded-3xl p-8 lg:p-12 shadow-2xl relative overflow-hidden" data-aos="fade-in">
              <div className="flex justify-between items-start mb-10 relative z-10">
                <div>
                  <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight font-headline mb-2">Ingest New Resource</h1>
                  <p className="text-on-surface-variant">Add a document or lecture to your knowledge base to generate quizzes.</p>
                </div>
                <button 
                  onClick={() => setShowAddNew(false)}
                  className="bg-surface-container-lowest hover:bg-surface-variant p-2 rounded-full transition-colors text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Tabs */}
              <div className="flex bg-surface-container-low rounded-2xl p-1 mb-8 relative z-10 w-full max-w-md">
                <button 
                  onClick={() => setActiveTab('pdf')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'pdf' ? 'bg-surface-container-highest text-on-surface shadow-md' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
                  Upload PDF
                </button>
                <button 
                  onClick={() => setActiveTab('youtube')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'youtube' ? 'bg-surface-container-highest text-on-surface shadow-md' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  <span className="material-symbols-outlined text-[20px]">smart_display</span>
                  YouTube Link
                </button>
              </div>

              <form onSubmit={handleAddSource} className="relative z-10 max-w-2xl">
                {activeTab === 'pdf' ? (
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-outline-variant/30 rounded-2xl p-12 mb-8 bg-surface-container-lowest/50 hover:bg-surface-container-lowest transition-colors group cursor-pointer">
                    <div className="bg-primary/10 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
                      <span className="material-symbols-outlined text-4xl text-primary">cloud_upload</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2">Drag & Drop your document here</h3>
                    <p className="text-stone-500 text-sm mb-6 text-center">Supported formats: PDF, DOCX, TXT. Max: 50MB.</p>
                    <button type="button" className="bg-surface-variant text-on-surface px-6 py-2 rounded-full font-medium hover:bg-surface-container-highest transition-colors">
                      Browse Files
                    </button>
                  </div>
                ) : (
                  <div className="mb-8 p-6 bg-surface-container-lowest/50 rounded-2xl border border-white/5">
                    <label className="block text-sm font-bold mb-3 text-on-surface-variant">Enter YouTube Video URL</label>
                    <div className="flex items-center bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                      <span className="material-symbols-outlined text-stone-500 mr-3">link</span>
                      <input 
                        type="url" 
                        value={linkInput}
                        onChange={(e) => setLinkInput(e.target.value)}
                        required
                        placeholder="https://www.youtube.com/watch?v=..." 
                        className="bg-transparent border-none w-full focus:outline-none text-on-surface placeholder:text-stone-600"
                      />
                    </div>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={activeTab === 'youtube' && !linkInput}
                  className="bg-secondary text-on-secondary px-8 py-3 rounded-full font-bold hover:scale-[0.98] transition-transform flex items-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                >
                  <span className="material-symbols-outlined">add_task</span>
                  Ingest to Knowledge Base
                </button>
              </form>
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center h-full rounded-3xl relative" data-aos="fade-in">
              <div className="absolute inset-0 bg-gradient-radial from-primary/5 to-transparent pointer-events-none opacity-50"></div>
              
              <div className="text-center max-w-xl z-10 px-6">
                <div className="inline-flex items-center justify-center p-5 bg-surface-container-low rounded-3xl mb-8 shadow-inner relative">
                  <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full"></div>
                  <span className="material-symbols-outlined text-6xl text-primary relative z-10">model_training</span>
                  
                  {/* Floating selected counts */}
                  {selectedCount > 0 && (
                    <div className="absolute -top-3 -right-3 bg-secondary text-on-secondary w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-xl z-20 animate-bounce">
                      {selectedCount}
                    </div>
                  )}
                </div>

                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight font-headline mb-4">
                  {selectedCount > 0 ? 'Ready to Synthesize' : 'Select Sources to Begin'}
                </h1>
                
                <p className="text-on-surface-variant text-lg mb-10 leading-relaxed">
                  {selectedCount > 0 
                    ? `You've selected ${selectedCount} resource${selectedCount > 1 ? 's' : ''}. Episteme will cross-reference these materials to generate a highly diagnostic fault-tree quiz.`
                    : 'Choose existing materials from your Knowledge Base on the left, or add a new resource to generate a quiz.'}
                </p>

                <button 
                  onClick={handleGenerate}
                  disabled={selectedCount === 0 || isGenerating}
                  className="bg-primary text-on-primary px-10 py-5 rounded-2xl font-bold text-lg hover:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:scale-100 group w-full max-w-sm mx-auto shadow-[0_10px_40px_rgba(255,143,111,0.3)] disabled:shadow-none"
                >
                  {isGenerating ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-2xl">refresh</span>
                      Initializing Episteme Engine...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-2xl group-hover:rotate-12 transition-transform">magic_button</span>
                      Generate Knowledge Quiz
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

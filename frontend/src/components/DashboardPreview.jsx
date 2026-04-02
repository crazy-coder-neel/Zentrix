import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import DashboardDAG from './DashboardDAG'
import styles from './DashboardPreview.module.css'

function AnimatedCounter({ target, suffix = '' }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const animated = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true
          let start = 0
          const duration = 1500
          const startTime = performance.now()
          const step = (now) => {
            const elapsed = now - startTime
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.round(eased * target))
            if (progress < 1) requestAnimationFrame(step)
          }
          requestAnimationFrame(step)
        }
      },
      { threshold: 0.5 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target])

  return <span ref={ref}>{count}{suffix}</span>
}

export default function DashboardPreview() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.grid}>
          {/* Left Column */}
          <div className={styles.left}>
            {/* Welcome Card */}
            <motion.div
              className={styles.welcomeCard}
              data-aos="fade-up"
              whileHover={{ borderColor: 'rgba(124, 92, 252, 0.3)' }}
            >
              <div className={styles.statusBadge}>
                <span className={styles.statusDot} />
                System Online
              </div>
              <h2 className={styles.welcomeTitle}>
                Welcome back, <span className={styles.gradientName}>Alex.</span>
              </h2>
              <p className={styles.welcomeText}>
                The algebra engine has identified 3 new logical pathways for your
                current mastery trajectory. Ready to ascend?
              </p>
              <div className={styles.welcomeActions}>
                <motion.button
                  className={styles.btnPrimary}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Resume session
                </motion.button>
                <motion.button
                  className={styles.btnOutline}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  View Archive
                </motion.button>
              </div>
            </motion.div>

            {/* DAG Card */}
            <motion.div className={styles.dagCard} data-aos="fade-up" data-aos-delay="150">
              <div className={styles.dagHeader}>
                <div>
                  <h3 className={styles.dagTitle}>Knowledge DAG</h3>
                  <span className={styles.dagSub}>Active Session: Logic Path (Quadratic Reciprocity)</span>
                </div>
                <div className={styles.dagIcon}>⟁</div>
              </div>

              {/* Interactive DAG Visualization */}
              <div className={styles.dagViz}>
                <DashboardDAG />
              </div>

              <div className={styles.dagFooter}>
                <div className={styles.dagCoins}>
                  <span className={styles.coin} style={{ background: '#7c5cfc' }}>C</span>
                  <span className={styles.coin} style={{ background: '#06d6a0', marginLeft: '-8px' }}>O</span>
                  <span className={styles.coin} style={{ background: '#4ea8de', marginLeft: '-8px' }}>I</span>
                  <span className={styles.coin} style={{ background: '#f59e0b', marginLeft: '-8px' }}>N</span>
                </div>
                <div>
                  <span className={styles.dagLabel}>Complexity</span>
                  <span className={styles.dagValue}>Level 07 / Transcendental</span>
                </div>
                <motion.button
                  className={styles.expandBtn}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Expand Path
                </motion.button>
              </div>
            </motion.div>
          </div>

          {/* Right Column */}
          <div className={styles.right}>
            {/* Mastery Ring Card */}
            <motion.div className={styles.masteryCard} data-aos="fade-left">
              <h3 className={styles.masteryTitle}>Mastery Archetypes</h3>
              <span className={styles.masterySub}>Cognitive alignment visualization</span>

              <div className={styles.ringWrap}>
                <svg className={styles.ringSvg} viewBox="0 0 160 160">
                  <defs>
                    <linearGradient id="masteryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#7c5cfc" />
                      <stop offset="100%" stopColor="#06d6a0" />
                    </linearGradient>
                  </defs>
                  <circle cx="80" cy="80" r="65" fill="none" stroke="rgba(124, 92, 252, 0.1)" strokeWidth="12" />
                  <circle
                    cx="80" cy="80" r="65"
                    fill="none"
                    stroke="url(#masteryGrad)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray="408"
                    strokeDashoffset="102"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                  />
                </svg>
                <div className={styles.ringText}>
                  <span className={styles.ringPercent}><AnimatedCounter target={75} suffix="%" /></span>
                  <span className={styles.ringLabel}>INTUITION</span>
                </div>
              </div>

              <div className={styles.statsGrid}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Logic</span>
                  <span className={`${styles.statValue} ${styles.statBlue}`}>
                    <AnimatedCounter target={89} />
                  </span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Velocity</span>
                  <span className={`${styles.statValue} ${styles.statCyan}`}>
                    <AnimatedCounter target={94} />
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Neural Sync Card */}
            <motion.div
              className={styles.neuralCard}
              data-aos="fade-left"
              data-aos-delay="100"
              whileHover={{ y: -4, borderColor: 'rgba(124, 92, 252, 0.3)' }}
            >
              <div className={styles.neuralIcon}>🧠</div>
              <div>
                <h4 className={styles.neuralTitle}>Neural Sync</h4>
                <p className={styles.neuralDesc}>The engine is ready for a Spaced Revision session.</p>
                <a href="#" className={styles.neuralLink}>Start Now →</a>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}

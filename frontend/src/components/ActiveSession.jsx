import { motion } from 'framer-motion'
import { HiArrowRight } from 'react-icons/hi2'
import styles from './ActiveSession.module.css'

const codeLines = [
  { num: '01', content: <><span className="syn-kw">import</span> Episteme.Logic.Roots</> },
  { num: '02', content: <><span className="syn-cm">// Analyze the discriminatory function</span></> },
  { num: '03', content: <><span className="syn-kw">fn</span> <span className="syn-fn">resolve_complex</span>(a, b, c) {'{'}</> },
  { num: '04', content: <>&nbsp;&nbsp;<span className="syn-kw">let</span> delta = b**2 - 4*a*c;</> },
  { num: '05', content: <>&nbsp;&nbsp;<span className="syn-kw">return</span> delta.<span className="syn-fn">as_imaginary</span>();</> },
  { num: '06', content: <>{'}'}</> },
]

const trajectoryItems = [
  { icon: 'Σ', name: 'Multivariate Calculus', meta: 'Completed 2 hours ago • A+', accent: 'purple' },
  { icon: '#', name: 'Linear Transformations', meta: 'Completed yesterday • B+', accent: 'blue' },
  { icon: '{ }', name: 'Boolean Logic Trees', meta: 'Completed 2 days ago • A', accent: 'cyan' },
]

export default function ActiveSession() {
  return (
    <section className={styles.section} id="practice">
      <div className={styles.container}>
        <div className={styles.sectionHeader} data-aos="fade-up">
          <h2 className={styles.sectionTitle}>Active Session</h2>
          <div className={styles.headerTags}>
            <span className={styles.tagBlue}>v3.4.1</span>
            <span className={styles.tagCyan}>Experimental</span>
          </div>
        </div>

        <div className={styles.grid}>
          {/* Code Editor */}
          <motion.div
            className={styles.codeCard}
            data-aos="fade-right"
            whileHover={{ borderColor: 'rgba(124, 92, 252, 0.3)' }}
          >
            <div className={styles.codeHeader}>
              <div className={styles.codeHeaderLeft}>
                <div className={styles.dots}>
                  <span className={styles.dotRed} />
                  <span className={styles.dotYellow} />
                  <span className={styles.dotGreen} />
                </div>
                <span className={styles.fileName}>SOLVER.QUADRATIC.ALPHA.LOGIC</span>
              </div>
              <span className={styles.copyBtn}>📋</span>
            </div>

            <div className={styles.codeBody}>
              {codeLines.map((line) => (
                <div key={line.num} className={styles.codeLine}>
                  <span className={styles.lineNum}>{line.num}</span>
                  <span className={styles.lineContent}>{line.content}</span>
                </div>
              ))}
            </div>

            <div className={styles.codeFooter}>
              <motion.button
                className={styles.executeBtn}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                ▶ Execute Logic
              </motion.button>
            </div>
          </motion.div>

          {/* Right Panel */}
          <div className={styles.rightPanel}>
            {/* Trajectory */}
            <motion.div
              className={styles.trajectoryCard}
              data-aos="fade-left"
            >
              <div className={styles.trajectoryHeader}>
                <h3 className={styles.trajectoryTitle}>Recent Trajectory</h3>
                <a href="#" className={styles.fullHistory}>Full History</a>
              </div>
              {trajectoryItems.map((item) => (
                <motion.div
                  key={item.name}
                  className={styles.trajectoryItem}
                  whileHover={{ x: 6 }}
                >
                  <div className={`${styles.trajectoryIcon} ${styles[item.accent]}`}>
                    {item.icon}
                  </div>
                  <div className={styles.trajectoryContent}>
                    <span className={styles.trajectoryName}>{item.name}</span>
                    <span className={styles.trajectoryMeta}>{item.meta}</span>
                  </div>
                  <HiArrowRight className={styles.trajectoryArrow} />
                </motion.div>
              ))}
            </motion.div>

            {/* Revision */}
            <motion.div
              className={styles.revisionCard}
              data-aos="fade-left"
              data-aos-delay="150"
              whileHover={{ y: -4 }}
            >
              <h4 className={styles.revisionTitle}>Upcoming Spaced Revision</h4>
              <p className={styles.revisionDesc}>
                Targeting "Elliptic Curves" in 14 minutes. Focus on modularity theorem.
              </p>
              <div className={styles.progressBar}>
                <motion.div
                  className={styles.progressFill}
                  initial={{ width: 0 }}
                  whileInView={{ width: '65%' }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}

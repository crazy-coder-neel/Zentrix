import { motion } from 'framer-motion'
import styles from './Hero.module.css'

export default function Hero() {
  return (
    <section className={styles.hero} id="dashboard">
      {/* Background effects */}
      <div className={styles.grid} />
      <div className={`${styles.orb} ${styles.orbPurple}`} />
      <div className={`${styles.orb} ${styles.orbCyan}`} />

      <div className={styles.container}>
        <motion.div
          className={styles.badge}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <span className={styles.badgeDot} />
          System Online
        </motion.div>

        <motion.h1
          className={styles.title}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          <span className={styles.titleLine}>Diagnose.</span>
          <span className={styles.titleLine}>Understand.</span>
          <span className={`${styles.titleLine} ${styles.titleGradient}`}>Master.</span>
        </motion.h1>

        <motion.p
          className={styles.subtitle}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.7 }}
        >
          Harness the power of the Episteme Engine to decode complex
          structures and illuminate your path to absolute mastery.
        </motion.p>

        <motion.div
          className={styles.cta}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
        >
          <motion.a
            href="#practice"
            className={styles.btnPrimary}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            Initiate Diagnosis
          </motion.a>
          <motion.a
            href="#features"
            className={styles.btnSecondary}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            Explore Engine
          </motion.a>
        </motion.div>

        <motion.div
          className={styles.scroll}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
        >
          <span>Scroll</span>
          <div className={styles.scrollLine} />
        </motion.div>
      </div>
    </section>
  )
}

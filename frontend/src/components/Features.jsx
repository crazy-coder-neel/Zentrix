import { motion } from 'framer-motion'
import { HiOutlineMap, HiOutlineSparkles, HiOutlineCpuChip } from 'react-icons/hi2'
import styles from './Features.module.css'

const features = [
  {
    icon: <HiOutlineMap size={24} />,
    title: 'Cognitive Mapping',
    desc: 'Advanced algorithms visualize the architecture of your thought processes and knowledge gaps.',
    accent: 'purple',
  },
  {
    icon: <HiOutlineSparkles size={24} />,
    title: 'Dynamic Synthesis',
    desc: 'Real-time cross-referencing of millions of data points to build comprehensive logic trees.',
    accent: 'cyan',
  },
  {
    icon: <HiOutlineCpuChip size={24} />,
    title: 'Neural Feedback',
    desc: 'An adaptive learning interface that responds to your actions and engagement to reveal mastery priorities.',
    accent: 'blue',
  },
]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
}

const item = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } },
}

export default function Features() {
  return (
    <section className={styles.section} id="features">
      <div className={styles.container}>
        <div data-aos="fade-up" className={styles.header}>
          <span className={styles.overline}>The Engine</span>
          <h2 className={styles.title}>Powered by Structured Intelligence</h2>
          <p className={styles.subtitle}>No black-box AI — every decision is explainable, deterministic, and traceable.</p>
        </div>

        <motion.div
          className={styles.grid}
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              className={styles.card}
              variants={item}
              whileHover={{ y: -8, borderColor: 'rgba(124, 92, 252, 0.3)' }}
            >
              <div className={`${styles.icon} ${styles[f.accent]}`}>{f.icon}</div>
              <h3 className={styles.cardTitle}>{f.title}</h3>
              <p className={styles.cardDesc}>{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

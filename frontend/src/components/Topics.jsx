import { motion } from 'framer-motion'
import { HiArrowRight } from 'react-icons/hi2'
import styles from './Topics.module.css'

const topics = [
  {
    title: 'Quadratic Equations',
    desc: 'Decoding the non-linear connections of factorization, roots & the discriminant.',
    tags: ['Algebra', 'Core'],
    accent: 'purple',
    span: 'large',
  },
  {
    title: 'Algebraic Identities',
    desc: 'Cracking the hidden patterns of expansion & simplification.',
    tags: ['Identities'],
    accent: 'blue',
    span: 'medium',
  },
  {
    title: 'Function Composition',
    desc: 'Explore domain & range through composite and inverse functions.',
    tags: ['Functions'],
    accent: 'cyan',
    span: 'medium',
  },
  {
    title: 'Polynomial Division',
    desc: 'Predictive modelling for factor theorem and remainder analysis.',
    tags: ['Advanced'],
    accent: 'warning',
    span: 'small',
  },
  {
    title: 'Linear Inequalities',
    desc: 'Designing constraint pathways for solution sets on number lines.',
    tags: ['Foundations'],
    accent: 'cyan',
    span: 'small',
    difficulty: 'Intermediate',
  },
]

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.4, 0, 0.2, 1] },
  }),
}

export default function Topics() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <span className={styles.overline} data-aos="fade-up">The Database</span>
            <h2 className={styles.title} data-aos="fade-up" data-aos-delay="100">Topics Decoded</h2>
          </div>
          <a href="#" className={styles.viewAll} data-aos="fade-left">
            View All Archives <HiArrowRight />
          </a>
        </div>

        <motion.div
          className={styles.grid}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
        >
          {topics.map((t, i) => (
            <motion.div
              key={t.title}
              className={`${styles.card} ${styles[t.span]}`}
              custom={i}
              variants={cardVariants}
              whileHover={{ y: -6, borderColor: 'rgba(124, 92, 252, 0.3)' }}
            >
              <div className={styles.cardContent}>
                <div className={styles.tags}>
                  {t.tags.map(tag => (
                    <span key={tag} className={`${styles.tag} ${styles[`tag${t.accent}`]}`}>
                      {tag}
                    </span>
                  ))}
                </div>
                <h3 className={styles.cardTitle}>{t.title}</h3>
                <p className={styles.cardDesc}>{t.desc}</p>
                {t.difficulty && (
                  <span className={styles.difficulty}>⚡ {t.difficulty}</span>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

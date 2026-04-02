import { useState } from 'react'
import { motion } from 'framer-motion'
import styles from './CTASection.module.css'

export default function CTASection() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (email.trim()) {
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 3000)
      setEmail('')
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <motion.div
          className={styles.box}
          data-aos="fade-up"
          whileHover={{ borderColor: 'rgba(124, 92, 252, 0.3)' }}
        >
          <div className={styles.glow} />
          <h2 className={styles.title}>Diagnose Your Root Causes.</h2>
          <p className={styles.desc}>
            Receive weekly insights from the deterministic intelligent tutoring system.
          </p>
          <form className={styles.form} onSubmit={handleSubmit}>
            <input
              type="email"
              className={styles.input}
              placeholder="Enter your identity construct…"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <motion.button
              type="submit"
              className={styles.btn}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {submitted ? '✓ Subscribed' : 'Subscribe'}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </section>
  )
}

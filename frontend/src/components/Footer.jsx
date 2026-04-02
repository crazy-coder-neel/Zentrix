import { motion } from 'framer-motion'
import { HiOutlineShare } from 'react-icons/hi2'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <span className={styles.logo}>Episteme</span>
          <span className={styles.copyright}>© 2024 EPISTEME. ALGEBRA MISCONCEPTION ROOT-CAUSE ENGINE.</span>
        </div>

        <div className={styles.links}>
          {['API'].map((link) => (
            <a key={link} href="#" className={styles.link}>{link}</a>
          ))}
        </div>

        <div className={styles.socials}>
          <motion.a
            href="#"
            className={styles.social}
            whileHover={{ y: -2, borderColor: 'rgba(124, 92, 252, 0.3)' }}
          >
            <HiOutlineShare size={16} />
          </motion.a>
          <motion.a
            href="#"
            className={styles.social}
            whileHover={{ y: -2, borderColor: 'rgba(124, 92, 252, 0.3)' }}
          >
            ◆
          </motion.a>
        </div>
      </div>
    </footer>
  )
}

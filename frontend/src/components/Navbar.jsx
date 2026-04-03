import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiOutlineBell, HiOutlineSearch } from 'react-icons/hi'
import { supabase } from '../supabase'
import styles from './Navbar.module.css'

export default function Navbar() {
  const [user, setUser] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = ['Dashboard', 'Learning Graph', 'Fault Trees', 'Heatmap']

  return (
    <>
      <motion.nav
        className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className={styles.container}>
          <a href="/" className={styles.logo}>
            <img src="/logo.png" alt="Episteme Logo" className="h-8 w-auto mr-2" />
            <span className="font-extrabold tracking-tighter">Episteme</span>
          </a>

          <ul className={styles.links}>
            {links.map((link, i) => (
              <li key={link}>
                <a
                  href={`#${link.toLowerCase()}`}
                  className={`${styles.link} ${i === 0 ? styles.active : ''}`}
                >
                  {link}
                </a>
              </li>
            ))}
          </ul>

          <div className={styles.actions}>
            <button className={styles.iconBtn} aria-label="Notifications">
              <HiOutlineBell size={18} />
            </button>
            <div className={styles.avatar}>
              {user?.user_metadata?.full_name?.[0].toUpperCase() || user?.email?.[0].toUpperCase() || 'S'}
            </div>
          </div>

          <button
            className={styles.hamburger}
            onClick={() => setMobileOpen(true)}
            aria-label="Menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </motion.nav>

      {}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className={styles.mobileNav}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <button className={styles.mobileClose} onClick={() => setMobileOpen(false)}>✕</button>
            {links.map((link) => (
              <motion.a
                key={link}
                href={`#${link.toLowerCase()}`}
                className={styles.mobileLink}
                onClick={() => setMobileOpen(false)}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {link}
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

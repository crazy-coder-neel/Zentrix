import { memo } from 'react'
import styles from './AnimatedBackground.module.css'

function AnimatedBackground() {
  return (
    <div className={styles.container}>
      <div className={styles.gradients}>
        <div className={styles.glowPeach} />
        <div className={styles.glowPurple} />
        <div className={styles.glowNavy} />
      </div>
    </div>
  )
}

export default memo(AnimatedBackground)

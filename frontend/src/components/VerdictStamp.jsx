import { AnimatePresence, motion } from 'framer-motion'
import { VC } from '../lib/trace'

export default function VerdictStamp({ verdict, note, size = 'md' }) {
  const color = verdict ? VC[verdict] : '#e8e4d8'
  const fontSize = size === 'lg' ? 27 : 24
  const padding = size === 'lg' ? '8px 18px' : '7px 16px'

  return (
    <AnimatePresence>
      {verdict ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-wrap items-center gap-4"
        >
          <div className="relative inline-flex">
            <motion.span
              initial={{ opacity: 0.5, scale: 0.35 }}
              animate={{ opacity: 0, scale: 2.1 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="absolute -inset-1.5 rounded"
              style={{ border: `2px solid ${color}` }}
            />
            <motion.span
              initial={{ opacity: 0, scale: 2.3, rotate: -11 }}
              animate={{ opacity: 1, scale: [2.3, 0.9, 1.05, 0.99, 1], rotate: [-11, -2, -3, -2, -2.2] }}
              transition={{ duration: 0.5, times: [0, 0.52, 0.7, 0.86, 1], ease: [0.2, 1.3, 0.4, 1] }}
              className="rounded font-display font-extrabold tracking-tight"
              style={{ fontSize, padding, border: `3px solid ${color}`, color }}
            >
              {verdict}
            </motion.span>
          </div>
          {note ? (
            <div className="min-w-[200px] flex-1 font-mono text-xs leading-relaxed text-cream/60 break-words">
              {note}
            </div>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

import { motion } from 'framer-motion'

export default function Reveal({ children, className = '', ...rest }) {
  return (
    <motion.div
      initial={{ opacity: 0.16, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

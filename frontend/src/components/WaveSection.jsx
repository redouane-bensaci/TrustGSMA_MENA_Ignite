import { useEffect, useRef } from 'react'

// Wraps a <section>, reporting `mode` to the parent whenever this section
// becomes the most-visible one in the viewport (drives the ambient wave).
export default function WaveSection({ mode = 'calm', label, onEnter, className = '', children, ...rest }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !window.IntersectionObserver) return
    const io = new IntersectionObserver(
      (ents) => {
        ents.forEach((e) => {
          if (e.isIntersecting) onEnter?.(mode)
        })
      },
      { threshold: [0.2, 0.5, 0.8] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [mode, onEnter])

  return (
    <section ref={ref} data-screen-label={label} className={className} {...rest}>
      {children}
    </section>
  )
}

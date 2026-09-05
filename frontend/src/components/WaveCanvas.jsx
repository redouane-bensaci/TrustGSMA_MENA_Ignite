import { useEffect, useRef } from 'react'

// Ambient vertical waveform down the left rail. `mode` drives amplitude,
// color hue and jaggedness; the values ease toward their target every frame.
export default function WaveCanvas({ mode = 'calm' }) {
  const canvasRef = useRef(null)
  const stateRef = useRef({ target: 0.42, cur: 0.42, hue: 0, hueCur: 0, jag: 0, jagCur: 0 })
  const rafRef = useRef(null)
  const sizeRef = useRef({ w: 0, h: 0 })

  useEffect(() => {
    const w = stateRef.current
    if (mode === 'alert') {
      w.target = 1
      w.hue = 1
      w.jag = 0.55
    } else if (mode === 'watch') {
      w.target = 0.7
      w.hue = 0.5
      w.jag = 0.18
    } else {
      w.target = 0.4
      w.hue = 0
      w.jag = 0
    }
  }, [mode])

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')

    const onResize = () => {
      const r = cv.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      cv.width = Math.max(1, Math.round(r.width * dpr))
      cv.height = Math.max(1, Math.round(r.height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      sizeRef.current = { w: r.width, h: r.height }
    }
    onResize()
    window.addEventListener('resize', onResize)

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw)
      const { w, h } = sizeRef.current
      if (w < 6) return
      const wv = stateRef.current
      wv.cur += (wv.target - wv.cur) * 0.05
      wv.hueCur += (wv.hue - wv.hueCur) * 0.05
      wv.jagCur += (wv.jag - wv.jagCur) * 0.05
      ctx.clearRect(0, 0, w, h)
      const cx = w * 0.56
      ctx.fillStyle = 'rgba(28,26,20,0.06)'
      for (let y = 0; y < h; y += 22) ctx.fillRect(cx - w * 0.22, y, w * 0.44, 1)
      ctx.strokeStyle = 'rgba(28,26,20,0.12)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(cx, 0)
      ctx.lineTo(cx, h)
      ctx.stroke()
      const t = performance.now() / 1000
      const amp = wv.cur * (w * 0.34)
      const g = wv.hueCur
      const r = Math.round(47 + (178 - 47) * g)
      const gg = Math.round(109 + (58 - 109) * g)
      const b = Math.round(81 + (42 - 81) * g)
      ctx.strokeStyle = `rgba(${r},${gg},${b},0.85)`
      ctx.lineWidth = 1.7
      ctx.beginPath()
      for (let y = 0; y <= h; y += 2) {
        const p = y * 0.055 + t * 1.5
        let v = Math.sin(p) * 0.5 + Math.sin(p * 2.31 + 1.1) * 0.26
        if (wv.jagCur > 0.01) v += (Math.sin(p * 11.7) * 0.5 + Math.sin(p * 23.3 + 2) * 0.34) * wv.jagCur
        const x = cx + v * amp
        if (y === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', onResize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed top-0 left-0 z-5 h-screen"
      style={{ width: 'clamp(0px, calc(7.5vw - 22px), 66px)' }}
    />
  )
}

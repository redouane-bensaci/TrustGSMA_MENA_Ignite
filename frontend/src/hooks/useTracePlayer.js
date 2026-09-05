import { useCallback, useRef, useState } from 'react'
import gsap from 'gsap'
import { KIND } from '../lib/trace'

// Plays a list of trace steps (THINK/CALL/OBSERVE/FLAG) into `lines`,
// typing each line's text character by character and accumulating spent
// units. Uses GSAP delayedCall for pacing so speed can be scaled globally.
export function useTracePlayer(speed = 1) {
  const [lines, setLines] = useState([])
  const [units, setUnits] = useState(0)
  const genRef = useRef(0)
  const tlRef = useRef(null)

  const stop = useCallback(() => {
    genRef.current += 1
    if (tlRef.current) tlRef.current.kill()
  }, [])

  const play = useCallback(
    (steps) =>
      new Promise((resolve) => {
        const gen = ++genRef.current
        if (tlRef.current) tlRef.current.kill()
        const isCurrent = () => gen === genRef.current
        let curLines = []
        let curUnits = 0
        setLines([])
        setUnits(0)

        const tl = gsap.timeline({
          onComplete: () => {
            if (isCurrent()) resolve({ lines: curLines, units: curUnits })
          },
        })
        tlRef.current = tl

        const sc = (ms) => Math.max(1, ms / Math.max(0.4, speed)) / 1000

        steps.forEach((s) => {
          tl.call(
            () => {
              if (!isCurrent()) return
              const k = KIND[s.kind]
              curLines = curLines.concat([{ kind: s.kind, text: '', bg: k.bg, fg: k.fg, color: k.color, caret: true }])
              setLines(curLines)
            },
            null,
            `+=${sc(s.pre || 260)}`,
          )

          const full = s.text
          for (let i = 0; i < full.length; i += 2) {
            tl.call(
              () => {
                if (!isCurrent()) return
                const next = curLines.slice()
                next[next.length - 1] = { ...next[next.length - 1], text: full.slice(0, i + 2), caret: true }
                curLines = next
                setLines(curLines)
              },
              null,
              `+=${sc(11)}`,
            )
          }
          tl.call(
            () => {
              if (!isCurrent()) return
              const next = curLines.slice()
              next[next.length - 1] = { ...next[next.length - 1], text: full, caret: false }
              curLines = next
              setLines(curLines)
            },
            null,
            '+=0',
          )

          if (s.cost) {
            for (let c = 0; c < s.cost; c++) {
              tl.call(
                () => {
                  if (!isCurrent()) return
                  curUnits += 1
                  setUnits(curUnits)
                },
                null,
                `+=${sc(150)}`,
              )
            }
          }
        })
      }),
    [speed],
  )

  return { lines, units, play, stop }
}

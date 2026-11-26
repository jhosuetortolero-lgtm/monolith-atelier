/**
 * Integração Lenis + GSAP ScrollTrigger.
 *
 * O Lenis suaviza a roda do mouse/trackpad no desktop; no toque (iOS/Android) o scroll é o nativo do
 * sistema — com a inércia física que o usuário já conhece — e o motor do canvas aplica a própria inércia.
 * O gsap.ticker (requestAnimationFrame) dirige o Lenis; o ScrollTrigger mede o progresso do trilho
 * de 800vh e entrega o alvo ao ScrollCanvasEngine.
 */
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
// A barra de endereço do iOS/Android muda a altura da janela durante o scroll: não recalcular por isso.
ScrollTrigger.config({ ignoreMobileResize: true })

interface SmoothScrollOptions {
  track: HTMLElement
  reducedMotion: boolean
  onProgress: (progress: number) => void
}

let lenis: Lenis | null = null
let trigger: ScrollTrigger | null = null
let reduced = false

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export function initSmoothScroll({ track, reducedMotion, onProgress }: SmoothScrollOptions): () => void {
  reduced = reducedMotion
  lenis = new Lenis({
    lerp: 0.085,
    wheelMultiplier: 0.9,
    smoothWheel: !reducedMotion,
    syncTouch: false,
    autoRaf: false,
    anchors: false,
  })

  const instance = lenis
  instance.on('scroll', ScrollTrigger.update)
  const raf = (time: number) => instance.raf(time * 1000)
  gsap.ticker.add(raf)
  gsap.ticker.lagSmoothing(0)

  trigger = ScrollTrigger.create({
    trigger: track,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => onProgress(self.progress),
    onRefresh: (self) => onProgress(self.progress),
  })
  onProgress(trigger.progress)

  return () => {
    gsap.ticker.remove(raf)
    trigger?.kill()
    trigger = null
    instance.destroy()
    lenis = null
  }
}

/** Trava/destrava o scroll (usado durante o Preloader). */
export function setScrollLocked(locked: boolean) {
  if (!lenis) return
  if (locked) lenis.stop()
  else lenis.start()
}

/** Converte progresso (0–1) do trilho em posição de scroll e navega até ela. */
export function scrollToProgress(progress: number) {
  if (!lenis || !trigger) return
  const y = trigger.start + Math.min(Math.max(progress, 0), 1) * (trigger.end - trigger.start)
  const distance = Math.abs(y - window.scrollY) / Math.max(1, trigger.end - trigger.start)
  lenis.scrollTo(y, {
    immediate: reduced,
    duration: 1.2 + distance * 1.8,
    easing: easeInOutCubic,
  })
}

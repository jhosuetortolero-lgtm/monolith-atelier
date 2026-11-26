/**
 * ScrollCanvasEngine — motor de sequência de frames orientado por scroll.
 *
 * - Canvas High-DPI (dpr limitado a 2) com object-fit: cover real (sem distorção) e ponto focal por ato.
 * - Dois conjuntos de frames: "desktop" (1920px) e "mobile" (960px, telefones/tablets touch).
 * - Carregamento em duas fases: `loadHero()` (100% do Ato 1, bloqueia o Preloader) e
 *   `loadBackground()` (Atos 2–4 em segundo plano, por passes de stride 8 → 4 → 2 → 1 para que
 *   o scrub funcione cedo com frames vizinhos enquanto a sequência completa chega).
 * - Inércia: currentProgress += (targetProgress - currentProgress) * k, a cada requestAnimationFrame,
 *   com k normalizado para 60 fps (k = 1 - (1 - lerp)^(dt·60)) — mesma sensação em 60/90/120 Hz.
 *   O alvo é alimentado pelo ScrollTrigger (scroll suavizado pelo Lenis) via `setTarget()`.
 * - Blend sub-frame: entre dois frames vizinhos o segundo é sobreposto com alpha fracionário —
 *   movimento contínuo mesmo com scroll lento (sem "degraus" de 24 fps).
 * - Coreografia contínua em 800vh, definida em CHOREOGRAPHY (fonte única para canvas, textos, HUD e navegação).
 * - Só redesenha quando algo muda (progresso, resize ou chegada de um frame visível).
 */
import { ACT_ORDER, FRAME_EXT, FRAME_PAD, frameSets } from '../config/framesManifest'
import type { ActKey, FrameSequence, FrameVariant } from '../config/framesManifest'

export interface ActWindow {
  key: ActKey
  /** Faixa do scroll (0–1) em que a sequência do ato é percorrida do primeiro ao último frame. */
  start: number
  end: number
  /** Faixa em que o bloco editorial do ato fica visível. */
  copyIn: number
  copyOut: number
  /** Ponto de parada usado pela navegação. */
  anchor: number
  /** Ponto focal horizontal/vertical (0–1) para o crop object-fit: cover em telas estreitas. */
  focusX: number
  focusY: number
}

export interface CrossfadeWindow {
  from: ActKey
  to: ActKey
  start: number
  end: number
}

export interface FinaleWindow {
  start: number
  end: number
  copyIn: number
  anchor: number
}

export const CHOREOGRAPHY: {
  scrollLengthVh: number
  acts: readonly ActWindow[]
  crossfades: readonly CrossfadeWindow[]
  finale: FinaleWindow
} = {
  scrollLengthVh: 800,
  acts: [
    { key: 'estudio', start: 0, end: 0.24, copyIn: -1, copyOut: 0.19, anchor: 0, focusX: 0.5, focusY: 0.5 },
    { key: 'polimento', start: 0.24, end: 0.5, copyIn: 0.27, copyOut: 0.46, anchor: 0.335, focusX: 0.55, focusY: 0.5 },
    { key: 'vitrificacao', start: 0.5, end: 0.76, copyIn: 0.53, copyOut: 0.72, anchor: 0.595, focusX: 0.5, focusY: 0.55 },
    { key: 'interior', start: 0.76, end: 0.93, copyIn: 0.79, copyOut: 0.9, anchor: 0.835, focusX: 0.5, focusY: 0.5 },
  ],
  crossfades: [
    { from: 'estudio', to: 'polimento', start: 0.22, end: 0.26 },
    { from: 'polimento', to: 'vitrificacao', start: 0.48, end: 0.52 },
    { from: 'vitrificacao', to: 'interior', start: 0.74, end: 0.78 },
  ],
  finale: { start: 0.93, end: 1, copyIn: 0.945, anchor: 1 },
}

export interface EngineFrameState {
  /** Progresso suavizado (0–1) — use este valor para sincronizar qualquer UI com o canvas. */
  progress: number
  /** Ato dominante (0–3), com troca no ponto médio de cada crossfade. */
  actIndex: number
  actKey: ActKey
  /** Frame (1-based) exibido do ato dominante. */
  frame: number
  frameCount: number
  /** Intensidade (0–1) da vinheta final. */
  finale: number
}

export interface EngineOptions {
  canvas: HTMLCanvasElement
  /** Conjunto de frames: 'desktop' (1920px) ou 'mobile' (960px). */
  variant?: FrameVariant
  /** import.meta.env.BASE_URL — permite publicar em subpasta. */
  baseUrl?: string
  /** Fator de inércia por quadro a 60 fps (0.10 = cinematográfico; 1 = sem inércia). */
  lerp?: number
  maxDpr?: number
  /** Sobrepõe o frame seguinte com alpha fracionário (movimento contínuo). */
  frameBlend?: boolean
  heroConcurrency?: number
  backgroundConcurrency?: number
  onUpdate?: (state: EngineFrameState) => void
}

type SlotStatus = 'idle' | 'loading' | 'ready' | 'error'

interface FrameSlot {
  status: SlotStatus
  img: HTMLImageElement | null
  promise: Promise<void> | null
}

interface Layer {
  act: ActWindow
  /** Posição fracionária na sequência (0 … count-1). */
  pos: number
  alpha: number
  zoom: number
}

const BG = '#0A0A0C'
const EPSILON = 0.00001

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smoothstep = (t: number) => {
  const x = clamp01(t)
  return x * x * (3 - 2 * x)
}

export class ScrollCanvasEngine {
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private readonly manifest: Record<ActKey, FrameSequence>
  private readonly baseUrl: string
  private readonly lerp: number
  private readonly maxDpr: number
  private readonly frameBlend: boolean
  private readonly heroConcurrency: number
  private readonly backgroundConcurrency: number
  private readonly onUpdate?: (state: EngineFrameState) => void
  private readonly slots: Record<ActKey, FrameSlot[]>

  private target = 0
  private current = 0
  private dirty = true
  private rafId = 0
  private lastTime = 0
  private running = false
  private destroyed = false
  private width = 0
  private height = 0
  private dpr = 1
  private lastEmitted = -1
  private lastImage: HTMLImageElement | null = null
  private visibleActs = new Set<ActKey>()
  private baseVignette: CanvasGradient | null = null
  private finaleVignette: CanvasGradient | null = null
  private resizeObserver: ResizeObserver | null = null
  private dprQuery: MediaQueryList | null = null

  constructor(options: EngineOptions) {
    const ctx = options.canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('ScrollCanvasEngine: Canvas 2D indisponível.')
    this.canvas = options.canvas
    this.ctx = ctx
    this.manifest = frameSets[options.variant ?? 'desktop']
    this.baseUrl = (options.baseUrl ?? '/').replace(/\/?$/, '/')
    this.lerp = Math.min(1, Math.max(0.01, options.lerp ?? 0.1))
    this.maxDpr = options.maxDpr ?? 2
    this.frameBlend = options.frameBlend ?? true
    this.heroConcurrency = options.heroConcurrency ?? 8
    this.backgroundConcurrency = options.backgroundConcurrency ?? 6
    this.onUpdate = options.onUpdate

    this.slots = {} as Record<ActKey, FrameSlot[]>
    for (const key of ACT_ORDER) {
      this.slots[key] = Array.from({ length: this.manifest[key].count }, () => ({
        status: 'idle' as SlotStatus,
        img: null,
        promise: null,
      }))
    }

    this.resize()
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(this.canvas)
    this.watchDpr()
  }

  /* ------------------------------------------------------------------ API */

  /** Alvo de progresso (0–1) vindo do ScrollTrigger. */
  setTarget(progress: number) {
    this.target = clamp01(progress)
  }

  /** Salta sem inércia (ex.: restauração de posição). */
  jumpTo(progress: number) {
    this.target = this.current = clamp01(progress)
    this.dirty = true
  }

  start() {
    if (this.running || this.destroyed) return
    this.running = true
    this.lastTime = 0
    this.rafId = requestAnimationFrame(this.tick)
  }

  /** Fase 1: carrega 100% dos frames do Ato 1 ("estudio"). */
  loadHero(onProgress?: (ratio: number) => void): Promise<void> {
    const tasks: Array<[ActKey, number]> = []
    for (let i = 0; i < this.manifest.estudio.count; i++) tasks.push(['estudio', i])
    return this.runQueue(tasks, this.heroConcurrency, 'high', onProgress)
  }

  /** Fase 2: carrega "polimento", "vitrificacao" e "interior" em segundo plano. */
  loadBackground(onProgress?: (ratio: number) => void): Promise<void> {
    const keys = ACT_ORDER.filter((k) => k !== 'estudio')
    const queued = new Set<string>()
    const tasks: Array<[ActKey, number]> = []
    const push = (key: ActKey, index: number) => {
      const id = `${key}:${index}`
      if (queued.has(id)) return
      queued.add(id)
      tasks.push([key, index])
    }
    for (const stride of [8, 4, 2, 1]) {
      for (const key of keys) {
        const count = this.manifest[key].count
        for (let i = 0; i < count; i += stride) push(key, i)
        if (stride === 8) push(key, count - 1)
      }
    }
    return this.runQueue(tasks, this.backgroundConcurrency, 'low', onProgress)
  }

  destroy() {
    this.destroyed = true
    this.running = false
    cancelAnimationFrame(this.rafId)
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.dprQuery?.removeEventListener('change', this.onDprChange)
    this.dprQuery = null
    for (const key of ACT_ORDER) {
      for (const slot of this.slots[key]) {
        if (slot.img && slot.status === 'loading') slot.img.src = ''
        slot.img = null
      }
    }
    this.lastImage = null
  }

  /* ------------------------------------------------------------- Loading */

  private frameUrl(seq: FrameSequence, index: number) {
    return `${this.baseUrl}${seq.dir}/frame_${String(index + 1).padStart(FRAME_PAD, '0')}.${FRAME_EXT}`
  }

  private loadFrame(key: ActKey, index: number, priority: 'high' | 'low'): Promise<void> {
    const slot = this.slots[key][index]
    if (slot.promise) return slot.promise

    const img = new Image()
    img.decoding = 'async'
    img.fetchPriority = priority
    slot.img = img
    slot.status = 'loading'
    slot.promise = new Promise<void>((resolve) => {
      img.onload = () => {
        img
          .decode()
          .catch(() => undefined)
          .then(() => {
            if (this.destroyed) return resolve()
            slot.status = 'ready'
            if (this.visibleActs.has(key) || !this.lastImage) this.dirty = true
            resolve()
          })
      }
      img.onerror = () => {
        slot.status = 'error'
        slot.img = null
        resolve()
      }
      img.src = this.frameUrl(this.manifest[key], index)
    })
    return slot.promise
  }

  private async runQueue(
    tasks: Array<[ActKey, number]>,
    concurrency: number,
    priority: 'high' | 'low',
    onProgress?: (ratio: number) => void,
  ) {
    const total = tasks.length
    if (!total) {
      onProgress?.(1)
      return
    }
    let cursor = 0
    let done = 0
    const worker = async () => {
      while (cursor < total && !this.destroyed) {
        const [key, index] = tasks[cursor++]
        await this.loadFrame(key, index, priority)
        done++
        onProgress?.(done / total)
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, total) }, worker))
  }

  private readyImage(key: ActKey, index: number): HTMLImageElement | null {
    const slot = this.slots[key][index]
    return slot?.status === 'ready' ? slot.img : null
  }

  /** Frame exato se pronto; senão o vizinho carregado mais próximo; senão null. */
  private resolveImage(key: ActKey, index: number): HTMLImageElement | null {
    const exact = this.readyImage(key, index)
    if (exact) return exact
    const total = this.slots[key].length
    for (let d = 1; d < total; d++) {
      const before = this.readyImage(key, index - d)
      if (before) return before
      const after = this.readyImage(key, index + d)
      if (after) return after
    }
    return null
  }

  /* ---------------------------------------------------------- Choreography */

  /** Posição fracionária (0 … count-1) do ato para um progresso. */
  private framePos(act: ActWindow, progress: number) {
    const count = this.manifest[act.key].count
    const local = clamp01((progress - act.start) / (act.end - act.start))
    return local * (count - 1)
  }

  private actByKey(key: ActKey): ActWindow {
    return CHOREOGRAPHY.acts.find((a) => a.key === key) ?? CHOREOGRAPHY.acts[0]
  }

  private composeLayers(progress: number): Layer[] {
    for (const cf of CHOREOGRAPHY.crossfades) {
      if (progress >= cf.start && progress <= cf.end) {
        const t = smoothstep((progress - cf.start) / (cf.end - cf.start))
        const from = this.actByKey(cf.from)
        const to = this.actByKey(cf.to)
        return [
          // Saída: leve push-in enquanto dissolve; entrada: assenta de 1.04 para 1.
          { act: from, pos: this.framePos(from, progress), alpha: 1, zoom: 1 + 0.05 * t },
          { act: to, pos: this.framePos(to, progress), alpha: t, zoom: 1.04 - 0.04 * t },
        ]
      }
    }
    const acts = CHOREOGRAPHY.acts
    const act = acts.find((a) => progress < a.end) ?? acts[acts.length - 1]
    return [{ act, pos: this.framePos(act, progress), alpha: 1, zoom: 1 }]
  }

  private dominantAct(progress: number): ActWindow {
    const acts = CHOREOGRAPHY.acts
    for (let i = 0; i < CHOREOGRAPHY.crossfades.length; i++) {
      const cf = CHOREOGRAPHY.crossfades[i]
      if (progress < (cf.start + cf.end) / 2) return acts[i]
    }
    return acts[acts.length - 1]
  }

  /* -------------------------------------------------------------- Render */

  private resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr)
    const rect = this.canvas.getBoundingClientRect()
    const w = Math.max(1, Math.round(rect.width * this.dpr))
    const h = Math.max(1, Math.round(rect.height * this.dpr))
    if (w === this.width && h === this.height) return
    this.width = this.canvas.width = w
    this.height = this.canvas.height = h
    this.ctx.imageSmoothingEnabled = true
    this.ctx.imageSmoothingQuality = 'high'
    this.buildVignettes()
    this.dirty = true
  }

  /** Recalcula o canvas quando a janela muda de monitor (devicePixelRatio diferente). */
  private watchDpr() {
    this.dprQuery?.removeEventListener('change', this.onDprChange)
    this.dprQuery = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`)
    this.dprQuery.addEventListener('change', this.onDprChange)
  }

  private onDprChange = () => {
    this.resize()
    this.watchDpr()
  }

  private buildVignettes() {
    const { ctx, width: w, height: h } = this
    const diag = Math.hypot(w, h)

    const base = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.32, w * 0.5, h * 0.5, diag * 0.62)
    base.addColorStop(0, 'rgba(10, 10, 12, 0)')
    base.addColorStop(1, 'rgba(10, 10, 12, 0.5)')
    this.baseVignette = base

    const finale = ctx.createRadialGradient(w * 0.64, h * 0.48, diag * 0.06, w * 0.64, h * 0.48, diag * 0.7)
    finale.addColorStop(0, 'rgba(10, 10, 12, 0.18)')
    finale.addColorStop(0.55, 'rgba(10, 10, 12, 0.62)')
    finale.addColorStop(1, 'rgba(10, 10, 12, 0.94)')
    this.finaleVignette = finale
  }

  private drawCover(img: HTMLImageElement, act: ActWindow, zoom: number) {
    const iw = img.naturalWidth
    const ih = img.naturalHeight
    if (!iw || !ih) return
    const { width: w, height: h } = this
    const scale = Math.max(w / iw, h / ih) * zoom
    const dw = iw * scale
    const dh = ih * scale
    const dx = (w - dw) * act.focusX
    const dy = (h - dh) * act.focusY
    this.ctx.drawImage(img, dx, dy, dw, dh)
  }

  /** Desenha uma camada (frame base + blend do frame seguinte). Retorna o frame base desenhado. */
  private drawLayer(layer: Layer, alpha: number): HTMLImageElement | null {
    const key = layer.act.key
    const i0 = Math.floor(layer.pos)
    const frac = layer.pos - i0
    const base = this.resolveImage(key, i0)
    if (!base) return null

    this.ctx.globalAlpha = alpha
    this.drawCover(base, layer.act, layer.zoom)

    if (this.frameBlend && frac > 0.02 && base === this.readyImage(key, i0)) {
      const next = this.readyImage(key, i0 + 1)
      if (next) {
        this.ctx.globalAlpha = alpha * frac
        this.drawCover(next, layer.act, layer.zoom)
      }
    }
    return base
  }

  private render() {
    const { ctx, width: w, height: h } = this
    const progress = this.current
    const layers = this.composeLayers(progress)

    this.visibleActs.clear()
    for (const layer of layers) this.visibleActs.add(layer.act.key)

    ctx.globalAlpha = 1
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, w, h)

    let drewBase = false
    for (const layer of layers) {
      if (!drewBase) {
        const img = this.drawLayer(layer, 1)
        if (img) {
          this.lastImage = img
          drewBase = true
        }
      } else if (layer.alpha > 0.001) {
        const img = this.drawLayer(layer, layer.alpha)
        if (img && layer.alpha > 0.5) this.lastImage = img
      }
    }
    if (!drewBase && this.lastImage) {
      ctx.globalAlpha = 1
      this.drawCover(this.lastImage, layers[0].act, 1)
    }

    ctx.globalAlpha = 1
    if (this.baseVignette) {
      ctx.fillStyle = this.baseVignette
      ctx.fillRect(0, 0, w, h)
    }

    const finale = this.finaleAmount(progress)
    if (finale > 0.001 && this.finaleVignette) {
      ctx.globalAlpha = finale
      ctx.fillStyle = this.finaleVignette
      ctx.fillRect(0, 0, w, h)
      ctx.globalAlpha = 1
    }
  }

  private finaleAmount(progress: number) {
    const { start, end } = CHOREOGRAPHY.finale
    return smoothstep((progress - start) / (end - start))
  }

  private emit() {
    if (!this.onUpdate) return
    const progress = this.current
    if (Math.abs(progress - this.lastEmitted) < EPSILON) return
    this.lastEmitted = progress
    const act = this.dominantAct(progress)
    this.onUpdate({
      progress,
      actIndex: CHOREOGRAPHY.acts.indexOf(act),
      actKey: act.key,
      frame: Math.round(this.framePos(act, progress)) + 1,
      frameCount: this.manifest[act.key].count,
      finale: this.finaleAmount(progress),
    })
  }

  private tick = (now: number) => {
    if (!this.running) return
    // dt limitado: ao voltar de uma aba em segundo plano não há salto brusco.
    const dt = this.lastTime ? Math.min(0.1, (now - this.lastTime) / 1000) : 1 / 60
    this.lastTime = now
    const k = 1 - Math.pow(1 - this.lerp, dt * 60)

    const delta = this.target - this.current
    if (Math.abs(delta) > EPSILON) {
      this.current += delta * k
      this.dirty = true
    } else if (delta !== 0) {
      this.current = this.target
      this.dirty = true
    }
    if (this.dirty) {
      this.dirty = false
      this.render()
      this.emit()
    }
    this.rafId = requestAnimationFrame(this.tick)
  }
}

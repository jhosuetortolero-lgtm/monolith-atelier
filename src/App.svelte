<script lang="ts">
  import { onMount } from 'svelte'
  import Preloader from './lib/components/Preloader.svelte'
  import Navbar from './lib/components/Navbar.svelte'
  import TelemetryHud from './lib/components/TelemetryHud.svelte'
  import SectionsOverlay from './lib/components/SectionsOverlay.svelte'
  import { CHOREOGRAPHY, ScrollCanvasEngine } from './lib/engine/ScrollCanvasEngine'
  import { initSmoothScroll, setScrollLocked } from './lib/engine/smoothScroll'
  import { experience, syncFromEngine } from './lib/state/experience.svelte'
  import type { FrameVariant } from './lib/config/framesManifest'

  let canvas: HTMLCanvasElement
  let track: HTMLDivElement
  let heroReady = $state(false)

  onMount(() => {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
    const touch = matchMedia('(pointer: coarse)').matches
    // Telefones e tablets touch recebem o conjunto 960px (1/4 dos pixels, ~45% do peso).
    const variant: FrameVariant = matchMedia('(max-width: 820px), (pointer: coarse) and (max-width: 1024px)').matches
      ? 'mobile'
      : 'desktop'

    // A experiência sempre abre no Ato 1 (o único 100% carregado na Fase 1).
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)

    const engine = new ScrollCanvasEngine({
      canvas,
      variant,
      baseUrl: import.meta.env.BASE_URL,
      // Desktop: o Lenis já suaviza a roda, então o canvas usa inércia curta (sem atraso duplo).
      // Toque: o scroll nativo traz o momentum do sistema; o canvas adiciona inércia leve.
      lerp: reducedMotion ? 1 : touch ? 0.14 : 0.16,
      maxDpr: 2,
      frameBlend: !reducedMotion,
      onUpdate: syncFromEngine,
    })
    engine.start()

    const disposeScroll = initSmoothScroll({
      track,
      reducedMotion,
      onProgress: (progress) => engine.setTarget(progress),
    })
    setScrollLocked(true)

    let disposed = false
    // Fase 1: Ato 1 completo + fontes -> libera o Preloader.
    Promise.all([engine.loadHero((ratio) => (experience.heroProgress = ratio)), document.fonts?.ready]).then(() => {
      if (disposed) return
      heroReady = true
      // Fase 2: Atos 2–4 em segundo plano.
      engine.loadBackground((ratio) => (experience.bufferProgress = ratio))
    })

    return () => {
      disposed = true
      disposeScroll()
      engine.destroy()
    }
  })

  function handlePreloaderFinish() {
    experience.ready = true
    setScrollLocked(false)
  }
</script>

<canvas bind:this={canvas} class="stage" aria-hidden="true"></canvas>

<Preloader progress={experience.heroProgress} complete={heroReady} onfinish={handlePreloaderFinish} />
<Navbar />
<main>
  <SectionsOverlay />
</main>
<TelemetryHud />

<div bind:this={track} class="track" style:height="{CHOREOGRAPHY.scrollLengthVh}vh" aria-hidden="true"></div>

<style>
  .stage {
    position: fixed;
    top: 0;
    left: 0;
    z-index: var(--z-canvas);
    width: 100vw;
    height: 100vh;
    height: 100lvh;
    background: var(--bg-obsidian);
  }

  .track {
    position: relative;
    width: 1px;
    pointer-events: none;
  }
</style>

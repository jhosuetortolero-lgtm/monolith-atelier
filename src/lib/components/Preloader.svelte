<script lang="ts">
  import { gsap } from 'gsap'
  import { Tween } from 'svelte/motion'
  import { cubicOut } from 'svelte/easing'
  import { studioConfig } from '../config/studioConfig'
  import { framesManifest } from '../config/framesManifest'

  interface Props {
    /** Progresso real da Fase 1 (0–1). */
    progress: number
    /** true quando a Fase 1 e as fontes terminaram. */
    complete: boolean
    onfinish: () => void
  }

  let { progress, complete, onfinish }: Props = $props()

  const MIN_DURATION = 1400
  const startedAt = performance.now()
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

  const shown = new Tween(0, { duration: 650, easing: cubicOut })
  let root = $state<HTMLDivElement>()
  let exiting = $state(false)
  let gone = $state(false)

  $effect(() => {
    shown.target = Math.min(100, Math.max(0, progress * 100))
  })

  const counter = $derived(String(Math.round(shown.current)).padStart(3, '0'))
  const brand = studioConfig.brand
  const heroFrames = String(framesManifest.estudio.count).padStart(3, '0')

  $effect(() => {
    if (exiting || !complete || shown.current < 99.95) return
    exiting = true
    const wait = Math.max(0, MIN_DURATION - (performance.now() - startedAt))
    window.setTimeout(runExit, wait)
  })

  function runExit() {
    const finish = () => {
      gone = true
      onfinish()
    }
    if (!root) return finish()
    if (reduced) {
      gsap.to(root, { autoAlpha: 0, duration: 0.3, onComplete: finish })
      return
    }
    const tl = gsap.timeline({ defaults: { ease: 'expo.inOut' }, onComplete: finish })
    tl.to(root.querySelectorAll('[data-fade]'), { y: -16, autoAlpha: 0, duration: 0.7, stagger: 0.05, ease: 'power3.in' })
      .to(root.querySelector('[data-bar]'), { scaleX: 0, transformOrigin: '100% 50%', duration: 0.8 }, '<0.1')
      .to(root.querySelector('[data-mark]'), { yPercent: -110, duration: 0.9 }, '<')
      .to(root, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.1 }, '-=0.35')
  }
</script>

{#if !gone}
  <div class="preloader" bind:this={root} role="status" aria-live="polite" aria-label="Carregando experiência">
    <div class="preloader__top">
      <span class="label" data-fade>{brand.name}</span>
      <span class="label muted" data-fade>{brand.city} — {brand.state}</span>
    </div>

    <div class="preloader__center">
      <div class="preloader__mask">
        <p class="preloader__mark" data-mark>
          <span>{brand.wordmark.primary}</span>
          <span class="preloader__mark-thin">{brand.wordmark.secondary}</span>
        </p>
      </div>
    </div>

    <div class="preloader__bottom">
      <div class="preloader__row">
        <span class="label muted" data-fade>
          Ato 01 · {studioConfig.preloader.status} · {heroFrames} frames
        </span>
        <span class="mono preloader__counter" data-fade>
          <span class="preloader__value">{counter}</span>
          <span class="muted">— 100%</span>
        </span>
      </div>
      <div class="preloader__track">
        <div class="preloader__bar" data-bar style:transform="scaleX({shown.current / 100})"></div>
      </div>
    </div>
  </div>
{/if}

<style>
  .preloader {
    position: fixed;
    inset: 0;
    z-index: var(--z-preloader);
    display: grid;
    grid-template-rows: auto 1fr auto;
    padding: clamp(1.25rem, 3vw, 2.5rem) var(--gutter);
    background: var(--bg-obsidian);
    clip-path: inset(0% 0% 0% 0%);
    will-change: clip-path;
  }

  .preloader__top,
  .preloader__row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--space-4);
  }

  .muted {
    color: var(--text-muted);
  }

  .preloader__center {
    display: flex;
    align-items: center;
  }

  .preloader__mask {
    overflow: hidden;
    padding: 0.04em 0.1em 0.12em 0;
  }

  .preloader__mark {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 0.22em;
    font-family: var(--font-display);
    font-size: clamp(3rem, 10.5vw, 10.5rem);
    font-weight: 400;
    line-height: 0.92;
    letter-spacing: 0.02em;
    color: var(--text-ivory);
  }

  .preloader__mark-thin {
    font-style: italic;
    font-weight: 300;
    letter-spacing: 0;
    color: var(--accent-amber);
  }

  .preloader__bottom {
    display: grid;
    gap: var(--space-4);
  }

  .preloader__counter {
    display: inline-flex;
    gap: 0.6em;
    white-space: nowrap;
  }

  .preloader__value {
    color: var(--accent-amber);
  }

  .preloader__track {
    position: relative;
    height: 1px;
    background: var(--border-hairline);
    overflow: hidden;
  }

  .preloader__bar {
    position: absolute;
    inset: 0;
    background: var(--accent-amber);
    transform-origin: 0 50%;
  }

  @media (max-width: 640px) {
    .preloader__row {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-2);
    }
  }
</style>

<script lang="ts">
  import { studioConfig } from '../config/studioConfig'
  import type { Metric } from '../config/studioConfig'
  import { CHOREOGRAPHY } from '../engine/ScrollCanvasEngine'
  import type { ActWindow } from '../engine/ScrollCanvasEngine'
  import { scrollToProgress } from '../engine/smoothScroll'
  import { experience } from '../state/experience.svelte'
  import ProtocolConfigurator from './ProtocolConfigurator.svelte'

  const stripPunctuation = (word: string) => word.replace(/[.,;:!?…]+$/u, '')

  const acts = studioConfig.acts.map((copy, i) => ({
    copy,
    win: CHOREOGRAPHY.acts[i],
    number: String(i + 1).padStart(2, '0'),
    words: copy.title.split(' ').map((text) => ({ text, accent: copy.accent.includes(stripPunctuation(text)) })),
  }))

  const p = $derived(experience.progress)
  const finaleActive = $derived(experience.ready && p >= CHOREOGRAPHY.finale.copyIn)
  const cueVisible = $derived(experience.ready && p < 0.012)

  function isActive(win: ActWindow, progress: number) {
    return experience.ready && progress >= win.copyIn && progress < win.copyOut
  }

  /** Deriva vertical sutil (parallax) enquanto o bloco está em cena. */
  function drift(win: ActWindow, progress: number) {
    const from = Math.max(win.copyIn, win.start)
    const local = Math.min(1, Math.max(0, (progress - from) / (win.copyOut - from)))
    return -local * 44
  }

  function splitMetric(metric: Metric): [string, string, string] {
    const at = metric.emphasis ? metric.label.indexOf(metric.emphasis) : -1
    if (!metric.emphasis || at < 0) return [metric.label, '', '']
    return [metric.label.slice(0, at), metric.emphasis, metric.label.slice(at + metric.emphasis.length)]
  }

  function go(event: MouseEvent, progress: number) {
    event.preventDefault()
    scrollToProgress(progress)
  }
</script>

<div class="shade" aria-hidden="true"></div>

<div class="overlay">
  {#each acts as act, i (act.copy.id)}
    {@const active = isActive(act.win, p)}
    <section
      id="ato-{act.copy.id}"
      class="act"
      class:is-active={active}
      class:act--hero={i === 0}
      inert={!active}
      aria-labelledby="ato-{act.copy.id}-title"
    >
      <div class="act__inner" style:transform="translate3d(0, {drift(act.win, p)}px, 0)">
        <p class="tag reveal" style:--d="0">{act.copy.tag}</p>

        <svelte:element
          this={i === 0 ? 'h1' : 'h2'}
          id="ato-{act.copy.id}-title"
          class="act__title"
          aria-label={act.copy.title}
        >
          {#each act.words as word, w (w)}
            <span class="word" aria-hidden="true"
              ><span class="word__inner" class:accent={word.accent} style:--d={w + 1}>{word.text}</span></span
            >{' '}
          {/each}
        </svelte:element>

        <p class="act__lede reveal" style:--d={act.words.length + 1}>{act.copy.lede}</p>

        {#if act.copy.metrics.length}
          <dl class="metrics reveal" style:--d={act.words.length + 2}>
            {#each act.copy.metrics as metric, m (metric.label)}
              {@const [before, emphasis, after] = splitMetric(metric)}
              <div class="metric">
                <dt>{act.number}.{String.fromCharCode(65 + m)}</dt>
                <dd>{before}{#if emphasis}<em>{emphasis}</em>{/if}{after}</dd>
              </div>
            {/each}
          </dl>
        {/if}

        {#if i === 0}
          <div class="act__ctas reveal" style:--d={act.words.length + 2}>
            <a
              class="btn btn--primary"
              href="#ato-{acts[1].copy.id}"
              onclick={(e) => go(e, CHOREOGRAPHY.acts[1].anchor)}
            >
              {studioConfig.hero.primaryCta}
              <span class="btn__arrow" aria-hidden="true">→</span>
            </a>
            <a class="btn" href="#orcamento" onclick={(e) => go(e, CHOREOGRAPHY.finale.anchor)}>
              {studioConfig.hero.secondaryCta}
            </a>
          </div>
        {/if}
      </div>
    </section>
  {/each}

  <section id="orcamento" class="finale" class:is-active={finaleActive} inert={!finaleActive} aria-label="Configurador de protocolo">
    <div class="finale__panel">
      <ProtocolConfigurator />
    </div>
  </section>

  <div class="cue" class:is-visible={cueVisible} aria-hidden="true">
    <span class="cue__line"></span>
    <span class="cue__label">{studioConfig.hero.scrollCue}</span>
  </div>
</div>

<style>
  .shade {
    position: fixed;
    inset: 0;
    z-index: var(--z-shade);
    pointer-events: none;
    background: linear-gradient(
      90deg,
      rgba(10, 10, 12, 0.84) 0%,
      rgba(10, 10, 12, 0.32) 60%,
      rgba(10, 10, 12, 0.45) 100%
    );
  }

  .overlay {
    position: fixed;
    inset: 0;
    z-index: var(--z-overlay);
    pointer-events: none;
  }

  /* Blocos editoriais --------------------------------------------------- */
  .act {
    position: absolute;
    top: 0;
    bottom: 0;
    left: var(--gutter);
    display: flex;
    align-items: center;
    width: min(var(--editorial-max), calc(100vw - var(--gutter) * 2));
    padding-top: calc(var(--nav-h) + var(--nav-top));
    visibility: hidden;
    transition: visibility 0s linear 900ms;
  }

  .act.is-active {
    visibility: visible;
    pointer-events: auto;
    transition-delay: 0s;
  }

  .act__inner {
    display: grid;
    gap: clamp(1.15rem, 2.6vh, 1.9rem);
    will-change: transform;
  }

  .act__title {
    font-size: var(--fs-h2);
    font-weight: 300;
    line-height: var(--lh-hero);
    letter-spacing: var(--ls-hero);
    text-wrap: initial;
  }

  .act--hero .act__title {
    font-size: var(--fs-hero);
  }

  .act__lede {
    max-width: 44ch;
    font-size: var(--fs-lede);
    font-weight: 300;
    line-height: var(--lh-body);
    letter-spacing: 0.005em;
    color: var(--text-soft);
  }

  /* Revelação (disparada por scroll, executada no tempo) ----------------- */
  .word {
    display: inline-block;
    overflow: hidden;
    vertical-align: top;
    /* folga para o itálico e as descendentes da serifa não serem cortados pela máscara */
    padding: 0.04em 0.08em 0.16em 0.02em;
    margin: -0.04em -0.08em -0.16em -0.02em;
  }

  .word__inner {
    display: inline-block;
    transform: translate3d(0, 112%, 0);
    transition: transform 520ms var(--ease-in-out-quart);
    transition-delay: calc(var(--d) * 14ms);
  }

  .is-active .word__inner {
    transform: none;
    transition: transform var(--dur-reveal) var(--ease-out-expo);
    transition-delay: calc(120ms + var(--d) * 60ms);
  }

  .reveal {
    opacity: 0;
    transform: translate3d(0, 16px, 0);
    transition:
      opacity 420ms ease,
      transform 520ms var(--ease-in-out-quart);
  }

  .is-active .reveal {
    opacity: 1;
    transform: none;
    transition:
      opacity 1000ms var(--ease-out-expo),
      transform var(--dur-reveal) var(--ease-out-expo);
    transition-delay: calc(140ms + var(--d) * 60ms);
  }

  /* Métricas editoriais ------------------------------------------------- */
  .metrics {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    border-top: var(--hairline);
    border-bottom: var(--hairline);
  }

  .metric {
    display: grid;
    align-content: start;
    gap: 0.6rem;
    padding: 1.05rem 1.1rem 1.1rem 0;
  }

  .metric + .metric {
    padding-left: 1.2rem;
    border-left: var(--hairline);
  }

  .metric dt {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    font-weight: 300;
    letter-spacing: var(--ls-mono);
    color: var(--text-faint);
  }

  .metric dd {
    font-family: var(--font-sans);
    font-size: 0.64rem;
    font-weight: 500;
    letter-spacing: 0.2em;
    line-height: 1.7;
    text-transform: uppercase;
    color: var(--text-soft);
  }

  .metric em {
    font-family: var(--font-display);
    font-size: 1.9em;
    font-style: italic;
    font-weight: 400;
    letter-spacing: 0;
    line-height: 1;
    text-transform: none;
    color: var(--accent-amber);
  }

  .act__ctas {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    padding-top: var(--space-2);
  }

  /* Configurador final -------------------------------------------------- */
  .finale {
    position: absolute;
    left: var(--gutter);
    top: calc(var(--nav-h) + var(--nav-top) + 1rem);
    bottom: max(env(safe-area-inset-bottom), clamp(1rem, 3vh, 2rem));
    display: flex;
    align-items: center;
    width: min(600px, calc(100vw - var(--gutter) * 2));
    visibility: hidden;
    opacity: 0;
    transform: translate3d(0, 24px, 0);
    transition:
      opacity 500ms ease,
      transform 700ms var(--ease-in-out-quart),
      visibility 0s linear 700ms;
  }

  .finale.is-active {
    visibility: visible;
    opacity: 1;
    transform: none;
    pointer-events: auto;
    transition:
      opacity 900ms var(--ease-out-expo) 100ms,
      transform 1200ms var(--ease-out-expo) 100ms,
      visibility 0s;
  }

  .finale__panel {
    display: flex;
    width: 100%;
    max-height: 100%;
  }

  /* Indicação de scroll ------------------------------------------------- */
  .cue {
    position: absolute;
    left: 50%;
    bottom: max(env(safe-area-inset-bottom), clamp(1rem, 3vh, 2rem));
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.9rem;
    transform: translateX(-50%);
    white-space: nowrap;
    font-family: var(--font-sans);
    font-size: 0.62rem;
    font-weight: 500;
    letter-spacing: var(--ls-label);
    text-transform: uppercase;
    color: var(--text-muted);
    opacity: 0;
    transition: opacity 700ms ease;
  }

  .cue.is-visible {
    opacity: 1;
    transition-delay: 1.4s;
  }

  .cue__line {
    position: relative;
    order: 2;
    width: 1px;
    height: clamp(28px, 5vh, 48px);
    background: var(--border-hairline);
    overflow: hidden;
  }

  .cue__line::after {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--accent-amber);
    animation: scan 2.4s var(--ease-in-out-quart) infinite;
  }

  @keyframes scan {
    0% {
      transform: translateY(-100%);
    }
    55%,
    100% {
      transform: translateY(100%);
    }
  }

  /* Celular deitado / notebooks muito baixos ------------------------------ */
  @media (max-height: 560px) and (orientation: landscape) {
    .act__lede,
    .cue {
      display: none;
    }

    /* celular deitado: coluna estreita para não cobrir o carro */
    .act {
      width: min(var(--editorial-max), 54vw);
    }

    .act__title {
      font-size: clamp(2rem, 10.5vh, 3rem);
    }

    .act--hero .act__title {
      font-size: clamp(2.2rem, 11.5vh, 3.3rem);
    }

    .act__inner {
      gap: 0.85rem;
    }

    .metric {
      padding-top: 0.7rem;
      padding-bottom: 0.7rem;
    }
  }

  /* Mobile e tablet retrato: texto ancorado embaixo, degradê vertical ------ */
  @media (max-width: 760px), (max-width: 1100px) and (orientation: portrait) {
    .shade {
      background: linear-gradient(
        0deg,
        rgba(10, 10, 12, 0.92) 0%,
        rgba(10, 10, 12, 0.62) 42%,
        rgba(10, 10, 12, 0.18) 70%,
        rgba(10, 10, 12, 0.5) 100%
      );
    }

    .act {
      right: var(--gutter);
      width: auto;
      align-items: flex-end;
      padding-bottom: max(calc(env(safe-area-inset-bottom) + 1rem), 1.75rem);
    }

    .act__lede {
      font-size: 0.95rem;
      line-height: 1.65;
    }

    .metric {
      padding-right: 0.75rem;
    }

    .metric + .metric {
      padding-left: 0.85rem;
    }

    .metric dd {
      font-size: 0.6rem;
      letter-spacing: 0.14em;
    }

    .act__ctas .btn {
      flex: 1 1 auto;
    }

    .finale {
      right: var(--gutter);
      width: auto;
      top: calc(var(--nav-h) + var(--nav-top) + 0.75rem);
      bottom: max(calc(env(safe-area-inset-bottom) + 0.5rem), 0.75rem);
      align-items: flex-end;
    }

    .cue {
      display: none;
    }
  }
</style>

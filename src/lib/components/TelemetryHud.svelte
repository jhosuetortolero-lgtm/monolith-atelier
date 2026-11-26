<script lang="ts">
  import { studioConfig } from '../config/studioConfig'
  import { CHOREOGRAPHY } from '../engine/ScrollCanvasEngine'
  import { experience } from '../state/experience.svelte'

  const total = String(CHOREOGRAPHY.acts.length).padStart(2, '0')
  const ticks = [...CHOREOGRAPHY.crossfades.map((cf) => (cf.start + cf.end) / 2), CHOREOGRAPHY.finale.start]

  const inFinale = $derived(experience.progress >= CHOREOGRAPHY.finale.start)
  const actNumber = $derived(String(experience.actIndex + 1).padStart(2, '0'))
  const actName = $derived(
    inFinale ? studioConfig.configurator.hudLabel : (studioConfig.acts[experience.actIndex]?.hudLabel ?? ''),
  )
  const percent = $derived((experience.progress * 100).toFixed(1).padStart(5, '0'))
  const frame = $derived(
    `${String(experience.frame).padStart(4, '0')}/${String(experience.frameCount).padStart(4, '0')}`,
  )
  const buffer = $derived(String(Math.round(experience.bufferProgress * 100)).padStart(3, '0'))
</script>

<aside class="hud" class:is-visible={experience.ready} class:is-finale={inFinale} aria-label="Telemetria da experiência">
  <div class="hud__head">
    <span class="hud__k">Ato</span>
    <span class="hud__act"><b>{actNumber}</b>/{total}</span>
  </div>
  <p class="hud__name">{actName}</p>

  <div class="hud__rail" aria-hidden="true">
    <div class="hud__fill" style:transform="scaleY({experience.progress})"></div>
    {#each ticks as tick (tick)}
      <i class="hud__tick" class:is-passed={experience.progress >= tick} style:top="{tick * 100}%"></i>
    {/each}
    <i class="hud__cursor" style:top="{experience.progress * 100}%"></i>
  </div>

  <dl class="hud__data">
    <div><dt>FRM</dt><dd>{frame}</dd></div>
    <div><dt>SCR</dt><dd>{percent}%</dd></div>
    <div class:is-done={experience.bufferProgress >= 1}><dt>BUF</dt><dd>{buffer}%</dd></div>
  </dl>

  <p class="hud__compact" aria-hidden="true">
    <b>{actNumber}</b>/{total}<span class="hud__sep"></span>{percent}%
  </p>
</aside>

<style>
  .hud {
    position: fixed;
    right: var(--gutter);
    top: 50%;
    z-index: var(--z-hud);
    display: grid;
    justify-items: end;
    gap: var(--space-3);
    width: 132px;
    font-family: var(--font-mono);
    font-size: var(--fs-mono);
    font-weight: 300;
    letter-spacing: var(--ls-mono);
    text-transform: uppercase;
    font-variant-numeric: tabular-nums;
    color: var(--text-muted);
    pointer-events: none;
    opacity: 0;
    transform: translate(12px, -50%);
    transition:
      opacity 900ms var(--ease-out-expo) 450ms,
      transform 900ms var(--ease-out-expo) 450ms;
  }

  .hud.is-visible {
    opacity: 1;
    transform: translate(0, -50%);
  }

  .hud__head {
    display: flex;
    align-items: baseline;
    gap: 0.75em;
  }

  .hud__act {
    color: var(--text-muted);
  }

  .hud__act b,
  .hud__compact b {
    font-weight: 500;
    color: var(--text-ivory);
  }

  .hud__name {
    max-width: 140px;
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-style: italic;
    font-weight: 400;
    letter-spacing: 0;
    line-height: 1.15;
    text-align: right;
    text-transform: none;
    color: var(--accent-amber);
  }

  .hud__rail {
    position: relative;
    width: 1px;
    height: clamp(120px, 26vh, 240px);
    margin: var(--space-2) 0;
    background: var(--border-hairline);
  }

  .hud__fill {
    position: absolute;
    inset: 0;
    background: var(--accent-amber);
    transform-origin: 50% 0;
  }

  .hud__tick {
    position: absolute;
    right: -4px;
    width: 9px;
    height: 1px;
    background: var(--border-hairline);
    transition: background var(--dur-base) ease;
  }

  .hud__tick.is-passed {
    background: var(--accent-amber);
  }

  .hud__cursor {
    position: absolute;
    left: -3px;
    width: 7px;
    height: 7px;
    margin-top: -3px;
    border: 1px solid var(--accent-amber);
    background: var(--bg-obsidian);
  }

  .hud__data {
    display: grid;
    gap: 0.35rem;
  }

  .hud__data div {
    display: flex;
    justify-content: flex-end;
    gap: 0.9em;
  }

  .hud__data dt {
    color: var(--text-faint);
  }

  .hud__data dd {
    color: var(--text-ivory);
  }

  .hud__data .is-done dd {
    color: var(--text-muted);
  }

  .hud__compact {
    display: none;
  }

  @media (max-width: 860px) {
    .hud {
      top: calc(var(--nav-h) + var(--nav-top) + 0.75rem);
    right: max(var(--gutter), env(safe-area-inset-right));
      width: auto;
      transform: translateY(-6px);
    }

    .hud.is-visible {
      transform: none;
    }

    /* No mobile o configurador ocupa a tela: o HUD compacto sai de cena. */
    .hud.is-finale {
      opacity: 0;
      transition-delay: 0s;
    }

    .hud__head,
    .hud__name,
    .hud__rail,
    .hud__data {
      display: none;
    }

    .hud__compact {
      display: flex;
      align-items: center;
      gap: 0.7em;
      padding: 0.4rem 0.6rem;
      color: var(--text-muted);
      background: var(--surface-carbon);
      border: var(--hairline);
      border-radius: var(--radius-xs);
      -webkit-backdrop-filter: blur(var(--blur));
      backdrop-filter: blur(var(--blur));
    }

    .hud__sep {
      width: 14px;
      height: 1px;
      background: var(--border-accent);
    }
  }
</style>

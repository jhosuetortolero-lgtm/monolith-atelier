<script lang="ts">
  import { studioConfig } from '../config/studioConfig'
  import { CHOREOGRAPHY } from '../engine/ScrollCanvasEngine'
  import { scrollToProgress } from '../engine/smoothScroll'
  import { experience } from '../state/experience.svelte'

  const brand = studioConfig.brand
  const links = studioConfig.acts.map((act, i) => ({
    id: act.id,
    label: act.navLabel,
    index: String(i + 1).padStart(2, '0'),
    anchor: CHOREOGRAPHY.acts[i].anchor,
  }))

  let menuOpen = $state(false)
  const inFinale = $derived(experience.progress >= CHOREOGRAPHY.finale.copyIn - 0.01)

  function go(event: MouseEvent, progress: number) {
    event.preventDefault()
    menuOpen = false
    scrollToProgress(progress)
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') menuOpen = false
  }
</script>

<svelte:window onkeydown={onKeydown} />

<header class="nav" class:is-visible={experience.ready} class:is-open={menuOpen}>
  <div class="nav__bar surface">
    <a class="brand" href="#ato-estudio" onclick={(e) => go(e, 0)} aria-label="{brand.name} — início">
      <span class="brand__mark" aria-hidden="true">
        <span class="brand__slab"></span>
      </span>
      <span class="brand__word">
        {brand.wordmark.primary}<span class="brand__thin">{brand.wordmark.secondary}</span>
      </span>
    </a>

    <nav class="nav__links" aria-label="Atos">
      {#each links as link, i (link.id)}
        <a
          href="#ato-{link.id}"
          class="nav__link"
          class:is-active={!inFinale && experience.actIndex === i}
          aria-current={!inFinale && experience.actIndex === i ? 'step' : undefined}
          onclick={(e) => go(e, link.anchor)}
        >
          <span class="nav__index">{link.index}</span>{link.label}
        </a>
      {/each}
    </nav>

    <div class="nav__actions">
      <a
        href="#orcamento"
        class="btn btn--accent nav__cta"
        class:is-active={inFinale}
        onclick={(e) => go(e, CHOREOGRAPHY.finale.anchor)}
      >
        {studioConfig.configurator.navLabel}
      </a>
      <button
        class="nav__toggle mono"
        type="button"
        aria-expanded={menuOpen}
        aria-controls="nav-drawer"
        onclick={() => (menuOpen = !menuOpen)}
      >
        <span class="nav__toggle-lines" aria-hidden="true"></span>
        <span class="sr-only">{menuOpen ? 'Fechar menu' : 'Abrir menu'}</span>
      </button>
    </div>
  </div>

  <div id="nav-drawer" class="nav__drawer surface surface--elevated" hidden={!menuOpen}>
    {#each links as link, i (link.id)}
      <a
        href="#ato-{link.id}"
        class="nav__drawer-link"
        class:is-active={!inFinale && experience.actIndex === i}
        onclick={(e) => go(e, link.anchor)}
      >
        <span class="nav__index">{link.index}</span>
        <span>{link.label}</span>
      </a>
    {/each}
    <a href="#orcamento" class="btn btn--primary nav__drawer-cta" onclick={(e) => go(e, CHOREOGRAPHY.finale.anchor)}>
      {studioConfig.configurator.navLabel}
      <span class="btn__arrow" aria-hidden="true">→</span>
    </a>
  </div>
</header>

<style>
  .nav {
    position: fixed;
    top: var(--nav-top);
    left: max(var(--gutter), env(safe-area-inset-left));
    right: max(var(--gutter), env(safe-area-inset-right));
    z-index: var(--z-nav);
    opacity: 0;
    transform: translateY(-12px);
    pointer-events: none;
    transition:
      opacity 900ms var(--ease-out-expo) 200ms,
      transform 900ms var(--ease-out-expo) 200ms;
  }

  .nav.is-visible {
    opacity: 1;
    transform: none;
    pointer-events: auto;
  }

  .nav__bar {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: var(--space-5);
    height: var(--nav-h);
    padding: 0 0.5rem 0 1.1rem;
  }

  /* Marca ---------------------------------------------------------------- */
  .brand {
    display: inline-flex;
    align-items: center;
    gap: 0.85rem;
    justify-self: start;
  }

  .brand__mark {
    position: relative;
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border: var(--hairline-accent);
    border-radius: var(--radius-xs);
  }

  .brand__slab {
    width: 6px;
    height: 14px;
    background: var(--accent-amber);
  }

  .brand__word {
    font-family: var(--font-sans);
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.34em;
  }

  .brand__thin {
    margin-left: 0.55em;
    font-weight: 300;
    color: var(--text-muted);
  }

  /* Links ---------------------------------------------------------------- */
  .nav__links {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .nav__link {
    position: relative;
    display: inline-flex;
    align-items: baseline;
    gap: 0.55em;
    padding: 0.55rem 0.85rem;
    font-family: var(--font-sans);
    font-size: 0.64rem;
    font-weight: 500;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--text-muted);
    transition: color var(--dur-fast) ease;
  }

  .nav__link::after {
    content: '';
    position: absolute;
    left: 0.85rem;
    right: 0.85rem;
    bottom: 0.25rem;
    height: 1px;
    background: var(--accent-amber);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform var(--dur-base) var(--ease-out-expo);
  }

  .nav__link.is-active {
    color: var(--text-ivory);
  }

  .nav__link.is-active::after {
    transform: scaleX(1);
  }

  @media (hover: hover) and (pointer: fine) {
    .nav__link:hover {
      color: var(--text-ivory);
    }
  }

  .nav__index {
    font-family: var(--font-display);
    font-size: 1.35em;
    font-style: italic;
    font-weight: 400;
    letter-spacing: 0;
    color: var(--accent-amber);
  }

  .nav__actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    justify-self: end;
  }

  .nav__cta {
    --btn-h: 44px;
  }

  .nav__cta.is-active {
    border-color: var(--accent-amber);
  }

  /* Mobile --------------------------------------------------------------- */
  .nav__toggle {
    display: none;
    place-items: center;
    width: 44px;
    height: 44px;
    border: var(--hairline);
    border-radius: var(--radius-xs);
    touch-action: manipulation;
  }

  .nav__toggle-lines {
    position: relative;
    width: 16px;
    height: 7px;
    border-top: 1px solid var(--text-ivory);
    border-bottom: 1px solid var(--text-ivory);
    transition: transform var(--dur-base) var(--ease-out-expo);
  }

  .is-open .nav__toggle-lines {
    transform: scaleY(0.15);
  }

  .nav__drawer {
    display: grid;
    gap: 0;
    margin-top: var(--space-2);
    padding: var(--space-2) var(--space-5) var(--space-5);
  }

  .nav__drawer[hidden] {
    display: none;
  }

  .nav__drawer-link {
    display: flex;
    align-items: baseline;
    gap: var(--space-4);
    padding: 0.85rem 0;
    border-bottom: var(--hairline);
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 300;
    line-height: 1.1;
    letter-spacing: var(--ls-display);
    color: var(--text-muted);
  }

  .nav__drawer-link .nav__index {
    font-size: 0.95rem;
  }

  .nav__drawer-link.is-active {
    color: var(--text-ivory);
  }

  .nav__drawer-cta {
    margin-top: var(--space-5);
    width: 100%;
    --btn-h: 54px;
  }

  @media (max-width: 1080px) {
    .nav__bar {
      grid-template-columns: 1fr auto;
    }

    .nav__links {
      display: none;
    }

    .nav__toggle {
      display: grid;
    }
  }

  @media (min-width: 1081px) {
    .nav__drawer {
      display: none;
    }
  }

  @media (max-width: 560px) {
    .nav__cta {
      display: none;
    }

    .brand__word {
      font-size: 0.72rem;
      letter-spacing: 0.28em;
    }
  }
</style>

<script lang="ts">
  import { Tween } from 'svelte/motion'
  import { cubicOut } from 'svelte/easing'
  import { studioConfig } from '../config/studioConfig'
  import { buildWhatsAppMessage, estimateQuote, formatDays, protocolHours, whatsappUrl } from '../utils/quote'

  const cfg = studioConfig.configurator
  const brand = studioConfig.brand
  const year = new Date().getFullYear()
  const accentAt = cfg.title.indexOf(cfg.titleAccent)
  const title =
    accentAt >= 0
      ? { before: cfg.title.slice(0, accentAt), accent: cfg.titleAccent, after: cfg.title.slice(accentAt + cfg.titleAccent.length) }
      : { before: cfg.title, accent: '', after: '' }

  let sizeId = $state<string>(cfg.defaultSize)
  let selected = $state<string[]>([...cfg.defaultProtocols])
  let model = $state('')

  const quote = $derived(estimateQuote(sizeId, selected))
  const hasSelection = $derived(quote.protocols.length > 0)
  const href = $derived(hasSelection ? whatsappUrl(buildWhatsAppMessage(quote, model)) : undefined)

  const initial = estimateQuote(cfg.defaultSize, cfg.defaultProtocols)
  const hours = new Tween(initial.benchHours, { duration: 700, easing: cubicOut })
  const days = new Tween(initial.stayDays, { duration: 700, easing: cubicOut })

  $effect(() => {
    hours.target = quote.benchHours
    days.target = quote.stayDays
  })

  const shownDays = $derived(Math.round(days.current))

  /*
   * Rolagem interna do painel só quando o conteúdo não cabe na tela.
   * Mouse: o Lenis ignora a roda sobre o painel (data-lenis-prevent) para rolar o conteúdo.
   * Toque: sem bloqueio — ao chegar no topo do painel o gesto continua rolando a página (volta aos atos).
   */
  let form = $state<HTMLFormElement>()
  let scrollable = $state(false)
  const finePointer = typeof matchMedia !== 'undefined' && matchMedia('(pointer: fine)').matches

  $effect(() => {
    const el = form
    if (!el) return
    const measure = () => {
      scrollable = el.scrollHeight > el.clientHeight + 1
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    for (const child of Array.from(el.children)) ro.observe(child)
    measure()
    return () => ro.disconnect()
  })

  function onCta(event: MouseEvent) {
    if (!hasSelection) event.preventDefault()
  }
</script>

<form
  bind:this={form}
  class="cfg surface"
  class:is-scrollable={scrollable}
  data-lenis-prevent={scrollable && finePointer ? '' : undefined}
  aria-labelledby="cfg-title"
  onsubmit={(e) => e.preventDefault()}
>
  <header class="cfg__head">
    <p class="tag">{cfg.tag}</p>
    <h2 id="cfg-title" class="cfg__title">
      {title.before}{#if title.accent}<span class="accent">{title.accent}</span>{/if}{title.after}
    </h2>
    <p class="cfg__lede">{cfg.lede}</p>
  </header>

  <fieldset class="cfg__group">
    <legend class="cfg__legend"><span class="cfg__step">A</span>{cfg.sizeLegend}</legend>
    <div class="sizes">
      {#each cfg.vehicleSizes as size (size.id)}
        <label class="size" class:is-checked={sizeId === size.id}>
          <input class="sr-only" type="radio" name="porte" value={size.id} bind:group={sizeId} />
          <span class="size__label">{size.label}</span>
          <span class="size__hint">{size.hint}</span>
        </label>
      {/each}
    </div>
  </fieldset>

  <fieldset class="cfg__group">
    <legend class="cfg__legend"><span class="cfg__step">B</span>{cfg.protocolLegend}</legend>
    <div class="protocols">
      {#each cfg.protocols as protocol (protocol.id)}
        <label class="protocol" class:is-checked={selected.includes(protocol.id)}>
          <input class="sr-only" type="checkbox" value={protocol.id} bind:group={selected} />
          <span class="protocol__box" aria-hidden="true"></span>
          <span class="protocol__text">
            <span class="protocol__label">{protocol.label}</span>
            <span class="protocol__detail">{protocol.detail}</span>
          </span>
          <span class="protocol__hours">+{protocolHours(protocol, quote.size)}h</span>
        </label>
      {/each}
    </div>
  </fieldset>

  <label class="cfg__field">
    <span class="cfg__legend"><span class="cfg__step">C</span>{cfg.modelLabel}<em>· opcional</em></span>
    <input
      class="cfg__input"
      type="text"
      name="modelo"
      maxlength="80"
      autocomplete="off"
      autocapitalize="words"
      enterkeyhint="done"
      placeholder={cfg.modelPlaceholder}
      bind:value={model}
    />
  </label>

  <div class="readout">
    <div class="readout__cell">
      <span class="readout__k">{cfg.benchLabel}</span>
      <span class="readout__v">{Math.round(hours.current)}<small>horas</small></span>
    </div>
    <div class="readout__cell">
      <span class="readout__k">{cfg.stayLabel}</span>
      <span class="readout__v">{shownDays}<small>{shownDays === 1 ? 'dia útil' : 'dias úteis'}</small></span>
    </div>
  </div>
  <p class="sr-only" aria-live="polite">
    {hasSelection
      ? `${cfg.benchLabel}: ${quote.benchHours} horas. ${cfg.stayLabel}: ${formatDays(quote.stayDays)}.`
      : cfg.emptyHint}
  </p>

  <p class="cfg__note">{cfg.disclaimer}</p>

  <div class="cfg__dock">
    <p class="cfg__summary" aria-hidden="true">
      <span><b>{Math.round(hours.current)}</b> horas de bancada</span>
      <span class="cfg__summary-sep"></span>
      <span><b>{shownDays}</b> {shownDays === 1 ? 'dia útil' : 'dias úteis'}</span>
    </p>
    <a
      class="btn btn--primary cfg__cta"
      {href}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={!hasSelection}
      onclick={onCta}
    >
      {cfg.cta}
      <span class="btn__arrow" aria-hidden="true">→</span>
    </a>
    {#if !hasSelection}
      <p class="cfg__hint">{cfg.emptyHint}</p>
    {/if}
    <p class="cfg__legal">
      © {year} {brand.name} · {brand.city} — {brand.state} · {studioConfig.contact.whatsappDisplay}
    </p>
  </div>
</form>

<style>
  .cfg {
    --pad: clamp(1.25rem, 2.6vw, 2rem);
    display: grid;
    gap: clamp(0.95rem, 2.1vh, 1.5rem);
    width: 100%;
    max-height: 100%;
    padding: var(--pad) var(--pad) 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
  }

  @media (pointer: fine) {
    .cfg.is-scrollable {
      overscroll-behavior: contain;
    }
  }

  .cfg__head {
    display: grid;
    gap: var(--space-3);
  }

  .cfg__title {
    font-size: var(--fs-h3);
    font-weight: 300;
    line-height: 1;
    letter-spacing: var(--ls-hero);
  }

  .cfg__lede {
    max-width: 46ch;
    font-size: var(--fs-small);
    font-weight: 300;
    line-height: 1.65;
    color: var(--text-muted);
  }

  .cfg__group,
  .cfg__field {
    display: grid;
    gap: var(--space-3);
  }

  .cfg__legend {
    display: flex;
    align-items: center;
    gap: 0.8em;
    margin-bottom: var(--space-3);
    font-family: var(--font-sans);
    font-size: 0.62rem;
    font-weight: 500;
    letter-spacing: var(--ls-label);
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .cfg__field .cfg__legend {
    margin-bottom: 0;
  }

  .cfg__legend em {
    font-style: normal;
    color: var(--text-faint);
  }

  .cfg__step {
    display: inline-grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border: var(--hairline-accent);
    border-radius: var(--radius-xs);
    font-family: var(--font-display);
    font-size: 0.85rem;
    font-style: italic;
    letter-spacing: 0;
    text-transform: none;
    color: var(--accent-amber);
  }

  /* Porte --------------------------------------------------------------- */
  .sizes {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    border: var(--hairline);
    border-radius: var(--radius-xs);
  }

  .size {
    position: relative;
    display: grid;
    gap: 0.15rem;
    padding: 0.8rem 0.95rem;
    cursor: pointer;
    touch-action: manipulation;
    transition: background var(--dur-fast) ease;
  }

  .size + .size {
    border-left: var(--hairline);
  }

  .size::after {
    content: '';
    position: absolute;
    left: -1px;
    right: -1px;
    bottom: -1px;
    height: 1px;
    background: var(--accent-amber);
    transform: scaleX(0);
    transition: transform var(--dur-base) var(--ease-out-expo);
  }

  .size.is-checked {
    background: var(--accent-amber-glow);
  }

  .size.is-checked::after {
    transform: scaleX(1);
  }

  .size:has(:focus-visible),
  .protocol:has(:focus-visible) {
    outline: 1px solid var(--accent-amber);
    outline-offset: -1px;
  }

  .size__label {
    font-family: var(--font-display);
    font-size: 1.22rem;
    font-weight: 500;
    line-height: 1.1;
  }

  .size__hint {
    font-size: 0.72rem;
    font-weight: 300;
    color: var(--text-muted);
    line-height: 1.35;
  }

  /* Protocolos ---------------------------------------------------------- */
  .protocols {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-2);
  }

  .protocol {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: start;
    gap: 0.75rem;
    padding: 0.8rem 0.85rem;
    border: var(--hairline);
    border-radius: var(--radius-xs);
    cursor: pointer;
    touch-action: manipulation;
    transition:
      border-color var(--dur-fast) ease,
      background var(--dur-fast) ease;
  }

  @media (hover: hover) and (pointer: fine) {
    .size:hover {
      background: rgba(244, 241, 234, 0.03);
    }

    .protocol:hover {
      border-color: rgba(244, 241, 234, 0.24);
    }
  }

  .protocol.is-checked {
    border-color: var(--border-accent);
    background: var(--accent-amber-glow);
  }

  .protocol__box {
    position: relative;
    width: 14px;
    height: 14px;
    margin-top: 0.3rem;
    border: 1px solid rgba(244, 241, 234, 0.4);
    border-radius: var(--radius-xs);
    transition:
      border-color var(--dur-fast) ease,
      background var(--dur-fast) ease;
  }

  .protocol__box::after {
    content: '';
    position: absolute;
    inset: 3px;
    background: var(--bg-obsidian);
    transform: scale(0);
    transition: transform var(--dur-base) var(--ease-out-expo);
  }

  .is-checked .protocol__box {
    border-color: var(--accent-amber);
    background: var(--accent-amber);
  }

  .is-checked .protocol__box::after {
    transform: scale(1);
  }

  .protocol__text {
    display: grid;
    gap: 0.25rem;
    min-width: 0;
  }

  .protocol__label {
    font-family: var(--font-display);
    font-size: 1.22rem;
    font-weight: 500;
    line-height: 1.1;
  }

  .protocol__detail {
    font-size: 0.74rem;
    font-weight: 300;
    line-height: 1.45;
    color: var(--text-muted);
  }

  .protocol__hours {
    margin-top: 0.2rem;
    font-family: var(--font-mono);
    font-size: var(--fs-mono);
    font-weight: 300;
    font-variant-numeric: tabular-nums;
    color: var(--text-muted);
  }

  .is-checked .protocol__hours {
    color: var(--accent-amber);
  }

  /* Modelo -------------------------------------------------------------- */
  .cfg__input {
    width: 100%;
    height: 46px;
    padding: 0 0.95rem;
    border: var(--hairline);
    border-radius: var(--radius-xs);
    background: rgba(10, 10, 12, 0.4);
    /* 16px mínimo: abaixo disso o Safari do iPhone dá zoom na página ao focar o campo */
    font-size: max(16px, 0.95rem);
    font-weight: 300;
    transition: border-color var(--dur-fast) ease;
  }

  .cfg__input::placeholder {
    color: var(--text-faint);
  }

  .cfg__input:focus {
    outline: none;
    border-color: var(--accent-amber);
  }

  /* Leitura ------------------------------------------------------------- */
  .readout {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    border-top: var(--hairline);
    border-bottom: var(--hairline);
  }

  .readout__cell {
    display: grid;
    gap: 0.45rem;
    padding: 0.95rem 0;
  }

  .readout__cell + .readout__cell {
    padding-left: 1.25rem;
    border-left: var(--hairline);
  }

  .readout__k {
    font-family: var(--font-sans);
    font-size: 0.6rem;
    font-weight: 500;
    letter-spacing: var(--ls-label);
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .readout__v {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    font-family: var(--font-display);
    font-size: var(--fs-number);
    font-weight: 300;
    font-variant-numeric: lining-nums tabular-nums;
    line-height: 0.95;
    color: var(--text-ivory);
  }

  .readout__v small {
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-style: italic;
    font-weight: 400;
    color: var(--accent-amber);
  }

  /* CTA + rodapé -------------------------------------------------------- */
  .cfg__note {
    font-size: 0.74rem;
    font-weight: 300;
    line-height: 1.55;
    color: var(--text-muted);
  }

  /* Doca do CTA: fica sempre visível no rodapé do painel quando ele tem rolagem interna. */
  .cfg__dock {
    display: grid;
    gap: 0.7rem;
    margin: 0 calc(var(--pad) * -1);
    padding: 0 var(--pad) var(--pad);
  }

  .cfg.is-scrollable .cfg__dock {
    position: sticky;
    bottom: 0;
    z-index: 1;
    padding-top: 1.1rem;
    background: linear-gradient(180deg, rgba(16, 16, 20, 0) 0, rgba(16, 16, 20, 0.97) 1.1rem);
  }

  .cfg__cta {
    --btn-h: 56px;
    width: 100%;
  }

  /* Resumo compacto da estimativa junto ao CTA (só no celular, onde a leitura grande sai) */
  .cfg__summary {
    display: none;
    align-items: center;
    justify-content: center;
    gap: 0.8rem;
    font-size: 0.78rem;
    font-weight: 300;
    color: var(--text-soft);
  }

  .cfg__summary b {
    font-family: var(--font-display);
    font-size: 1.45rem;
    font-weight: 400;
    font-variant-numeric: lining-nums tabular-nums;
    color: var(--accent-amber);
  }

  .cfg__summary-sep {
    width: 18px;
    height: 1px;
    background: var(--border-accent);
  }

  .cfg__hint {
    font-family: var(--font-sans);
    font-size: 0.62rem;
    font-weight: 500;
    letter-spacing: var(--ls-label);
    text-transform: uppercase;
    color: var(--accent-amber);
  }

  .cfg__legal {
    font-family: var(--font-sans);
    font-size: 0.58rem;
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--text-faint);
  }

  /* Notebooks e telas baixas: compacta para o configurador caber inteiro */
  @media (min-width: 761px) and (max-height: 1040px) {
    .cfg__lede {
      display: none;
    }
  }

  @media (min-width: 761px) and (max-height: 900px) {
    .protocol__detail,
    .size__hint,
    .readout {
      display: none;
    }

    .cfg__summary {
      display: flex;
    }

    .protocol {
      align-items: center;
    }

    .protocol__box,
    .protocol__hours {
      margin-top: 0;
    }
  }

  @media (max-width: 760px) {
    .cfg__lede,
    .size__hint {
      display: none;
    }

    .sizes {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.3fr);
    }

    .size {
      align-content: center;
      padding: 0.75rem 0.45rem;
      text-align: center;
    }

    .size__label {
      font-size: 1.02rem;
    }

    .protocols {
      grid-template-columns: 1fr;
    }

    .protocol {
      align-items: center;
      padding: 0.7rem 0.8rem;
    }

    .protocol__box,
    .protocol__hours {
      margin-top: 0;
    }

    .protocol__label {
      font-size: 1.12rem;
    }

    .protocol__detail {
      display: none;
    }

    .readout {
      display: none;
    }

    .cfg__summary {
      display: flex;
    }

    .cfg__cta {
      padding: 0 0.9rem;
      letter-spacing: 0.13em;
    }
  }
</style>

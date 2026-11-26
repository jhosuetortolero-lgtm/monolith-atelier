# MONOLITH ATELIER — Site White-Label (Estética Automotiva de Alto Padrão)

Site cinematográfico com scroll-scrub de sequências de frames em Canvas (Vite + Svelte 5 + TypeScript + GSAP ScrollTrigger + Lenis).
Projetado para ser revendido a estúdios de estética automotiva de luxo: **toda personalização de cliente passa por `src/lib/config/studioConfig.ts` e pelos 4 vídeos de origem.**

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run frames` | Localiza `video_auto01..04` (.mp4/.mov/.webm), extrai os frames WebP (desktop 1920px + mobile 960px), gera `public/og-image.jpg` e regenera `framesManifest.ts` |
| `npm run frames -- --src="D:/videos/cliente"` | Mesmo processo com a pasta de origem explícita |
| `npm run frames -- --variant=mobile` | Extrai só um conjunto (`desktop` ou `mobile`) |
| `npm run frames:manifest` | Só reconta os `.webp` existentes e regenera o manifesto |
| `npm run check` | `svelte-check` + `tsc` (precisa terminar com 0 erros e 0 warnings) |
| `npm run build` | Build de produção em `dist/` (frames são copiados de `public/frames/`) |
| `npm run preview` | Serve o build localmente |

Requisitos: Node 20+, `ffmpeg` e `ffprobe` no PATH (só para `npm run frames`).

## Personalizar para um novo cliente (checklist)

1. **Vídeos**: coloque os 4 vídeos do cliente na raiz do projeto (ou numa subpasta, ou na pasta-pai) com os nomes `video_auto01` … `video_auto04` (extensão .mp4, .mov ou .webm). **Nunca apague nem sobrescreva os vídeos originais** — o script apenas os lê.
   - 01 → Ato 1 "estudio" (chegada no estúdio)
   - 02 → Ato 2 "polimento" (correção de pintura)
   - 03 → Ato 3 "vitrificacao" (cerâmica / hidrofobia)
   - 04 → Ato 4 "interior" (cabine / couro)
2. Rode `npm run frames`. Ele limpa e recria:
   - `public/frames/<ato>/frame_%04d.webp` — desktop (24 fps, `scale=1920:-1`, `-q:v 82`)
   - `public/frames-mobile/<ato>/frame_%04d.webp` — celulares e tablets touch (24 fps, `scale=960:-2`, `-q:v 78`, ~45% do peso)
   - `public/og-image.jpg` — prévia 1200×630 ao compartilhar o link (WhatsApp, Instagram)
   - `src/lib/config/framesManifest.ts` com as contagens exatas de cada conjunto. **Não edite o manifesto à mão** — o motor nunca pede frames além de `count` (zero 404).
3. Edite **apenas** `src/lib/config/studioConfig.ts`:
   - `brand` (nome, wordmark, cidade/UF, nota de atendimento)
   - `contact.whatsapp` (somente dígitos com DDI+DDD, ex.: `5511987654321`) e `contact.whatsappDisplay`
     — **o valor atual `5511999999999` é de demonstração e precisa ser trocado antes de publicar.**
   - `seo` (título, descrição, cor do tema) — injetado no `index.html` pelo plugin `monolith-studio-html` em `vite.config.ts`
   - `seo.siteUrl` — URL pública final com barra no fim (ex.: `https://estudio.com.br/`). **Sem ela, a prévia com imagem no WhatsApp não aparece** (og:image precisa ser absoluta).
   - `acts[]` (tag, título, `accent` = palavras do título em itálico âmbar, lede, métricas; `emphasis` precisa ser um trecho exato de `label`)
   - `configurator` (portes com `factor`, protocolos com `hours`/`cureHours`, `workdayHours`, textos e template da mensagem do WhatsApp)
4. Se o carro do cliente não estiver centralizado no vídeo, ajuste `focusX`/`focusY` do ato em `CHOREOGRAPHY` (`src/lib/engine/ScrollCanvasEngine.ts`) — define o ponto focal do crop `object-fit: cover` em telas estreitas.
5. `npm run check && npm run build` — precisa compilar 100% limpo.

Regra do `studioConfig.ts`: não importar nada nele (é lido também pelo `vite.config.ts` via `tsconfig.node.json`).

## Arquitetura

```
scripts/build-frames.mjs                 Pipeline FFmpeg -> WebP -> manifesto (localiza vídeos, valida sequência contínua)
src/lib/config/studioConfig.ts           Configuração white-label única (textos, WhatsApp, protocolos, tempos, SEO)
src/lib/config/framesManifest.ts         GERADO — contagens exatas de frames por ato
src/lib/engine/ScrollCanvasEngine.ts     Motor Canvas High-DPI + CHOREOGRAPHY (fonte única da linha do tempo)
src/lib/engine/smoothScroll.ts           Lenis + GSAP ScrollTrigger (gsap.ticker dirige o Lenis; ScrollTrigger mede o trilho)
src/lib/state/experience.svelte.ts       Estado global ($state): progresso suavizado, ato, frame, carregamento
src/lib/utils/quote.ts                   Estimativa de horas/dias e mensagem formatada do WhatsApp
src/lib/components/Preloader.svelte      Abertura: barra dourada 1px + contador mono "000 — 100%", saída via GSAP (clip-path)
src/lib/components/Navbar.svelte         Header flutuante, navegação por atos (scrollToProgress), CTA Orçamento Privativo, drawer mobile
src/lib/components/TelemetryHud.svelte   HUD lateral mono: ATO 01/04, trilho de progresso, FRM/SCR/BUF (compacto no mobile)
src/lib/components/SectionsOverlay.svelte Camada editorial à esquerda (max 540px) + degradê lateral + configurador final
src/lib/components/ProtocolConfigurator.svelte  Porte + protocolos -> tempo em tempo real -> link wa.me (CTA fixo quando há rolagem)
src/App.svelte                           Orquestra canvas fixo, trilho de 800vh, Preloader, Navbar, HUD e Overlay
src/app.css                              Design system (tokens :root, tipografia fluida, botões, utilitários)
```

### Motor (`ScrollCanvasEngine`)
- Canvas com `dpr = min(devicePixelRatio, 2)`, redimensionado por `ResizeObserver` (e ao trocar de monitor); crop `cover` real com ponto focal por ato.
- Conjunto de frames escolhido no carregamento: `mobile` (960px) se `(max-width: 820px)` ou touch até 1024px; senão `desktop` (1920px). Os vídeos de origem têm ~864px, então o mobile não perde nitidez.
- **Fase 1** (`loadHero`): 100% dos frames de "estudio" — o Preloader só sai quando ela e as fontes terminam.
- **Fase 2** (`loadBackground`): "polimento", "vitrificacao", "interior" em segundo plano, por passes de stride 8→4→2→1 (scrub utilizável cedo; frame faltante cai no vizinho carregado mais próximo).
- Inércia: `current += (target - current) * k` a cada `requestAnimationFrame`, com `k = 1 - (1 - lerp)^(dt·60)` — mesma sensação em telas de 60, 90 e 120 Hz (iPhone ProMotion, Androids 120 Hz) e em modo economia (30 fps). O alvo vem do ScrollTrigger. Só redesenha quando algo muda.
- Valores de `lerp` (em `App.svelte`): desktop `0.16` (o Lenis já suaviza a roda — evita atraso duplo), toque `0.14` (o scroll nativo do iOS/Android já traz o momentum do sistema), movimento reduzido `1`.
- Blend sub-frame: entre dois frames o seguinte é sobreposto com alpha fracionário — movimento contínuo mesmo em scroll lento.
- Lenis: `lerp 0.085`, `wheelMultiplier 0.9`, `syncTouch: false` (toque 100% nativo). `ScrollTrigger.config({ ignoreMobileResize: true })` evita recálculo quando a barra de endereço do celular aparece/some.
- Usa `HTMLImageElement` (não `ImageBitmap`) para que o navegador possa descartar bitmaps decodificados — 531 frames 1920px decodificados ocupariam ~4,5 GB.
- `prefers-reduced-motion`: lerp = 1, Lenis sem suavização, reveals instantâneos.

### Coreografia (800vh) — `CHOREOGRAPHY`
| Faixa | Canvas | Texto |
| --- | --- | --- |
| 0–24% | Ato 1 "estudio" | visível 0–19% |
| 22–26% | crossfade (dissolve + push-in) | — |
| 24–50% | Ato 2 "polimento" | 27–46% |
| 48–52% | crossfade | — |
| 50–76% | Ato 3 "vitrificacao" | 53–72% |
| 74–78% | crossfade | — |
| 76–93% | Ato 4 "interior" | 79–90% |
| 93–100% | frame final estabilizado + vinheta escura | configurador a partir de 94,5% |

Canvas, textos, HUD e navegação leem a mesma `CHOREOGRAPHY` e o mesmo progresso suavizado — tudo fica sincronizado. Para mudar o ritmo, altere só ali.

## Regras de design (não violar)
- Paleta exclusiva dos tokens: `--bg-obsidian #0A0A0C`, `--surface-carbon`, `--surface-elevated`, `--text-ivory #F4F1EA`, `--text-muted #9E9B95`, `--accent-amber #D4A359`, `--accent-amber-glow`, `--border-hairline`, `--border-accent`.
- Proibido: gradientes roxos/azuis genéricos, sombras coloridas artificiais, visual de template padrão.
- Linhas de 1px (`var(--border-hairline)`), `border-radius` 2px ou 4px, superfícies com `backdrop-filter: blur(18px)`.
- Fontes (revisão de luxo, substitui o briefing original): **Cormorant Garamond** (títulos, números, itálicos de destaque), **Manrope** (texto e rótulos em caixa-alta espaçada 0.28em), **JetBrains Mono** 300 (só telemetria/códigos). Hero: `clamp(3rem, min(6vw, 11.5vh), 6.1rem)` — limitado também pela altura; line-height 0.96, letter-spacing -0.015em (serifa não aceita -0.03em).
- Destaque: uma palavra por título em itálico âmbar (`.accent`), configurada em `acts[].accent` / `configurator.titleAccent`.
- Texto editorial sempre à esquerda (max-width 540px) sobre o degradê lateral; no mobile e tablet retrato, ancorado embaixo com degradê vertical; celular deitado: coluna de 54vw — nunca cobrir o centro do veículo.

## Regras de celular (iOS / Android) — não regredir
- Hover só dentro de `@media (hover: hover) and (pointer: fine)` (no toque o estado "gruda" após o tap).
- Inputs com `font-size` ≥ 16px (abaixo disso o Safari do iPhone dá zoom ao focar).
- Respeitar `env(safe-area-inset-*)` (notch / barra de gestos) — já usado em nav, HUD, atos e configurador.
- Configurador: rolagem interna só quando o conteúdo não cabe; com mouse usa `data-lenis-prevent`; no toque não bloqueia o encadeamento (o gesto volta a rolar a página no topo do painel). CTA do WhatsApp fica fixo no rodapé do painel quando há rolagem; no celular a estimativa aparece em resumo junto ao CTA.
- Testar sempre: retrato 390×844, deitado 844×390, tablet retrato 820×1180.

---

## Instruções originais do projeto (briefing de referência)

Você é um Diretor de Arte Digital e Engenheiro Criativo Sênior (nível Awwwards Site of the Day / FWA / Active Theory). Construa do zero, nesta pasta, o site oficial da MONOLITH ATELIER (Estética Automotiva & Proteção Cerâmica de Alta Precisão), projetado em arquitetura White-Label de altíssimo ticket para ser vendido a estúdios de estética automotiva de luxo. Execute absolutamente tudo de uma vez, sem placeholders, sem "// TODO" e validando o build ao final.

### 1. INICIALIZAÇÃO SEGURA E DEPENDÊNCIAS
Nesta pasta já existem os 4 arquivos de vídeo originais (video_auto01, video_auto02, video_auto03, video_auto04 com extensão .mp4, .mov ou .webm) — NÃO apague nem sobrescreva esses vídeos. Inicialize um projeto Vite + Svelte + TypeScript em uma pasta temporária ("npm create vite@latest _tmp_app -- --template svelte-ts --no-interactive"), mova os arquivos gerados para a raiz atual sem tocar nos vídeos e remova "_tmp_app". Instale "gsap" e "lenis". Configure no "index.html" as fontes do Google Fonts: "Space Grotesk" (300, 400, 500, 600, 700), "Plus Jakarta Sans" (300, 400, 500, 600) e "JetBrains Mono" (400, 500).

### 2. EXTRAÇÃO AUTOMÁTICA DOS FRAMES (FFMPEG) E MANIFESTO
Localize os 4 vídeos na raiz ou subpastas e execute o ffmpeg via terminal para extrair sequências otimizadas em .webp (24 fps, scale=1920:-1, -q:v 82):
- video_auto01.* -> "public/frames/estudio/frame_%04d.webp" (Ato 1: Chegada no Estúdio)
- video_auto02.* -> "public/frames/polimento/frame_%04d.webp" (Ato 2: Correção de Pintura & Polimento)
- video_auto03.* -> "public/frames/vitrificacao/frame_%04d.webp" (Ato 3: Vitrificação Cerâmica & Hidrofobia)
- video_auto04.* -> "public/frames/interior/frame_%04d.webp" (Ato 4: Detalhamento Interno & Couro)

Conte via script/shell a quantidade exata de arquivos .webp gerados em cada uma das 4 pastas e gere o arquivo "src/lib/config/framesManifest.ts" exportando essas contagens exatas para que o navegador nunca tente requisitar frames inexistentes (zero erros 404).

### 3. DESIGN SYSTEM DE AGÊNCIA ("src/app.css")
Implemente um Design System completo baseado em tokens CSS (:root) inspirado na estética Dark Architectural / Automotive Luxury (Porsche Design, Polestar, Kinetic One), harmonizado com a iluminação linear quente e concreto escuro dos vídeos:
- Tokens de cor: --bg-obsidian: #0A0A0C; --surface-carbon: rgba(16, 16, 20, 0.72); --surface-elevated: rgba(24, 24, 30, 0.85); --text-ivory: #F4F1EA; --text-muted: #9E9B95; --accent-amber: #D4A359; --accent-amber-glow: rgba(212, 163, 89, 0.18); --border-hairline: rgba(244, 241, 234, 0.12); --border-accent: rgba(212, 163, 89, 0.42).
- Tipografia fluida com clamp(): --font-display ('Space Grotesk'), --font-sans ('Plus Jakarta Sans'), --font-mono ('JetBrains Mono'), títulos Hero com clamp(2.75rem, 6vw, 6.2rem), line-height 0.96 e letter-spacing -0.03em.
- Regras estritas: proibido usar gradientes roxos/azuis genéricos, sombras coloridas artificiais ou visual de template padrão; use linhas divisórias ultrafinas (1px solid var(--border-hairline)), cantos precisos (border-radius: 2px ou 4px) e backdrop-filter: blur(18px).

### 4. ARQUITETURA DE ARQUIVOS EM "src/"
- "src/lib/config/studioConfig.ts": configuração White-Label única contendo nome do estúdio, cidade, pacotes/protocolos, tempos estimados, número de WhatsApp e textos.
- "src/lib/config/framesManifest.ts": contagem exata dos frames gerados pelo FFmpeg.
- "src/lib/engine/ScrollCanvasEngine.ts": motor HTML5 Canvas High-DPI (dpr limitado a 2) com renderização object-fit: cover real sem distorção em desktop e mobile, carregamento em duas fases (o Preloader carrega 100% dos frames do Ato 1 "estudio" para abertura imediata e carrega "polimento", "vitrificacao" e "interior" em segundo plano), interpolação linear de inércia (currentProgress += (targetProgress - currentProgress) * 0.10) no requestAnimationFrame integrada ao Lenis + GSAP ScrollTrigger, e coreografia contínua em 800vh de scroll: Ato 1 "estudio" (0% a 24%), crossfade suave de alpha (22% a 26%) para Ato 2 "polimento" (24% a 50%), crossfade suave (48% a 52%) para Ato 3 "vitrificacao" (50% a 76%), crossfade suave (74% a 78%) para Ato 4 "interior" (76% a 93%), e estabilização no frame final com vinheta escura elegante (93% a 100%).
- "src/lib/components/Preloader.svelte": abertura cinematográfica minimalista com barra fina dourada e contador mono (000 — 100%).
- "src/lib/components/Navbar.svelte": header flutuante minimalista com logo, navegação suave por atos e botão de Orçamento Privativo.
- "src/lib/components/TelemetryHud.svelte": indicador lateral discreto em fonte mono mostrando o Ato atual (01/04 a 04/04) e o progresso do scroll.
- "src/lib/components/SectionsOverlay.svelte": camada editorial alinhada assimetricamente à esquerda (max-width: 540px) sobre degradê lateral escuro (linear-gradient(90deg, rgba(10,10,12,0.84) 0%, rgba(10,10,12,0.32) 60%, rgba(10,10,12,0.45) 100%)) para nunca cobrir o centro do veículo nos vídeos:
  * Ato 1 (sobre video_auto01): Tag "ESTÚDIO DE ALTA PRECISÃO • ESTÉTICA AUTOMOTIVA", título "A Arte da Perfeição em Cada Reflexo." e subtítulo sobre preservação patrimonial e iluminação de inspeção.
  * Ato 2 (sobre video_auto02): Tag "02 / CORREÇÃO DE PINTURA", título "Nivelamento Óptico & Polimento Técnico." e métricas mono ("99.4% Remoção de Micro-riscos" | "Leitura de Verniz por Ultrassom").
  * Ato 3 (sobre video_auto03): Tag "03 / PROTEÇÃO CERÂMICA 9H", título "Blindagem Molecular & Hidrofobia Extrema." e métricas mono ("Ângulo de Contato 115°" | "Proteção UV & Química até 5 Anos").
  * Ato 4 (sobre video_auto04): Tag "04 / DETALHAMENTO DE CABINE", título "Restauração Sensorial & Couro Nobre." e métricas mono ("Higienização a Vapor Seco" | "Hidratação Fosca Original de Fábrica").
  * Seção Final (93% a 100%): Configurador Rápido de Protocolo onde o cliente escolhe o Porte do Veículo (Cupê / Sedan, SUV / Utilitário, Superesportivo) e marca os Protocolos Desejados (Correção de Pintura, Vitrificação Cerâmica 9H, PPF Frontal, Detalhamento Interno Full), vendo o tempo estimado de estúdio atualizar em tempo real e clicando em "Solicitar Avaliação via WhatsApp" para abrir o WhatsApp com os dados formatados.
- "src/App.svelte": orquestração limpa do Canvas fixo, Preloader, Navbar, TelemetryHud e SectionsOverlay.

### 5. VALIDAÇÃO FINAL OBRIGATÓRIA
Confirme que os frames .webp foram extraídos nas 4 pastas dentro de "public/frames/" e que "framesManifest.ts" reflete a contagem exata. Execute "npm run check" e "npm run build" corrigindo qualquer erro ou warning até compilar 100% limpo. Salve também estas instruções em "CLAUDE.md" na raiz do projeto para futuras personalizações de clientes.

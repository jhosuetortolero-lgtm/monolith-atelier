#!/usr/bin/env node
/**
 * MONOLITH ATELIER — Pipeline de frames (FFmpeg -> WebP -> framesManifest.ts)
 *
 * Uso:
 *   node scripts/build-frames.mjs                  # localiza vídeos, extrai frames (desktop + mobile), og-image e manifesto
 *   node scripts/build-frames.mjs --manifest-only  # só recontar os .webp e regenerar o manifesto
 *   node scripts/build-frames.mjs --src="D:/videos/cliente-x"  # pasta de origem explícita
 *   node scripts/build-frames.mjs --variant=mobile # extrai só um conjunto (desktop | mobile)
 *
 * Conjuntos gerados:
 *   desktop -> public/frames/<ato>/frame_%04d.webp         (24 fps, scale=1920:-1, -q:v 82)
 *   mobile  -> public/frames-mobile/<ato>/frame_%04d.webp  (24 fps, scale=960:-2,  -q:v 78)
 *   og      -> public/og-image.jpg (1200x630, prévia de links no WhatsApp/redes)
 *
 * Os vídeos originais NUNCA são movidos, copiados ou sobrescritos: são apenas lidos pelo ffmpeg.
 * Ordem de busca: --src, raiz do projeto (recursivo, ignorando node_modules/dist/public/.git),
 * depois a pasta-pai do projeto (não recursivo).
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC_DIR = path.join(ROOT, 'public')
const OG_FILE = path.join(PUBLIC_DIR, 'og-image.jpg')
const MANIFEST_FILE = path.join(ROOT, 'src', 'lib', 'config', 'framesManifest.ts')

/** Ato -> nome-base do vídeo de origem (extensões aceitas: .mp4, .mov, .webm). */
const ACTS = [
  { key: 'estudio', source: 'video_auto01', label: 'Ato 1 — Chegada no Estúdio' },
  { key: 'polimento', source: 'video_auto02', label: 'Ato 2 — Correção de Pintura & Polimento' },
  { key: 'vitrificacao', source: 'video_auto03', label: 'Ato 3 — Vitrificação Cerâmica & Hidrofobia' },
  { key: 'interior', source: 'video_auto04', label: 'Ato 4 — Detalhamento Interno & Couro' },
]

const EXTENSIONS = ['.mp4', '.mov', '.webm']
const IGNORED_DIRS = new Set(['node_modules', 'dist', 'public', '.git', '.vscode', '.svelte-kit'])
const FPS = 24

/** Conjuntos de frames. O mobile tem 1/4 dos pixels (vídeos de ~864px de origem: sem perda visível). */
const VARIANTS = [
  { key: 'desktop', dir: 'frames', scale: '1920:-1', quality: 82 },
  { key: 'mobile', dir: 'frames-mobile', scale: '960:-2', quality: 78 },
]

const args = process.argv.slice(2)
const manifestOnly = args.includes('--manifest-only')
const srcArg = args.find((a) => a.startsWith('--src='))?.slice('--src='.length)
const variantArg = args.find((a) => a.startsWith('--variant='))?.slice('--variant='.length)

function walk(dir, depth, out) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (depth > 0 && !IGNORED_DIRS.has(entry.name) && !entry.name.startsWith('.')) walk(full, depth - 1, out)
    } else if (EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
      out.push(full)
    }
  }
  return out
}

function locateVideos() {
  const searchRoots = []
  if (srcArg) searchRoots.push({ dir: path.resolve(srcArg), depth: 4 })
  searchRoots.push({ dir: ROOT, depth: 4 }, { dir: path.dirname(ROOT), depth: 0 })

  const found = {}
  for (const { dir, depth } of searchRoots) {
    const candidates = walk(dir, depth, [])
    for (const act of ACTS) {
      if (found[act.key]) continue
      const hit = candidates.find((file) => path.parse(file).name.toLowerCase() === act.source)
      if (hit) found[act.key] = hit
    }
    if (ACTS.every((a) => found[a.key])) break
  }

  const missing = ACTS.filter((a) => !found[a.key])
  if (missing.length) {
    console.error(`[frames] Vídeos não encontrados: ${missing.map((m) => m.source).join(', ')}`)
    console.error('[frames] Informe a pasta com --src="CAMINHO" ou coloque os vídeos na raiz do projeto.')
    process.exit(1)
  }
  return found
}

function extract(variant, act, input) {
  const outDir = path.join(PUBLIC_DIR, variant.dir, act.key)
  fs.rmSync(outDir, { recursive: true, force: true })
  fs.mkdirSync(outDir, { recursive: true })
  console.log(`[frames] ${variant.key.padEnd(7)} ${act.label}\n         ${input}\n      -> public/${variant.dir}/${act.key}/frame_%04d.webp`)
  execFileSync(
    'ffmpeg',
    [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-i', input,
      '-an',
      '-vf', `fps=${FPS},scale=${variant.scale}:flags=lanczos`,
      '-c:v', 'libwebp',
      '-q:v', String(variant.quality),
      '-compression_level', '4',
      '-start_number', '1',
      path.join(outDir, 'frame_%04d.webp'),
    ],
    { stdio: 'inherit' },
  )
}

function extractOgImage(input) {
  execFileSync(
    'ffmpeg',
    [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-ss', '1.2', '-i', input,
      '-frames:v', '1',
      '-vf', 'scale=1200:630:force_original_aspect_ratio=increase:flags=lanczos,crop=1200:630',
      '-q:v', '3',
      OG_FILE,
    ],
    { stdio: 'inherit' },
  )
  console.log('[frames] Imagem de compartilhamento: public/og-image.jpg')
}

function probeSize(file) {
  try {
    const out = execFileSync(
      'ffprobe',
      ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', file],
      { encoding: 'utf8' },
    ).trim()
    const [w, h] = out.split('x').map(Number)
    if (w > 0 && h > 0) return { width: w, height: h }
  } catch {
    /* ffprobe ausente: o motor usa naturalWidth/naturalHeight da imagem */
  }
  return { width: 0, height: 0 }
}

function countFrames(variant, key) {
  const dir = path.join(PUBLIC_DIR, variant.dir, key)
  if (!fs.existsSync(dir)) return { count: 0, files: [] }
  const files = fs.readdirSync(dir).filter((f) => /^frame_\d{4}\.webp$/.test(f)).sort()
  // Garante sequência contínua 0001..N (o motor requisita exatamente esses nomes).
  files.forEach((f, i) => {
    const expected = `frame_${String(i + 1).padStart(4, '0')}.webp`
    if (f !== expected) throw new Error(`[frames] Sequência quebrada em ${variant.dir}/${key}: esperado ${expected}, encontrado ${f}`)
  })
  return { count: files.length, files }
}

function collect(variant) {
  return ACTS.map((act) => {
    const { count, files } = countFrames(variant, act.key)
    if (!count) return null
    const { width, height } = probeSize(path.join(PUBLIC_DIR, variant.dir, act.key, files[0]))
    return { act, dir: `${variant.dir}/${act.key}`, count, width, height }
  })
}

function renderSet(entries) {
  return entries
    .map(
      ({ act, dir, count, width, height }) => `    ${act.key}: {
      key: '${act.key}',
      label: '${act.label}',
      dir: '${dir}',
      count: ${count},
      width: ${width},
      height: ${height},
    },`,
    )
    .join('\n')
}

function writeManifest() {
  const desktop = collect(VARIANTS[0])
  const missingDesktop = desktop.findIndex((e) => !e)
  if (missingDesktop >= 0) throw new Error(`[frames] Nenhum frame em public/frames/${ACTS[missingDesktop].key}`)

  let mobile = collect(VARIANTS[1])
  if (mobile.some((e) => !e)) {
    console.warn('[frames] Conjunto mobile incompleto — o mobile vai usar os frames desktop. Rode: npm run frames -- --variant=mobile')
    mobile = desktop
  }

  const total = desktop.reduce((sum, e) => sum + e.count, 0)
  const ts = `// ARQUIVO GERADO AUTOMATICAMENTE por scripts/build-frames.mjs — não edite à mão.
// Regenerar: npm run frames (extração completa) ou npm run frames:manifest (só recontagem).
// As contagens abaixo são exatas: o motor nunca requisita frame_N.webp com N > count (zero 404).

export type ActKey = 'estudio' | 'polimento' | 'vitrificacao' | 'interior'

/** desktop = 1920px; mobile = 960px (telefones e tablets touch — 1/4 dos pixels, carga muito menor). */
export type FrameVariant = 'desktop' | 'mobile'

export interface FrameSequence {
  key: ActKey
  label: string
  /** Caminho relativo a BASE_URL (sem barra inicial). */
  dir: string
  /** Quantidade exata de arquivos frame_0001.webp … frame_NNNN.webp. */
  count: number
  width: number
  height: number
}

export const FRAME_PAD = 4
export const FRAME_EXT = 'webp'
export const FRAME_FPS = ${FPS}

export const frameSets: Record<FrameVariant, Record<ActKey, FrameSequence>> = {
  desktop: {
${renderSet(desktop)}
  },
  mobile: {
${renderSet(mobile)}
  },
}

/** Conjunto desktop (1920px). */
export const framesManifest = frameSets.desktop

export const ACT_ORDER: readonly ActKey[] = ['estudio', 'polimento', 'vitrificacao', 'interior']

export const TOTAL_FRAMES = ${total}
`
  fs.mkdirSync(path.dirname(MANIFEST_FILE), { recursive: true })
  fs.writeFileSync(MANIFEST_FILE, ts, 'utf8')
  console.log('[frames] Manifesto gerado: src/lib/config/framesManifest.ts')
  for (const [name, set] of [['desktop', desktop], ['mobile', mobile]]) {
    for (const e of set) console.log(`         ${name.padEnd(8)} ${e.act.key.padEnd(13)} ${String(e.count).padStart(4)} frames  ${e.width}x${e.height}`)
  }
  console.log(`         ${'TOTAL'.padEnd(22)} ${String(total).padStart(4)} frames por conjunto`)
}

if (!manifestOnly) {
  const videos = locateVideos()
  const variants = variantArg ? VARIANTS.filter((v) => v.key === variantArg) : VARIANTS
  if (!variants.length) {
    console.error(`[frames] --variant inválido: ${variantArg} (use desktop ou mobile)`)
    process.exit(1)
  }
  for (const variant of variants) for (const act of ACTS) extract(variant, act, videos[act.key])
  extractOgImage(videos.estudio)
}
writeManifest()

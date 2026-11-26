// ARQUIVO GERADO AUTOMATICAMENTE por scripts/build-frames.mjs — não edite à mão.
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
export const FRAME_FPS = 24

export const frameSets: Record<FrameVariant, Record<ActKey, FrameSequence>> = {
  desktop: {
    estudio: {
      key: 'estudio',
      label: 'Ato 1 — Chegada no Estúdio',
      dir: 'frames/estudio',
      count: 97,
      width: 1920,
      height: 1102,
    },
    polimento: {
      key: 'polimento',
      label: 'Ato 2 — Correção de Pintura & Polimento',
      dir: 'frames/polimento',
      count: 97,
      width: 1920,
      height: 1102,
    },
    vitrificacao: {
      key: 'vitrificacao',
      label: 'Ato 3 — Vitrificação Cerâmica & Hidrofobia',
      dir: 'frames/vitrificacao',
      count: 97,
      width: 1920,
      height: 1102,
    },
    interior: {
      key: 'interior',
      label: 'Ato 4 — Detalhamento Interno & Couro',
      dir: 'frames/interior',
      count: 240,
      width: 1920,
      height: 1080,
    },
  },
  mobile: {
    estudio: {
      key: 'estudio',
      label: 'Ato 1 — Chegada no Estúdio',
      dir: 'frames-mobile/estudio',
      count: 97,
      width: 960,
      height: 552,
    },
    polimento: {
      key: 'polimento',
      label: 'Ato 2 — Correção de Pintura & Polimento',
      dir: 'frames-mobile/polimento',
      count: 97,
      width: 960,
      height: 552,
    },
    vitrificacao: {
      key: 'vitrificacao',
      label: 'Ato 3 — Vitrificação Cerâmica & Hidrofobia',
      dir: 'frames-mobile/vitrificacao',
      count: 97,
      width: 960,
      height: 552,
    },
    interior: {
      key: 'interior',
      label: 'Ato 4 — Detalhamento Interno & Couro',
      dir: 'frames-mobile/interior',
      count: 240,
      width: 960,
      height: 540,
    },
  },
}

/** Conjunto desktop (1920px). */
export const framesManifest = frameSets.desktop

export const ACT_ORDER: readonly ActKey[] = ['estudio', 'polimento', 'vitrificacao', 'interior']

export const TOTAL_FRAMES = 531

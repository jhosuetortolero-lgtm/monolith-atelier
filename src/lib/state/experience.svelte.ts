/**
 * Estado global reativo da experiência (Svelte 5 runes).
 * Alimentado pelo ScrollCanvasEngine (progresso suavizado) e pelos carregadores de frames.
 */
import type { ActKey } from '../config/framesManifest'
import type { EngineFrameState } from '../engine/ScrollCanvasEngine'

export const experience = $state({
  /** Preloader concluído e scroll liberado. */
  ready: false,
  /** Fase 1 (Ato 1) — 0 a 1. */
  heroProgress: 0,
  /** Fase 2 (Atos 2–4, segundo plano) — 0 a 1. */
  bufferProgress: 0,
  /** Progresso suavizado do canvas — 0 a 1. */
  progress: 0,
  actIndex: 0,
  actKey: 'estudio' as ActKey,
  frame: 1,
  frameCount: 1,
  finale: 0,
})

export function syncFromEngine(state: EngineFrameState) {
  experience.progress = state.progress
  experience.actIndex = state.actIndex
  experience.actKey = state.actKey
  experience.frame = state.frame
  experience.frameCount = state.frameCount
  experience.finale = state.finale
}

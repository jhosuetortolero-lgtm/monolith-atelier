import { studioConfig } from '../config/studioConfig'
import type { Protocol, VehicleSize } from '../config/studioConfig'

const cfg = studioConfig.configurator

export interface QuoteEstimate {
  size: VehicleSize
  protocols: Protocol[]
  /** Horas de bancada (mão de obra), já com o fator de porte. */
  benchHours: number
  /** Dias úteis de permanência no estúdio (inclui cura quando houver). */
  stayDays: number
}

/** Horas de bancada de um protocolo para um porte (arredondadas — a soma exibida bate com o total). */
export const protocolHours = (protocol: Protocol, size: VehicleSize) => Math.round(protocol.hours * size.factor)

export function estimateQuote(sizeId: string, protocolIds: readonly string[]): QuoteEstimate {
  const size: VehicleSize = cfg.vehicleSizes.find((s) => s.id === sizeId) ?? cfg.vehicleSizes[0]
  const protocols: Protocol[] = cfg.protocols.filter((p) => protocolIds.includes(p.id))
  const benchHours = protocols.reduce((sum, p) => sum + protocolHours(p, size), 0)
  const needsCure = protocols.some((p) => (p.cureHours ?? 0) > 0)
  const stayDays = benchHours === 0 ? 0 : Math.ceil(benchHours / cfg.workdayHours) + (needsCure ? 1 : 0)
  return { size, protocols, benchHours, stayDays }
}

export const formatDays = (days: number) => `${days} ${days === 1 ? 'dia útil' : 'dias úteis'}`

export function buildWhatsAppMessage(quote: QuoteEstimate, model: string): string {
  const m = cfg.whatsappMessage
  const lines = [
    `*${studioConfig.brand.name} — ${m.heading}*`,
    '',
    `*${m.sizeLabel}:* ${quote.size.label}`,
  ]
  const trimmed = model.trim()
  if (trimmed) lines.push(`*${m.modelLabel}:* ${trimmed}`)
  lines.push('', `*${m.protocolsLabel}:*`, ...quote.protocols.map((p) => `• ${p.label}`), '')
  lines.push(`*${m.benchLabel}:* ${quote.benchHours}h`)
  lines.push(`*${m.stayLabel}:* ${formatDays(quote.stayDays)}`)
  lines.push('', m.footer)
  return lines.join('\n')
}

export function whatsappUrl(message: string, phone: string = studioConfig.contact.whatsapp): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
}

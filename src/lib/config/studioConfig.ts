/**
 * MONOLITH ATELIER — Configuração White-Label
 *
 * Este é o ÚNICO arquivo que precisa ser editado para personalizar o site para um novo estúdio:
 * marca, cidade, WhatsApp, textos dos atos, protocolos, tempos estimados e SEO.
 * O index.html também é preenchido a partir daqui (plugin em vite.config.ts).
 *
 * Regra: este módulo não importa nada (é lido tanto pelo app quanto pelo vite.config.ts).
 */

export type ActId = 'estudio' | 'polimento' | 'vitrificacao' | 'interior'

export interface Metric {
  /** Texto completo exibido em fonte mono. */
  label: string
  /** Trecho de `label` destacado em âmbar (precisa existir dentro de `label`). */
  emphasis?: string
}

export interface ActCopy {
  id: ActId
  /** Rótulo curto da navegação. */
  navLabel: string
  /** Nome exibido no HUD de telemetria. */
  hudLabel: string
  tag: string
  title: string
  /** Palavras do título exibidas em itálico âmbar (devem existir no título, sem pontuação). */
  accent: string[]
  lede: string
  metrics: Metric[]
}

export interface VehicleSize {
  id: string
  label: string
  hint: string
  /** Multiplicador aplicado às horas de bancada de cada protocolo. */
  factor: number
}

export interface Protocol {
  id: string
  label: string
  detail: string
  /** Horas de bancada para porte base (fator 1). */
  hours: number
  /** Horas de cura/repouso fora da bancada (somam 1 dia à permanência). */
  cureHours?: number
}

export const studioConfig = {
  brand: {
    name: 'MONOLITH ATELIER',
    wordmark: { primary: 'MONOLITH', secondary: 'ATELIER' },
    monogram: 'M',
    tagline: 'Estética Automotiva & Proteção Cerâmica de Alta Precisão',
    city: 'São Paulo',
    state: 'SP',
    serviceNote: 'Estúdio privativo · Atendimento exclusivo com hora marcada',
  },

  contact: {
    /** Somente dígitos, com DDI + DDD. Ex.: 55 11 99999-9999 -> '5511999999999'. */
    whatsapp: '5511999999999',
    whatsappDisplay: '+55 11 99999-9999',
  },

  seo: {
    title: 'MONOLITH ATELIER — Estética Automotiva & Proteção Cerâmica de Alta Precisão',
    description:
      'Estúdio de estética automotiva de alto padrão em São Paulo: correção de pintura, vitrificação cerâmica 9H, PPF e detalhamento interno sob iluminação de inspeção.',
    themeColor: '#0A0A0C',
    locale: 'pt_BR',
    /**
     * URL pública final do site, com barra no fim (ex.: 'https://monolithatelier.com.br/').
     * Necessária para a prévia com imagem ao compartilhar o link no WhatsApp/Instagram (og:image absoluta).
     */
    siteUrl: 'https://jhosuetortolero-lgtm.github.io/monolith-atelier/',
  },

  hero: {
    primaryCta: 'Iniciar a Inspeção',
    secondaryCta: 'Orçamento Privativo',
    scrollCue: 'Role para iniciar a inspeção',
  },

  preloader: {
    status: 'Calibrando iluminação de inspeção',
  },

  acts: [
    {
      id: 'estudio',
      navLabel: 'Estúdio',
      hudLabel: 'Chegada no Estúdio',
      tag: 'ESTÚDIO DE ALTA PRECISÃO • ESTÉTICA AUTOMOTIVA',
      title: 'A Arte da Perfeição em Cada Reflexo.',
      accent: ['Perfeição'],
      lede:
        'Seu automóvel é patrimônio — e é tratado como tal. Sob iluminação de inspeção linear, cada painel é lido em silêncio antes de qualquer toque, para preservar o valor original e devolver a profundidade que só a luz certa revela.',
      metrics: [],
    },
    {
      id: 'polimento',
      navLabel: 'Polimento',
      hudLabel: 'Correção de Pintura',
      tag: '02 / CORREÇÃO DE PINTURA',
      title: 'Nivelamento Óptico & Polimento Técnico.',
      accent: ['Óptico'],
      lede:
        'Medimos a espessura do verniz painel a painel antes de iniciar. O polimento em múltiplas etapas elimina hologramas, swirls e micro-riscos preservando a camada protetora de fábrica.',
      metrics: [
        { label: '99.4% Remoção de Micro-riscos', emphasis: '99.4%' },
        { label: 'Leitura de Verniz por Ultrassom', emphasis: 'Ultrassom' },
      ],
    },
    {
      id: 'vitrificacao',
      navLabel: 'Cerâmica',
      hudLabel: 'Vitrificação Cerâmica',
      tag: '03 / PROTEÇÃO CERÂMICA 9H',
      title: 'Blindagem Molecular & Hidrofobia Extrema.',
      accent: ['Molecular'],
      lede:
        'O revestimento cerâmico 9H se liga quimicamente ao verniz e forma uma barreira vítrea contra contaminantes, radiação UV e agentes químicos. A água não se fixa: ela desliza.',
      metrics: [
        { label: 'Ângulo de Contato 115°', emphasis: '115°' },
        { label: 'Proteção UV & Química até 5 Anos', emphasis: '5 Anos' },
      ],
    },
    {
      id: 'interior',
      navLabel: 'Cabine',
      hudLabel: 'Detalhamento de Cabine',
      tag: '04 / DETALHAMENTO DE CABINE',
      title: 'Restauração Sensorial & Couro Nobre.',
      accent: ['Sensorial'],
      lede:
        'A cabine recebe o mesmo rigor da carroceria: higienização profunda, limpeza de couro com pH neutro e hidratação que devolve o toque e o acabamento fosco original — sem brilho artificial.',
      metrics: [
        { label: 'Higienização a Vapor Seco', emphasis: 'Vapor Seco' },
        { label: 'Hidratação Fosca Original de Fábrica', emphasis: 'Fosca' },
      ],
    },
  ] satisfies ActCopy[],

  configurator: {
    navLabel: 'Orçamento Privativo',
    hudLabel: 'Configurador de Protocolo',
    tag: '05 / CONFIGURADOR DE PROTOCOLO',
    title: 'Seu Protocolo, Sob Medida.',
    titleAccent: 'Sob Medida.',
    lede: 'Escolha o porte e os protocolos. O tempo de estúdio é recalculado em tempo real e sua solicitação segue direto para o consultor técnico.',
    sizeLegend: 'Porte do Veículo',
    protocolLegend: 'Protocolos Desejados',
    modelLabel: 'Modelo e ano',
    modelPlaceholder: 'Ex.: Porsche 911 Carrera S 2023',
    benchLabel: 'Tempo de bancada',
    stayLabel: 'Permanência estimada',
    emptyHint: 'Selecione ao menos um protocolo.',
    cta: 'Solicitar Avaliação via WhatsApp',
    disclaimer: 'Estimativa preliminar. O protocolo final é definido após inspeção presencial sob luz de inspeção.',
    /** Horas úteis de bancada por dia de estúdio. */
    workdayHours: 8,
    defaultSize: 'cupe-sedan',
    defaultProtocols: ['correcao', 'vitrificacao'],
    vehicleSizes: [
      { id: 'cupe-sedan', label: 'Cupê / Sedan', hint: 'Carroceria baixa', factor: 1 },
      { id: 'suv', label: 'SUV / Utilitário', hint: 'Área de painéis ampliada', factor: 1.3 },
      { id: 'superesportivo', label: 'Superesportivo', hint: 'Aerodinâmica complexa', factor: 1.5 },
    ] satisfies VehicleSize[],
    protocols: [
      { id: 'correcao', label: 'Correção de Pintura', detail: 'Multi-etapas com leitura de verniz', hours: 16 },
      { id: 'vitrificacao', label: 'Vitrificação Cerâmica 9H', detail: 'Duas camadas + cura controlada', hours: 10, cureHours: 12 },
      { id: 'ppf', label: 'PPF Frontal', detail: 'Capô, para-choque, para-lamas e retrovisores', hours: 12 },
      { id: 'interior', label: 'Detalhamento Interno Full', detail: 'Vapor seco, couro e acabamentos', hours: 8 },
    ] satisfies Protocol[],
    whatsappMessage: {
      heading: 'Solicitação de Avaliação Privativa',
      sizeLabel: 'Porte do veículo',
      modelLabel: 'Modelo / ano',
      protocolsLabel: 'Protocolos desejados',
      benchLabel: 'Tempo de bancada estimado',
      stayLabel: 'Permanência estimada',
      footer: 'Enviado pelo configurador do site. Aguardo retorno para agendar a inspeção.',
    },
  },

  footer: {
    legal: 'Todos os direitos reservados.',
  },
}

export type StudioConfig = typeof studioConfig

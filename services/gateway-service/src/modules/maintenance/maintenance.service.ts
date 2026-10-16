import type { PageSeo } from '@blog/contracts'
import { renderApplicationHtml, renderPrerenderHtml } from '../prerender/index.ts'

type MaintenanceStatus = { maintenance_enabled: boolean; locale: 'ru' | 'en' | 'sr' }
export type MaintenancePort = {
  status: (viewer_jwt: string) => Promise<MaintenanceStatus>
  template: () => Promise<string | null>
}

const COPY = {
  ru: {
    title: 'Технические работы',
    description: 'Сайт временно недоступен. Пожалуйста, зайдите позже.',
  },
  en: {
    title: 'Maintenance',
    description: 'The site is temporarily unavailable. Please check back later.',
  },
  sr: {
    title: 'Održavanje',
    description: 'Sajt je privremeno nedostupan. Pokušajte ponovo kasnije.',
  },
}

export class MaintenanceService {
  constructor(
    private readonly port: MaintenancePort,
    private readonly public_origin: string,
  ) {}

  status(viewer_jwt: string): Promise<MaintenanceStatus> {
    // Read the owner on every protected request: all gateway replicas enforce a saved switch immediately.
    return this.port.status(viewer_jwt)
  }

  async page(locale: MaintenanceStatus['locale'], nonce: string): Promise<string> {
    const copy = COPY[locale]
    const page: PageSeo = {
      status: 200,
      title: copy.title,
      description: copy.description,
      canonical_url: this.public_origin,
      site_name: copy.title,
      locale,
      og_type: 'website',
      robots: 'noindex, follow',
      body_text: copy.description,
      images: null,
      structured_data: { '@context': 'https://schema.org', '@graph': [] },
    }
    const template = await this.port.template()
    return template
      ? renderApplicationHtml(page, template, nonce)
      : renderPrerenderHtml(page, nonce)
  }
}

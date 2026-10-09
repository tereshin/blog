const BOTS = ['googlebot', 'bingbot', 'yandexbot', 'twitterbot', 'facebookexternalhit', 'telegrambot', 'slackbot', 'linkedinbot', 'discordbot', 'whatsapp']

/** Робот поисковика или клиент превью ссылки. Пустой User-Agent — человек. */
export function isBot(user_agent: string | undefined): boolean {
  if (!user_agent) return false
  const normalized = user_agent.toLowerCase()
  return BOTS.some((bot) => normalized.includes(bot))
}

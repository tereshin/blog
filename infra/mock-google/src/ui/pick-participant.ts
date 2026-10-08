export type PickerParticipant = { key: string; display_name: string; email: string; role: string; note: string }

export type PickerHidden = {
  client_id: string
  redirect_uri: string
  state: string
  nonce: string
  code_challenge: string
  code_challenge_method: string
}

export function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

/** Страница выбора участника. Все значения экранируются; у каждой кнопки свой `data-participant`. */
export function renderPicker(participants: readonly PickerParticipant[], hidden: PickerHidden): string {
  const fields = Object.entries(hidden)
    .map(([name, value]) => `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`)
    .join('')
  const items = participants
    .map(
      (participant) => `<li>
  <form method="post" action="/authorize">${fields}<input type="hidden" name="participant" value="${escapeHtml(participant.key)}">
    <button type="submit" data-participant="${escapeHtml(participant.key)}">
      <strong>${escapeHtml(participant.display_name)}</strong>
      <span>${escapeHtml(participant.email)} · ${escapeHtml(participant.role)}</span>
      <em>${escapeHtml(participant.note)}</em>
    </button>
  </form>
</li>`,
    )
    .join('\n')
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>Вход через тестовый Google</title>
<style>body{font:16px system-ui;max-width:32rem;margin:2rem auto;padding:0 1rem}ul{list-style:none;padding:0}li{margin:.5rem 0}
button{width:100%;text-align:left;padding:.75rem 1rem;border:1px solid #ccc;border-radius:.5rem;background:#fff;cursor:pointer}
button span,button em{display:block;font-size:.85rem;color:#555}</style></head>
<body><h1>Тестовый вход</h1><p>Это <b>mock-google</b>: настоящего Google здесь нет. Выберите участника.</p>
<ul>
${items}
</ul></body></html>`
}

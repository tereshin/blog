import { HttpResponse } from 'msw'
import type { JsonBodyType } from 'msw'

/** Повтор мутации с тем же `X-Idempotency-Key` отдаёт сохранённый ответ; другой запрос с тем же ключом — 409. */
export class IdempotencyReplay<TBody extends JsonBodyType> {
  private readonly results = new Map<string, { input: string; status: number; body: TBody }>()

  replay(request: Request, body: unknown) {
    const key = request.headers.get('X-Idempotency-Key') ?? ''
    const input = JSON.stringify({ path: new URL(request.url).pathname, method: request.method, body })
    const previous = this.results.get(key)
    if (!previous) return { key, input, response: null }
    if (previous.input !== input) return { key, input, response: HttpResponse.json({ code: 'idempotency_key_conflict', title: 'idempotency_key_conflict', status: 409 }, { status: 409 }) }
    return {
      key,
      input,
      response:
        previous.status === 204
          ? new HttpResponse(null, { status: 204 })
          : HttpResponse.json(previous.body, { status: previous.status }),
    }
  }

  remember(key: string, input: string, status: number, body: TBody) {
    if (key) this.results.set(key, { input, status, body })
    return status === 204 ? new HttpResponse(null, { status: 204 }) : HttpResponse.json(body, { status })
  }
}

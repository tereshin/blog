import { HttpResponse, http } from 'msw'
import { emailFlowBodySchema, emailFlowIdSchema, emailCodeConfirmBodySchema, passwordSetupBodySchema } from '@blog/contracts'
import type { EmailCodeStep } from '@blog/contracts'
import { MOCK_VIEWER_KEY } from './session.ts'

const accounts = new Set(['reader@blog.test'])
const flows = new Map<string, { email: string; response: EmailCodeStep; is_verified: boolean; is_consumed: boolean }>()
function codeResponse(flow_id: string, purpose: 'registration' | 'password_reset'): EmailCodeStep {
  return { step: 'code', flow_id, purpose, server_time: new Date().toISOString(),
    resend_at: new Date(Date.now() + 60_000).toISOString(), expires_at: new Date(Date.now() + 600_000).toISOString() }
}
function invalid() { return HttpResponse.json({ code: 'invalid_code', title: 'Invalid code' }, { status: 422 }) }

/** Fixed code 123456 belongs only to the opt-in MSW environment. */
export const authFlowHandlers = [
  http.post('*/v1/auth/email-flows', async ({ request }) => {
    const body = emailFlowBodySchema.parse(await request.json())
    const email = body.email.trim().toLowerCase()
    if (accounts.has(email) && body.purpose === 'continue') return HttpResponse.json({ step: 'password' })
    const response = codeResponse(crypto.randomUUID(), body.purpose === 'continue' ? 'registration' : 'password_reset')
    flows.set(response.flow_id, { email, response, is_verified: false, is_consumed: false })
    return HttpResponse.json(response)
  }),
  http.post('*/v1/auth/email-code-resends', async ({ request }) => {
    const { flow_id } = emailFlowIdSchema.parse(await request.json())
    const flow = flows.get(flow_id)
    if (!flow || flow.is_consumed || flow.is_verified) return invalid()
    if (Date.parse(flow.response.resend_at) > Date.now()) return HttpResponse.json({ code: 'code_cooldown' }, { status: 429 })
    flow.response = codeResponse(flow_id, flow.response.purpose)
    return HttpResponse.json(flow.response)
  }),
  http.post('*/v1/auth/email-code-confirmations', async ({ request }) => {
    const { flow_id, code } = emailCodeConfirmBodySchema.parse(await request.json())
    const flow = flows.get(flow_id)
    if (!flow || flow.is_consumed || flow.is_verified || code !== '123456') return invalid()
    flow.is_verified = true
    return HttpResponse.json({ step: 'password_setup' })
  }),
  http.post('*/v1/auth/password-setups', async ({ request }) => {
    const { flow_id } = passwordSetupBodySchema.parse(await request.json())
    const flow = flows.get(flow_id)
    if (!flow?.is_verified || flow.is_consumed) return invalid()
    accounts.add(flow.email)
    flow.is_consumed = true
    window.localStorage.setItem(MOCK_VIEWER_KEY, 'member')
    return new HttpResponse(null, { status: 204 })
  }),
]

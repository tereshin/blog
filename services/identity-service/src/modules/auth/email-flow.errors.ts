import { AppError } from '@blog/errors'

export class EmailFlowError extends AppError {
  constructor(code: 'invalid_code' | 'code_expired' | 'code_attempts_exhausted' | 'code_cooldown' | 'flow_expired' | 'account_changed') {
    super({ code, http_status: code === 'code_cooldown' ? 429 : 422, message: 'Не удалось продолжить подтверждение почты' })
  }
}

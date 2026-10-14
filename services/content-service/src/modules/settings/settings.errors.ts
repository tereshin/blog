import { ValidationError } from '@blog/errors'

/** Эмодзи реакции — ровно одна графема-пиктограмма. */
export class ReactionEmojiInvalidError extends ValidationError {
  constructor(field: string) {
    super({
      message: 'Эмодзи реакции должно быть одной графемой',
      details: { field },
    })
  }
}

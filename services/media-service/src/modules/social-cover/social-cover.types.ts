import type { SocialCoverRequestedV1, SocialImages } from '@blog/contracts'
import type { RenderTask } from './social-cover.schema.ts'

export type { RenderTask }
export type RenderResult = { bytes: Uint8Array; warnings: string[] }

/** Порт рендера: пул потоков в проде; закрывается при остановке процесса. */
export type CoverRenderer = { render: (task: RenderTask) => Promise<RenderResult>; close: () => Promise<void> }

export type CoverJob = { event: SocialCoverRequestedV1; attempts: number; lease_id: string }

/** Порт очереди задач обложек. `enqueue` идёт в транзакции потребителя `TTx`. */
export type CoverJobsRepositoryPort<TTx> = {
  enqueue: (tx: TTx, event: SocialCoverRequestedV1) => Promise<void>
  claim: () => Promise<CoverJob | null>
  complete: (job: CoverJob, images: SocialImages) => Promise<void>
  fail: (job: CoverJob, message: string) => Promise<void>
  counts: () => Promise<{ pending: number; failed: number }>
}

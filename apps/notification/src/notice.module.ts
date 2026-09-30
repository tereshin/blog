import { Module } from '@nestjs/common';
import { DrizzleNoticeStore } from './drizzle-notice-store';
import { NoticeController } from './notice.controller';
import { NoticeService } from './notice-service';
import type { NoticeStore } from './notice-store';

export const NOTICE_STORE = Symbol('NOTICE_STORE');

@Module({
  controllers: [NoticeController],
  providers: [
    { provide: NOTICE_STORE, useFactory: (): NoticeStore => new DrizzleNoticeStore(process.env.DATABASE_URL ?? '') },
    {
      provide: NoticeService,
      useFactory: (store: NoticeStore) => new NoticeService(store),
      inject: [NOTICE_STORE],
    },
  ],
})
export class NoticeModule {}

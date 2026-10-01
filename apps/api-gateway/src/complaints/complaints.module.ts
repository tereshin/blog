import { Module } from '@nestjs/common';
import { ComplaintReviewController } from './complaints.controller';
import {
  type ComplaintAuditAppender,
  type ComplaintDesk,
  ComplaintReviewService,
} from './complaint-review';
import { HttpComplaintDesk } from './http-complaint-desk';

export const ARTICLE_COMPLAINTS = Symbol('ARTICLE_COMPLAINTS');
export const COMMENT_COMPLAINTS = Symbol('COMMENT_COMPLAINTS');
export const COMPLAINT_AUDIT = Symbol('COMPLAINT_AUDIT');

@Module({
  controllers: [ComplaintReviewController],
  providers: [
    {
      provide: ARTICLE_COMPLAINTS,
      useFactory: (): ComplaintDesk =>
        new HttpComplaintDesk(process.env.CONTENT_BASE_URL ?? 'http://127.0.0.1:3001'),
    },
    {
      provide: COMMENT_COMPLAINTS,
      useFactory: (): ComplaintDesk =>
        new HttpComplaintDesk(process.env.COMMENTS_BASE_URL ?? 'http://127.0.0.1:3002'),
    },
    {
      provide: COMPLAINT_AUDIT,
      useValue: { async append() {} } satisfies ComplaintAuditAppender,
    },
    {
      provide: ComplaintReviewService,
      useFactory: (articles: ComplaintDesk, comments: ComplaintDesk, audit: ComplaintAuditAppender) =>
        new ComplaintReviewService(articles, comments, audit),
      inject: [ARTICLE_COMPLAINTS, COMMENT_COMPLAINTS, COMPLAINT_AUDIT],
    },
  ],
})
export class ComplaintsModule {}

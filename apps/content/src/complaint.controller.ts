import {
  type ArgumentsHost,
  Body,
  Catch,
  Controller,
  type ExceptionFilter,
  Get,
  Param,
  Post,
  Req,
  UseFilters,
} from '@nestjs/common';
import { errorEnvelope } from '@blog/contracts';
import { ArticleError } from './article-error';
import { ComplaintService } from './complaint-service';

type CallerRequest = { user_id?: string };
type ComplaintBody = { reason?: string };

@Catch(ArticleError)
class ComplaintExceptionFilter implements ExceptionFilter {
  catch(error: ArticleError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { send: (body: unknown) => void };
    }>();
    response.status(error.status_code).send(errorEnvelope(error.code, error.params));
  }
}

@Controller('api/v1')
@UseFilters(ComplaintExceptionFilter)
export class ComplaintController {
  constructor(private readonly complaints: ComplaintService) {}

  @Post('articles/:article_id/complaints')
  file(
    @Req() request: CallerRequest,
    @Param('article_id') article_id: string,
    @Body() body: ComplaintBody,
  ) {
    return this.complaints.file({
      article_id,
      reporter_id: request.user_id ?? '',
      reason: body.reason ?? '',
    });
  }

  @Get('internal/complaints/open')
  async listOpen() {
    const rows = await this.complaints.listOpen();
    return rows.map((row) => ({
      id: row.id,
      target_type: 'article' as const,
      target_id: row.article_id,
      reporter_id: row.reporter_id,
      reason: row.reason,
      status: row.status,
      created_at: row.created_at,
    }));
  }

  @Post('internal/complaints/:complaint_id/dismiss')
  async dismiss(@Param('complaint_id') complaint_id: string, @Body() body: ComplaintBody) {
    const row = await this.complaints.dismiss(complaint_id, body.reason ?? '');
    return {
      id: row.id,
      target_type: 'article' as const,
      target_id: row.article_id,
      reporter_id: row.reporter_id,
      reason: row.reason,
      status: row.status,
      created_at: row.created_at,
      resolution_reason: row.resolution_reason ?? null,
    };
  }
}

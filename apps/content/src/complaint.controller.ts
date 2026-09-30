import {
  type ArgumentsHost,
  Body,
  Catch,
  Controller,
  type ExceptionFilter,
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

}

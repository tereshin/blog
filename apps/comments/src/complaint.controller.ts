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
import { CommentError } from './comment-error';
import { ComplaintService } from './complaint-service';

type CallerRequest = { user_id?: string };
type ComplaintBody = { reason?: string };

@Catch(CommentError)
class ComplaintExceptionFilter implements ExceptionFilter {
  catch(error: CommentError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { send: (body: unknown) => void };
    }>();
    response.status(error.status_code).send(errorEnvelope(error.code));
  }
}

@Controller('api/v1')
@UseFilters(ComplaintExceptionFilter)
export class ComplaintController {
  constructor(private readonly complaints: ComplaintService) {}

  @Post('comments/:comment_id/complaints')
  file(
    @Req() request: CallerRequest,
    @Param('comment_id') comment_id: string,
    @Body() body: ComplaintBody,
  ) {
    return this.complaints.file({
      comment_id,
      reporter_id: request.user_id ?? '',
      reason: body.reason ?? '',
    });
  }
}

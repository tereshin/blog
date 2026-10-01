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
import { CommentError } from './comment-error';
import { StaffCommentService } from './staff-service';

type CallerRequest = { user_id?: string; role?: 'user' | 'moderator' | 'administrator' };
type ReasonBody = { reason?: string };

@Catch(CommentError)
class StaffExceptionFilter implements ExceptionFilter {
  catch(error: CommentError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { send: (body: unknown) => void };
    }>();
    response.status(error.status_code).send(errorEnvelope(error.code));
  }
}

@Controller('api/v1')
@UseFilters(StaffExceptionFilter)
export class StaffCommentController {
  constructor(private readonly staff: StaffCommentService) {}

  @Post('admin/comments/:comment_id/hide')
  hide(@Req() request: CallerRequest, @Param('comment_id') comment_id: string, @Body() body: ReasonBody) {
    return this.staff.hide({
      actor_id: request.user_id ?? '',
      role: request.role ?? 'user',
      comment_id,
      reason: body.reason ?? '',
    });
  }

  @Get('admin/comments/:comment_id')
  read(@Req() request: CallerRequest, @Param('comment_id') comment_id: string) {
    return this.staff.staffRead({ role: request.role ?? 'user', comment_id });
  }
}

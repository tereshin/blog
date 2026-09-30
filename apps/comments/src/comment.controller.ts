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
import { CommentService } from './comment-service';

@Catch(CommentError)
class CommentExceptionFilter implements ExceptionFilter {
  catch(error: CommentError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { send: (body: unknown) => void };
    }>();
    response.status(error.status_code).send(errorEnvelope(error.code));
  }
}

type CallerRequest = { user_id?: string };
type CommentBody = { body?: string; mentioned_user_ids?: string[] };

@Controller('api/v1')
@UseFilters(CommentExceptionFilter)
export class CommentController {
  constructor(private readonly comments: CommentService) {}

  @Post('articles/:article_id/comments')
  comment(
    @Req() request: CallerRequest,
    @Param('article_id') article_id: string,
    @Body() body: CommentBody,
  ) {
    return this.comments.comment({
      article_id,
      author_id: request.user_id ?? '',
      body: body.body ?? '',
      mentioned_user_ids: body.mentioned_user_ids,
    });
  }

  @Post('comments/:comment_id/replies')
  reply(
    @Req() request: CallerRequest,
    @Param('comment_id') comment_id: string,
    @Body() body: CommentBody,
  ) {
    return this.comments.reply({
      comment_id,
      author_id: request.user_id ?? '',
      body: body.body ?? '',
      mentioned_user_ids: body.mentioned_user_ids,
    });
  }

  @Get('articles/:article_id/comments')
  async list(@Param('article_id') article_id: string) {
    const items = await this.comments.list(article_id);
    return { items, has_next: false, has_prev: false, next_cursor: null };
  }
}

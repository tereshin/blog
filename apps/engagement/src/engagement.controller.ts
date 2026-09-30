import {
  type ArgumentsHost,
  Catch,
  Controller,
  Delete,
  type ExceptionFilter,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseFilters,
} from '@nestjs/common';
import { errorEnvelope } from '@blog/contracts';
import { EngagementError } from './engagement-error';
import { EngagementService } from './engagement-service';

type CallerRequest = { user_id?: string | null };

@Catch(EngagementError)
class EngagementExceptionFilter implements ExceptionFilter {
  catch(error: EngagementError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { send: (body: unknown) => void };
    }>();
    response.status(error.status_code).send(errorEnvelope(error.code));
  }
}

@Controller('api/v1')
@UseFilters(EngagementExceptionFilter)
export class EngagementController {
  constructor(private readonly engagement: EngagementService) {}

  @Post('articles/:article_id/like')
  likeArticle(@Req() request: CallerRequest, @Param('article_id') article_id: string) {
    return this.engagement.likeArticle({ user_id: request.user_id ?? null, article_id });
  }

  @Post('comments/:comment_id/like')
  likeComment(@Req() request: CallerRequest, @Param('comment_id') comment_id: string) {
    return this.engagement.likeComment({ user_id: request.user_id ?? null, comment_id });
  }

  @Post('articles/:article_id/bookmark')
  bookmark(@Req() request: CallerRequest, @Param('article_id') article_id: string) {
    return this.engagement.bookmark({ user_id: request.user_id ?? null, article_id });
  }

  @Delete('articles/:article_id/bookmark')
  removeBookmark(@Req() request: CallerRequest, @Param('article_id') article_id: string) {
    return this.engagement.removeBookmark({ user_id: request.user_id ?? null, article_id });
  }

  @Get('me/bookmarks')
  listBookmarks(@Req() request: CallerRequest) {
    return this.engagement.listBookmarks(request.user_id ?? null);
  }

  @Post('articles/:article_id/views')
  recordView(
    @Req() request: CallerRequest,
    @Param('article_id') article_id: string,
    @Headers('x-viewer-key') viewer_key?: string,
  ) {
    return this.engagement.recordView({
      article_id,
      user_id: request.user_id ?? null,
      viewer_key: viewer_key ?? null,
    });
  }
}

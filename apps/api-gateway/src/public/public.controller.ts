import {
  type ArgumentsHost,
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
import { type GuestAction, PublicArticleService, PublicReadError } from './public-article';

type CallerRequest = { user_id?: string; visitor?: string };

@Catch(PublicReadError)
class PublicReadExceptionFilter implements ExceptionFilter {
  catch(error: PublicReadError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { send: (body: unknown) => void };
      header: (name: string, value: string) => void;
    }>();
    response.status(error.status_code).send(errorEnvelope(error.code, error.params));
  }
}

@Controller('api/v1')
@UseFilters(PublicReadExceptionFilter)
export class PublicArticleController {
  constructor(private readonly articles: PublicArticleService) {}

  @Get('articles/id/:article_id')
  byId(@Req() request: CallerRequest, @Param('article_id') article_id: string) {
    return this.articles.readById({
      article_id,
      user_id: request.user_id ?? '',
      visitor: request.visitor ?? 'guest',
    });
  }

  @Get('articles/:slug')
  bySlug(@Req() request: CallerRequest, @Param('slug') slug: string) {
    return this.articles.readBySlug({
      slug,
      user_id: request.user_id ?? '',
      visitor: request.visitor ?? 'guest',
    });
  }

  @Post('articles/:article_id/likes')
  like(@Req() request: CallerRequest) {
    return this.write(request, 'like');
  }

  @Post('articles/:article_id/comments')
  comment(@Req() request: CallerRequest) {
    return this.write(request, 'comment');
  }

  @Post('users/:user_id/follow')
  follow(@Req() request: CallerRequest) {
    return this.write(request, 'follow');
  }

  @Post('articles/:article_id/bookmarks')
  bookmark(@Req() request: CallerRequest) {
    return this.write(request, 'bookmark');
  }

  @Post('articles/:article_id/publish')
  publish(@Req() request: CallerRequest) {
    return this.write(request, 'publish');
  }

  @Post('conversations/:conversation_id/messages')
  message(@Req() request: CallerRequest) {
    return this.write(request, 'direct_message');
  }

  private write(request: CallerRequest, action: GuestAction) {
    return this.articles.write({ user_id: request.user_id ?? '', action });
  }
}

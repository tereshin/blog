import {
  type ArgumentsHost,
  Body,
  Catch,
  Controller,
  type ExceptionFilter,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseFilters,
} from '@nestjs/common';
import { errorEnvelope } from '@blog/contracts';
import { ArticleError } from './article-error';
import type { EditorJson } from './article-store';
import { DraftService } from './draft-service';

type CallerRequest = {
  user_id?: string | null;
};

type SaveBody = {
  version: number;
  editor_json: EditorJson;
  title?: string | null;
  language?: string | null;
  category_id?: string | null;
};

@Catch(ArticleError)
class ArticleExceptionFilter implements ExceptionFilter {
  catch(error: ArticleError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { send: (body: unknown) => void };
    }>();
    response.status(error.status_code).send(errorEnvelope(error.code, error.params));
  }
}

@Controller('api/v1')
@UseFilters(ArticleExceptionFilter)
export class DraftController {
  constructor(private readonly drafts: DraftService) {}

  @Post('articles')
  open(@Req() request: CallerRequest) {
    return this.drafts.open({ author_id: request.user_id ?? '' });
  }

  @Patch('me/articles/:article_id')
  save(@Req() request: CallerRequest, @Param('article_id') article_id: string, @Body() body: SaveBody) {
    return this.drafts.save({
      author_id: request.user_id ?? '',
      article_id,
      version: body.version,
      editor_json: body.editor_json,
      title: body.title,
      language: body.language,
      category_id: body.category_id,
    });
  }

  @Get('me/articles/:article_id')
  read(@Req() request: CallerRequest, @Param('article_id') article_id: string) {
    return this.drafts.read({ viewer_id: request.user_id ?? null, article_id });
  }
}

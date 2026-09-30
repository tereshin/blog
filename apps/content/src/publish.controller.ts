import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import { PublishService } from './publish-service';

type CallerRequest = {
  user_id?: string;
};

type PublishBody = {
  category_ids?: string[];
  title?: string | null;
  language?: string | null;
};

@Controller('api/v1')
export class PublishController {
  constructor(private readonly publish: PublishService) {}

  @Post('articles/:article_id/publish')
  publishArticle(
    @Req() request: CallerRequest,
    @Param('article_id') article_id: string,
    @Body() body: PublishBody,
  ) {
    return this.publish.publish({
      author_id: request.user_id ?? '',
      article_id,
      category_ids: body.category_ids ?? [],
      title: body.title ?? null,
      language: body.language ?? null,
    });
  }

  @Post('articles/:article_id/withdraw')
  withdraw(@Req() request: CallerRequest, @Param('article_id') article_id: string) {
    return this.publish.withdraw({ author_id: request.user_id ?? '', article_id });
  }
}

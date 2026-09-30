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
import { StaffArticleService } from './staff-service';

type CallerRequest = { user_id?: string; role?: 'user' | 'moderator' | 'administrator' };
type ReasonBody = { reason?: string };
type CategoryBody = { category_id?: string };

@Catch(ArticleError)
class StaffExceptionFilter implements ExceptionFilter {
  catch(error: ArticleError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { send: (body: unknown) => void };
    }>();
    response.status(error.status_code).send(errorEnvelope(error.code, error.params));
  }
}

@Controller('api/v1')
@UseFilters(StaffExceptionFilter)
export class StaffArticleController {
  constructor(private readonly staff: StaffArticleService) {}

  @Post('admin/articles/:article_id/hide')
  hide(@Req() request: CallerRequest, @Param('article_id') article_id: string, @Body() body: ReasonBody) {
    return this.staff.hide({
      actor_id: request.user_id ?? '',
      role: request.role ?? 'user',
      article_id,
      reason: body.reason ?? '',
    });
  }

  @Post('admin/articles/:article_id/category')
  move(@Req() request: CallerRequest, @Param('article_id') article_id: string, @Body() body: CategoryBody) {
    return this.staff.moveCategory({
      actor_id: request.user_id ?? '',
      role: request.role ?? 'user',
      article_id,
      category_id: body.category_id ?? '',
    });
  }

  @Post('admin/articles/:article_id/soft-remove')
  softRemove(@Req() request: CallerRequest, @Param('article_id') article_id: string, @Body() body: ReasonBody) {
    return this.staff.softRemove({
      actor_id: request.user_id ?? '',
      role: request.role ?? 'user',
      article_id,
      reason: body.reason ?? '',
    });
  }

  @Get('admin/articles/:article_id')
  read(@Req() request: CallerRequest, @Param('article_id') article_id: string) {
    return this.staff.staffRead({ role: request.role ?? 'user', article_id });
  }
}

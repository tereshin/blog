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
import { CategoryError } from './category-error';
import { CategoryService } from './category-service';
import type { CategoryTranslation } from './category-store';

type CallerRequest = {
  actor_id?: string;
  role?: string;
};

type CreateBody = {
  translations: CategoryTranslation[];
};

@Catch(CategoryError)
class CategoryExceptionFilter implements ExceptionFilter {
  catch(error: CategoryError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { send: (body: unknown) => void };
    }>();
    response.status(error.status_code).send(errorEnvelope(error.code));
  }
}

@Controller('api/v1')
@UseFilters(CategoryExceptionFilter)
export class CategoryController {
  constructor(private readonly categories: CategoryService) {}

  @Get('categories')
  list() {
    return this.categories.list();
  }

  @Get('categories/:slug')
  read(@Param('slug') slug: string) {
    return this.categories.read(slug);
  }

  @Post('admin/categories')
  create(@Req() request: CallerRequest, @Body() body: CreateBody) {
    return this.categories.create({
      actor_id: request.actor_id ?? '',
      role: request.role ?? '',
      translations: body.translations ?? [],
    });
  }
}

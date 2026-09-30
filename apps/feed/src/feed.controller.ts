import {
  type ArgumentsHost,
  Body,
  Catch,
  Controller,
  Get,
  type ExceptionFilter,
  Put,
  Query,
  Req,
  UseFilters,
} from '@nestjs/common';
import { errorEnvelope } from '@blog/contracts';
import { FeedError } from './feed-error';
import { FeedService } from './feed-service';
import type { Caller, PopularWeights } from './feed-types';

type CallerRequest = { user_id?: string | null; role?: Caller['role'] };

@Catch(FeedError)
class FeedExceptionFilter implements ExceptionFilter {
  catch(error: FeedError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { send: (body: unknown) => void };
    }>();
    response.status(error.status_code).send(errorEnvelope(error.code));
  }
}

@Controller('api/v1')
@UseFilters(FeedExceptionFilter)
export class FeedController {
  constructor(private readonly feeds: FeedService) {}

  @Get('feeds/fresh')
  fresh(@Req() request: CallerRequest, @Query('after') after?: string) {
    return this.feeds.fresh(this.caller(request), after ?? null);
  }

  @Get('feeds/popular')
  popular(@Req() request: CallerRequest, @Query('after') after?: string) {
    return this.feeds.popular(this.caller(request), after ?? null);
  }

  @Get('feeds/mine')
  mine(@Req() request: CallerRequest, @Query('after') after?: string) {
    return this.feeds.mine(this.caller(request), after ?? null);
  }

  @Get('admin/popular-weights')
  readWeights(@Req() request: CallerRequest) {
    return this.feeds.readWeights(this.caller(request));
  }

  @Put('admin/popular-weights')
  saveWeights(@Req() request: CallerRequest, @Body() body: Omit<PopularWeights, 'id'>) {
    return this.feeds.saveWeights(this.caller(request), body);
  }

  private caller(request: CallerRequest): Caller {
    return { user_id: request.user_id ?? null, role: request.role ?? null };
  }
}

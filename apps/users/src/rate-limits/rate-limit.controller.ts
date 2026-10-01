import {
  type ArgumentsHost,
  Body,
  Catch,
  Controller,
  type ExceptionFilter,
  Get,
  Param,
  Patch,
  Req,
  UseFilters,
} from '@nestjs/common';
import { errorEnvelope } from '@blog/contracts';
import { RateLimitError } from './rate-limit-error';
import { RateLimitService } from './rate-limit-service';

type StaffRequest = { user_id?: string; role?: string };
type UpdateBody = { max_count?: number; window_seconds?: number };

@Catch(RateLimitError)
class RateLimitExceptionFilter implements ExceptionFilter {
  catch(error: RateLimitError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { send: (body: unknown) => void };
    }>();
    response.status(error.status_code).send(errorEnvelope(error.code));
  }
}

@Controller('api/v1')
@UseFilters(RateLimitExceptionFilter)
export class RateLimitController {
  constructor(private readonly limits: RateLimitService) {}

  @Get('admin/rate-limits')
  list(@Req() request: StaffRequest) {
    return this.limits.list({
      actor_id: request.user_id ?? '',
      role: request.role ?? '',
    });
  }

  @Patch('admin/rate-limits/:action')
  update(@Req() request: StaffRequest, @Param('action') action: string, @Body() body: UpdateBody) {
    return this.limits.update({
      actor_id: request.user_id ?? '',
      role: request.role ?? '',
      action,
      max_count: body.max_count ?? 0,
      window_seconds: body.window_seconds ?? 0,
    });
  }

  @Get('internal/rate-limits/:action')
  find(@Param('action') action: string) {
    return this.limits.find(action);
  }
}

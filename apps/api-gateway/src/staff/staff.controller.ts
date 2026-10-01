import {
  type ArgumentsHost,
  Catch,
  Controller,
  type ExceptionFilter,
  Get,
  Headers,
  UseFilters,
} from '@nestjs/common';
import { errorEnvelope } from '@blog/contracts';
import { StaffGuard, StaffGuardError } from './staff-guard';

@Catch(StaffGuardError)
class StaffGuardExceptionFilter implements ExceptionFilter {
  catch(error: StaffGuardError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { send: (body: unknown) => void };
    }>();
    response.status(error.status_code).send(errorEnvelope(error.code));
  }
}

@Controller('api/v1/admin')
@UseFilters(StaffGuardExceptionFilter)
export class StaffGuardController {
  constructor(private readonly guard: StaffGuard) {}

  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : undefined;
    return this.guard.me({ token, now_ms: Date.now() });
  }
}

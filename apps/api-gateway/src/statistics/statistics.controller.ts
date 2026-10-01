import {
  type ArgumentsHost,
  Catch,
  Controller,
  type ExceptionFilter,
  Get,
  Req,
  UseFilters,
} from '@nestjs/common';
import { errorEnvelope } from '@blog/contracts';
import { StatisticsError, StatisticsService } from './platform-statistics';

type StaffRequest = { role?: string };

@Catch(StatisticsError)
class StatisticsExceptionFilter implements ExceptionFilter {
  catch(error: StatisticsError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { send: (body: unknown) => void };
    }>();
    response.status(error.status_code).send(errorEnvelope(error.code));
  }
}

@Controller('api/v1/admin')
@UseFilters(StatisticsExceptionFilter)
export class StatisticsController {
  constructor(private readonly statistics: StatisticsService) {}

  @Get('statistics')
  report(@Req() request: StaffRequest) {
    return this.statistics.report(request.role ?? '');
  }
}

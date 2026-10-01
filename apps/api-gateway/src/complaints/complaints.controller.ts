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
import { ComplaintReviewError, ComplaintReviewService } from './complaint-review';

type StaffRequest = { user_id?: string; role?: string };
type DismissBody = { target_type?: 'article' | 'comment'; reason?: string };

@Catch(ComplaintReviewError)
class ComplaintReviewExceptionFilter implements ExceptionFilter {
  catch(error: ComplaintReviewError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { send: (body: unknown) => void };
    }>();
    response.status(error.status_code).send(errorEnvelope(error.code));
  }
}

@Controller('api/v1/admin')
@UseFilters(ComplaintReviewExceptionFilter)
export class ComplaintReviewController {
  constructor(private readonly review: ComplaintReviewService) {}

  @Get('complaints')
  listOpen() {
    return this.review.listOpen();
  }

  @Post('complaints/:complaint_id/dismiss')
  dismiss(
    @Req() request: StaffRequest,
    @Param('complaint_id') complaint_id: string,
    @Body() body: DismissBody,
  ) {
    return this.review.dismiss({
      complaint_id,
      target_type: body.target_type ?? 'article',
      reason: body.reason ?? '',
      actor_id: request.user_id ?? '',
      role: request.role ?? '',
    });
  }
}

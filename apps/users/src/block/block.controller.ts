import { Body, Controller, Get, Param, Post, Query, Req, UseFilters } from '@nestjs/common';
import { ProfileExceptionFilter } from '../profile/profile-exception.filter';
import { BlockService, type ParticipationAction } from './block-service';

type CallerRequest = {
  firebase_uid?: string;
};

type ReasonBody = {
  reason?: string;
};

@Controller('api/v1')
@UseFilters(ProfileExceptionFilter)
export class BlockController {
  constructor(private readonly blocks: BlockService) {}

  @Post('admin/users/:user_id/block')
  block(@Req() request: CallerRequest, @Param('user_id') user_id: string, @Body() body: ReasonBody) {
    return this.blocks.block({
      actor_firebase_uid: request.firebase_uid ?? '',
      user_id,
      reason: body.reason ?? '',
    });
  }

  @Post('admin/users/:user_id/unblock')
  unblock(@Req() request: CallerRequest, @Param('user_id') user_id: string) {
    return this.blocks.unblock({
      actor_firebase_uid: request.firebase_uid ?? '',
      user_id,
    });
  }

  @Get('admin/audit')
  listAudit(
    @Req() request: CallerRequest,
    @Query('after') after?: string,
    @Query('limit') limit?: string,
  ) {
    const parsed_limit = Number(limit ?? 20);
    return this.blocks.listAudit({
      actor_firebase_uid: request.firebase_uid ?? '',
      after: after ?? null,
      limit: Number.isFinite(parsed_limit) ? parsed_limit : 20,
    });
  }

  @Get('users/:user_id/blocked')
  async blocked(@Param('user_id') user_id: string) {
    return { blocked: await this.blocks.isBlocked(user_id) };
  }

  @Get('users/:user_id/participation/:action')
  decide(@Param('user_id') user_id: string, @Param('action') action: ParticipationAction) {
    return this.blocks.decide(user_id, action);
  }
}

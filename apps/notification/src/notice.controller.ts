import { Controller, Get, Req } from '@nestjs/common';
import { NoticeService } from './notice-service';

type CallerRequest = { user_id?: string };

@Controller('api/v1')
export class NoticeController {
  constructor(private readonly notices: NoticeService) {}

  @Get('notifications')
  async list(@Req() request: CallerRequest) {
    const items = await this.notices.list(request.user_id ?? '');
    return {
      items: items.map((notice) => ({
        id: notice.id,
        type: notice.type,
        actor_id: notice.actor_id,
        entity_type: notice.entity_type,
        entity_id: notice.entity_id,
        created_at: notice.created_at,
      })),
      has_next: false,
      has_prev: false,
      next_cursor: null,
    };
  }
}

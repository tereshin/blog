import {
  type ArgumentsHost,
  Body,
  Catch,
  Controller,
  Get,
  type ExceptionFilter,
  Param,
  Post,
  Req,
  UseFilters,
} from '@nestjs/common';
import { errorEnvelope } from '@blog/contracts';
import { MessageError } from './message-error';
import { MessageService } from './message-service';

type CallerRequest = { user_id?: string | null };
type SendBody = { peer_id?: string; body?: string };
type ReplyBody = { body?: string };

@Catch(MessageError)
class MessageExceptionFilter implements ExceptionFilter {
  catch(error: MessageError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { send: (body: unknown) => void };
    }>();
    response.status(error.status_code).send(errorEnvelope(error.code));
  }
}

@Controller('api/v1')
@UseFilters(MessageExceptionFilter)
export class MessageController {
  constructor(private readonly messages: MessageService) {}

  @Get('conversations')
  list(@Req() request: CallerRequest) {
    return this.messages.list(request.user_id ?? null);
  }

  @Post('conversations')
  send(@Req() request: CallerRequest, @Body() body: SendBody) {
    return this.messages.send({
      sender_id: request.user_id ?? null,
      peer_id: body.peer_id ?? '',
      body: body.body ?? '',
    });
  }

  @Get('conversations/:conversation_id/messages')
  thread(@Req() request: CallerRequest, @Param('conversation_id') conversation_id: string) {
    return this.messages.thread(request.user_id ?? null, conversation_id);
  }

  @Post('conversations/:conversation_id/messages')
  reply(@Req() request: CallerRequest, @Param('conversation_id') conversation_id: string, @Body() body: ReplyBody) {
    return this.messages.reply({
      sender_id: request.user_id ?? null,
      conversation_id,
      body: body.body ?? '',
    });
  }

  @Post('conversations/:conversation_id/read')
  markRead(@Req() request: CallerRequest, @Param('conversation_id') conversation_id: string) {
    return this.messages.markRead(request.user_id ?? null, conversation_id);
  }
}

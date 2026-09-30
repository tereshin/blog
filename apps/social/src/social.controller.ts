import {
  type ArgumentsHost,
  Catch,
  Controller,
  Delete,
  type ExceptionFilter,
  Param,
  Post,
  Req,
  UseFilters,
} from '@nestjs/common';
import { errorEnvelope } from '@blog/contracts';
import { SocialError } from './social-error';
import { SocialService } from './social-service';

type CallerRequest = { user_id?: string };

@Catch(SocialError)
class SocialExceptionFilter implements ExceptionFilter {
  catch(error: SocialError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { send: (body: unknown) => void };
    }>();
    response.status(error.status_code).send(errorEnvelope(error.code));
  }
}

@Controller('api/v1')
@UseFilters(SocialExceptionFilter)
export class SocialController {
  constructor(private readonly social: SocialService) {}

  @Post('users/:user_id/follow')
  followUser(@Req() request: CallerRequest, @Param('user_id') user_id: string) {
    return this.social.followUser(request.user_id ?? '', user_id);
  }

  @Delete('users/:user_id/follow')
  unfollowUser(@Req() request: CallerRequest, @Param('user_id') user_id: string) {
    return this.social.unfollowUser(request.user_id ?? '', user_id);
  }

  @Post('categories/:category_id/follow')
  followCategory(@Req() request: CallerRequest, @Param('category_id') category_id: string) {
    return this.social.followCategory(request.user_id ?? '', category_id);
  }

  @Delete('categories/:category_id/follow')
  unfollowCategory(@Req() request: CallerRequest, @Param('category_id') category_id: string) {
    return this.social.unfollowCategory(request.user_id ?? '', category_id);
  }
}

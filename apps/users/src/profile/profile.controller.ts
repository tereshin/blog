import { Body, Controller, Get, Param, Put, Req, UseFilters } from '@nestjs/common';
import { ProfileExceptionFilter } from './profile-exception.filter';
import { ProfileService, type ProfileSave } from './profile-service';

type CallerRequest = {
  firebase_uid?: string;
};

type ContentLanguageBody = {
  content_languages: string[] | null;
};

@Controller('api/v1')
@UseFilters(ProfileExceptionFilter)
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  @Get('me')
  readMe(@Req() request: CallerRequest) {
    return this.profiles.readMe(request.firebase_uid ?? '');
  }

  @Put('me')
  saveMe(@Req() request: CallerRequest, @Body() body: ProfileSave) {
    return this.profiles.saveProfile({
      ...body,
      firebase_uid: request.firebase_uid ?? '',
    });
  }

  @Put('me/content-languages')
  saveContentLanguages(@Req() request: CallerRequest, @Body() body: ContentLanguageBody) {
    return this.profiles.setContentLanguages(
      request.firebase_uid ?? '',
      body.content_languages,
    );
  }

  @Get('users/:username')
  readPublic(@Param('username') username: string) {
    return this.profiles.readPublic(username);
  }
}

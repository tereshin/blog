import { Body, Controller, Param, Put, Req, UseFilters } from '@nestjs/common';
import { ProfileExceptionFilter } from '../profile/profile-exception.filter';
import type { RoleName } from './role-store';
import { RoleService } from './role-service';

type CallerRequest = {
  firebase_uid?: string;
};

type RoleBody = {
  role: RoleName;
  reason: string;
};

@Controller('api/v1/admin/users')
@UseFilters(ProfileExceptionFilter)
export class RoleController {
  constructor(private readonly roles: RoleService) {}

  @Put(':user_id/role')
  assignRole(
    @Req() request: CallerRequest,
    @Param('user_id') user_id: string,
    @Body() body: RoleBody,
  ) {
    return this.roles.assignRole({
      actor_firebase_uid: request.firebase_uid ?? '',
      user_id,
      role: body.role,
      reason: body.reason ?? '',
    });
  }
}

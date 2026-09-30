import { Module } from '@nestjs/common';
import { ProfileModule } from './profile/profile.module';
import { RoleModule } from './role/role.module';

@Module({
  imports: [ProfileModule, RoleModule],
})
export class UsersModule {}

import { Module } from '@nestjs/common';
import { BlockModule } from './block/block.module';
import { ProfileModule } from './profile/profile.module';
import { RoleModule } from './role/role.module';

@Module({
  imports: [ProfileModule, RoleModule, BlockModule],
})
export class UsersModule {}

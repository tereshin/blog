import { Module } from '@nestjs/common';
import { BlockModule } from './block/block.module';
import { ProfileModule } from './profile/profile.module';
import { RateLimitModule } from './rate-limits/rate-limit.module';
import { RoleModule } from './role/role.module';

@Module({
  imports: [ProfileModule, RoleModule, BlockModule, RateLimitModule],
})
export class UsersModule {}

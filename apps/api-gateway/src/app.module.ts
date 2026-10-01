import { Module } from '@nestjs/common';
import { ComplaintsModule } from './complaints/complaints.module';
import { HealthModule } from './health/health.module';
import { PublicModule } from './public/public.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { StaffGuardModule } from './staff/staff.module';

@Module({
  imports: [HealthModule, ComplaintsModule, RateLimitModule, PublicModule, StaffGuardModule],
})
export class AppModule {}

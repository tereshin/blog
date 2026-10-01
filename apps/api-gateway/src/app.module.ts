import { Module } from '@nestjs/common';
import { ComplaintsModule } from './complaints/complaints.module';
import { HealthModule } from './health/health.module';
import { PublicModule } from './public/public.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';

@Module({
  imports: [HealthModule, ComplaintsModule, RateLimitModule, PublicModule],
})
export class AppModule {}

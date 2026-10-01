import { Module } from '@nestjs/common';
import { ComplaintsModule } from './complaints/complaints.module';
import { HealthModule } from './health/health.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';

@Module({
  imports: [HealthModule, ComplaintsModule, RateLimitModule],
})
export class AppModule {}

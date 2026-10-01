import { Module } from '@nestjs/common';
import { ComplaintsModule } from './complaints/complaints.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [HealthModule, ComplaintsModule],
})
export class AppModule {}

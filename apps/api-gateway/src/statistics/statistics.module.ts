import { Module } from '@nestjs/common';
import { HttpStatisticSources } from './http-statistic-sources';
import { StatisticsService } from './platform-statistics';
import { StatisticsController } from './statistics.controller';

@Module({
  controllers: [StatisticsController],
  providers: [
    {
      provide: StatisticsService,
      useFactory: () =>
        new StatisticsService(
          new HttpStatisticSources(
            process.env.USERS_BASE_URL ?? 'http://127.0.0.1:3003',
            process.env.CONTENT_BASE_URL ?? 'http://127.0.0.1:3001',
            process.env.COMMENTS_BASE_URL ?? 'http://127.0.0.1:3002',
            process.env.WEB_BASE_URL ?? 'http://127.0.0.1:3000',
          ),
        ),
    },
  ],
})
export class StatisticsModule {}

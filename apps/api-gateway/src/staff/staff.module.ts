import { Module } from '@nestjs/common';
import { StaffGuardController } from './staff.controller';
import { StaffGuard, type StaffDirectory, type StaffTools } from './staff-guard';

@Module({
  controllers: [StaffGuardController],
  providers: [
    {
      provide: StaffGuard,
      useFactory: () =>
        new StaffGuard(
          async () => {
            throw new Error('TOKEN_REJECTED');
          },
          { async findByFirebaseUid() { return null; } } satisfies StaffDirectory,
          { async run() {} } satisfies StaffTools,
        ),
    },
  ],
})
export class StaffGuardModule {}

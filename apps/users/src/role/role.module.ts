import { Module } from '@nestjs/common';
import { DrizzleRoleStore } from './drizzle-role-store';
import { RoleController } from './role.controller';
import { RoleService } from './role-service';
import type { RoleStore } from './role-store';

export const ROLE_STORE = Symbol('ROLE_STORE');

@Module({
  controllers: [RoleController],
  providers: [
    {
      provide: ROLE_STORE,
      useFactory: (): RoleStore => new DrizzleRoleStore(process.env.DATABASE_URL ?? ''),
    },
    {
      provide: RoleService,
      useFactory: (store: RoleStore) => new RoleService(store),
      inject: [ROLE_STORE],
    },
  ],
})
export class RoleModule {}

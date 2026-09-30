import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './category-service';
import type { CategoryStore } from './category-store';
import { DrizzleCategoryStore } from './drizzle-category-store';

export const CATEGORY_STORE = Symbol('CATEGORY_STORE');
export const CATEGORY_AUDIT = Symbol('CATEGORY_AUDIT');

@Module({
  controllers: [CategoryController],
  providers: [
    {
      provide: CATEGORY_STORE,
      useFactory: (): CategoryStore => new DrizzleCategoryStore(process.env.DATABASE_URL ?? ''),
    },
    {
      provide: CATEGORY_AUDIT,
      useValue: {
        async append(): Promise<void> {
          return undefined;
        },
      },
    },
    {
      provide: CategoryService,
      useFactory: (store: CategoryStore, audit: { append: () => Promise<void> }) =>
        new CategoryService(store, audit),
      inject: [CATEGORY_STORE, CATEGORY_AUDIT],
    },
  ],
})
export class CategoryModule {}

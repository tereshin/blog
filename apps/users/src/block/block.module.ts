import { Module } from '@nestjs/common';
import { BlockController } from './block.controller';
import { BlockService } from './block-service';
import { DrizzleBlockStore } from './drizzle-block-store';
import type { BlockStore } from './block-store';

export const BLOCK_STORE = Symbol('BLOCK_STORE');

@Module({
  controllers: [BlockController],
  providers: [
    {
      provide: BLOCK_STORE,
      useFactory: (): BlockStore => new DrizzleBlockStore(process.env.DATABASE_URL ?? ''),
    },
    {
      provide: BlockService,
      useFactory: (store: BlockStore) => new BlockService(store),
      inject: [BLOCK_STORE],
    },
  ],
})
export class BlockModule {}

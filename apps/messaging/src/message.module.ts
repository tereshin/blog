import { Module } from '@nestjs/common';
import { DrizzleMessageStore } from './drizzle-message-store';
import { MessageController } from './message.controller';
import { MessageService, type SenderAccess } from './message-service';
import type { MessageStore } from './message-store';

export const MESSAGE_STORE = Symbol('MESSAGE_STORE');
export const SENDER_ACCESS = Symbol('SENDER_ACCESS');

const open_access: SenderAccess = { async isBlocked() { return false; } };

@Module({
  controllers: [MessageController],
  providers: [
    { provide: MESSAGE_STORE, useFactory: (): MessageStore => new DrizzleMessageStore(process.env.DATABASE_URL ?? '') },
    { provide: SENDER_ACCESS, useValue: open_access },
    {
      provide: MessageService,
      useFactory: (store: MessageStore, access: SenderAccess) => new MessageService(store, access),
      inject: [MESSAGE_STORE, SENDER_ACCESS],
    },
  ],
})
export class MessageModule {}

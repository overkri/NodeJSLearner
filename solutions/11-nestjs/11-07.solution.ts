import 'reflect-metadata';
import {
  Controller,
  Get,
  Injectable,
  Module,
  type INestApplication,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NodeAdapter } from '@nestjs/platform-node';
import { HttpExceptionFilter } from '#src/exercises/11-nestjs/11-06.js';

@Injectable()
export class ShutdownService implements OnApplicationShutdown {
  public closed = false;

  public onApplicationShutdown(): void {
    this.closed = true;
  }
}

@Controller('health')
export class HealthController {
  @Get()
  public check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}

@Module({
  controllers: [HealthController],
  providers: [ShutdownService],
  exports: [ShutdownService],
})
export class LedgerModule {}

export async function createLedgerNestApp(): Promise<INestApplication> {
  const app = await NestFactory.create(LedgerModule, new NodeAdapter(), {
    logger: false,
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();
  return app;
}

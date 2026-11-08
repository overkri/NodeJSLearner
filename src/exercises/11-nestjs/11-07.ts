import 'reflect-metadata';
import {
  Controller,
  Get,
  Injectable,
  Module,
  type INestApplication,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 11-07
 * Topic: NestJS app on NodeAdapter + lifecycle hook
 * Java/Spring analogy: Spring Boot application + @PreDestroy, but the HTTP adapter is
 * explicit (NodeAdapter) and app.close() must release resources.
 * Requirements:
 * - createLedgerNestApp creates an INestApplication using NodeAdapter, initializes it,
 *   installs HttpExceptionFilter, and exposes GET /health.
 * - ShutdownService.onApplicationShutdown sets closed=true exactly once.
 * - app.close() triggers the lifecycle hook; repeated close is safe.
 * Hints:
 * - `NestFactory.create(LedgerModule, { adapter: new NodeAdapter(), logger: false })`.
 * - Call `await app.init()` before returning; tests call `app.listen(0, '127.0.0.1')`.
 * Trap: using ExpressAdapter; forgetting init/close; side effects at import time.
 * Run tests: npm run test:exercises -- --test-name-pattern="11-07"
 */

@Injectable()
export class ShutdownService implements OnApplicationShutdown {
  public closed = false;

  public onApplicationShutdown(): void {
    throw new NotImplementedError('ShutdownService.onApplicationShutdown');
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
  throw new NotImplementedError('createLedgerNestApp');
}

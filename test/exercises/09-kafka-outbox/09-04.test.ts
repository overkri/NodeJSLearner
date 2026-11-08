import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects } from '../../helpers/assertions.js';
import {
  handleEventOnce,
  type ProcessedEventStore,
} from '../../../src/exercises/09-kafka-outbox/09-04.js';

function store(initial: string[] = []): {
  store: ProcessedEventStore;
  processed: Set<string>;
  marks: string[];
} {
  const processed = new Set(initial);
  const marks: string[] = [];
  return {
    processed,
    marks,
    store: {
      async has(eventId) {
        return processed.has(eventId);
      },
      async markProcessed(eventId) {
        marks.push(eventId);
        processed.add(eventId);
      },
    },
  };
}

exerciseTest('09-04 first delivery runs handler and marks event', async () => {
  const fake = store();
  const calls: string[] = [];

  const outcome = await handleEventOnce(fake.store, { eventId: 'evt-1' }, async (event) => {
    calls.push(event.eventId);
  });

  assert.equal(outcome, 'processed');
  assert.deepEqual(calls, ['evt-1']);
  assert.deepEqual(fake.marks, ['evt-1']);
});

exerciseTest('09-04 duplicate delivery skips the handler', async () => {
  const fake = store(['evt-1']);
  let calls = 0;

  const outcome = await handleEventOnce(fake.store, { eventId: 'evt-1' }, async () => {
    calls += 1;
  });

  assert.equal(outcome, 'duplicate');
  assert.equal(calls, 0);
  assert.deepEqual(fake.marks, []);
});

exerciseTest('09-04 handler failure leaves the event unprocessed', async () => {
  const fake = store();

  await expectRejects(
    handleEventOnce(fake.store, { eventId: 'evt-1' }, async () => {
      throw new Error('handler failed');
    }),
    /handler failed/,
  );

  assert.equal(fake.processed.has('evt-1'), false);
  assert.deepEqual(fake.marks, []);
});

exerciseTest('09-04 mark failure propagates for replay', async () => {
  const fake = store();
  fake.store.markProcessed = async () => {
    throw new Error('db unavailable');
  };

  await expectRejects(
    handleEventOnce(fake.store, { eventId: 'evt-1' }, async () => undefined),
    /db unavailable/,
  );
});

exerciseTest('09-04 empty eventId is rejected before storage access', async () => {
  const fake = store();
  let hasCalls = 0;
  fake.store.has = async () => {
    hasCalls += 1;
    return false;
  };

  await expectRejects(
    handleEventOnce(fake.store, { eventId: '  ' }, async () => undefined),
    /non-empty/,
  );
  assert.equal(hasCalls, 0);
});

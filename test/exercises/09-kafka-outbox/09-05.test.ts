import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects } from '../../helpers/assertions.js';
import {
  processKafkaMessage,
  type KafkaMessage,
  type OffsetCommitter,
} from '../../../src/exercises/09-kafka-outbox/09-05.js';

const message: KafkaMessage = {
  topic: 'ledger.transfers.v1',
  partition: 2,
  offset: '42',
  value: Buffer.from('{"eventId":"e1"}'),
};

function committer(): {
  commits: Array<{ topic: string; partition: number; offset: string }>;
  committer: OffsetCommitter;
} {
  const commits: Array<{ topic: string; partition: number; offset: string }> = [];
  return {
    commits,
    committer: {
      async commit(offset) {
        commits.push({ ...offset });
      },
    },
  };
}

exerciseTest('09-05 commits offset+1 only after handler success', async () => {
  const fake = committer();
  const seen: Array<Buffer | null> = [];

  const outcome = await processKafkaMessage(
    message,
    async (value) => {
      seen.push(value);
    },
    fake.committer,
  );

  assert.deepEqual(outcome, { status: 'committed' });
  assert.equal(seen.length, 1);
  assert.deepEqual(fake.commits, [{ topic: 'ledger.transfers.v1', partition: 2, offset: '43' }]);
});

exerciseTest('09-05 handler failure returns retry and does not commit', async () => {
  const fake = committer();
  const outcome = await processKafkaMessage(
    message,
    async () => {
      throw new Error('handler failed');
    },
    fake.committer,
  );

  assert.equal(outcome.status, 'retry');
  assert.match(outcome.error?.message ?? '', /handler failed/);
  assert.deepEqual(fake.commits, []);
});

exerciseTest('09-05 handles 64-bit offsets without precision loss', async () => {
  const fake = committer();
  const largeOffset = '9007199254740993';

  await processKafkaMessage(
    { ...message, offset: largeOffset },
    async () => undefined,
    fake.committer,
  );

  assert.equal(fake.commits[0]?.offset, '9007199254740994');
});

exerciseTest('09-05 commit failure propagates for redelivery', async () => {
  await expectRejects(
    processKafkaMessage(message, async () => undefined, {
      async commit() {
        throw new Error('offset commit failed');
      },
    }),
    /offset commit failed/,
  );
});

exerciseTest('09-05 validates message metadata', async () => {
  const fake = committer();
  let calls = 0;
  const handler = async (): Promise<void> => {
    calls += 1;
  };

  await expectRejects(
    processKafkaMessage({ ...message, topic: '' }, handler, fake.committer),
    /topic/,
  );
  await expectRejects(
    processKafkaMessage({ ...message, partition: -1 }, handler, fake.committer),
    /partition/,
  );
  await expectRejects(
    processKafkaMessage({ ...message, offset: '12.5' }, handler, fake.committer),
    /offset/,
  );
  assert.equal(calls, 0);
  assert.deepEqual(fake.commits, []);
});

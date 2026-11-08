import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects } from '../../helpers/assertions.js';
import { withClient } from '../../../src/exercises/05-postgresql/05-01.js';

interface Client {
  readonly name: string;
  release(error?: Error | boolean): void;
}

function makePool(options: {
  connectError?: Error;
  releaseError?: Error;
  releases: Array<Error | boolean | undefined>;
}): { connect(): Promise<Client>; readonly connects: number } {
  const pool = {
    connects: 0,
    async connect(): Promise<Client> {
      pool.connects += 1;
      if (options.connectError !== undefined) {
        throw options.connectError;
      }
      return {
        name: 'client-1',
        release(error?: Error | boolean): void {
          options.releases.push(error);
          if (options.releaseError !== undefined) {
            throw options.releaseError;
          }
        },
      };
    },
  };
  return pool;
}

exerciseTest('05-01 withClient releases a successful client', async () => {
  const releases: Array<Error | boolean | undefined> = [];
  const pool = makePool({ releases });

  const result = await withClient(pool, async (client) => client.name);
  assert.equal(result, 'client-1');
  assert.deepEqual(releases, [undefined]);
  assert.equal(pool.connects, 1);
});

exerciseTest('05-01 withClient releases with an error after failure', async () => {
  const releases: Array<Error | boolean | undefined> = [];
  const pool = makePool({ releases });

  await expectRejects(
    withClient(pool, async () => {
      throw new Error('query failed');
    }),
    /query failed/,
  );
  assert.equal(releases.length, 1);
  assert.ok(releases[0] instanceof Error);
});

exerciseTest('05-01 connect failure never releases', async () => {
  const releases: Array<Error | boolean | undefined> = [];
  const pool = makePool({ connectError: new Error('no connection'), releases });

  await expectRejects(
    withClient(pool, async () => 'never'),
    /no connection/,
  );
  assert.deepEqual(releases, []);
});

exerciseTest('05-01 release failure propagates on success', async () => {
  const releases: Array<Error | boolean | undefined> = [];
  const pool = makePool({ releases, releaseError: new Error('release failed') });

  await expectRejects(
    withClient(pool, async () => 'ok'),
    /release failed/,
  );
});

exerciseTest('05-01 original error wins over release failure', async () => {
  const releases: Array<Error | boolean | undefined> = [];
  const pool = makePool({ releases, releaseError: new Error('release failed') });

  await expectRejects(
    withClient(pool, async () => {
      throw new Error('original failure');
    }),
    /original failure/,
  );
});

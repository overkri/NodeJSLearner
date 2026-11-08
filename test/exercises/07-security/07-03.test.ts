import assert from 'node:assert/strict';
import { generateKeyPair, SignJWT, type JWTPayload } from 'jose';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects } from '../../helpers/assertions.js';
import {
  createJwtVerifier,
  TokenVerificationError,
} from '../../../src/exercises/07-security/07-03.js';

const issuer = 'https://ledger.test/';
const audience = 'ledger-api';
const keys = await generateKeyPair('RS256');

interface TokenOptions {
  readonly payload?: JWTPayload;
  readonly issuer?: string;
  readonly audience?: string;
  readonly subject?: string;
  readonly expiresIn?: number | string;
  readonly signingKey?: CryptoKey;
}

async function signToken(options: TokenOptions = {}): Promise<string> {
  let jwt = new SignJWT(options.payload ?? {})
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(options.issuer ?? issuer)
    .setAudience(options.audience ?? audience)
    .setIssuedAt()
    .setExpirationTime(options.expiresIn ?? '5m');

  if (options.subject !== undefined) {
    jwt = jwt.setSubject(options.subject);
  }
  return await jwt.sign(options.signingKey ?? keys.privateKey);
}

function verifier(): ReturnType<typeof createJwtVerifier> {
  return createJwtVerifier({ issuer, audience, key: keys.publicKey });
}

exerciseTest('07-03 verifies a valid token and maps scope', async () => {
  const principal = await verifier().verify(
    await signToken({ subject: 'customer-1', payload: { scope: 'transfers:write accounts:read' } }),
  );

  assert.deepEqual(principal, {
    subject: 'customer-1',
    scopes: ['transfers:write', 'accounts:read'],
  });
});

exerciseTest('07-03 supports scope arrays and absent scope', async () => {
  assert.deepEqual(
    await verifier().verify(
      await signToken({ subject: 'customer-1', payload: { scope: ['a', 'b', 1] } }),
    ),
    { subject: 'customer-1', scopes: ['a', 'b'] },
  );
  assert.deepEqual(await verifier().verify(await signToken({ subject: 'customer-1' })), {
    subject: 'customer-1',
    scopes: [],
  });
});

exerciseTest('07-03 rejects wrong issuer, audience, expiry and signature', async () => {
  await expectRejects(
    verifier().verify(await signToken({ subject: 'c', issuer: 'https://evil.test/' })),
    TokenVerificationError,
  );
  await expectRejects(
    verifier().verify(await signToken({ subject: 'c', audience: 'other-api' })),
    TokenVerificationError,
  );
  await expectRejects(
    verifier().verify(
      await signToken({ subject: 'c', expiresIn: Math.floor(Date.now() / 1000) - 10 }),
    ),
    TokenVerificationError,
  );

  const otherKeys = await generateKeyPair('RS256');
  await expectRejects(
    verifier().verify(await signToken({ subject: 'c', signingKey: otherKeys.privateKey })),
    TokenVerificationError,
  );
});

exerciseTest('07-03 rejects missing subject and malformed tokens', async () => {
  await expectRejects(verifier().verify(await signToken()), TokenVerificationError);
  await expectRejects(verifier().verify('not-a-jwt'), TokenVerificationError);
  await expectRejects(verifier().verify(''), TokenVerificationError);
});

exerciseTest('07-03 does not leak raw jose errors', async () => {
  const failure = await verifier()
    .verify('abc.def.ghi')
    .then(() => null)
    .catch((error: unknown) => error);

  assert.ok(failure instanceof TokenVerificationError);
  assert.equal(failure.message, 'Invalid or expired token');
});

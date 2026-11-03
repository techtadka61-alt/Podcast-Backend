import argon2 from 'argon2';

// OWASP-recommended Argon2id parameters (m=19 MiB, t=2, p=1).
const OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, OPTIONS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | undefined;

/**
 * Burn the same CPU time as a real verification when the account does not exist, so response time
 * does not reveal which emails are registered.
 */
export async function verifyAgainstDummy(plain: string): Promise<void> {
  dummyHash ??= hashPassword('timing-attack-mitigation-dummy');
  await verifyPassword(await dummyHash, plain);
}

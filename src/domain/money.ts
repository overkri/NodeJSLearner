export type CurrencyCode = 'USD' | 'EUR' | 'GBP';

/**
 * Money is always integer minor units. Floating point is never used for money.
 */
export interface Money {
  readonly amountMinor: bigint;
  readonly currency: CurrencyCode;
}

const CURRENCY_EXPONENT: Readonly<Record<CurrencyCode, number>> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
};

export function money(amountMinor: bigint, currency: CurrencyCode): Money {
  return { amountMinor, currency };
}

export function addMoney(left: Money, right: Money): Money {
  if (left.currency !== right.currency) {
    throw new Error(`Currency mismatch: ${left.currency} vs ${right.currency}`);
  }
  return { amountMinor: left.amountMinor + right.amountMinor, currency: left.currency };
}

export function parseMoneyString(input: string, currency: CurrencyCode): Money {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(input.trim());
  if (match === null) {
    throw new Error(`Invalid money value: ${JSON.stringify(input)}`);
  }

  const [, sign = '', whole = '0', fraction = ''] = match;
  const exponent = CURRENCY_EXPONENT[currency];
  const paddedFraction = fraction.padEnd(exponent, '0');
  const scale = 10n ** BigInt(exponent);
  const amount = BigInt(whole) * scale + BigInt(paddedFraction === '' ? '0' : paddedFraction);
  return { amountMinor: sign === '-' ? -amount : amount, currency };
}

/** JSON-safe representation: decimal string, never a float. */
export function serializeMoney(value: Money): { amount: string; currency: CurrencyCode } {
  const exponent = CURRENCY_EXPONENT[value.currency];
  const scale = 10n ** BigInt(exponent);
  const negative = value.amountMinor < 0n;
  const absolute = negative ? -value.amountMinor : value.amountMinor;
  const whole = absolute / scale;
  const fraction = (absolute % scale).toString().padStart(exponent, '0');
  return {
    amount: `${negative ? '-' : ''}${whole.toString()}.${fraction}`,
    currency: value.currency,
  };
}

export function assertSameCurrency(left: Money, right: Money): void {
  if (left.currency !== right.currency) {
    throw new Error(`Currency mismatch: ${left.currency} vs ${right.currency}`);
  }
}

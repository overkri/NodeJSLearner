interface LedgerLine {
  readonly accountId: string;
  readonly currency: string;
  readonly amountMinor: bigint;
}

interface LedgerSummary {
  readonly totalsByCurrency: ReadonlyMap<string, bigint>;
  readonly accountIds: ReadonlySet<string>;
  readonly hasNegative: boolean;
}

export function parseOptionalMinor(value: string | null | undefined): bigint | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }

  if (!/^[+-]?\d+$/.test(trimmed)) {
    throw new Error(`Invalid minor units: ${JSON.stringify(value)}`);
  }

  return BigInt(trimmed);
}

export function summarizeLines(lines: readonly LedgerLine[]): LedgerSummary {
  const totalsByCurrency = new Map<string, bigint>();
  const accountIds = new Set<string>();
  let hasNegative = false;

  for (const line of lines) {
    const current = totalsByCurrency.get(line.currency) ?? 0n;
    totalsByCurrency.set(line.currency, current + line.amountMinor);
    accountIds.add(line.accountId);
    if (line.amountMinor < 0n) {
      hasNegative = true;
    }
  }

  return { totalsByCurrency, accountIds, hasNegative };
}

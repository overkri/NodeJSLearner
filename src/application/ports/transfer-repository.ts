import type { LedgerEntry, Transfer, TransferCommand } from '../../domain/transfer.js';
import type { TransactionContext } from './account-repository.js';

export interface TransferRepository {
  createTransferWithEntries(
    command: TransferCommand,
    tx: TransactionContext,
  ): Promise<{ transfer: Transfer; entries: readonly LedgerEntry[] }>;
}

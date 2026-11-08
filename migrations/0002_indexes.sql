CREATE INDEX accounts_customer_id_idx ON accounts (customer_id);
CREATE INDEX accounts_status_idx ON accounts (status);

CREATE INDEX transfers_from_created_idx ON transfers (from_account_id, created_at DESC);
CREATE INDEX transfers_to_created_idx ON transfers (to_account_id, created_at DESC);

CREATE INDEX ledger_entries_account_created_idx ON ledger_entries (account_id, created_at DESC);
CREATE INDEX ledger_entries_transfer_idx ON ledger_entries (transfer_id);

CREATE INDEX outbox_events_unpublished_idx ON outbox_events (created_at)
  WHERE published_at IS NULL;
CREATE INDEX outbox_events_aggregate_idx ON outbox_events (aggregate_type, aggregate_id);

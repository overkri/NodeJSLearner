CREATE TABLE customers (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customers_email_uq UNIQUE (email)
);

CREATE TABLE accounts (
  id uuid PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES customers (id) ON DELETE RESTRICT,
  currency char(3) NOT NULL,
  status text NOT NULL DEFAULT 'active',
  balance_minor bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounts_currency_len CHECK (char_length(currency) = 3),
  CONSTRAINT accounts_status_chk CHECK (status IN ('active', 'frozen', 'closed')),
  CONSTRAINT accounts_balance_nonnegative CHECK (balance_minor >= 0)
);

CREATE TABLE transfers (
  id uuid PRIMARY KEY,
  from_account_id uuid NOT NULL REFERENCES accounts (id) ON DELETE RESTRICT,
  to_account_id uuid NOT NULL REFERENCES accounts (id) ON DELETE RESTRICT,
  amount_minor bigint NOT NULL,
  currency char(3) NOT NULL,
  status text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transfers_amount_positive CHECK (amount_minor > 0),
  CONSTRAINT transfers_distinct_accounts CHECK (from_account_id <> to_account_id),
  CONSTRAINT transfers_status_chk CHECK (status IN ('pending', 'completed', 'failed')),
  CONSTRAINT transfers_currency_len CHECK (char_length(currency) = 3),
  CONSTRAINT transfers_idempotency_key_uq UNIQUE (idempotency_key)
);

CREATE TABLE ledger_entries (
  id uuid PRIMARY KEY,
  transfer_id uuid NOT NULL REFERENCES transfers (id) ON DELETE RESTRICT,
  account_id uuid NOT NULL REFERENCES accounts (id) ON DELETE RESTRICT,
  direction text NOT NULL,
  amount_minor bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ledger_entries_amount_positive CHECK (amount_minor > 0),
  CONSTRAINT ledger_entries_direction_chk CHECK (direction IN ('debit', 'credit'))
);

CREATE TABLE idempotency_records (
  key text PRIMARY KEY,
  request_hash text NOT NULL,
  response_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE TABLE outbox_events (
  id uuid PRIMARY KEY,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  CONSTRAINT outbox_events_attempts_nonnegative CHECK (attempts >= 0)
);

-- Migration: Create paypal_events table for webhook idempotence
-- Description: Similar to stripe_events, stores PayPal webhook event IDs to prevent duplicate processing

-- Create paypal_events table
create table if not exists paypal_events (
    id uuid primary key default gen_random_uuid(),
    event_id text not null unique,
    event_type text not null,
    processed_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

-- Add index for faster lookups
create index if not exists idx_paypal_events_event_id on paypal_events(event_id);
create index if not exists idx_paypal_events_created_at on paypal_events(created_at);

-- Add RLS policies (service role only)
alter table paypal_events enable row level security;

-- Service role can do everything
create policy "Service role has full access to paypal_events"
    on paypal_events
    for all
    to service_role
    using (true)
    with check (true);

-- Add comment
comment on table paypal_events is 'Stores PayPal webhook event IDs for idempotence checking';
comment on column paypal_events.event_id is 'PayPal webhook event ID from the webhook payload';
comment on column paypal_events.event_type is 'Type of PayPal event (e.g., MERCHANT.ONBOARDING.COMPLETED)';
comment on column paypal_events.processed_at is 'Timestamp when the event was processed';

-- Optional: Add cleanup function to delete old events (keep last 90 days)
create or replace function cleanup_old_paypal_events()
returns void
language plpgsql
as $$
begin
    delete from paypal_events
    where created_at < now() - interval '90 days';
end;
$$;

comment on function cleanup_old_paypal_events() is 'Deletes PayPal events older than 90 days';


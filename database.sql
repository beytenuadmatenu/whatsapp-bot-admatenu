-- Create leads table
create table leads (
  id uuid default uuid_generate_v4() primary key,
  phone_number text not null unique,
  full_name text,
  city text,
  loan_amount numeric,
  loan_purpose text,
  language text check (language in ('hebrew', 'arabic', 'english')),
  current_step integer default 0,
  status text default 'new', -- new, qualified, rejected, pending_confirmation
  rejection_reason text,
  has_property boolean,
  has_family_property boolean,
  property_owner text, -- self, spouse, both
  property_registry text, -- tabo, minhal, lo_rassum, lo_batu
  building_permit text, -- yes, no, lo_batu
  bank_issues boolean,
  preferred_call_time text,
  last_message_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Create conversations table
create table conversations (
  id uuid default uuid_generate_v4() primary key,
  lead_id uuid references leads(id),
  message_type text check (message_type in ('user', 'bot')),
  content text,
  language text,
  created_at timestamp with time zone default now()
);

-- Create call_appointments table
create table call_appointments (
  id uuid default uuid_generate_v4() primary key,
  lead_id uuid references leads(id),
  status text default 'pending', -- pending, completed, cancelled
  scheduled_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security (RLS)
alter table leads enable row level security;
alter table conversations enable row level security;
alter table call_appointments enable row level security;

-- Create policies (modify as needed for your access model, currently allowing public access for demo purposes if needed, OR relies on service role key)
-- For a bot using service role key, these policies might not be strictly necessary if we only use that key, but good practice.
create policy "Enable all access for service role" on leads for all using (true) with check (true);
create policy "Enable all access for service role" on conversations for all using (true) with check (true);
create policy "Enable all access for service role" on call_appointments for all using (true) with check (true);

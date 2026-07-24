-- user_crypto: public key + wrapped key material (ciphertext opaque to server).

create table public.user_crypto (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  public_key text not null,
  wrapped_user_key jsonb not null,
  wrapped_private_key jsonb not null,
  prf_salt text not null,
  key_check jsonb not null,
  key_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_crypto_key_version_positive check (key_version > 0)
);

create trigger user_crypto_set_updated_at
  before update on public.user_crypto
  for each row execute function public.set_updated_at();

alter table public.user_crypto enable row level security;
alter table public.user_crypto force row level security;

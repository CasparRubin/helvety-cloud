# Schema workflow (source of truth in git)

**Never** treat the Supabase Dashboard SQL editor as the source of truth. Edit declarative files, generate migrations, apply, regenerate types, run advisors.

## Layout

```text
supabase/
  config.toml
  schemas/          # declarative desired state: edit these
  migrations/       # generated incremental SQL: commit these
```

## Flow

1. Edit `supabase/schemas/*.sql` (lexicographic / `schema_paths` order for FKs).  
2. `supabase db diff -f <name>` → review `supabase/migrations/`.  
3. Apply to remote project **`qnoeiurmyyyuawkcifmw` only**:  
   - `supabase db push`, and/or  
   - Cursor **Supabase MCP** `apply_migration` with the same SQL.  
4. MCP **`generate_typescript_types`** → commit under `packages/db`.  
5. MCP **`get_advisors`** (security/performance): fix critical RLS issues.  
6. Verify with MCP `list_tables` / `list_migrations`.

Optional: GitHub Integration “Deploy to production” on `main` still requires migration files in the repo.

## Forbidden

- Changing production schema only in Studio without updating `schemas/` + migrations  
- Applying to old Helvety project `bkdzeihxzvrkndjvyzye`  
- Skipping type generation after schema changes  

## Why Cursor “knows” the DB

Committed `schemas/` + `migrations/` + generated `packages/db` types. Agents read those; MCP confirms live state when needed.

See [`DATA_MODEL.md`](DATA_MODEL.md) and [`ROADMAP.md`](ROADMAP.md) §8.

---
name: helvety-cloud-foundation
description: >-
  Extend Helvety Cloud schema, API, or crypto safely under zero-knowledge and
  free-tier rules. Use when changing supabase schemas, /api/v1, packages/crypto,
  or starting roadmap phases P1–P5.
---

# Helvety Cloud foundation skill

## Before you start

1. Read `AGENTS.md` and `docs/architecture/ROADMAP.md` §2 + the target P\* playbook.  
2. Confirm scope is a **single** phase unless the user expands it.  
3. Prefer MCP (Supabase/Vercel) over guessing.

## Changing the database

1. Edit `supabase/schemas/*.sql`.  
2. Generate migration (`supabase db diff`).  
3. Apply to **`qnoeiurmyyyuawkcifmw` only** (CLI and/or MCP `apply_migration`).  
4. MCP `generate_typescript_types` → commit `packages/db`.  
5. MCP `get_advisors` — fix critical RLS findings.  
Details: `docs/architecture/SCHEMA_WORKFLOW.md`.

## Changing the API

1. Update Zod in `packages/api-contract`.  
2. Keep handlers ciphertext-opaque and workspace-scoped.  
3. Follow `docs/architecture/API.md`.  
4. Never add browser PostgREST for vault tables.

## Changing crypto

1. Match `docs/architecture/KEY_HIERARCHY.md`.  
2. Add/adjust unit tests (wrong key fails).  
3. Never log or upload raw keys / PRF / recovery secrets.

## Free-tier

Omit Redis, Sentry, paid email, heavy CI, analytics unless the user explicitly accepts cost **and** ROADMAP allows it.

## Legal copy

No false recovery/E2EE claims. See `docs/architecture/LEGAL_REQUIREMENTS.md`.

## Phase prompts

Use `docs/architecture/prompts/P1.md` … `P5.md` as the user-facing implement prompt.

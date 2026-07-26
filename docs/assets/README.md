# Design assets

**Keep in git.** Do not delete during cleanup passes.

| File | Role |
|------|------|
| [`icon.af`](./icon.af) | Affinity Designer source for the Helvety Cloud brand icon. Canonical design master (not the Next.js runtime favicon). |

Runtime icons for the web app live under `apps/web/app/` (`icon.svg`, `apple-icon.png`). Export from this `.af` source when the brand mark changes; never treat “zero code imports” as permission to remove it.

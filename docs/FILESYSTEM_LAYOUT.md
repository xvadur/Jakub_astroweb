# Filesystem layout

Canonical project folder:

```text
/Users/xvadur_mac/Jakub_Astro
```

Everything that belongs to Jakub's website project should live inside this folder:

- website source code: `src/`
- public website assets: `public/`
- archived original client/source assets: `source-assets/`
- project documentation: `docs/`
- optional lead/CRM operations: `ops/`
- local project instructions: `AGENTS.md`

Private/raw research note rule:

- Raw Obsidian notes, personal reflections, client-sensitive context, and unfiltered transcripts do not belong in the GitHub project.
- If that material affects the website, distill it into sanitized project decisions or architecture notes under `docs/`.
- If truly necessary locally, put private material under ignored folders `private/` or `docs/private/`, never into tracked source/docs.

Compatibility aliases:

```text
/Users/xvadur_mac/Projects/Jakub_Astro -> /Users/xvadur_mac/Jakub_Astro
/Users/xvadur_mac/Workspace/legacy/code/Jakub_Astro -> /Users/xvadur_mac/Jakub_Astro
/Users/xvadur_mac/Workspace/projects/jakub-astro -> /Users/xvadur_mac/Jakub_Astro
```

These aliases exist only so older references still open the same project. They must not become separate copies.

Archived legacy metadata:

```text
docs/archive/workspace-project-index/
```

This contains the old `Workspace/projects/jakub-astro` metadata files that used to live outside the main project folder. They are kept for history only; current project state lives in `docs/PROJECT_STATUS.md`, `docs/STAGING_DEPLOYMENT.md`, and `docs/DECISIONS.md`.

Ignored/generated folders:

- `node_modules/`
- `dist/`
- `.astro/`
- `.wrangler/`
- `output/`
- `private/`
- `docs/private/`

These folders may exist locally, but they are generated or tool-owned and should not be treated as source of truth.

Cleanup note:

- On 30 May 2026, unrelated ignored output `output/hatch-pet` was moved out of this project to `/Users/xvadur_mac/Workspace/archive/misplaced-from-jakub-astro-2026-05-30/`.

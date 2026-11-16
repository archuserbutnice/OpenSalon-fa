# AGENTS.md — Session Protocol for OpenSalon-fa

## Hard Rules
- **No Chat Memory**: All project state lives in git and `docs/ai/`.
- **Scope Lock**: Work only inside the forked repo. Extend existing API routes under `/api/...`. Add no unapproved features or dependencies.
- **Localization**: UI defaults to Persian (`fa`), RTL, Vazirmatn font bundled locally, Persian digits. English fallback via i18n layer. Jalali dates displayed (DB stores Gregorian ISO). Week starts Saturday; Friday is weekend. Currency in Toman (integer storage). Phone numbers normalized (`09xx...`).
- **Secrets**: API keys and session secrets MUST come from env vars and `.env.example`. Never hardcode.

## Session Protocol
### START:
1. Read only `AGENTS.md`, `docs/ai/STATE.md`, and `docs/ai/HANDOFF.md`.
2. Run `git status`, `git branch --show-current`, `git log -5 --oneline`.
3. If an unfinished task is active in HANDOFF, CONTINUE it. Never restart.
4. Otherwise, pick the first `todo` task whose dependencies are `done`.
5. Update `STATE.md` to mark the task `claimed`.

### WORK:
- Touch only the files listed in the task.
- Commit after every meaningful step: `WIP Txx: <what>`. Update `HANDOFF.md` after each commit.

### FINISH:
- Run the task's verify command.
- Merge to main, set row in `STATE.md` to `done`, and update `HANDOFF.md`.
- Stop before quota exhaustion.

# Codebase Memory

This repository is indexed in `codebase-memory-mcp` as:

- `C-Users-jedan-proyectos-HeadHuntECBonobotek`

## Expected workflow

Use graph-first discovery:
1. `search_graph`
2. `trace_path`
3. `get_code_snippet`
4. `query_graph`
5. `search_code` only for literals or non-structural text

## Re-indexing

Re-index after large structural changes to `src/`, `server.ts`, or shared types:

- `index_repository(repo_path="C:\\Users\\jedan\\proyectos\\HeadHuntECBonobotek", mode="full", persistence=true)`

## Notes

- The persisted graph artifact is intended to support faster future sessions.
- Keep `AGENTS.md` and the project skill aligned with architectural changes.

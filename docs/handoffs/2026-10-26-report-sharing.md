# Report sharing verification — 2026-10-26

## Scope
- Report SELECT sharing only. No attendance/accounting/auth/save/approval changes.
- Active heads or team_leader accounts linked to youth/ck/cu2/CU/cu_worship share non-draft weekly and worship meeting reports.
- CU is worship; lowercase cu is not. CU1 ordinary cell leaders do not qualify by role alone.
- CU1 cell reports remain author/CU1-head/admin only. Existing global admin exceptions remain.
- No user roles/head flags or database columns changed; database.ts schema is unchanged.

## Verification
Read-only transactions used SET LOCAL ROLE authenticated plus existing user JWT subject, then ROLLBACK. Only counts were read; no report contents were exported.

| Account category | Weekly | Worship meeting | Other CU1 cell reports | Other drafts |
|---|---:|---:|---:|---:|
| Youth leader | 106 | 17 | 0 | 0 |
| Children leader | 106 | 17 | 0 | 0 |
| Worship leader | 106 | 17 | 0 | 0 |
| CU2 head (also ordinary CU1 membership) | 106 | 17 | 0 | 0 |
| CU1 head | 106 | 17 | 190 | 0 |
| CU1 ordinary cell leader | 0 | 0 | 0 | 0 |
| Ordinary member | 0 | 0 | 0 | 0 |

The sampled ordinary cell leader still reads 37 own reports. Write policies were compared before/after and are unchanged.

- Permission matrix and rendered list tests: 64 passed.
- Full suite: 234 passed; lint, typecheck, docs check passed.
- Production build passed with network access for Google Fonts.
- Supabase MCP applied 20261026085859_share_department_and_worship_reports.sql.
- No new security advisor findings; existing function search-path/SECURITY DEFINER execute/leaked-password-protection warnings remain outside this change. References: [function search path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [anonymous function execute](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated function execute](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

## Limits
- Live authenticated browser sessions were not used; DB identity tests and rendered component regression tests verify access.
- Worship sharing currently covers meeting reports (all 17 submitted worship reports) and weekly reports. Worship cell-leader drafts are deliberately not shared.
- Frontend production deployment follows the verified implementation commit.

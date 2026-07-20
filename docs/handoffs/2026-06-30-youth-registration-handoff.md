# 2026-06-30 Youth Registration Handoff

## Summary
- Request: register 정나윤 in 청소년부.
- Result: completed in remote Supabase project `zikneyjidzovvkmflibo` (`church_cont_project`).
- Member id: `b58590ea-58e3-4778-baa0-9ecf493d254e`.

## Registered Data
- Name: 정나윤
- Department: 청소년부 (`youth`)
- Birth date: `2011-11-29`
- Address: 서울 마포구 구수동
- Phone: `010-2881-5875`
- School/affiliation: 신수중학교
- Storage field for school/affiliation: `members.occupation`
- Department link: `member_departments.is_primary = true`

## Impact Scope
- attendance flow: no impact.
- report flow: no impact.
- accounting flow: no impact.
- auth/RLS: no schema or policy changes.
- Additive change: yes, data-only insert/update plus department link.

## Files Added Or Updated
- `scripts/ops-2026-06-30-youth-register-jung-nayoon.sql`
- `.claude/session-notes.md`
- `docs/handoffs/2026-06-30-youth-registration-handoff.md`

## Execution Notes
- Initial direct Supabase client attempts with anon/publishable keys could not see the `youth` department row because they were not authenticated admin contexts.
- `vercel env ls` showed no usable Supabase service/admin key in the linked Vercel project.
- The user provided a fresh Supabase PAT, and the operation was completed through the Supabase Management API database query endpoint.
- The PAT value is intentionally not recorded here. Because it was exposed in chat, revoke it in Supabase and generate a new one if future API access is needed.

## Verification
Remote verification query returned:

```text
id: b58590ea-58e3-4778-baa0-9ecf493d254e
name: 정나윤
phone: 010-2881-5875
birth_date: 2011-11-29
address: 서울 마포구 구수동
occupation: 신수중학교
department_code: youth
department_name: 청소년부
is_primary: true
```

## Remaining Follow-up
- Revoke the Supabase PAT that was pasted into chat.
- No deployment is required for this data-only operation.
- No build/test run was required because runtime code was not changed.

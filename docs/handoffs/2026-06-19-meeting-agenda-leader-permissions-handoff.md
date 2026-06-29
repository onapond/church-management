# 2026-06-19 Meeting Agenda Leader Permissions Handoff

## Summary
- Fixed the meeting agenda board permission model to match the product intent: leader-meeting participants can post agenda items and exchange feedback before the in-person meeting.
- The previous implementation treated only `user_departments.is_team_leader = true` as agenda participants, which blocked many active `team_leader` users.
- Deployed the fix to production after the required Supabase SQL was applied.

## Product Intent
- In the Meetings tab, leaders who participate in the leader meeting should be able to:
  - add pre-meeting agenda/question/notice items,
  - attach agenda PDFs for their linked department,
  - comment under agenda items for questions and feedback,
  - review the discussion before attending the meeting.
- This is a pre-meeting discussion workflow, not finalized meeting minutes or a report approval flow.

## Root Cause
- `canParticipateInMeetingAgenda()` required `user_departments.is_team_leader = true`.
- `MeetingAgendaBoard` only exposed departments where `is_team_leader = true`.
- Supabase RLS for agenda item insert, agenda comment insert, and agenda PDF Storage paths had the same department-head-only assumption.
- Current production data showed only a few users had the department-head flag, while many active leader-meeting participants had `role = team_leader` with `is_team_leader = false`.

## Code Changes
- `src/lib/permissions.ts`
  - `canParticipateInMeetingAgenda()` now allows active `team_leader` users.
  - Existing meeting edit/delete/minutes permissions remain scoped separately.
- `src/components/meetings/MeetingAgendaBoard.tsx`
  - Non-admin leaders can now choose from their linked departments, not only `is_team_leader = true` departments.
- `src/lib/permissions.test.ts`
  - Added coverage confirming a `team_leader` with `is_team_leader = false` can participate in agenda discussion.
- `src/components/meetings/MeetingDetail.tsx`
  - Existing follow-up included `canLeaveMeetingFeedback()` for meeting feedback permissions.

## Database Changes
- `supabase/migrations/015_fix_meeting_team_leader_feedback_and_agenda_pdf.sql`
  - Aligns meeting feedback insert and agenda PDF Storage policies for department team leader feedback/PDF paths.
- `supabase/migrations/016_allow_meeting_agenda_participant_leaders.sql`
  - Allows active admins and active `team_leader` users to insert `meeting_agenda_items` for linked departments.
  - Allows active admins and active `team_leader` users to insert `meeting_agenda_comments`.
  - Aligns `meeting-pdfs` Storage policies for `agenda/{meetingId}/{departmentId}/...` with the linked-department participant rule.

## Verification
- `npx tsc --noEmit` passed.
- `npm test -- src/lib/permissions.test.ts` passed, 50 tests.
- `npm test` passed, 158 tests.
- `npm run lint` passed.
- `npm run build` passed.
- Vercel production build passed during deployment.

## Deployment
- Git commit: `df87add Fix meeting agenda leader permissions`
- Pushed to `origin/main`.
- User applied the required Supabase SQL migrations before deployment.
- Production deployment completed:
  - Deployment URL: `https://church-pc5f3hp31-onaponds-projects.vercel.app`
  - Production alias: `https://church-opal.vercel.app`

## Current Git State Notes
- After deployment, unrelated local changes were restored and remain uncommitted:
  - `src/app/(dashboard)/reports/new/page.tsx`
  - `docs/handoffs/2026-06-18-meeting-agenda-discussion-handoff.md`
- These were intentionally excluded from commit `df87add` and from the production deployment.

## Operational Check
1. Log in as an active `team_leader` whose `user_departments.is_team_leader` is `false`.
2. Open a meeting detail page.
3. Confirm the pre-meeting agenda form is visible.
4. Confirm the department selector includes that user's linked department.
5. Create an agenda item without a PDF.
6. Add a comment to an agenda item.
7. Optionally upload a PDF agenda attachment and confirm the signed link opens.

## Guardrails
- Do not broaden meeting minutes edit/delete permissions based on this change.
- Do not use `is_team_leader = true` as the agenda participation gate going forward; use active `team_leader` role plus linked departments for agenda item ownership.
- Keep AI meeting assistant work as a future plugin/add-on, separate from this core pre-meeting agenda discussion flow.

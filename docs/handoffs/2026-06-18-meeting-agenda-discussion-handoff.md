# 2026-06-18 Meeting Agenda Discussion Handoff

## Summary
- Added a pre-meeting agenda discussion flow inside meeting detail pages.
- Added explicit meeting `수정` and `제출 취소` actions.
- Added department-level agenda PDF attachments.
- Deployed to production and aliased to `https://church-opal.vercel.app`.

## Current Git State
- Branch: `main`
- Latest commits:
  - `d208704` - `Add meeting edit and agenda PDFs`
  - `0cb60f0` - `Add meeting agenda discussion`
- Remote sync: pushed to `origin/main`.
- Working tree: clean at handoff time.

## Completed
- Meeting detail now shows `회의 안건 사전 확인` below the meeting description.
- Agenda items are grouped in Notion-like department sections:
  - common agenda
  - youth
  - CU1
  - CU2
  - worship team
  - other departments as needed
- Department leaders and administrators can:
  - add agenda/question/notice items
  - comment on agenda items
  - mark agenda items resolved/open
  - attach one PDF to each agenda item
- Attached agenda PDFs:
  - are uploaded to the private `meeting-pdfs` bucket
  - use path format `agenda/{meetingId}/{departmentId}/...`
  - are opened through signed URLs
  - are removed from Storage when the agenda item is deleted
- Meeting detail now exposes:
  - `수정`: inline edit for title, department, date/time, location, description
  - `제출 취소`: deletes the meeting bundle because meetings do not use a report-style approval status lifecycle

## Database Changes
- `supabase/migrations/012_add_meeting_agenda_discussion.sql`
  - Adds `meeting_agenda_items`
  - Adds `meeting_agenda_comments`
  - Adds RLS for active-user read, leader/admin writes, and author/editor management
- `supabase/migrations/013_add_meeting_update_policy.sql`
  - Adds `meetings_update_editors`
  - Allows meeting updates by creator, `super_admin`, `president`, or team leader of the meeting department
- `supabase/migrations/014_add_meeting_agenda_pdf_attachments.sql`
  - Adds PDF metadata to `meeting_agenda_items`:
    - `pdf_file_path`
    - `pdf_file_name`
    - `pdf_file_size`
    - `pdf_uploaded_at`

## Files Touched
- `src/components/meetings/MeetingAgendaBoard.tsx`
- `src/components/meetings/MeetingDetail.tsx`
- `src/queries/meetings/useMeetings.ts`
- `src/types/database.ts`
- `src/lib/permissions.ts`
- `supabase/migrations/012_add_meeting_agenda_discussion.sql`
- `supabase/migrations/013_add_meeting_update_policy.sql`
- `supabase/migrations/014_add_meeting_agenda_pdf_attachments.sql`
- `PROJECT_CONTEXT.md`
- `CLAUDE.md`
- `docs/TECHNICAL_SPEC.md`
- `docs/USER_GUIDE.md`
- `.claude/session-notes.md`
- `CURRENT_TASK.md`

## Verification
- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npm test` passed, 153 tests.
- `npm run build` passed.
- Vercel production build passed during deployment.

## Deployment
- Commit `0cb60f0` deployed first for meeting agenda discussion.
- Commit `d208704` deployed after meeting edit/cancel and agenda PDF attachment follow-up.
- Latest production deployment:
  - Vercel deployment URL: `https://church-bxc48r016-onaponds-projects.vercel.app`
  - Production alias: `https://church-opal.vercel.app`

## Operational Notes
- User reported applying the required SQL before the final deployment.
- The relevant SQL files are still committed and should remain the source of truth for schema/RLS changes.
- Existing attendance, report approval, accounting, auth, meeting minutes, and meeting-level PDF flows were not intentionally changed.
- `제출 취소` is implemented as meeting deletion, not as a new meeting status.

## Next Session Start
1. Run `git status -sb`.
2. Check a meeting detail page in production.
3. Confirm:
   - `수정` is visible for authorized users.
   - `제출 취소` is visible for authorized users.
   - department agenda sections render under `회의 안건 사전 확인`.
   - a department agenda PDF can be uploaded and opened.
4. If PDF upload fails, check the `meeting-pdfs` Storage bucket policies and whether migration `014` was applied to the active Supabase project.

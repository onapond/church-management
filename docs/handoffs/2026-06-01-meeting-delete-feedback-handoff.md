# Handoff: Meeting Delete + Meeting Feedback

**Date**: 2026-06-01  
**Area**: Meetings  
**Status**: Code implemented, verified, and deployed. Supabase SQL must be applied in the correct order.

## Summary

Meeting management now supports:

- delete actions in the meeting list and meeting detail views
- separate meeting feedback for `super_admin`, `president`, and `accountant`
- PDF attachment handling remains unchanged

Meeting deletion removes the uploaded meeting PDF objects from private Storage before deleting the meeting row.
Meeting feedback is a separate table and does not change any meeting status.

## Implemented files

- `src/lib/permissions.ts`
- `src/types/database.ts`
- `src/queries/meetings/useMeetings.ts`
- `src/components/meetings/utils/meetingDeletion.ts`
- `src/components/meetings/MeetingList.tsx`
- `src/components/meetings/MeetingDetail.tsx`
- `supabase/migrations/010_add_meeting_feedback.sql`
- `supabase/migrations/011_add_meeting_delete_policies.sql`

## Verification

Passed locally:

- `npx tsc --noEmit`
- `npm test`
- `npm run build`

Deployment completed:

- `https://church-opal.vercel.app`

## Important DB note

The SQL must be applied in order:

1. `supabase/migrations/010_add_meeting_feedback.sql`
2. `supabase/migrations/011_add_meeting_delete_policies.sql`

The delete policy migration references `public.meeting_feedback`, so it fails if the feedback table is not created first.

## Behavior

- Delete permission follows the existing meeting-content edit scope.
- Feedback is additive only and does not introduce an approval state.
- Existing attendance, report, and accounting flows were not changed.

## Follow-up if this is resumed later

If delete still does not appear in the UI or does not work in production, check:

1. the current Supabase RLS policies on `public.meetings`, `public.meeting_minutes`, and `public.meeting_feedback`
2. whether the local code deployment is current on Vercel
3. whether the user account is active and within meeting edit scope


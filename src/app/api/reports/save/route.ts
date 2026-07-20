import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canManageReport } from '@/lib/permissions'
import { persistReportBundle } from '@/components/reports/utils/reportPersistence'
import type { ReportSaveRequest, ReportSaveResponse } from '@/components/reports/utils/reportSavePayload'

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json<ReportSaveResponse>(
      { ok: false, message: 'Unauthorized' },
      { status: 401 },
    )
  }

  let body: ReportSaveRequest

  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ReportSaveResponse>(
      { ok: false, message: 'Invalid request body' },
      { status: 400 },
    )
  }

  if (!body.form?.department_id || !body.form?.report_date || !body.reportType) {
    return NextResponse.json<ReportSaveResponse>(
      { ok: false, message: 'Missing required report fields' },
      { status: 400 },
    )
  }

  if (body.editReportId && body.targetReportId) {
    return NextResponse.json<ReportSaveResponse>(
      { ok: false, message: 'Provide either editReportId or targetReportId, not both' },
      { status: 400 },
    )
  }

  try {
    const managedReportId = body.editReportId ?? body.targetReportId

    if (managedReportId) {
      const { data: report, error: reportError } = await supabase
        .from('weekly_reports')
        .select('author_id, status')
        .eq('id', managedReportId)
        .maybeSingle()

      if (reportError) {
        console.error('Report edit target lookup failed:', reportError)
        return NextResponse.json<ReportSaveResponse>(
          { ok: false, message: 'Failed to validate report edit permission' },
          { status: 403 },
        )
      }

      if (!report) {
        return NextResponse.json<ReportSaveResponse>(
          { ok: false, message: 'Forbidden' },
          { status: 403 },
        )
      }

      if (
        body.targetReportId
        && !body.isDraft
        && user.id === report.author_id
        && report.status === 'submitted'
      ) {
        return NextResponse.json<ReportSaveResponse>({
          ok: true,
          reportId: body.targetReportId,
          createdReportId: null,
          warnings: [],
        })
      }

      const authorCanManage = user.id === report.author_id && ['draft', 'rejected'].includes(report.status)
      if (!authorCanManage) {
        const { data: userProfile, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (userError) {
          console.error('Report edit user role lookup failed:', userError)
          return NextResponse.json<ReportSaveResponse>(
            { ok: false, message: 'Failed to validate report edit permission' },
            { status: 403 },
          )
        }

        if (!canManageReport(userProfile?.role, user.id, report)) {
          return NextResponse.json<ReportSaveResponse>(
            { ok: false, message: 'Forbidden' },
            { status: 403 },
          )
        }
      }
    }

    const result = await persistReportBundle(supabase, body, user.id)

    if ('duplicate' in result) {
      return NextResponse.json<ReportSaveResponse>(
        {
          ok: false,
          duplicate: true,
          id: result.id,
          status: result.status,
          message: result.message,
        },
        { status: 409 },
      )
    }

    return NextResponse.json<ReportSaveResponse>({
      ok: true,
      reportId: result.reportId,
      createdReportId: result.createdReportId,
      warnings: result.warnings,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save report'
    console.error('POST /api/reports/save failed:', error)
    return NextResponse.json<ReportSaveResponse>(
      { ok: false, message },
      { status: 500 },
    )
  }
}


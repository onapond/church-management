import MeetingDetail from '@/components/meetings/MeetingDetail'

interface MeetingDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function MeetingDetailPage({ params }: MeetingDetailPageProps) {
  const { id } = await params
  return <MeetingDetail meetingId={id} />
}


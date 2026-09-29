import { getVideos } from '@/lib/queries';
import { Empty } from '@/components/ui';
import NewButton from '@/components/NewButton';
import VideoNotes from '@/components/VideoNotes';
import SectionHeader from '@/components/SectionHeader';

export const dynamic = 'force-dynamic';

export default async function VideosPage() {
  const videos = await getVideos();

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Study the tape"
        title="Video notes"
        icon="🎬"
        description="Capture the useful parts of every lesson and keep the source, context, and takeaway together."
        action={<NewButton kind="video" label="+ Add a video" className="btn btn-primary" />}
      />
      {videos.length ? (
        <VideoNotes videos={videos} />
      ) : (
        <Empty>No video notes yet. Paste a Google Drive video link to add one.</Empty>
      )}
    </div>
  );
}

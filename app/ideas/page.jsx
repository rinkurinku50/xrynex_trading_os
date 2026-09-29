import IdeaBoard from '@/components/IdeaBoard';
import { getIdeas } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function IdeasPage() {
  const ideas = await getIdeas();
  return <IdeaBoard ideas={ideas.filter((i) => i.tag !== 'Question')} title="Idea inbox" icon="💡" />;
}

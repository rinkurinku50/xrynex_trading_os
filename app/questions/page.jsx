import IdeaBoard from '@/components/IdeaBoard';
import { getIdeas } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function QuestionsPage() {
  const questions = await getIdeas('Question');
  return <IdeaBoard ideas={questions} title="Questions and doubts" icon="❓" defaultTag="Question" />;
}

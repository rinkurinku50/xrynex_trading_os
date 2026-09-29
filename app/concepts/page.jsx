import { getConcepts } from '@/lib/queries';
import NewButton from '@/components/NewButton';
import KnowledgeBase from '@/components/KnowledgeBase';
import SectionHeader from '@/components/SectionHeader';

export const dynamic = 'force-dynamic';

export default async function ConceptsPage() {
  const concepts = await getConcepts();

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Build your edge"
        title="Knowledge base"
        icon="📚"
        description="Turn market concepts into a searchable reference you can revisit before the next decision."
        action={<NewButton kind="concept" label="+ New concept" className="btn btn-primary" />}
      />
      <KnowledgeBase concepts={concepts} />
    </div>
  );
}

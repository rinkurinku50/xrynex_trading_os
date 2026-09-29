import { getAllTasks } from '@/lib/queries';
import DailyTaskManager from '@/components/DailyTaskManager';

export const dynamic = 'force-dynamic';

export default async function DailyTasksPage() {
  const tasks = await getAllTasks();
  return <DailyTaskManager tasks={tasks} />;
}

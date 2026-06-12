import ProjectSidebar from '@/components/ProjectSidebar';
import { createAdminClient } from '@/lib/supabase';

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = createAdminClient();
  const { data: project } = await db.from('projects').select('name').eq('id', id).single();

  return (
    <div className="flex min-h-screen">
      <ProjectSidebar projectId={id} projectName={project?.name ?? 'Project'} />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}

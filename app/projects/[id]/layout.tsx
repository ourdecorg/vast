import ProjectSidebar from '@/components/ProjectSidebar';
import MobileNav from '@/components/MobileNav';
import MobileProjectHeader from '@/components/MobileProjectHeader';
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
    <div className="flex flex-1 min-h-0">
      <ProjectSidebar projectId={id} projectName={project?.name ?? 'Project'} />
      <div className="flex flex-col flex-1 min-w-0">
        <MobileProjectHeader projectName={project?.name ?? 'Project'} />
        <main className="flex-1 p-4 md:p-8 overflow-auto pb-20 md:pb-8">
          {children}
        </main>
      </div>
      <MobileNav projectId={id} />
    </div>
  );
}

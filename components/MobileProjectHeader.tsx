'use client';

import Link from 'next/link';

export default function MobileProjectHeader({ projectName }: { projectName: string }) {
  return (
    <div className="md:hidden bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-3 shrink-0">
      <Link
        href="/"
        className="text-xs font-medium text-indigo-600 shrink-0 hover:text-indigo-800"
      >
        ← Projects
      </Link>
      <span className="w-px h-3.5 bg-gray-200 shrink-0" />
      <p className="text-sm font-semibold text-gray-900 truncate">{projectName}</p>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '',            label: 'Dashboard',       icon: '⬛' },
  { href: '/budget',     label: 'Budget',          icon: '💰' },
  { href: '/participants',label: 'Participants',   icon: '👥' },
  { href: '/contributions',label: 'Contributions', icon: '🔧' },
  { href: '/compensation',label: 'Compensation',   icon: '📋' },
  { href: '/ledger',     label: 'Ledger',          icon: '📜' },
  { href: '/fairness',   label: 'Fairness Map',    icon: '⚖️' },
];

export default function ProjectSidebar({ projectId, projectName }: { projectId: string; projectName: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  return (
    <aside className="hidden md:flex w-56 shrink-0 bg-gray-900 text-gray-100 min-h-full flex-col">
      <div className="px-4 py-5 border-b border-gray-700">
        <Link href="/" className="text-xs text-gray-400 hover:text-white">← All Projects</Link>
        <p className="mt-2 text-sm font-semibold leading-tight text-white truncate">{projectName}</p>
      </div>
      <nav className="flex-1 py-4">
        {NAV.map(({ href, label, icon }) => {
          const full = `${base}${href}`;
          const active = href === '' ? pathname === base : pathname.startsWith(full);
          return (
            <Link
              key={href}
              href={full}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-3 border-t border-gray-700 text-xs text-gray-500">
        VAST MVP v0.1
      </div>
    </aside>
  );
}

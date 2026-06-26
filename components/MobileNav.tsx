'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '',               label: 'Overview',  icon: '⬛' },
  { href: '/participants',  label: 'People',    icon: '👥' },
  { href: '/contributions', label: 'Log',       icon: '🔧' },
  { href: '/budget',        label: 'Budget',    icon: '💰' },
  { href: '/compensation',  label: 'Rules',     icon: '📋' },
  { href: '/fairness',      label: 'Fairness',  icon: '⚖️' },
  { href: '/ledger',        label: 'Ledger',    icon: '📜' },
  { href: '/members',       label: 'Members',   icon: '🔑' },
];

export default function MobileNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 z-50">
      <div className="flex overflow-x-auto scrollbar-hide">
        {NAV.map(({ href, label, icon }) => {
          const full = `${base}${href}`;
          const active = href === '' ? pathname === base : pathname.startsWith(full);
          return (
            <Link
              key={href}
              href={full}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 min-w-[4rem] text-center transition-colors ${
                active ? 'text-indigo-400' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span className="text-lg leading-none">{icon}</span>
              <span className="text-[10px] font-medium whitespace-nowrap">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

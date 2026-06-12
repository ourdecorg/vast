const PALETTE: Record<string, string> = {
  screenwriter:    'bg-purple-100 text-purple-800',
  investor:        'bg-amber-100 text-amber-800',
  distributor:     'bg-blue-100 text-blue-800',
  director:        'bg-rose-100 text-rose-800',
  actor:           'bg-pink-100 text-pink-800',
  crew:            'bg-gray-100 text-gray-800',
  advisor:         'bg-teal-100 text-teal-800',
  composer:        'bg-violet-100 text-violet-800',
  // categories
  time:            'bg-sky-100 text-sky-700',
  money:           'bg-green-100 text-green-700',
  risk:            'bg-red-100 text-red-700',
  talent:          'bg-pink-100 text-pink-700',
  creativity:      'bg-violet-100 text-violet-700',
  reputation:      'bg-amber-100 text-amber-700',
  network:         'bg-blue-100 text-blue-700',
  logistics:       'bg-gray-100 text-gray-700',
  leadership:      'bg-rose-100 text-rose-700',
  idea_ownership:  'bg-purple-100 text-purple-700',
  distribution:    'bg-indigo-100 text-indigo-700',
  community_trust: 'bg-teal-100 text-teal-700',
  emotional_labor: 'bg-orange-100 text-orange-700',
  other:           'bg-gray-100 text-gray-700',
  // rule types
  fixed_payment:        'bg-green-100 text-green-800',
  hourly_payment:       'bg-sky-100 text-sky-800',
  daily_payment:        'bg-blue-100 text-blue-800',
  reimbursement:        'bg-teal-100 text-teal-800',
  revenue_percentage:   'bg-indigo-100 text-indigo-800',
  profit_percentage:    'bg-purple-100 text-purple-800',
  investment_repayment: 'bg-amber-100 text-amber-800',
  success_bonus:        'bg-yellow-100 text-yellow-800',
  symbolic_credit:      'bg-gray-100 text-gray-600',
};

export default function Badge({ label, colorKey }: { label: string; colorKey?: string }) {
  const key = (colorKey ?? label).toLowerCase().replace(/[^a-z_]/g, '_');
  const cls = PALETTE[key] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

import type {
  CompensationRule,
  CompensationBreakdown,
  RevenueScenario,
} from '@/types/domain';

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

// Waterfall calculation: given a revenue amount, apply all active compensation
// rules in the correct order and return a line-by-line breakdown.
//
// Order:
//   1. Revenue-percentage rules (applied to gross revenue, sorted by priority)
//   2. Investment repayment rules (from whatever remains, sorted by priority)
//   3. Profit-percentage rules (applied to remaining "profit", sorted by priority)
//   4. Success bonus rules (fixed amounts triggered when revenue exceeds a threshold)
//
// Rules with symbolic_credit are noted but generate $0 in cash.
export function calculateDistribution(
  revenueAmount: number,
  rules: CompensationRule[],
  currency: string = 'USD',
): RevenueScenario {
  const active = rules.filter((r) => r.is_active);
  const byPriority = (a: CompensationRule, b: CompensationRule) =>
    (a.priority ?? 0) - (b.priority ?? 0);

  const breakdowns: CompensationBreakdown[] = [];
  let remaining = revenueAmount;

  // --- Step 1: Revenue percentages (off gross) ---
  const revPct = active
    .filter((r) => r.rule_type === 'revenue_percentage')
    .sort(byPriority);

  for (const rule of revPct) {
    const pct = rule.percentage ?? 0;
    const amount = revenueAmount * pct;
    remaining -= amount;
    breakdowns.push({
      participant_id: rule.participant_id,
      participant_name: rule.participants?.name ?? rule.participant_id,
      rule_id: rule.id,
      rule_label: rule.label,
      rule_type: rule.rule_type,
      amount,
      currency: rule.currency ?? currency,
      explanation: `${(pct * 100).toFixed(1)}% of gross revenue ${fmt(revenueAmount)}`,
    });
  }

  // --- Step 2: Investment repayment (from remaining) ---
  const repayment = active
    .filter((r) => r.rule_type === 'investment_repayment')
    .sort(byPriority);

  for (const rule of repayment) {
    const owed = rule.amount ?? 0;
    const amount = Math.min(owed, Math.max(0, remaining));
    remaining -= amount;
    const partial = amount < owed ? ` (partial — only ${fmt(remaining + amount)} available)` : '';
    breakdowns.push({
      participant_id: rule.participant_id,
      participant_name: rule.participants?.name ?? rule.participant_id,
      rule_id: rule.id,
      rule_label: rule.label,
      rule_type: rule.rule_type,
      amount,
      currency: rule.currency ?? currency,
      explanation: `Repayment of investment ${fmt(owed)}${partial}`,
    });
  }

  // --- Step 3: Profit percentages (from what remains after above deductions) ---
  const profit = Math.max(0, remaining);
  const profitPct = active
    .filter((r) => r.rule_type === 'profit_percentage')
    .sort(byPriority);

  for (const rule of profitPct) {
    const pct = rule.percentage ?? 0;
    const amount = profit * pct;
    breakdowns.push({
      participant_id: rule.participant_id,
      participant_name: rule.participants?.name ?? rule.participant_id,
      rule_id: rule.id,
      rule_label: rule.label,
      rule_type: rule.rule_type,
      amount,
      currency: rule.currency ?? currency,
      explanation: `${(pct * 100).toFixed(1)}% of net profit ${fmt(profit)} (after deductions)`,
    });
  }

  // --- Step 4: Success bonuses (flat amount, optionally gated on min revenue) ---
  const bonuses = active
    .filter((r) => r.rule_type === 'success_bonus')
    .sort(byPriority);

  for (const rule of bonuses) {
    const minRevenue = (rule.conditions as { min_revenue?: number })?.min_revenue;
    if (minRevenue && revenueAmount < minRevenue) {
      breakdowns.push({
        participant_id: rule.participant_id,
        participant_name: rule.participants?.name ?? rule.participant_id,
        rule_id: rule.id,
        rule_label: rule.label,
        rule_type: rule.rule_type,
        amount: 0,
        currency: rule.currency ?? currency,
        explanation: `Success bonus NOT triggered — revenue ${fmt(revenueAmount)} < threshold ${fmt(minRevenue)}`,
      });
    } else {
      const amount = rule.amount ?? 0;
      breakdowns.push({
        participant_id: rule.participant_id,
        participant_name: rule.participants?.name ?? rule.participant_id,
        rule_id: rule.id,
        rule_label: rule.label,
        rule_type: rule.rule_type,
        amount,
        currency: rule.currency ?? currency,
        explanation: `Success bonus triggered (revenue ${fmt(revenueAmount)}${minRevenue ? ` >= ${fmt(minRevenue)}` : ''})`,
      });
    }
  }

  // --- Symbolic credits: acknowledge but no cash ---
  const symbolic = active.filter((r) => r.rule_type === 'symbolic_credit');
  for (const rule of symbolic) {
    breakdowns.push({
      participant_id: rule.participant_id,
      participant_name: rule.participants?.name ?? rule.participant_id,
      rule_id: rule.id,
      rule_label: rule.label,
      rule_type: rule.rule_type,
      amount: 0,
      currency: rule.currency ?? currency,
      explanation: `Symbolic credit — non-monetary recognition`,
    });
  }

  const totalDistributed = breakdowns.reduce((s, b) => s + b.amount, 0);

  return {
    revenue_amount: revenueAmount,
    currency,
    breakdowns,
    total_distributed: totalDistributed,
    remaining_after_distribution: revenueAmount - totalDistributed,
  };
}

// Calculate immediate (non-revenue-dependent) compensation for a participant
// based on their fixed/hourly/daily/reimbursement rules.
export function calculateImmediateCompensation(
  rules: CompensationRule[],
): CompensationBreakdown[] {
  const immediate = rules.filter(
    (r) =>
      r.is_active &&
      ['fixed_payment', 'hourly_payment', 'daily_payment', 'reimbursement'].includes(r.rule_type),
  );

  return immediate.map((rule) => {
    const amount = rule.amount ?? 0;
    let explanation = '';
    switch (rule.rule_type) {
      case 'fixed_payment':
        explanation = `Fixed payment of ${fmt(amount)}`;
        break;
      case 'hourly_payment':
        explanation = `Hourly rate of ${fmt(amount)} per hour`;
        break;
      case 'daily_payment':
        explanation = `Daily rate of ${fmt(amount)} per day`;
        break;
      case 'reimbursement':
        explanation = `Expense reimbursement of ${fmt(amount)}`;
        break;
    }
    return {
      participant_id: rule.participant_id,
      participant_name: rule.participants?.name ?? rule.participant_id,
      rule_id: rule.id,
      rule_label: rule.label,
      rule_type: rule.rule_type,
      amount,
      currency: rule.currency ?? 'USD',
      explanation,
    };
  });
}

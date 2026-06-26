// Permission roles
export type SystemRole = 'OWNER' | 'USER';
export type ProjectRole = 'PROJECT_ADMIN' | 'USER';

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  email: string;
  role: ProjectRole;
  created_at: string;
  created_by?: string;
}

// Core value categories — what someone can contribute to a project
export type ContributionCategory =
  | 'time'
  | 'money'
  | 'risk'
  | 'talent'
  | 'creativity'
  | 'reputation'
  | 'network'
  | 'logistics'
  | 'leadership'
  | 'idea_ownership'
  | 'distribution'
  | 'community_trust'
  | 'emotional_labor'
  | 'other';

// How a participant gets compensated
export type CompensationRuleType =
  | 'fixed_payment'
  | 'hourly_payment'
  | 'daily_payment'
  | 'reimbursement'
  | 'revenue_percentage'
  | 'profit_percentage'
  | 'investment_repayment'
  | 'success_bonus'
  | 'symbolic_credit';

// Types of future rights
export type RightType =
  | 'revenue_share'
  | 'profit_share'
  | 'ownership'
  | 'credit'
  | 'decision_rights'
  | 'symbolic_ownership';

export type ProjectStatus = 'draft' | 'active' | 'completed' | 'archived';

export type LedgerEventType =
  | 'project_created'
  | 'participant_added'
  | 'contribution_recorded'
  | 'compensation_rule_defined'
  | 'rights_allocated'
  | 'payment_made'
  | 'revenue_recorded'
  | 'budget_set';

export interface Project {
  id: string;
  name: string;
  description: string;
  type: string; // film | software | art | community | research | education | other
  status: ProjectStatus;
  currency: string;
  created_at: string;
  updated_at: string;
}

// Role template — describes what a type of contributor typically gives and receives
export interface Archetype {
  id: string;
  name: string;
  description: string;
  typical_contributions: ContributionCategory[];
  typical_compensation_types: CompensationRuleType[];
  is_built_in: boolean;
  created_at: string;
}

export interface Participant {
  id: string;
  project_id: string;
  name: string;
  email?: string;
  phone?: string;
  bio?: string;
  archetypes?: Archetype[];
  created_at: string;
}

export interface ParticipantArchetype {
  id: string;
  participant_id: string;
  archetype_id: string;
  notes?: string;
}

// What kind of value can be contributed — reusable across projects
export interface ContributionType {
  id: string;
  name: string;
  category: ContributionCategory;
  description: string;
  unit?: string; // hours | days | USD | units | etc.
  is_monetary: boolean;
}

// An actual recorded contribution by a participant
export interface Contribution {
  id: string;
  project_id: string;
  participant_id: string;
  contribution_type_id: string;
  amount: number;
  unit?: string;
  description: string;
  date: string;
  ledger_event_id?: string;
  created_at: string;
  // Supabase join fields use table names (plural) as keys
  participants?: { id: string; name: string };
  contribution_types?: { id: string; name: string; category: string; unit?: string; is_monetary: boolean };
}

// A rule defining how a participant gets compensated
export interface CompensationRule {
  id: string;
  project_id: string;
  participant_id: string;
  rule_type: CompensationRuleType;
  label: string;
  amount?: number;
  // Stored as 0-1 decimal (e.g., 0.15 = 15%)
  percentage?: number;
  currency?: string;
  // Lower priority number = applied first in waterfall calculations
  priority?: number;
  conditions?: Record<string, unknown>;
  description?: string;
  is_active: boolean;
  created_at: string;
  // Supabase join field uses table name as key
  participants?: { id: string; name: string };
}

// Future rights to revenue or ownership
export interface RightsAllocation {
  id: string;
  project_id: string;
  participant_id: string;
  right_type: RightType;
  percentage?: number;
  priority?: number;
  description?: string;
  created_at: string;
  participant?: Participant;
}

// An actual payment that was made
export interface Payment {
  id: string;
  project_id: string;
  participant_id: string;
  compensation_rule_id?: string;
  amount: number;
  currency: string;
  payment_date: string;
  description: string;
  ledger_event_id?: string;
  created_at: string;
  participant?: Participant;
}

// Append-only ledger event with hash chain — the audit backbone of VAST
export interface LedgerEvent {
  id: string;
  project_id: string;
  event_type: LedgerEventType;
  payload: Record<string, unknown>;
  previous_hash: string; // hash of previous event, or "GENESIS" for first
  hash: string;          // SHA-256(event_type + payload + created_at + previous_hash)
  created_at: string;
  created_by?: string;
}

export interface Budget {
  id: string;
  project_id: string;
  total_amount: number;
  currency: string;
  allocated_amount: number;
  spent_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RevenueEvent {
  id: string;
  project_id: string;
  amount: number;
  currency: string;
  description: string;
  source?: string;
  date: string;
  ledger_event_id?: string;
  created_at: string;
}

// ─── Contribution Events ─────────────────────────────────────────────────────

export type ContributionEventStatus = 'planned' | 'occurred' | 'cancelled';

export interface ContributionEvent {
  id: string;
  project_id: string;
  event_date: string; // ISO date string YYYY-MM-DD
  description: string;
  location?: string;
  status: ContributionEventStatus;
  contribution_type_id?: string;
  default_amount?: number;
  created_at: string;
  created_by?: string;
  // Joined fields
  contribution_types?: { id: string; name: string; unit?: string };
  contribution_event_participants?: { participant_id: string; participants: { id: string; name: string } }[];
}

export interface ContributionEventParticipant {
  id: string;
  contribution_event_id: string;
  participant_id: string;
  participants?: { id: string; name: string };
}

// ─── Telegram Integration ────────────────────────────────────────────────────

export interface ParticipantTelegramAccount {
  id: string;
  participant_id: string;
  telegram_user_id: number;
  telegram_username?: string;
  telegram_first_name?: string;
  created_at: string;
}

export type ContributionReactionType = 'emoji' | 'reply';

export interface ContributionReaction {
  id: string;
  contribution_id: string;
  telegram_user_id?: number;
  telegram_username?: string;
  reaction_type: ContributionReactionType;
  emoji?: string;
  reply_text?: string;
  telegram_message_id?: number;
  web_user_email?: string;
  created_at: string;
}

// --- Calculation result types ---

// One line in a distribution calculation, linked back to the rule that caused it
export interface CompensationBreakdown {
  participant_id: string;
  participant_name: string;
  rule_id: string;
  rule_label: string;
  rule_type: CompensationRuleType;
  amount: number;
  currency: string;
  explanation: string; // human-readable explanation of the calculation
}

// Summary of distributions from a hypothetical revenue scenario
export interface RevenueScenario {
  revenue_amount: number;
  currency: string;
  breakdowns: CompensationBreakdown[];
  total_distributed: number;
  remaining_after_distribution: number;
}

// One row in the fairness map — what one participant gave and receives
export interface FairnessMapEntry {
  participant_id: string;
  participant_name: string;
  archetypes: string[];
  contributions: {
    type_name: string;
    category: string;
    amount: number;
    unit?: string;
    description: string;
  }[];
  immediate_rules: {
    label: string;
    rule_type: CompensationRuleType;
    amount?: number;
    percentage?: number;
    currency?: string;
  }[];
  future_rights: {
    right_type: RightType;
    percentage?: number;
    priority?: number;
    description?: string;
  }[];
  total_immediate_compensation: number;
}

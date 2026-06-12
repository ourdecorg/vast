# VAST — Value Attribution & Sharing Toolkit

A collaborative creation and fair compensation platform. VAST helps project initiators manage a shared budget and transparently reward contributors according to the value they bring.

---

## What VAST does

Every collaborative project is a shared creation. Different participants contribute different types of value — time, money, risk, talent, creativity, reputation, network access, and more. VAST models the project's "value chain" and keeps a transparent, append-only ledger of contributions, agreements, rights, and compensation.

**Key ideas:**
- Contributions are recorded explicitly (not just assumed)
- Compensation rules are declared and machine-readable
- Future rights (revenue/profit shares, ownership) are tracked separately from immediate payments
- Every event is written to an append-only hash-chained ledger
- The Fairness Map gives a human-readable view of who gives what and who receives what

**Designed for:** film, software, art, research, community initiatives, education, and any other collaborative project type.

---

## Running the app

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)

### 1. Set up environment variables

```bash
cp .env.local.example .env.local
# Fill in your Supabase URL, anon key, and service role key
```

### 2. Set up the database

In the Supabase SQL Editor, run **in order**:

1. `supabase/schema.sql` — creates all tables and indexes
2. *(optional)* `supabase/seed.sql` — inserts demo data for a film project

Or use the in-app **Load Demo** button to seed via the API.

### 3. Install dependencies and start

```bash
npm install
npm run dev
# Open http://localhost:3000
```

---

## Data model

```
Project
  ├── Budget
  ├── Participant (many)
  │     └── Archetype (many-to-many via participant_archetypes)
  ├── Contribution (many)
  │     └── ContributionType
  ├── CompensationRule (many)
  ├── RightsAllocation (many)
  ├── Payment (many)
  ├── RevenueEvent (many)
  └── LedgerEvent (many, append-only, hash-chained)
```

### Key entities

| Entity | Purpose |
|--------|---------|
| `Project` | A collaborative initiative |
| `Archetype` | Reusable role template (Screenwriter, Investor, Director…) |
| `Participant` | A person or entity contributing to the project |
| `ContributionType` | What kind of value can be contributed (time, money, talent…) |
| `Contribution` | An actual recorded contribution |
| `CompensationRule` | How a participant gets compensated (fixed fee, revenue %, etc.) |
| `RightsAllocation` | Future claims on revenue, profit, or ownership |
| `Payment` | Actual money disbursed |
| `LedgerEvent` | Append-only audit event with hash chain |
| `Budget` | Project-level budget tracking |
| `RevenueEvent` | Revenue received by the project |

---

## Compensation rule types

| Rule Type | Description |
|-----------|-------------|
| `fixed_payment` | A single fixed fee |
| `hourly_payment` | Per-hour rate |
| `daily_payment` | Per-day rate |
| `reimbursement` | Expense reimbursement |
| `revenue_percentage` | % of gross revenue (applied first in waterfall) |
| `profit_percentage` | % of net profit (after revenue shares and investor repayment) |
| `investment_repayment` | Priority repayment of invested capital |
| `success_bonus` | Flat bonus triggered when revenue exceeds a threshold |
| `symbolic_credit` | Non-monetary recognition (screen credit, reputation) |

---

## How the ledger works

Every significant action in VAST writes an entry to the `ledger_events` table:

```
hash = SHA-256(event_type + payload + created_at + previous_hash)
```

- The first event for each project uses `"GENESIS"` as the `previous_hash`
- Every subsequent event hashes in the previous event's hash
- This creates a tamper-evident chain: modifying any historical event invalidates all subsequent hashes
- The **Ledger** screen lets you verify the entire chain's integrity

This is not a real blockchain (no distributed consensus), but it provides the same auditability guarantees for a single-database MVP.

---

## Revenue distribution waterfall

When calculating how revenue is distributed (e.g., from the simulator on the Compensation screen):

1. **Revenue % rules** are applied to gross revenue first (e.g., distribution fee)
2. **Investment repayment** is deducted from what remains
3. **Profit % rules** are applied to the remaining "net profit"
4. **Success bonuses** are triggered if revenue exceeds the configured threshold

Every calculated amount is explained: which rule caused it and how the math works.

---

## API routes

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/projects` | List / create projects |
| GET/PATCH/DELETE | `/api/projects/[id]` | Get / update / delete project |
| GET/POST | `/api/projects/[id]/participants` | List / add participants |
| GET/POST | `/api/projects/[id]/contributions` | List / record contributions |
| GET/POST | `/api/projects/[id]/compensation-rules` | List / add compensation rules |
| GET/POST | `/api/projects/[id]/rights` | List / add rights allocations |
| GET/PUT | `/api/projects/[id]/budget` | Get / set budget |
| GET/POST | `/api/projects/[id]/payments` | List / record payments |
| GET | `/api/projects/[id]/ledger` | Fetch ledger events (add `?verify=true` for integrity check) |
| POST | `/api/projects/[id]/calculate` | Run compensation calculation with `{ revenue_amount }` |
| GET | `/api/projects/[id]/fairness-map` | Get full fairness map |
| GET | `/api/archetypes` | List all archetypes |
| GET | `/api/contribution-types` | List all contribution types |
| POST | `/api/seed` | Load demo film project data |

---

## MVP screens

| Screen | Path | Description |
|--------|------|-------------|
| Project list | `/` | Create and browse projects |
| Dashboard | `/projects/[id]` | Overview, stats, recent ledger |
| Budget | `/projects/[id]/budget` | Set and track project budget |
| Participants | `/projects/[id]/participants` | Add participants and assign archetypes |
| Contributions | `/projects/[id]/contributions` | Record contributions |
| Compensation | `/projects/[id]/compensation` | Define rules; run revenue simulator |
| Ledger | `/projects/[id]/ledger` | Browse and verify the hash chain |
| Fairness Map | `/projects/[id]/fairness` | Who gives what and who receives what |

---

## Demo project: "The Last Summer"

The included seed data models a fictional indie film with:

| Participant | Archetype | What they give | What they receive |
|-------------|-----------|----------------|-------------------|
| Sofia Morales | Screenwriter | Idea + screenplay (127 pages) + 800h | 15k upfront + 8% profit |
| Capital Films Ltd | Investor | $300k investment + risk | Repayment priority + 25% profit |
| StreamVision Inc | Distributor | Distribution access + network | 15% of gross revenue |
| Marcus Chen | Director/Producer | Artistic leadership + 40 shoot days | $80k fee + 12% profit |
| Emma Laurent | Actor | 38 days talent + reputation | $3k/day + 5% profit + $25k success bonus |
| Yuki Tanaka | Actor + Co-producer | 22 days acting + 30 days logistics | $1.5k/day + 3% profit |
| André Silva | Composer | 60-min original score + 400h | $20k fee + 2% revenue |
| Camera Dept | Crew | 120 person-days | $600/day |

---

## What's next (future development)

- **Authentication** — multi-user support, role-based access
- **Real-time collaboration** — live updates via Supabase realtime
- **Payment integrations** — trigger actual payments via Stripe/bank transfer
- **Smart contract export** — export compensation rules as Solidity/DAO proposals
- **Community currency** — VAST tokens or similar for non-monetary value
- **Revenue event tracking** — record actual revenue and auto-calculate distributions
- **Reporting** — exportable PDF/CSV reports per project or per participant
- **Templates** — save archetype combinations as project templates
- **Multi-currency** — handle multi-currency projects with FX conversion

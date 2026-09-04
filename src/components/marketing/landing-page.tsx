import {
  PRODUCT_NAME,
  PRODUCT_POSITIONING,
  PRODUCT_TAGLINE,
} from "@/lib/brand";
import { LandingLottie } from "@/components/marketing/landing-lottie";
import { BrandStripe } from "@/components/brand/brand-stripe";

/** Hard <a> navigations so Sign in never soft-routes into the login shell by mistake. */
function CtaLink({
  href,
  children,
  variant,
}: {
  href: string;
  children: React.ReactNode;
  variant: "primary" | "ghost" | "outline" | "ink";
}) {
  const className =
    variant === "primary"
      ? "inline-flex h-11 items-center justify-center rounded-md bg-lagoon px-5 text-sm font-semibold text-ink transition hover:bg-lagoon-deep"
      : variant === "ink"
        ? "inline-flex h-11 items-center justify-center rounded-md bg-ink px-5 text-sm font-semibold text-foam transition hover:bg-ink-soft"
        : variant === "outline"
          ? "inline-flex h-11 items-center justify-center rounded-md border border-white/20 bg-white/5 px-5 text-sm font-semibold text-foam transition hover:bg-white/10"
          : "rounded-md px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-foam";

  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

const PILLARS = [
  {
    label: "01",
    title: "Salary truth engine",
    body: "Contract pay, attendance, unpaid leave, taxable and non-taxable adjustments, and statutory deductions resolve into one explainable net. HR sees the story before anyone approves the run.",
    lottie: "/lottie/salary-truth.json",
  },
  {
    label: "02",
    title: "Remittance-ready packs",
    body: "Month-end PAYE, pension, NHF, and NSITF totals come from the same rules that built the payslips — so filing matches payroll, not a second spreadsheet.",
    lottie: "/lottie/remittance-pack.json",
  },
  {
    label: "03",
    title: "Nigeria-native by default",
    body: "NTA 2025 bands, pension, NHF, and NSITF ship configured. Clock files and L'ORI attendance feed pay only after HR confirms. Admin and Finance stay pay-exempt where your policy says so.",
    lottie: "/lottie/people-network.json",
  },
] as const;

const FLOW = [
  {
    step: "1",
    title: "Bring people in",
    body: "Onboard staff with compensation, bank details, and statutory IDs — or import from the sheets and clocks you already use.",
    lottie: "/lottie/hr-team.json",
  },
  {
    step: "2",
    title: "Confirm attendance",
    body: "Missed shifts and unpaid leave become pay impact only after HR clearance. Penalties stay opt-in, never silent.",
    lottie: "/lottie/attendance-confirm.json",
  },
  {
    step: "3",
    title: "Run payroll",
    body: "Draft → review → approve → paid. Recalculate with YTD and statutory snapshots. Payslips stay explainable end to end.",
    lottie: "/lottie/money-cycle.json",
  },
  {
    step: "4",
    title: "File & export",
    body: "Remittance packs, department cost, CSV exports, and optional Google Workspace sync — without rebuilding the numbers.",
    lottie: "/lottie/approval.json",
  },
] as const;

const CAPABILITIES = [
  {
    title: "People ops",
    tone: "ok" as const,
    items: [
      "Employee profiles & compensation structure",
      "Onboarding and offboarding checklists",
      "Leave recorded by HR or applied by staff",
      "Staff portal for details, leave, and company requests",
    ],
  },
  {
    title: "Payroll",
    tone: "lagoon" as const,
    items: [
      "NTA 2025 PAYE with taxable vs non-taxable lines",
      "Pension, NHF, NSITF on every run",
      "Attendance-aware net with HR confirm",
      "Payslip PDFs with year-to-date summary",
    ],
  },
  {
    title: "Command center",
    tone: "sky" as const,
    items: [
      "Super Admin, HR, Finance, Business head, and Staff portals",
      "Compliance gaps (TIN, RSA PIN) at a glance",
      "Omni Co-Pilot workload insights",
      "Group company and sub-company workspaces",
    ],
  },
] as const;

const STATUTORY = [
  { name: "PAYE", detail: "NTA 2025 bands + ₦800k relief path", accent: "border-lagoon" },
  { name: "Pension", detail: "Employee & employer contributions", accent: "border-ok" },
  { name: "NHF", detail: "Housing fund on qualifying pay", accent: "border-sky" },
  { name: "NSITF", detail: "Employer remittance aligned to run", accent: "border-signal" },
] as const;

const FLOW_STEP_CLASS = [
  "bg-lagoon text-ink",
  "bg-ok text-foam",
  "bg-sky text-ink",
  "bg-signal text-foam",
] as const;

const CAPABILITY_DOT: Record<(typeof CAPABILITIES)[number]["tone"], string> = {
  ok: "bg-ok",
  lagoon: "bg-lagoon",
  sky: "bg-sky",
};

export function LandingPage({ signupEnabled = true }: { signupEnabled?: boolean }) {
  return (
    <div className="min-h-screen min-h-dvh bg-mist text-ink">
      <BrandStripe />
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-foam/90 px-5 py-3 backdrop-blur-md sm:px-8 lg:px-12">
        <p className="text-sm font-semibold tracking-tight text-ink sm:text-base">
          {PRODUCT_NAME}
        </p>
        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Account">
          <a
            href="/login"
            className="rounded-md px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-sand hover:text-ink"
          >
            Sign in
          </a>
          {signupEnabled ? (
            <a
              href="/signup"
              className="rounded-md bg-ink px-3.5 py-2 text-sm font-semibold text-foam transition hover:bg-ink-soft"
            >
              Internal setup
            </a>
          ) : null}
        </nav>
      </header>

      <section className="relative overflow-hidden bg-atmosphere">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-12 lg:gap-12 lg:px-12 lg:py-24">
          <div className="animate-soft-rise lg:col-span-7">
            <p className="page-kicker">Private · Blackcountry Group</p>
            <h1 className="font-marketing mt-4 text-4xl font-semibold leading-[1.02] tracking-tight text-ink sm:text-5xl md:text-6xl">
              {PRODUCT_NAME}
            </h1>
            <p className="mt-5 max-w-lg text-lg font-medium leading-snug text-ink-soft sm:text-xl">
              {PRODUCT_POSITIONING}
            </p>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
              Designed for the group company and its sub-companies — not for the
              general public. People, attendance, and payroll stay in one
              command center, with HR clearance before money moves.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {signupEnabled ? (
                <CtaLink href="/signup" variant="ink">
                  Internal setup
                </CtaLink>
              ) : null}
              <a
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-md bg-lagoon px-5 text-sm font-semibold text-ink transition hover:bg-lagoon-deep"
              >
                Sign in
              </a>
            </div>
            <p className="mt-4 text-xs text-muted">
              Access is by issued login only. If you do not have an account, ask
              HR or Super Admin.
            </p>
          </div>

          <div
            className="animate-fade-up lg:col-span-5"
            style={{ animationDelay: "80ms" }}
          >
            <div className="rounded-xl bg-rail p-6 text-foam shadow-soft sm:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-lagoon">
                This month · explained
              </p>
              <p className="mt-4 text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
                ₦669,420
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/60">
                Take-home after truth — contract, attendance, and remittances in
                one line of sight
              </p>
              <dl className="mt-8 space-y-0 border-t border-white/10">
                {[
                  { label: "Gross contract", value: "₦850,000" },
                  {
                    label: "Statutory (PAYE · pension · NHF)",
                    value: "−₦142,400",
                  },
                  { label: "Attendance confirmed by HR", value: "−₦38,180" },
                  { label: "Net on the slip", value: "₦669,420", emph: true },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-baseline justify-between gap-4 border-b border-white/10 py-3 text-sm"
                  >
                    <dt className={row.emph ? "font-medium text-foam" : "text-white/55"}>
                      {row.label}
                    </dt>
                    <dd
                      className={`tabular-nums ${
                        row.emph ? "font-semibold text-lagoon" : "font-medium text-foam"
                      }`}
                    >
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-foam px-5 py-10 sm:px-8 lg:px-12">
        <p className="mx-auto max-w-3xl text-center text-base font-medium leading-relaxed text-ink-soft sm:text-lg">
          {PRODUCT_TAGLINE} — one system for the holding company and every
          sub-company under it, not a product for the open market.
        </p>
      </section>

      <section className="px-5 py-16 text-ink sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <p className="page-kicker">Built for the group</p>
          <h2 className="font-marketing mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Payroll that explains itself
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
            {PRODUCT_NAME} was designed for Blackcountry Group, not the general
            public. It is the layer that makes every naira on the slip
            defensible — to staff, Super Admin, and month-end remittance.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PILLARS.map((pillar) => (
              <article
                key={pillar.label}
                className="rounded-lg border border-line bg-foam p-5 shadow-panel"
              >
                <LandingLottie
                  src={pillar.lottie}
                  className="mb-3 h-20 w-20 shrink-0"
                  speed={0.9}
                />
                <p className="text-xs font-bold text-ink/40">{pillar.label}</p>
                <h3 className="mt-2 text-lg font-semibold tracking-tight text-ink">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {pillar.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-foam px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <p className="page-kicker">How it works</p>
          <h2 className="font-marketing mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
            From roster to remittance in one group workspace
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
            Super Admin and HR share the command center across the group and
            each sub-company. Sensitive actions stay Super Admin–cleared.
            Finance processes approved pay. Staff use a separate portal — they
            never touch payroll.
          </p>

          <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FLOW.map((item) => (
              <li key={item.step} className="rounded-lg border border-line bg-mist/50 p-4">
                <div className="mb-3 flex h-28 items-center justify-center overflow-hidden rounded-md bg-foam ring-1 ring-line">
                  <LandingLottie
                    src={item.lottie}
                    className="h-24 w-24"
                    tone={
                      item.lottie.includes("money-cycle") ||
                      item.lottie.includes("hr-team") ||
                      item.lottie.includes("approval")
                        ? "mist"
                        : "default"
                    }
                    speed={0.85}
                  />
                </div>
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${FLOW_STEP_CLASS[Number(item.step) - 1]}`}
                >
                  {item.step}
                </span>
                <h3 className="mt-2 text-base font-semibold text-ink">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-line px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <p className="page-kicker">Inside the product</p>
          <h2 className="font-marketing mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything the group needs before payday
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
            People ops, statutory payroll, compliance, and exports — one
            Blackcountry Group workspace instead of a folder of conflicting
            files.
          </p>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {CAPABILITIES.map((group) => (
              <div
                key={group.title}
                className="rounded-lg border border-line bg-foam p-5 shadow-panel"
              >
                <h3 className="text-lg font-semibold tracking-tight text-ink">
                  {group.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {group.items.map((item) => (
                    <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                      <span
                        aria-hidden
                        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-sm ${CAPABILITY_DOT[group.tone]}`}
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-rail px-5 py-16 text-foam sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-start justify-between gap-10">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-lagoon">
                Statutory core
              </p>
              <h2 className="font-marketing mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Nigerian remittances without a second set of books
              </h2>
              <p className="mt-4 text-base leading-relaxed text-white/65">
                Every run snapshots the rules it used. Remittance packs and payslips
                stay aligned — so month-end filing is a handoff, not a rebuild.
              </p>
            </div>
            <LandingLottie
              src="/lottie/remittance-pack.json"
              className="hidden h-28 w-28 shrink-0 xl:block"
              speed={0.8}
            />
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STATUTORY.map((item) => (
              <div
                key={item.name}
                className={`rounded-lg border border-white/10 border-l-2 bg-white/5 p-4 ${item.accent}`}
              >
                <p className="text-xl font-semibold text-foam">{item.name}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-white/55">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="page-kicker">Who it&apos;s for</p>
            <h2 className="font-marketing mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Blackcountry Group officers and staff
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">
              Super Admin, HR, Finance, and Business heads of the group and its
              sub-companies. Staff get a portal for details, leave, timesheets,
              and requests — no admin tools. Accounts are issued inside the
              group. This is not an open signup.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {signupEnabled ? (
                <CtaLink href="/signup" variant="ink">
                  Internal setup
                </CtaLink>
              ) : null}
              <a
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-md border border-line bg-foam px-5 text-sm font-semibold text-ink transition hover:bg-sand"
              >
                Sign in
              </a>
            </div>
          </div>
          <LandingLottie
            src="/lottie/approval.json"
            className="mx-auto h-36 w-36 shrink-0 sm:h-40 sm:w-40 lg:mx-0"
            tone="mist"
            speed={0.9}
          />
        </div>
      </section>

      <section className="border-t border-line bg-ink px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-marketing text-3xl font-semibold tracking-tight text-foam sm:text-4xl">
            Sign in to the group workspace
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-white/60">
            {PRODUCT_NAME} is a private system for Blackcountry Group. It is
            not offered to the public. Sign in with the account you were
            issued.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {signupEnabled ? (
              <CtaLink href="/signup" variant="primary">
                Internal setup
              </CtaLink>
            ) : null}
            <CtaLink href="/login" variant={signupEnabled ? "outline" : "primary"}>
              Sign in
            </CtaLink>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-rail">
        <BrandStripe />
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 py-6 text-xs text-white/40 sm:flex-row sm:px-8 lg:px-12">
          <p className="text-sm font-medium text-white/70">{PRODUCT_NAME}</p>
          <p>
            © {new Date().getFullYear()} {PRODUCT_NAME} · Private workspace for
            Blackcountry Group
          </p>
        </div>
      </footer>
    </div>
  );
}

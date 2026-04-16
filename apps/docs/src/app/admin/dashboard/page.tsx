import {
  getWaitlistContacts,
  getNpmDownloads,
  getGitHubStars,
  type WaitlistEntry,
} from '@/lib/admin-data';
import { formatStarCount } from '@/lib/github-stars';
import { SignOutButton } from './sign-out-button';

export default async function AdminDashboardPage() {
  const [contacts, downloads, stars] = await Promise.all([
    getWaitlistContacts(),
    getNpmDownloads(),
    getGitHubStars(),
  ]);

  const totalSignups = contacts.length;
  const teamSignups = contacts.filter((c) => c.tier === 'Teams').length;
  const enterpriseSignups = contacts.filter((c) => c.tier === 'Enterprise').length;

  const weekTotal = downloads.reduce((s, d) => s + d.lastWeek, 0);
  const monthTotal = downloads.reduce((s, d) => s + d.lastMonth, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">Deslint</h1>
          <span className="rounded-md bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
            Admin
          </span>
        </div>
        <SignOutButton />
      </header>

      {/* Summary cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Waitlist signups"
          value={totalSignups}
          detail={`${teamSignups} Teams · ${enterpriseSignups} Enterprise`}
          accentClass="bg-pass"
        />
        <SummaryCard
          label="Downloads (week)"
          value={weekTotal}
          accentClass="bg-primary"
        />
        <SummaryCard
          label="Downloads (month)"
          value={monthTotal}
          accentClass="bg-primary"
        />
        <SummaryCard
          label="GitHub stars"
          value={stars !== null ? formatStarCount(stars) : '—'}
          accentClass="bg-warn"
        />
      </div>

      {/* Package downloads */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Package downloads</h2>
        <div className="overflow-x-auto rounded-xl border border-surface-300 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface-300 text-gray-500">
                <th className="px-4 py-3 font-medium">Package</th>
                <th className="px-4 py-3 font-medium text-right">Last week</th>
                <th className="px-4 py-3 font-medium text-right">Last month</th>
                <th className="px-4 py-3 font-medium text-right">Trend (30d)</th>
              </tr>
            </thead>
            <tbody>
              {downloads.map((d) => (
                <tr key={d.package} className="border-b border-surface-200 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{d.package}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{d.lastWeek.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{d.lastMonth.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <Sparkline data={d.daily.map((p) => p.downloads)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Waitlist contacts */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Waitlist contacts</h2>
        {contacts.length === 0 ? (
          <p className="text-sm text-gray-500">No signups yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-surface-300 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface-300 text-gray-500">
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Tier</th>
                  <th className="px-4 py-3 font-medium text-right">Signed up</th>
                </tr>
              </thead>
              <tbody>
                {[...contacts].reverse().map((c, i) => (
                  <WaitlistRow key={`${c.email}-${c.tier}-${i}`} entry={c} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  accentClass,
}: {
  label: string;
  value: number | string;
  detail?: string;
  accentClass: string;
}) {
  return (
    <div className="rounded-xl border border-surface-300 bg-white p-5">
      <div className="mb-2 flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${accentClass}`} />
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-semibold tabular-nums text-gray-900">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {detail && <p className="mt-1 text-xs text-gray-400">{detail}</p>}
    </div>
  );
}

function WaitlistRow({ entry }: { entry: WaitlistEntry }) {
  const date = new Date(entry.ts);
  const tierClass =
    entry.tier === 'Enterprise'
      ? 'bg-gray-900 text-white'
      : 'bg-primary-100 text-primary-700';

  return (
    <tr className="border-b border-surface-200 last:border-0">
      <td className="px-4 py-3 text-gray-700">{entry.email}</td>
      <td className="px-4 py-3">
        <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${tierClass}`}>
          {entry.tier}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-gray-500 tabular-nums">
        {date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </td>
    </tr>
  );
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return <span className="text-gray-400">—</span>;

  const max = Math.max(...data);
  const h = 24;
  const w = 80;
  const step = w / (data.length - 1);

  const points = data
    .map((v, i) => `${i * step},${h - (max > 0 ? (v / max) * h : 0)}`)
    .join(' ');

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="inline-block"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-primary"
        points={points}
      />
    </svg>
  );
}

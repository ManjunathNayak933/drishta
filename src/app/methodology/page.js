import Navbar from '@/components/layout/Navbar';
import Link from 'next/link';

export const metadata = {
  title: 'Methodology — How Drishta Scores Promises',
};

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Navbar />
      <div className="max-w-article mx-auto px-4 py-14">
        <h1 className="font-serif text-4xl font-bold text-white mb-2">Methodology</h1>
        <p className="font-serif italic text-[#6a6a6a] text-lg mb-10">
          How we track promises, assign statuses, and calculate scores.
        </p>

        <div className="space-y-10">
          <section>
            <h2 className="font-serif text-xl font-semibold text-white mb-4">Promise Statuses</h2>
            <div className="space-y-3">
              {[
                { status: 'Kept', color: '#22c55e', desc: 'The promise was fully delivered. There is verifiable evidence of completion — a project inaugurated, a law passed, a scheme launched as promised.' },
                { status: 'Partially Kept', color: '#a855f7', desc: 'The promise was partially fulfilled — some elements were delivered but not all, or it was delivered to a narrower scope than promised.' },
                { status: 'In Progress', color: '#f59e0b', desc: 'There is credible evidence that work towards this promise is actively underway and has not stalled.' },
                { status: 'Broken', color: '#ef4444', desc: 'The politician's term has ended (or the term context is past) with no delivery. Or the politician explicitly reversed or abandoned the promise.' },
                { status: 'Expired', color: '#6b7280', desc: 'The deadline or term context for this promise has passed and it was neither kept nor explicitly broken — it simply lapsed.' },
                { status: 'Unverified', color: '#3b82f6', desc: 'The promise is recorded but our team has not yet been able to verify its current status. This is the default for newly added promises.' },
              ].map(({ status, color, desc }) => (
                <div key={status} className="flex items-start gap-4 bg-[#111] border border-[#1f1f1f] p-4">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                  </div>
                  <div>
                    <p className="font-medium text-sm mb-1" style={{ color }}>{status}</p>
                    <p className="text-[13px] text-[#7a7a7a] leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-white mb-4">Promise Score Calculation</h2>
            <div className="bg-[#111] border border-[#1f1f1f] p-6 font-mono text-sm">
              <p className="text-[#5a5a5a] mb-3">// Only verified (non-Unverified) promises count</p>
              <p className="text-[#c0c0c0]">score = (</p>
              <p className="text-[#c0c0c0] ml-6">Kept × 1.0</p>
              <p className="text-[#c0c0c0] ml-6">+ Partially Kept × 0.5</p>
              <p className="text-[#c0c0c0] ml-6">+ In Progress × 0.25</p>
              <p className="text-[#c0c0c0] ml-6">+ Broken × 0.0</p>
              <p className="text-[#c0c0c0] ml-6">+ Expired × 0.0</p>
              <p className="text-[#c0c0c0]">) / total_verified_promises × 100</p>
              <div className="border-t border-[#2a2a2a] mt-4 pt-4 space-y-1 text-[#5a5a5a]">
                <p>Score ≥ 70%  → green</p>
                <p>Score 40–69% → amber</p>
                <p>Score &lt; 40%  → red</p>
                <p>No verified promises → not displayed</p>
              </div>
            </div>
            <p className="text-[13px] text-[#5a5a5a] mt-3 leading-relaxed">
              Scores are recomputed automatically every time a promise status changes.
              In Progress is given partial credit because active work has accountability value —
              but not as much as completion.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-white mb-4">Data Sources</h2>
            <p className="text-[#8a8a8a] leading-relaxed text-[15px]">
              Politician data is seeded from{' '}
              <a href="https://myneta.info" target="_blank" rel="noreferrer" className="text-[#3b82f6] hover:underline">MyNeta.info</a>{' '}
              (Election Commission affidavit data) and{' '}
              <a href="https://sansad.in" target="_blank" rel="noreferrer" className="text-[#3b82f6] hover:underline">Sansad.in</a>{' '}
              (Parliament of India). Promises are community-submitted and manually verified by our editorial team
              before going live. Issues are submitted by the public with mandatory photo evidence.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-white mb-4">Limitations</h2>
            <p className="text-[#8a8a8a] leading-relaxed text-[15px]">
              Drishta can only track what is submitted to it. A politician with a high score may simply
              have few promises recorded — not necessarily that they have an exceptional delivery record.
              We encourage users to add missing promises so that coverage becomes more complete over time.
              Scores should be read alongside the underlying data, not in isolation.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

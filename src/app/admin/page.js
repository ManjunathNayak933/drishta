'use client';

import { useState, useEffect } from 'react';
import {
  adminGetStats, adminGetPendingPromises, adminApprovePromise,
  adminRejectPromise, adminGetReports, adminRestoreContent, adminDeleteContent,
  adminGetChannelApplications, adminApproveChannel, adminRejectChannel,
  adminUpdatePromiseStatus, adminGetDataReports, getAllLSConstituencies,
} from '@/lib/api';
import { format } from 'date-fns';

const STATUSES = ['Kept','In Progress','Partially Kept','Broken','Expired','Unverified'];

function UpdatePromiseStatus() {
  const [promiseId, setPromiseId] = useState('');
  const [status, setStatus] = useState('Kept');
  const [evidenceText, setEvidenceText] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!promiseId.trim()) { setError('Enter a promise ID'); return; }
    setSaving(true); setError(''); setDone(false);
    try {
      await adminUpdatePromiseStatus(promiseId.trim(), status, evidenceText, evidenceUrl);
      setDone(true);
      setPromiseId(''); setEvidenceText(''); setEvidenceUrl('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-[#4a4a4a] mb-1">Promise UUID *</label>
          <input className="input text-sm py-2 font-mono" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={promiseId} onChange={e => setPromiseId(e.target.value)} required/>
          <p className="text-[11px] text-[#3a3a3a] mt-1">Find it in Supabase → promises table, or from the promise URL</p>
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-[#4a4a4a] mb-1">New Status *</label>
          <select className="input select text-sm py-2" value={status} onChange={e => setStatus(e.target.value)}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-[#4a4a4a] mb-1">Evidence Text</label>
          <input className="input text-sm py-2" placeholder="What happened? Source of truth?"
            value={evidenceText} onChange={e => setEvidenceText(e.target.value)}/>
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-[#4a4a4a] mb-1">Evidence URL</label>
          <input type="url" className="input text-sm py-2" placeholder="https://…"
            value={evidenceUrl} onChange={e => setEvidenceUrl(e.target.value)}/>
        </div>
      </div>
      {error && <p className="text-[#ef4444] text-xs">{error}</p>}
      {done  && <p className="text-[#22c55e] text-xs">✓ Status updated</p>}
      <button type="submit" className="btn-primary text-sm py-2" disabled={saving}>
        {saving ? 'Updating…' : 'Update Status'}
      </button>
    </form>
  );
}

const TABS = ['Dashboard', 'Pending Promises', 'Reports', 'Channel Applications', 'Data Reports', 'Politician Profiles'];
const TAB_SHORT = ['Stats', 'Promises', 'Reports', 'Channels', 'Data'];

export default function AdminPage() {
  const [tab, setTab] = useState('Dashboard');
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [reports, setReports] = useState({ promises: [], issues: [], articles: [] });
  const [channelApps, setChannelApps] = useState([]);
  const [dataReports, setDataReports] = useState([]);
  const [politicianProfiles, setPoliticianProfiles] = useState([]);
  const [disputeReports, setDisputeReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { loadData(); }, [tab]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'Dashboard')             setStats(await adminGetStats());
      else if (tab === 'Pending Promises') setPending(await adminGetPendingPromises());
      else if (tab === 'Reports') {
        setReports(await adminGetReports());
        try {
          const res = await fetch('/api/admin?action=getDisputeReports');
          if (!res.ok) { setDisputeReports([]); return; }
          const text = await res.text();
          const data = text ? JSON.parse(text) : {};
          setDisputeReports(data.reports ?? []);
        } catch { setDisputeReports([]); }
      }
      else if (tab === 'Channel Applications') setChannelApps(await adminGetChannelApplications());
      else if (tab === 'Data Reports')         setDataReports(await adminGetDataReports());
      else if (tab === 'Politician Profiles') {
        try {
          const res = await fetch('/api/admin?action=getPoliticianProfiles&status=pending');
          if (!res.ok) { setPoliticianProfiles([]); return; }
          const text = await res.text();
          const data = text ? JSON.parse(text) : {};
          setPoliticianProfiles(data.profiles ?? []);
        } catch { setPoliticianProfiles([]); }
      }
    } catch (e) {
      console.error(e);
      setError(e.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function approvePromise(id) {
    const polId = prompt('Enter politician UUID (or leave blank):');
    await adminApprovePromise(id, polId || null);
    loadData();
  }

  async function rejectPromise(id) {
    const notes = prompt('Reason for rejection:');
    if (!notes) return;
    await adminRejectPromise(id, notes);
    loadData();
  }

  async function approveChannel(id) {
    if (!confirm('Approve this channel? A login invite will be emailed to the applicant.')) return;
    try {
      const result = await adminApproveChannel(id);
      const msg = result.emailSent
        ? '✓ Channel approved. Login invite sent to their email.'
        : '✓ Channel approved. Note: invite email may not have been sent (check Supabase Auth settings).';
      alert(msg);
      loadData();
    } catch (e) {
      alert('Failed: ' + e.message);
    }
  }

  async function rejectChannel(id) {
    const notes = prompt('Reason for rejection (will not be shown to applicant):');
    if (!notes) return;
    await adminRejectChannel(id, notes);
    loadData();
  }

  const pendingApps   = channelApps.filter(a => a.status === 'pending');
  const reviewedApps  = channelApps.filter(a => a.status !== 'pending');

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <header className="border-b border-[#1a1a1a] px-4 h-12 flex items-center gap-3">
        <span className="font-serif font-bold text-white">Drishta</span>
        <span className="text-[11px] tracking-wider uppercase text-[#ef4444] bg-[#ef4444]/10 px-2 py-0.5 rounded">
          Admin
        </span>
      </header>

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-48px)]">
        {/* Mobile tab bar */}
        <div className="lg:hidden border-b border-[#1a1a1a] overflow-x-auto flex">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-shrink-0 px-4 h-10 text-[12px] font-medium transition-colors whitespace-nowrap border-b-2 ${
                tab === t ? 'text-white border-white' : 'text-[#5a5a5a] border-transparent hover:text-[#9a9a9a]'
              }`}>
              {TAB_SHORT[i]}
            </button>
          ))}
        </div>

        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-52 border-r border-[#1a1a1a] flex-shrink-0 pt-6">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`w-full text-left px-5 py-2.5 text-[13px] transition-colors ${
                tab === t ? 'text-white bg-[#111] border-r border-white' : 'text-[#5a5a5a] hover:text-white'
              }`}>
              {t}
            </button>
          ))}
        </aside>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">

          {/* Error banner */}
          {error && (
            <div className="mb-6 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg p-4">
              <p className="text-[#ef4444] text-sm font-medium mb-1">Failed to load data</p>
              <p className="text-[#9a9a9a] text-[12px] font-mono mb-3 break-all">{error}</p>
              <p className="text-[#6a6a6a] text-[12px]">
                Make sure <span className="text-white font-mono">.env.local</span> exists with your real Supabase credentials.
                See the setup guide Part 3.4.
              </p>
              <button onClick={loadData}
                className="mt-3 text-[12px] text-[#f59e0b] hover:underline">
                Retry →
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-20 text-center text-[#3a3a3a] text-sm">Loading…</div>
          ) : (
            <>
              {/* DASHBOARD */}
              {tab === 'Dashboard' && (
                <div>
                  <h1 className="font-serif text-2xl font-bold text-white mb-6">Dashboard</h1>
                  <div className="flex gap-3 mb-6 flex-wrap">
                    <a href="/admin/upload-history"
                      className="text-[12px] text-[#3b82f6] border border-[#3b82f6]/20 hover:border-[#3b82f6]/50 px-3 py-1.5 rounded transition-colors flex items-center gap-1.5">
                      📥 Bulk Upload History CSV
                    </a>
                    <a href="/admin/upload-budget"
                      className="text-[12px] text-[#f59e0b] border border-[#f59e0b]/20 hover:border-[#f59e0b]/50 px-3 py-1.5 rounded transition-colors flex items-center gap-1.5">
                      💰 Add State Budget
                    </a>
                    <a href="/admin/upload-ministers"
                      className="text-[12px] text-[#22c55e] border border-[#22c55e]/20 hover:border-[#22c55e]/50 px-3 py-1.5 rounded transition-colors flex items-center gap-1.5">
                      👥 Add Ministers
                    </a>
                    <a href="/admin/upload-performance"
                      className="text-[12px] text-[#a855f7] border border-[#a855f7]/20 hover:border-[#a855f7]/50 px-3 py-1.5 rounded transition-colors flex items-center gap-1.5">
                      📊 Add Performance
                    </a>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    {[
                      { label: 'Pending Promises', value: stats?.pendingPromises ?? 0, color: '#f59e0b', nextTab: 'Pending Promises' },
                      { label: 'Open Issues', value: stats?.openIssues ?? 0, color: '#3b82f6', nextTab: null },
                      { label: 'Channel Applications', value: stats?.pendingChannels ?? 0, color: '#a855f7', nextTab: 'Channel Applications' },
                    ].map(({ label, value, color, nextTab }) => (
                      <button key={label} onClick={() => nextTab && setTab(nextTab)}
                        className={`bg-[#0f0f0f] border border-[#1f1f1f] p-5 text-left ${nextTab ? 'hover:border-[#2a2a2a] transition-colors' : 'cursor-default'}`}>
                        <p className="text-[10px] tracking-wider uppercase text-[#4a4a4a] mb-2">{label}</p>
                        <p className="font-mono text-4xl font-bold" style={{ color }}>{value}</p>
                      </button>
                    ))}
                  </div>

                  {/* Update Promise Status */}
                  <div className="bg-[#0f0f0f] border border-[#1f1f1f] p-5 mb-4">
                    <p className="text-[10px] tracking-wider uppercase text-[#4a4a4a] mb-4">Update Promise Status</p>
                    <UpdatePromiseStatus/>
                  </div>

                  <div className="bg-[#0f0f0f] border border-[#1f1f1f] p-5">
                    <p className="text-[10px] tracking-wider uppercase text-[#4a4a4a] mb-3">Quick Links</p>
                    <div className="flex flex-wrap gap-2">
                      {['/', '/promises', '/issues', '/news'].map((href) => (
                        <a key={href} href={href}
                          className="text-[12px] text-[#5a5a5a] hover:text-white border border-[#2a2a2a] hover:border-[#3a3a3a] px-3 py-1.5 rounded transition-colors">
                          {href === '/' ? 'Homepage' : href.slice(1).charAt(0).toUpperCase() + href.slice(2)}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* PENDING PROMISES */}
              {tab === 'Pending Promises' && (
                <div>
                  <h1 className="font-serif text-2xl font-bold text-white mb-6">
                    Pending Promises
                    <span className="font-sans font-normal text-[#5a5a5a] text-base ml-2">({pending.length})</span>
                  </h1>
                  {pending.length === 0 ? (
                    <div className="py-16 text-center border border-[#1a1a1a]">
                      <p className="text-[#22c55e] text-2xl mb-2">✓</p>
                      <p className="text-[#5a5a5a] text-sm">Nothing pending.</p>
                    </div>
                  ) : (
                    <>
                      <div className="md:hidden space-y-4">
                        {pending.map((p) => (
                          <div key={p.id} className="bg-[#0f0f0f] border border-[#1f1f1f] p-4 rounded-lg">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div>
                                <p className="text-white font-medium text-sm">{p.politician_name}</p>
                                <p className="text-[11px] text-[#5a5a5a]">{p.politician_level} · {p.state}</p>
                              </div>
                              <span className="text-[11px] text-[#5a5a5a] whitespace-nowrap">
                                {new Date(p.created_at).toLocaleDateString('en-IN')}
                              </span>
                            </div>
                            <p className="text-[13px] text-[#9a9a9a] mb-3 line-clamp-3">{p.promise_text}</p>
                            {p.source_url && (
                              <a href={p.source_url} target="_blank" rel="noreferrer"
                                className="text-[11px] text-[#3b82f6] hover:underline block mb-3">source ↗</a>
                            )}
                            <div className="flex gap-2">
                              <button onClick={() => approvePromise(p.id)}
                                className="flex-1 text-xs bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e]/20 px-3 py-2 rounded transition-colors">
                                Approve
                              </button>
                              <button onClick={() => rejectPromise(p.id)}
                                className="flex-1 text-xs bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/20 px-3 py-2 rounded transition-colors">
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="hidden md:block overflow-x-auto">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Politician</th><th>Promise</th><th>Category</th>
                              <th>Source</th><th>Submitted</th><th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pending.map((p) => (
                              <tr key={p.id}>
                                <td>
                                  <p className="text-[#c0c0c0] text-sm font-medium">{p.politician_name}</p>
                                  <p className="text-[11px] text-[#5a5a5a]">{p.politician_level} · {p.state}</p>
                                </td>
                                <td className="max-w-xs">
                                  <p className="text-[13px] text-[#9a9a9a] line-clamp-3">{p.promise_text}</p>
                                  {p.source_url && (
                                    <a href={p.source_url} target="_blank" rel="noreferrer"
                                      className="text-[11px] text-[#3b82f6] hover:underline">source ↗</a>
                                  )}
                                </td>
                                <td className="text-[12px] text-[#6a6a6a]">{p.promise_category}</td>
                                <td className="text-[12px] text-[#6a6a6a]">{p.source}</td>
                                <td className="text-[12px] text-[#5a5a5a] whitespace-nowrap">
                                  {new Date(p.created_at).toLocaleDateString('en-IN')}
                                  <br /><span className="text-[#3a3a3a]">{p.added_by_email}</span>
                                </td>
                                <td>
                                  <div className="flex flex-col gap-1.5">
                                    <button onClick={() => approvePromise(p.id)}
                                      className="text-xs bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e]/20 px-3 py-1.5 rounded transition-colors">
                                      Approve
                                    </button>
                                    <button onClick={() => rejectPromise(p.id)}
                                      className="text-xs bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/20 px-3 py-1.5 rounded transition-colors">
                                      Reject
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* REPORTS */}
              {tab === 'Reports' && (
                <div className="space-y-10">
                  <h1 className="font-serif text-2xl font-bold text-white">Reports</h1>

                  {/* Dispute Resolution Reports */}
                  {disputeReports.length > 0 && (
                    <section>
                      <h2 className="font-sans font-semibold text-[#ef4444] text-sm uppercase tracking-wider mb-4 pb-2 border-b border-[#ef4444]/20">
                        ⚠ Disputed Resolutions ({disputeReports.length})
                      </h2>
                      <div className="space-y-3">
                        {disputeReports.map(r => (
                          <div key={r.id} className="bg-[#0f0f0f] border border-[#ef4444]/20 rounded-lg p-4">
                            <p className="text-sm font-medium text-white mb-1">{r.issues?.title}</p>
                            <p className="text-[11px] text-[#5a5a5a] mb-1">
                              Resolved by: {r.issues?.resolved_by_politician_name ?? 'Unknown'}
                            </p>
                            <p className="text-[12px] text-[#8a8a8a] mb-2">{r.reason}</p>
                            {r.proof_url && (
                              <a href={r.proof_url} target="_blank" rel="noreferrer"
                                className="text-[11px] text-[#3b82f6] hover:underline block mb-2">
                                View proof photo ↗
                              </a>
                            )}
                            <p className="text-[11px] text-[#4a4a4a] mb-3">Reported by: {r.reporter_email}</p>
                            <div className="flex gap-3">
                              <button onClick={async () => {
                                await fetch('/api/admin', { method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ action: 'approveDisputeReport', reportId: r.id }) });
                                loadData();
                              }} className="text-xs text-[#ef4444] border border-[#ef4444]/30 px-3 py-1.5 rounded hover:bg-[#ef4444]/10 transition-colors">
                                Approve — Revert to Disputed
                              </button>
                              <button onClick={async () => {
                                await fetch('/api/admin', { method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ action: 'rejectDisputeReport', reportId: r.id }) });
                                loadData();
                              }} className="text-xs text-[#5a5a5a] border border-[#2a2a2a] px-3 py-1.5 rounded hover:text-white transition-colors">
                                Reject — Keep Resolved
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {[
                    { label: 'Promise Reports', items: reports.promises, type: 'promises', titleKey: 'promise' },
                    { label: 'Issue Reports', items: reports.issues, type: 'issues', titleKey: 'issue' },
                    { label: 'Article Reports', items: reports.articles, type: 'news_articles', titleKey: 'article' },
                  ].map(({ label, items, type, titleKey }) => (
                    <section key={label}>
                      <h2 className="font-sans font-semibold text-[#9a9a9a] text-sm uppercase tracking-wider mb-4 pb-2 border-b border-[#1a1a1a]">
                        {label} ({items.length})
                      </h2>
                      {items.length === 0 ? (
                        <p className="text-[#3a3a3a] text-sm py-4">No reports. ✓</p>
                      ) : (
                        <div className="space-y-3">
                          {items.map((r) => (
                            <div key={r.id} className="bg-[#0f0f0f] border border-[#1f1f1f] p-4">
                              <p className="text-[13px] text-[#9a9a9a] mb-1 line-clamp-2">
                                {r[titleKey]?.promise_text || r[titleKey]?.title || '—'}
                              </p>
                              {r[titleKey]?.is_hidden && (
                                <span className="text-[10px] text-[#ef4444]">HIDDEN</span>
                              )}
                              <p className="text-[11px] text-[#5a5a5a] mt-1">{r.reporter_email} — {r.reason}</p>
                              <div className="flex gap-3 mt-3">
                                <button onClick={async () => { await adminRestoreContent(type, r[titleKey]?.id); loadData(); }}
                                  className="text-xs text-[#22c55e] hover:underline">Restore</button>
                                <button onClick={async () => { if (confirm('Delete permanently?')) { await adminDeleteContent(type, r[titleKey]?.id); loadData(); }}}
                                  className="text-xs text-[#ef4444] hover:underline">Delete</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  ))}
                </div>
              )}

              {/* CHANNEL APPLICATIONS */}
              {tab === 'Channel Applications' && (
                <div>
                  <h1 className="font-serif text-2xl font-bold text-white mb-6">
                    Channel Applications
                    <span className="font-sans font-normal text-[#5a5a5a] text-base ml-2">
                      ({pendingApps.length} pending)
                    </span>
                  </h1>

                  {channelApps.length === 0 ? (
                    <div className="py-16 text-center border border-[#1a1a1a]">
                      <p className="text-[#5a5a5a] text-sm">No applications yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Pending first */}
                      {pendingApps.map(app => (
                        <div key={app.id} className="bg-[#0f0f0f] border border-[#f59e0b]/30 rounded-lg p-5">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="badge badge-progress">Pending</span>
                                <span className="text-[11px] text-[#4a4a4a]">
                                  {app.created_at ? format(new Date(app.created_at), 'dd MMM yyyy') : ''}
                                </span>
                              </div>
                              <h3 className="font-serif text-lg font-semibold text-white">{app.name}</h3>
                              {app.tagline && <p className="text-[13px] text-[#6a6a6a] mt-0.5">{app.tagline}</p>}
                            </div>
                            {app.accent_color && (
                              <div className="w-8 h-8 rounded-full flex-shrink-0 border border-[#2a2a2a]"
                                style={{ background: app.accent_color }}/>
                            )}
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="flex gap-2 text-[13px]">
                              <span className="text-[#4a4a4a] w-24 flex-shrink-0">Applicant</span>
                              <span className="text-[#9a9a9a]">{app.applicant_email}</span>
                            </div>
                            {app.motivation && (
                              <div className="flex gap-2 text-[13px]">
                                <span className="text-[#4a4a4a] w-24 flex-shrink-0">Motivation</span>
                                <span className="text-[#9a9a9a] leading-relaxed">{app.motivation}</span>
                              </div>
                            )}
                            {app.sample_url && (
                              <div className="flex gap-2 text-[13px]">
                                <span className="text-[#4a4a4a] w-24 flex-shrink-0">Sample</span>
                                <a href={app.sample_url} target="_blank" rel="noreferrer"
                                  className="text-[#3b82f6] hover:underline truncate">
                                  {app.sample_url} ↗
                                </a>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 pt-3 border-t border-[#1a1a1a]">
                            <button
                              onClick={() => approveChannel(app.id)}
                              className="flex-1 text-sm bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e]/20 px-4 py-2 rounded transition-colors font-medium"
                            >
                              ✓ Approve Channel
                            </button>
                            <button
                              onClick={() => rejectChannel(app.id)}
                              className="flex-1 text-sm bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/20 px-4 py-2 rounded transition-colors"
                            >
                              ✗ Reject
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Already reviewed */}
                      {reviewedApps.length > 0 && (
                        <>
                          <p className="text-[11px] tracking-wider uppercase text-[#3a3a3a] pt-4">Previously reviewed</p>
                          {reviewedApps.map(app => (
                            <div key={app.id} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4 flex items-center justify-between gap-4">
                              <div>
                                <p className="text-sm text-[#6a6a6a] font-medium">{app.name}</p>
                                <p className="text-[12px] text-[#4a4a4a]">{app.applicant_email}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`badge ${app.status === 'approved' ? 'badge-kept' : 'badge-broken'}`}>
                                  {app.status}
                                </span>
                                {app.status === 'approved' && (
                                  <>
                                    <button onClick={async () => {
                                      const action = app.channelStatus === 'held' ? 'unholdChannel' : 'holdChannel';
                                      await fetch('/api/admin', { method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ action, channelId: app.channelId }) });
                                      loadData();
                                    }} className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                                      app.channelStatus === 'held'
                                        ? 'border-[#22c55e]/30 text-[#22c55e] hover:bg-[#22c55e]/10'
                                        : 'border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/10'
                                    }`}>
                                      {app.channelStatus === 'held' ? 'Unhold' : 'Hold'}
                                    </button>
                                    <button onClick={async () => {
                                      if (!confirm(`Delete ${app.name}? All their articles will be unpublished.`)) return;
                                      await fetch('/api/admin', { method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ action: 'deleteChannel', channelId: app.channelId }) });
                                      loadData();
                                    }} className="text-[10px] px-2 py-1 rounded border border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors">
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* DATA REPORTS */}
              {tab === 'Data Reports' && (
                <DataReportsTab
                  reports={dataReports}
                  onRefresh={loadData}
                />
              )}

              {/* POLITICIAN PROFILES */}
              {tab === 'Politician Profiles' && (
                <div>
                  <p className="text-[#5a5a5a] text-sm mb-4">
                    {politicianProfiles.length === 0
                      ? 'No pending profile requests.'
                      : `${politicianProfiles.length} pending verification request${politicianProfiles.length > 1 ? 's' : ''}`}
                  </p>
                  <div className="space-y-3">
                    {politicianProfiles.map(p => (
                      <div key={p.id} className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-lg p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] px-1.5 py-0.5 rounded"
                                style={{ color: p.level === 'MP' ? '#3b82f6' : '#f59e0b',
                                         background: p.level === 'MP' ? '#3b82f620' : '#f59e0b20' }}>
                                {p.level}
                              </span>
                              <p className="font-medium text-white text-sm">{p.full_name}</p>
                            </div>
                            <p className="text-[12px] text-[#5a5a5a]">{p.constituency}, {p.state}</p>
                            <p className="text-[11px] text-[#4a4a4a] mt-1">{p.email} · {p.phone}</p>
                            {p.politician_id
                              ? <p className="text-[11px] text-[#22c55e] mt-1">✓ Matched to existing politician in DB</p>
                              : <p className="text-[11px] text-[#ef4444] mt-1">⚠ No match found in DB — verify manually</p>
                            }
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button onClick={async () => {
                              await fetch('/api/admin', {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'approvePoliticianProfile', profileId: p.id }),
                              });
                              loadData();
                            }} className="text-[11px] px-3 py-1.5 rounded border border-[#22c55e]/30 text-[#22c55e] hover:bg-[#22c55e]/10 transition-colors">
                              Approve & Create Login
                            </button>
                            <button onClick={async () => {
                              const reason = prompt('Reason for rejection (optional):');
                              await fetch('/api/admin', {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'rejectPoliticianProfile', profileId: p.id, reason }),
                              });
                              loadData();
                            }} className="text-[11px] px-3 py-1.5 rounded border border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors">
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// ── DATA REPORTS TAB ─────────────────────────────────────────────────────────

const TYPE_LABELS = {
  mp_not_connected: { label: 'MP not connected', color: '#3b82f6', icon: '🔗' },
  missing_vs:       { label: 'Missing VS constituency', color: '#f59e0b', icon: '🏛️' },
  missing_ls:       { label: 'Missing LS constituency', color: '#f59e0b', icon: '🏢' },
  wrong_member:     { label: 'Wrong politician', color: '#ef4444', icon: '⚠️' },
};

function DataReportsTab({ reports, onRefresh }) {
  const [fixing, setFixing] = useState(null);
  const [lsOptions, setLsOptions] = useState([]);
  const [selectedLS, setSelectedLS] = useState('');
  const [notes, setNotes] = useState('');
  const [polForm, setPolForm] = useState({ name: '', party: '', level: 'MLA', electionYear: new Date().getFullYear() });
  const [scraping, setScraping] = useState(false);
  const [scrapeLog, setScrapeLog] = useState('');

  async function handleFix(report) {
    setFixing(report.id);
    setNotes('');
    setSelectedLS('');
    setScrapeLog('');
    setPolForm({ name: '', party: '', level: 'MLA', electionYear: new Date().getFullYear() });
    if (report.type === 'mp_not_connected' && report.state) {
      const ls = await getAllLSConstituencies(report.state).catch(() => []);
      setLsOptions(ls);
    }
  }

  async function submitFix(report) {
    try {
      if (report.type === 'mp_not_connected' && selectedLS) {
        const ls = lsOptions.find(l => l.id === selectedLS);
        await fetch('/api/admin', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'fixMpConnection', vsId: report.constituency_id, lsId: selectedLS, vsName: report.constituency_name, lsName: ls?.name ?? '', state: report.state }),
        });
      }
      await fetch('/api/admin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolveDataReport', id: report.id, notes }),
      });
      setFixing(null);
      onRefresh();
    } catch (e) { alert('Fix failed: ' + e.message); }
  }

  async function addPolitician(report) {
    if (!polForm.name) { alert('Enter politician name'); return; }
    try {
      const res = await fetch('/api/admin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addPolitician',
          name: polForm.name,
          level: polForm.level,
          party: polForm.party,
          state: report.state,
          constituencyId: report.constituency_id,
          constituencyName: report.constituency_name,
          electionYear: parseInt(polForm.electionYear),
        }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) { alert('Failed: ' + (data.error ?? res.status)); return; }
      alert(`✓ ${polForm.level} "${polForm.name}" ${data.replaced ? 'replaced (old archived to history)' : 'added'} successfully`);
      setPolForm(f => ({ ...f, name: '', party: '', level: f.level === 'MLA' ? 'MP' : 'MLA' }));
    } catch (e) { alert('Failed: ' + e.message); }
  }

  async function scrapeConstituency(report) {
    setScraping(true);
    setScrapeLog('Starting scrape…');
    try {
      const res = await fetch('/api/scrape-constituency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ constituencyName: report.constituency_name, state: report.state }),
      });
      const data = await res.json();
      if (!res.ok) setScrapeLog('Error: ' + data.error);
      else setScrapeLog(data.output || '✓ Done');
    } catch (e) { setScrapeLog('Error: ' + e.message); }
    finally { setScraping(false); }
  }

  async function handleDismiss(id) {
    await fetch('/api/admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismissDataReport', id }),
    });
    onRefresh();
  }

  const isMissingPol = (type) => true; // show manual form for all types

  if (reports.length === 0) {
    return (
      <div>
        <h1 className="font-serif text-2xl font-bold text-white mb-6">Data Reports</h1>
        <div className="py-16 text-center border border-[#1a1a1a]">
          <p className="text-[#5a5a5a] text-sm">No pending data reports. ✓</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-white mb-2">
        Data Reports
        <span className="font-sans font-normal text-[#5a5a5a] text-base ml-2">({reports.length} pending)</span>
      </h1>
      <p className="text-[#4a4a4a] text-sm mb-6">Issues reported by users about missing or incorrect data.</p>

      <div className="space-y-3">
        {reports.map(r => {
          const typeInfo = TYPE_LABELS[r.type] ?? { label: r.type, color: '#9a9a9a', icon: '❓' };
          const isFixing = fixing === r.id;

          return (
            <div key={r.id} className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-lg p-4">
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <span className="text-xl">{typeInfo.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] px-2 py-0.5 rounded"
                      style={{ color: typeInfo.color, background: typeInfo.color + '18' }}>
                      {typeInfo.label}
                    </span>
                    <span className="text-[11px] text-[#4a4a4a]">
                      {r.created_at ? format(new Date(r.created_at), 'dd MMM yyyy') : ''}
                    </span>
                  </div>
                  <p className="text-sm text-[#c0c0c0] font-medium mt-1">
                    {r.constituency_name}{r.state ? `, ${r.state}` : ''}
                  </p>
                  {r.description && (
                    <p className="text-[12px] text-[#6a6a6a] mt-1 leading-relaxed">{r.description}</p>
                  )}
                  {r.reported_by && (
                    <p className="text-[11px] text-[#3a3a3a] mt-1">Reported by: {r.reported_by}</p>
                  )}
                </div>
              </div>

              {/* Suggested fix */}
              {r.suggested_fix && (
                <div className="bg-[#111] rounded p-3 mb-3 text-[12px] text-[#5a5a5a]">
                  <span className="text-[#4a4a4a] uppercase text-[10px] tracking-wider">Suggested fix: </span>
                  {r.suggested_fix.hint}
                  {r.suggested_fix.vsId && (
                    <span className="block mt-1 font-mono text-[11px] text-[#3a3a3a]">
                      VS ID: {r.suggested_fix.vsId}
                    </span>
                  )}
                </div>
              )}

              {/* Fix UI */}
              {isFixing ? (
                <div className="space-y-3 border-t border-[#1a1a1a] pt-3">

                  {/* MP not connected — pick LS */}
                  {r.type === 'mp_not_connected' && (
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-[#4a4a4a] mb-1.5">Select the correct LS constituency</label>
                      <select className="input text-sm py-2" value={selectedLS} onChange={e => setSelectedLS(e.target.value)}>
                        <option value="">Pick LS constituency…</option>
                        {lsOptions.map(ls => <option key={ls.id} value={ls.id}>{ls.name}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Missing politician — add manually */}
                  {isMissingPol(r.type) && (
                    <div className="space-y-3 bg-[#111] rounded-lg p-3">
                      <p className="text-[11px] uppercase tracking-wider text-[#4a4a4a]">Add politician manually</p>
                      <div className="grid grid-cols-2 gap-2">
                        <select className="input text-sm py-2" value={polForm.level}
                          onChange={e => setPolForm(f => ({ ...f, level: e.target.value }))}>
                          <option value="MLA">MLA</option>
                          <option value="MP">MP</option>
                        </select>
                        <input className="input text-sm py-2" placeholder="Year e.g. 2023"
                          type="number" value={polForm.electionYear}
                          onChange={e => setPolForm(f => ({ ...f, electionYear: e.target.value }))} />
                      </div>
                      <input className="input text-sm py-2" placeholder="Full name *"
                        value={polForm.name} onChange={e => setPolForm(f => ({ ...f, name: e.target.value }))} />
                      <input className="input text-sm py-2" placeholder="Party (e.g. BJP, INC)"
                        value={polForm.party} onChange={e => setPolForm(f => ({ ...f, party: e.target.value }))} />
                      <button onClick={() => addPolitician(r)}
                        className="w-full text-sm bg-[#3b82f6]/10 text-[#3b82f6] hover:bg-[#3b82f6]/20 px-3 py-2 rounded transition-colors">
                        + Add {polForm.level}
                      </button>
                      {r.type === 'missing_both' && (
                        <p className="text-[11px] text-[#4a4a4a]">Add MLA first, then switch to MP and add again.</p>
                      )}
                    </div>
                  )}

                  {/* Scrape this constituency */}
                  <div className="space-y-2">
                    <button onClick={() => scrapeConstituency(r)} disabled={scraping}
                      className="w-full text-sm bg-[#8b5cf6]/10 text-[#8b5cf6] hover:bg-[#8b5cf6]/20 px-3 py-2 rounded transition-colors disabled:opacity-50">
                      {scraping ? 'Scraping…' : '🔍 Scrape this constituency from MyNeta'}
                    </button>
                    {scrapeLog && (
                      <pre className="text-[10px] text-[#5a5a5a] bg-[#0a0a0a] rounded p-2 overflow-auto max-h-24">{scrapeLog}</pre>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#4a4a4a] mb-1.5">Admin notes</label>
                    <input className="input text-sm py-2" placeholder="What was fixed…"
                      value={notes} onChange={e => setNotes(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => submitFix(r)}
                      className="flex-1 text-sm bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e]/20 px-3 py-2 rounded transition-colors">
                      ✓ Mark as Resolved
                    </button>
                    <button onClick={() => setFixing(null)}
                      className="text-sm text-[#4a4a4a] hover:text-white px-3 py-2 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 pt-2 border-t border-[#1a1a1a]">
                  <button onClick={() => handleFix(r)}
                    className="flex-1 text-sm bg-[#3b82f6]/10 text-[#3b82f6] hover:bg-[#3b82f6]/20 px-3 py-2 rounded transition-colors">
                    Fix in UI
                  </button>
                  <button onClick={() => handleDismiss(r.id)}
                    className="text-sm text-[#4a4a4a] hover:text-[#ef4444] px-3 py-2 transition-colors">
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

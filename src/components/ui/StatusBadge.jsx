'use client';

const STATUS_CONFIG = {
  // Promise statuses
  'Kept':           { cls: 'badge-kept',        label: 'Kept' },
  'In Progress':    { cls: 'badge-progress',    label: 'In Progress' },
  'Partially Kept': { cls: 'badge-partial',     label: 'Partially Kept' },
  'Broken':         { cls: 'badge-broken',      label: 'Broken' },
  'Expired':        { cls: 'badge-expired',     label: 'Expired' },
  'Unverified':     { cls: 'badge-unverified',  label: 'Unverified' },
  // Issue statuses
  'Open':           { cls: 'badge-open',        label: 'Open' },
  'Acknowledged':   { cls: 'badge-acknowledged',label: 'Acknowledged' },
  'Resolved':       { cls: 'badge-resolved',    label: 'Resolved' },
  'Disputed':       { cls: 'badge-disputed',    label: 'Disputed' },
};

export function StatusBadge({ status, className = '' }) {
  const cfg = STATUS_CONFIG[status] ?? { cls: 'badge-unverified', label: status };
  return (
    <span className={`badge ${cfg.cls} ${className}`}>
      {cfg.label}
    </span>
  );
}

// ============================================================
// Issue category pills
// ============================================================

const CAT_CONFIG = {
  'Roads':          { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
  'Water Supply':   { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6' },
  'Electricity':    { bg: 'rgba(234,179,8,0.12)',   color: '#eab308' },
  'Sanitation':     { bg: 'rgba(146,64,14,0.12)',   color: '#a16207' },
  'Public Safety':  { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444' },
  'Healthcare':     { bg: 'rgba(34,197,94,0.12)',   color: '#22c55e' },
  'Education':      { bg: 'rgba(168,85,247,0.12)',  color: '#a855f7' },
  'Other':          { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' },
};

const PROMISE_CAT_COLORS = {
  'Infrastructure': '#f59e0b',
  'Water':          '#3b82f6',
  'Employment':     '#22c55e',
  'Health':         '#ef4444',
  'Education':      '#a855f7',
  'Electricity':    '#eab308',
  'Women Safety':   '#ec4899',
  'Agriculture':    '#84cc16',
  'Other':          '#6b7280',
};

export function CategoryPill({ category, type = 'issue', className = '' }) {
  if (type === 'issue') {
    const cfg = CAT_CONFIG[category] ?? CAT_CONFIG['Other'];
    return (
      <span
        className={`cat-pill ${className}`}
        style={{ background: cfg.bg, color: cfg.color }}
      >
        {category}
      </span>
    );
  }

  // Promise category — simpler
  const color = PROMISE_CAT_COLORS[category] ?? '#6b7280';
  return (
    <span
      className={`cat-pill ${className}`}
      style={{ background: `${color}18`, color }}
    >
      {category}
    </span>
  );
}

export default StatusBadge;

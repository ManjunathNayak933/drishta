'use client';

/**
 * PromiseScore — shows a score as a coloured number.
 * inline=true: compact one-liner for politician cards.
 * inline=false: large arc display for politician profile header.
 */
export default function PromiseScore({ score, count, inline = false }) {
  const numScore = score ?? 0;
  const color =
    numScore >= 70 ? '#22c55e' :
    numScore >= 40 ? '#f59e0b' :
    numScore > 0  ? '#ef4444' :
    '#5a5a5a';

  if (inline) {
    return (
      <div className="flex items-center gap-1.5 mt-1.5">
        <span
          className="font-mono font-bold text-sm"
          style={{ color }}
          title="Promise score"
        >
          {count > 0 ? `${Math.round(numScore)}%` : '—'}
        </span>
        {count > 0 && (
          <span className="text-[11px] text-[#5a5a5a]">
            {count} promise{count !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    );
  }

  // Full ring display for politician profile
  const size = 120;
  const stroke = 6;
  const r = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (numScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke="#1f1f1f"
            strokeWidth={stroke}
          />
          {/* Progress */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        {/* Centre number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono font-black text-2xl leading-none"
            style={{ color }}
          >
            {count > 0 ? Math.round(numScore) : '—'}
          </span>
          {count > 0 && (
            <span className="text-[10px] text-[#5a5a5a] mt-0.5 tracking-wider uppercase">score</span>
          )}
        </div>
      </div>
      {count > 0 && (
        <p className="text-[11px] text-[#5a5a5a] text-center">
          Based on {count} tracked promise{count !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

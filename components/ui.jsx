import Link from 'next/link';

export function Panel({ title, icon, action, children, className = '' }) {
  return (
    <section className={`panel ${className}`}>
      {(title || action) && (
        <header className="panel-head flex-wrap">
          <h2 className="panel-title">
            {icon && <span aria-hidden>{icon}</span>}
            {title}
          </h2>
          {action}
        </header>
      )}
      <div className="panel-body">{children}</div>
    </section>
  );
}

export function ViewAll({ href }) {
  return (
    <Link href={href} className="text-[12px] text-muted hover:text-win">
      View all
    </Link>
  );
}

const tones = {
  Win: 'bg-win/15 text-win border-win/30',
  Loss: 'bg-loss/15 text-loss border-loss/30',
  BE: 'bg-be/15 text-be border-be/30',
  Long: 'bg-win/15 text-win border-win/30',
  Short: 'bg-loss/15 text-loss border-loss/30',
  Bullish: 'bg-win/15 text-win border-win/30',
  Bearish: 'bg-loss/15 text-loss border-loss/30',
  Neutral: 'bg-be/15 text-be border-be/30',
  Active: 'bg-win/15 text-win border-win/30',
  Validated: 'bg-win/15 text-win border-win/30',
  Backtesting: 'bg-info/15 text-info border-info/30',
  Testing: 'bg-gold/15 text-gold border-gold/30',
  Draft: 'bg-be/15 text-be border-be/30',
  Research: 'bg-info/15 text-info border-info/30',
  Idea: 'bg-gold/15 text-gold border-gold/30',
  Question: 'bg-gold/15 text-gold border-gold/30',
  Open: 'bg-be/15 text-be border-be/30',
  Done: 'bg-win/15 text-win border-win/30',
  Dropped: 'bg-be/10 text-muted border-line'
};

export function Badge({ children }) {
  const tone = tones[children] || 'bg-panel2 text-text border-line';
  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 text-[12px] font-medium ${tone}`}>
      {children}
    </span>
  );
}

/** R multiple, coloured by sign. */
export function RValue({ value, suffix = 'R' }) {
  const n = Number(value ?? 0);
  const color = n > 0 ? 'text-win' : n < 0 ? 'text-loss' : 'text-be';
  return (
    <span className={`font-mono tabular-nums ${color}`}>
      {n > 0 ? '+' : ''}
      {n.toFixed(1)}
      {suffix}
    </span>
  );
}

export function Stat({ label, value, tone = 'text-text' }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className={`stat ${tone}`}>{value}</div>
    </div>
  );
}

/** Donut win-rate gauge, drawn with a single SVG arc. */
export function WinRateRing({ value, size = 104 }) {
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
         aria-label={`Win rate ${pct} percent`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1f2b37" strokeWidth="8" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#22c55e" strokeWidth="8"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="46%" textAnchor="middle" fill="#7b8b9c" fontSize="10">Win rate</text>
      <text x="50%" y="64%" textAnchor="middle" fill="#22c55e" fontSize="18" fontWeight="600">
        {pct}%
      </text>
    </svg>
  );
}

export function Empty({ children }) {
  return <p className="py-6 text-center text-[13px] text-muted">{children}</p>;
}

export function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export function fmtLongDate(d) {
  return new Date(d).toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  });
}

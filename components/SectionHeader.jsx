export default function SectionHeader({ eyebrow, title, description, icon, action }) {
  return (
    <header className="border-b border-line pb-5">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-win">{eyebrow}</p>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-info/30 bg-info/10 text-xl" aria-hidden>{icon}</span>
            <h1 className="font-display text-3xl tracking-wide text-white sm:text-4xl">{title}</h1>
          </div>
          {description && <p className="mt-3 max-w-2xl text-[13px] leading-5 text-muted">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
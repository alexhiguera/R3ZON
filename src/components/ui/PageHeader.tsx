export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="card-glass overflow-hidden">
      <div className="rainbow-bar" />
      <div className="p-6 sm:p-8">
        {eyebrow && <div className="section-label mb-2">{eyebrow}</div>}
        <h1 className="font-display text-2xl font-bold text-text-hi sm:text-3xl">
          {title}
        </h1>
        <div className="accent-bar mt-3" />
        {description && (
          <p className="mt-3 max-w-2xl text-sm text-text-mid">{description}</p>
        )}
      </div>
    </div>
  );
}

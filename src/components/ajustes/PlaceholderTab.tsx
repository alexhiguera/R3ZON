export function PlaceholderTab({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="card-glass p-6 sm:p-8">
      <div className="section-label mb-2">Próximamente</div>
      <h2 className="font-display text-xl font-bold text-text-hi">{title}</h2>
      <div className="accent-bar mt-3" />
      <p className="mt-3 max-w-xl text-sm text-text-mid">{description}</p>
    </div>
  );
}

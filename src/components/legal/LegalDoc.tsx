export function LegalDoc({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="section-label mb-2">{eyebrow}</div>
      <h1 className="font-display text-3xl font-bold text-text-hi">{title}</h1>
      <div className="accent-bar mt-3" />
      <div className="mt-6 flex flex-col gap-5 text-[0.92rem] leading-relaxed text-text-mid">
        {children}
      </div>
    </>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-4 font-display text-lg font-bold text-text-hi">{children}</h2>
  );
}

export function UL({ children }: { children: React.ReactNode }) {
  return <ul className="ml-5 list-disc space-y-1.5">{children}</ul>;
}

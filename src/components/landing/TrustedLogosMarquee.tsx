import type { TrustedLogo } from "@/types";

export function TrustedLogosMarquee({ logos }: { logos: TrustedLogo[] }) {
  if (logos.length === 0) {
    return null;
  }

  const marqueeItems = [...logos, ...logos];

  return (
    <section className="border-y border-border/70 bg-background py-6 sm:py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary-blue">
              Trusted Ecosystem
            </p>
            <h2 className="mt-2 text-xl font-black text-foreground sm:text-2xl">
              Learn with the tools shaping modern AI.
            </h2>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            The teams, models, and platforms our learners encounter every day in real-world AI work.
          </p>
        </div>

        <div className="trusted-marquee-shell">
          <div className="trusted-marquee-track">
            {marqueeItems.map((logo, index) => {
              const content = (
                <div className="trusted-logo-card">
                  <img src={logo.imageUrl} alt={logo.name} className="trusted-logo-image" />
                </div>
              );

              return logo.websiteUrl ? (
                <a
                  key={`${logo.id}-${index}`}
                  href={logo.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={logo.name}
                  className="shrink-0"
                >
                  {content}
                </a>
              ) : (
                <div key={`${logo.id}-${index}`} className="shrink-0" aria-label={logo.name}>
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

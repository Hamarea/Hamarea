const STEPS = [
  {
    n: "01",
    title: "Glissez votre smartphone",
    body: "Insérez n'importe quel téléphone jusqu'à 7\" — iPhone, Samsung, Pixel, Huawei…",
  },
  {
    n: "02",
    title: "Verrouillez le double zip",
    body: "Fermez de bout en bout puis clipsez la sécurité latérale. Vérifié IPX8.",
  },
  {
    n: "03",
    title: "Plongez. Filmez. Profitez.",
    body: "Écran tactile fonctionnel sous l'eau, Face ID actif, photos & vidéos en HD.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-[var(--color-primary-50)] py-16 md:py-20">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--color-primary-600)]">
            En 30 secondes
          </p>
          <h2 className="mt-2 font-display text-3xl md:text-4xl">
            Comment ça marche.
          </h2>
        </div>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="relative rounded-2xl bg-white p-7 ring-1 ring-[var(--color-border)]"
            >
              <span className="font-display text-5xl font-black text-[var(--color-primary-200)]">
                {s.n}
              </span>
              <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

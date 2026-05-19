/**
 * Single-product catalog: Hamarea Sacoche Étanche.
 * Source of truth for the landing page until Supabase is wired to a real
 * product row. Colors map to `product_variants.option_values.color`.
 */

export type ProductColor = {
  id: "rose" | "noir" | "blanc";
  name: string;
  hex: string;
  variantId: string;
  imageUrl: string;
};

export type ProductReview = {
  author: string;
  rating: 1 | 2 | 3 | 4 | 5;
  date: string;
  title: string;
  body: string;
  verified?: boolean;
};

export type ProductFaq = { q: string; a: string };

export const SACOCHE = {
  id: "sacoche-waterproof",
  slug: "sacoche-etanche",
  name: "Sacoche Étanche Hamarea",
  tagline: "Votre smartphone protégé partout — plage, piscine, kayak, randonnée.",
  priceCents: 2490,
  compareAtCents: 3990,
  currency: "EUR" as const,
  rating: 4.8,
  ratingCount: 1247,
  unitsSold: 12500,
  colors: [
    {
      id: "rose",
      name: "Rose",
      hex: "#F4ACB7",
      variantId: "sacoche-rose",
      imageUrl: "/colors/rose.jpg",
    },
    {
      id: "noir",
      name: "Noir",
      hex: "#111111",
      variantId: "sacoche-noir",
      imageUrl: "/colors/noir.jpg",
    },
    {
      id: "blanc",
      name: "Blanc",
      hex: "#F5F5F1",
      variantId: "sacoche-blanc",
      imageUrl: "/colors/blanc.jpg",
    },
  ] satisfies ProductColor[],
  usps: [
    {
      icon: "droplets",
      title: "Étanche IPX8",
      body: "Submersible jusqu'à 30 m. Eau de mer, chlore, sable : aucun risque.",
    },
    {
      icon: "fingerprint",
      title: "Écran tactile sous l'eau",
      body: "Filmez, photographiez, répondez aux messages sans sortir le téléphone.",
    },
    {
      icon: "phone",
      title: "Universel jusqu'à 7\"",
      body: "iPhone 16 Pro Max, Galaxy S25 Ultra, Pixel 9, Huawei… tous compatibles.",
    },
    {
      icon: "anchor",
      title: "Flotte à la surface",
      body: "Tombée à l'eau ? La sacoche remonte automatiquement. Plus jamais de téléphone perdu.",
    },
  ],
  features: [
    "Double zip avec joints renforcés certifiés IPX8",
    "TPU souple et transparent — qualité photo intacte",
    "Tour de cou ajustable + dragonne incluse",
    "Compatible empreinte digitale & Face ID",
    "Légère (45 g) — se range dans une poche",
    "Garantie 2 ans contre tout défaut",
  ],
  reviews: [
    {
      author: "Camille D.",
      rating: 5,
      date: "2026-04-22",
      title: "Indispensable pour mes vacances !",
      body: "Utilisée pendant 3 semaines en Grèce — piscine, mer, paddle. Mon iPhone est ressorti nickel. Je peux filmer mes enfants sous l'eau, c'est magique.",
      verified: true,
    },
    {
      author: "Thomas M.",
      rating: 5,
      date: "2026-04-15",
      title: "Qualité au top, je recommande",
      body: "J'avais peur que le tactile ne fonctionne pas sous l'eau, mais si. Photos sous-marines géniales. La lanière tour de cou est confortable.",
      verified: true,
    },
    {
      author: "Sophie L.",
      rating: 4,
      date: "2026-03-30",
      title: "Parfaite pour le kayak",
      body: "Achetée pour une descente en kayak en Ardèche. Mon téléphone a survécu à 2 dessalages ! Petit bémol : la couleur rose est plus pastel que sur la photo.",
      verified: true,
    },
    {
      author: "Marc R.",
      rating: 5,
      date: "2026-03-12",
      title: "Mieux que les marques à 60€",
      body: "Comparée à ma vieille Quad Lock à 70€, la Hamarea est aussi étanche et la lanière est plus confortable. Excellent rapport qualité-prix.",
      verified: true,
    },
  ],
  faq: [
    {
      q: "Mon smartphone est-il compatible ?",
      a: "Oui : la sacoche accueille tous les modèles jusqu'à 7 pouces, soit l'écrasante majorité des smartphones actuels (iPhone 12 → 16 Pro Max, Samsung Galaxy S20 → S25 Ultra, Google Pixel, Huawei P/Mate, OnePlus, Xiaomi…). Largeur maximale : 9 cm.",
    },
    {
      q: "Le tactile fonctionne-t-il vraiment sous l'eau ?",
      a: "Oui, en surface et sous l'eau jusqu'à environ 2 m. La technologie TPU transmet le doigt à l'écran capacitif. Au-delà de 2 m la pression de l'eau peut gêner le tactile, mais l'étanchéité reste garantie jusqu'à 30 m.",
    },
    {
      q: "Face ID et Touch ID fonctionnent-ils ?",
      a: "Oui pour Face ID (vous serez reconnu à travers le TPU transparent). Touch ID/empreinte digitale fonctionne en surface ; sous l'eau il vaut mieux saisir le code.",
    },
    {
      q: "Quelle est la livraison ?",
      a: "Livraison standard 3-5 jours ouvrés OFFERTE à partir de 79€. Sinon 5,90€. Livraison express 1-2 jours : 12,90€. Expédié depuis la France.",
    },
    {
      q: "Garantie et retour ?",
      a: "Garantie 2 ans contre tout défaut de fabrication. Retour gratuit sous 30 jours, satisfait ou remboursé sans condition.",
    },
    {
      q: "Comment fermer la sacoche correctement ?",
      a: "Insérez le smartphone, refermez le double zip de bout en bout, puis verrouillez le clip latéral. Faites un test à vide dans un évier d'eau pendant 30 secondes avant la première utilisation : aucune goutte ne doit entrer.",
    },
    {
      q: "Puis-je l'utiliser en eau salée ?",
      a: "Oui, c'est même conçu pour ça. Rincez la sacoche à l'eau douce après chaque baignade en mer pour préserver les joints. N'utilisez pas de détergent.",
    },
    {
      q: "Flotte-t-elle vraiment ?",
      a: "Oui : la sacoche est conçue avec une mousse intérieure qui la fait remonter automatiquement même remplie d'un smartphone de 230 g.",
    },
  ],
  press: ["Surf Session", "GQ France", "Marie Claire", "01net", "Frandroid"],
  /**
   * Drop your assets into /public/<folder>/ and add entries below. Sections
   * with an empty array render nothing.
   *
   *   /public/lifestyle/*.jpg  → mosaic gallery (any aspect)
   *   /public/details/*.jpg    → 3-column detail shots
   *   /public/reels/*.mp4      → TikTok-format videos (9:16) — autoplay muted
   *   /public/ugc/*.jpg        → square Instagram-style grid
   */
  media: {
    lifestyle: [] as ReadonlyArray<{ src: string; alt: string; caption?: string }>,
    details: [] as ReadonlyArray<{ src: string; alt: string; title: string; body: string }>,
    reels: [
      { src: "/reels/r01.mp4", caption: "Test immersion" },
      { src: "/reels/r02.mp4", caption: "En action" },
      { src: "/reels/r03.mp4", caption: "Plage & mer" },
    ],
    ugc: [] as ReadonlyArray<{ src: string; handle: string }>,
  },
} as const;

export type Sacoche = typeof SACOCHE;

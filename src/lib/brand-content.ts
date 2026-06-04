/**
 * Localised copy for the Hamarea **brand** home (vs the sacoche product page,
 * whose copy lives in `product-content.ts`). Same pattern: a typed interface
 * guarantees every locale (fr/en/es/de) provides every key, and structural
 * fields (item keys, statuses) stay identical across locales.
 *
 * Brand voice: enthusiastic · casual (tutoiement FR) · lightly irreverent ·
 * factual on specs. Tagline: « JUST RUN & SWIM ».
 */

import { routing } from "@/i18n/routing";

/** Product keys used across the universe grid and the waitlist selector. */
export type ProductKey = "sacoche" | "lycra" | "capuche" | "cup" | "accessoires";

export interface BrandCopy {
  nav: { home: string; sacoche: string; univers: string; about: string };
  tagline: string;
  hero: {
    eyebrow: string;
    titleLine1: string;
    titleLine2: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    scroll: string;
  };
  marquee: string[];
  universe: {
    eyebrow: string;
    heading: string;
    sub: string;
    badgeAvailable: string;
    badgeSoon: string;
    discover: string;
    notify: string;
    items: { key: ProductKey; name: string; desc: string; status: "available" | "soon" }[];
  };
  spotlight: {
    eyebrow: string;
    heading: string;
    sub: string;
    points: string[];
    cta: string;
    ratingSuffix: string;
  };
  commitment: {
    eyebrow: string;
    heading: string;
    sub: string;
    items: { title: string; body: string }[];
  };
  community: { eyebrow: string; heading: string; sub: string; cta: string };
  waitlist: {
    eyebrow: string;
    heading: string;
    sub: string;
    emailLabel: string;
    emailPlaceholder: string;
    productLabel: string;
    products: { key: ProductKey; label: string }[];
    consentLabel: string;
    privacyLink: string;
    submit: string;
    success: string;
    errorEmail: string;
    errorConsent: string;
    errorGeneric: string;
  };
  story: { eyebrow: string; heading: string; body: string; cta: string };
  closing: { heading: string; sub: string; cta: string };
  footer: {
    tagline: string;
    shop: string;
    universe: string;
    soon: string;
    brand: string;
    commitment: string;
  };
}

const fr: BrandCopy = {
  nav: { home: "Accueil", sacoche: "La Sacoche", univers: "L'Univers", about: "À propos" },
  tagline: "Just Run & Swim",
  hero: {
    eyebrow: "Just Run & Swim",
    titleLine1: "L'océan ne fait",
    titleLine2: "jamais de pause.",
    subtitle:
      "Hamarea équipe celles et ceux qui courent et nagent au bord de l'eau. Du matériel testé par la mer — sel, sable, chocs — pour profiter à fond, sans rien craindre.",
    ctaPrimary: "Découvrir la sacoche",
    ctaSecondary: "Rejoindre la vague",
    scroll: "Explorer",
  },
  marquee: [
    "Testé par l'océan",
    "Étanche IPX8",
    "Run & Swim",
    "Livraison 48h",
    "Pensé pour la mer",
    "Sans compromis",
  ],
  universe: {
    eyebrow: "L'univers Hamarea",
    heading: "Une gamme née de la mer.",
    sub: "On commence par la sacoche. La suite arrive — sois le premier prévenu.",
    badgeAvailable: "Disponible",
    badgeSoon: "Bientôt",
    discover: "Découvrir",
    notify: "Être prévenu",
    items: [
      { key: "sacoche", name: "Sacoche étanche", desc: "Ton téléphone à l'abri, à la nage comme au run.", status: "available" },
      { key: "lycra", name: "Lycra anti-UV", desc: "Seconde peau pensée pour l'eau et le soleil.", status: "soon" },
      { key: "capuche", name: "Poncho de change", desc: "Au sec et au chaud, dès la sortie de l'eau.", status: "soon" },
      { key: "cup", name: "Gourde nomade", desc: "Hydratation partout, zéro plastique.", status: "soon" },
      { key: "accessoires", name: "Accessoires", desc: "Bonnet, sacs étanches, et plus à venir.", status: "soon" },
    ],
  },
  spotlight: {
    eyebrow: "Le best-seller",
    heading: "La Sacoche Étanche.",
    sub: "Notre première pièce, déjà adoptée par des milliers de nageurs et coureurs. Certifiée IPX8 jusqu'à 30 m, écran tactile, et elle flotte.",
    points: [
      "Étanche IPX8 — submersible jusqu'à 30 m",
      "Écran tactile fonctionnel sous l'eau",
      "Flotte automatiquement — plus de tel perdu",
      "Universel jusqu'à 7\" · garantie 2 ans",
    ],
    cta: "Voir la sacoche",
    ratingSuffix: "avis",
  },
  commitment: {
    eyebrow: "Notre engagement",
    heading: "On vit de la mer. On la respecte.",
    sub: "Une marque océan, ça se prouve dans la matière — pas dans un slogan.",
    items: [
      { title: "Testé par l'océan", body: "Chaque produit est éprouvé en conditions réelles : eau salée, sable, chocs, UV. Si ça ne tient pas dans l'eau, ça ne sort pas." },
      { title: "Moins de plastique", body: "Emballage sans plastique inutile et matériaux choisis pour durer. On conçoit pour la longévité, pas pour le jetable." },
      { title: "Pour l'océan", body: "Notre terrain de jeu mérite mieux. Une part de chaque commande soutient la protection des océans." },
    ],
  },
  community: {
    eyebrow: "La communauté",
    heading: "Ils courent, nagent, et filment.",
    sub: "Du vrai, du brut, dans l'eau. Tague #Hamarea pour apparaître ici.",
    cta: "Nous suivre",
  },
  waitlist: {
    eyebrow: "Liste d'attente",
    heading: "Sois prévenu en premier.",
    sub: "Les prochaines pièces arrivent. Laisse ton e-mail, choisis ce qui t'intéresse, et accède aux sorties en avant-première.",
    emailLabel: "Ton e-mail",
    emailPlaceholder: "toi@exemple.com",
    productLabel: "Ce qui t'intéresse (optionnel)",
    products: [
      { key: "lycra", label: "Lycra anti-UV" },
      { key: "capuche", label: "Poncho de change" },
      { key: "cup", label: "Gourde nomade" },
      { key: "accessoires", label: "Accessoires" },
    ],
    consentLabel:
      "J'accepte de recevoir les nouveautés Hamarea par e-mail et j'ai lu la",
    privacyLink: "politique de confidentialité.",
    submit: "Rejoindre la liste",
    success: "À bientôt sur la vague ! 🌊 Vérifie ta boîte mail pour confirmer.",
    errorEmail: "Entre une adresse e-mail valide.",
    errorConsent: "Coche la case pour confirmer ton accord.",
    errorGeneric: "Oups, réessaie dans un instant.",
  },
  story: {
    eyebrow: "Notre histoire",
    heading: "Née pour l'eau libre.",
    body: "Hamarea est partie d'un constat simple : courir et nager au bord de la mer, c'est génial — mais le matériel ne suit pas. Trop fragile, trop cher, pas pensé pour l'eau salée. On fabrique l'équipement qu'on voulait pour nos propres sorties. Testé par l'océan, sans compromis.",
    cta: "Lire notre manifeste",
  },
  closing: {
    heading: "Prêt à plonger ?",
    sub: "Commence par la sacoche. Le reste suit.",
    cta: "Découvrir la sacoche",
  },
  footer: {
    tagline: "Équipement & accessoires de mer, testés par l'océan.",
    shop: "Boutique",
    universe: "L'Univers",
    soon: "Bientôt",
    brand: "La marque",
    commitment: "Notre engagement",
  },
};

const en: BrandCopy = {
  nav: { home: "Home", sacoche: "The Pouch", univers: "The Range", about: "About" },
  tagline: "Just Run & Swim",
  hero: {
    eyebrow: "Just Run & Swim",
    titleLine1: "The ocean never",
    titleLine2: "takes a break.",
    subtitle:
      "Hamarea equips the people who run and swim by the water. Gear tested by the sea — salt, sand, knocks — so you can go all in, fearlessly.",
    ctaPrimary: "Discover the pouch",
    ctaSecondary: "Join the wave",
    scroll: "Explore",
  },
  marquee: [
    "Ocean-tested",
    "IPX8 waterproof",
    "Run & Swim",
    "48h delivery",
    "Made for the sea",
    "No compromise",
  ],
  universe: {
    eyebrow: "The Hamarea range",
    heading: "A range born from the sea.",
    sub: "We start with the pouch. The rest is coming — be the first to know.",
    badgeAvailable: "Available",
    badgeSoon: "Soon",
    discover: "Discover",
    notify: "Notify me",
    items: [
      { key: "sacoche", name: "Waterproof pouch", desc: "Your phone safe, swimming or running.", status: "available" },
      { key: "lycra", name: "UV rashguard", desc: "A second skin built for water and sun.", status: "soon" },
      { key: "capuche", name: "Changing robe", desc: "Dry and warm the moment you're out.", status: "soon" },
      { key: "cup", name: "Travel flask", desc: "Hydration anywhere, zero plastic.", status: "soon" },
      { key: "accessoires", name: "Accessories", desc: "Cap, dry bags, and more to come.", status: "soon" },
    ],
  },
  spotlight: {
    eyebrow: "The best-seller",
    heading: "The Waterproof Pouch.",
    sub: "Our first piece, already adopted by thousands of swimmers and runners. IPX8-certified to 30 m, touchscreen, and it floats.",
    points: [
      "IPX8 waterproof — submersible to 30 m",
      "Touchscreen works underwater",
      "Floats automatically — never lose your phone",
      "Universal up to 7\" · 2-year warranty",
    ],
    cta: "View the pouch",
    ratingSuffix: "reviews",
  },
  commitment: {
    eyebrow: "Our commitment",
    heading: "We live off the sea. We respect it.",
    sub: "An ocean brand proves itself in the materials — not in a slogan.",
    items: [
      { title: "Ocean-tested", body: "Every product is proven in real conditions: salt water, sand, knocks, UV. If it doesn't hold up in the water, it doesn't ship." },
      { title: "Less plastic", body: "Packaging without pointless plastic and materials chosen to last. We design for longevity, not landfill." },
      { title: "For the ocean", body: "Our playground deserves better. A share of every order supports ocean conservation." },
    ],
  },
  community: {
    eyebrow: "The community",
    heading: "They run, swim, and film.",
    sub: "Real, raw, in the water. Tag #Hamarea to show up here.",
    cta: "Follow us",
  },
  waitlist: {
    eyebrow: "Waitlist",
    heading: "Be the first to know.",
    sub: "The next pieces are coming. Drop your email, pick what you want, and get early access to launches.",
    emailLabel: "Your email",
    emailPlaceholder: "you@example.com",
    productLabel: "What you're into (optional)",
    products: [
      { key: "lycra", label: "UV rashguard" },
      { key: "capuche", label: "Changing robe" },
      { key: "cup", label: "Travel flask" },
      { key: "accessoires", label: "Accessories" },
    ],
    consentLabel: "I agree to receive Hamarea news by email and I've read the",
    privacyLink: "privacy policy.",
    submit: "Join the list",
    success: "See you on the wave! 🌊 Check your inbox to confirm.",
    errorEmail: "Enter a valid email address.",
    errorConsent: "Tick the box to confirm your consent.",
    errorGeneric: "Oops, try again in a moment.",
  },
  story: {
    eyebrow: "Our story",
    heading: "Born for open water.",
    body: "Hamarea started from a simple observation: running and swimming by the sea is great — but the gear doesn't keep up. Too fragile, too expensive, not made for salt water. We build the equipment we wanted for our own sessions. Ocean-tested, no compromise.",
    cta: "Read our manifesto",
  },
  closing: {
    heading: "Ready to dive in?",
    sub: "Start with the pouch. The rest follows.",
    cta: "Discover the pouch",
  },
  footer: {
    tagline: "Sea gear & accessories, tested by the ocean.",
    shop: "Shop",
    universe: "The Range",
    soon: "Soon",
    brand: "The brand",
    commitment: "Our commitment",
  },
};

const es: BrandCopy = {
  nav: { home: "Inicio", sacoche: "La Funda", univers: "La Gama", about: "Nosotros" },
  tagline: "Just Run & Swim",
  hero: {
    eyebrow: "Just Run & Swim",
    titleLine1: "El océano nunca",
    titleLine2: "hace una pausa.",
    subtitle:
      "Hamarea equipa a quienes corren y nadan junto al agua. Material probado por el mar — sal, arena, golpes — para disfrutar al máximo, sin miedo.",
    ctaPrimary: "Descubrir la funda",
    ctaSecondary: "Súbete a la ola",
    scroll: "Explorar",
  },
  marquee: [
    "Probado por el océano",
    "Impermeable IPX8",
    "Run & Swim",
    "Entrega 48h",
    "Hecho para el mar",
    "Sin concesiones",
  ],
  universe: {
    eyebrow: "La gama Hamarea",
    heading: "Una gama nacida del mar.",
    sub: "Empezamos por la funda. Lo demás llega — sé el primero en saberlo.",
    badgeAvailable: "Disponible",
    badgeSoon: "Pronto",
    discover: "Descubrir",
    notify: "Avísame",
    items: [
      { key: "sacoche", name: "Funda estanca", desc: "Tu móvil a salvo, nadando o corriendo.", status: "available" },
      { key: "lycra", name: "Licra anti-UV", desc: "Una segunda piel pensada para agua y sol.", status: "soon" },
      { key: "capuche", name: "Poncho cambiador", desc: "Seco y caliente nada más salir del agua.", status: "soon" },
      { key: "cup", name: "Botella nómada", desc: "Hidratación en cualquier sitio, cero plástico.", status: "soon" },
      { key: "accessoires", name: "Accesorios", desc: "Gorro, bolsas estancas y más por venir.", status: "soon" },
    ],
  },
  spotlight: {
    eyebrow: "El más vendido",
    heading: "La Funda Estanca.",
    sub: "Nuestra primera pieza, ya adoptada por miles de nadadores y corredores. Certificada IPX8 hasta 30 m, pantalla táctil y flota.",
    points: [
      "Impermeable IPX8 — sumergible hasta 30 m",
      "Pantalla táctil bajo el agua",
      "Flota sola — no pierdas el móvil",
      "Universal hasta 7\" · garantía 2 años",
    ],
    cta: "Ver la funda",
    ratingSuffix: "opiniones",
  },
  commitment: {
    eyebrow: "Nuestro compromiso",
    heading: "Vivimos del mar. Lo respetamos.",
    sub: "Una marca del océano se demuestra en los materiales, no en un eslogan.",
    items: [
      { title: "Probado por el océano", body: "Cada producto se prueba en condiciones reales: agua salada, arena, golpes, UV. Si no aguanta en el agua, no se vende." },
      { title: "Menos plástico", body: "Embalaje sin plástico inútil y materiales elegidos para durar. Diseñamos para la longevidad, no para tirar." },
      { title: "Por el océano", body: "Nuestro terreno de juego merece más. Una parte de cada pedido apoya la conservación de los océanos." },
    ],
  },
  community: {
    eyebrow: "La comunidad",
    heading: "Corren, nadan y graban.",
    sub: "Real, crudo, en el agua. Etiqueta #Hamarea para aparecer aquí.",
    cta: "Síguenos",
  },
  waitlist: {
    eyebrow: "Lista de espera",
    heading: "Entérate el primero.",
    sub: "Las próximas piezas llegan. Deja tu e-mail, elige lo que te interesa y accede antes a los lanzamientos.",
    emailLabel: "Tu e-mail",
    emailPlaceholder: "tu@ejemplo.com",
    productLabel: "Lo que te interesa (opcional)",
    products: [
      { key: "lycra", label: "Licra anti-UV" },
      { key: "capuche", label: "Poncho cambiador" },
      { key: "cup", label: "Botella nómada" },
      { key: "accessoires", label: "Accesorios" },
    ],
    consentLabel: "Acepto recibir novedades de Hamarea por e-mail y he leído la",
    privacyLink: "política de privacidad.",
    submit: "Unirme a la lista",
    success: "¡Nos vemos en la ola! 🌊 Revisa tu correo para confirmar.",
    errorEmail: "Introduce un e-mail válido.",
    errorConsent: "Marca la casilla para confirmar tu consentimiento.",
    errorGeneric: "Vaya, inténtalo de nuevo en un momento.",
  },
  story: {
    eyebrow: "Nuestra historia",
    heading: "Nacida para el agua abierta.",
    body: "Hamarea nació de una idea simple: correr y nadar junto al mar es genial, pero el material no acompaña. Demasiado frágil, demasiado caro, no pensado para el agua salada. Fabricamos el equipo que queríamos para nuestras propias salidas. Probado por el océano, sin concesiones.",
    cta: "Leer nuestro manifiesto",
  },
  closing: {
    heading: "¿Listo para lanzarte?",
    sub: "Empieza por la funda. Lo demás llega.",
    cta: "Descubrir la funda",
  },
  footer: {
    tagline: "Equipo y accesorios de mar, probados por el océano.",
    shop: "Tienda",
    universe: "La Gama",
    soon: "Pronto",
    brand: "La marca",
    commitment: "Nuestro compromiso",
  },
};

const de: BrandCopy = {
  nav: { home: "Start", sacoche: "Die Hülle", univers: "Die Range", about: "Über uns" },
  tagline: "Just Run & Swim",
  hero: {
    eyebrow: "Just Run & Swim",
    titleLine1: "Das Meer macht",
    titleLine2: "niemals Pause.",
    subtitle:
      "Hamarea rüstet alle aus, die am Wasser laufen und schwimmen. Vom Meer getestete Ausrüstung — Salz, Sand, Stöße — damit du voll reingehst, ohne Sorge.",
    ctaPrimary: "Hülle entdecken",
    ctaSecondary: "Auf die Welle",
    scroll: "Entdecken",
  },
  marquee: [
    "Vom Ozean getestet",
    "IPX8 wasserdicht",
    "Run & Swim",
    "48h Lieferung",
    "Fürs Meer gemacht",
    "Kein Kompromiss",
  ],
  universe: {
    eyebrow: "Die Hamarea-Range",
    heading: "Eine Range, geboren aus dem Meer.",
    sub: "Wir starten mit der Hülle. Der Rest kommt — erfahre es als Erster.",
    badgeAvailable: "Verfügbar",
    badgeSoon: "Bald",
    discover: "Entdecken",
    notify: "Benachrichtigen",
    items: [
      { key: "sacoche", name: "Wasserdichte Hülle", desc: "Dein Handy sicher, beim Schwimmen wie beim Laufen.", status: "available" },
      { key: "lycra", name: "UV-Lycra", desc: "Eine zweite Haut, gemacht für Wasser und Sonne.", status: "soon" },
      { key: "capuche", name: "Umzieh-Poncho", desc: "Trocken und warm, sobald du raus bist.", status: "soon" },
      { key: "cup", name: "Trinkflasche", desc: "Hydration überall, null Plastik.", status: "soon" },
      { key: "accessoires", name: "Zubehör", desc: "Mütze, Dry Bags und mehr in Kürze.", status: "soon" },
    ],
  },
  spotlight: {
    eyebrow: "Der Bestseller",
    heading: "Die Wasserdichte Hülle.",
    sub: "Unser erstes Stück, schon von Tausenden Schwimmern und Läufern adoptiert. IPX8-zertifiziert bis 30 m, Touchscreen, und sie schwimmt.",
    points: [
      "IPX8 wasserdicht — tauchfest bis 30 m",
      "Touchscreen funktioniert unter Wasser",
      "Schwimmt automatisch — nie wieder Handy verlieren",
      "Universell bis 7\" · 2 Jahre Garantie",
    ],
    cta: "Hülle ansehen",
    ratingSuffix: "Bewertungen",
  },
  commitment: {
    eyebrow: "Unser Versprechen",
    heading: "Wir leben vom Meer. Wir respektieren es.",
    sub: "Eine Ozeanmarke beweist sich im Material — nicht im Slogan.",
    items: [
      { title: "Vom Ozean getestet", body: "Jedes Produkt wird unter echten Bedingungen geprüft: Salzwasser, Sand, Stöße, UV. Was im Wasser nicht hält, kommt nicht raus." },
      { title: "Weniger Plastik", body: "Verpackung ohne unnötiges Plastik und Materialien, die halten. Wir gestalten für Langlebigkeit, nicht für die Tonne." },
      { title: "Fürs Meer", body: "Unser Spielplatz verdient Besseres. Ein Teil jeder Bestellung unterstützt den Meeresschutz." },
    ],
  },
  community: {
    eyebrow: "Die Community",
    heading: "Sie laufen, schwimmen und filmen.",
    sub: "Echt, roh, im Wasser. Tagge #Hamarea, um hier zu erscheinen.",
    cta: "Folg uns",
  },
  waitlist: {
    eyebrow: "Warteliste",
    heading: "Erfahre es als Erster.",
    sub: "Die nächsten Stücke kommen. Lass deine E-Mail da, wähle, was dich interessiert, und sichere dir frühen Zugang.",
    emailLabel: "Deine E-Mail",
    emailPlaceholder: "du@beispiel.com",
    productLabel: "Was dich interessiert (optional)",
    products: [
      { key: "lycra", label: "UV-Lycra" },
      { key: "capuche", label: "Umzieh-Poncho" },
      { key: "cup", label: "Trinkflasche" },
      { key: "accessoires", label: "Zubehör" },
    ],
    consentLabel: "Ich möchte Hamarea-News per E-Mail erhalten und habe die",
    privacyLink: "Datenschutzerklärung gelesen.",
    submit: "Auf die Liste",
    success: "Bis auf der Welle! 🌊 Prüfe dein Postfach zur Bestätigung.",
    errorEmail: "Gib eine gültige E-Mail-Adresse ein.",
    errorConsent: "Hake das Kästchen an, um zuzustimmen.",
    errorGeneric: "Hoppla, versuch es gleich nochmal.",
  },
  story: {
    eyebrow: "Unsere Geschichte",
    heading: "Geboren fürs offene Wasser.",
    body: "Hamarea begann mit einer simplen Erkenntnis: Laufen und Schwimmen am Meer ist großartig — aber die Ausrüstung kommt nicht mit. Zu fragil, zu teuer, nicht fürs Salzwasser gemacht. Wir bauen die Ausrüstung, die wir für unsere eigenen Sessions wollten. Vom Ozean getestet, kein Kompromiss.",
    cta: "Unser Manifest lesen",
  },
  closing: {
    heading: "Bereit einzutauchen?",
    sub: "Starte mit der Hülle. Der Rest folgt.",
    cta: "Hülle entdecken",
  },
  footer: {
    tagline: "Meeres-Ausrüstung & Zubehör, vom Ozean getestet.",
    shop: "Shop",
    universe: "Die Range",
    soon: "Bald",
    brand: "Die Marke",
    commitment: "Unser Versprechen",
  },
};

const BRAND_COPY: Record<string, BrandCopy> = { fr, en, es, de };

/** Localised brand copy for the given locale, falling back to the default. */
export function getBrandCopy(locale: string): BrandCopy {
  return BRAND_COPY[locale] ?? BRAND_COPY[routing.defaultLocale];
}

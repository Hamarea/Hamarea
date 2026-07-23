/**
 * Localised landing-page copy for the Hamarea sacoche.
 *
 * Locale-invariant data (prices, hex, image URLs, ratings, media srcs, press
 * names, shipping, pack discounts) lives in `product.ts`. This module holds the
 * **translatable** marketing copy for fr/en/es/de so the landing renders in the
 * visitor's language (the hreflang alternates were previously a façade).
 *
 * Consumed via the ambient locale:
 *   - Server Components  → `getLocale()` (next-intl/server) then `getProductCopy`
 *   - Client Components  → `useLocale()` (next-intl) then `getProductCopy`
 *
 * Structural fields (us/them, icon, qty, discountPct, rating, date, verified…)
 * are repeated per locale on purpose so each component can map a single array;
 * they must stay identical across locales. The TypeScript interface guarantees
 * every locale provides every text key.
 */

import { routing } from "@/i18n/routing";

type UspIcon = "droplets" | "fingerprint" | "phone" | "anchor";

export interface ProductCopy {
  productName: string;
  banner: string;
  skipToContent: string;
  nav: { home: string; sacoche: string; avis: string; faq: string; about: string; contact: string };
  hero: { badge: string; titleLine1: string; titleLine2: string; subtitle: string };
  problem: {
    eyebrow: string;
    heading: string;
    sub: string;
    items: { title: string; body: string }[];
  };
  buyBox: {
    ratingSuffix: string;
    /** Uses `{price}`. */
    installment: string;
    colorLabel: string;
    addLabel: string;
    buyNow: string;
    added: string;
    decreaseQty: string;
    increaseQty: string;
    /** Uses `{name}`. */
    colorAria: string;
  };
  reassurance: { freeShip: string; returns: string; warranty: string; securePay: string };
  trust: { items: { title: string; subtitle: string }[] };
  press: { eyebrow: string };
  usp: { eyebrow: string; heading: string; items: { icon: UspIcon; title: string; body: string }[] };
  how: { eyebrow: string; heading: string; steps: { n: string; title: string; body: string }[] };
  reel: {
    eyebrow: string;
    heading: string;
    sub: string;
    captions: string[];
    play: string;
    soundOn: string;
    soundOff: string;
  };
  colors: {
    eyebrow: string;
    heading: string;
    sub: string;
    inStock: string;
    choose: string;
    names: { rose: string; noir: string; blanc: string };
  };
  fits: {
    eyebrow: string;
    heading: string;
    sub: string;
    sizeLabel: string;
    sizeSub: string;
    compatTitle: string;
    brands: string[];
    alsoTitle: string;
    also: string[];
  };
  comparison: {
    eyebrow: string;
    heading: string;
    sub: string;
    criterion: string;
    us: string;
    them: string;
    caption: string;
    yes: string;
    no: string;
    rows: { feature: string; us: boolean; them: boolean }[];
  };
  bundle: {
    eyebrow: string;
    heading: string;
    sub: string;
    mostChosen: string;
    perUnit: string;
    totalLabel: string;
    youSave: string;
    colorLabel: string;
    addLabel: string;
    packs: { qty: number; discountPct: number; highlight: boolean; label: string; sub: string }[];
  };
  testimonials: {
    basedOnPrefix: string;
    basedOnSuffix: string;
    heading: string;
    verified: string;
    reviews: { author: string; rating: 1 | 2 | 3 | 4 | 5; verified: boolean; title: string; body: string }[];
  };
  faq: { eyebrow: string; heading: string; items: { q: string; a: string }[] };
  closing: { heading: string; joinPrefix: string; joinSuffix: string; cta: string };
  sticky: { addLabel: string; added: string };
  cart: {
    title: string;
    close: string;
    empty: string;
    continue: string;
    toFreePrefix: string;
    toFreeSuffix: string;
    freeUnlocked: string;
    subtotal: string;
    checkout: string;
    remove: string;
    decreaseQty: string;
    increaseQty: string;
    securePay: string;
    freeShip: string;
    warranty: string;
  };
}

const fr: ProductCopy = {
  productName: "Sacoche Étanche Hamarea",
  banner: "🌊 Livraison offerte dès 39€ · Retours gratuits 30j · Garantie 2 ans",
  skipToContent: "Aller au contenu",
  nav: { home: "Accueil", sacoche: "La sacoche", avis: "Avis", faq: "FAQ", about: "À propos", contact: "Contact" },
  hero: {
    badge: "Bestseller de l'été",
    titleLine1: "Filmez sous l'eau.",
    titleLine2: "Ressortez au sec.",
    subtitle: "Sacoche certifiée IPX8 jusqu'à 30 m. Écran tactile, compatible iPhone & Android.",
  },
  problem: {
    eyebrow: "Le problème",
    heading: "L'eau et votre smartphone ne font pas bon ménage.",
    sub: "Une vague, une chute dans la piscine, une averse — et c'est 1 000 € qui coulent.",
    items: [
      { title: "Un instant d'inattention", body: "Le téléphone glisse de la serviette, tombe du paddle, prend une vague. Trop tard." },
      { title: "Les photos que vous ratez", body: "Vos enfants qui plongent, le fond marin, l'instant parfait — impossible à filmer sans risque." },
      { title: "Les « waterproof » qui fuient", body: "Zip fragile, tactile mort sous l'eau, sacoche qui coule au fond. Vous avez déjà donné." },
    ],
  },
  buyBox: {
    ratingSuffix: "avis",
    installment: "ou 3× {price} — paiement fractionné disponible",
    colorLabel: "Couleur :",
    addLabel: "Ajouter — ",
    buyNow: "Acheter maintenant",
    added: "Ajouté !",
    decreaseQty: "Diminuer la quantité",
    increaseQty: "Augmenter la quantité",
    colorAria: "Couleur {name}",
  },
  reassurance: {
    freeShip: "Port offert dès 39€",
    returns: "Retours 30j",
    warranty: "Garantie 2 ans",
    securePay: "Paiement sécurisé",
  },
  trust: {
    items: [
      { title: "Livraison rapide", subtitle: "Offerte dès 39€" },
      { title: "Garantie 2 ans", subtitle: "Contre tout défaut" },
      { title: "Retour 30j", subtitle: "Gratuit, sans condition" },
      { title: "Paiement sécurisé", subtitle: "CB · Apple Pay · Google Pay" },
    ],
  },
  press: { eyebrow: "Ils en parlent" },
  usp: {
    eyebrow: "Pourquoi Hamarea",
    heading: "Conçue pour résister là où les autres lâchent.",
    items: [
      { icon: "droplets", title: "Étanche IPX8", body: "Submersible jusqu'à 30 m. Eau de mer, chlore, sable : aucun risque." },
      { icon: "fingerprint", title: "Écran tactile sous l'eau", body: "Filmez, photographiez, répondez aux messages sans sortir le téléphone." },
      { icon: "phone", title: "Universel jusqu'à 7\"", body: "iPhone 16 Pro Max, Galaxy S25 Ultra, Pixel 9, Huawei… tous compatibles." },
      { icon: "anchor", title: "Flotte à la surface", body: "Tombée à l'eau ? La sacoche remonte automatiquement. Plus jamais de téléphone perdu." },
    ],
  },
  how: {
    eyebrow: "En 30 secondes",
    heading: "Comment ça marche.",
    steps: [
      { n: "01", title: "Glissez votre smartphone", body: "Insérez n'importe quel téléphone jusqu'à 7\" — iPhone, Samsung, Pixel, Huawei…" },
      { n: "02", title: "Verrouillez le double zip", body: "Fermez de bout en bout puis clipsez la sécurité latérale. Vérifié IPX8." },
      { n: "03", title: "Plongez. Filmez. Profitez.", body: "Écran tactile fonctionnel sous l'eau, Face ID actif, photos & vidéos en HD." },
    ],
  },
  reel: {
    eyebrow: "En action",
    heading: "Voyez par vous-même.",
    sub: "Pas de retouche, pas de mise en scène. Juste la sacoche, dans la vraie vie.",
    captions: ["Test immersion", "En action", "Plage & mer"],
    play: "Lire",
    soundOn: "Activer le son",
    soundOff: "Couper le son",
  },
  colors: {
    eyebrow: "3 couleurs",
    heading: "La vôtre, c'est laquelle ?",
    sub: "Rose poudré, noir intemporel ou blanc minimaliste. Trois finitions, une même étanchéité IPX8.",
    inStock: "En stock",
    choose: "Choisir",
    names: { rose: "Rose", noir: "Noir", blanc: "Blanc" },
  },
  fits: {
    eyebrow: "Ce qui rentre dedans",
    heading: "Fait pour votre téléphone. Et l'essentiel avec.",
    sub: "Un format universel qui accueille (presque) tous les smartphones — coque fine comprise.",
    sizeLabel: "Jusqu'à 7 pouces",
    sizeSub: "Largeur max. 9 cm",
    compatTitle: "Compatible avec",
    brands: [
      "iPhone 12 → 16 Pro Max",
      "Galaxy S20 → S25 Ultra",
      "Google Pixel 6 → 9",
      "Huawei P & Mate",
      "OnePlus · Xiaomi · Oppo…",
    ],
    alsoTitle: "Et ce qui va avec",
    also: ["Carte bancaire", "Quelques billets", "Clé ou carte d'hôtel"],
  },
  comparison: {
    eyebrow: "Comparatif",
    heading: "Hamarea vs sacoche classique.",
    sub: "Pourquoi payer 60€ ailleurs pour avoir moins ?",
    criterion: "Critère",
    us: "Hamarea",
    them: "Sacoche classique",
    caption: "Comparatif Hamarea contre une sacoche étanche classique",
    yes: "Oui",
    no: "Non",
    rows: [
      { feature: "Étanchéité testée IPX8 (30 m)", us: true, them: false },
      { feature: "Écran tactile fonctionnel sous l'eau", us: true, them: false },
      { feature: "Flotte automatiquement", us: true, them: false },
      { feature: "Tour de cou ajustable inclus", us: true, them: false },
      { feature: "Compatible smartphones jusqu'à 7\"", us: true, them: true },
      { feature: "Garantie 2 ans", us: true, them: false },
      { feature: "Retour gratuit 30 jours", us: true, them: false },
      { feature: "Livraison France 48h", us: true, them: false },
    ],
  },
  bundle: {
    eyebrow: "Économisez plus",
    heading: "Choisissez votre pack.",
    sub: "Plus vous en prenez, plus la remise grimpe. Idéal en cadeau.",
    mostChosen: "Le plus choisi",
    perUnit: "/ unité",
    totalLabel: "Total :",
    youSave: "· vous économisez",
    colorLabel: "Couleur :",
    addLabel: "Ajouter — ",
    packs: [
      { qty: 1, discountPct: 0, highlight: false, label: "1 sacoche", sub: "Pour vous" },
      { qty: 2, discountPct: 15, highlight: true, label: "2 sacoches", sub: "Le préféré des couples" },
      { qty: 3, discountPct: 25, highlight: false, label: "3 sacoches", sub: "Pack famille / cadeaux" },
    ],
  },
  testimonials: {
    basedOnPrefix: "Basé sur ",
    basedOnSuffix: " avis clients vérifiés",
    heading: "Ils ont testé. Ils ont adoré.",
    verified: "Achat vérifié",
    reviews: [
      { author: "Camille D.", rating: 5, verified: true, title: "Indispensable pour mes vacances !", body: "Utilisée pendant 3 semaines en Grèce — piscine, mer, paddle. Mon iPhone est ressorti nickel. Je peux filmer mes enfants sous l'eau, c'est magique." },
      { author: "Thomas M.", rating: 5, verified: true, title: "Qualité au top, je recommande", body: "J'avais peur que le tactile ne fonctionne pas sous l'eau, mais si. Photos sous-marines géniales. La lanière tour de cou est confortable." },
      { author: "Sophie L.", rating: 4, verified: true, title: "Parfaite pour le kayak", body: "Achetée pour une descente en kayak en Ardèche. Mon téléphone a survécu à 2 dessalages ! Petit bémol : la couleur rose est plus pastel que sur la photo." },
      { author: "Marc R.", rating: 5, verified: true, title: "Mieux que les marques à 60€", body: "Comparée à ma vieille Quad Lock à 70€, la Hamarea est aussi étanche et la lanière est plus confortable. Excellent rapport qualité-prix." },
    ],
  },
  faq: {
    eyebrow: "Questions fréquentes",
    heading: "Tout ce qu'il faut savoir.",
    items: [
      { q: "Mon smartphone est-il compatible ?", a: "Oui : la sacoche accueille tous les modèles jusqu'à 7 pouces, soit l'écrasante majorité des smartphones actuels (iPhone 12 → 16 Pro Max, Samsung Galaxy S20 → S25 Ultra, Google Pixel, Huawei P/Mate, OnePlus, Xiaomi…). Largeur maximale : 9 cm." },
      { q: "Le tactile fonctionne-t-il vraiment sous l'eau ?", a: "Oui, en surface et sous l'eau jusqu'à environ 2 m. La technologie TPU transmet le doigt à l'écran capacitif. Au-delà de 2 m la pression de l'eau peut gêner le tactile, mais l'étanchéité reste garantie jusqu'à 30 m." },
      { q: "Face ID et Touch ID fonctionnent-ils ?", a: "Oui pour Face ID (vous serez reconnu à travers le TPU transparent). Touch ID/empreinte digitale fonctionne en surface ; sous l'eau il vaut mieux saisir le code." },
      { q: "Quelle est la livraison ?", a: "Livraison standard 3-5 jours ouvrés OFFERTE à partir de 39€. Sinon 5,90€. Livraison express 1-2 jours : 12,90€." },
      { q: "Garantie et retour ?", a: "Garantie 2 ans contre tout défaut de fabrication. Retour gratuit sous 30 jours, satisfait ou remboursé sans condition." },
      { q: "Comment fermer la sacoche correctement ?", a: "Insérez le smartphone, refermez le double zip de bout en bout, puis verrouillez le clip latéral. Faites un test à vide dans un évier d'eau pendant 30 secondes avant la première utilisation : aucune goutte ne doit entrer." },
      { q: "Puis-je l'utiliser en eau salée ?", a: "Oui, c'est même conçu pour ça. Rincez la sacoche à l'eau douce après chaque baignade en mer pour préserver les joints. N'utilisez pas de détergent." },
      { q: "Flotte-t-elle vraiment ?", a: "Oui : la sacoche est conçue avec une mousse intérieure qui la fait remonter automatiquement même remplie d'un smartphone de 230 g." },
    ],
  },
  closing: {
    heading: "Prêt à protéger votre smartphone pour de bon ?",
    joinPrefix: "Rejoignez les ",
    joinSuffix: " clients qui ne sortent plus sans leur sacoche Hamarea.",
    cta: "Je commande la mienne →",
  },
  sticky: { addLabel: "Ajouter — ", added: "Ajouté" },
  cart: {
    title: "Votre panier",
    close: "Fermer le panier",
    empty: "Votre panier est vide.",
    continue: "Continuer mes achats",
    toFreePrefix: "Plus que",
    toFreeSuffix: "pour la livraison offerte",
    freeUnlocked: "🎉 Livraison offerte débloquée",
    subtotal: "Sous-total",
    checkout: "Commander",
    remove: "Retirer",
    decreaseQty: "Diminuer la quantité",
    increaseQty: "Augmenter la quantité",
    securePay: "Paiement sécurisé",
    freeShip: "Port offert dès 39€",
    warranty: "Garantie 2 ans",
  },
};

const en: ProductCopy = {
  productName: "Hamarea Waterproof Pouch",
  banner: "🌊 Free shipping from €39 · Free 30-day returns · 2-year warranty",
  skipToContent: "Skip to content",
  nav: { home: "Home", sacoche: "The pouch", avis: "Reviews", faq: "FAQ", about: "About", contact: "Contact" },
  hero: {
    badge: "Summer bestseller",
    titleLine1: "Film underwater.",
    titleLine2: "Come out dry.",
    subtitle: "IPX8-certified pouch down to 30 m. Touchscreen works, compatible with iPhone & Android.",
  },
  problem: {
    eyebrow: "The problem",
    heading: "Water and your smartphone don't mix.",
    sub: "One wave, one drop in the pool, one downpour — and there goes €1,000.",
    items: [
      { title: "One moment's lapse", body: "The phone slides off the towel, falls off the paddleboard, catches a wave. Too late." },
      { title: "The shots you miss", body: "Your kids diving, the seabed, the perfect moment — impossible to film without risking it." },
      { title: "“Waterproof” that leaks", body: "Flimsy zip, dead touchscreen underwater, a pouch that sinks. You've been there." },
    ],
  },
  buyBox: {
    ratingSuffix: "reviews",
    installment: "or 3× {price} — instalments available",
    colorLabel: "Colour:",
    addLabel: "Add — ",
    buyNow: "Buy now",
    added: "Added!",
    decreaseQty: "Decrease quantity",
    increaseQty: "Increase quantity",
    colorAria: "Colour {name}",
  },
  reassurance: {
    freeShip: "Free shipping from €39",
    returns: "30-day returns",
    warranty: "2-year warranty",
    securePay: "Secure payment",
  },
  trust: {
    items: [
      { title: "Fast delivery", subtitle: "Free from €39" },
      { title: "2-year warranty", subtitle: "Against any defect" },
      { title: "30-day returns", subtitle: "Free, no conditions" },
      { title: "Secure payment", subtitle: "Card · Apple Pay · Google Pay" },
    ],
  },
  press: { eyebrow: "As featured in" },
  usp: {
    eyebrow: "Why Hamarea",
    heading: "Built to survive where others fail.",
    items: [
      { icon: "droplets", title: "IPX8 waterproof", body: "Submersible to 30 m. Seawater, chlorine, sand: no risk." },
      { icon: "fingerprint", title: "Touchscreen underwater", body: "Film, shoot photos and reply to messages without taking your phone out." },
      { icon: "phone", title: "Universal up to 7\"", body: "iPhone 16 Pro Max, Galaxy S25 Ultra, Pixel 9, Huawei… all compatible." },
      { icon: "anchor", title: "Floats to the surface", body: "Dropped it in the water? The pouch floats back up. Never lose your phone again." },
    ],
  },
  how: {
    eyebrow: "In 30 seconds",
    heading: "How it works.",
    steps: [
      { n: "01", title: "Slide in your smartphone", body: "Insert any phone up to 7\" — iPhone, Samsung, Pixel, Huawei…" },
      { n: "02", title: "Lock the double zip", body: "Close it end to end, then snap the side lock. IPX8-verified." },
      { n: "03", title: "Dive. Film. Enjoy.", body: "Touchscreen works underwater, Face ID active, photos & videos in HD." },
    ],
  },
  reel: {
    eyebrow: "In action",
    heading: "See for yourself.",
    sub: "No retouching, no staging. Just the pouch, in real life.",
    captions: ["Submersion test", "In action", "Beach & sea"],
    play: "Play",
    soundOn: "Unmute",
    soundOff: "Mute",
  },
  colors: {
    eyebrow: "3 colours",
    heading: "Which one is yours?",
    sub: "Powder pink, timeless black or minimalist white. Three finishes, the same IPX8 seal.",
    inStock: "In stock",
    choose: "Choose",
    names: { rose: "Pink", noir: "Black", blanc: "White" },
  },
  fits: {
    eyebrow: "What fits inside",
    heading: "Made for your phone. And the essentials too.",
    sub: "A universal fit that takes (almost) any smartphone — slim case included.",
    sizeLabel: "Up to 7 inches",
    sizeSub: "Max width 9 cm",
    compatTitle: "Compatible with",
    brands: [
      "iPhone 12 → 16 Pro Max",
      "Galaxy S20 → S25 Ultra",
      "Google Pixel 6 → 9",
      "Huawei P & Mate",
      "OnePlus · Xiaomi · Oppo…",
    ],
    alsoTitle: "And what goes with it",
    also: ["Bank card", "A few notes", "Key or hotel card"],
  },
  comparison: {
    eyebrow: "Comparison",
    heading: "Hamarea vs a generic pouch.",
    sub: "Why pay €60 elsewhere for less?",
    criterion: "Criterion",
    us: "Hamarea",
    them: "Generic pouch",
    caption: "Hamarea compared with a generic waterproof pouch",
    yes: "Yes",
    no: "No",
    rows: [
      { feature: "IPX8 waterproofing tested (30 m)", us: true, them: false },
      { feature: "Touchscreen works underwater", us: true, them: false },
      { feature: "Floats automatically", us: true, them: false },
      { feature: "Adjustable neck strap included", us: true, them: false },
      { feature: "Fits smartphones up to 7\"", us: true, them: true },
      { feature: "2-year warranty", us: true, them: false },
      { feature: "Free 30-day returns", us: true, them: false },
      { feature: "48h delivery in France", us: true, them: false },
    ],
  },
  bundle: {
    eyebrow: "Save more",
    heading: "Choose your pack.",
    sub: "The more you take, the bigger the discount. Perfect as a gift.",
    mostChosen: "Most popular",
    perUnit: "/ unit",
    totalLabel: "Total:",
    youSave: "· you save",
    colorLabel: "Colour:",
    addLabel: "Add — ",
    packs: [
      { qty: 1, discountPct: 0, highlight: false, label: "1 pouch", sub: "For you" },
      { qty: 2, discountPct: 15, highlight: true, label: "2 pouches", sub: "Couples' favourite" },
      { qty: 3, discountPct: 25, highlight: false, label: "3 pouches", sub: "Family / gift pack" },
    ],
  },
  testimonials: {
    basedOnPrefix: "Based on ",
    basedOnSuffix: " verified customer reviews",
    heading: "They tried it. They loved it.",
    verified: "Verified purchase",
    reviews: [
      { author: "Camille D.", rating: 5, verified: true, title: "A must-have for my holidays!", body: "Used it for 3 weeks in Greece — pool, sea, paddleboard. My iPhone came out perfect. I can film my kids underwater, it's magic." },
      { author: "Thomas M.", rating: 5, verified: true, title: "Top quality, highly recommend", body: "I was worried the touchscreen wouldn't work underwater, but it does. Amazing underwater photos. The neck strap is comfortable." },
      { author: "Sophie L.", rating: 4, verified: true, title: "Perfect for kayaking", body: "Bought it for a kayak trip in the Ardèche. My phone survived 2 capsizes! Small downside: the pink is more pastel than in the photo." },
      { author: "Marc R.", rating: 5, verified: true, title: "Better than the €60 brands", body: "Compared to my old €70 Quad Lock, the Hamarea is just as waterproof and the strap is more comfortable. Excellent value." },
    ],
  },
  faq: {
    eyebrow: "Frequently asked questions",
    heading: "Everything you need to know.",
    items: [
      { q: "Is my smartphone compatible?", a: "Yes: the pouch fits every model up to 7 inches, i.e. the vast majority of current smartphones (iPhone 12 → 16 Pro Max, Samsung Galaxy S20 → S25 Ultra, Google Pixel, Huawei P/Mate, OnePlus, Xiaomi…). Maximum width: 9 cm." },
      { q: "Does the touchscreen really work underwater?", a: "Yes, at the surface and underwater down to about 2 m. The TPU material passes your finger through to the capacitive screen. Beyond 2 m, water pressure can affect touch, but waterproofing stays guaranteed to 30 m." },
      { q: "Do Face ID and Touch ID work?", a: "Yes for Face ID (you're recognised through the clear TPU). Touch ID/fingerprint works at the surface; underwater it's better to enter your passcode." },
      { q: "What about delivery?", a: "Standard delivery 3-5 business days, FREE from €39. Otherwise €5.90. Express 1-2 days: €12.90." },
      { q: "Warranty and returns?", a: "2-year warranty against any manufacturing defect. Free returns within 30 days, satisfied or refunded, no conditions." },
      { q: "How do I close the pouch correctly?", a: "Insert the phone, close the double zip end to end, then lock the side clip. Run an empty test in a sink of water for 30 seconds before first use: not a drop should get in." },
      { q: "Can I use it in salt water?", a: "Yes, it's designed for it. Rinse the pouch with fresh water after every sea swim to protect the seals. Don't use detergent." },
      { q: "Does it really float?", a: "Yes: the pouch has an internal foam that makes it rise back up automatically, even with a 230 g smartphone inside." },
    ],
  },
  closing: {
    heading: "Ready to protect your phone for good?",
    joinPrefix: "Join the ",
    joinSuffix: " customers who never leave without their Hamarea pouch.",
    cta: "Get mine →",
  },
  sticky: { addLabel: "Add — ", added: "Added" },
  cart: {
    title: "Your cart",
    close: "Close cart",
    empty: "Your cart is empty.",
    continue: "Continue shopping",
    toFreePrefix: "Only",
    toFreeSuffix: "away from free shipping",
    freeUnlocked: "🎉 Free shipping unlocked",
    subtotal: "Subtotal",
    checkout: "Checkout",
    remove: "Remove",
    decreaseQty: "Decrease quantity",
    increaseQty: "Increase quantity",
    securePay: "Secure payment",
    freeShip: "Free shipping from €39",
    warranty: "2-year warranty",
  },
};

const es: ProductCopy = {
  productName: "Funda Estanca Hamarea",
  banner: "🌊 Envío gratis desde 39€ · Devoluciones gratis 30 días · Garantía 2 años",
  skipToContent: "Ir al contenido",
  nav: { home: "Inicio", sacoche: "La funda", avis: "Opiniones", faq: "FAQ", about: "Acerca de", contact: "Contacto" },
  hero: {
    badge: "Lo más vendido del verano",
    titleLine1: "Graba bajo el agua.",
    titleLine2: "Sal seco.",
    subtitle: "Funda certificada IPX8 hasta 30 m. Pantalla táctil, compatible con iPhone y Android.",
  },
  problem: {
    eyebrow: "El problema",
    heading: "El agua y tu smartphone no se llevan bien.",
    sub: "Una ola, una caída en la piscina, un chaparrón — y ahí se van 1.000 €.",
    items: [
      { title: "Un instante de descuido", body: "El teléfono resbala de la toalla, cae del paddle, le entra una ola. Demasiado tarde." },
      { title: "Las fotos que te pierdes", body: "Tus hijos buceando, el fondo marino, el momento perfecto — imposible grabarlo sin arriesgar." },
      { title: "Los «waterproof» que gotean", body: "Cremallera frágil, táctil muerto bajo el agua, funda que se hunde. Ya lo has vivido." },
    ],
  },
  buyBox: {
    ratingSuffix: "opiniones",
    installment: "o 3× {price} — pago fraccionado disponible",
    colorLabel: "Color:",
    addLabel: "Añadir — ",
    buyNow: "Comprar ahora",
    added: "¡Añadido!",
    decreaseQty: "Disminuir cantidad",
    increaseQty: "Aumentar cantidad",
    colorAria: "Color {name}",
  },
  reassurance: {
    freeShip: "Envío gratis desde 39€",
    returns: "Devoluciones 30 días",
    warranty: "Garantía 2 años",
    securePay: "Pago seguro",
  },
  trust: {
    items: [
      { title: "Envío rápido", subtitle: "Gratis desde 39€" },
      { title: "Garantía 2 años", subtitle: "Contra cualquier defecto" },
      { title: "Devolución 30 días", subtitle: "Gratis, sin condiciones" },
      { title: "Pago seguro", subtitle: "Tarjeta · Apple Pay · Google Pay" },
    ],
  },
  press: { eyebrow: "Hablan de nosotros" },
  usp: {
    eyebrow: "Por qué Hamarea",
    heading: "Diseñada para resistir donde las demás fallan.",
    items: [
      { icon: "droplets", title: "Impermeable IPX8", body: "Sumergible hasta 30 m. Agua de mar, cloro, arena: sin riesgo." },
      { icon: "fingerprint", title: "Pantalla táctil bajo el agua", body: "Graba, haz fotos y responde mensajes sin sacar el teléfono." },
      { icon: "phone", title: "Universal hasta 7\"", body: "iPhone 16 Pro Max, Galaxy S25 Ultra, Pixel 9, Huawei… todos compatibles." },
      { icon: "anchor", title: "Flota en la superficie", body: "¿Se cae al agua? La funda sube sola. Nunca más perderás el teléfono." },
    ],
  },
  how: {
    eyebrow: "En 30 segundos",
    heading: "Cómo funciona.",
    steps: [
      { n: "01", title: "Desliza tu smartphone", body: "Mete cualquier teléfono hasta 7\" — iPhone, Samsung, Pixel, Huawei…" },
      { n: "02", title: "Cierra la doble cremallera", body: "Ciérrala de extremo a extremo y abrocha el clip lateral. Verificado IPX8." },
      { n: "03", title: "Bucea. Graba. Disfruta.", body: "Pantalla táctil bajo el agua, Face ID activo, fotos y vídeos en HD." },
    ],
  },
  reel: {
    eyebrow: "En acción",
    heading: "Compruébalo tú mismo.",
    sub: "Sin retoques, sin montajes. Solo la funda, en la vida real.",
    captions: ["Prueba de inmersión", "En acción", "Playa y mar"],
    play: "Reproducir",
    soundOn: "Activar sonido",
    soundOff: "Silenciar",
  },
  colors: {
    eyebrow: "3 colores",
    heading: "¿Cuál es la tuya?",
    sub: "Rosa empolvado, negro atemporal o blanco minimalista. Tres acabados, la misma estanqueidad IPX8.",
    inStock: "En stock",
    choose: "Elegir",
    names: { rose: "Rosa", noir: "Negro", blanc: "Blanco" },
  },
  fits: {
    eyebrow: "Lo que cabe dentro",
    heading: "Hecha para tu móvil. Y lo esencial también.",
    sub: "Un formato universal que admite (casi) todos los smartphones — con funda fina incluida.",
    sizeLabel: "Hasta 7 pulgadas",
    sizeSub: "Ancho máx. 9 cm",
    compatTitle: "Compatible con",
    brands: [
      "iPhone 12 → 16 Pro Max",
      "Galaxy S20 → S25 Ultra",
      "Google Pixel 6 → 9",
      "Huawei P & Mate",
      "OnePlus · Xiaomi · Oppo…",
    ],
    alsoTitle: "Y lo que la acompaña",
    also: ["Tarjeta bancaria", "Algunos billetes", "Llave o tarjeta de hotel"],
  },
  comparison: {
    eyebrow: "Comparativa",
    heading: "Hamarea vs funda clásica.",
    sub: "¿Por qué pagar 60€ en otro sitio por menos?",
    criterion: "Criterio",
    us: "Hamarea",
    them: "Funda clásica",
    caption: "Comparativa de Hamarea frente a una funda estanca clásica",
    yes: "Sí",
    no: "No",
    rows: [
      { feature: "Estanqueidad IPX8 probada (30 m)", us: true, them: false },
      { feature: "Pantalla táctil bajo el agua", us: true, them: false },
      { feature: "Flota automáticamente", us: true, them: false },
      { feature: "Cordón ajustable incluido", us: true, them: false },
      { feature: "Compatible con móviles hasta 7\"", us: true, them: true },
      { feature: "Garantía 2 años", us: true, them: false },
      { feature: "Devolución gratis 30 días", us: true, them: false },
      { feature: "Envío 48h en Francia", us: true, them: false },
    ],
  },
  bundle: {
    eyebrow: "Ahorra más",
    heading: "Elige tu pack.",
    sub: "Cuantas más te lleves, mayor el descuento. Ideal para regalar.",
    mostChosen: "El más elegido",
    perUnit: "/ unidad",
    totalLabel: "Total:",
    youSave: "· ahorras",
    colorLabel: "Color:",
    addLabel: "Añadir — ",
    packs: [
      { qty: 1, discountPct: 0, highlight: false, label: "1 funda", sub: "Para ti" },
      { qty: 2, discountPct: 15, highlight: true, label: "2 fundas", sub: "El favorito de las parejas" },
      { qty: 3, discountPct: 25, highlight: false, label: "3 fundas", sub: "Pack familia / regalos" },
    ],
  },
  testimonials: {
    basedOnPrefix: "Basado en ",
    basedOnSuffix: " opiniones verificadas",
    heading: "Lo probaron. Les encantó.",
    verified: "Compra verificada",
    reviews: [
      { author: "Camille D.", rating: 5, verified: true, title: "¡Imprescindible para mis vacaciones!", body: "La usé 3 semanas en Grecia — piscina, mar, paddle. Mi iPhone salió perfecto. Puedo grabar a mis hijos bajo el agua, es mágico." },
      { author: "Thomas M.", rating: 5, verified: true, title: "Calidad top, lo recomiendo", body: "Temía que la pantalla táctil no funcionara bajo el agua, pero sí. Fotos submarinas geniales. El cordón al cuello es cómodo." },
      { author: "Sophie L.", rating: 4, verified: true, title: "Perfecta para el kayak", body: "La compré para un descenso en kayak en el Ardèche. ¡Mi teléfono sobrevivió a 2 vuelcos! Pequeño pero: el rosa es más pastel que en la foto." },
      { author: "Marc R.", rating: 5, verified: true, title: "Mejor que las marcas de 60€", body: "Comparada con mi vieja Quad Lock de 70€, la Hamarea es igual de estanca y el cordón más cómodo. Excelente relación calidad-precio." },
    ],
  },
  faq: {
    eyebrow: "Preguntas frecuentes",
    heading: "Todo lo que necesitas saber.",
    items: [
      { q: "¿Es compatible mi smartphone?", a: "Sí: la funda admite todos los modelos hasta 7 pulgadas, es decir, la inmensa mayoría de los smartphones actuales (iPhone 12 → 16 Pro Max, Samsung Galaxy S20 → S25 Ultra, Google Pixel, Huawei P/Mate, OnePlus, Xiaomi…). Anchura máxima: 9 cm." },
      { q: "¿De verdad funciona la pantalla táctil bajo el agua?", a: "Sí, en superficie y bajo el agua hasta unos 2 m. El material TPU transmite el dedo a la pantalla capacitiva. Más allá de 2 m la presión del agua puede afectar al táctil, pero la estanqueidad sigue garantizada hasta 30 m." },
      { q: "¿Funcionan Face ID y Touch ID?", a: "Sí para Face ID (te reconoce a través del TPU transparente). El Touch ID/huella funciona en superficie; bajo el agua es mejor introducir el código." },
      { q: "¿Cómo es el envío?", a: "Envío estándar 3-5 días laborables GRATIS a partir de 39€. Si no, 5,90€. Exprés 1-2 días: 12,90€." },
      { q: "¿Garantía y devolución?", a: "Garantía 2 años contra cualquier defecto de fabricación. Devolución gratis en 30 días, satisfecho o reembolsado sin condiciones." },
      { q: "¿Cómo cerrar bien la funda?", a: "Mete el teléfono, cierra la doble cremallera de extremo a extremo y bloquea el clip lateral. Haz una prueba en vacío en un fregadero con agua durante 30 segundos antes del primer uso: no debe entrar ni una gota." },
      { q: "¿Puedo usarla en agua salada?", a: "Sí, está pensada para ello. Aclara la funda con agua dulce después de cada baño en el mar para cuidar las juntas. No uses detergente." },
      { q: "¿De verdad flota?", a: "Sí: la funda lleva una espuma interior que la hace subir automáticamente, incluso con un smartphone de 230 g dentro." },
    ],
  },
  closing: {
    heading: "¿Listo para proteger tu móvil de verdad?",
    joinPrefix: "Únete a los ",
    joinSuffix: " clientes que ya no salen sin su funda Hamarea.",
    cta: "Pido la mía →",
  },
  sticky: { addLabel: "Añadir — ", added: "Añadido" },
  cart: {
    title: "Tu cesta",
    close: "Cerrar la cesta",
    empty: "Tu cesta está vacía.",
    continue: "Seguir comprando",
    toFreePrefix: "Solo",
    toFreeSuffix: "para el envío gratis",
    freeUnlocked: "🎉 Envío gratis desbloqueado",
    subtotal: "Subtotal",
    checkout: "Tramitar pedido",
    remove: "Quitar",
    decreaseQty: "Disminuir cantidad",
    increaseQty: "Aumentar cantidad",
    securePay: "Pago seguro",
    freeShip: "Envío gratis desde 39€",
    warranty: "Garantía 2 años",
  },
};

const de: ProductCopy = {
  productName: "Hamarea Wasserdichte Hülle",
  banner: "🌊 Gratis Versand ab 39€ · 30 Tage gratis Rückgabe · 2 Jahre Garantie",
  skipToContent: "Zum Inhalt springen",
  nav: { home: "Startseite", sacoche: "Die Hülle", avis: "Bewertungen", faq: "FAQ", about: "Über uns", contact: "Kontakt" },
  hero: {
    badge: "Sommer-Bestseller",
    titleLine1: "Filme unter Wasser.",
    titleLine2: "Komm trocken heraus.",
    subtitle: "IPX8-zertifizierte Hülle bis 30 m. Touchscreen, kompatibel mit iPhone & Android.",
  },
  problem: {
    eyebrow: "Das Problem",
    heading: "Wasser und dein Smartphone vertragen sich nicht.",
    sub: "Eine Welle, ein Sturz in den Pool, ein Regenguss — und 1.000 € sind weg.",
    items: [
      { title: "Ein Moment der Unachtsamkeit", body: "Das Handy rutscht vom Handtuch, fällt vom SUP, erwischt eine Welle. Zu spät." },
      { title: "Die Aufnahmen, die du verpasst", body: "Deine Kinder beim Tauchen, der Meeresgrund, der perfekte Moment — ohne Risiko unmöglich zu filmen." },
      { title: "„Wasserdicht“, das leckt", body: "Fragiler Zip, toter Touchscreen unter Wasser, Hülle, die untergeht. Kennst du schon." },
    ],
  },
  buyBox: {
    ratingSuffix: "Bewertungen",
    installment: "oder 3× {price} — Ratenzahlung möglich",
    colorLabel: "Farbe:",
    addLabel: "Hinzufügen — ",
    buyNow: "Jetzt kaufen",
    added: "Hinzugefügt!",
    decreaseQty: "Menge verringern",
    increaseQty: "Menge erhöhen",
    colorAria: "Farbe {name}",
  },
  reassurance: {
    freeShip: "Gratis Versand ab 39€",
    returns: "30 Tage Rückgabe",
    warranty: "2 Jahre Garantie",
    securePay: "Sichere Zahlung",
  },
  trust: {
    items: [
      { title: "Schneller Versand", subtitle: "Gratis ab 39€" },
      { title: "2 Jahre Garantie", subtitle: "Gegen jeden Defekt" },
      { title: "30 Tage Rückgabe", subtitle: "Gratis, ohne Bedingungen" },
      { title: "Sichere Zahlung", subtitle: "Karte · Apple Pay · Google Pay" },
    ],
  },
  press: { eyebrow: "Bekannt aus" },
  usp: {
    eyebrow: "Warum Hamarea",
    heading: "Gemacht, um zu halten, wo andere versagen.",
    items: [
      { icon: "droplets", title: "IPX8 wasserdicht", body: "Tauchfest bis 30 m. Salzwasser, Chlor, Sand: kein Risiko." },
      { icon: "fingerprint", title: "Touchscreen unter Wasser", body: "Filme, fotografiere und antworte auf Nachrichten, ohne das Handy herauszunehmen." },
      { icon: "phone", title: "Universell bis 7\"", body: "iPhone 16 Pro Max, Galaxy S25 Ultra, Pixel 9, Huawei… alle kompatibel." },
      { icon: "anchor", title: "Schwimmt an der Oberfläche", body: "Ins Wasser gefallen? Die Hülle treibt von selbst nach oben. Nie wieder ein verlorenes Handy." },
    ],
  },
  how: {
    eyebrow: "In 30 Sekunden",
    heading: "So funktioniert's.",
    steps: [
      { n: "01", title: "Schiebe dein Smartphone hinein", body: "Jedes Handy bis 7\" — iPhone, Samsung, Pixel, Huawei…" },
      { n: "02", title: "Verriegle den Doppel-Zip", body: "Vollständig schließen, dann den seitlichen Clip einrasten. IPX8-geprüft." },
      { n: "03", title: "Tauchen. Filmen. Genießen.", body: "Touchscreen unter Wasser, Face ID aktiv, Fotos & Videos in HD." },
    ],
  },
  reel: {
    eyebrow: "In Aktion",
    heading: "Überzeuge dich selbst.",
    sub: "Keine Retusche, keine Inszenierung. Nur die Hülle, im echten Leben.",
    captions: ["Tauchtest", "In Aktion", "Strand & Meer"],
    play: "Abspielen",
    soundOn: "Ton an",
    soundOff: "Ton aus",
  },
  colors: {
    eyebrow: "3 Farben",
    heading: "Welche ist deine?",
    sub: "Pudriges Rosa, zeitloses Schwarz oder minimalistisches Weiß. Drei Finishes, dieselbe IPX8-Dichtigkeit.",
    inStock: "Auf Lager",
    choose: "Wählen",
    names: { rose: "Rosa", noir: "Schwarz", blanc: "Weiß" },
  },
  fits: {
    eyebrow: "Was hineinpasst",
    heading: "Gemacht für dein Handy. Und das Wichtigste dazu.",
    sub: "Ein universelles Format für (fast) jedes Smartphone — schlanke Hülle inklusive.",
    sizeLabel: "Bis 7 Zoll",
    sizeSub: "Max. Breite 9 cm",
    compatTitle: "Kompatibel mit",
    brands: [
      "iPhone 12 → 16 Pro Max",
      "Galaxy S20 → S25 Ultra",
      "Google Pixel 6 → 9",
      "Huawei P & Mate",
      "OnePlus · Xiaomi · Oppo…",
    ],
    alsoTitle: "Und was dazu passt",
    also: ["Bankkarte", "Ein paar Scheine", "Schlüssel oder Hotelkarte"],
  },
  comparison: {
    eyebrow: "Vergleich",
    heading: "Hamarea vs herkömmliche Hülle.",
    sub: "Warum woanders 60€ für weniger zahlen?",
    criterion: "Kriterium",
    us: "Hamarea",
    them: "Herkömmliche Hülle",
    caption: "Vergleich von Hamarea mit einer herkömmlichen wasserdichten Hülle",
    yes: "Ja",
    no: "Nein",
    rows: [
      { feature: "IPX8-Dichtigkeit getestet (30 m)", us: true, them: false },
      { feature: "Touchscreen unter Wasser nutzbar", us: true, them: false },
      { feature: "Schwimmt automatisch", us: true, them: false },
      { feature: "Verstellbares Halsband inklusive", us: true, them: false },
      { feature: "Für Smartphones bis 7\"", us: true, them: true },
      { feature: "2 Jahre Garantie", us: true, them: false },
      { feature: "Gratis Rückgabe 30 Tage", us: true, them: false },
      { feature: "48h-Lieferung in Frankreich", us: true, them: false },
    ],
  },
  bundle: {
    eyebrow: "Mehr sparen",
    heading: "Wähle dein Paket.",
    sub: "Je mehr du nimmst, desto größer der Rabatt. Ideal zum Verschenken.",
    mostChosen: "Am beliebtesten",
    perUnit: "/ Stück",
    totalLabel: "Gesamt:",
    youSave: "· du sparst",
    colorLabel: "Farbe:",
    addLabel: "Hinzufügen — ",
    packs: [
      { qty: 1, discountPct: 0, highlight: false, label: "1 Hülle", sub: "Für dich" },
      { qty: 2, discountPct: 15, highlight: true, label: "2 Hüllen", sub: "Der Favorit für Paare" },
      { qty: 3, discountPct: 25, highlight: false, label: "3 Hüllen", sub: "Familien-/Geschenkpaket" },
    ],
  },
  testimonials: {
    basedOnPrefix: "Basierend auf ",
    basedOnSuffix: " verifizierten Kundenbewertungen",
    heading: "Getestet. Geliebt.",
    verified: "Verifizierter Kauf",
    reviews: [
      { author: "Camille D.", rating: 5, verified: true, title: "Unverzichtbar für meinen Urlaub!", body: "3 Wochen in Griechenland genutzt — Pool, Meer, SUP. Mein iPhone kam tadellos heraus. Ich kann meine Kinder unter Wasser filmen, einfach magisch." },
      { author: "Thomas M.", rating: 5, verified: true, title: "Top-Qualität, klare Empfehlung", body: "Ich hatte Angst, der Touchscreen würde unter Wasser nicht funktionieren — tut er aber. Tolle Unterwasserfotos. Das Halsband ist bequem." },
      { author: "Sophie L.", rating: 4, verified: true, title: "Perfekt zum Kajakfahren", body: "Für eine Kajaktour in der Ardèche gekauft. Mein Handy hat 2 Kenterungen überstanden! Kleiner Wermutstropfen: Das Rosa ist pastelliger als auf dem Foto." },
      { author: "Marc R.", rating: 5, verified: true, title: "Besser als die 60€-Marken", body: "Im Vergleich zu meiner alten Quad Lock für 70€ ist die Hamarea genauso dicht und das Band bequemer. Hervorragendes Preis-Leistungs-Verhältnis." },
    ],
  },
  faq: {
    eyebrow: "Häufige Fragen",
    heading: "Alles, was du wissen musst.",
    items: [
      { q: "Ist mein Smartphone kompatibel?", a: "Ja: Die Hülle passt für alle Modelle bis 7 Zoll, also die überwiegende Mehrheit aktueller Smartphones (iPhone 12 → 16 Pro Max, Samsung Galaxy S20 → S25 Ultra, Google Pixel, Huawei P/Mate, OnePlus, Xiaomi…). Maximale Breite: 9 cm." },
      { q: "Funktioniert der Touchscreen wirklich unter Wasser?", a: "Ja, an der Oberfläche und unter Wasser bis ca. 2 m. Das TPU-Material überträgt deinen Finger auf den kapazitiven Bildschirm. Ab 2 m kann der Wasserdruck die Touch-Funktion beeinträchtigen, die Dichtigkeit bleibt aber bis 30 m garantiert." },
      { q: "Funktionieren Face ID und Touch ID?", a: "Ja für Face ID (du wirst durch das transparente TPU erkannt). Touch ID/Fingerabdruck funktioniert an der Oberfläche; unter Wasser gibst du besser den Code ein." },
      { q: "Wie läuft der Versand?", a: "Standardversand 3-5 Werktage, GRATIS ab 39€. Sonst 5,90€. Express 1-2 Tage: 12,90€." },
      { q: "Garantie und Rückgabe?", a: "2 Jahre Garantie gegen jeden Herstellungsfehler. Gratis Rückgabe innerhalb von 30 Tagen, zufrieden oder Geld zurück, ohne Bedingungen." },
      { q: "Wie schließe ich die Hülle richtig?", a: "Handy einlegen, den Doppel-Zip vollständig schließen, dann den seitlichen Clip verriegeln. Vor dem ersten Gebrauch 30 Sekunden leer in einem Wasserbecken testen: Kein Tropfen darf eindringen." },
      { q: "Kann ich sie in Salzwasser verwenden?", a: "Ja, dafür ist sie gemacht. Spüle die Hülle nach jedem Bad im Meer mit Süßwasser ab, um die Dichtungen zu schonen. Verwende kein Reinigungsmittel." },
      { q: "Schwimmt sie wirklich?", a: "Ja: Die Hülle hat einen Schaumstoff im Inneren, der sie automatisch auftreiben lässt – sogar mit einem 230 g schweren Smartphone darin." },
    ],
  },
  closing: {
    heading: "Bereit, dein Handy endlich zu schützen?",
    joinPrefix: "Schließe dich den ",
    joinSuffix: " Kunden an, die nie ohne ihre Hamarea-Hülle losziehen.",
    cta: "Meine bestellen →",
  },
  sticky: { addLabel: "Hinzufügen — ", added: "Hinzugefügt" },
  cart: {
    title: "Dein Warenkorb",
    close: "Warenkorb schließen",
    empty: "Dein Warenkorb ist leer.",
    continue: "Weiter einkaufen",
    toFreePrefix: "Nur noch",
    toFreeSuffix: "bis zum Gratisversand",
    freeUnlocked: "🎉 Gratisversand freigeschaltet",
    subtotal: "Zwischensumme",
    checkout: "Zur Kasse",
    remove: "Entfernen",
    decreaseQty: "Menge verringern",
    increaseQty: "Menge erhöhen",
    securePay: "Sichere Zahlung",
    freeShip: "Gratis Versand ab 39€",
    warranty: "2 Jahre Garantie",
  },
};

const PRODUCT_COPY: Record<string, ProductCopy> = { fr, en, es, de };

/** Localised landing copy for the given locale, falling back to the default. */
export function getProductCopy(locale: string): ProductCopy {
  return PRODUCT_COPY[locale] ?? PRODUCT_COPY[routing.defaultLocale];
}

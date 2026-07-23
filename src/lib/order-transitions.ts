/**
 * Matrice de transition d'état d'une commande — PURE (aucun import DB/serveur),
 * donc testable et importable partout. C'est la spécification exécutable des
 * bascules pilotées par le webhook Stripe (remboursements, litiges, échec de
 * paiement). Les RPC Postgres `reconcile_refund` / `reconcile_dispute` /
 * `mark_order_failed` (migration 0023) **rejouent les mêmes gardes** côté base,
 * de façon atomique — ce module est la référence testée, le SQL est le miroir
 * autoritaire.
 *
 * Règles d'or :
 *  - On ne fait JAMAIS confiance au client : ces fonctions ne prennent que des
 *    montants et états déjà récupérés côté serveur (objet Stripe faisant foi).
 *  - On ne repasse JAMAIS arbitrairement une commande à `paid`.
 *  - On ne rétrograde JAMAIS depuis `refunded` (terminal remboursement).
 *  - On ne touche PAS aux commandes non encaissées (pending/failed/cancelled)
 *    ni aux états de litige lors d'un remboursement.
 */

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "partially_refunded"
  | "disputed"
  | "dispute_won"
  | "dispute_lost"
  | "failed";

/** États où la commande est réellement encaissée (un remboursement a un sens). */
const REFUNDABLE_SOURCE: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  "paid",
  "processing",
  "shipped",
  "delivered",
  "partially_refunded",
]);

/** États depuis lesquels une bascule de litige est légitime. */
const DISPUTABLE_SOURCE: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  "paid",
  "processing",
  "shipped",
  "delivered",
  "partially_refunded",
  "refunded",
  "disputed",
]);

/**
 * État cible après réconciliation d'un remboursement Stripe.
 * `refundedCents` = **cumul absolu** remboursé (source de vérité = charge Stripe).
 * Retourne le nouvel état, ou `null` si aucun changement d'état (no-op idempotent
 * ou transition interdite). Ne rétrograde jamais depuis `refunded`.
 */
export function refundOrderStatus(
  current: OrderStatus,
  refundedCents: number,
  totalCents: number,
): OrderStatus | null {
  if (refundedCents <= 0) return null;
  // Déjà terminal remboursé : jamais de retour en arrière.
  if (current === "refunded") return null;
  if (!REFUNDABLE_SOURCE.has(current)) return null;

  const target: OrderStatus =
    refundedCents >= totalCents ? "refunded" : "partially_refunded";
  return target === current ? null : target;
}

/**
 * État cible d'une commande selon l'événement de litige Stripe reçu.
 *  - `charge.dispute.created`  → `disputed`
 *  - `charge.dispute.closed`   → `dispute_won` | `dispute_lost` (selon status)
 *  - `charge.dispute.updated`  → `null` (le litige évolue, l'état commande non)
 * Retourne `null` si l'événement ne doit pas changer l'état de la commande.
 */
export function disputeOrderTarget(
  eventType: string,
  disputeStatus: string | null | undefined,
): OrderStatus | null {
  if (eventType === "charge.dispute.created") return "disputed";
  if (eventType === "charge.dispute.closed") {
    if (disputeStatus === "won") return "dispute_won";
    if (disputeStatus === "lost") return "dispute_lost";
    // warning_closed / autres statuts terminaux non tranchés : pas de bascule.
    return null;
  }
  return null;
}

/**
 * Applique la cible de litige à l'état courant, en respectant les gardes.
 * Retourne le nouvel état ou `null` (transition interdite / no-op).
 */
export function applyDisputeTarget(
  current: OrderStatus,
  target: OrderStatus | null,
): OrderStatus | null {
  if (target === null) return null;
  if (!DISPUTABLE_SOURCE.has(current)) return null;
  return target === current ? null : target;
}

/**
 * Échec de paiement (`payment_intent.payment_failed`) : seule une commande
 * encore `pending` bascule en `failed`. Jamais on ne touche une commande payée.
 */
export function failedOrderStatus(current: OrderStatus): OrderStatus | null {
  return current === "pending" ? "failed" : null;
}

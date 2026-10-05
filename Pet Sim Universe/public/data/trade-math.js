import { normalizePrice } from './price-core.js';

export const MAX_QUANTITY = 9999;
export const MAX_TICKETS = 1e15;

export function sanitizeTickets(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(MAX_TICKETS, Math.max(0, number)) : 0;
}

// Missing values never turn into free items. Guard multiplication and addition
// too: a valid finite price can still overflow after quantities are applied.
export function calculateOffer(entries, tickets = 0) {
  let total = sanitizeTickets(tickets);
  let incomplete = false;
  let overflow = false;
  for (const entry of entries) {
    let price;
    try { price = normalizePrice(entry.value); } catch { incomplete = true; continue; }
    if (price.number == null) { incomplete = true; continue; }
    const quantity = Number(entry.qty);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) { incomplete = true; continue; }
    const amount = price.number * quantity;
    if (!Number.isFinite(amount) || !Number.isFinite(total + amount)) {
      overflow = true;
      incomplete = true;
      continue;
    }
    total += amount;
  }
  return { total, incomplete, overflow };
}

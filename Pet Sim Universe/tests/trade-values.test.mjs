import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePrice } from '../public/data/price-core.js';
import { calculateOffer, sanitizeTickets, MAX_TICKETS, MAX_QUANTITY } from '../public/data/trade-math.js';
import { tradeSummary } from '../public/data/trade-export.js';

test('every accepted missing-price spelling displays Not Price, while zero stays priced', () => {
  for (const value of [null, undefined, '???', '  ??  ', 'NULL', 'null', 'No Price', 'Not Price', 'Not priced', 'N/A', '', 'unknown']) {
    assert.deepEqual(normalizePrice(value), { key: 'unpriced', number: null, label: 'Not Price' });
  }
  assert.deepEqual(normalizePrice(0), { key: 'number:0', number: 0, label: '0' });
  assert.equal(normalizePrice('O/C').label, 'O/C');
  assert.ok(normalizePrice(1e308).label.length < 20, 'Extreme finite values keep a readable label');
  for (const value of [NaN, Infinity, -1, 'oops', {}, []]) assert.throws(() => normalizePrice(value));
});

function offer(entries = [], tickets = 0) {
  const totals = calculateOffer(entries, tickets);
  return { entries, tickets, total: totals.total, unpriced: totals.incomplete, overflow: totals.overflow };
}

test('a missing or owner-choice price cannot produce a WIN, LOSS or FAIR judgement', () => {
  for (const value of [null, '???', 'O/C']) {
    for (const other of [0, 10, 500]) {
      const unknown = offer([{ value, qty: 1 }, { value: 5, qty: 2 }], 3);
      const known = offer([{ value: other, qty: 1 }]);
      assert.equal(unknown.total, 13);
      assert.equal(tradeSummary({ left: unknown, right: known }).verdict, 'partial');
      assert.equal(tradeSummary({ left: known, right: unknown }).verdict, 'partial');
    }
  }
});

test('priced offers compare from the user perspective, including fractional and zero prices', () => {
  const zero = offer([{ value: 0, qty: 1 }]);
  assert.equal(tradeSummary({ left: zero, right: zero }).verdict, 'fair');
  assert.equal(zero.unpriced, false);
  const left = offer([{ value: '.1', qty: 3 }]);
  const right = offer([], .3);
  assert.equal(tradeSummary({ left, right }).verdict, 'fair');
  assert.equal(tradeSummary({ left: offer([], 10), right: offer([], 11) }).verdict, 'win');
  assert.equal(tradeSummary({ left: offer([], 11), right: offer([], 10) }).verdict, 'lose');
});

test('ticket and quantity guards never leak Infinity or mark an invalid offer complete', () => {
  for (const value of [Infinity, NaN, 'invalid', -50]) assert.equal(sanitizeTickets(value), 0);
  assert.equal(sanitizeTickets(1e100), MAX_TICKETS);
  assert.equal(sanitizeTickets(.1), .1);
  for (const qty of [0, -1, .5, Infinity, MAX_QUANTITY + 1]) assert.equal(calculateOffer([{ value: 10, qty }]).incomplete, true);
  const overflow = offer([{ value: 1e308, qty: 3 }]);
  assert.ok(Number.isFinite(overflow.total));
  assert.equal(overflow.overflow, true);
  assert.equal(tradeSummary({ left: overflow, right: offer() }).verdict, 'partial');
});

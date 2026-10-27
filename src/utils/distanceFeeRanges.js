/**
 * Fee-by-distance range editors (admin delivery fees, a kitchen's big-event
 * delivery). Each row holds where its range ends (blank on the last,
 * open-ended row) and its fee; a range starts where the previous one ends.
 */

/** Rows from saved ranges ({from_km, to_km, fee_rwf}), or `fallback` when none. */
export const rangesToRows = (ranges, fallback) =>
  ranges?.length
    ? ranges.map((range) => ({ to: range.to_km == null ? '' : String(range.to_km), fee: String(range.fee_rwf) }))
    : fallback;

/** Rows → ranges with numbers (to = null on the last, open-ended range). */
export const rowsToRanges = (rows) =>
  (rows || []).map((row, index) => {
    const from = index === 0 ? 0 : Number(rows[index - 1].to) || 0;
    return { from, to: index === rows.length - 1 ? null : row.to === '' ? NaN : Number(row.to), fee: Number(row.fee) };
  });

/** What the API saves. */
export const rangesToPayload = (ranges) => ranges.map((range) => ({ from_km: range.from, to_km: range.to, fee_rwf: range.fee }));

export function rangeProblems(ranges, minFee) {
  const problems = [];
  ranges.forEach((range, index) => {
    const label = `Range ${index + 1}`;
    if (range.to !== null && !(range.to > range.from)) problems.push(`${label}: the end must be more than ${range.from} km.`);
    if (!Number.isInteger(range.fee) || range.fee < minFee) problems.push(`${label}: the fee must be at least ${minFee} RWF.`);
  });
  return problems;
}

/** The old open range gets an end (`step` km on); a new open range follows it. */
export function addRangeRow(rows, step = 3) {
  const last = rows[rows.length - 1];
  const lastFrom = rows.length > 1 ? Number(rows[rows.length - 2].to) || 0 : 0;
  return [...rows.slice(0, -1), { ...last, to: String(lastFrom + step) }, { to: '', fee: last.fee }];
}

export function removeRangeRow(rows, index) {
  const next = rows.filter((_, i) => i !== index);
  if (next.length) next[next.length - 1] = { ...next[next.length - 1], to: '' };
  return next;
}

export const kmInput = (value) => value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 5);
export const feeInput = (value, digits = 6) => value.replace(/\D/g, '').slice(0, digits);

/** "0 km up to 3 km" / "6 km and more". */
export const rangeLabel = (from, to) => (to === null || to === undefined ? `${from} km and more` : `${from} km up to ${to} km`);

/**
 * Dual-currency money formatting. Prices are stored per record in a single
 * `currency` (usually USD); across the app we display every amount in EGP
 * (primary) with the USD equivalent (secondary), converted through a single
 * editable exchange rate.
 */

/** Egyptian pounds per 1 US dollar. Edit this to update every displayed rate. */
export const EGP_PER_USD = 48.5;

/**
 * Value of 1 unit of each supported input currency expressed in USD. Amounts are
 * first normalised to USD via this table, then to EGP via EGP_PER_USD. Unknown
 * currencies are treated as already-USD (rate 1).
 */
const TO_USD: Record<string, number> = {
  USD: 1,
  EGP: 1 / EGP_PER_USD,
  EUR: 1.08,
  AED: 0.2723,
  SAR: 0.2667,
};

const toUsd = (amount: number, currency: string) =>
  amount * (TO_USD[currency] ?? 1);

export const toUSD = (amount: number, currency = "USD") =>
  toUsd(amount, currency);

export const toEGP = (amount: number, currency = "USD") =>
  toUsd(amount, currency) * EGP_PER_USD;

const fmtEGP = (n: number) =>
  `EGP ${Math.round(n).toLocaleString("en-US")}`;

const fmtUSD = (n: number) =>
  `USD ${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** "EGP 12,000 (USD 250.00)" — EGP primary, USD equivalent in parentheses. */
export function formatDual(currency: string, amount: number): string {
  const usd = toUsd(amount, currency);
  return `${fmtEGP(usd * EGP_PER_USD)} (${fmtUSD(usd)})`;
}

/** The two parts separately, for callers that want to style them differently. */
export function dualParts(currency: string, amount: number) {
  const usd = toUsd(amount, currency);
  return { egp: fmtEGP(usd * EGP_PER_USD), usd: fmtUSD(usd) };
}

// Live BCV rate. Mocked for now — when API is wired, replace this with a fetched value.
export const BCV_RATE = 36.72;

export function usdToVes(usd: number, rate: number = BCV_RATE): number {
  return usd * rate;
}

export function vesToUsd(ves: number, rate: number = BCV_RATE): number {
  return ves / rate;
}

export function formatVes(amount: number): string {
  return `Bs. ${amount.toLocaleString('es-VE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

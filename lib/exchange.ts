import { useState, useEffect } from 'react';

// Fallback rate used when the live fetch fails or is loading.
// Updated to reflect the actual BCV rate as of 2026.
export const BCV_RATE = 90.0;

/** Fetches the official BCV (Banco Central de Venezuela) USD→VES rate.
 *  Returns the static BCV_RATE fallback on any error (network, parse, timeout). */
export async function fetchBcvRate(): Promise<number> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    let res: Response;
    try {
      res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
    if (!res.ok) return BCV_RATE;
    const data = (await res.json()) as { promedio?: number; venta?: number };
    const rate = data.promedio ?? data.venta;
    if (typeof rate !== 'number' || rate <= 0) return BCV_RATE;
    return parseFloat(rate.toString());
  } catch {
    return BCV_RATE;
  }
}

/** Hook that starts with the static fallback and upgrades to the live rate on mount.
 *  @returns `{ rate, isLive }` — isLive is false while using the static fallback. */
export function useBcvRate(): { rate: number; isLive: boolean } {
  const [rate, setRate] = useState<number>(BCV_RATE);
  const [isLive, setIsLive] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    fetchBcvRate().then((liveRate) => {
      if (!cancelled && liveRate !== BCV_RATE) {
        setRate(liveRate);
        setIsLive(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { rate, isLive };
}

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

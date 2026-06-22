import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const BCV_RATE = 90.0;

async function fetchLastStoredRate(): Promise<number | null> {
  try {
    const { data } = await supabase
      .from('exchange_rate')
      .select('rate')
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();
    const r = (data as { rate?: number } | null)?.rate;
    return typeof r === 'number' && r > 0 ? r : null;
  } catch {
    return null;
  }
}

async function storeRate(rate: number): Promise<void> {
  try {
    await supabase.from('exchange_rate').insert({ rate, source: 'bcv' });
  } catch {
    // non-critical
  }
}

/** Fetches the live BCV rate. On failure falls back to last DB record, then to BCV_RATE. */
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
    if (!res.ok) throw new Error('non-ok');
    const data = (await res.json()) as { promedio?: number; venta?: number };
    const rate = data.promedio ?? data.venta;
    if (typeof rate !== 'number' || rate <= 0) throw new Error('invalid');
    const parsed = parseFloat(rate.toString());
    void storeRate(parsed);
    return parsed;
  } catch {
    const stored = await fetchLastStoredRate();
    return stored ?? BCV_RATE;
  }
}

/** Hook that starts with static fallback and upgrades to live (or last stored) rate on mount. */
export function useBcvRate(): { rate: number; isLive: boolean } {
  const [rate, setRate] = useState<number>(BCV_RATE);
  const [isLive, setIsLive] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    fetchBcvRate().then((resolved) => {
      if (!cancelled && resolved !== BCV_RATE) {
        setRate(resolved);
        setIsLive(true);
      }
    });
    return () => { cancelled = true; };
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

import type { RawTrade } from "./types";

export const MONTH_ORDER: Record<string, number> = {
    January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
    July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
};

export const MONTH_SHORT: Record<string, string> = {
    January: "Jan", February: "Feb", March: "Mar", April: "Apr",
    May: "May", June: "Jun", July: "Jul", August: "Aug",
    September: "Sep", October: "Oct", November: "Nov", December: "Dec",
};

export const CHART_COLORS = [
    "#38bdf8", "#34d399", "#f472b6", "#fb923c",
    "#a78bfa", "#facc15", "#4ade80", "#f87171", "#60a5fa", "#e879f9",
];

/** Format a number as INR currency (no decimals) */
export function fmt(n: number): string {
    return new Intl.NumberFormat("en-IN", {
        style: "currency", currency: "INR", maximumFractionDigits: 0,
    }).format(n);
}

/** Format a ratio as a percentage string */
export function pct(n: number): string {
    return n.toFixed(1) + "%";
}

/** Parse "26 Feb 2026" → Date */
export function parseDate(d: string): Date {
    const [day, monStr, year] = d.split(" ");
    const mon = MONTH_ORDER[monStr] ?? 1;
    return new Date(+year, mon - 1, +day);
}

/** Classify a trade time string into a trading session bucket */
export function timeBucket(t: string | null): string {
    if (!t) return "Unknown";
    const [hm, ampm] = t.split(" ");
    const [h] = hm.split(":").map(Number);
    const hour = ampm === "PM" && h !== 12 ? h + 12 : ampm === "AM" && h === 12 ? 0 : h;
    if (hour < 10) return "Morning (9-10am)";
    if (hour < 12) return "Mid-Morning (10-12pm)";
    if (hour < 14) return "Afternoon (12-2pm)";
    if (hour < 16) return "Late Afternoon (2-4pm)";
    return "EOD (4pm+)";
}

/** Return true if the expiry_date string looks like a weekly expiry */
export function isWeeklyExpiry(expiry: string | null): boolean {
    return !!expiry && /\d+(st|nd|rd|th)\s+W/i.test(expiry);
}

/** Classify strike relative to spot into OTM/ITM/ATM */
export function classifyMoneyness(trade: RawTrade): "OTM" | "ITM" | "ATM" | "UNKNOWN" {
    if (!trade.spot_price || !trade.strike_price) return "UNKNOWN";
    const diff = Math.abs(trade.spot_price - trade.strike_price) / trade.spot_price;
    if (diff < 0.01) return "ATM";
    if (
        (trade.instrument_type === "CE" && trade.strike_price > trade.spot_price) ||
        (trade.instrument_type === "PE" && trade.strike_price < trade.spot_price)
    ) return "OTM";
    return "ITM";
}

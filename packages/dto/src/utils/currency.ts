import { CURRENCY_MAP, ZERO_DECIMAL_CURRENCIES } from "../constants/currency";

export function getCurrencySymbol(code?: string | null): string {
    if (!code) return "₹";
    return CURRENCY_MAP[code.toUpperCase()]?.symbol || code;
}

export function formatPrice(
    amount: string | number,
    currencyCode?: string | null
): string {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    const code = (currencyCode || "INR").toUpperCase();
    const decimals = ZERO_DECIMAL_CURRENCIES.has(code) ? 0 : 2;
    return `${getCurrencySymbol(currencyCode)}${num.toFixed(decimals)}`;
}

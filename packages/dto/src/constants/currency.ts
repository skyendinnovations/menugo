export const CURRENCY_MAP: Record<string, { symbol: string; name: string }> = {
    INR: { symbol: "₹", name: "Indian Rupee" },
    USD: { symbol: "$", name: "US Dollar" },
    AUD: { symbol: "A$", name: "Australian Dollar" },
    EUR: { symbol: "€", name: "Euro" },
    GBP: { symbol: "£", name: "British Pound" },
    CAD: { symbol: "C$", name: "Canadian Dollar" },
    SGD: { symbol: "S$", name: "Singapore Dollar" },
    AED: { symbol: "د.إ", name: "UAE Dirham" },
    JPY: { symbol: "¥", name: "Japanese Yen" },
    CNY: { symbol: "¥", name: "Chinese Yuan" },
    MYR: { symbol: "RM", name: "Malaysian Ringgit" },
    THB: { symbol: "฿", name: "Thai Baht" },
    KRW: { symbol: "₩", name: "South Korean Won" },
    BRL: { symbol: "R$", name: "Brazilian Real" },
    ZAR: { symbol: "R", name: "South African Rand" },
    NZD: { symbol: "NZ$", name: "New Zealand Dollar" },
    CHF: { symbol: "CHF", name: "Swiss Franc" },
    SEK: { symbol: "kr", name: "Swedish Krona" },
    SAR: { symbol: "ر.س", name: "Saudi Riyal" },
    QAR: { symbol: "ر.ق", name: "Qatari Riyal" },
    LKR: { symbol: "Rs", name: "Sri Lankan Rupee" },
    PKR: { symbol: "Rs", name: "Pakistani Rupee" },
    BDT: { symbol: "৳", name: "Bangladeshi Taka" },
    NGN: { symbol: "₦", name: "Nigerian Naira" },
    PHP: { symbol: "₱", name: "Philippine Peso" },
    IDR: { symbol: "Rp", name: "Indonesian Rupiah" },
    VND: { symbol: "₫", name: "Vietnamese Dong" },
    TWD: { symbol: "NT$", name: "New Taiwan Dollar" },
    HKD: { symbol: "HK$", name: "Hong Kong Dollar" },
    MXN: { symbol: "MX$", name: "Mexican Peso" },
};

export const ZERO_DECIMAL_CURRENCIES = new Set(["JPY", "KRW", "VND", "IDR"]);

export const SUPPORTED_CURRENCIES = Object.entries(CURRENCY_MAP).map(
    ([code, { symbol, name }]) => ({
        label: `${symbol}  ${name} (${code})`,
        value: code,
    })
);

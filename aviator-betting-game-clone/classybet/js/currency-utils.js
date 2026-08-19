/**
 * Currency Utility Module
 * Provides dynamic currency formatting, symbol mapping, and deposit limits for multi-currency support.
 */

const CURRENCY_SYMBOLS = {
    // Primary / Native African
    KES: 'KSh',
    NGN: '₦',
    GHS: 'GH₵',
    ZAR: 'R',
    USD: '$',
    GBP: '£',
    EUR: '€',
    TZS: 'TSh',
    UGX: 'USh',
    RWF: 'RF',
    ZMW: 'ZK',
    XOF: 'CFA',
    XAF: 'FCFA',
    EGP: 'E£',
    MAD: 'DH',
    ETB: 'Br',
    MWK: 'MK',
    GNF: 'FG',
    SLL: 'Le',
    DZD: 'DA',
    TND: 'DT',
    LYD: 'LD',
    BWP: 'P',
    NAD: 'N$',
    MZN: 'MT',
    AOA: 'Kz',
    MUR: '₨',

    // Europe
    CHF: 'CHF',
    SEK: 'kr',
    NOK: 'kr',
    DKK: 'kr',
    PLN: 'zł',
    HUF: 'Ft',
    CZK: 'Kč',
    RON: 'lei',
    BGN: 'лв',
    RSD: 'дин.',
    TRY: '₺',
    RUB: '₽',
    UAH: '₴',

    // Asia & Pacific
    INR: '₹',
    PKR: '₨',
    BDT: '৳',
    LKR: '₨',
    NPR: '₨',
    PHP: '₱',
    THB: '฿',
    IDR: 'Rp',
    MYR: 'RM',
    SGD: 'S$',
    CNY: '¥',
    JPY: '¥',
    KRW: '₩',
    VND: '₫',
    AUD: 'A$',
    NZD: 'NZ$',

    // Middle East
    AED: 'د.إ',
    SAR: 'SR',
    QAR: 'QR',
    KWD: 'KD',
    BHD: 'BD',
    OMR: 'RO',
    JOD: 'JD',
    LBP: 'L£',
    ILS: '₪',
    IQD: 'IQD',

    // Americas
    CAD: 'C$',
    BRL: 'R$',
    MXN: '$',
    COP: '$',
    ARS: '$',
    CLP: '$',
    PEN: 'S/.'
};

// Deposit limits for each currency
const DEPOSIT_LIMITS = {
    KES: { min: 349, max: 150000 },
    NGN: { min: 6500, max: 2800000 },
    GHS: { min: 60, max: 25000 },
    ZAR: { min: 60, max: 25000 },
    USD: { min: 3, max: 1200 },
    GBP: { min: 2.5, max: 1000 },
    EUR: { min: 3, max: 1100 },
    TZS: { min: 8000, max: 3200000 },
    UGX: { min: 12000, max: 4500000 },
    RWF: { min: 4000, max: 1600000 },
    ZMW: { min: 80, max: 32000 },
    XOF: { min: 2000, max: 750000 },
    XAF: { min: 2000, max: 750000 },
    EGP: { min: 150, max: 60000 },
    MAD: { min: 30, max: 12000 },
    ETB: { min: 400, max: 150000 },
    INR: { min: 250, max: 100000 },
    PKR: { min: 850, max: 350000 },
    BDT: { min: 350, max: 140000 },
    LKR: { min: 900, max: 360000 },
    PHP: { min: 175, max: 70000 },
    THB: { min: 110, max: 45000 },
    IDR: { min: 50000, max: 20000000 },
    MYR: { min: 15, max: 6000 },
    SGD: { min: 4, max: 1600 },
    CNY: { min: 22, max: 9000 },
    JPY: { min: 500, max: 200000 },
    KRW: { min: 4000, max: 1600000 },
    VND: { min: 75000, max: 30000000 },
    AUD: { min: 5, max: 2000 },
    NZD: { min: 5, max: 2000 },
    CAD: { min: 4, max: 1700 },
    CHF: { min: 3, max: 1100 },
    SEK: { min: 35, max: 13000 },
    NOK: { min: 35, max: 13000 },
    DKK: { min: 25, max: 8500 },
    PLN: { min: 12, max: 5000 },
    TRY: { min: 100, max: 40000 },
    AED: { min: 12, max: 4500 },
    SAR: { min: 12, max: 4500 },
    QAR: { min: 12, max: 4500 },
    KWD: { min: 1, max: 400 },
    BHD: { min: 1.5, max: 500 },
    OMR: { min: 1.5, max: 500 },
    JOD: { min: 2.5, max: 900 },
    ILS: { min: 12, max: 4500 },
    BRL: { min: 16, max: 6500 },
    MXN: { min: 55, max: 22000 }
};

/**
 * Get currency symbol for a given currency code
 * @param {string} currencyCode - Currency code (e.g., 'KES', 'USD', 'EUR')
 * @returns {string} Currency symbol
 */
function getCurrencySymbol(currencyCode) {
    if (!currencyCode) return '$';
    return CURRENCY_SYMBOLS[currencyCode.toUpperCase()] || currencyCode;
}

/**
 * Get user's currency from localStorage or window.jetbetAPI
 * @returns {string} User's currency code (e.g. 'KES', 'USD', 'EUR')
 */
function getUserCurrency() {
    try {
        if (window.jetbetAPI && window.jetbetAPI.user && window.jetbetAPI.user.currency) {
            return window.jetbetAPI.user.currency;
        }
        const userData = localStorage.getItem('userData');
        if (userData) {
            const user = JSON.parse(userData);
            if (user.currency) return user.currency;
        }
    } catch (error) {
        console.warn('Error reading user currency:', error);
    }
    return 'USD'; // Safe default
}

/**
 * Format amount with appropriate currency symbol
 * @param {number} amount - Amount to format
 * @param {string} currency - Optional currency code
 * @returns {string} Formatted currency string (e.g. "KSh 350.00", "$ 10.00", "€ 5.00")
 */
function formatCurrency(amount, currency = null) {
    const currencyCode = (currency || getUserCurrency()).toUpperCase();
    const symbol = getCurrencySymbol(currencyCode);
    const numAmount = parseFloat(amount) || 0;

    const formattedAmount = numAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    return `${symbol} ${formattedAmount}`;
}

/**
 * Get deposit limits for a given currency
 * @param {string} currency - Currency code
 * @returns {object} Object with min and max deposit amounts
 */
function getDepositLimits(currency = null) {
    const currencyCode = (currency || getUserCurrency()).toUpperCase();
    return DEPOSIT_LIMITS[currencyCode] || DEPOSIT_LIMITS.USD;
}

/**
 * Format deposit limits with currency symbol
 * @param {string} currency - Currency code
 * @returns {object} Object with formatted min, max strings and numeric values
 */
function formatDepositLimits(currency = null) {
    const currencyCode = (currency || getUserCurrency()).toUpperCase();
    const limits = getDepositLimits(currencyCode);
    return {
        min: formatCurrency(limits.min, currencyCode),
        max: formatCurrency(limits.max, currencyCode),
        minValue: limits.min,
        maxValue: limits.max
    };
}

/**
 * Format amount for display in balance elements
 * @param {number} amount - Amount to format
 * @returns {string} Formatted balance string
 */
function formatBalance(amount) {
    return formatCurrency(amount);
}

// Make functions available globally
if (typeof window !== 'undefined') {
    window.getCurrencySymbol = getCurrencySymbol;
    window.getUserCurrency = getUserCurrency;
    window.formatCurrency = formatCurrency;
    window.formatBalance = formatBalance;
    window.getDepositLimits = getDepositLimits;
    window.formatDepositLimits = formatDepositLimits;
    window.CURRENCY_SYMBOLS = CURRENCY_SYMBOLS;
    window.DEPOSIT_LIMITS = DEPOSIT_LIMITS;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getCurrencySymbol,
        getUserCurrency,
        formatCurrency,
        formatBalance,
        getDepositLimits,
        formatDepositLimits,
        CURRENCY_SYMBOLS,
        DEPOSIT_LIMITS
    };
}

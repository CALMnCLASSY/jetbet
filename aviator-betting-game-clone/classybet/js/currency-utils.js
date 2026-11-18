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
    CDF: 'FC',
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
    LSL: 'L',
    MZN: 'MT',
    AOA: 'Kz',
    MUR: 'Rs',
    SCR: 'SR',
    MGA: 'Ar',

    // Europe & Central Asia
    CHF: 'CHF',
    SEK: 'kr',
    NOK: 'kr',
    DKK: 'kr',
    ISK: 'kr',
    PLN: 'zł',
    HUF: 'Ft',
    CZK: 'Kč',
    RON: 'lei',
    BGN: 'лв',
    RSD: 'дин.',
    TRY: '₺',
    RUB: '₽',
    UZS: "so'm",
    KZT: '₸',
    AZN: '₼',
    GEL: '₾',
    AMD: '֏',
    UAH: '₴',

    // Asia & Pacific
    INR: '₹',
    PKR: '₨',
    BDT: '৳',
    LKR: '₨',
    NPR: 'Rs',
    PHP: '₱',
    THB: '฿',
    IDR: 'Rp',
    MYR: 'RM',
    SGD: 'S$',
    CNY: '¥',
    JPY: '¥',
    KRW: '₩',
    VND: '₫',
    KHR: '៛',
    MMK: 'K',
    MNT: '₮',
    AUD: 'A$',
    NZD: 'NZ$',
    FJD: 'FJ$',
    PGK: 'K',

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
    IRR: '﷼',

    // Americas & Caribbean
    CAD: 'C$',
    BRL: 'R$',
    MXN: '$',
    COP: '$',
    ARS: '$',
    CLP: '$',
    PEN: 'S/',
    HTG: 'G',
    JMD: 'J$',
    TTD: 'TT$',
    DOP: 'RD$',
    CRC: '₡',
    UYU: '$U',
    PYG: '₲',
    BOB: 'Bs'
};

// Deposit limits for each currency
const DEPOSIT_LIMITS = {
    // Africa
    KES: { min: 1300, max: 150000 },
    NGN: { min: 16100, max: 2800000 },
    GHS: { min: 155, max: 25000 },
    ZAR: { min: 185, max: 25000 },
    TZS: { min: 27000, max: 3200000 },
    UGX: { min: 37500, max: 4500000 },
    RWF: { min: 14000, max: 1600000 },
    ZMW: { min: 270, max: 32000 },
    XOF: { min: 6050, max: 750000 },
    XAF: { min: 6050, max: 750000 },
    CDF: { min: 28000, max: 3400000 },
    EGP: { min: 480, max: 60000 },
    MAD: { min: 100, max: 12000 },
    ETB: { min: 1300, max: 150000 },
    MWK: { min: 17500, max: 2000000 },
    GNF: { min: 86000, max: 10000000 },
    SLL: { min: 225000, max: 25000000 },
    DZD: { min: 1350, max: 160000 },
    TND: { min: 31, max: 3700 },
    LYD: { min: 49, max: 5800 },
    BWP: { min: 135, max: 16000 },
    NAD: { min: 185, max: 25000 },
    LSL: { min: 185, max: 22000 },
    MZN: { min: 640, max: 75000 },
    AOA: { min: 9000, max: 1000000 },
    MUR: { min: 465, max: 55000 },
    SCR: { min: 142, max: 17000 },
    MGA: { min: 46000, max: 5500000 },

    // Primary
    USD: { min: 10, max: 1200 },
    GBP: { min: 8, max: 1000 },
    EUR: { min: 9, max: 1100 },

    // Europe & Central Asia
    CHF: { min: 9, max: 1100 },
    SEK: { min: 105, max: 13000 },
    NOK: { min: 106, max: 13000 },
    DKK: { min: 69, max: 8500 },
    ISK: { min: 1380, max: 165000 },
    PLN: { min: 40, max: 5000 },
    HUF: { min: 3650, max: 440000 },
    CZK: { min: 232, max: 28000 },
    RON: { min: 46, max: 5500 },
    BGN: { min: 18, max: 2200 },
    RSD: { min: 1080, max: 130000 },
    TRY: { min: 330, max: 40000 },
    RUB: { min: 925, max: 110000 },
    UZS: { min: 128000, max: 15000000 },
    KZT: { min: 4950, max: 600000 },
    AZN: { min: 17, max: 2000 },
    GEL: { min: 28, max: 3300 },
    AMD: { min: 3880, max: 465000 },
    UAH: { min: 410, max: 50000 },

    // Asia & Pacific
    INR: { min: 835, max: 100000 },
    PKR: { min: 2780, max: 350000 },
    BDT: { min: 1180, max: 140000 },
    LKR: { min: 3000, max: 360000 },
    NPR: { min: 1340, max: 160000 },
    PHP: { min: 580, max: 70000 },
    THB: { min: 365, max: 45000 },
    IDR: { min: 162000, max: 20000000 },
    MYR: { min: 47, max: 6000 },
    SGD: { min: 14, max: 1600 },
    CNY: { min: 73, max: 9000 },
    JPY: { min: 1560, max: 200000 },
    KRW: { min: 13800, max: 1600000 },
    VND: { min: 254000, max: 30000000 },
    KHR: { min: 41000, max: 4800000 },
    MMK: { min: 21000, max: 2500000 },
    MNT: { min: 34500, max: 4000000 },
    AUD: { min: 15, max: 2000 },
    NZD: { min: 16, max: 2000 },
    FJD: { min: 23, max: 2700 },
    PGK: { min: 40, max: 4700 },

    // Middle East
    AED: { min: 37, max: 4500 },
    SAR: { min: 38, max: 4500 },
    QAR: { min: 36, max: 4500 },
    KWD: { min: 3, max: 400 },
    BHD: { min: 4, max: 500 },
    OMR: { min: 4, max: 500 },
    JOD: { min: 7, max: 900 },
    LBP: { min: 895000, max: 100000000 },
    ILS: { min: 37, max: 4500 },
    IQD: { min: 13100, max: 1500000 },
    IRR: { min: 420000, max: 50000000 },

    // Americas & Caribbean
    CAD: { min: 14, max: 1700 },
    BRL: { min: 54, max: 6500 },
    MXN: { min: 182, max: 22000 },
    COP: { min: 41000, max: 5000000 },
    ARS: { min: 9200, max: 1100000 },
    CLP: { min: 9300, max: 1100000 },
    PEN: { min: 38, max: 4500 },
    HTG: { min: 1320, max: 160000 },
    JMD: { min: 1580, max: 190000 },
    TTD: { min: 68, max: 8000 },
    DOP: { min: 600, max: 72000 },
    CRC: { min: 5150, max: 600000 },
    UYU: { min: 420, max: 50000 },
    PYG: { min: 78000, max: 9300000 },
    BOB: { min: 69, max: 8300 }
};

/**
 * Get currency symbol for a given currency code
 * @param {string} currencyCode - Currency code (e.g., 'KES', 'USD', 'EUR', 'RUB', 'UZS')
 * @returns {string} Currency symbol
 */
function getCurrencySymbol(currencyCode) {
    if (!currencyCode) return '$';
    return CURRENCY_SYMBOLS[currencyCode.toUpperCase()] || currencyCode;
}

/**
 * Get user's currency from localStorage or window.jetbetAPI
 * @returns {string} User's currency code (e.g. 'KES', 'USD', 'EUR', 'RUB', 'UZS')
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
    return 'USD';
}

/**
 * Format amount with appropriate currency symbol
 * @param {number} amount - Amount to format
 * @param {string} currency - Optional currency code
 * @returns {string} Formatted currency string (e.g. "KSh 350.00", "$ 10.00", "₽ 500.00")
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

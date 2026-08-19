/**
 * Currency Configuration Utility
 * Maps country codes to currencies and provides currency-specific settings
 */

const ExchangeRateService = require('../services/ExchangeRateService');

// Currencies natively supported by Flutterwave
const FLUTTERWAVE_CURRENCIES = [
    'NGN', // Nigerian Naira
    'GHS', // Ghanaian Cedi
    'KES', // Kenyan Shilling
    'ZAR', // South African Rand
    'USD', // US Dollar
    'GBP', // British Pound
    'EUR', // Euro
    'TZS', // Tanzanian Shilling
    'UGX', // Ugandan Shilling
    'RWF', // Rwandan Franc
    'ZMW', // Zambian Kwacha
    'XOF', // West African CFA Franc
    'XAF', // Central African CFA Franc
    'EGP', // Egyptian Pound
    'MAD', // Moroccan Dirham
    'ETB', // Ethiopian Birr
    'MWK', // Malawian Kwacha
    'GNF', // Guinean Franc
    'SLL', // Sierra Leonean Leone
];

// Currency symbols
const CURRENCY_SYMBOLS = {
    // Native Africa & Primary
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

// Currency names
const CURRENCY_NAMES = {
    KES: 'Kenyan Shilling',
    NGN: 'Nigerian Naira',
    GHS: 'Ghanaian Cedi',
    ZAR: 'South African Rand',
    USD: 'US Dollar',
    GBP: 'British Pound',
    EUR: 'Euro',
    TZS: 'Tanzanian Shilling',
    UGX: 'Ugandan Shilling',
    RWF: 'Rwandan Franc',
    ZMW: 'Zambian Kwacha',
    XOF: 'West African CFA Franc',
    XAF: 'Central African CFA Franc',
    EGP: 'Egyptian Pound',
    MAD: 'Moroccan Dirham',
    ETB: 'Ethiopian Birr',
    MWK: 'Malawian Kwacha',
    GNF: 'Guinean Franc',
    SLL: 'Sierra Leonean Leone',
    INR: 'Indian Rupee',
    PKR: 'Pakistani Rupee',
    BDT: 'Bangladeshi Taka',
    LKR: 'Sri Lankan Rupee',
    PHP: 'Philippine Peso',
    THB: 'Thai Baht',
    IDR: 'Indonesian Rupiah',
    MYR: 'Malaysian Ringgit',
    SGD: 'Singapore Dollar',
    CNY: 'Chinese Yuan',
    JPY: 'Japanese Yen',
    KRW: 'South Korean Won',
    VND: 'Vietnamese Dong',
    AUD: 'Australian Dollar',
    NZD: 'New Zealand Dollar',
    CAD: 'Canadian Dollar',
    CHF: 'Swiss Franc',
    SEK: 'Swedish Krona',
    NOK: 'Norwegian Krone',
    DKK: 'Danish Krone',
    PLN: 'Polish Zloty',
    HUF: 'Hungarian Forint',
    CZK: 'Czech Koruna',
    RON: 'Romanian Leu',
    TRY: 'Turkish Lira',
    AED: 'UAE Dirham',
    SAR: 'Saudi Riyal',
    QAR: 'Qatari Riyal',
    KWD: 'Kuwaiti Dinar',
    BHD: 'Bahraini Dinar',
    OMR: 'Omani Rial',
    JOD: 'Jordanian Dinar',
    ILS: 'Israeli Shekel',
    BRL: 'Brazilian Real',
    MXN: 'Mexican Peso'
};

// Map country codes to native currencies and country names
const COUNTRY_CURRENCY_MAP = {
    // East Africa
    '+254': { currency: 'KES', country: 'Kenya' },
    '+255': { currency: 'TZS', country: 'Tanzania' },
    '+256': { currency: 'UGX', country: 'Uganda' },
    '+250': { currency: 'RWF', country: 'Rwanda' },
    '+257': { currency: 'USD', country: 'Burundi' },
    '+251': { currency: 'ETB', country: 'Ethiopia' },
    '+252': { currency: 'USD', country: 'Somalia' },
    '+253': { currency: 'USD', country: 'Djibouti' },

    // West Africa
    '+234': { currency: 'NGN', country: 'Nigeria' },
    '+233': { currency: 'GHS', country: 'Ghana' },
    '+221': { currency: 'XOF', country: 'Senegal' },
    '+223': { currency: 'XOF', country: 'Mali' },
    '+225': { currency: 'XOF', country: 'Ivory Coast' },
    '+226': { currency: 'XOF', country: 'Burkina Faso' },
    '+227': { currency: 'XOF', country: 'Niger' },
    '+228': { currency: 'XOF', country: 'Togo' },
    '+229': { currency: 'XOF', country: 'Benin' },
    '+220': { currency: 'USD', country: 'Gambia' },
    '+224': { currency: 'GNF', country: 'Guinea' },
    '+245': { currency: 'XOF', country: 'Guinea-Bissau' },
    '+232': { currency: 'SLL', country: 'Sierra Leone' },
    '+231': { currency: 'USD', country: 'Liberia' },

    // Southern Africa
    '+27': { currency: 'ZAR', country: 'South Africa' },
    '+260': { currency: 'ZMW', country: 'Zambia' },
    '+263': { currency: 'USD', country: 'Zimbabwe' },
    '+267': { currency: 'BWP', country: 'Botswana' },
    '+265': { currency: 'MWK', country: 'Malawi' },
    '+258': { currency: 'MZN', country: 'Mozambique' },
    '+264': { currency: 'NAD', country: 'Namibia' },
    '+266': { currency: 'ZAR', country: 'Lesotho' },
    '+268': { currency: 'ZAR', country: 'Eswatini' },

    // North Africa
    '+20': { currency: 'EGP', country: 'Egypt' },
    '+212': { currency: 'MAD', country: 'Morocco' },
    '+213': { currency: 'DZD', country: 'Algeria' },
    '+216': { currency: 'TND', country: 'Tunisia' },
    '+218': { currency: 'LYD', country: 'Libya' },

    // Central Africa
    '+237': { currency: 'XAF', country: 'Cameroon' },
    '+241': { currency: 'XAF', country: 'Gabon' },
    '+242': { currency: 'XAF', country: 'Republic of the Congo' },
    '+243': { currency: 'USD', country: 'Democratic Republic of Congo' },
    '+236': { currency: 'XAF', country: 'Central African Republic' },
    '+235': { currency: 'XAF', country: 'Chad' },
    '+240': { currency: 'XAF', country: 'Equatorial Guinea' },
    '+244': { currency: 'AOA', country: 'Angola' },

    // Europe
    '+44': { currency: 'GBP', country: 'United Kingdom' },
    '+33': { currency: 'EUR', country: 'France' },
    '+49': { currency: 'EUR', country: 'Germany' },
    '+39': { currency: 'EUR', country: 'Italy' },
    '+34': { currency: 'EUR', country: 'Spain' },
    '+31': { currency: 'EUR', country: 'Netherlands' },
    '+32': { currency: 'EUR', country: 'Belgium' },
    '+41': { currency: 'CHF', country: 'Switzerland' },
    '+43': { currency: 'EUR', country: 'Austria' },
    '+351': { currency: 'EUR', country: 'Portugal' },
    '+30': { currency: 'EUR', country: 'Greece' },
    '+353': { currency: 'EUR', country: 'Ireland' },
    '+358': { currency: 'EUR', country: 'Finland' },
    '+46': { currency: 'SEK', country: 'Sweden' },
    '+47': { currency: 'NOK', country: 'Norway' },
    '+45': { currency: 'DKK', country: 'Denmark' },
    '+48': { currency: 'PLN', country: 'Poland' },
    '+420': { currency: 'CZK', country: 'Czech Republic' },
    '+36': { currency: 'HUF', country: 'Hungary' },
    '+40': { currency: 'RON', country: 'Romania' },
    '+359': { currency: 'BGN', country: 'Bulgaria' },
    '+381': { currency: 'RSD', country: 'Serbia' },
    '+385': { currency: 'EUR', country: 'Croatia' },
    '+386': { currency: 'EUR', country: 'Slovenia' },
    '+421': { currency: 'EUR', country: 'Slovakia' },
    '+370': { currency: 'EUR', country: 'Lithuania' },
    '+371': { currency: 'EUR', country: 'Latvia' },
    '+372': { currency: 'EUR', country: 'Estonia' },
    '+357': { currency: 'EUR', country: 'Cyprus' },
    '+356': { currency: 'EUR', country: 'Malta' },
    '+352': { currency: 'EUR', country: 'Luxembourg' },
    '+354': { currency: 'EUR', country: 'Iceland' },
    '+90': { currency: 'TRY', country: 'Turkey' },
    '+380': { currency: 'UAH', country: 'Ukraine' },

    // Americas
    '+1': { currency: 'USD', country: 'United States' },
    '+1-ca': { currency: 'CAD', country: 'Canada' },
    '+55': { currency: 'BRL', country: 'Brazil' },
    '+52': { currency: 'MXN', country: 'Mexico' },
    '+57': { currency: 'COP', country: 'Colombia' },
    '+54': { currency: 'ARS', country: 'Argentina' },
    '+56': { currency: 'CLP', country: 'Chile' },
    '+51': { currency: 'PEN', country: 'Peru' },

    // Asia & Pacific
    '+91': { currency: 'INR', country: 'India' },
    '+86': { currency: 'CNY', country: 'China' },
    '+81': { currency: 'JPY', country: 'Japan' },
    '+82': { currency: 'KRW', country: 'South Korea' },
    '+65': { currency: 'SGD', country: 'Singapore' },
    '+60': { currency: 'MYR', country: 'Malaysia' },
    '+66': { currency: 'THB', country: 'Thailand' },
    '+63': { currency: 'PHP', country: 'Philippines' },
    '+62': { currency: 'IDR', country: 'Indonesia' },
    '+84': { currency: 'VND', country: 'Vietnam' },
    '+92': { currency: 'PKR', country: 'Pakistan' },
    '+880': { currency: 'BDT', country: 'Bangladesh' },
    '+94': { currency: 'LKR', country: 'Sri Lanka' },
    '+977': { currency: 'NPR', country: 'Nepal' },
    '+61': { currency: 'AUD', country: 'Australia' },
    '+64': { currency: 'NZD', country: 'New Zealand' },
    '+855': { currency: 'USD', country: 'Cambodia' },
    '+856': { currency: 'USD', country: 'Laos' },
    '+673': { currency: 'BND', country: 'Brunei' },

    // Middle East
    '+971': { currency: 'AED', country: 'UAE' },
    '+966': { currency: 'SAR', country: 'Saudi Arabia' },
    '+974': { currency: 'QAR', country: 'Qatar' },
    '+965': { currency: 'KWD', country: 'Kuwait' },
    '+973': { currency: 'BHD', country: 'Bahrain' },
    '+968': { currency: 'OMR', country: 'Oman' },
    '+962': { currency: 'JOD', country: 'Jordan' },
    '+961': { currency: 'USD', country: 'Lebanon' },
    '+972': { currency: 'ILS', country: 'Israel' },
    '+964': { currency: 'USD', country: 'Iraq' },
    '+967': { currency: 'USD', country: 'Yemen' }
};

// Minimum deposit amounts per currency (in main unit)
const MIN_DEPOSIT = {
    KES: 349,
    NGN: 6500,
    GHS: 60,
    ZAR: 60,
    USD: 3,
    GBP: 2.5,
    EUR: 3,
    TZS: 8000,
    UGX: 12000,
    RWF: 4000,
    ZMW: 80,
    XOF: 2000,
    XAF: 2000,
    EGP: 150,
    MAD: 30,
    ETB: 400,
    INR: 250,
    PKR: 850,
    BDT: 350,
    LKR: 900,
    PHP: 175,
    THB: 110,
    IDR: 50000,
    MYR: 15,
    SGD: 4,
    CNY: 22,
    JPY: 500,
    KRW: 4000,
    VND: 75000,
    AUD: 5,
    NZD: 5,
    CAD: 4,
    CHF: 3,
    SEK: 35,
    NOK: 35,
    DKK: 25,
    PLN: 12,
    TRY: 100,
    AED: 12,
    SAR: 12,
    QAR: 12,
    KWD: 1,
    BHD: 1.5,
    OMR: 1.5,
    JOD: 2.5,
    ILS: 12,
    BRL: 16,
    MXN: 55
};

// Maximum deposit amounts per currency
const MAX_DEPOSIT = {
    KES: 150000,
    NGN: 2800000,
    GHS: 25000,
    ZAR: 25000,
    USD: 1200,
    GBP: 1000,
    EUR: 1100,
    TZS: 3200000,
    UGX: 4500000,
    RWF: 1600000,
    ZMW: 32000,
    XOF: 750000,
    XAF: 750000,
    EGP: 60000,
    MAD: 12000,
    ETB: 150000,
    INR: 100000,
    PKR: 350000,
    BDT: 140000,
    LKR: 360000,
    PHP: 70000,
    THB: 45000,
    IDR: 20000000,
    MYR: 6000,
    SGD: 1600,
    CNY: 9000,
    JPY: 200000,
    KRW: 1600000,
    VND: 30000000,
    AUD: 2000,
    NZD: 2000,
    CAD: 1700,
    CHF: 1100,
    SEK: 13000,
    NOK: 13000,
    DKK: 8500,
    PLN: 5000,
    TRY: 40000,
    AED: 4500,
    SAR: 4500,
    QAR: 4500,
    KWD: 400,
    BHD: 500,
    OMR: 500,
    JOD: 900,
    ILS: 4500,
    BRL: 6500,
    MXN: 22000
};

// Minimum withdrawal amounts per currency
const MIN_WITHDRAWAL = {
    KES: 1200,
    NGN: 20000,
    GHS: 150,
    ZAR: 200,
    USD: 10,
    GBP: 8,
    EUR: 10,
    TZS: 27000,
    UGX: 37500,
    RWF: 14000,
    ZMW: 270,
    XOF: 6000,
    XAF: 6000,
    EGP: 500,
    MAD: 100,
    ETB: 1300,
    INR: 850,
    PKR: 2800,
    BDT: 1200,
    LKR: 3000,
    PHP: 600,
    THB: 370,
    IDR: 160000,
    MYR: 50,
    SGD: 15,
    CNY: 75,
    JPY: 1600,
    KRW: 14000,
    VND: 250000,
    AUD: 16,
    NZD: 17,
    CAD: 14,
    CHF: 10,
    SEK: 110,
    NOK: 110,
    DKK: 70,
    PLN: 40,
    TRY: 330,
    AED: 40,
    SAR: 40,
    QAR: 40,
    KWD: 3.5,
    BHD: 4,
    OMR: 4,
    JOD: 7.5,
    ILS: 40,
    BRL: 55,
    MXN: 185
};

// Maximum withdrawal amounts per currency
const MAX_WITHDRAWAL = {
    KES: 150000,
    NGN: 2800000,
    GHS: 25000,
    ZAR: 25000,
    USD: 1200,
    GBP: 1000,
    EUR: 1100,
    TZS: 3200000,
    UGX: 4500000,
    RWF: 1600000,
    ZMW: 32000,
    XOF: 750000,
    XAF: 750000,
    EGP: 60000,
    MAD: 12000,
    ETB: 150000,
    INR: 100000,
    PKR: 350000,
    BDT: 140000,
    LKR: 360000,
    PHP: 70000,
    THB: 45000,
    IDR: 20000000,
    MYR: 6000,
    SGD: 1600,
    CNY: 9000,
    JPY: 200000,
    KRW: 1600000,
    VND: 30000000,
    AUD: 2000,
    NZD: 2000,
    CAD: 1700,
    CHF: 1100,
    SEK: 13000,
    NOK: 13000,
    DKK: 8500,
    PLN: 5000,
    TRY: 40000,
    AED: 4500,
    SAR: 4500,
    QAR: 4500,
    KWD: 400,
    BHD: 500,
    OMR: 500,
    JOD: 900,
    ILS: 4500,
    BRL: 6500,
    MXN: 22000
};

/**
 * Get currency and country for a given country code
 * @param {string} countryCode - Country code (e.g., '+254')
 * @returns {object} - { currency, country }
 */
function getCurrencyForCountryCode(countryCode) {
    if (!countryCode) return { currency: 'USD', country: 'International' };
    const mapping = COUNTRY_CURRENCY_MAP[countryCode];
    if (mapping) {
        return mapping;
    }
    return { currency: 'USD', country: 'International' };
}

/**
 * Get currency symbol
 * @param {string} currency - Currency code (e.g., 'KES')
 * @returns {string} - Currency symbol
 */
function getCurrencySymbol(currency) {
    if (!currency) return '$';
    return CURRENCY_SYMBOLS[currency.toUpperCase()] || currency;
}

/**
 * Get currency name
 * @param {string} currency - Currency code
 * @returns {string} - Currency name
 */
function getCurrencyName(currency) {
    if (!currency) return 'US Dollar';
    return CURRENCY_NAMES[currency.toUpperCase()] || currency;
}

/**
 * Format amount with currency symbol
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string} - Formatted amount
 */
function formatCurrency(amount, currency = 'USD') {
    const symbol = getCurrencySymbol(currency);
    const num = parseFloat(amount) || 0;
    const formatted = num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    return `${symbol} ${formatted}`;
}

/**
 * Get deposit limits for currency
 * @param {string} currency - Currency code
 * @returns {object} - { min, max }
 */
function getDepositLimits(currency = 'USD') {
    const code = (currency || 'USD').toUpperCase();
    if (MIN_DEPOSIT[code] && MAX_DEPOSIT[code]) {
        return {
            min: MIN_DEPOSIT[code],
            max: MAX_DEPOSIT[code]
        };
    }
    // Fallback based on USD rate
    const fallbackRate = ExchangeRateService.FALLBACK_RATES[code.toLowerCase()] || 1;
    return {
        min: Math.max(1, Math.round(3 * fallbackRate)),
        max: Math.round(1200 * fallbackRate)
    };
}

/**
 * Get withdrawal limits for currency
 * @param {string} currency - Currency code
 * @returns {object} - { min, max }
 */
function getWithdrawalLimits(currency = 'USD') {
    const code = (currency || 'USD').toUpperCase();
    if (MIN_WITHDRAWAL[code] && MAX_WITHDRAWAL[code]) {
        return {
            min: MIN_WITHDRAWAL[code],
            max: MAX_WITHDRAWAL[code]
        };
    }
    const fallbackRate = ExchangeRateService.FALLBACK_RATES[code.toLowerCase()] || 1;
    return {
        min: Math.max(5, Math.round(10 * fallbackRate)),
        max: Math.round(1200 * fallbackRate)
    };
}

/**
 * Validate deposit amount for currency
 * @param {number} amount - Amount to validate
 * @param {string} currency - Currency code
 * @returns {object} - { valid, error }
 */
function validateDepositAmount(amount, currency = 'USD') {
    const limits = getDepositLimits(currency);
    const num = parseFloat(amount);

    if (isNaN(num) || num < limits.min) {
        return {
            valid: false,
            error: `Minimum deposit is ${formatCurrency(limits.min, currency)}`
        };
    }

    if (num > limits.max) {
        return {
            valid: false,
            error: `Maximum deposit is ${formatCurrency(limits.max, currency)}`
        };
    }

    return { valid: true };
}

/**
 * Validate withdrawal amount for currency
 * @param {number} amount - Amount to validate
 * @param {string} currency - Currency code
 * @returns {object} - { valid, error }
 */
function validateWithdrawalAmount(amount, currency = 'USD') {
    const limits = getWithdrawalLimits(currency);
    const num = parseFloat(amount);

    if (isNaN(num) || num < limits.min) {
        return {
            valid: false,
            error: `Minimum withdrawal is ${formatCurrency(limits.min, currency)}`
        };
    }

    if (num > limits.max) {
        return {
            valid: false,
            error: `Maximum withdrawal is ${formatCurrency(limits.max, currency)}`
        };
    }

    return { valid: true };
}

/**
 * Convert an amount to a Flutterwave-supported currency.
 * Natively supported FLW currencies pass through unchanged.
 * Unsupported currencies are converted to USD via live exchange rates.
 * @param {number} amount - Amount in the user's currency
 * @param {string} fromCurrency - User's currency code
 * @returns {Promise<object>} - { flwAmount, flwCurrency, converted, originalAmount, originalCurrency, exchangeRate? }
 */
async function convertToFlutterwaveCurrency(amount, fromCurrency) {
    const currency = (fromCurrency || 'USD').toUpperCase();
    const numAmount = parseFloat(amount);

    // Native FLW currency — charge directly in native currency
    if (FLUTTERWAVE_CURRENCIES.includes(currency)) {
        return {
            flwAmount: numAmount,
            flwCurrency: currency,
            converted: false,
            originalAmount: numAmount,
            originalCurrency: currency
        };
    }

    // Unsupported currency — convert to USD via live rate
    try {
        const rate = await ExchangeRateService.getRate(currency);
        const usdAmount = parseFloat((numAmount / rate).toFixed(2));
        // Enforce minimum 1 USD for Flutterwave
        const finalUsdAmount = Math.max(1.00, usdAmount);

        return {
            flwAmount: finalUsdAmount,
            flwCurrency: 'USD',
            converted: true,
            originalAmount: numAmount,
            originalCurrency: currency,
            exchangeRate: rate
        };
    } catch (err) {
        console.error(`[CurrencyConfig] Conversion error for ${currency}:`, err.message);
        // Fallback to static rate
        const fallbackRate = ExchangeRateService.FALLBACK_RATES[currency.toLowerCase()] || 1;
        const usdAmount = parseFloat((numAmount / fallbackRate).toFixed(2));
        return {
            flwAmount: Math.max(1.00, usdAmount),
            flwCurrency: 'USD',
            converted: true,
            originalAmount: numAmount,
            originalCurrency: currency,
            exchangeRate: fallbackRate
        };
    }
}

module.exports = {
    FLUTTERWAVE_CURRENCIES,
    CURRENCY_SYMBOLS,
    CURRENCY_NAMES,
    COUNTRY_CURRENCY_MAP,
    MIN_DEPOSIT,
    MAX_DEPOSIT,
    MIN_WITHDRAWAL,
    MAX_WITHDRAWAL,
    getCurrencyForCountryCode,
    getCurrencySymbol,
    getCurrencyName,
    formatCurrency,
    getDepositLimits,
    getWithdrawalLimits,
    validateDepositAmount,
    validateWithdrawalAmount,
    convertToFlutterwaveCurrency
};

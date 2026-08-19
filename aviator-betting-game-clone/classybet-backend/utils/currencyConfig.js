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
    // Africa
    KES: 'KSh',
    NGN: '₦',
    GHS: 'GH₵',
    ZAR: 'R',
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

    // Primary
    USD: '$',
    GBP: '£',
    EUR: '€',

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

// Full currency names
const CURRENCY_NAMES = {
    // Africa
    KES: 'Kenyan Shilling',
    NGN: 'Nigerian Naira',
    GHS: 'Ghanaian Cedi',
    ZAR: 'South African Rand',
    TZS: 'Tanzanian Shilling',
    UGX: 'Ugandan Shilling',
    RWF: 'Rwandan Franc',
    ZMW: 'Zambian Kwacha',
    XOF: 'West African CFA Franc',
    XAF: 'Central African CFA Franc',
    CDF: 'Congolese Franc',
    EGP: 'Egyptian Pound',
    MAD: 'Moroccan Dirham',
    ETB: 'Ethiopian Birr',
    MWK: 'Malawian Kwacha',
    GNF: 'Guinean Franc',
    SLL: 'Sierra Leonean Leone',
    DZD: 'Algerian Dinar',
    TND: 'Tunisian Dinar',
    LYD: 'Libyan Dinar',
    BWP: 'Botswanan Pula',
    NAD: 'Namibian Dollar',
    LSL: 'Lesotho Loti',
    MZN: 'Mozambican Metical',
    AOA: 'Angolan Kwanza',
    MUR: 'Mauritian Rupee',
    SCR: 'Seychellois Rupee',
    MGA: 'Malagasy Ariary',

    // Primary
    USD: 'US Dollar',
    GBP: 'British Pound',
    EUR: 'Euro',

    // Europe & Central Asia
    CHF: 'Swiss Franc',
    SEK: 'Swedish Krona',
    NOK: 'Norwegian Krone',
    DKK: 'Danish Krone',
    ISK: 'Icelandic Króna',
    PLN: 'Polish Zloty',
    HUF: 'Hungarian Forint',
    CZK: 'Czech Koruna',
    RON: 'Romanian Leu',
    BGN: 'Bulgarian Lev',
    RSD: 'Serbian Dinar',
    TRY: 'Turkish Lira',
    RUB: 'Russian Ruble',
    UZS: 'Uzbekistani Soʻm',
    KZT: 'Kazakhstani Tenge',
    AZN: 'Azerbaijani Manat',
    GEL: 'Georgian Lari',
    AMD: 'Armenian Dram',
    UAH: 'Ukrainian Hryvnia',

    // Asia & Pacific
    INR: 'Indian Rupee',
    PKR: 'Pakistani Rupee',
    BDT: 'Bangladeshi Taka',
    LKR: 'Sri Lankan Rupee',
    NPR: 'Nepalese Rupee',
    PHP: 'Philippine Peso',
    THB: 'Thai Baht',
    IDR: 'Indonesian Rupiah',
    MYR: 'Malaysian Ringgit',
    SGD: 'Singapore Dollar',
    CNY: 'Chinese Yuan',
    JPY: 'Japanese Yen',
    KRW: 'South Korean Won',
    VND: 'Vietnamese Dong',
    KHR: 'Cambodian Riel',
    MMK: 'Myanmar Kyat',
    MNT: 'Mongolian Tögrög',
    AUD: 'Australian Dollar',
    NZD: 'New Zealand Dollar',
    FJD: 'Fijian Dollar',
    PGK: 'Papua New Guinean Kina',

    // Middle East
    AED: 'UAE Dirham',
    SAR: 'Saudi Riyal',
    QAR: 'Qatari Riyal',
    KWD: 'Kuwaiti Dinar',
    BHD: 'Bahraini Dinar',
    OMR: 'Omani Rial',
    JOD: 'Jordanian Dinar',
    LBP: 'Lebanese Pound',
    ILS: 'Israeli Shekel',
    IQD: 'Iraqi Dinar',
    IRR: 'Iranian Rial',

    // Americas & Caribbean
    CAD: 'Canadian Dollar',
    BRL: 'Brazilian Real',
    MXN: 'Mexican Peso',
    COP: 'Colombian Peso',
    ARS: 'Argentine Peso',
    CLP: 'Chilean Peso',
    PEN: 'Peruvian Sol',
    HTG: 'Haitian Gourde',
    JMD: 'Jamaican Dollar',
    TTD: 'Trinidad & Tobago Dollar',
    DOP: 'Dominican Peso',
    CRC: 'Costa Rican Colón',
    UYU: 'Uruguayan Peso',
    PYG: 'Paraguayan Guaraní',
    BOB: 'Bolivian Boliviano'
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
    '+261': { currency: 'MGA', country: 'Madagascar' },
    '+230': { currency: 'MUR', country: 'Mauritius' },
    '+248': { currency: 'SCR', country: 'Seychelles' },

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
    '+266': { currency: 'LSL', country: 'Lesotho' },
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
    '+243': { currency: 'CDF', country: 'Democratic Republic of Congo' },
    '+236': { currency: 'XAF', country: 'Central African Republic' },
    '+235': { currency: 'XAF', country: 'Chad' },
    '+240': { currency: 'XAF', country: 'Equatorial Guinea' },
    '+244': { currency: 'AOA', country: 'Angola' },

    // Europe & Central Asia
    '+7': { currency: 'RUB', country: 'Russia' },
    '+998': { currency: 'UZS', country: 'Uzbekistan' },
    '+7-kz': { currency: 'KZT', country: 'Kazakhstan' },
    '+994': { currency: 'AZN', country: 'Azerbaijan' },
    '+995': { currency: 'GEL', country: 'Georgia' },
    '+374': { currency: 'AMD', country: 'Armenia' },
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
    '+354': { currency: 'ISK', country: 'Iceland' },
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
    '+90': { currency: 'TRY', country: 'Turkey' },
    '+380': { currency: 'UAH', country: 'Ukraine' },

    // Middle East
    '+971': { currency: 'AED', country: 'UAE' },
    '+966': { currency: 'SAR', country: 'Saudi Arabia' },
    '+974': { currency: 'QAR', country: 'Qatar' },
    '+965': { currency: 'KWD', country: 'Kuwait' },
    '+973': { currency: 'BHD', country: 'Bahrain' },
    '+968': { currency: 'OMR', country: 'Oman' },
    '+962': { currency: 'JOD', country: 'Jordan' },
    '+961': { currency: 'LBP', country: 'Lebanon' },
    '+972': { currency: 'ILS', country: 'Israel' },
    '+964': { currency: 'IQD', country: 'Iraq' },
    '+98': { currency: 'IRR', country: 'Iran' },

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
    '+855': { currency: 'KHR', country: 'Cambodia' },
    '+95': { currency: 'MMK', country: 'Myanmar' },
    '+976': { currency: 'MNT', country: 'Mongolia' },
    '+92': { currency: 'PKR', country: 'Pakistan' },
    '+880': { currency: 'BDT', country: 'Bangladesh' },
    '+94': { currency: 'LKR', country: 'Sri Lanka' },
    '+977': { currency: 'NPR', country: 'Nepal' },
    '+61': { currency: 'AUD', country: 'Australia' },
    '+64': { currency: 'NZD', country: 'New Zealand' },
    '+679': { currency: 'FJD', country: 'Fiji' },
    '+675': { currency: 'PGK', country: 'Papua New Guinea' },

    // Americas & Caribbean
    '+1': { currency: 'USD', country: 'United States' },
    '+1-ca': { currency: 'CAD', country: 'Canada' },
    '+55': { currency: 'BRL', country: 'Brazil' },
    '+52': { currency: 'MXN', country: 'Mexico' },
    '+57': { currency: 'COP', country: 'Colombia' },
    '+54': { currency: 'ARS', country: 'Argentina' },
    '+56': { currency: 'CLP', country: 'Chile' },
    '+51': { currency: 'PEN', country: 'Peru' },
    '+509': { currency: 'HTG', country: 'Haiti' },
    '+1-jm': { currency: 'JMD', country: 'Jamaica' },
    '+1-tt': { currency: 'TTD', country: 'Trinidad and Tobago' },
    '+1-do': { currency: 'DOP', country: 'Dominican Republic' },
    '+506': { currency: 'CRC', country: 'Costa Rica' },
    '+598': { currency: 'UYU', country: 'Uruguay' },
    '+595': { currency: 'PYG', country: 'Paraguay' },
    '+591': { currency: 'BOB', country: 'Bolivia' },
    '+593': { currency: 'USD', country: 'Ecuador' },
    '+507': { currency: 'USD', country: 'Panama' }
};

// Minimum deposit amounts per currency
const MIN_DEPOSIT = {
    // Africa
    KES: 349,
    NGN: 6500,
    GHS: 60,
    ZAR: 60,
    TZS: 8000,
    UGX: 12000,
    RWF: 4000,
    ZMW: 80,
    XOF: 2000,
    XAF: 2000,
    CDF: 8500,
    EGP: 150,
    MAD: 30,
    ETB: 400,
    MWK: 5000,
    GNF: 25000,
    SLL: 65000,
    DZD: 400,
    TND: 10,
    LYD: 15,
    BWP: 40,
    NAD: 60,
    LSL: 55,
    MZN: 200,
    AOA: 2700,
    MUR: 140,
    SCR: 45,
    MGA: 14000,

    // Primary
    USD: 3,
    GBP: 2.5,
    EUR: 3,

    // Europe & Central Asia
    CHF: 3,
    SEK: 35,
    NOK: 35,
    DKK: 25,
    ISK: 400,
    PLN: 12,
    HUF: 1100,
    CZK: 70,
    RON: 14,
    BGN: 5,
    RSD: 320,
    TRY: 100,
    RUB: 300,
    UZS: 40000,
    KZT: 1500,
    AZN: 5,
    GEL: 8,
    AMD: 1200,
    UAH: 125,

    // Asia & Pacific
    INR: 250,
    PKR: 850,
    BDT: 350,
    LKR: 900,
    NPR: 400,
    PHP: 175,
    THB: 110,
    IDR: 50000,
    MYR: 15,
    SGD: 4,
    CNY: 22,
    JPY: 500,
    KRW: 4000,
    VND: 75000,
    KHR: 12000,
    MMK: 6300,
    MNT: 10000,
    AUD: 5,
    NZD: 5,
    FJD: 7,
    PGK: 12,

    // Middle East
    AED: 12,
    SAR: 12,
    QAR: 12,
    KWD: 1,
    BHD: 1.5,
    OMR: 1.5,
    JOD: 2.5,
    LBP: 270000,
    ILS: 12,
    IQD: 4000,
    IRR: 125000,

    // Americas & Caribbean
    CAD: 4,
    BRL: 16,
    MXN: 55,
    COP: 12000,
    ARS: 2800,
    CLP: 2800,
    PEN: 12,
    HTG: 400,
    JMD: 480,
    TTD: 20,
    DOP: 180,
    CRC: 1500,
    UYU: 125,
    PYG: 23000,
    BOB: 20
};

// Maximum deposit amounts per currency
const MAX_DEPOSIT = {
    // Africa
    KES: 150000,
    NGN: 2800000,
    GHS: 25000,
    ZAR: 25000,
    TZS: 3200000,
    UGX: 4500000,
    RWF: 1600000,
    ZMW: 32000,
    XOF: 750000,
    XAF: 750000,
    CDF: 3400000,
    EGP: 60000,
    MAD: 12000,
    ETB: 150000,
    MWK: 2000000,
    GNF: 10000000,
    SLL: 25000000,
    DZD: 160000,
    TND: 3700,
    LYD: 5800,
    BWP: 16000,
    NAD: 25000,
    LSL: 22000,
    MZN: 75000,
    AOA: 1000000,
    MUR: 55000,
    SCR: 17000,
    MGA: 5500000,

    // Primary
    USD: 1200,
    GBP: 1000,
    EUR: 1100,

    // Europe & Central Asia
    CHF: 1100,
    SEK: 13000,
    NOK: 13000,
    DKK: 8500,
    ISK: 165000,
    PLN: 5000,
    HUF: 440000,
    CZK: 28000,
    RON: 5500,
    BGN: 2200,
    RSD: 130000,
    TRY: 40000,
    RUB: 110000,
    UZS: 15000000,
    KZT: 600000,
    AZN: 2000,
    GEL: 3300,
    AMD: 465000,
    UAH: 50000,

    // Asia & Pacific
    INR: 100000,
    PKR: 350000,
    BDT: 140000,
    LKR: 360000,
    NPR: 160000,
    PHP: 70000,
    THB: 45000,
    IDR: 20000000,
    MYR: 6000,
    SGD: 1600,
    CNY: 9000,
    JPY: 200000,
    KRW: 1600000,
    VND: 30000000,
    KHR: 4800000,
    MMK: 2500000,
    MNT: 4000000,
    AUD: 2000,
    NZD: 2000,
    FJD: 2700,
    PGK: 4700,

    // Middle East
    AED: 4500,
    SAR: 4500,
    QAR: 4500,
    KWD: 400,
    BHD: 500,
    OMR: 500,
    JOD: 900,
    LBP: 100000000,
    ILS: 4500,
    IQD: 1500000,
    IRR: 50000000,

    // Americas & Caribbean
    CAD: 1700,
    BRL: 6500,
    MXN: 22000,
    COP: 5000000,
    ARS: 1100000,
    CLP: 1100000,
    PEN: 4500,
    HTG: 160000,
    JMD: 190000,
    TTD: 8000,
    DOP: 72000,
    CRC: 600000,
    UYU: 50000,
    PYG: 9300000,
    BOB: 8300
};

// Minimum withdrawal amounts per currency
const MIN_WITHDRAWAL = {
    // Africa
    KES: 1200,
    NGN: 20000,
    GHS: 150,
    ZAR: 200,
    TZS: 27000,
    UGX: 37500,
    RWF: 14000,
    ZMW: 270,
    XOF: 6000,
    XAF: 6000,
    CDF: 28000,
    EGP: 500,
    MAD: 100,
    ETB: 1300,
    MWK: 17500,
    GNF: 86000,
    SLL: 225000,
    DZD: 1350,
    TND: 30,
    LYD: 50,
    BWP: 135,
    NAD: 200,
    LSL: 185,
    MZN: 640,
    AOA: 9000,
    MUR: 465,
    SCR: 140,
    MGA: 46000,

    // Primary
    USD: 10,
    GBP: 8,
    EUR: 10,

    // Europe & Central Asia
    CHF: 10,
    SEK: 105,
    NOK: 105,
    DKK: 70,
    ISK: 1400,
    PLN: 40,
    HUF: 3650,
    CZK: 230,
    RON: 46,
    BGN: 18,
    RSD: 1080,
    TRY: 330,
    RUB: 900,
    UZS: 125000,
    KZT: 5000,
    AZN: 17,
    GEL: 28,
    AMD: 3900,
    UAH: 410,

    // Asia & Pacific
    INR: 850,
    PKR: 2800,
    BDT: 1200,
    LKR: 3000,
    NPR: 1350,
    PHP: 600,
    THB: 370,
    IDR: 160000,
    MYR: 50,
    SGD: 15,
    CNY: 75,
    JPY: 1600,
    KRW: 14000,
    VND: 250000,
    KHR: 40000,
    MMK: 21000,
    MNT: 34500,
    AUD: 16,
    NZD: 17,
    FJD: 22,
    PGK: 40,

    // Middle East
    AED: 37,
    SAR: 38,
    QAR: 37,
    KWD: 3,
    BHD: 4,
    OMR: 4,
    JOD: 7,
    LBP: 900000,
    ILS: 37,
    IQD: 13000,
    IRR: 420000,

    // Americas & Caribbean
    CAD: 14,
    BRL: 55,
    MXN: 180,
    COP: 41000,
    ARS: 9200,
    CLP: 9300,
    PEN: 38,
    HTG: 1300,
    JMD: 1600,
    TTD: 68,
    DOP: 600,
    CRC: 5150,
    UYU: 420,
    PYG: 78000,
    BOB: 69
};

// Maximum withdrawal amounts per currency
const MAX_WITHDRAWAL = {
    // Africa
    KES: 1500000,
    NGN: 28000000,
    GHS: 250000,
    ZAR: 250000,
    TZS: 32000000,
    UGX: 45000000,
    RWF: 16000000,
    ZMW: 320000,
    XOF: 7500000,
    XAF: 7500000,
    CDF: 34000000,
    EGP: 600000,
    MAD: 120000,
    ETB: 1500000,
    MWK: 20000000,
    GNF: 100000000,
    SLL: 250000000,
    DZD: 1600000,
    TND: 37000,
    LYD: 58000,
    BWP: 160000,
    NAD: 250000,
    LSL: 220000,
    MZN: 750000,
    AOA: 10000000,
    MUR: 550000,
    SCR: 170000,
    MGA: 55000000,

    // Primary
    USD: 12000,
    GBP: 10000,
    EUR: 11000,

    // Europe & Central Asia
    CHF: 11000,
    SEK: 130000,
    NOK: 130000,
    DKK: 85000,
    ISK: 1650000,
    PLN: 50000,
    HUF: 4400000,
    CZK: 280000,
    RON: 55000,
    BGN: 22000,
    RSD: 1300000,
    TRY: 400000,
    RUB: 1100000,
    UZS: 150000000,
    KZT: 6000000,
    AZN: 20000,
    GEL: 33000,
    AMD: 4650000,
    UAH: 500000,

    // Asia & Pacific
    INR: 1000000,
    PKR: 3500000,
    BDT: 1400000,
    LKR: 3600000,
    NPR: 1600000,
    PHP: 700000,
    THB: 450000,
    IDR: 200000000,
    MYR: 60000,
    SGD: 16000,
    CNY: 90000,
    JPY: 2000000,
    KRW: 16000000,
    VND: 300000000,
    KHR: 48000000,
    MMK: 25000000,
    MNT: 40000000,
    AUD: 20000,
    NZD: 20000,
    FJD: 27000,
    PGK: 47000,

    // Middle East
    AED: 45000,
    SAR: 45000,
    QAR: 45000,
    KWD: 4000,
    BHD: 5000,
    OMR: 5000,
    JOD: 9000,
    LBP: 1000000000,
    ILS: 45000,
    IQD: 15000000,
    IRR: 500000000,

    // Americas & Caribbean
    CAD: 17000,
    BRL: 65000,
    MXN: 220000,
    COP: 50000000,
    ARS: 11000000,
    CLP: 11000000,
    PEN: 45000,
    HTG: 1600000,
    JMD: 1900000,
    TTD: 80000,
    DOP: 720000,
    CRC: 6000000,
    UYU: 500000,
    PYG: 93000000,
    BOB: 83000
};

/**
 * Get currency for a country code
 */
function getCurrencyByCountryCode(countryCode) {
    if (!countryCode) return 'USD';
    const entry = COUNTRY_CURRENCY_MAP[countryCode.trim()];
    return entry ? entry.currency : 'USD';
}

/**
 * Get symbol for a currency
 */
function getCurrencySymbol(currency) {
    if (!currency) return '$';
    return CURRENCY_SYMBOLS[currency.toUpperCase()] || currency;
}

/**
 * Get full name for a currency
 */
function getCurrencyName(currency) {
    if (!currency) return 'US Dollar';
    return CURRENCY_NAMES[currency.toUpperCase()] || currency;
}

/**
 * Format currency amount with symbol and thousand separators
 */
function formatCurrency(amount, currency) {
    const symbol = getCurrencySymbol(currency);
    const numAmount = parseFloat(amount) || 0;
    return `${symbol} ${numAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Get deposit limits for a currency
 */
function getDepositLimits(currency) {
    const curr = (currency || 'USD').toUpperCase();
    if (MIN_DEPOSIT[curr] && MAX_DEPOSIT[curr]) {
        return {
            min: MIN_DEPOSIT[curr],
            max: MAX_DEPOSIT[curr]
        };
    }
    const rate = ExchangeRateService.getFallbackRate(curr);
    return {
        min: Math.round(MIN_DEPOSIT.USD * rate),
        max: Math.round(MAX_DEPOSIT.USD * rate)
    };
}

/**
 * Get withdrawal limits for a currency
 */
function getWithdrawalLimits(currency) {
    const curr = (currency || 'USD').toUpperCase();
    if (MIN_WITHDRAWAL[curr] && MAX_WITHDRAWAL[curr]) {
        return {
            min: MIN_WITHDRAWAL[curr],
            max: MAX_WITHDRAWAL[curr]
        };
    }
    const rate = ExchangeRateService.getFallbackRate(curr);
    return {
        min: Math.round(MIN_WITHDRAWAL.USD * rate),
        max: Math.round(MAX_WITHDRAWAL.USD * rate)
    };
}

/**
 * Validate deposit amount
 */
function validateDepositAmount(amount, currency) {
    const limits = getDepositLimits(currency);
    const num = parseFloat(amount);
    if (isNaN(num)) {
        return { valid: false, error: 'Amount must be a valid number' };
    }
    if (num < limits.min) {
        return {
            valid: false,
            error: `Minimum deposit amount is ${formatCurrency(limits.min, currency)}`
        };
    }
    if (num > limits.max) {
        return {
            valid: false,
            error: `Maximum deposit amount is ${formatCurrency(limits.max, currency)}`
        };
    }
    return { valid: true };
}

/**
 * Validate withdrawal amount
 */
function validateWithdrawalAmount(amount, currency) {
    const limits = getWithdrawalLimits(currency);
    const num = parseFloat(amount);
    if (isNaN(num)) {
        return { valid: false, error: 'Amount must be a valid number' };
    }
    if (num < limits.min) {
        return {
            valid: false,
            error: `Minimum withdrawal amount is ${formatCurrency(limits.min, currency)}`
        };
    }
    if (num > limits.max) {
        return {
            valid: false,
            error: `Maximum withdrawal amount is ${formatCurrency(limits.max, currency)}`
        };
    }
    return { valid: true };
}

/**
 * Check if a currency is natively supported by Flutterwave
 */
function isFlutterwaveSupported(currency) {
    if (!currency) return false;
    return FLUTTERWAVE_CURRENCIES.includes(currency.toUpperCase());
}

/**
 * Convert an amount from any user currency to a Flutterwave-supported currency (USD)
 */
async function convertToFlutterwaveCurrency(amount, userCurrency) {
    const curr = (userCurrency || 'USD').toUpperCase();
    const numAmount = parseFloat(amount);

    if (isFlutterwaveSupported(curr)) {
        return {
            flwAmount: numAmount,
            flwCurrency: curr,
            converted: false,
            originalAmount: numAmount,
            originalCurrency: curr
        };
    }

    try {
        const usdAmount = await ExchangeRateService.convertToUSD(numAmount, curr);
        const rate = await ExchangeRateService.getRate(curr);

        return {
            flwAmount: Math.max(0.01, parseFloat(usdAmount.toFixed(2))),
            flwCurrency: 'USD',
            converted: true,
            originalAmount: numAmount,
            originalCurrency: curr,
            exchangeRate: rate
        };
    } catch (err) {
        console.error(`Failed to convert ${curr} to USD:`, err.message);
        const fallbackRate = ExchangeRateService.getFallbackRate(curr);
        const fallbackUsd = parseFloat((numAmount / fallbackRate).toFixed(2));
        return {
            flwAmount: Math.max(0.01, fallbackUsd),
            flwCurrency: 'USD',
            converted: true,
            originalAmount: numAmount,
            originalCurrency: curr,
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
    getCurrencyByCountryCode,
    getCurrencySymbol,
    getCurrencyName,
    formatCurrency,
    getDepositLimits,
    getWithdrawalLimits,
    validateDepositAmount,
    validateWithdrawalAmount,
    isFlutterwaveSupported,
    convertToFlutterwaveCurrency
};

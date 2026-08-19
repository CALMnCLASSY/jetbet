/**
 * ExchangeRateService
 * Fetches and caches live exchange rates (USD base) from public CDN API.
 * Refreshes daily so Flutterwave conversions always use fresh rates.
 */

const https = require('https');

const RATE_API_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';

// In-memory cache
let _ratesCache = null;     // { usd: { kes: 130.5, ngn: 1600, ... } }
let _lastFetched = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Fallback static rates (used when CDN is unreachable or for initial instant loads)
const FALLBACK_RATES = {
    // Africa
    kes: 130.0,
    ngn: 1610.0,
    ghs: 15.5,
    zar: 18.5,
    tzs: 2700.0,
    ugx: 3750.0,
    rwf: 1400.0,
    zmw: 27.0,
    mwk: 1750.0,
    egp: 48.0,
    mad: 10.0,
    etb: 130.0,
    gnf: 8600.0,
    sll: 22500.0,
    xof: 605.0,
    xaf: 605.0,
    cdf: 2800.0,
    dzd: 135.0,
    tnd: 3.1,
    lyd: 4.85,
    bwp: 13.5,
    nad: 18.5,
    lsl: 18.5,
    mzn: 64.0,
    aoa: 900.0,
    mur: 46.5,
    scr: 14.2,
    mga: 4600.0,

    // Europe & Central Asia
    gbp: 0.79,
    eur: 0.92,
    chf: 0.90,
    sek: 10.5,
    nok: 10.6,
    dkk: 6.9,
    isk: 138.0,
    pln: 4.0,
    huf: 365.0,
    czk: 23.2,
    ron: 4.6,
    bgn: 1.8,
    rsd: 108.0,
    try: 33.0,
    rub: 92.5,
    uzs: 12800.0,
    kzt: 495.0,
    azn: 1.7,
    gel: 2.75,
    amd: 388.0,
    uah: 41.0,

    // Asia & Pacific
    inr: 83.5,
    pkr: 278.0,
    bdt: 118.0,
    lkr: 300.0,
    npr: 134.0,
    php: 58.0,
    thb: 36.5,
    idr: 16200.0,
    myr: 4.7,
    sgd: 1.35,
    cny: 7.25,
    jpy: 156.0,
    krw: 1380.0,
    vnd: 25400.0,
    khr: 4100.0,
    mmk: 2100.0,
    mnt: 3450.0,
    aud: 1.52,
    nzd: 1.64,
    fjd: 2.25,
    pgk: 3.95,

    // Middle East
    aed: 3.67,
    sar: 3.75,
    qar: 3.64,
    kwd: 0.31,
    bhd: 0.38,
    omr: 0.38,
    jod: 0.71,
    lbp: 89500.0,
    ils: 3.72,
    iqd: 1310.0,
    irr: 42000.0,

    // Americas & Caribbean
    usd: 1.0,
    cad: 1.37,
    brl: 5.4,
    mxn: 18.2,
    cop: 4100.0,
    ars: 920.0,
    clp: 930.0,
    pen: 3.75,
    htg: 132.0,
    jmd: 158.0,
    ttd: 6.8,
    dop: 60.0,
    crc: 515.0,
    uyu: 42.0,
    pyg: 7800.0,
    bob: 6.9
};

/**
 * Fetch fresh rates from the CDN.
 * @returns {Promise<object>} rates map { kes: number, ngn: number, ... }
 */
function fetchRates() {
    return new Promise((resolve, reject) => {
        https.get(RATE_API_URL, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed.usd || {});
                } catch (e) {
                    reject(new Error('Failed to parse exchange rate response'));
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

/**
 * Refresh the in-memory cache.
 * Falls back to FALLBACK_RATES if the CDN is unreachable.
 */
async function refreshCache() {
    try {
        const rates = await fetchRates();
        _ratesCache = rates;
        _lastFetched = Date.now();
        console.log('[ExchangeRateService] ✅ Rates refreshed successfully.');
    } catch (err) {
        console.warn('[ExchangeRateService] ⚠️ Could not fetch live rates, using fallback:', err.message);
        if (!_ratesCache) {
            _ratesCache = FALLBACK_RATES;
            _lastFetched = Date.now();
        }
    }
}

/**
 * Get the exchange rate for a currency relative to USD.
 * e.g. getRate('KES') returns ~130 (1 USD = 130 KES)
 * @param {string} currencyCode - ISO 4217 currency code (case-insensitive)
 * @returns {number} Rate (units of currency per 1 USD)
 */
async function getRate(currencyCode) {
    if (!currencyCode) return 1;
    const key = currencyCode.toLowerCase();
    if (key === 'usd') return 1;

    // Refresh if cache is stale or empty
    if (!_ratesCache || (Date.now() - _lastFetched) > CACHE_TTL_MS) {
        await refreshCache();
    }

    const rate = _ratesCache ? _ratesCache[key] : null;
    if (rate && typeof rate === 'number' && rate > 0) {
        return rate;
    }

    // Try fallback
    const fallback = FALLBACK_RATES[key];
    if (fallback) {
        return fallback;
    }

    console.warn(`[ExchangeRateService] Unknown currency rate for ${currencyCode}, defaulting to 1`);
    return 1;
}

/**
 * Convert an amount from a source currency to USD.
 * @param {number} amount
 * @param {string} fromCurrency
 * @returns {Promise<number>} USD equivalent
 */
async function convertToUSD(amount, fromCurrency) {
    if (!fromCurrency || fromCurrency.toUpperCase() === 'USD') return parseFloat(amount);
    const rate = await getRate(fromCurrency);
    return parseFloat((amount / rate).toFixed(2));
}

/**
 * Convert an amount from USD to target currency.
 * @param {number} usdAmount
 * @param {string} toCurrency
 * @returns {Promise<number>} Target currency amount
 */
async function convertFromUSD(usdAmount, toCurrency) {
    if (!toCurrency || toCurrency.toUpperCase() === 'USD') return parseFloat(usdAmount);
    const rate = await getRate(toCurrency);
    return parseFloat((usdAmount * rate).toFixed(2));
}

/**
 * Start daily refresh interval on server startup.
 */
function startDailyRefresh() {
    refreshCache();
    setInterval(refreshCache, CACHE_TTL_MS);
    console.log('[ExchangeRateService] Daily exchange rate refresh scheduled.');
}

module.exports = {
    getRate,
    convertToUSD,
    convertFromUSD,
    startDailyRefresh,
    refreshCache,
    FALLBACK_RATES
};

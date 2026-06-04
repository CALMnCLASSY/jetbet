/**
 * ExchangeRateService
 * Fetches and caches live exchange rates (USD base) from a public CDN API.
 * Refreshes daily so Flutterwave conversions always use fresh rates.
 */

const https = require('https');

const RATE_API_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';

// In-memory cache
let _ratesCache = null;     // { usd: { kes: 130.5, ngn: 1600, ... } }
let _lastFetched = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Fallback static rates (used when the CDN is unreachable)
const FALLBACK_RATES = {
    kes: 130.0,
    ngn: 1610.0,
    ghs: 15.5,
    zar: 18.5,
    gbp: 0.79,
    eur: 0.92,
    tzs: 2700.0,
    ugx: 3750.0,
    rwf: 1400.0,
    zmw: 27.0,
    mwk: 1750.0,
    egp: 48.0,
    mad: 10.0,
    etb: 130.0,
    pkr: 278.0,
    inr: 83.5,
    bdt: 110.0,
    lkr: 320.0,
    php: 57.0,
    thb: 35.0,
    idr: 16000.0,
    myr: 4.7,
    sgd: 1.35,
    cny: 7.25,
    jpy: 157.0,
    krw: 1380.0,
    aud: 1.55,
    nzd: 1.65,
    cad: 1.37,
    chf: 0.91,
    sek: 10.8,
    nok: 10.7,
    dkk: 6.9,
    pln: 4.0,
    huf: 370.0,
    czk: 23.0,
    brl: 5.25,
    mxn: 17.5,
    cop: 4000.0,
    ars: 890.0,
    clp: 920.0,
    pen: 3.75,
    aed: 3.67,
    sar: 3.75,
    qar: 3.64,
    kwd: 0.31,
    bhd: 0.38,
    omr: 0.38,
    jod: 0.71,
    lbp: 89500.0,
    ils: 3.7,
    try: 32.5,
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
        console.warn('[ExchangeRateService] ⚠️  Could not fetch live rates, using fallback:', err.message);
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
    // Refresh if cache is stale or empty
    if (!_ratesCache || (Date.now() - _lastFetched) > CACHE_TTL_MS) {
        await refreshCache();
    }

    const key = currencyCode.toLowerCase();

    if (key === 'usd') return 1;

    const rate = _ratesCache[key];
    if (!rate) {
        // Try fallback
        const fallback = FALLBACK_RATES[key];
        if (fallback) {
            console.warn(`[ExchangeRateService] Using fallback rate for ${currencyCode}: ${fallback}`);
            return fallback;
        }
        throw new Error(`Exchange rate not available for currency: ${currencyCode}`);
    }

    return rate;
}

/**
 * Convert an amount from a source currency to USD.
 * @param {number} amount
 * @param {string} fromCurrency
 * @returns {Promise<number>} USD equivalent
 */
async function convertToUSD(amount, fromCurrency) {
    if (fromCurrency.toUpperCase() === 'USD') return amount;
    const rate = await getRate(fromCurrency);
    return parseFloat((amount / rate).toFixed(2));
}

/**
 * Start daily refresh interval on server startup.
 */
function startDailyRefresh() {
    // Initial load
    refreshCache();
    // Refresh every 24 hours
    setInterval(refreshCache, CACHE_TTL_MS);
    console.log('[ExchangeRateService] Daily exchange rate refresh scheduled.');
}

module.exports = {
    getRate,
    convertToUSD,
    startDailyRefresh,
    refreshCache,
};

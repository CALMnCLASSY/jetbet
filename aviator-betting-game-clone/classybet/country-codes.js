// Country codes for international phone number support with native currency mapping
const countryCodes = [
    // Africa - East
    { name: "Kenya", code: "+254", flag: "🇰🇪", pattern: "[0-9]{9}", placeholder: "712345678", currency: "KES", currencySymbol: "KSh" },
    { name: "Uganda", code: "+256", flag: "🇺🇬", pattern: "[0-9]{9}", placeholder: "712345678", currency: "UGX", currencySymbol: "USh" },
    { name: "Tanzania", code: "+255", flag: "🇹🇿", pattern: "[0-9]{9}", placeholder: "712345678", currency: "TZS", currencySymbol: "TSh" },
    { name: "Rwanda", code: "+250", flag: "🇷🇼", pattern: "[0-9]{9}", placeholder: "712345678", currency: "RWF", currencySymbol: "RF" },
    { name: "Ethiopia", code: "+251", flag: "🇪🇹", pattern: "[0-9]{9}", placeholder: "912345678", currency: "ETB", currencySymbol: "Br" },
    { name: "Burundi", code: "+257", flag: "🇧🇮", pattern: "[0-9]{8}", placeholder: "79123456", currency: "USD", currencySymbol: "$" },
    { name: "Somalia", code: "+252", flag: "🇸🇴", pattern: "[0-9]{8,9}", placeholder: "61123456", currency: "USD", currencySymbol: "$" },
    { name: "Djibouti", code: "+253", flag: "🇩🇯", pattern: "[0-9]{8}", placeholder: "77123456", currency: "USD", currencySymbol: "$" },
    { name: "Madagascar", code: "+261", flag: "🇲🇬", pattern: "[0-9]{9}", placeholder: "321234567", currency: "MGA", currencySymbol: "Ar" },
    { name: "Mauritius", code: "+230", flag: "🇲🇺", pattern: "[0-9]{8}", placeholder: "52123456", currency: "MUR", currencySymbol: "Rs" },
    { name: "Seychelles", code: "+248", flag: "🇸🇨", pattern: "[0-9]{7}", placeholder: "2512345", currency: "SCR", currencySymbol: "SR" },

    // Africa - West
    { name: "Nigeria", code: "+234", flag: "🇳🇬", pattern: "[0-9]{10}", placeholder: "8012345678", currency: "NGN", currencySymbol: "₦" },
    { name: "Ghana", code: "+233", flag: "🇬🇭", pattern: "[0-9]{9}", placeholder: "201234567", currency: "GHS", currencySymbol: "GH₵" },
    { name: "Senegal", code: "+221", flag: "🇸🇳", pattern: "[0-9]{9}", placeholder: "771234567", currency: "XOF", currencySymbol: "CFA" },
    { name: "Ivory Coast", code: "+225", flag: "🇨🇮", pattern: "[0-9]{10}", placeholder: "0123456789", currency: "XOF", currencySymbol: "CFA" },
    { name: "Mali", code: "+223", flag: "🇲🇱", pattern: "[0-9]{8}", placeholder: "65123456", currency: "XOF", currencySymbol: "CFA" },
    { name: "Burkina Faso", code: "+226", flag: "🇧🇫", pattern: "[0-9]{8}", placeholder: "70123456", currency: "XOF", currencySymbol: "CFA" },
    { name: "Niger", code: "+227", flag: "🇳🇪", pattern: "[0-9]{8}", placeholder: "96123456", currency: "XOF", currencySymbol: "CFA" },
    { name: "Togo", code: "+228", flag: "🇹🇬", pattern: "[0-9]{8}", placeholder: "90123456", currency: "XOF", currencySymbol: "CFA" },
    { name: "Benin", code: "+229", flag: "🇧🇯", pattern: "[0-9]{8}", placeholder: "90123456", currency: "XOF", currencySymbol: "CFA" },
    { name: "Guinea", code: "+224", flag: "🇬🇳", pattern: "[0-9]{9}", placeholder: "601234567", currency: "GNF", currencySymbol: "FG" },
    { name: "Sierra Leone", code: "+232", flag: "🇸🇱", pattern: "[0-9]{8}", placeholder: "25123456", currency: "SLL", currencySymbol: "Le" },
    { name: "Liberia", code: "+231", flag: "🇱🇷", pattern: "[0-9]{8}", placeholder: "77123456", currency: "USD", currencySymbol: "$" },
    { name: "Gambia", code: "+220", flag: "🇬🇲", pattern: "[0-9]{7}", placeholder: "3012345", currency: "USD", currencySymbol: "$" },

    // Africa - Southern
    { name: "South Africa", code: "+27", flag: "🇿🇦", pattern: "[0-9]{9}", placeholder: "821234567", currency: "ZAR", currencySymbol: "R" },
    { name: "Zambia", code: "+260", flag: "🇿🇲", pattern: "[0-9]{9}", placeholder: "971234567", currency: "ZMW", currencySymbol: "ZK" },
    { name: "Malawi", code: "+265", flag: "🇲🇼", pattern: "[0-9]{9}", placeholder: "991234567", currency: "MWK", currencySymbol: "MK" },
    { name: "Botswana", code: "+267", flag: "🇧🇼", pattern: "[0-9]{8}", placeholder: "71234567", currency: "BWP", currencySymbol: "P" },
    { name: "Namibia", code: "+264", flag: "🇳🇦", pattern: "[0-9]{8,9}", placeholder: "81123456", currency: "NAD", currencySymbol: "N$" },
    { name: "Lesotho", code: "+266", flag: "🇱🇸", pattern: "[0-9]{8}", placeholder: "58123456", currency: "LSL", currencySymbol: "L" },
    { name: "Eswatini", code: "+268", flag: "🇸🇿", pattern: "[0-9]{8}", placeholder: "76123456", currency: "ZAR", currencySymbol: "R" },
    { name: "Mozambique", code: "+258", flag: "🇲🇿", pattern: "[0-9]{9}", placeholder: "821234567", currency: "MZN", currencySymbol: "MT" },
    { name: "Zimbabwe", code: "+263", flag: "🇿🇼", pattern: "[0-9]{9}", placeholder: "712345678", currency: "USD", currencySymbol: "$" },
    { name: "Angola", code: "+244", flag: "🇦🇴", pattern: "[0-9]{9}", placeholder: "923123456", currency: "AOA", currencySymbol: "Kz" },

    // Africa - Central & North
    { name: "Cameroon", code: "+237", flag: "🇨🇲", pattern: "[0-9]{9}", placeholder: "671234567", currency: "XAF", currencySymbol: "FCFA" },
    { name: "Republic of the Congo", code: "+242", flag: "🇨🇬", pattern: "[0-9]{9}", placeholder: "061234567", currency: "XAF", currencySymbol: "FCFA" },
    { name: "DR Congo", code: "+243", flag: "🇨🇩", pattern: "[0-9]{9}", placeholder: "812345678", currency: "CDF", currencySymbol: "FC" },
    { name: "Gabon", code: "+241", flag: "🇬🇦", pattern: "[0-9]{7,8}", placeholder: "6123456", currency: "XAF", currencySymbol: "FCFA" },
    { name: "Chad", code: "+235", flag: "🇹🇩", pattern: "[0-9]{8}", placeholder: "66123456", currency: "XAF", currencySymbol: "FCFA" },
    { name: "Central African Republic", code: "+236", flag: "🇨🇫", pattern: "[0-9]{8}", placeholder: "75123456", currency: "XAF", currencySymbol: "FCFA" },
    { name: "Equatorial Guinea", code: "+240", flag: "🇬🇶", pattern: "[0-9]{9}", placeholder: "222123456", currency: "XAF", currencySymbol: "FCFA" },
    { name: "Egypt", code: "+20", flag: "🇪🇬", pattern: "[0-9]{10}", placeholder: "1001234567", currency: "EGP", currencySymbol: "E£" },
    { name: "Morocco", code: "+212", flag: "🇲🇦", pattern: "[0-9]{9}", placeholder: "612345678", currency: "MAD", currencySymbol: "DH" },
    { name: "Algeria", code: "+213", flag: "🇩🇿", pattern: "[0-9]{9}", placeholder: "661234567", currency: "DZD", currencySymbol: "DA" },
    { name: "Tunisia", code: "+216", flag: "🇹🇳", pattern: "[0-9]{8}", placeholder: "20123456", currency: "TND", currencySymbol: "DT" },
    { name: "Libya", code: "+218", flag: "🇱🇾", pattern: "[0-9]{9}", placeholder: "911234567", currency: "LYD", currencySymbol: "LD" },

    // Europe & Central Asia
    { name: "Russia", code: "+7", flag: "🇷🇺", pattern: "[0-9]{10}", placeholder: "9123456789", currency: "RUB", currencySymbol: "₽" },
    { name: "Uzbekistan", code: "+998", flag: "🇺🇿", pattern: "[0-9]{9}", placeholder: "901234567", currency: "UZS", currencySymbol: "so'm" },
    { name: "Kazakhstan", code: "+7-kz", flag: "🇰🇿", pattern: "[0-9]{10}", placeholder: "7012345678", currency: "KZT", currencySymbol: "₸" },
    { name: "Azerbaijan", code: "+994", flag: "🇦🇿", pattern: "[0-9]{9}", placeholder: "501234567", currency: "AZN", currencySymbol: "₼" },
    { name: "Georgia", code: "+995", flag: "🇬🇪", pattern: "[0-9]{9}", placeholder: "591234567", currency: "GEL", currencySymbol: "₾" },
    { name: "Armenia", code: "+374", flag: "🇦🇲", pattern: "[0-9]{8}", placeholder: "91234567", currency: "AMD", currencySymbol: "֏" },
    { name: "United Kingdom", code: "+44", flag: "🇬🇧", pattern: "[0-9]{10,11}", placeholder: "7700900123", currency: "GBP", currencySymbol: "£" },
    { name: "Germany", code: "+49", flag: "🇩🇪", pattern: "[0-9]{10,12}", placeholder: "15123456789", currency: "EUR", currencySymbol: "€" },
    { name: "France", code: "+33", flag: "🇫🇷", pattern: "[0-9]{9}", placeholder: "612345678", currency: "EUR", currencySymbol: "€" },
    { name: "Italy", code: "+39", flag: "🇮🇹", pattern: "[0-9]{9,10}", placeholder: "3123456789", currency: "EUR", currencySymbol: "€" },
    { name: "Spain", code: "+34", flag: "🇪🇸", pattern: "[0-9]{9}", placeholder: "612345678", currency: "EUR", currencySymbol: "€" },
    { name: "Netherlands", code: "+31", flag: "🇳🇱", pattern: "[0-9]{9}", placeholder: "612345678", currency: "EUR", currencySymbol: "€" },
    { name: "Belgium", code: "+32", flag: "🇧🇪", pattern: "[0-9]{9}", placeholder: "470123456", currency: "EUR", currencySymbol: "€" },
    { name: "Switzerland", code: "+41", flag: "🇨🇭", pattern: "[0-9]{9}", placeholder: "781234567", currency: "CHF", currencySymbol: "CHF" },
    { name: "Austria", code: "+43", flag: "🇦🇹", pattern: "[0-9]{10,11}", placeholder: "6641234567", currency: "EUR", currencySymbol: "€" },
    { name: "Portugal", code: "+351", flag: "🇵🇹", pattern: "[0-9]{9}", placeholder: "912345678", currency: "EUR", currencySymbol: "€" },
    { name: "Ireland", code: "+353", flag: "🇮🇪", pattern: "[0-9]{9}", placeholder: "831234567", currency: "EUR", currencySymbol: "€" },
    { name: "Sweden", code: "+46", flag: "🇸🇪", pattern: "[0-9]{9}", placeholder: "701234567", currency: "SEK", currencySymbol: "kr" },
    { name: "Norway", code: "+47", flag: "🇳🇴", pattern: "[0-9]{8}", placeholder: "91234567", currency: "NOK", currencySymbol: "kr" },
    { name: "Denmark", code: "+45", flag: "🇩🇰", pattern: "[0-9]{8}", placeholder: "20123456", currency: "DKK", currencySymbol: "kr" },
    { name: "Finland", code: "+358", flag: "🇫🇮", pattern: "[0-9]{9}", placeholder: "501234567", currency: "EUR", currencySymbol: "€" },
    { name: "Iceland", code: "+354", flag: "🇮🇸", pattern: "[0-9]{7}", placeholder: "6123456", currency: "ISK", currencySymbol: "kr" },
    { name: "Poland", code: "+48", flag: "🇵🇱", pattern: "[0-9]{9}", placeholder: "501234567", currency: "PLN", currencySymbol: "zł" },
    { name: "Czech Republic", code: "+420", flag: "🇨🇿", pattern: "[0-9]{9}", placeholder: "601234567", currency: "CZK", currencySymbol: "Kč" },
    { name: "Hungary", code: "+36", flag: "🇭🇺", pattern: "[0-9]{9}", placeholder: "201234567", currency: "HUF", currencySymbol: "Ft" },
    { name: "Greece", code: "+30", flag: "🇬🇷", pattern: "[0-9]{10}", placeholder: "6912345678", currency: "EUR", currencySymbol: "€" },
    { name: "Romania", code: "+40", flag: "🇷🇴", pattern: "[0-9]{9}", placeholder: "712345678", currency: "RON", currencySymbol: "lei" },
    { name: "Bulgaria", code: "+359", flag: "🇧🇬", pattern: "[0-9]{9}", placeholder: "881234567", currency: "BGN", currencySymbol: "лв" },
    { name: "Serbia", code: "+381", flag: "🇷🇸", pattern: "[0-9]{8,9}", placeholder: "601234567", currency: "RSD", currencySymbol: "дин." },
    { name: "Croatia", code: "+385", flag: "🇭🇷", pattern: "[0-9]{8,9}", placeholder: "911234567", currency: "EUR", currencySymbol: "€" },
    { name: "Slovakia", code: "+421", flag: "🇸🇰", pattern: "[0-9]{9}", placeholder: "912345678", currency: "EUR", currencySymbol: "€" },
    { name: "Slovenia", code: "+386", flag: "🇸🇮", pattern: "[0-9]{8}", placeholder: "41123456", currency: "EUR", currencySymbol: "€" },
    { name: "Estonia", code: "+372", flag: "🇪🇪", pattern: "[0-9]{7,8}", placeholder: "51234567", currency: "EUR", currencySymbol: "€" },
    { name: "Latvia", code: "+371", flag: "🇱🇻", pattern: "[0-9]{8}", placeholder: "21234567", currency: "EUR", currencySymbol: "€" },
    { name: "Lithuania", code: "+370", flag: "🇱🇹", pattern: "[0-9]{8}", placeholder: "61234567", currency: "EUR", currencySymbol: "€" },
    { name: "Cyprus", code: "+357", flag: "🇨🇾", pattern: "[0-9]{8}", placeholder: "99123456", currency: "EUR", currencySymbol: "€" },
    { name: "Malta", code: "+356", flag: "🇲🇹", pattern: "[0-9]{8}", placeholder: "99123456", currency: "EUR", currencySymbol: "€" },
    { name: "Luxembourg", code: "+352", flag: "🇱🇺", pattern: "[0-9]{9}", placeholder: "621123456", currency: "EUR", currencySymbol: "€" },
    { name: "Turkey", code: "+90", flag: "🇹🇷", pattern: "[0-9]{10}", placeholder: "5321234567", currency: "TRY", currencySymbol: "₺" },
    { name: "Ukraine", code: "+380", flag: "🇺🇦", pattern: "[0-9]{9}", placeholder: "501234567", currency: "UAH", currencySymbol: "₴" },

    // Middle East
    { name: "UAE", code: "+971", flag: "🇦🇪", pattern: "[0-9]{9}", placeholder: "501234567", currency: "AED", currencySymbol: "د.إ" },
    { name: "Saudi Arabia", code: "+966", flag: "🇸🇦", pattern: "[0-9]{9}", placeholder: "501234567", currency: "SAR", currencySymbol: "SR" },
    { name: "Qatar", code: "+974", flag: "🇶🇦", pattern: "[0-9]{8}", placeholder: "33123456", currency: "QAR", currencySymbol: "QR" },
    { name: "Kuwait", code: "+965", flag: "🇰🇼", pattern: "[0-9]{8}", placeholder: "50123456", currency: "KWD", currencySymbol: "KD" },
    { name: "Bahrain", code: "+973", flag: "🇧🇭", pattern: "[0-9]{8}", placeholder: "36123456", currency: "BHD", currencySymbol: "BD" },
    { name: "Oman", code: "+968", flag: "🇴🇲", pattern: "[0-9]{8}", placeholder: "92123456", currency: "OMR", currencySymbol: "RO" },
    { name: "Jordan", code: "+962", flag: "🇯🇴", pattern: "[0-9]{9}", placeholder: "791234567", currency: "JOD", currencySymbol: "JD" },
    { name: "Lebanon", code: "+961", flag: "🇱🇧", pattern: "[0-9]{7,8}", placeholder: "71123456", currency: "LBP", currencySymbol: "L£" },
    { name: "Israel", code: "+972", flag: "🇮🇱", pattern: "[0-9]{9}", placeholder: "501234567", currency: "ILS", currencySymbol: "₪" },
    { name: "Iraq", code: "+964", flag: "🇮🇶", pattern: "[0-9]{10}", placeholder: "7701234567", currency: "IQD", currencySymbol: "IQD" },
    { name: "Iran", code: "+98", flag: "🇮🇷", pattern: "[0-9]{10}", placeholder: "9123456789", currency: "IRR", currencySymbol: "﷼" },

    // Asia & Pacific
    { name: "India", code: "+91", flag: "🇮🇳", pattern: "[0-9]{10}", placeholder: "9876543210", currency: "INR", currencySymbol: "₹" },
    { name: "Pakistan", code: "+92", flag: "🇵🇰", pattern: "[0-9]{10}", placeholder: "3012345678", currency: "PKR", currencySymbol: "₨" },
    { name: "Bangladesh", code: "+880", flag: "🇧🇩", pattern: "[0-9]{10}", placeholder: "1712345678", currency: "BDT", currencySymbol: "৳" },
    { name: "Sri Lanka", code: "+94", flag: "🇱🇰", pattern: "[0-9]{9}", placeholder: "712345678", currency: "LKR", currencySymbol: "₨" },
    { name: "Nepal", code: "+977", flag: "🇳🇵", pattern: "[0-9]{10}", placeholder: "9812345678", currency: "NPR", currencySymbol: "Rs" },
    { name: "China", code: "+86", flag: "🇨🇳", pattern: "[0-9]{11}", placeholder: "13812345678", currency: "CNY", currencySymbol: "¥" },
    { name: "Japan", code: "+81", flag: "🇯🇵", pattern: "[0-9]{10,11}", placeholder: "9012345678", currency: "JPY", currencySymbol: "¥" },
    { name: "South Korea", code: "+82", flag: "🇰🇷", pattern: "[0-9]{9,10}", placeholder: "1012345678", currency: "KRW", currencySymbol: "₩" },
    { name: "Singapore", code: "+65", flag: "🇸🇬", pattern: "[0-9]{8}", placeholder: "81234567", currency: "SGD", currencySymbol: "S$" },
    { name: "Malaysia", code: "+60", flag: "🇲🇾", pattern: "[0-9]{9,10}", placeholder: "123456789", currency: "MYR", currencySymbol: "RM" },
    { name: "Thailand", code: "+66", flag: "🇹🇭", pattern: "[0-9]{9}", placeholder: "812345678", currency: "THB", currencySymbol: "฿" },
    { name: "Philippines", code: "+63", flag: "🇵🇭", pattern: "[0-9]{10}", placeholder: "9171234567", currency: "PHP", currencySymbol: "₱" },
    { name: "Indonesia", code: "+62", flag: "🇮🇩", pattern: "[0-9]{9,12}", placeholder: "812345678", currency: "IDR", currencySymbol: "Rp" },
    { name: "Vietnam", code: "+84", flag: "🇻🇳", pattern: "[0-9]{9,10}", placeholder: "912345678", currency: "VND", currencySymbol: "₫" },
    { name: "Cambodia", code: "+855", flag: "🇰🇭", pattern: "[0-9]{8,9}", placeholder: "12345678", currency: "KHR", currencySymbol: "៛" },
    { name: "Myanmar", code: "+95", flag: "🇲🇲", pattern: "[0-9]{9,10}", placeholder: "912345678", currency: "MMK", currencySymbol: "K" },
    { name: "Mongolia", code: "+976", flag: "🇲🇳", pattern: "[0-9]{8}", placeholder: "88123456", currency: "MNT", currencySymbol: "₮" },
    { name: "Australia", code: "+61", flag: "🇦🇺", pattern: "[0-9]{9}", placeholder: "412345678", currency: "AUD", currencySymbol: "A$" },
    { name: "New Zealand", code: "+64", flag: "🇳🇿", pattern: "[0-9]{8,10}", placeholder: "211234567", currency: "NZD", currencySymbol: "NZ$" },
    { name: "Fiji", code: "+679", flag: "🇫🇯", pattern: "[0-9]{7}", placeholder: "7012345", currency: "FJD", currencySymbol: "FJ$" },
    { name: "Papua New Guinea", code: "+675", flag: "🇵🇬", pattern: "[0-9]{8}", placeholder: "71234567", currency: "PGK", currencySymbol: "K" },

    // Americas & Caribbean
    { name: "United States", code: "+1", flag: "🇺🇸", pattern: "[0-9]{10}", placeholder: "5551234567", currency: "USD", currencySymbol: "$" },
    { name: "Canada", code: "+1-ca", flag: "🇨🇦", pattern: "[0-9]{10}", placeholder: "5551234567", currency: "CAD", currencySymbol: "C$" },
    { name: "Brazil", code: "+55", flag: "🇧🇷", pattern: "[0-9]{10,11}", placeholder: "11912345678", currency: "BRL", currencySymbol: "R$" },
    { name: "Mexico", code: "+52", flag: "🇲🇽", pattern: "[0-9]{10}", placeholder: "5512345678", currency: "MXN", currencySymbol: "$" },
    { name: "Colombia", code: "+57", flag: "🇨🇴", pattern: "[0-9]{10}", placeholder: "3001234567", currency: "COP", currencySymbol: "$" },
    { name: "Argentina", code: "+54", flag: "🇦🇷", pattern: "[0-9]{10}", placeholder: "1112345678", currency: "ARS", currencySymbol: "$" },
    { name: "Chile", code: "+56", flag: "🇨🇱", pattern: "[0-9]{9}", placeholder: "912345678", currency: "CLP", currencySymbol: "$" },
    { name: "Peru", code: "+51", flag: "🇵🇪", pattern: "[0-9]{9}", placeholder: "912345678", currency: "PEN", currencySymbol: "S/" },
    { name: "Haiti", code: "+509", flag: "🇭🇹", pattern: "[0-9]{8}", placeholder: "34123456", currency: "HTG", currencySymbol: "G" },
    { name: "Jamaica", code: "+1-jm", flag: "🇯🇲", pattern: "[0-9]{10}", placeholder: "8761234567", currency: "JMD", currencySymbol: "J$" },
    { name: "Trinidad and Tobago", code: "+1-tt", flag: "🇹🇹", pattern: "[0-9]{10}", placeholder: "8681234567", currency: "TTD", currencySymbol: "TT$" },
    { name: "Dominican Republic", code: "+1-do", flag: "🇩🇴", pattern: "[0-9]{10}", placeholder: "8091234567", currency: "DOP", currencySymbol: "RD$" },
    { name: "Costa Rica", code: "+506", flag: "🇨🇷", pattern: "[0-9]{8}", placeholder: "83123456", currency: "CRC", currencySymbol: "₡" },
    { name: "Uruguay", code: "+598", flag: "🇺🇾", pattern: "[0-9]{8}", placeholder: "99123456", currency: "UYU", currencySymbol: "$U" },
    { name: "Paraguay", code: "+595", flag: "🇵🇾", pattern: "[0-9]{9}", placeholder: "981123456", currency: "PYG", currencySymbol: "₲" },
    { name: "Bolivia", code: "+591", flag: "🇧🇴", pattern: "[0-9]{8}", placeholder: "71234567", currency: "BOB", currencySymbol: "Bs" },
    { name: "Ecuador", code: "+593", flag: "🇪🇨", pattern: "[0-9]{9}", placeholder: "991234567", currency: "USD", currencySymbol: "$" },
    { name: "Panama", code: "+507", flag: "🇵🇦", pattern: "[0-9]{8}", placeholder: "61234567", currency: "USD", currencySymbol: "$" }
];

// Helper functions for currency lookup
function getCurrencyByCountryCode(code) {
    const country = countryCodes.find(c => c.code === code);
    return country ? country.currency : 'USD';
}

function getCurrencySymbolByCountryCode(code) {
    const country = countryCodes.find(c => c.code === code);
    return country ? country.currencySymbol : '$';
}

function getCountryDetailsByCode(code) {
    return countryCodes.find(c => c.code === code) || null;
}

// Export for Node.js if in backend environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        countryCodes,
        getCurrencyByCountryCode,
        getCurrencySymbolByCountryCode,
        getCountryDetailsByCode
    };
}

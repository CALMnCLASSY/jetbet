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
    { name: "Mozambique", code: "+258", flag: "🇲🇿", pattern: "[0-9]{9}", placeholder: "821234567", currency: "MZN", currencySymbol: "MT" },
    { name: "Zimbabwe", code: "+263", flag: "🇿🇼", pattern: "[0-9]{9}", placeholder: "712345678", currency: "USD", currencySymbol: "$" },
    { name: "Angola", code: "+244", flag: "🇦🇴", pattern: "[0-9]{9}", placeholder: "923123456", currency: "AOA", currencySymbol: "Kz" },

    // Africa - Central & North
    { name: "Cameroon", code: "+237", flag: "🇨🇲", pattern: "[0-9]{9}", placeholder: "671234567", currency: "XAF", currencySymbol: "FCFA" },
    { name: "Gabon", code: "+241", flag: "🇬🇦", pattern: "[0-9]{7,8}", placeholder: "6123456", currency: "XAF", currencySymbol: "FCFA" },
    { name: "Egypt", code: "+20", flag: "🇪🇬", pattern: "[0-9]{10}", placeholder: "1001234567", currency: "EGP", currencySymbol: "E£" },
    { name: "Morocco", code: "+212", flag: "🇲🇦", pattern: "[0-9]{9}", placeholder: "612345678", currency: "MAD", currencySymbol: "DH" },
    { name: "Algeria", code: "+213", flag: "🇩🇿", pattern: "[0-9]{9}", placeholder: "661234567", currency: "DZD", currencySymbol: "DA" },
    { name: "Tunisia", code: "+216", flag: "🇹🇳", pattern: "[0-9]{8}", placeholder: "20123456", currency: "TND", currencySymbol: "DT" },

    // Europe
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
    { name: "Poland", code: "+48", flag: "🇵🇱", pattern: "[0-9]{9}", placeholder: "501234567", currency: "PLN", currencySymbol: "zł" },
    { name: "Czech Republic", code: "+420", flag: "🇨🇿", pattern: "[0-9]{9}", placeholder: "601234567", currency: "CZK", currencySymbol: "Kč" },
    { name: "Hungary", code: "+36", flag: "🇭🇺", pattern: "[0-9]{9}", placeholder: "201234567", currency: "HUF", currencySymbol: "Ft" },
    { name: "Greece", code: "+30", flag: "🇬🇷", pattern: "[0-9]{10}", placeholder: "6912345678", currency: "EUR", currencySymbol: "€" },
    { name: "Romania", code: "+40", flag: "🇷🇴", pattern: "[0-9]{9}", placeholder: "712345678", currency: "RON", currencySymbol: "lei" },
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
    { name: "Israel", code: "+972", flag: "🇮🇱", pattern: "[0-9]{9}", placeholder: "501234567", currency: "ILS", currencySymbol: "₪" },

    // Asia & Pacific
    { name: "India", code: "+91", flag: "🇮🇳", pattern: "[0-9]{10}", placeholder: "9876543210", currency: "INR", currencySymbol: "₹" },
    { name: "Pakistan", code: "+92", flag: "🇵🇰", pattern: "[0-9]{10}", placeholder: "3012345678", currency: "PKR", currencySymbol: "₨" },
    { name: "Bangladesh", code: "+880", flag: "🇧🇩", pattern: "[0-9]{10}", placeholder: "1712345678", currency: "BDT", currencySymbol: "৳" },
    { name: "Sri Lanka", code: "+94", flag: "🇱🇰", pattern: "[0-9]{9}", placeholder: "712345678", currency: "LKR", currencySymbol: "₨" },
    { name: "China", code: "+86", flag: "🇨🇳", pattern: "[0-9]{11}", placeholder: "13812345678", currency: "CNY", currencySymbol: "¥" },
    { name: "Japan", code: "+81", flag: "🇯🇵", pattern: "[0-9]{10,11}", placeholder: "9012345678", currency: "JPY", currencySymbol: "¥" },
    { name: "South Korea", code: "+82", flag: "🇰🇷", pattern: "[0-9]{9,10}", placeholder: "1012345678", currency: "KRW", currencySymbol: "₩" },
    { name: "Singapore", code: "+65", flag: "🇸🇬", pattern: "[0-9]{8}", placeholder: "81234567", currency: "SGD", currencySymbol: "S$" },
    { name: "Malaysia", code: "+60", flag: "🇲🇾", pattern: "[0-9]{9,10}", placeholder: "123456789", currency: "MYR", currencySymbol: "RM" },
    { name: "Thailand", code: "+66", flag: "🇹🇭", pattern: "[0-9]{9}", placeholder: "812345678", currency: "THB", currencySymbol: "฿" },
    { name: "Philippines", code: "+63", flag: "🇵🇭", pattern: "[0-9]{10}", placeholder: "9171234567", currency: "PHP", currencySymbol: "₱" },
    { name: "Indonesia", code: "+62", flag: "🇮🇩", pattern: "[0-9]{9,12}", placeholder: "812345678", currency: "IDR", currencySymbol: "Rp" },
    { name: "Vietnam", code: "+84", flag: "🇻🇳", pattern: "[0-9]{9,10}", placeholder: "912345678", currency: "VND", currencySymbol: "₫" },
    { name: "Australia", code: "+61", flag: "🇦🇺", pattern: "[0-9]{9}", placeholder: "412345678", currency: "AUD", currencySymbol: "A$" },
    { name: "New Zealand", code: "+64", flag: "🇳🇿", pattern: "[0-9]{8,10}", placeholder: "211234567", currency: "NZD", currencySymbol: "NZ$" },

    // Americas
    { name: "United States", code: "+1", flag: "🇺🇸", pattern: "[0-9]{10}", placeholder: "5551234567", currency: "USD", currencySymbol: "$" },
    { name: "Canada", code: "+1-ca", flag: "🇨🇦", pattern: "[0-9]{10}", placeholder: "5551234567", currency: "CAD", currencySymbol: "C$" },
    { name: "Brazil", code: "+55", flag: "🇧🇷", pattern: "[0-9]{10,11}", placeholder: "11912345678", currency: "BRL", currencySymbol: "R$" },
    { name: "Mexico", code: "+52", flag: "🇲🇽", pattern: "[0-9]{10}", placeholder: "5512345678", currency: "MXN", currencySymbol: "$" },
    { name: "Colombia", code: "+57", flag: "🇨🇴", pattern: "[0-9]{10}", placeholder: "3001234567", currency: "COP", currencySymbol: "$" },
    { name: "Argentina", code: "+54", flag: "🇦🇷", pattern: "[0-9]{10}", placeholder: "1112345678", currency: "ARS", currencySymbol: "$" },
    { name: "Chile", code: "+56", flag: "🇨🇱", pattern: "[0-9]{9}", placeholder: "912345678", currency: "CLP", currencySymbol: "$" },
    { name: "Peru", code: "+51", flag: "🇵🇪", pattern: "[0-9]{9}", placeholder: "912345678", currency: "PEN", currencySymbol: "S/." }
];

// Sort by country name for optimal UX
countryCodes.sort((a, b) => a.name.localeCompare(b.name));

// Export for usage in Node / Browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = countryCodes;
} else if (typeof window !== 'undefined') {
    window.countryCodes = countryCodes;
}

/**
 * Flutterwave Payment Integration
 * Handles multi-currency deposits.
 * Checks for adblocker/ISP blocks on the FLW SDK and alerts client-side.
 */

(function () {
    const FLW_SDK_URL = 'https://checkout.flutterwave.com/v3.js';

    // Helper to load the Flutterwave script dynamically if needed
    function loadFlutterwaveSDK() {
        return new Promise((resolve, reject) => {
            if (window.FlutterwaveCheckout) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = FLW_SDK_URL;
            script.type = 'text/javascript';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Flutterwave SDK failed to load. If you use an ad-blocker, please disable it.'));
            document.head.appendChild(script);
        });
    }

    /**
     * Determine API Base URL dynamically
     */
    function getApiBase() {
        if (typeof window.API_BASE !== 'undefined' && window.API_BASE) {
            return window.API_BASE;
        }
        if (typeof API_BASE_URL !== 'undefined' && API_BASE_URL) {
            return API_BASE_URL;
        }
        const { hostname, protocol } = window.location;
        const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
        if (isLocalHost || protocol === 'file:' || hostname === '') {
            return 'http://localhost:3001';
        }
        return 'https://back.jetbetaviator.com';
    }

    /**
     * Initialize Flutterwave deposit
     */
    async function initiateFlutterwaveDeposit(amount) {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const token = localStorage.getItem('user_token') || localStorage.getItem('token');

            if (!token || !userData) {
                throw new Error('Please log in to make a deposit.');
            }

            const currency = (typeof window.getUserCurrency === 'function')
                ? window.getUserCurrency()
                : (userData.currency || 'USD');

            const limits = (typeof window.getDepositLimits === 'function')
                ? window.getDepositLimits(currency)
                : { min: 3, max: 1200 };

            const numAmount = parseFloat(amount);
            if (isNaN(numAmount) || numAmount < limits.min || numAmount > limits.max) {
                const format = window.formatCurrency || ((amt, cur) => `${cur} ${parseFloat(amt).toFixed(2)}`);
                throw new Error(`Amount must be between ${format(limits.min, currency)} and ${format(limits.max, currency)}`);
            }

            console.log('🔄 Initializing deposit:', { amount: numAmount, currency });

            // Preserve current page URL for return
            const returnUrl = window.location.href.split('?')[0];

            const apiBase = getApiBase();
            const response = await fetch(`${apiBase}/api/payments/flw-deposit-initialize`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: numAmount,
                    redirectUrl: returnUrl
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to initialize payment');
            }

            console.log('✅ Payment initialized on backend:', data);

            // Redirect user to Flutterwave hosted payment link
            if (data.data && data.data.payment_link) {
                console.log('Redirecting to Flutterwave checkout:', data.data.payment_link);
                window.location.href = data.data.payment_link;
            } else {
                throw new Error('No payment link returned by payment gateway');
            }

        } catch (error) {
            console.error('❌ Deposit error:', error);
            showNotification(error.message || 'Failed to initiate deposit', 'error');
            throw error;
        }
    }

    /**
     * Check for redirect query parameters to verify completed payment
     */
    async function checkFlutterwaveRedirect() {
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('status');
        const txRef = urlParams.get('tx_ref');
        const transactionId = urlParams.get('transaction_id');

        if (status && txRef && transactionId) {
            // Clean up URL parameters so back/refresh doesn't re-trigger
            const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.replaceState({ path: cleanUrl }, '', cleanUrl);

            if (status === 'successful' || status === 'completed') {
                console.log('🔍 Verifying Flutterwave payment on return:', { txRef, transactionId });
                showNotification('Verifying your deposit. Please wait...', 'info');

                try {
                    const token = localStorage.getItem('user_token') || localStorage.getItem('token');
                    const apiBase = getApiBase();

                    const response = await fetch(`${apiBase}/api/payments/flw-deposit-verify`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            transaction_id: parseFloat(transactionId),
                            tx_ref: txRef
                        })
                    });

                    const data = await response.json();
                    if (!response.ok || !data.success) {
                        throw new Error(data.error || 'Verification failed');
                    }

                    console.log('✅ Deposit verified and credited successfully:', data);

                    // Update user profile in local state
                    if (data.newBalance !== undefined && data.newBalance !== null) {
                        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                        userData.balance = data.newBalance;
                        localStorage.setItem('userData', JSON.stringify(userData));

                        if (typeof window.updateBalanceDisplay === 'function') {
                            window.updateBalanceDisplay(data.newBalance);
                        }

                        // Update all balance elements on page
                        const currency = userData.currency || 'USD';
                        const formatted = (typeof window.formatCurrency === 'function')
                            ? window.formatCurrency(data.newBalance, currency)
                            : `${currency} ${parseFloat(data.newBalance).toFixed(2)}`;

                        document.querySelectorAll('.user-balance, #user-balance, #balance, .account-balance').forEach(el => {
                            el.textContent = formatted;
                        });

                        showNotification(`Deposit successful! New balance: ${formatted}`, 'success');
                    } else {
                        showNotification('Deposit successful! Your balance has been updated.', 'success');
                    }

                    if (typeof window.loadUserProfile === 'function') {
                        await window.loadUserProfile();
                    }

                    if (typeof window.closeModal === 'function') {
                        window.closeModal('deposit-modal');
                    }

                } catch (error) {
                    console.error('❌ Verification error:', error);
                    showNotification(error.message || 'Failed to verify payment', 'error');
                }
            } else if (status === 'cancelled') {
                console.log('ℹ️ Deposit was cancelled by user.');
                showNotification('Deposit was cancelled.', 'warning');
            } else {
                console.warn('❌ Payment failed with status:', status);
                showNotification(`Payment failed with status: ${status}`, 'error');
            }
        }
    }

    // Helper: unified notification utility
    function showNotification(message, type = 'info') {
        if (typeof window.showSuccess === 'function' && type === 'success') {
            window.showSuccess('deposit-success', message);
        } else if (typeof window.showError === 'function' && type === 'error') {
            window.showError('deposit-error', message);
        } else {
            console.log(`[Notification] [${type}] ${message}`);
            const toast = document.createElement('div');
            toast.style.position = 'fixed';
            toast.style.bottom = '24px';
            toast.style.right = '24px';
            toast.style.backgroundColor = type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : type === 'warning' ? '#f39c12' : '#3498db';
            toast.style.color = '#fff';
            toast.style.padding = '14px 28px';
            toast.style.borderRadius = '8px';
            toast.style.zIndex = '999999';
            toast.style.fontSize = '15px';
            toast.style.fontWeight = '600';
            toast.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
            toast.innerText = message;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 6000);
        }
    }

    // Export globally
    if (typeof window !== 'undefined') {
        window.initiateFlutterwaveDeposit = initiateFlutterwaveDeposit;
        window.checkFlutterwaveRedirect = checkFlutterwaveRedirect;
    }

    // Run automatically on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkFlutterwaveRedirect);
    } else {
        checkFlutterwaveRedirect();
    }
})();

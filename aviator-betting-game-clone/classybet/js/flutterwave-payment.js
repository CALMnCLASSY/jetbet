/**
 * Flutterwave Payment Integration
 * Handles multi-currency deposits.
 * Checks for adblocker/ISP blocks on the FLW SDK and alerts client-side.
 */

(function () {
    const FLW_SDK_URL = 'https://checkout.flutterwave.com/v3.js';

    // Helper to load the Flutterwave script dynamically
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
            script.onerror = () => reject(new Error('Flutterwave SDK failed to load. Ad-blocker or ISP block detected.'));
            document.head.appendChild(script);
        });
    }

    /**
     * Initialize Flutterwave deposit
     */
    async function initiateFlutterwaveDeposit(amount) {
        try {
            console.log('🔄 Checking Flutterwave SDK availability...');
            await loadFlutterwaveSDK();

            const userData = JSON.parse(localStorage.getItem('userData'));
            const token = localStorage.getItem('user_token');

            if (!userData || !token) {
                throw new Error('Please login to make a deposit');
            }

            const currency = userData.currency || 'KES';
            const limits = typeof getCurrencyLimits === 'function' ? getCurrencyLimits(currency) : { min: 5, max: 1000000 };
            const format = window.formatCurrency || ((amt, cur) => `${cur} ${parseFloat(amt).toFixed(2)}`);

            // Validate amount locally first
            if (amount < limits.min || amount > limits.max) {
                throw new Error(`Amount must be between ${format(limits.min, currency)} and ${format(limits.max, currency)}`);
            }

            console.log('🔄 Initializing Flutterwave deposit:', { amount, currency });

            const response = await fetch(`${API_BASE}/api/payments/flw-deposit-initialize`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ amount: parseFloat(amount) })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to initialize payment');
            }

            console.log('✅ Payment initialized on backend.');

            // Redirect user to Flutterwave hosted payment link
            if (data.data && data.data.payment_link) {
                console.log('Redirecting to Flutterwave checkout:', data.data.payment_link);
                window.location.href = data.data.payment_link;
            } else {
                throw new Error('No payment link returned by Flutterwave');
            }

        } catch (error) {
            console.error('❌ Flutterwave deposit error:', error);
            
            // Catch script load error (ad-blockers, regional blocks)
            if (error.message && error.message.includes('SDK failed to load')) {
                showNotification('Flutterwave SDK failed to load. If you use an ad-blocker, please disable it to make a deposit.', 'error');
            } else {
                showNotification(error.message || 'Failed to initiate deposit', 'error');
            }
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
            // Remove parameters from URL so they don't trigger verification on refresh
            const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.replaceState({ path: cleanUrl }, '', cleanUrl);

            if (status === 'successful') {
                console.log('🔍 Verifying Flutterwave payment on redirect:', { txRef, transactionId });
                showNotification('Verifying deposit. Please wait...', 'info');

                try {
                    const token = localStorage.getItem('user_token');
                    const response = await fetch(`${API_BASE}/api/payments/flw-deposit-verify`, {
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

                    console.log('✅ Payment verified successfully');

                    // Update balance display
                    if (typeof updateBalanceDisplay === 'function') {
                        updateBalanceDisplay(data.newBalance);
                    }

                    const userData = JSON.parse(localStorage.getItem('userData'));
                    const currency = userData?.currency || 'KES';
                    const format = window.formatCurrency || ((amt, cur) => `${cur} ${parseFloat(amt).toFixed(2)}`);
                    showNotification(`Deposit successful! Your new balance is ${format(data.newBalance, currency)}`, 'success');

                    if (typeof loadUserProfile === 'function') {
                        await loadUserProfile();
                    }

                    if (typeof closeDepositModal === 'function') {
                        closeDepositModal();
                    }

                } catch (error) {
                    console.error('❌ Verification error:', error);
                    showNotification(error.message || 'Failed to verify payment', 'error');
                }
            } else {
                console.warn('❌ Flutterwave payment failed/cancelled status:', status);
                showNotification(`Payment failed/cancelled with status: ${status}`, 'error');
            }
        }
    }

    // Helper: notification utility
    function showNotification(message, type = 'info') {
        if (typeof window.showSuccess === 'function' && type === 'success') {
            window.showSuccess('deposit-success', message);
        } else if (typeof window.showError === 'function' && type === 'error') {
            window.showError('deposit-error', message);
        } else {
            console.log(`[Notification] [${type}] ${message}`);
            // If custom notification UI doesn't exist, use simple alert/toast if available
            const toast = document.createElement('div');
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.right = '20px';
            toast.style.backgroundColor = type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196F3';
            toast.style.color = '#fff';
            toast.style.padding = '12px 24px';
            toast.style.borderRadius = '4px';
            toast.style.zIndex = '999999';
            toast.style.fontSize = '14px';
            toast.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
            toast.innerText = message;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 5000);
        }
    }

    // Export public endpoints
    if (typeof window !== 'undefined') {
        window.initiateFlutterwaveDeposit = initiateFlutterwaveDeposit;
    }

    // Run automatically on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkFlutterwaveRedirect);
    } else {
        checkFlutterwaveRedirect();
    }
})();

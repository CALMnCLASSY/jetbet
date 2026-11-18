/**
 * Crypto (USDT) Deposit Modal
 * Shared module — injects its own DOM/CSS (cd- prefix).
 * Exports window.openCryptoDepositModal({ presetAmount, lockAmount, onSuccess })
 */
(function () {
    const QR_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';

    // Resolve API base lazily at call time — do NOT cache at load.
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

    function getToken() {
        return localStorage.getItem('user_token') || localStorage.getItem('token');
    }

    function getCurrency() {
        if (typeof window.getUserCurrency === 'function') {
            return window.getUserCurrency();
        }
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            return userData.currency || 'USD';
        } catch {
            return 'USD';
        }
    }

    function fmt(amount, currency) {
        if (typeof window.formatCurrency === 'function') {
            return window.formatCurrency(amount, currency);
        }
        return `${currency} ${parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    const NETWORK_LOGOS = {
        trc20: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="#eb0029" d="M12 2L21 6.5 13.2 22 10.8 22 3 6.5 12 2zm0 3.2L6.3 7.4l5.7 11.4 5.7-11.4L12 5.2z"/></svg>',
        bep20: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="#f0b90b" d="M12 2l3.2 3.2L12 8.4 8.8 5.2 12 2zm-6.8 6.8L8.4 12l-3.2 3.2L2 12l3.2-3.2zm13.6 0L22 12l-3.2 3.2L15.6 12l3.2-3.2zM12 15.6l3.2 3.2L12 22l-3.2-3.2L12 15.6zm0-3.6L13.6 12 12 10.4 10.4 12 12 12z"/></svg>',
        erc20: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="#627eea" d="M12 1.5L5.5 12 12 16l6.5-4L12 1.5zM5.5 13.5L12 22l6.5-8.5L12 17.5l-6.5-4z"/></svg>'
    };

    const CSS = `
        #cd-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.82); display: none; align-items: center; justify-content: center; z-index: 999999; padding: 1rem; }
        #cd-overlay.cd-open { display: flex; }
        #cd-modal { background: rgba(20, 25, 40, 0.98); border: 1px solid rgba(48,252,190,0.25); border-radius: 16px; width: 100%; max-width: 520px; max-height: 92vh; overflow-y: auto; color: #e8e8e8; font-family: inherit; box-shadow: 0 12px 48px rgba(0,0,0,0.6); }
        #cd-head { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(255,193,7,0.2); position: sticky; top: 0; background: rgba(20,25,40,0.98); z-index: 2; }
        #cd-head h3 { margin: 0; color: #ffc107; font-size: 1.15rem; }
        #cd-close { background: none; border: none; color: #999; font-size: 1.6rem; cursor: pointer; line-height: 1; padding: 0 4px; }
        #cd-close:hover { color: #fff; }
        #cd-body { padding: 1.5rem; }
        .cd-label { color: #999; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 0.5rem; }
        #cd-amount { width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,193,7,0.35); border-radius: 8px; color: #ffc107; font-size: 1.1rem; font-weight: 700; padding: 0.8rem 1rem; outline: none; }
        #cd-amount:focus { border-color: #ffc107; }
        #cd-amount.cd-locked { opacity: 0.75; cursor: not-allowed; }
        #cd-usdt { color: #30fcbe; font-size: 0.95rem; font-weight: 600; margin: 0.5rem 0 0; }
        #cd-limits { color: #888; font-size: 0.78rem; margin: 0.35rem 0 0; }
        .cd-net { display: flex; align-items: center; gap: 0.75rem; background: rgba(255,255,255,0.04); border: 1.5px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 0.8rem 0.9rem; margin-bottom: 0.6rem; cursor: pointer; position: relative; transition: border-color 0.2s, background 0.2s; }
        .cd-net:hover { border-color: rgba(48,252,190,0.5); }
        .cd-net.cd-sel { border-color: #30fcbe; background: rgba(48,252,190,0.08); }
        .cd-net-name { font-weight: 700; color: #fff; font-size: 0.95rem; }
        .cd-net-fee { color: #999; font-size: 0.75rem; margin-left: auto; text-align: right; }
        .cd-best { position: absolute; top: -9px; right: 10px; background: #30fcbe; color: #000; font-size: 0.62rem; font-weight: 800; padding: 2px 8px; border-radius: 8px; letter-spacing: 0.05em; }
        #cd-addr-row { display: flex; gap: 0.6rem; align-items: stretch; }
        #cd-addr { flex: 1; min-width: 0; background: rgba(0,0,0,0.35); border: 1px solid rgba(48,252,190,0.3); border-radius: 8px; color: #30fcbe; font-family: 'Courier New', monospace; font-size: 0.8rem; padding: 0.85rem; word-break: break-all; display: flex; align-items: center; }
        #cd-copy { background: rgba(48,252,190,0.15); border: 1px solid #30fcbe; color: #30fcbe; border-radius: 8px; padding: 0 0.9rem; cursor: pointer; font-weight: 700; white-space: nowrap; }
        #cd-copy:hover { background: rgba(48,252,190,0.28); }
        #cd-qr-wrap { display: flex; justify-content: center; padding: 0.9rem; background: #fff; border-radius: 10px; margin-top: 0.75rem; }
        #cd-qr-wrap.cd-hidden { display: none; }
        #cd-txhash { width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: #e8e8e8; font-size: 0.85rem; padding: 0.75rem 0.9rem; outline: none; }
        #cd-txhash:focus { border-color: #30fcbe; }
        .cd-warn { background: rgba(255,152,0,0.09); border: 1px solid rgba(255,152,0,0.3); border-radius: 8px; color: #ffa726; font-size: 0.8rem; padding: 0.8rem 0.9rem; margin-top: 1rem; line-height: 1.5; }
        #cd-error { display: none; background: rgba(231,76,60,0.12); border: 1px solid rgba(231,76,60,0.4); border-radius: 8px; color: #ff8a80; font-size: 0.85rem; padding: 0.7rem 0.9rem; margin-top: 1rem; }
        #cd-submit { width: 100%; margin-top: 1.25rem; padding: 0.9rem; border: none; border-radius: 10px; background: linear-gradient(135deg, #30fcbe, #28d1a0); color: #000; font-weight: 800; font-size: 0.95rem; cursor: pointer; letter-spacing: 0.03em; }
        #cd-submit:disabled { opacity: 0.55; cursor: not-allowed; }
        .cd-success { text-align: center; padding: 0.5rem 0; }
        .cd-success-icon { font-size: 3rem; color: #30fcbe; }
        #cd-ref { display: inline-block; background: rgba(48,252,190,0.1); border: 1px dashed rgba(48,252,190,0.5); border-radius: 8px; color: #30fcbe; font-family: 'Courier New', monospace; padding: 0.6rem 1rem; margin-top: 0.75rem; font-size: 0.9rem; }
        .cd-muted { color: #999; font-size: 0.85rem; line-height: 1.6; }
        .cd-loading { text-align: center; color: #999; padding: 2.5rem 0; }
    `;

    const state = {
        options: null,
        network: 'trc20',
        lockAmount: false,
        onSuccess: null,
        submitting: false,
        qrLoaded: false,
        qrFailed: false
    };

    function el(id) { return document.getElementById(id); }

    function ensureDom() {
        if (el('cd-overlay')) return;

        const style = document.createElement('style');
        style.id = 'cd-styles';
        style.textContent = CSS;
        document.head.appendChild(style);

        const overlay = document.createElement('div');
        overlay.id = 'cd-overlay';
        overlay.innerHTML = `
            <div id="cd-modal">
                <div id="cd-head">
                    <h3>Deposit via Crypto (USDT)</h3>
                    <button id="cd-close" type="button">&times;</button>
                </div>
                <div id="cd-body"><div class="cd-loading">Loading deposit options…</div></div>
            </div>`;
        document.body.appendChild(overlay);

        el('cd-close').addEventListener('click', closeCryptoDepositModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeCryptoDepositModal();
        });
    }

    function selectedNetwork() {
        return (state.options?.networks || []).find(n => n.id === state.network)
            || state.options?.networks?.[0];
    }

    function usdtEstimate() {
        const amt = parseFloat(el('cd-amount')?.value) || 0;
        const rate = state.options?.unitsPerUsd || 0;
        if (!amt || !rate) return null;
        return amt / rate;
    }

    function renderUsdtLine() {
        const est = usdtEstimate();
        const cur = state.options?.currency || getCurrency();
        el('cd-usdt').textContent = est
            ? `≈ ${est.toFixed(2)} USDT to send`
            : `Enter an amount in ${cur} to see the USDT equivalent`;
    }

    function renderForm() {
        const opts = state.options;
        const cur = opts.currency || getCurrency();
        const limits = opts.limits || { min: 0, max: 0 };

        el('cd-body').innerHTML = `
            <p class="cd-label">Amount (${cur})</p>
            <input type="number" id="cd-amount" min="${limits.min}" max="${limits.max}"
                placeholder="Enter amount" ${state.lockAmount ? 'readonly' : ''}
                class="${state.lockAmount ? 'cd-locked' : ''}">
            <p id="cd-usdt"></p>
            <p id="cd-limits">Min: ${fmt(limits.min, cur)} | Max: ${fmt(limits.max, cur)}</p>

            <p class="cd-label" style="margin-top:1.25rem;">Select network</p>
            <div id="cd-networks">
                ${opts.networks.map(n => `
                    <div class="cd-net${n.id === state.network ? ' cd-sel' : ''}" data-net="${n.id}">
                        ${n.recommended ? '<span class="cd-best">BEST</span>' : ''}
                        ${NETWORK_LOGOS[n.id] || ''}
                        <span class="cd-net-name">${n.label}</span>
                        <span class="cd-net-fee">Fee ${n.feeHint}<br>${n.token}</span>
                    </div>`).join('')}
            </div>

            <p class="cd-label" style="margin-top:1.25rem;">Send USDT to</p>
            <div id="cd-addr-row">
                <div id="cd-addr"></div>
                <button id="cd-copy" type="button">Copy</button>
            </div>
            <div id="cd-qr-wrap"><div id="cd-qr"></div></div>

            <p class="cd-label" style="margin-top:1.25rem;">Transaction hash <span style="text-transform:none; color:#666;">(optional — speeds up verification)</span></p>
            <input type="text" id="cd-txhash" placeholder="Paste txid after sending" autocomplete="off">

            <div class="cd-warn">
                <strong>Warning:</strong> Send <strong>USDT only</strong> on the selected network.
                Other coins or the wrong network <strong>cannot be recovered</strong>.
                Crypto transfers are irreversible — always verify the address before sending.
            </div>

            <div id="cd-error"></div>
            <button id="cd-submit" type="button">I'VE SENT FUNDS</button>
        `;

        const amountEl = el('cd-amount');
        amountEl.addEventListener('input', renderUsdtLine);
        if (state.presetAmount != null) {
            amountEl.value = state.presetAmount;
        }
        renderUsdtLine();

        el('cd-networks').addEventListener('click', (e) => {
            const card = e.target.closest('.cd-net');
            if (!card) return;
            state.network = card.dataset.net;
            document.querySelectorAll('.cd-net').forEach(c =>
                c.classList.toggle('cd-sel', c.dataset.net === state.network));
            renderAddress();
        });

        el('cd-copy').addEventListener('click', copyAddress);
        el('cd-submit').addEventListener('click', submitDeposit);
        renderAddress();
    }

    function renderAddress() {
        const net = selectedNetwork();
        if (!net) return;
        el('cd-addr').textContent = net.address;
        renderQr(net.address);
    }

    function renderQr(text) {
        const wrap = el('cd-qr-wrap');
        const qrEl = el('cd-qr');
        if (state.qrFailed) { wrap.classList.add('cd-hidden'); return; }

        const draw = () => {
            try {
                qrEl.innerHTML = '';
                new QRCode(qrEl, { text, width: 140, height: 140 });
                wrap.classList.remove('cd-hidden');
            } catch {
                wrap.classList.add('cd-hidden');
            }
        };

        if (state.qrLoaded) { draw(); return; }

        const script = document.createElement('script');
        script.src = QR_CDN;
        script.onload = () => { state.qrLoaded = true; draw(); };
        script.onerror = () => { state.qrFailed = true; wrap.classList.add('cd-hidden'); };
        document.head.appendChild(script);
    }

    function copyAddress() {
        const net = selectedNetwork();
        if (!net) return;
        const btn = el('cd-copy');
        navigator.clipboard.writeText(net.address).then(() => {
            btn.textContent = 'Copied!';
            setTimeout(() => { btn.textContent = 'Copy'; }, 1800);
        }).catch(() => showError('Failed to copy address'));
    }

    function showError(msg) {
        const err = el('cd-error');
        if (err) { err.textContent = msg; err.style.display = 'block'; }
    }

    async function submitDeposit() {
        if (state.submitting) return;
        const net = selectedNetwork();
        const amount = parseFloat(el('cd-amount').value);
        const limits = state.options?.limits || {};
        const cur = state.options?.currency || getCurrency();
        const txHash = el('cd-txhash').value.trim() || undefined;
        const err = el('cd-error');
        err.style.display = 'none';

        if (isNaN(amount) || amount < limits.min || amount > limits.max) {
            return showError(`Amount must be between ${fmt(limits.min, cur)} and ${fmt(limits.max, cur)}`);
        }

        const token = getToken();
        if (!token) return showError('Please log in to make a deposit.');

        state.submitting = true;
        const btn = el('cd-submit');
        btn.disabled = true;
        btn.textContent = 'SUBMITTING…';

        try {
            const res = await fetch(`${getApiBase()}/api/payments/crypto-deposit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ amount, network: net.id, txHash })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to submit deposit');
            }
            renderSuccess(data);
            if (typeof state.onSuccess === 'function') {
                state.onSuccess(data);
            }
        } catch (e) {
            showError(e.message || 'Failed to submit deposit');
        } finally {
            state.submitting = false;
            btn.disabled = false;
            btn.textContent = "I'VE SENT FUNDS";
        }
    }

    function renderSuccess(data) {
        const cur = state.options?.currency || getCurrency();
        el('cd-body').innerHTML = `
            <div class="cd-success">
                <div class="cd-success-icon">✓</div>
                <h4 style="color:#30fcbe; margin:0.5rem 0;">Deposit submitted</h4>
                <p class="cd-muted">Your deposit of <strong style="color:#ffc107;">${fmt(data.amount, cur)}</strong>
                    (${selectedNetwork()?.label || data.network}) is <strong>pending verification</strong>.<br>
                    We typically credit deposits within 5–30 minutes.</p>
                <p class="cd-label" style="margin-top:1rem;">Your reference</p>
                <div id="cd-ref">${data.reference}</div>
                <p class="cd-muted" style="margin-top:1rem;">Keep this reference — share it with support if your
                    deposit takes longer than expected.</p>
                <button id="cd-done" type="button"
                    style="margin-top:1.25rem; width:100%; padding:0.85rem; border:none; border-radius:10px; background:linear-gradient(135deg,#30fcbe,#28d1a0); color:#000; font-weight:800; cursor:pointer;">DONE</button>
            </div>`;
        el('cd-done').addEventListener('click', closeCryptoDepositModal);
    }

    async function openCryptoDepositModal(opts = {}) {
        ensureDom();
        state.presetAmount = opts.presetAmount != null ? parseFloat(opts.presetAmount) : null;
        state.lockAmount = !!opts.lockAmount;
        state.onSuccess = opts.onSuccess || null;
        state.network = 'trc20';
        state.submitting = false;

        el('cd-overlay').classList.add('cd-open');
        document.body.style.overflow = 'hidden';
        el('cd-body').innerHTML = '<div class="cd-loading">Loading deposit options…</div>';

        const token = getToken();
        if (!token) {
            el('cd-body').innerHTML = '<div class="cd-loading">Please log in to make a deposit.</div>';
            return;
        }

        try {
            const res = await fetch(`${getApiBase()}/api/payments/crypto-options`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok || !data.networks) {
                throw new Error(data.error || 'Failed to load deposit options');
            }
            state.options = data;
            if (!data.networks.some(n => n.id === state.network)) {
                state.network = data.networks[0].id;
            }
            renderForm();
        } catch (e) {
            el('cd-body').innerHTML = `<div class="cd-loading" style="color:#ff8a80;">${e.message || 'Failed to load deposit options'}</div>`;
        }
    }

    function closeCryptoDepositModal() {
        el('cd-overlay')?.classList.remove('cd-open');
        document.body.style.overflow = '';
    }

    window.openCryptoDepositModal = openCryptoDepositModal;
    window.closeCryptoDepositModal = closeCryptoDepositModal;
})();

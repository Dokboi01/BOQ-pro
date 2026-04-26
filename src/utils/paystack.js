/**
 * Paystack checkout helper.
 *
 * The secure flow is:
 * 1. Initialize the transaction from our backend `/api/paystack-initialize-subscription`
 * 2. Open the hosted Paystack checkout URL in a popup
 * 3. Poll `/api/paystack-verify-subscription` until the payment is confirmed
 *
 * The secret key never enters the client.
 */

const PENDING_PAYSTACK_CHECKOUT_KEY = 'boq_pro_pending_paystack_checkout';
const POLL_INTERVAL_MS = 2500;
const MAX_POLL_DURATION_MS = 10 * 60 * 1000;

function getApiBaseUrl() {
    return (import.meta.env.VITE_PAYSTACK_API_BASE_URL || '').replace(/\/+$/, '');
}

function buildApiUrl(path) {
    const base = getApiBaseUrl();
    return base ? `${base}${path}` : path;
}

async function postJson(path, body) {
    const response = await fetch(buildApiUrl(path), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload?.error || 'Paystack request failed.');
    }

    return payload;
}

function savePendingCheckoutSession(session) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PENDING_PAYSTACK_CHECKOUT_KEY, JSON.stringify(session));
}

function clearPendingCheckoutSession() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(PENDING_PAYSTACK_CHECKOUT_KEY);
}

export function readPendingCheckoutSession() {
    if (typeof window === 'undefined') return null;

    try {
        const raw = window.localStorage.getItem(PENDING_PAYSTACK_CHECKOUT_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export async function verifyPendingPaystackCheckout({ allowPending = false } = {}) {
    const session = readPendingCheckoutSession();
    if (!session?.reference) return null;

    const result = await postJson('/api/paystack-verify-subscription', {
        reference: session.reference,
    });

    if (result?.verified) {
        clearPendingCheckoutSession();
    } else {
        const status = String(result?.status || '').toLowerCase();
        if (!allowPending && ['failed', 'abandoned', 'reversed', 'closed'].includes(status)) {
            clearPendingCheckoutSession();
        }
    }

    return {
        ...result,
        session,
    };
}

function openCenteredPopup(url, title = 'Paystack Checkout') {
    if (typeof window === 'undefined') {
        throw new Error('Paystack checkout can only run in the browser.');
    }

    const width = 520;
    const height = 760;
    const dualScreenLeft = window.screenLeft ?? window.screenX ?? 0;
    const dualScreenTop = window.screenTop ?? window.screenY ?? 0;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || screen.width;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || screen.height;
    const left = Math.max(0, dualScreenLeft + (viewportWidth - width) / 2);
    const top = Math.max(0, dualScreenTop + (viewportHeight - height) / 2);

    const popup = window.open(
        url,
        title,
        `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!popup) {
        window.location.assign(url);
        return null;
    }

    popup.focus?.();
    return popup;
}

/**
 * Starts a verified Paystack checkout for an authenticated user.
 */
export async function paystackCheckout({
    email,
    userId,
    planName = '',
    billing = 'monthly',
    onSuccess,
    onCancel,
}) {
    if (!email) throw new Error('Customer email is required for Paystack checkout.');
    if (!userId) throw new Error('You must be signed in before starting a paid checkout.');

    const initPayload = await postJson('/api/paystack-initialize-subscription', {
        email,
        userId,
        planName,
        billingCycle: billing,
        origin: typeof window !== 'undefined' ? window.location.origin : null,
    });

    const session = {
        planName,
        billing,
        email,
        userId,
        reference: initPayload.reference,
        createdAt: new Date().toISOString(),
    };
    savePendingCheckoutSession(session);

    const popup = openCenteredPopup(initPayload.authorizationUrl);
    const startedAt = Date.now();

    return new Promise((resolve, reject) => {
        let finished = false;

        const finish = (fn) => (payload) => {
            if (finished) return;
            finished = true;
            clearInterval(intervalId);
            clearPendingCheckoutSession();
            if (popup && !popup.closed) {
                popup.close();
            }
            fn(payload);
        };

        const succeed = finish(async (payload) => {
            if (onSuccess) {
                await onSuccess(payload);
            }
            resolve(payload);
        });

        const cancel = finish((payload) => {
            if (onCancel) onCancel(payload);
            resolve(payload || null);
        });

        const fail = finish((error) => {
            reject(error instanceof Error ? error : new Error(String(error)));
        });

        const checkVerification = async (allowPending = true) => {
            try {
                const result = await postJson('/api/paystack-verify-subscription', {
                    reference: initPayload.reference,
                });

                if (result?.verified) {
                    return succeed(result);
                }

                const status = String(result?.status || '').toLowerCase();
                if (allowPending && ['pending', 'ongoing', 'processing', 'queued', ''].includes(status)) {
                    return null;
                }

                if (status === 'failed' || status === 'abandoned' || status === 'reversed') {
                    return cancel(result);
                }

                return null;
            } catch (error) {
                const popupClosed = !popup || popup.closed;
                if (popupClosed) {
                    fail(error);
                }
                return null;
            }
        };

        const intervalId = window.setInterval(async () => {
            if (Date.now() - startedAt > MAX_POLL_DURATION_MS) {
                return cancel({ status: 'timeout' });
            }

            await checkVerification(true);

            if (popup && popup.closed) {
                await checkVerification(false);
                if (!finished) {
                    cancel({ status: 'closed' });
                }
            }
        }, POLL_INTERVAL_MS);
    });
}

export function isPaystackConfigured() {
    return !!import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
}

export function formatNaira(kobo) {
    if (kobo === null || kobo === undefined) return 'Custom';
    if (kobo === 0) return 'Free';
    return `₦${(kobo / 100).toLocaleString()}`;
}

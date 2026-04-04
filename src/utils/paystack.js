/**
 * Paystack Inline Checkout Utility
 *
 * Loads the Paystack Inline JS SDK and exposes a `checkout()` function
 * that opens the hosted payment popup.
 *
 * The public key is read from VITE_PAYSTACK_PUBLIC_KEY in .env.
 * Amounts must be in **kobo** (NGN subunit: ₦1 = 100 kobo).
 */

const PAYSTACK_SCRIPT_URL = 'https://js.paystack.co/v2/inline.js';

let scriptLoaded = false;
let scriptLoadPromise = null;

/**
 * Dynamically load the Paystack Inline script if not already present.
 */
function loadPaystackScript() {
    if (scriptLoaded) return Promise.resolve();
    if (scriptLoadPromise) return scriptLoadPromise;

    scriptLoadPromise = new Promise((resolve, reject) => {
        // Check if already in the page
        if (window.PaystackPop) {
            scriptLoaded = true;
            resolve();
            return;
        }

        const existingScript = document.querySelector(`script[src="${PAYSTACK_SCRIPT_URL}"]`);
        if (existingScript) {
            existingScript.addEventListener('load', () => { scriptLoaded = true; resolve(); });
            existingScript.addEventListener('error', reject);
            return;
        }

        const script = document.createElement('script');
        script.src = PAYSTACK_SCRIPT_URL;
        script.async = true;
        script.onload = () => { scriptLoaded = true; resolve(); };
        script.onerror = () => reject(new Error('Failed to load Paystack script.'));
        document.head.appendChild(script);
    });

    return scriptLoadPromise;
}

/**
 * Open the Paystack Inline checkout popup.
 *
 * @param {Object} options
 * @param {string} options.email – Customer email (required by Paystack)
 * @param {number} options.amount – Amount in **kobo** (e.g. 1500000 = ₦15,000)
 * @param {string} [options.planName] – Plan name for metadata
 * @param {string} [options.billing] – 'monthly' | 'annual'
 * @param {string} [options.reference] – Custom transaction reference
 * @param {function} options.onSuccess – Called with transaction object on success
 * @param {function} [options.onCancel] – Called when user closes the popup
 * @param {Object} [options.metadata] – Extra metadata to attach to the transaction
 * @returns {Promise<void>}
 */
export async function paystackCheckout({
    email,
    amount,
    planName = '',
    billing = 'monthly',
    reference,
    onSuccess,
    onCancel,
    metadata = {}
}) {
    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (!publicKey) {
        throw new Error('Paystack public key not configured. Add VITE_PAYSTACK_PUBLIC_KEY to your .env file.');
    }

    if (!email) throw new Error('Customer email is required for Paystack checkout.');
    if (!amount || amount <= 0) throw new Error('Amount must be greater than zero.');

    await loadPaystackScript();

    if (!window.PaystackPop) {
        throw new Error('Paystack SDK did not load correctly.');
    }

    const ref = reference || `boqpro_${planName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const handler = window.PaystackPop.setup({
        key: publicKey,
        email,
        amount,
        currency: 'NGN',
        ref,
        metadata: {
            plan_name: planName,
            billing_period: billing,
            custom_fields: [
                { display_name: 'Plan', variable_name: 'plan', value: planName },
                { display_name: 'Billing', variable_name: 'billing', value: billing }
            ],
            ...metadata
        },
        callback: (transaction) => {
            // Transaction was successful
            console.log('✅ Paystack transaction successful:', transaction);
            if (onSuccess) onSuccess({ ...transaction, planName, billing, reference: ref });
        },
        onClose: () => {
            console.log('🚪 Paystack popup closed');
            if (onCancel) onCancel();
        }
    });

    handler.openIframe();
}

/**
 * Check if Paystack is configured (public key exists).
 */
export function isPaystackConfigured() {
    return !!import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
}

/**
 * Format kobo amount to display Naira string.
 * @param {number} kobo
 * @returns {string}
 */
export function formatNaira(kobo) {
    if (kobo === null || kobo === undefined) return 'Custom';
    if (kobo === 0) return 'Free';
    return `₦${(kobo / 100).toLocaleString()}`;
}

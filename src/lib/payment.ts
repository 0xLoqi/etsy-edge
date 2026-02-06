import ExtPay from "extpay";

// Initialize with your ExtensionPay extension ID.
// Register at https://extensionpay.com and create an extension to get this ID.
const EXTENSION_PAY_ID = "etsy-edge";

let extpay: ReturnType<typeof ExtPay> | null = null;

function getExtPay() {
  if (!extpay) {
    extpay = ExtPay(EXTENSION_PAY_ID);
  }
  return extpay;
}

/**
 * Start ExtensionPay background listener. Call once in the background service worker.
 */
export function initPayment() {
  getExtPay().startBackground();
}

/**
 * Check if the current user has an active paid subscription.
 */
export async function isPaidUser(): Promise<boolean> {
  try {
    const user = await getExtPay().getUser();
    return user.paid;
  } catch {
    // If ExtPay fails (not configured yet), treat as free user
    return false;
  }
}

/**
 * Get full user payment info.
 */
export async function getPaymentUser() {
  try {
    return await getExtPay().getUser();
  } catch {
    return null;
  }
}

/**
 * Open the ExtensionPay payment page for the user to subscribe.
 */
export function openPaymentPage() {
  getExtPay().openPaymentPage();
}

/**
 * Open the ExtensionPay management page (cancel, update payment, etc).
 */
export function openManagementPage() {
  getExtPay().openPaymentPage();
}

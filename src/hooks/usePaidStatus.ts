import { useState, useEffect } from "react";

/**
 * Hook to check paid status via the background service worker.
 */
export function usePaidStatus() {
  const [isPaid, setIsPaid] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    browser.runtime
      .sendMessage({ type: "CHECK_PAID_STATUS" })
      .then((response) => {
        if (response?.success) {
          setIsPaid(response.data.paid);
        }
      })
      .catch(() => {
        setIsPaid(false);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const openUpgrade = () => {
    browser.runtime.sendMessage({ type: "OPEN_PAYMENT_PAGE" });
  };

  return { isPaid, loading, openUpgrade };
}

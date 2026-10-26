// Page code shared with App.jsx's lazy routes. Calling one early downloads the
// page's chunk ahead of time, so the route opens without a loading skeleton.
export const loadVendorPage = () => import('../pages/VendorPage');
export const loadCheckoutPage = () => import('../pages/CheckoutPage');
export const loadVendorsPage = () => import('../pages/VendorsPage');

/** Fetch the pages customers usually open next once the browser is idle. */
export function preloadCustomerPages() {
  const run = () => {
    loadVendorPage();
    loadVendorsPage();
    loadCheckoutPage();
  };
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 4000 });
  else window.setTimeout(run, 2000);
}

const KEY = 'billing_customers';

export function loadCustomers() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

const KEY = 'billing_orders';

const CUSTOMER_NAMES = [
  'Murugan K', 'Karthik Raja', 'Priya Sundaram', 'Suresh Kumar', 'Anitha Ramesh',
  'Saravanan M', 'Vijay Prakash', 'Lakshmi Narayanan', 'Deepak Chandran', 'Meena Kumari',
  'Ganesh Moorthy', 'Senthil Velo', 'Bhavani Shankar', 'Dinesh Kumar', 'Divya Prabha',
  'Venkatesh S', 'Arun Prasath', 'Revathi Sekar', 'Balaji R', 'Kavitha Nathan'
];

const TOWNS = ['Sivakasi', 'Madurai', 'Chennai', 'Coimbatore', 'Salem', 'Tiruchirappalli', 'Tirunelveli', 'Erode', 'Vellore', 'Thanjavur'];

function generateInitialOrders() {
  const orders = [];
  const statusCounts = {
    unpaid: 27,
    inprogress: 12,
    packed: 61,
    completed: 55,
    deleted: 23
  };

  const statuses = [];
  Object.entries(statusCounts).forEach(([status, count]) => {
    for (let i = 0; i < count; i++) {
      statuses.push(status);
    }
  });

  // Dates spanning 2025-08-28 to 2026-07-22
  const startDate = new Date('2025-08-28').getTime();
  const endDate = new Date('2026-07-22').getTime();
  const timeStep = (endDate - startDate) / 178;

  statuses.forEach((status, i) => {
    const orderTimestamp = new Date(startDate + i * timeStep + (Math.random() * 86400000 - 43200000));
    const dateStr = orderTimestamp.toISOString().split('T')[0];
    const customer = CUSTOMER_NAMES[i % CUSTOMER_NAMES.length];
    const town = TOWNS[i % TOWNS.length];
    const mobile = `9842${Math.floor(10005 + i * 47).toString().padStart(6, '0')}`;
    const amount = Math.floor(Math.random() * 8500) * 10 + 1500; // Realistic order amounts ₹1,500 - ₹85,000

    orders.push({
      _id: `ORD-${2025000 + i + 1}`,
      orderNumber: `FW-${2025000 + i + 1}`,
      date: dateStr,
      timestamp: orderTimestamp.toISOString(),
      customer: {
        name: customer,
        mobile: mobile,
        address: `Door No. ${12 + (i % 80)}, Main Road, ${town}, Tamil Nadu`,
        pincode: `${626001 + (i % 20)}`
      },
      items: [
        { name: '10 CM Electric Sparklers', qty: 5, price: 40, total: 200 },
        { name: 'Flower Pot Special', qty: 3, price: 90, total: 270 },
        { name: 'Ground Chakkar Deluxe', qty: 2, price: 70, total: 140 },
        { name: 'Atom Bomb', qty: 2, price: 100, total: 200 },
        { name: '1000 Wala', qty: 1, price: 850, total: 850 }
      ],
      subTotal: amount,
      discount: Math.floor(amount * 0.1),
      grandTotal: Math.floor(amount * 0.9),
      paymentMethod: i % 2 === 0 ? 'UPI / GPay' : 'Bank Transfer',
      status: status, // unpaid, inprogress, packed, completed, deleted
      notes: i % 5 === 0 ? 'Handle with care. Express delivery.' : ''
    });
  });

  return orders;
}

export function loadOrders() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const initial = generateInitialOrders();
      localStorage.setItem(KEY, JSON.stringify(initial));
      return initial;
    }
    const orders = JSON.parse(raw);
    if (!Array.isArray(orders) || orders.length === 0) {
      const initial = generateInitialOrders();
      localStorage.setItem(KEY, JSON.stringify(initial));
      return initial;
    }
    return orders;
  } catch (e) {
    return generateInitialOrders();
  }
}

export function saveOrders(orders) {
  localStorage.setItem(KEY, JSON.stringify(orders));
}

export function updateOrderStatus(orderNumber, status) {
  const orders = loadOrders();
  const idx = orders.findIndex(o => o.orderNumber === orderNumber || o._id === orderNumber);
  if (idx !== -1) {
    orders[idx].status = status;
    saveOrders(orders);
  }
  return orders;
}

export function addOrder(newOrder) {
  const orders = loadOrders();
  orders.unshift(newOrder);
  saveOrders(orders);
  return orders;
}

export function deleteOrder(orderNumber) {
  const orders = loadOrders();
  const idx = orders.findIndex(o => o.orderNumber === orderNumber || o._id === orderNumber);
  if (idx !== -1) {
    orders[idx].status = 'deleted';
    saveOrders(orders);
  }
  return orders;
}

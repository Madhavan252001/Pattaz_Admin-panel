const PRODUCTS_KEY = 'fireworks_admin_products_catalog';

const initialCatalog = [
  {
    id: 'sparklers',
    name: 'Sparklers – கம்பி மத்தாப்பு',
    prefix: 'SPK',
    basePrice: 40,
    products: [
      { id: 'spk-1', name: '7 CM Electric Sparklers', price: 40, stock: true },
      { id: 'spk-2', name: '10 CM Electric Sparklers', price: 50, stock: true },
      { id: 'spk-3', name: '15 CM Electric Sparklers', price: 70, stock: true },
      { id: 'spk-4', name: '30 CM Electric Sparklers', price: 120, stock: true },
      { id: 'spk-5', name: '10 CM Colour Sparklers', price: 60, stock: true },
      { id: 'spk-6', name: '30 CM Colour Sparklers', price: 140, stock: true },
      { id: 'spk-7', name: 'Golden Sparklers', price: 90, stock: true }
    ]
  },
  {
    id: 'flower-pots',
    name: 'Flower Pots – பூச்சட்டி',
    prefix: 'FLP',
    basePrice: 90,
    products: [
      { id: 'flp-1', name: 'Flower Pot Small', price: 90, stock: true },
      { id: 'flp-2', name: 'Flower Pot Big', price: 130, stock: true },
      { id: 'flp-3', name: 'Flower Pot Special', price: 180, stock: true },
      { id: 'flp-4', name: 'Flower Pot Deluxe', price: 240, stock: true },
      { id: 'flp-5', name: 'Colour Flower Pot', price: 210, stock: true },
      { id: 'flp-6', name: 'Crackling Flower Pot', price: 260, stock: true }
    ]
  },
  {
    id: 'ground-chakkars',
    name: 'Ground Chakkars – தரைச் சக்கரம்',
    prefix: 'GRC',
    basePrice: 70,
    products: [
      { id: 'grc-1', name: 'Ground Chakkar Small', price: 70, stock: true },
      { id: 'grc-2', name: 'Ground Chakkar Big', price: 110, stock: true },
      { id: 'grc-3', name: 'Ground Chakkar Special', price: 150, stock: true },
      { id: 'grc-4', name: 'Ground Chakkar Deluxe', price: 200, stock: true },
      { id: 'grc-5', name: 'Disco Chakkar', price: 220, stock: true },
      { id: 'grc-6', name: 'Spinner Chakkar', price: 180, stock: true }
    ]
  },
  {
    id: 'twinkling-stars',
    name: 'Twinkling Stars – மின்னும் நட்சத்திரம்',
    prefix: 'TWS',
    basePrice: 60,
    products: [
      { id: 'tws-1', name: '1½ Feet Twinkling Star', price: 60, stock: true },
      { id: 'tws-2', name: '2 Feet Twinkling Star', price: 90, stock: true },
      { id: 'tws-3', name: '4 Feet Twinkling Star', price: 160, stock: true },
      { id: 'tws-4', name: 'Colour Twinkling Star', price: 110, stock: true }
    ]
  },
  {
    id: 'rockets',
    name: 'Rockets – ராக்கெட்',
    prefix: 'RCK',
    basePrice: 150,
    products: [
      { id: 'rck-1', name: 'Baby Rocket', price: 100, stock: true },
      { id: 'rck-2', name: 'Colour Rocket', price: 150, stock: true },
      { id: 'rck-3', name: 'Whistling Rocket', price: 220, stock: true },
      { id: 'rck-4', name: 'Lunik Rocket', price: 280, stock: true },
      { id: 'rck-5', name: 'Sky Shot Rocket', price: 350, stock: true }
    ]
  },
  {
    id: 'bombs',
    name: 'Bombs – வெடி',
    prefix: 'BMB',
    basePrice: 100,
    products: [
      { id: 'bmb-1', name: 'Atom Bomb', price: 80, stock: true },
      { id: 'bmb-2', name: 'Bullet Bomb', price: 100, stock: true },
      { id: 'bmb-3', name: 'Lakshmi Bomb', price: 90, stock: true },
      { id: 'bmb-4', name: 'Hydro Bomb', price: 140, stock: true },
      { id: 'bmb-5', name: 'King Bomb', price: 200, stock: true }
    ]
  },
  {
    id: 'garlands',
    name: 'Garlands / Wala – சரவெடி',
    prefix: 'GRL',
    basePrice: 200,
    products: [
      { id: 'grl-1', name: '28 Wala', price: 70, stock: true },
      { id: 'grl-2', name: '56 Wala', price: 130, stock: true },
      { id: 'grl-3', name: '100 Wala', price: 220, stock: true },
      { id: 'grl-4', name: '1000 Wala', price: 850, stock: true },
      { id: 'grl-5', name: '5000 Wala', price: 3800, stock: true },
      { id: 'grl-6', name: '10000 Wala', price: 7500, stock: true }
    ]
  }
];

export function getCategories() {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    return raw ? JSON.parse(raw) : initialCatalog;
  } catch {
    return initialCatalog;
  }
}

export function saveCategories(catalog) {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(catalog));
}

export function getAllProducts() {
  const categories = getCategories();
  const list = [];
  categories.forEach(cat => {
    cat.products.forEach(p => {
      list.push({
        ...p,
        categoryId: cat.id,
        categoryName: cat.name
      });
    });
  });
  return list;
}

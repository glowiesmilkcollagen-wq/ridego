import { LatLng } from './geo';

export type Store = {
  id: string;
  name: string;
  /** Short description shown under the name, e.g. "Pharmacy · Open 24 hours". */
  tagline: string;
  category: Category;
  emoji: string;
  tint: string;
  rating: number;
  /** Typical time at the counter, in minutes, before the rider has the items. */
  waitMinutes: number;
  location: LatLng;
  address: string;
  /** Commonly bought items, shown as quick-add suggestions. Prices are not tracked: the rider pays at the store. */
  favorites: string[];
};

export type Category = 'Food' | 'Medicine' | 'Groceries' | 'Convenience' | 'Hardware' | 'Gifts' | 'Pets';
export const CATEGORIES: { key: Category; emoji: string; example: string }[] = [
  { key: 'Food', emoji: '🍔', example: 'e.g. 2pc Chicken with rice, spicy' },
  { key: 'Medicine', emoji: '💊', example: 'e.g. Paracetamol 500mg, 10 tablets' },
  { key: 'Groceries', emoji: '🛒', example: 'e.g. Eggs, 1 tray' },
  { key: 'Convenience', emoji: '🏪', example: 'e.g. Bottled water 1L, 2 pcs' },
  { key: 'Hardware', emoji: '🔧', example: 'e.g. LED bulb 9W, 2 pcs' },
  { key: 'Gifts', emoji: '💐', example: 'e.g. Bouquet of red roses' },
  { key: 'Pets', emoji: '🐾', example: 'e.g. Dog food 3kg, adult' },
];
export const DEFAULT_ITEM_EXAMPLE = 'e.g. 1 pack of AA batteries';

/** Starter stores. The apps load stores from the database; this list only generates supabase/seed.sql. */
export const STORES: Store[] = [
  // Food
  {
    id: 'r1', name: "Lola Nena's Kitchen", tagline: 'Filipino · Home-style', category: 'Food', emoji: '🍲', tint: '#FFE8D6',
    rating: 4.8, waitMinutes: 15, location: { latitude: 14.5586, longitude: 121.0216 }, address: 'Legazpi Village, Makati',
    favorites: ['Chicken Adobo with rice', 'Pork Sinigang', 'Beef Kare-Kare', 'Tapsilog', 'Lumpiang Shanghai'],
  },
  {
    id: 'r2', name: 'Crispy Coop', tagline: 'Fried Chicken · Fast food', category: 'Food', emoji: '🍗', tint: '#FFF4CC',
    rating: 4.6, waitMinutes: 10, location: { latitude: 14.5503, longitude: 121.0287 }, address: 'Ayala Ave, Makati',
    favorites: ['1pc Chicken with rice', '2pc Chicken with rice', '6pc Bucket', 'Large fries', 'Iced tea'],
  },
  {
    id: 'r3', name: 'Stack & Smash', tagline: 'Burgers · American', category: 'Food', emoji: '🍔', tint: '#FFE0E0',
    rating: 4.7, waitMinutes: 18, location: { latitude: 14.5512, longitude: 121.0478 }, address: 'BGC, Taguig',
    favorites: ['Classic Smash burger', 'Bacon Double', 'Truffle fries', 'Vanilla milkshake'],
  },
  {
    id: 'r5', name: 'Ramen Daichi', tagline: 'Japanese · Ramen', category: 'Food', emoji: '🍜', tint: '#EDE7FF',
    rating: 4.9, waitMinutes: 15, location: { latitude: 14.5539, longitude: 121.0200 }, address: 'Little Tokyo, Makati',
    favorites: ['Tonkotsu ramen', 'Spicy Miso ramen', 'Gyoza (5pc)', 'Karaage'],
  },
  {
    id: 'r6', name: 'Brew Theory', tagline: 'Coffee · Pastries', category: 'Food', emoji: '☕', tint: '#F1E7DD',
    rating: 4.7, waitMinutes: 8, location: { latitude: 14.5575, longitude: 121.0262 }, address: 'Paseo de Roxas, Makati',
    favorites: ['Iced Spanish Latte', 'Americano', 'Cold Brew', 'Ensaymada'],
  },
  // Medicine
  {
    id: 'm1', name: 'BotikaPlus Pharmacy', tagline: 'Pharmacy · Open 24 hours', category: 'Medicine', emoji: '💊', tint: '#E0F2FE',
    rating: 4.7, waitMinutes: 8, location: { latitude: 14.5560, longitude: 121.0190 }, address: 'Chino Roces Ave, Makati',
    favorites: ['Paracetamol 500mg (10 tablets)', 'Cetirizine 10mg (10 tablets)', 'Oral rehydration salts', 'Vitamin C 500mg', 'Face masks (1 box)'],
  },
  {
    id: 'm2', name: 'Kalinga Drugstore', tagline: 'Pharmacy · Baby & personal care', category: 'Medicine', emoji: '🩺', tint: '#E0F7FA',
    rating: 4.6, waitMinutes: 10, location: { latitude: 14.5495, longitude: 121.0465 }, address: '5th Ave, BGC',
    favorites: ['Ibuprofen 200mg (10 tablets)', 'Cough syrup', 'Thermometer', 'Adhesive bandages', 'Baby diapers (size M)'],
  },
  // Groceries
  {
    id: 'g1', name: 'FreshBasket Supermarket', tagline: 'Supermarket · Groceries', category: 'Groceries', emoji: '🛒', tint: '#E8F5E9',
    rating: 4.5, waitMinutes: 20, location: { latitude: 14.5530, longitude: 121.0250 }, address: 'Makati Ave, Makati',
    favorites: ['Rice 5kg', 'Eggs (1 tray)', 'Fresh milk 1L', 'Loaf bread', 'Cooking oil 1L'],
  },
  {
    id: 'g2', name: 'Palengke Fresh Market', tagline: 'Wet market · Meat, fish & vegetables', category: 'Groceries', emoji: '🥬', tint: '#F1F8E9',
    rating: 4.4, waitMinutes: 25, location: { latitude: 14.5640, longitude: 121.0180 }, address: 'Poblacion, Makati',
    favorites: ['Pork liempo 1kg', 'Tilapia 1kg', 'Tomatoes 1/2kg', 'Onions 1/2kg', 'Garlic 1/4kg'],
  },
  // Convenience
  {
    id: 'c1', name: 'QuickStop 24/7', tagline: 'Convenience store · Open 24 hours', category: 'Convenience', emoji: '🏪', tint: '#FFF3E0',
    rating: 4.3, waitMinutes: 5, location: { latitude: 14.5545, longitude: 121.0230 }, address: 'Jupiter St, Makati',
    favorites: ['Bottled water 1L', 'Instant noodles', 'Ice (1 bag)', 'Chips', 'Toothpaste'],
  },
  // Hardware
  {
    id: 'h1', name: 'Handy Hardware', tagline: 'Hardware · Tools & electrical', category: 'Hardware', emoji: '🔧', tint: '#ECEFF1',
    rating: 4.5, waitMinutes: 12, location: { latitude: 14.5600, longitude: 121.0350 }, address: 'Kalayaan Ave, Makati',
    favorites: ['LED bulb 9W', 'AA batteries (4pc)', 'Extension cord', 'Duct tape', 'Screwdriver set'],
  },
  // Gifts
  {
    id: 'f1', name: 'Bloom & Co. Flowers', tagline: 'Flowers & gifts', category: 'Gifts', emoji: '💐', tint: '#FCE4EC',
    rating: 4.8, waitMinutes: 15, location: { latitude: 14.5520, longitude: 121.0495 }, address: 'Bonifacio High Street, BGC',
    favorites: ['Bouquet of red roses', 'Sunflower bouquet', 'Greeting card', 'Chocolate box'],
  },
  // Pets
  {
    id: 'p1', name: 'PetPals Supplies', tagline: 'Pet food & supplies', category: 'Pets', emoji: '🐾', tint: '#FFF8E1',
    rating: 4.6, waitMinutes: 10, location: { latitude: 14.5475, longitude: 121.0270 }, address: 'Pasong Tamo, Makati',
    favorites: ['Dog food 3kg', 'Cat food 1.5kg', 'Cat litter 10L', 'Pet shampoo'],
  },
];

export const findStore = (id: string) => STORES.find((s) => s.id === id);

export type Place = { id: string; name: string; area: string; location: LatLng };

/** Preset places for search. Replace with a geocoding / places API in production. */
export const PLACES: Place[] = [
  { id: 'p1', name: 'Greenbelt 5', area: 'Makati', location: { latitude: 14.5524, longitude: 121.0213 } },
  { id: 'p2', name: 'SM Megamall', area: 'Mandaluyong', location: { latitude: 14.5850, longitude: 121.0568 } },
  { id: 'p3', name: 'BGC High Street', area: 'Taguig', location: { latitude: 14.5509, longitude: 121.0509 } },
  { id: 'p4', name: 'NAIA Terminal 3', area: 'Pasay', location: { latitude: 14.5202, longitude: 121.0182 } },
  { id: 'p5', name: 'SM Mall of Asia', area: 'Pasay', location: { latitude: 14.5352, longitude: 120.9822 } },
  { id: 'p6', name: 'Ortigas Center', area: 'Pasig', location: { latitude: 14.5866, longitude: 121.0614 } },
  { id: 'p7', name: 'Rockwell Center', area: 'Makati', location: { latitude: 14.5649, longitude: 121.0368 } },
  { id: 'p8', name: 'Intramuros', area: 'Manila', location: { latitude: 14.5896, longitude: 120.9747 } },
  { id: 'p9', name: 'UP Diliman', area: 'Quezon City', location: { latitude: 14.6538, longitude: 121.0685 } },
  { id: 'p10', name: 'Eastwood City', area: 'Quezon City', location: { latitude: 14.6091, longitude: 121.0799 } },
  { id: 'p11', name: 'Ayala Triangle Gardens', area: 'Makati', location: { latitude: 14.5568, longitude: 121.0236 } },
  { id: 'p12', name: 'Venice Grand Canal', area: 'Taguig', location: { latitude: 14.5355, longitude: 121.0512 } },
];

export const RIDER_NAMES = ['Mark D.', 'Jun R.', 'Paolo S.', 'Rico M.', 'Allan T.', 'Joel B.', 'Carlo V.'];
export const PLATES = ['NAB 1234', 'MC 4821', 'ZTX 902', '1043 KL', 'NQA 7788'];

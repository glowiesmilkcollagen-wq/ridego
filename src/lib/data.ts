import { LatLng } from './geo';

export type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  category: Category;
  emoji: string;
  tint: string;
  rating: number;
  /** Typical wait at the counter, in minutes, before the rider has the food. */
  waitMinutes: number;
  location: LatLng;
  address: string;
  /** Common orders, shown as quick-add suggestions. Prices are not tracked: the rider pays at the store. */
  favorites: string[];
};

export type Category = 'Filipino' | 'Burgers' | 'Chicken' | 'Pizza' | 'Asian' | 'Coffee' | 'Desserts' | 'Healthy';
export const CATEGORIES: { key: Category; emoji: string }[] = [
  { key: 'Filipino', emoji: '🍲' },
  { key: 'Chicken', emoji: '🍗' },
  { key: 'Burgers', emoji: '🍔' },
  { key: 'Pizza', emoji: '🍕' },
  { key: 'Asian', emoji: '🍜' },
  { key: 'Coffee', emoji: '☕' },
  { key: 'Desserts', emoji: '🍰' },
  { key: 'Healthy', emoji: '🥗' },
];

/** Suggested places to buy from. Customers can also choose any other store. */
export const RESTAURANTS: Restaurant[] = [
  {
    id: 'r1', name: "Lola Nena's Kitchen", cuisine: 'Filipino · Home-style', category: 'Filipino', emoji: '🍲', tint: '#FFE8D6',
    rating: 4.8, waitMinutes: 15, location: { latitude: 14.5586, longitude: 121.0216 }, address: 'Legazpi Village, Makati',
    favorites: ['Chicken Adobo with rice', 'Pork Sinigang', 'Beef Kare-Kare', 'Tapsilog', 'Lumpiang Shanghai'],
  },
  {
    id: 'r2', name: 'Crispy Coop', cuisine: 'Fried Chicken · Fast food', category: 'Chicken', emoji: '🍗', tint: '#FFF4CC',
    rating: 4.6, waitMinutes: 10, location: { latitude: 14.5503, longitude: 121.0287 }, address: 'Ayala Ave, Makati',
    favorites: ['1pc Chicken with rice', '2pc Chicken with rice', '6pc Bucket', 'Large fries', 'Iced tea'],
  },
  {
    id: 'r3', name: 'Stack & Smash', cuisine: 'Burgers · American', category: 'Burgers', emoji: '🍔', tint: '#FFE0E0',
    rating: 4.7, waitMinutes: 18, location: { latitude: 14.5512, longitude: 121.0478 }, address: 'BGC, Taguig',
    favorites: ['Classic Smash burger', 'Bacon Double', 'Truffle fries', 'Vanilla milkshake'],
  },
  {
    id: 'r4', name: 'Forno Napoli', cuisine: 'Pizza · Italian', category: 'Pizza', emoji: '🍕', tint: '#E6F4EA',
    rating: 4.5, waitMinutes: 20, location: { latitude: 14.5620, longitude: 121.0300 }, address: 'Salcedo Village, Makati',
    favorites: ['Margherita pizza', 'Pepperoni pizza', 'Carbonara'],
  },
  {
    id: 'r5', name: 'Ramen Daichi', cuisine: 'Japanese · Ramen', category: 'Asian', emoji: '🍜', tint: '#EDE7FF',
    rating: 4.9, waitMinutes: 15, location: { latitude: 14.5539, longitude: 121.0200 }, address: 'Little Tokyo, Makati',
    favorites: ['Tonkotsu ramen', 'Spicy Miso ramen', 'Gyoza (5pc)', 'Karaage'],
  },
  {
    id: 'r6', name: 'Brew Theory', cuisine: 'Coffee · Pastries', category: 'Coffee', emoji: '☕', tint: '#F1E7DD',
    rating: 4.7, waitMinutes: 8, location: { latitude: 14.5575, longitude: 121.0262 }, address: 'Paseo de Roxas, Makati',
    favorites: ['Iced Spanish Latte', 'Americano', 'Cold Brew', 'Ensaymada'],
  },
  {
    id: 'r7', name: 'Halo & Co.', cuisine: 'Desserts · Halo-halo', category: 'Desserts', emoji: '🍧', tint: '#FCE7F3',
    rating: 4.6, waitMinutes: 10, location: { latitude: 14.5490, longitude: 121.0230 }, address: 'San Antonio, Makati',
    favorites: ['Halo-halo Special', 'Leche Flan', 'Ube Cheesecake'],
  },
  {
    id: 'r8', name: 'Green Bowl', cuisine: 'Salads · Bowls', category: 'Healthy', emoji: '🥗', tint: '#E0F7EC',
    rating: 4.4, waitMinutes: 12, location: { latitude: 14.5450, longitude: 121.0510 }, address: 'High Street, BGC',
    favorites: ['Chicken Quinoa Bowl', 'Salmon Poke', 'Vegan Buddha Bowl'],
  },
];

export const findRestaurant = (id: string) => RESTAURANTS.find((r) => r.id === id);

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

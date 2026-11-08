import { LatLng } from './geo';

export type MenuItem = { id: string; name: string; description: string; price: number; popular?: boolean };
export type MenuSection = { title: string; items: MenuItem[] };
export type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  category: Category;
  emoji: string;
  tint: string;
  rating: number;
  reviews: number;
  prepMinutes: number;
  priceLevel: 1 | 2 | 3;
  promo?: string;
  location: LatLng;
  address: string;
  menu: MenuSection[];
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

const item = (id: string, name: string, price: number, description: string, popular = false): MenuItem => ({ id, name, price, description, popular });

export const RESTAURANTS: Restaurant[] = [
  {
    id: 'r1', name: "Lola Nena's Kitchen", cuisine: 'Filipino · Home-style', category: 'Filipino', emoji: '🍲', tint: '#FFE8D6',
    rating: 4.8, reviews: 2310, prepMinutes: 15, priceLevel: 1, promo: '20% off first order',
    location: { latitude: 14.5586, longitude: 121.0216 }, address: 'Legazpi Village, Makati',
    menu: [
      { title: 'Rice Meals', items: [
        item('r1-1', 'Chicken Adobo', 165, 'Braised in soy, vinegar and garlic, with rice', true),
        item('r1-2', 'Pork Sinigang', 210, 'Sour tamarind soup with vegetables', true),
        item('r1-3', 'Beef Kare-Kare', 265, 'Oxtail and tripe in peanut sauce, with bagoong'),
        item('r1-4', 'Tapsilog', 155, 'Beef tapa, garlic rice, fried egg'),
      ] },
      { title: 'Sides & Drinks', items: [
        item('r1-5', 'Extra Garlic Rice', 35, 'One cup'),
        item('r1-6', 'Lumpiang Shanghai (6pc)', 95, 'Crispy pork spring rolls'),
        item('r1-7', 'Sago’t Gulaman', 55, 'Brown sugar, tapioca pearls and jelly'),
      ] },
    ],
  },
  {
    id: 'r2', name: 'Crispy Coop', cuisine: 'Fried Chicken · Fast food', category: 'Chicken', emoji: '🍗', tint: '#FFF4CC',
    rating: 4.6, reviews: 5120, prepMinutes: 10, priceLevel: 1, promo: 'Free delivery over ₱399',
    location: { latitude: 14.5503, longitude: 121.0287 }, address: 'Ayala Ave, Makati',
    menu: [
      { title: 'Chicken', items: [
        item('r2-1', '1pc Chicken with Rice', 99, 'Crispy or spicy', true),
        item('r2-2', '2pc Chicken with Rice', 179, 'Crispy or spicy, with gravy'),
        item('r2-3', '6pc Bucket', 449, 'Good for sharing', true),
        item('r2-4', 'Chicken Sandwich', 129, 'Fried thigh, pickles, mayo'),
      ] },
      { title: 'Extras', items: [
        item('r2-5', 'Fries (Large)', 75, 'Seasoned'),
        item('r2-6', 'Iced Tea', 45, 'House-brewed'),
      ] },
    ],
  },
  {
    id: 'r3', name: 'Stack & Smash', cuisine: 'Burgers · American', category: 'Burgers', emoji: '🍔', tint: '#FFE0E0',
    rating: 4.7, reviews: 1840, prepMinutes: 18, priceLevel: 2,
    location: { latitude: 14.5512, longitude: 121.0478 }, address: 'BGC, Taguig',
    menu: [
      { title: 'Burgers', items: [
        item('r3-1', 'Classic Smash', 245, 'Two patties, cheese, house sauce', true),
        item('r3-2', 'Bacon Double', 315, 'Two patties, bacon, cheddar'),
        item('r3-3', 'Mushroom Swiss', 285, 'Sautéed mushrooms, swiss cheese'),
      ] },
      { title: 'Sides', items: [
        item('r3-4', 'Truffle Fries', 145, 'Parmesan and truffle oil', true),
        item('r3-5', 'Milkshake', 165, 'Vanilla, chocolate or strawberry'),
      ] },
    ],
  },
  {
    id: 'r4', name: 'Forno Napoli', cuisine: 'Pizza · Italian', category: 'Pizza', emoji: '🍕', tint: '#E6F4EA',
    rating: 4.5, reviews: 980, prepMinutes: 20, priceLevel: 2, promo: 'Buy 1 Take 1 on Tuesdays',
    location: { latitude: 14.5620, longitude: 121.0300 }, address: 'Salcedo Village, Makati',
    menu: [
      { title: 'Pizza (12")', items: [
        item('r4-1', 'Margherita', 395, 'Tomato, mozzarella, basil', true),
        item('r4-2', 'Pepperoni', 445, 'Double pepperoni'),
        item('r4-3', 'Hawaiian', 425, 'Ham and pineapple'),
      ] },
      { title: 'Pasta', items: [
        item('r4-4', 'Carbonara', 285, 'Guanciale, egg, pecorino'),
        item('r4-5', 'Aglio e Olio', 245, 'Garlic, chili, olive oil'),
      ] },
    ],
  },
  {
    id: 'r5', name: 'Ramen Daichi', cuisine: 'Japanese · Ramen', category: 'Asian', emoji: '🍜', tint: '#EDE7FF',
    rating: 4.9, reviews: 3020, prepMinutes: 15, priceLevel: 2,
    location: { latitude: 14.5539, longitude: 121.0200 }, address: 'Little Tokyo, Makati',
    menu: [
      { title: 'Ramen', items: [
        item('r5-1', 'Tonkotsu', 395, 'Rich pork broth, chashu, egg', true),
        item('r5-2', 'Shoyu', 365, 'Soy broth, chicken chashu'),
        item('r5-3', 'Spicy Miso', 410, 'Miso broth, chili, ground pork', true),
      ] },
      { title: 'Small Plates', items: [
        item('r5-4', 'Gyoza (5pc)', 165, 'Pan-fried pork dumplings'),
        item('r5-5', 'Karaage', 195, 'Japanese fried chicken'),
      ] },
    ],
  },
  {
    id: 'r6', name: 'Brew Theory', cuisine: 'Coffee · Pastries', category: 'Coffee', emoji: '☕', tint: '#F1E7DD',
    rating: 4.7, reviews: 760, prepMinutes: 8, priceLevel: 2,
    location: { latitude: 14.5575, longitude: 121.0262 }, address: 'Paseo de Roxas, Makati',
    menu: [
      { title: 'Coffee', items: [
        item('r6-1', 'Iced Spanish Latte', 175, 'Espresso, milk, condensed milk', true),
        item('r6-2', 'Americano', 120, 'Hot or iced'),
        item('r6-3', 'Cold Brew', 160, '18-hour steep'),
      ] },
      { title: 'Bakery', items: [
        item('r6-4', 'Ensaymada', 85, 'Butter, sugar, cheese', true),
        item('r6-5', 'Croissant', 110, 'All-butter'),
      ] },
    ],
  },
  {
    id: 'r7', name: 'Halo & Co.', cuisine: 'Desserts · Halo-halo', category: 'Desserts', emoji: '🍧', tint: '#FCE7F3',
    rating: 4.6, reviews: 640, prepMinutes: 10, priceLevel: 1,
    location: { latitude: 14.5490, longitude: 121.0230 }, address: 'San Antonio, Makati',
    menu: [
      { title: 'Desserts', items: [
        item('r7-1', 'Halo-halo Special', 165, 'Ube, leche flan, beans, shaved ice', true),
        item('r7-2', 'Leche Flan', 120, 'Classic caramel custard'),
        item('r7-3', 'Ube Cheesecake', 155, 'Slice'),
      ] },
    ],
  },
  {
    id: 'r8', name: 'Green Bowl', cuisine: 'Salads · Bowls', category: 'Healthy', emoji: '🥗', tint: '#E0F7EC',
    rating: 4.4, reviews: 410, prepMinutes: 12, priceLevel: 2,
    location: { latitude: 14.5450, longitude: 121.0510 }, address: 'High Street, BGC',
    menu: [
      { title: 'Bowls', items: [
        item('r8-1', 'Chicken Quinoa Bowl', 295, 'Grilled chicken, quinoa, greens', true),
        item('r8-2', 'Salmon Poke', 365, 'Salmon, rice, edamame, mango'),
        item('r8-3', 'Vegan Buddha Bowl', 265, 'Tofu, chickpeas, tahini'),
      ] },
    ],
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

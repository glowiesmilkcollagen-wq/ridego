-- Starter stores (edit them later in the admin dashboard). Run once after schema.sql.
insert into public.stores (name, tagline, category, emoji, tint, rating, wait_minutes, lat, lng, address, favorites)
select * from (values
  ('Lola Nena''s Kitchen', 'Filipino · Home-style', 'Food', '🍲', '#FFE8D6', 4.8, 15, 14.5586, 121.0216, 'Legazpi Village, Makati', array['Chicken Adobo with rice', 'Pork Sinigang', 'Beef Kare-Kare', 'Tapsilog', 'Lumpiang Shanghai']),
  ('Crispy Coop', 'Fried Chicken · Fast food', 'Food', '🍗', '#FFF4CC', 4.6, 10, 14.5503, 121.0287, 'Ayala Ave, Makati', array['1pc Chicken with rice', '2pc Chicken with rice', '6pc Bucket', 'Large fries', 'Iced tea']),
  ('Stack & Smash', 'Burgers · American', 'Food', '🍔', '#FFE0E0', 4.7, 18, 14.5512, 121.0478, 'BGC, Taguig', array['Classic Smash burger', 'Bacon Double', 'Truffle fries', 'Vanilla milkshake']),
  ('Ramen Daichi', 'Japanese · Ramen', 'Food', '🍜', '#EDE7FF', 4.9, 15, 14.5539, 121.02, 'Little Tokyo, Makati', array['Tonkotsu ramen', 'Spicy Miso ramen', 'Gyoza (5pc)', 'Karaage']),
  ('Brew Theory', 'Coffee · Pastries', 'Food', '☕', '#F1E7DD', 4.7, 8, 14.5575, 121.0262, 'Paseo de Roxas, Makati', array['Iced Spanish Latte', 'Americano', 'Cold Brew', 'Ensaymada']),
  ('BotikaPlus Pharmacy', 'Pharmacy · Open 24 hours', 'Medicine', '💊', '#E0F2FE', 4.7, 8, 14.556, 121.019, 'Chino Roces Ave, Makati', array['Paracetamol 500mg (10 tablets)', 'Cetirizine 10mg (10 tablets)', 'Oral rehydration salts', 'Vitamin C 500mg', 'Face masks (1 box)']),
  ('Kalinga Drugstore', 'Pharmacy · Baby & personal care', 'Medicine', '🩺', '#E0F7FA', 4.6, 10, 14.5495, 121.0465, '5th Ave, BGC', array['Ibuprofen 200mg (10 tablets)', 'Cough syrup', 'Thermometer', 'Adhesive bandages', 'Baby diapers (size M)']),
  ('FreshBasket Supermarket', 'Supermarket · Groceries', 'Groceries', '🛒', '#E8F5E9', 4.5, 20, 14.553, 121.025, 'Makati Ave, Makati', array['Rice 5kg', 'Eggs (1 tray)', 'Fresh milk 1L', 'Loaf bread', 'Cooking oil 1L']),
  ('Palengke Fresh Market', 'Wet market · Meat, fish & vegetables', 'Groceries', '🥬', '#F1F8E9', 4.4, 25, 14.564, 121.018, 'Poblacion, Makati', array['Pork liempo 1kg', 'Tilapia 1kg', 'Tomatoes 1/2kg', 'Onions 1/2kg', 'Garlic 1/4kg']),
  ('QuickStop 24/7', 'Convenience store · Open 24 hours', 'Convenience', '🏪', '#FFF3E0', 4.3, 5, 14.5545, 121.023, 'Jupiter St, Makati', array['Bottled water 1L', 'Instant noodles', 'Ice (1 bag)', 'Chips', 'Toothpaste']),
  ('Handy Hardware', 'Hardware · Tools & electrical', 'Hardware', '🔧', '#ECEFF1', 4.5, 12, 14.56, 121.035, 'Kalayaan Ave, Makati', array['LED bulb 9W', 'AA batteries (4pc)', 'Extension cord', 'Duct tape', 'Screwdriver set']),
  ('Bloom & Co. Flowers', 'Flowers & gifts', 'Gifts', '💐', '#FCE4EC', 4.8, 15, 14.552, 121.0495, 'Bonifacio High Street, BGC', array['Bouquet of red roses', 'Sunflower bouquet', 'Greeting card', 'Chocolate box']),
  ('PetPals Supplies', 'Pet food & supplies', 'Pets', '🐾', '#FFF8E1', 4.6, 10, 14.5475, 121.027, 'Pasong Tamo, Makati', array['Dog food 3kg', 'Cat food 1.5kg', 'Cat litter 10L', 'Pet shampoo'])
) v
where not exists (select 1 from public.stores);

-- Exercises schema.sql as different users. Run against a fresh database after supabase_stub.sql, schema.sql and seed.sql.
-- Every check raises an error on failure; the script ends with "ALL RULE TESTS PASSED".
\set ON_ERROR_STOP 1
set client_min_messages = warning;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000c', 'cust@example.com',  '{"full_name":"Ana Cruz","phone":"0917"}'),
  ('00000000-0000-0000-0000-0000000000c2', 'cust2@example.com', '{"full_name":"Ben Diaz"}'),
  ('00000000-0000-0000-0000-00000000000a', 'rider@example.com', '{"full_name":"Mark Reyes"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'car@example.com',   '{"full_name":"Carlo Lim"}'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@example.com', '{"full_name":"Boss"}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000ad';
-- Most checks below use an 80% share with no booking fee and no beta waiver; section 16 covers the waiver and booking fee.
update public.settings set rider_share = 0.8, booking_fee = 0, beta_waiver = false;

create temp table ctx (k text primary key, v text);
grant all on ctx to authenticated;

create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u)::text, false);
  execute 'set role authenticated';
end $$;
create or replace function pg_temp.expect_error(sql text, needle text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'expected error containing "%" but none for: %', needle, sql;
exception when others then
  if sqlerrm like 'expected error%' then raise; end if;
  if position(lower(needle) in lower(sqlerrm)) = 0 then raise exception 'wrong error for %: got "%" wanted "%"', sql, sqlerrm, needle; end if;
end $$;
create or replace function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if; end $$;

\echo '1. profiles are created on sign-up and the role cannot be self-promoted'
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.check((select full_name from profiles where id = auth.uid()) = 'Ana Cruz', 'profile created with name');
select pg_temp.expect_error($$update profiles set role = 'admin' where id = auth.uid()$$, 'cannot change your role');
update profiles set phone = '0917 111 2222' where id = auth.uid();
select pg_temp.check((select phone from profiles where id = auth.uid()) = '0917 111 2222', 'customer can edit own phone');
select pg_temp.check((select count(*) from profiles) = 1, 'customer sees only own profile');
select pg_temp.check((select count(*) from stores) = 13, 'customer sees active stores');
select pg_temp.expect_error($$insert into stores (name, lat, lng) values ('Hack', 1, 1)$$, 'row-level security');
select pg_temp.check((select count(*) from promotions) = 0, 'customer cannot list promotions');

\echo '2. customer places a pabili order; the server computes the fee (+₱20 per store) and the 80% rider share'
insert into ctx select 'o1', (place_order('{"kind":"pabili","pickup":{"name":"Crispy Coop","lat":14.5503,"lng":121.0287},
  "dropoff":{"name":"Ortigas Center","lat":14.5866,"lng":121.0614},"km":7.4,"items":[{"name":"6pc Bucket","qty":1}],"payment":"cash"}')).id;
select pg_temp.check((select fee from orders where id = (select v::uuid from ctx where k = 'o1')) = 136, 'pabili fee = 20 + (7.4-1)*15 + 20 (1 store) = 136');
select pg_temp.check((select rider_earning from orders where id = (select v::uuid from ctx where k = 'o1')) = 109, 'rider earning = round(136*0.8) = 109');
select pg_temp.check((select customer_name from orders where id = (select v::uuid from ctx where k = 'o1')) = 'Ana', 'first name stored for rider');
select pg_temp.expect_error($$select place_order('{"kind":"pabili","pickup":{"name":"a","lat":14.55,"lng":121.02},"dropoff":{"name":"b","lat":14.58,"lng":121.06},"km":5,"items":[]}')$$, 'at least one item');
-- Blocked updates change 0 rows (no error), so try it and then check nothing changed.
update orders set fee = 1 where true;
reset role;
select pg_temp.check((select fee from orders where id = (select v::uuid from ctx where k = 'o1')) = 136, 'customer cannot change the fee directly');

\echo '3. a too-small distance from the app is corrected to at least the straight-line distance'
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into ctx select 'o_km', (place_order('{"kind":"pasugo","pickup":{"name":"a","lat":14.5503,"lng":121.0287},"dropoff":{"name":"b","lat":14.5866,"lng":121.0614},"km":0.5,"description":"folder"}')).id;
select pg_temp.check((select km from orders where id = (select v::uuid from ctx where k = 'o_km')) > 5, 'km clamped up from 0.5');
select cancel_order((select v::uuid from ctx where k = 'o_km'));

\echo '4. other customers cannot see the order'
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select pg_temp.check((select count(*) from orders) = 0, 'customer 2 sees no orders of customer 1');

\echo '5. riders must register, be approved by an admin, and be online to see and accept jobs'
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.check((select count(*) from orders) = 0, 'unregistered rider sees no jobs');
select pg_temp.expect_error($$select accept_order((select v::uuid from ctx where k = 'o1'))$$, 'not approved');
select rider_register('Mark Reyes', '0918', 'moto', 'nab 1234', 'n01-23-456789');
select pg_temp.check((select status::text from riders where id = auth.uid()) = 'pending', 'new rider is pending');
select pg_temp.expect_error($$select rider_set_online(true)$$, 'pending');
update riders set status = 'approved' where id = auth.uid();
reset role;
select pg_temp.check((select status::text from riders where id = '00000000-0000-0000-0000-00000000000a') = 'pending', 'rider cannot approve themselves');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select rider_register('Carlo Lim', '0919', 'car', 'abc 999', 'n02-11-111111');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
update riders set status = 'approved';
select pg_temp.check((select count(*) from riders where status = 'approved') = 2, 'admin approved both riders');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.check((select count(*) from orders) = 0, 'approved but offline rider sees no jobs');
select rider_set_online(true);
select pg_temp.check((select count(*) from orders) = 1, 'online rider sees the open job');
select pg_temp.check((select count(*) from profiles where id = '00000000-0000-0000-0000-00000000000c') = 0, 'rider cannot see customer profile before accepting');

\echo '6. only one rider gets the job'
select accept_order((select v::uuid from ctx where k = 'o1'));
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select rider_set_online(true);
select pg_temp.check((select count(*) from orders) = 0, 'taken job disappears for other riders');
select pg_temp.expect_error($$select accept_order((select v::uuid from ctx where k = 'o1'))$$, 'already taken');

\echo '7. the customer sees the rider and their live location while the job is active'
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select rider_update_location(14.56, 121.03);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.check((select plate from riders) = 'NAB 1234', 'customer sees rider plate');
select pg_temp.check((select lat from riders) = 14.56, 'customer sees rider location');
select pg_temp.check((select full_name from profiles where id = '00000000-0000-0000-0000-00000000000a') = 'Mark Reyes', 'customer sees rider name');

\echo '8. rider steps; pabili needs the receipt; nobody else can advance the job'
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select pg_temp.expect_error($$select advance_order((select v::uuid from ctx where k = 'o1'))$$, 'not your job');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_error($$select rider_set_online(false)$$, 'finish your current job');
select advance_order((select v::uuid from ctx where k = 'o1'));
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_error($$select cancel_order((select v::uuid from ctx where k = 'o1'))$$, 'can no longer be cancelled');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_error($$select advance_order((select v::uuid from ctx where k = 'o1'))$$, 'receipt total');
select advance_order((select v::uuid from ctx where k = 'o1'), 449);
select advance_order((select v::uuid from ctx where k = 'o1'));
select pg_temp.check((select status::text || '/' || receipt_amount from orders where id = (select v::uuid from ctx where k = 'o1')) = 'delivered/449', 'delivered with receipt');
select pg_temp.expect_error($$select advance_order((select v::uuid from ctx where k = 'o1'))$$, 'already finished');

\echo '9. after delivery the customer rates; the rider location is private again'
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select rate_order((select v::uuid from ctx where k = 'o1'), 5);
select pg_temp.check((select count(*) from riders) = 0, 'customer no longer sees rider location');

\echo '10. cash balance: rider holds the whole fee and owes the company 20%'
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.check(rider_balance(auth.uid()) = 27, 'owes 136 - 109 = 27');
select pg_temp.check(rider_balance('00000000-0000-0000-0000-0000000000a2') is null, 'cannot read another rider balance');

\echo '11. promotions: admin creates; discount applies once per customer; rider earning is unaffected'
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
insert into promotions (code, description, discount_type, value, max_discount) values ('WELCOME50', '50% off', 'percent', 50, 30);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into ctx select 'o2', (place_order('{"kind":"pasugo","vehicle":"moto","pickup":{"name":"a","lat":14.5649,"lng":121.0368},"dropoff":{"name":"b","lat":14.5866,"lng":121.0614},"km":4.2,"description":"Folder","promo_code":"welcome50","payment":"gcash"}')).id;
select pg_temp.check((select base_fee || '/' || discount || '/' || fee || '/' || rider_earning from orders where id = (select v::uuid from ctx where k = 'o2')) = '68/30/38/54',
  'pasugo 4.2km: 20+(4.2-1)*15=68, 50% capped at 30, fee 38, rider gets 80% of 68 = 54');
select pg_temp.expect_error($$select place_order('{"kind":"pasugo","pickup":{"name":"a","lat":14.5649,"lng":121.0368},"dropoff":{"name":"b","lat":14.5866,"lng":121.0614},"km":4.2,"description":"x","promo_code":"WELCOME50"}')$$, 'already used');
select pg_temp.expect_error($$select place_order('{"kind":"pasugo","pickup":{"name":"a","lat":14.5649,"lng":121.0368},"dropoff":{"name":"b","lat":14.5866,"lng":121.0614},"km":4.2,"description":"x","promo_code":"NOPE"}')$$, 'not found');

\echo '12. motorcycles only: a car request is booked as motorcycle; a rider can drop a job before arriving'
insert into ctx select 'o3', (place_order('{"kind":"pasugo","vehicle":"car","pickup":{"name":"a","lat":14.5649,"lng":121.0368},"dropoff":{"name":"b","lat":14.5866,"lng":121.0614},"km":4.2,"description":"Big box"}')).id;
select pg_temp.check((select vehicle from orders where id = (select v::uuid from ctx where k = 'o3')) = 'moto', 'car request stored as motorcycle');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
select pg_temp.check((select count(*) from riders where vehicle = 'car') = 0 and (select count(*) from riders) = 2, 'a rider who asked for car is registered as motorcycle');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.check((select count(*) from orders where id = (select v::uuid from ctx where k = 'o3')) = 1, 'every online rider sees the job');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select accept_order((select v::uuid from ctx where k = 'o3'));
select release_order((select v::uuid from ctx where k = 'o3'));
select pg_temp.check((select count(*) from orders where id = (select v::uuid from ctx where k = 'o3') and status = 'searching') = 1, 'released job is open again');

\echo '13. GCash order: company owes the rider their share; admin records remittances and payouts'
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select accept_order((select v::uuid from ctx where k = 'o2'));
select advance_order((select v::uuid from ctx where k = 'o2'));
select advance_order((select v::uuid from ctx where k = 'o2'));
select advance_order((select v::uuid from ctx where k = 'o2'));
select pg_temp.check(rider_balance(auth.uid()) = 27 - 54, 'balance 27 owed minus 54 owed to rider = -27');
select pg_temp.expect_error($$insert into rider_transactions (rider_id, type, amount) values (auth.uid(), 'payout', 1000)$$, 'row-level security');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
insert into rider_transactions (rider_id, type, amount, note) values ('00000000-0000-0000-0000-00000000000a', 'payout', 27, 'GCash payout');
select pg_temp.check(rider_balance('00000000-0000-0000-0000-00000000000a') = 0, 'settled after payout');
select pg_temp.check((select count(*) from orders) = 4, 'admin sees all orders');
select cancel_order((select v::uuid from ctx where k = 'o3'));

\echo '14. admin changes prices and commission; new orders use them'
update settings set rider_share = 0.75, pabili_base = 59;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
update settings set rider_share = 1;
reset role;
select pg_temp.check((select rider_share from settings) = 0.75, 'customer cannot change commission');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into ctx select 'o4', (place_order('{"kind":"pabili","pickup":{"name":"a","lat":14.5503,"lng":121.0287},"dropoff":{"name":"b","lat":14.5866,"lng":121.0614},"km":7.4,"items":[{"name":"x","qty":1}]}')).id;
select pg_temp.check((select fee || '/' || rider_earning from orders where id = (select v::uuid from ctx where k = 'o4')) = '175/131', 'new prices: 59+96+20=175, 75% = 131');
select pg_temp.check((select rider_earning from orders where id = (select v::uuid from ctx where k = 'o1')) = 109, 'old orders keep their original share');

\echo '16. booking fee goes to the company; the beta waiver drops it and the commission'
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
update settings set rider_share = 0.7, booking_fee = 15, beta_waiver = false;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
insert into ctx select 'o5', (place_order('{"kind":"pabili","pickup":{"name":"a","lat":14.5503,"lng":121.0287},"dropoff":{"name":"b","lat":14.5866,"lng":121.0614},"km":7.4,"items":[{"name":"x","qty":1}]}')).id;
select pg_temp.check((select base_fee || '/' || booking_fee || '/' || fee || '/' || rider_earning || '/' || commission_waived from orders where id = (select v::uuid from ctx where k = 'o5')) = '175/15/190/123/false',
  'normal: fee 175 + booking 15 = 190 paid; rider gets 70% of 175 = 123');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
update settings set beta_waiver = true;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
insert into ctx select 'o6', (place_order('{"kind":"pabili","pickup":{"name":"a","lat":14.5503,"lng":121.0287},"dropoff":{"name":"b","lat":14.5866,"lng":121.0614},"km":7.4,"items":[{"name":"x","qty":1}]}')).id;
select pg_temp.check((select base_fee || '/' || booking_fee || '/' || fee || '/' || rider_share || '/' || rider_earning || '/' || commission_waived from orders where id = (select v::uuid from ctx where k = 'o6')) = '175/0/175/1/175/true',
  'beta: no booking fee, rider keeps 100% of 175');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select accept_order((select v::uuid from ctx where k = 'o6'));
select advance_order((select v::uuid from ctx where k = 'o6'));
select advance_order((select v::uuid from ctx where k = 'o6'), 200);
select advance_order((select v::uuid from ctx where k = 'o6'));
select pg_temp.check(rider_balance(auth.uid()) = 0, 'beta cash job: rider keeps everything, owes nothing');

\echo '17. pabili from two stores: ₱20 per store, route through both stores, one shopping list per store'
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
insert into ctx select 'o7', (place_order('{"kind":"pabili","dropoff":{"name":"Home","lat":14.5866,"lng":121.0614},"km":8,
  "stops":[{"name":"Crispy Coop","lat":14.5503,"lng":121.0287,"items":[{"id":"a","name":"6pc Bucket","qty":1}]},
           {"name":"BotikaPlus","lat":14.556,"lng":121.019,"items":[{"id":"b","name":"Paracetamol","qty":2}]}]}')).id;
select pg_temp.check((select store_count || '/' || pickup_name || '/' || jsonb_array_length(items) || '/' || base_fee from orders where id = (select v::uuid from ctx where k = 'o7')) = '2/Crispy Coop/2/204',
  '2 stores: pickup is the first store, both lists kept, fee 59 (base set in section 14) + (8-1)*15 + 2*20 = 204');
select pg_temp.expect_error($$select place_order('{"kind":"pabili","dropoff":{"name":"H","lat":14.58,"lng":121.06},"km":8,"stops":[{"name":"A","lat":14.55,"lng":121.02,"items":[]}]}')$$, 'at least one item for A');
select pg_temp.expect_error($$select place_order(jsonb_build_object('kind','pabili','dropoff',jsonb_build_object('name','H','lat',14.58,'lng',121.06),'km',8,
  'stops',(select jsonb_agg(jsonb_build_object('name','S'||i,'lat',14.55,'lng',121.02,'items',jsonb_build_array(jsonb_build_object('id','x','name','x','qty',1)))) from generate_series(1,6) i)))$$, 'at most 5 stores');

\echo '18. a pabili store right next to the customer is fine; a pasugo that short is not'
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
insert into ctx select 'o8', (place_order('{"kind":"pabili","dropoff":{"name":"Home","lat":14.5547,"lng":121.0244},"km":0,
  "stops":[{"name":"Aling Nena sari-sari — green gate","lat":14.5547,"lng":121.0244,"items":[{"id":"a","name":"Coke","qty":1}]}]}')).id;
select pg_temp.check((select km from orders where id = (select v::uuid from ctx where k = 'o8')) = 0.3, 'next-door store: distance floored at 0.3 km');
select pg_temp.expect_error($$select place_order('{"kind":"pasugo","pickup":{"name":"a","lat":14.5547,"lng":121.0244},"dropoff":{"name":"b","lat":14.5547,"lng":121.0244},"km":0,"description":"x"}')$$, 'too close');
-- No passenger rides (needs LTFRB permits).
select pg_temp.expect_error($$select place_order('{"kind":"pasugo","pickup":{"name":"a","lat":14.5547,"lng":121.0244},"dropoff":{"name":"b","lat":14.5866,"lng":121.0614},"km":6,"description":"x","cargo":"person"}')$$, 'documents and parcels only');

\echo '15. anonymous visitors see nothing'
reset role;
set role anon;
select pg_temp.expect_error($$select count(*) from public.orders$$, 'permission denied');
select pg_temp.expect_error($$select public.place_order('{}')$$, 'permission denied');
reset role;

\echo 'ALL RULE TESTS PASSED'

\echo '19. account deletion'
-- A fresh customer with one finished order deletes their account.
reset role;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d1', 'del@x.test');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select id as del_order from place_order('{"kind":"pasugo","pickup":{"name":"Office","lat":14.5547,"lng":121.0244},"dropoff":{"name":"My house, 12 Rizal St","lat":14.5866,"lng":121.0614},"km":6,"description":"folder","sender":{"name":"Ana","phone":"0917"}}') \gset
select pg_temp.expect_error($$select delete_my_account()$$, 'current order');
select cancel_order(:'del_order');
select delete_my_account();
reset role;
select pg_temp.check(not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-0000000000d1'), 'login deleted');
select pg_temp.check(not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-0000000000d1'), 'profile deleted');
select pg_temp.check((select customer_id is null and customer_name = 'Deleted user' and dropoff_name = 'Removed' and sender is null from public.orders where id = :'del_order'), 'order kept but anonymized');
-- Admins can't delete themselves from the app.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
select pg_temp.expect_error($$select delete_my_account()$$, 'Admin accounts');
reset role;

\echo '20. push notifications'
reset role;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000b1', 'pushrider@x.test', '{"full_name":"Paolo Rivera"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'pushcust@x.test', '{"full_name":"Liza Gomez"}');
create temp view pushes as select m ->> 'to' as "to", m ->> 'title' as title, m ->> 'body' as body, m ->> 'channelId' as channel
  from net.sent, jsonb_array_elements(body) m;
grant select on pushes to authenticated;
-- Tokens: only valid Expo tokens, saved for the signed-in user.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select pg_temp.expect_error($$select register_push_token('hello', 'customer')$$, 'Invalid push token');
select register_push_token('ExponentPushToken[cust-b2]', 'customer');
select pg_temp.expect_error($$select * from push_tokens$$, 'permission denied');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select rider_register('Paolo Rivera', '0918', 'moto', 'PUSH 1', 'L-1');
select register_push_token('ExponentPushToken[rider-b1]', 'rider');
-- Admin approves: the rider is told.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
update riders set status = 'approved' where id = '00000000-0000-0000-0000-0000000000b1';
reset role;
select pg_temp.check(exists (select 1 from pushes where "to" = 'ExponentPushToken[rider-b1]' and title like 'You''re approved%'), 'rider told about approval');
-- Rider goes online near Makati; a new order nearby alerts them on the "jobs" channel.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select rider_set_online(true);
select rider_update_location(14.556, 121.025);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select id as push_order from place_order('{"kind":"pasugo","cargo":"document","pickup":{"name":"Office","lat":14.5547,"lng":121.0244},"dropoff":{"name":"Home","lat":14.5866,"lng":121.0614},"km":6,"description":"folder"}') \gset
reset role;
select pg_temp.check(exists (select 1 from pushes where "to" = 'ExponentPushToken[rider-b1]' and title like 'New pasugo job%' and channel = 'jobs'), 'nearby online rider gets the new job');
-- A far-away order (Cebu) doesn't alert this rider.
delete from net.sent;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select place_order('{"kind":"pasugo","cargo":"parcel","pickup":{"name":"Cebu office","lat":10.3157,"lng":123.8854},"dropoff":{"name":"Cebu home","lat":10.33,"lng":123.90},"km":3,"description":"bag"}');
reset role;
select pg_temp.check(not exists (select 1 from pushes where "to" = 'ExponentPushToken[rider-b1]'), 'far-away rider is not alerted');
-- Rider accepts: the customer hears "Rider found" with the rider's first name.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select accept_order(:'push_order');
reset role;
select pg_temp.check(exists (select 1 from pushes where "to" = 'ExponentPushToken[cust-b2]' and title like 'Rider found%' and body like 'Paolo is heading to Office%'), 'customer told rider found');
-- Customer cancels: the rider is told.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select cancel_order(:'push_order');
reset role;
select pg_temp.check(exists (select 1 from pushes where "to" = 'ExponentPushToken[rider-b1]' and title = 'Job cancelled'), 'rider told about cancellation');
-- Logging out removes the token; nothing is sent to it afterwards.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select unregister_push_token('ExponentPushToken[cust-b2]');
reset role;
select pg_temp.check(not exists (select 1 from push_tokens where token = 'ExponentPushToken[cust-b2]'), 'token removed on logout');

\echo '21. saved addresses: up to 20 per customer, the least used one is replaced'
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select pg_temp.expect_error($$select save_address('Home', '  ', 14.55, 121.02)$$, 'address details');
select pg_temp.expect_error($$insert into saved_addresses (user_id, details, lat, lng) values (auth.uid(), 'x', 1, 1)$$, 'permission denied');
-- 20 places spread ~1 km apart; place 7 gets used a lot, place 3 is the least used and oldest.
select save_address('Place ' || i, 'Street ' || i, 14.50 + i * 0.01, 121.0) from generate_series(1, 20) i;
select use_address(id) from saved_addresses where label <> 'Place 3';
select use_address(id) from saved_addresses where label = 'Place 7';
select pg_temp.check((select count(*) from saved_addresses) = 20, '20 saved');
-- Saving the same spot again updates it instead of adding a copy.
select save_address('Lola''s house', 'Street 7, blue gate', 14.57 + 0.00005, 121.0);
select pg_temp.check((select count(*) from saved_addresses) = 20 and exists (select 1 from saved_addresses where label = 'Lola''s house'), 'same spot updated, not duplicated');
-- A 21st place replaces the least used one (Place 3).
select save_address('Office', 'Ayala Ave', 14.80, 121.0);
select pg_temp.check((select count(*) from saved_addresses) = 20, 'still 20 after the 21st');
select pg_temp.check(not exists (select 1 from saved_addresses where label = 'Place 3'), 'least used (Place 3) was replaced');
select pg_temp.check(exists (select 1 from saved_addresses where label = 'Office'), 'new address kept');
-- Others can't see or delete them.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.check((select count(*) from saved_addresses) = 0, 'other customers see none');
delete from saved_addresses;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select pg_temp.check((select count(*) from saved_addresses) = 20, 'other customers cannot delete them');
-- The owner can delete one.
delete from saved_addresses where label = 'Office';
select pg_temp.check((select count(*) from saved_addresses) = 19, 'owner can delete');
reset role;

\echo '22. two orders at once: only when no free rider is near and the order is on the way'
reset role;
delete from net.sent;
update public.orders set status = 'cancelled' where status in ('searching', 'accepted', 'at_pickup', 'picked_up');
-- Carcar City, Cebu. Rider R1 (b1) is the only rider online; its first job goes north (pickup P1 → drop-off D1).
update public.riders set online = false where id <> '00000000-0000-0000-0000-0000000000b1';
update public.riders set online = true, lat = 10.1000, lng = 123.6400, location_at = now() where id = '00000000-0000-0000-0000-0000000000b1';
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
insert into ctx select 'j1', (place_order('{"kind":"pasugo","cargo":"parcel","pickup":{"name":"P1","lat":10.1000,"lng":123.6400},"dropoff":{"name":"D1","lat":10.1500,"lng":123.6400},"km":6,"description":"bag"}')).id;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select accept_order((select v::uuid from ctx where k = 'j1'));
-- On the way: pickup 0.5 km off the route, drop-off near D1, same direction.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
insert into ctx select 'j2', (place_order('{"kind":"pasugo","cargo":"parcel","pickup":{"name":"On the way","lat":10.1200,"lng":123.6445},"dropoff":{"name":"Near D1","lat":10.1480,"lng":123.6420},"km":4,"description":"folder"}')).id;
-- Opposite way: drop-off south, behind the rider.
insert into ctx select 'j3', (place_order('{"kind":"pasugo","cargo":"parcel","pickup":{"name":"South","lat":10.0950,"lng":123.6400},"dropoff":{"name":"Far south","lat":10.0400,"lng":123.6300},"km":7,"description":"folder"}')).id;
reset role;
select pg_temp.check(exists (select 1 from pushes where "to" = 'ExponentPushToken[rider-b1]' and title like 'New pasugo job on your way%'), 'busy rider alerted for the on-the-way job');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.check((select count(*) from my_second_jobs()) = 1 and (select id from my_second_jobs()) = (select v::uuid from ctx where k = 'j2'), 'second-job list shows only the on-the-way job');
select pg_temp.expect_error($$select accept_order((select v::uuid from ctx where k = 'j3'))$$, 'not on your way');
-- Another rider (a2) comes online, free and near: the busy rider can no longer take the extra job.
reset role;
update public.riders set status = 'approved', online = true, lat = 10.1210, lng = 123.6440, location_at = now() where id = '00000000-0000-0000-0000-0000000000a2';
insert into public.riders (id, status, vehicle, plate, license_no, online, lat, lng, location_at)
  select '00000000-0000-0000-0000-0000000000a2', 'approved', 'moto', 'FREE 1', 'L', true, 10.1210, 123.6440, now()
  where not exists (select 1 from public.riders where id = '00000000-0000-0000-0000-0000000000a2');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.check((select count(*) from my_second_jobs()) = 0, 'no second jobs while a free rider is near');
select pg_temp.expect_error($$select accept_order((select v::uuid from ctx where k = 'j2'))$$, 'Another rider is free');
-- The free rider goes offline: now the busy rider can take it, but not a third one.
reset role;
update public.riders set online = false where id = '00000000-0000-0000-0000-0000000000a2';
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select accept_order((select v::uuid from ctx where k = 'j2'));
select pg_temp.check((select count(*) from orders where rider_id = auth.uid() and status = 'accepted') = 2, 'rider carries 2 orders');
select pg_temp.expect_error($$select accept_order((select v::uuid from ctx where k = 'j3'))$$, 'at most 2 orders');
reset role;

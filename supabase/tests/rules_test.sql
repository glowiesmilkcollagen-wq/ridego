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

\echo '2. customer places a pabili order; the server computes the fee and the 80% rider share'
insert into ctx select 'o1', (place_order('{"kind":"pabili","pickup":{"name":"Crispy Coop","lat":14.5503,"lng":121.0287},
  "dropoff":{"name":"Ortigas Center","lat":14.5866,"lng":121.0614},"km":7.4,"items":[{"name":"6pc Bucket","qty":1}],"payment":"cash"}')).id;
select pg_temp.check((select fee from orders where id = (select v::uuid from ctx where k = 'o1')) = 103, 'pabili fee = 49 + (7.4-2)*10 = 103');
select pg_temp.check((select rider_earning from orders where id = (select v::uuid from ctx where k = 'o1')) = 82, 'rider earning = round(103*0.8) = 82');
select pg_temp.check((select customer_name from orders where id = (select v::uuid from ctx where k = 'o1')) = 'Ana', 'first name stored for rider');
select pg_temp.expect_error($$select place_order('{"kind":"pabili","pickup":{"name":"a","lat":14.55,"lng":121.02},"dropoff":{"name":"b","lat":14.58,"lng":121.06},"km":5,"items":[]}')$$, 'at least one item');
-- Blocked updates change 0 rows (no error), so try it and then check nothing changed.
update orders set fee = 1 where true;
reset role;
select pg_temp.check((select fee from orders where id = (select v::uuid from ctx where k = 'o1')) = 103, 'customer cannot change the fee directly');

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
select pg_temp.check(rider_balance(auth.uid()) = 21, 'owes 103 - 82 = 21');
select pg_temp.check(rider_balance('00000000-0000-0000-0000-0000000000a2') is null, 'cannot read another rider balance');

\echo '11. promotions: admin creates; discount applies once per customer; rider earning is unaffected'
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
insert into promotions (code, description, discount_type, value, max_discount) values ('WELCOME50', '50% off', 'percent', 50, 30);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into ctx select 'o2', (place_order('{"kind":"pasugo","vehicle":"moto","pickup":{"name":"a","lat":14.5649,"lng":121.0368},"dropoff":{"name":"b","lat":14.5866,"lng":121.0614},"km":4.2,"description":"Folder","promo_code":"welcome50","payment":"gcash"}')).id;
select pg_temp.check((select base_fee || '/' || discount || '/' || fee || '/' || rider_earning from orders where id = (select v::uuid from ctx where k = 'o2')) = '93/30/63/74',
  'pasugo moto 4.2km: 40+42+11=93, 50% capped at 30, fee 63, rider gets 80% of 93 = 74');
select pg_temp.expect_error($$select place_order('{"kind":"pasugo","pickup":{"name":"a","lat":14.5649,"lng":121.0368},"dropoff":{"name":"b","lat":14.5866,"lng":121.0614},"km":4.2,"description":"x","promo_code":"WELCOME50"}')$$, 'already used');
select pg_temp.expect_error($$select place_order('{"kind":"pasugo","pickup":{"name":"a","lat":14.5649,"lng":121.0368},"dropoff":{"name":"b","lat":14.5866,"lng":121.0614},"km":4.2,"description":"x","promo_code":"NOPE"}')$$, 'not found');

\echo '12. car-only pasugo goes to car riders; a rider can drop a job before arriving'
insert into ctx select 'o3', (place_order('{"kind":"pasugo","vehicle":"car","pickup":{"name":"a","lat":14.5649,"lng":121.0368},"dropoff":{"name":"b","lat":14.5866,"lng":121.0614},"km":4.2,"description":"Big box"}')).id;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.check((select count(*) from orders where id = (select v::uuid from ctx where k = 'o3')) = 0, 'moto rider does not see car job');
select pg_temp.expect_error($$select accept_order((select v::uuid from ctx where k = 'o3'))$$, 'already taken or cancelled');
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
select pg_temp.check(rider_balance(auth.uid()) = 21 - 74, 'balance 21 owed minus 74 owed to rider = -53');
select pg_temp.expect_error($$insert into rider_transactions (rider_id, type, amount) values (auth.uid(), 'payout', 1000)$$, 'row-level security');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
insert into rider_transactions (rider_id, type, amount, note) values ('00000000-0000-0000-0000-00000000000a', 'payout', 53, 'GCash payout');
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
select pg_temp.check((select fee || '/' || rider_earning from orders where id = (select v::uuid from ctx where k = 'o4')) = '113/85', 'new prices: 59+54=113, 75% = 85');
select pg_temp.check((select rider_earning from orders where id = (select v::uuid from ctx where k = 'o1')) = 82, 'old orders keep their original share');

\echo '15. anonymous visitors see nothing'
reset role;
set role anon;
select pg_temp.expect_error($$select count(*) from public.orders$$, 'permission denied');
select pg_temp.expect_error($$select public.place_order('{}')$$, 'permission denied');
reset role;

\echo 'ALL RULE TESTS PASSED'

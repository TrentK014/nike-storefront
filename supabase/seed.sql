-- Seed catalog for the beta environment. Deterministic ids so manifests,
-- findings and repro steps can refer to the same shoes across resets.

insert into public.shoes (id, shoe_name, display_image, gender, age, msrp, is_sport, is_classic, created_at) values
  ('00000000-0000-4000-8000-000000000001', 'Pegasus Trail 5',      '/assets/sample-shoe-1.png', 'men',   'adult', 140.00, true,  false, now() - interval '1 day'),
  ('00000000-0000-4000-8000-000000000002', 'Air Max 90',           '/assets/sample-shoe-2.png', 'men',   'adult', 130.00, false, true,  now() - interval '2 days'),
  ('00000000-0000-4000-8000-000000000003', 'Invincible 3',         '/assets/sample-shoe-3.png', 'women', 'adult', 180.00, true,  false, now() - interval '3 days'),
  ('00000000-0000-4000-8000-000000000004', 'Cortez',               '/assets/sample-shoe-4.png', 'women', 'adult',  90.00, false, true,  now() - interval '4 days'),
  ('00000000-0000-4000-8000-000000000005', 'Revolution 7 (Kids)',  '/assets/sample-shoe-5.png', null,    'kids',   55.00, true,  false, now() - interval '5 days'),
  ('00000000-0000-4000-8000-000000000006', 'Court Borough Low',    '/assets/sample-shoe-6.png', null,    'kids',   60.00, false, true,  now() - interval '6 days'),
  ('00000000-0000-4000-8000-000000000007', 'Vomero 18',            '/assets/sample-shoe-1.png', 'women', 'adult', 160.00, true,  false, now() - interval '7 days'),
  ('00000000-0000-4000-8000-000000000008', 'Blazer Mid 77',        '/assets/sample-shoe-2.png', 'men',   'adult', 105.00, false, true,  now() - interval '8 days');

-- Sizes x colors. Edge cases on purpose: sold-out sizes, single units left,
-- half sizes, and per-variant sale percentages.
insert into public.stock (shoe_id, size, color, quantity, sale_percent)
select s.id, sz.size, c.color,
       case
         when sz.size = '12' then 0                       -- sold out
         when sz.size = '8.5' then 1                      -- last one
         else 10
       end,
       case
         when s.id = '00000000-0000-4000-8000-000000000002' then 25      -- whole shoe on sale
         when s.id = '00000000-0000-4000-8000-000000000004' and c.color = 'White' then 35
         when s.id = '00000000-0000-4000-8000-000000000007' and sz.size in ('7', '7.5') then 20
         else 0
       end
from public.shoes s
cross join (values ('Black'), ('White')) as c(color)
cross join lateral (
  select unnest(case when s.age = 'kids' then array['1', '2', '3', '4', '5']
                     else array['7', '7.5', '8', '8.5', '9', '10', '11', '12'] end) as size
) sz;

insert into public.discount_codes (code, type, value, min_order_cents, valid_from, valid_until, max_uses) values
  ('WELCOME10', 'percent', 10,   0,     null,                        null,                        null),
  ('SAVE20',    'fixed',   2000, 10000, null,                        null,                        null),
  ('LIMITED1',  'percent', 50,   0,     null,                        null,                        1),     -- single use
  ('EXPIRED15', 'percent', 15,   0,     now() - interval '30 days',  now() - interval '1 day',    null),
  ('SOON25',    'percent', 25,   0,     now() + interval '7 days',   null,                        null);

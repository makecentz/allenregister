-- Live catalog snapshot from https://canvas.allenslane.org/classes on 2026-11-23.
-- Categories are normalized now so staff tooling can manage them in a later phase.
create table public.catalog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category_type text not null check (category_type in ('program', 'medium')),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, category_type)
);

create table public.catalog_item_categories (
  catalog_item_id uuid not null references public.catalog_items(id) on delete cascade,
  category_id uuid not null references public.catalog_categories(id) on delete restrict,
  primary key (catalog_item_id, category_id)
);

create index catalog_item_categories_category_idx on public.catalog_item_categories (category_id, catalog_item_id);

alter table public.catalog_categories enable row level security;
alter table public.catalog_item_categories enable row level security;

revoke all on table public.catalog_categories, public.catalog_item_categories from anon, authenticated;
grant select on table public.catalog_categories, public.catalog_item_categories to anon, authenticated;
grant insert, update, delete on table public.catalog_categories, public.catalog_item_categories to authenticated;

create policy "Anyone can view active catalog categories"
on public.catalog_categories for select to anon, authenticated
using (is_active = true);

create policy "Anyone can view categories for published catalog items"
on public.catalog_item_categories for select to anon, authenticated
using (exists (
  select 1 from public.catalog_items
  where catalog_items.id = catalog_item_categories.catalog_item_id
    and catalog_items.status = 'published'
));

create policy "Staff can manage catalog categories"
on public.catalog_categories for all to authenticated
using (exists (select 1 from public.staff_roles where staff_roles.user_id = (select auth.uid())))
with check (exists (select 1 from public.staff_roles where staff_roles.user_id = (select auth.uid())));

create policy "Staff can manage catalog item categories"
on public.catalog_item_categories for all to authenticated
using (exists (select 1 from public.staff_roles where staff_roles.user_id = (select auth.uid())))
with check (exists (select 1 from public.staff_roles where staff_roles.user_id = (select auth.uid())));

insert into public.catalog_categories (name, slug, category_type, sort_order) values
  ('Adult Programs', 'adult-programs', 'program', 10),
  ('Youth Programs', 'youth-programs', 'program', 20),
  ('Ceramics', 'ceramics', 'medium', 10),
  ('Drawing', 'drawing', 'medium', 20),
  ('All Media', 'all-media', 'medium', 30)
on conflict (slug) do update set name = excluded.name, category_type = excluded.category_type, sort_order = excluded.sort_order, is_active = true;

-- Each object preserves the source listing data used by the client catalog and future staff editor.
with source as (
  select * from jsonb_to_recordset($catalog$
  [
    {"id":"680","code":"27W-CER-0049","title":"Mini-Winter Session: Ceramic Open Studio","instructor":"Monitor Monitor","start":"2026-11-29","end":"2026-12-17","schedule":"Sunday – Saturday, November 29 - December 17, 2026 (16 sessions)","time":"Various times","location":"Ceramics Handbuilding","audience":"Adults","medium":"Ceramics","price":12000,"member_price":11500,"materials_fee":3500,"availability":"open"},
    {"id":"679","code":"27W-CER-0048","title":"Mini Winter: Ceramics Handbuilding: An Introduction","instructor":"Malik Nick McDonald","start":"2026-11-30","end":"2026-12-14","schedule":"Mondays, November 30 - December 14, 2026 (3 sessions)","time":"6:30 PM – 9:30 PM","location":"Ceramics Handbuilding","audience":"Adults","medium":"Ceramics","price":15000,"member_price":14300,"materials_fee":0,"availability":"waitlist"},
    {"id":"681","code":"27W-ADT-0050","title":"Mini Winter: Figure Drawing","instructor":"Peter Samuel","start":"2026-12-01","end":"2026-12-15","schedule":"Tuesdays, December 1 - 15, 2026 (3 sessions)","time":"6:30 PM – 9:30 PM","location":"Studio 2","audience":"Adults","medium":"Drawing","price":4800,"member_price":4600,"materials_fee":0,"availability":"open"},
    {"id":"682","code":"27W-CER-0051","title":"Mini Winter: Wheel Throwing Crash Course","instructor":"Linda Johnson","start":"2026-12-01","end":"2026-12-15","schedule":"Tuesdays, December 1 - 15, 2026 (3 sessions)","time":"6:30 PM – 9:30 PM","location":"Ceramics Wheel","audience":"Adults","medium":"Ceramics","price":10500,"member_price":10000,"materials_fee":3500,"availability":"waitlist"},
    {"id":"684","code":"27W-ADT-0052","title":"Mini Winter: Figure Drawing","instructor":"Peter Samuel","start":"2026-12-03","end":"2026-12-17","schedule":"Thursdays, December 3 - 17, 2026 (3 sessions)","time":"1:00 PM – 4:00 PM","location":"Studio 1","audience":"Adults","medium":"All Media","price":4800,"member_price":4600,"materials_fee":0,"availability":"open"},
    {"id":"686","code":"27W-ADT-0053","title":"Mini Winter Make-It-Friday!: Collage Creations","instructor":"Gerardine Aldamar","start":"2026-12-04","end":"2026-12-04","schedule":"Friday, December 4, 2026","time":"7:00 PM – 9:00 PM","location":"Studio 2","audience":"Adults","medium":"All Media","price":2500,"member_price":2400,"materials_fee":0,"availability":"open"},
    {"id":"687","code":"27W-ADT-0054","title":"Mini Winter Make-It-Friday!: Seasonal Printmaking","instructor":"Dre Grigoropol","start":"2026-12-04","end":"2026-12-04","schedule":"Friday, December 4, 2026","time":"6:30 PM – 9:30 PM","location":"Studio 1","audience":"Adults","medium":"All Media","price":3500,"member_price":3300,"materials_fee":0,"availability":"open"},
    {"id":"696","code":"27W-ADT-0114","title":"Make-It Friday: Candlemaking (Dec 4)","instructor":"Felicia Crisden","start":"2026-12-04","end":"2026-12-04","schedule":"Friday, December 4, 2026","time":"6:30 PM – 9:00 PM","location":"Studio 2","audience":"Adults","medium":"All Media","price":3500,"member_price":3300,"materials_fee":0,"availability":"open"},
    {"id":"688","code":"27W-ADT-0055","title":"Mini Winter: Fiber Arts - Crochet","instructor":"Shannan Williams","start":"2026-12-08","end":"2026-12-15","schedule":"Tuesdays, December 8 - 15, 2026 (2 sessions)","time":"7:00 PM – 9:00 PM","location":"Studio 2","audience":"Adults","medium":"All Media","price":6000,"member_price":5700,"materials_fee":0,"availability":"open"},
    {"id":"689","code":"27W-CER-0056","title":"Mini Winter: Ornaments & Stamps","instructor":"Samantha Moran","start":"2026-12-09","end":"2026-12-09","schedule":"Wednesday, December 9, 2026","time":"6:30 PM – 9:30 PM","location":"Ceramics Handbuilding","audience":"Adults","medium":"Ceramics","price":3800,"member_price":3600,"materials_fee":1000,"availability":"waitlist"},
    {"id":"690","code":"27W-ADT-0057","title":"Mini Winter Mask Making Workshop","instructor":"Barbara Gregson","start":"2026-12-12","end":"2026-12-13","schedule":"Saturday and Sunday, December 12 - 13, 2026 (2 sessions)","time":"10:00 AM – 2:00 PM","location":"None Specified","audience":"Adults","medium":"All Media","price":9000,"member_price":8600,"materials_fee":0,"availability":"open"},
    {"id":"693","code":"27W-CER-0108","title":"Mini Winter Surface Decoration Workshop","instructor":"Samantha Moran","start":"2026-12-12","end":"2026-12-13","schedule":"Saturday and Sunday, December 12 - 13, 2026 (2 sessions)","time":"10:00 AM – 1:00 PM","location":"Ceramics Handbuilding","audience":"Adults","medium":"Ceramics","price":7500,"member_price":7100,"materials_fee":1000,"availability":"open"},
    {"id":"631","code":"27W-ADT-0001","title":"Acrylic Painting: Vivid Visions","instructor":"TBD","start":"2027-01-04","end":"2027-02-08","schedule":"Mondays, January 4 - February 8, 2027 (5 sessions)","time":"6:30 PM – 9:30 PM","location":"Studio 1","audience":"Adults","medium":"All Media","price":17000,"member_price":16200,"materials_fee":0,"availability":"open"},
    {"id":"632","code":"27W-ADT-0002","title":"Linoleum Printmaking: Block & Roll!","instructor":"Romy Burkus","start":"2027-01-04","end":"2027-02-08","schedule":"Mondays, January 4 - February 8, 2027 (5 sessions)","time":"6:30 PM – 8:30 PM","location":"Studio 2","audience":"Adults","medium":"All Media","price":12000,"member_price":11500,"materials_fee":500,"availability":"open"},
    {"id":"634","code":"27W-CER-0003","title":"Monday Morning Pottery: Hand & Wheel (All Levels)","instructor":"Chloe Theodosiou","start":"2027-01-04","end":"2027-03-08","schedule":"Mondays, January 4 - March 8, 2027 (8 sessions)","time":"10:00 AM – 1:00 PM","location":"Ceramics Handbuilding","audience":"Adults","medium":"Ceramics","price":27000,"member_price":25000,"materials_fee":3500,"availability":"open"},
    {"id":"635","code":"27W-CER-0004","title":"Monday Evening Pottery: Hand & Wheel (All Levels)","instructor":"Malik Nick McDonald","start":"2027-01-04","end":"2027-03-08","schedule":"Mondays, January 4 - March 8, 2027 (8 sessions)","time":"6:30 PM – 9:30 PM","location":"Ceramics Handbuilding","audience":"Adults","medium":"Ceramics","price":27000,"member_price":25500,"materials_fee":3500,"availability":"open"},
    {"id":"653","code":"27W-CER-0026","title":"Ceramics Open Studio","instructor":"Monitor Monitor","start":"2027-01-04","end":"2027-03-08","schedule":"Mondays, January 4 - March 8, 2027 (10 sessions)","time":"1:00 PM – 4:00 PM","location":"Ceramics Handbuilding","audience":"Adults","medium":"Ceramics","price":20000,"member_price":19000,"materials_fee":3500,"availability":"open"},
    {"id":"665","code":"27W-5-0035","title":"After School Studios: Character Building","instructor":"Sarah Clemency","start":"2027-01-04","end":"2027-03-15","schedule":"Mondays, January 4 - March 15, 2027 (9 sessions)","time":"4:00 PM – 5:30 PM","location":"Theater","audience":"Youth","medium":"All Media","price":18000,"member_price":17100,"materials_fee":1000,"availability":"open"},
    {"id":"636","code":"27W-ADT-0005","title":"Figure Drawing Open Studio","instructor":"Peter Samuel","start":"2027-01-05","end":"2027-03-09","schedule":"Tuesdays, January 5 - March 9, 2027 (10 sessions)","time":"6:30 PM – 9:30 PM","location":"Studio 1","audience":"Adults","medium":"All Media","price":16000,"member_price":15200,"materials_fee":0,"availability":"open"},
    {"id":"637","code":"27W-CER-0006","title":"Tuesday Morning Pottery: Handbuilding with Function (All Levels)","instructor":"Chloe Theodosiou","start":"2027-01-05","end":"2027-03-09","schedule":"Tuesdays, January 5 - March 9, 2027 (10 sessions)","time":"10:00 AM – 1:00 PM","location":"Ceramics Handbuilding","audience":"Adults","medium":"Ceramics","price":34500,"member_price":32800,"materials_fee":3500,"availability":"open"},
    {"id":"638","code":"27W-CER-0007","title":"Tuesday Evening Pottery: Intro to Wheel Throwing (Beginners)","instructor":"Robin Williams-Turnage","start":"2027-01-05","end":"2027-03-09","schedule":"Tuesdays, January 5 - March 9, 2027 (10 sessions)","time":"6:30 PM – 9:30 PM","location":"Ceramics Wheel","audience":"Adults","medium":"Ceramics","price":34500,"member_price":32800,"materials_fee":3500,"availability":"waitlist"},
    {"id":"666","code":"27W-5-0036","title":"After School Studios: Clay Play (9-12)","instructor":"Zipora Schulz","start":"2027-01-05","end":"2027-03-16","schedule":"Tuesdays, January 5 - March 16, 2027 (11 sessions)","time":"4:00 PM – 5:30 PM","location":"Ceramics Handbuilding","audience":"Youth","medium":"All Media","price":22000,"member_price":20900,"materials_fee":1000,"availability":"open"},
    {"id":"667","code":"27W-5-0037","title":"After School Studios: Young Actors Improv (6-8)","instructor":"Josh Gold","start":"2027-01-05","end":"2027-03-16","schedule":"Tuesdays, January 5 - March 16, 2027 (11 sessions)","time":"4:00 PM – 5:30 PM","location":"Theater","audience":"Youth","medium":"All Media","price":22000,"member_price":20900,"materials_fee":1000,"availability":"open"},
    {"id":"639","code":"27W-CER-0008","title":"Wednesday Afternoon Handbuilding: Functional to Sculptural (All Levels)","instructor":"Samantha Moran","start":"2027-01-06","end":"2027-03-10","schedule":"Wednesdays, January 6 - March 10, 2027 (10 sessions)","time":"1:00 PM – 4:00 PM","location":"Ceramics Handbuilding","audience":"Adults","medium":"Ceramics","price":34500,"member_price":32800,"materials_fee":3500,"availability":"open"},
    {"id":"640","code":"27W-ADT-0010","title":"Wednesday Evening Pottery: Hand & Wheel (All Levels)","instructor":"Dehmie Dehmlow","start":"2027-01-06","end":"2027-03-10","schedule":"Wednesdays, January 6 - March 10, 2027 (10 sessions)","time":"6:30 PM – 9:30 PM","location":"Ceramics Handbuilding","audience":"Adults","medium":"All Media","price":34500,"member_price":32800,"materials_fee":3500,"availability":"waitlist"},
    {"id":"641","code":"27W-ADT-0011","title":"Screen Printing for the Home Studio","instructor":"Dre Grigoropol","start":"2027-01-06","end":"2027-02-10","schedule":"Wednesdays, January 6 - February 10, 2027 (6 sessions)","time":"6:30 PM – 9:30 PM","location":"Studio 2","audience":"Adults","medium":"All Media","price":20500,"member_price":19500,"materials_fee":2000,"availability":"open"},
    {"id":"642","code":"27W-ADT-0009","title":"Acrylic Painting: Vivid Visions (Wednesday Afternoon)","instructor":"Albert Fung","start":"2027-01-06","end":"2027-02-03","schedule":"Wednesdays, January 6 - February 3, 2027 (5 sessions)","time":"1:00 PM – 4:00 PM","location":"Studio 1","audience":"Adults","medium":"All Media","price":17000,"member_price":16300,"materials_fee":0,"availability":"open"},
    {"id":"663","code":"27W-ADT-0033","title":"Vision Thru Art - Wednesdays","instructor":"Zipora Schulz","start":"2027-01-06","end":"2027-03-10","schedule":"Wednesdays, January 6 - March 10, 2027 (10 sessions)","time":"10:30 AM – 12:30 PM","location":"Studio 1","audience":"Adults","medium":"All Media","price":0,"member_price":0,"materials_fee":0,"availability":"info"},
    {"id":"668","code":"27W-5-0038","title":"After School Studios: Clay Creation (6-8)","instructor":"Dehmie Dehmlow","start":"2027-01-06","end":"2027-03-17","schedule":"Wednesdays, January 6 - March 17, 2027 (11 sessions)","time":"4:00 PM – 5:30 PM","location":"Ceramics Handbuilding","audience":"Youth","medium":"All Media","price":22000,"member_price":20900,"materials_fee":1000,"availability":"open"},
    {"id":"669","code":"27W-5-0039","title":"After School Studios: Fantastic Fibers (9-12)","instructor":"Bex Ulm","start":"2027-01-06","end":"2027-03-17","schedule":"Wednesdays, January 6 - March 17, 2027 (11 sessions)","time":"4:00 PM – 5:30 PM","location":"Studio 1","audience":"Youth","medium":"All Media","price":22000,"member_price":20900,"materials_fee":1000,"availability":"open"},
    {"id":"643","code":"27W-ADT-0012","title":"Diving Into Watercolor (Thursday Evening)","instructor":"Albert Fung","start":"2027-01-07","end":"2027-02-04","schedule":"Thursdays, January 7 - February 4, 2027 (5 sessions)","time":"6:30 PM – 9:00 PM","location":"Studio 2","audience":"Adults","medium":"All Media","price":16000,"member_price":15200,"materials_fee":0,"availability":"open"},
    {"id":"644","code":"27W-ADT-0013","title":"Drawing for Beginners","instructor":"Emilio Maldonado","start":"2027-01-07","end":"2027-02-04","schedule":"Thursdays, January 7 - February 4, 2027 (5 sessions)","time":"6:30 PM – 9:00 PM","location":"Studio 1","audience":"Adults","medium":"All Media","price":16000,"member_price":15200,"materials_fee":1500,"availability":"open"},
    {"id":"645","code":"27W-ADT-0014","title":"Thursday Afternoon Figure Drawing Open Studio","instructor":"Peter Samuel","start":"2027-01-07","end":"2027-03-11","schedule":"Thursdays, January 7 - March 11, 2027 (10 sessions)","time":"1:00 PM – 4:00 PM","location":"Studio 1","audience":"Adults","medium":"All Media","price":16000,"member_price":15200,"materials_fee":0,"availability":"open"},
    {"id":"646","code":"27W-CER-0015","title":"Thursday Morning Wheel Throwing (All Levels)","instructor":"Nathan Willever","start":"2027-01-07","end":"2027-03-11","schedule":"Thursdays, January 7 - March 11, 2027 (10 sessions)","time":"10:00 AM – 1:00 PM","location":"Ceramics Wheel","audience":"Adults","medium":"Ceramics","price":34500,"member_price":32700,"materials_fee":3500,"availability":"waitlist"},
    {"id":"670","code":"27W-5-0040","title":"After School Studio: Mixed Media Fun","instructor":"Bex Ulm","start":"2027-01-07","end":"2027-03-18","schedule":"Thursdays, January 7 - March 18, 2027 (11 sessions)","time":"4:00 PM – 5:30 PM","location":"Studio 1","audience":"Youth","medium":"All Media","price":22000,"member_price":20900,"materials_fee":1000,"availability":"open"},
    {"id":"672","code":"27W-5-0041","title":"After School Studio: Illustrated Worlds","instructor":"TBD","start":"2027-01-07","end":"2027-03-18","schedule":"Thursdays, January 7 - March 18, 2027 (11 sessions)","time":"4:00 PM – 5:30 PM","location":"Theater","audience":"Youth","medium":"All Media","price":22000,"member_price":20900,"materials_fee":1000,"availability":"open"},
    {"id":"664","code":"27W-ADT-0034","title":"Vision Thru Art - Fridays","instructor":"Lexi Arrietta","start":"2027-01-08","end":"2027-03-12","schedule":"Fridays, January 8 - March 12, 2027 (10 sessions)","time":"10:30 AM – 12:30 PM","location":"Studio 1","audience":"Adults","medium":"All Media","price":0,"member_price":0,"materials_fee":0,"availability":"info"},
    {"id":"647","code":"27W-ADT-0016","title":"Saturday Morning: Intro to Pottery (Beginners)","instructor":"Chloe Theodosiou","start":"2027-01-09","end":"2027-03-13","schedule":"Saturdays, January 9 - March 13, 2027 (10 sessions)","time":"10:00 AM – 1:00 PM","location":"Ceramics Handbuilding","audience":"Adults","medium":"All Media","price":34500,"member_price":32800,"materials_fee":3500,"availability":"open"},
    {"id":"692","code":"27W-ADT-0060","title":"Stained Glass Basics (Off-Site)","instructor":"Greg Stefan","start":"2027-01-12","end":"2027-01-26","schedule":"Tuesdays, January 12 - 26, 2027 (3 sessions)","time":"6:30 PM – 9:00 PM","location":"None Selected","audience":"Adults","medium":"All Media","price":25000,"member_price":23800,"materials_fee":0,"availability":"open"},
    {"id":"655","code":"27W-ADT-0027","title":"Make it Friday!: Winter Print Party","instructor":"Dre Grigoropol","start":"2027-01-15","end":"2027-01-15","schedule":"Friday, January 15, 2027","time":"6:30 PM – 9:00 PM","location":"Studio 1","audience":"Adults","medium":"All Media","price":3000,"member_price":2900,"materials_fee":0,"availability":"open"},
    {"id":"662","code":"27W-CER-0032","title":"Make it Friday!: Mug Madness Workshop","instructor":"TBD","start":"2027-01-15","end":"2027-01-15","schedule":"Friday, January 15, 2027","time":"6:30 PM – 9:30 PM","location":"Ceramics Handbuilding","audience":"Adults","medium":"Ceramics","price":3800,"member_price":3600,"materials_fee":0,"availability":"open"},
    {"id":"676","code":"27W-5-0044","title":"Day off Camp Clay (ages 6 - 8)","instructor":"Linda Johnson","start":"2027-01-15","end":"2027-01-15","schedule":"Friday, January 15, 2027","time":"9:00 AM – 3:30 PM","location":"Ceramics Handbuilding","audience":"Youth","medium":"All Media","price":7000,"member_price":6700,"materials_fee":0,"availability":"open"},
    {"id":"677","code":"27W-5-0045","title":"Day Off Camp: Theater Workshop (ages 9-12)","instructor":"TBD","start":"2027-01-15","end":"2027-01-15","schedule":"Friday, January 15, 2027","time":"9:00 AM – 3:30 PM","location":"Theater","audience":"Youth","medium":"All Media","price":7000,"member_price":6700,"materials_fee":0,"availability":"open"},
    {"id":"673","code":"27W-5-0042","title":"Teen Community Pottery: Spin & Build","instructor":"TBD","start":"2027-01-16","end":"2027-03-06","schedule":"Saturdays, January 16 - March 6, 2027 (8 sessions)","time":"1:00 PM – 4:00 PM","location":"Ceramics Wheel","audience":"Youth","medium":"All Media","price":1500,"member_price":1500,"materials_fee":0,"availability":"open"},
    {"id":"674","code":"27W-5-0043","title":"Teen Community: Drawing Workshop","instructor":"Bex Ulm","start":"2027-01-16","end":"2027-03-06","schedule":"Saturdays, January 16 - March 6, 2027 (8 sessions)","time":"10:00 AM – 1:00 PM","location":"Ceramics Wheel","audience":"Youth","medium":"All Media","price":1500,"member_price":1500,"materials_fee":0,"availability":"open"},
    {"id":"671","code":"27W-CER-0017","title":"Sunday Morning: Nerikomi","instructor":"Mackenzie Pikaart","start":"2027-01-17","end":"2027-02-28","schedule":"Sundays, January 17 - February 28, 2027 (7 sessions)","time":"10:00 AM – 1:00 PM","location":"Ceramics Handbuilding","audience":"Adults","medium":"Ceramics","price":24000,"member_price":22800,"materials_fee":5000,"availability":"open"},
    {"id":"648","code":"27W-ADT-0020","title":"Watercolor for Beginners (Monday Morning)","instructor":"Rebecca J Hoenig","start":"2027-02-01","end":"2027-03-08","schedule":"Mondays, February 1 - March 8, 2027 (6 sessions)","time":"10:00 AM – 12:00 PM","location":"Studio 1","audience":"Adults","medium":"All Media","price":12000,"member_price":11400,"materials_fee":0,"availability":"open"},
    {"id":"649","code":"27W-ADT-0021","title":"Mixed Media: What Do You Love","instructor":"Linda Dubin Garfield","start":"2027-02-02","end":"2027-03-02","schedule":"Tuesdays, February 2 - March 2, 2027 (5 sessions)","time":"10:00 AM – 12:00 PM","location":"Studio 1","audience":"Adults","medium":"All Media","price":12000,"member_price":11400,"materials_fee":0,"availability":"open"},
    {"id":"695","code":"27W-ADT-0062","title":"Mixed Media: Contemporary Composition","instructor":"Mostafa Darwish","start":"2027-02-09","end":"2027-03-09","schedule":"Tuesdays, February 9 - March 9, 2027 (5 sessions)","time":"7:00 PM – 9:30 PM","location":"Studio 1","audience":"Adults","medium":"All Media","price":14000,"member_price":13300,"materials_fee":0,"availability":"open"},
    {"id":"650","code":"27W-ADT-0022","title":"Drawing: The Art of Pastel (Wednesday Afternoon)","instructor":"Albert Fung","start":"2027-02-10","end":"2027-03-10","schedule":"Wednesdays, February 10 - March 10, 2027 (5 sessions)","time":"1:00 PM – 4:00 PM","location":"Studio 1","audience":"Adults","medium":"All Media","price":18000,"member_price":17100,"materials_fee":0,"availability":"open"},
    {"id":"694","code":"27W-ADT-0061","title":"Discovering your Creativity","instructor":"Bex Ulm","start":"2027-02-10","end":"2027-03-10","schedule":"Wednesdays, February 10 - March 10, 2027 (5 sessions)","time":"10:00 AM – 12:00 PM","location":"Studio 1","audience":"Adults","medium":"All Media","price":16000,"member_price":15200,"materials_fee":0,"availability":"open"},
    {"id":"651","code":"27W-ADT-0023","title":"Improving Your Drawing Techniques","instructor":"Emilio Maldonado","start":"2027-02-11","end":"2027-03-11","schedule":"Thursdays, February 11 - March 11, 2027 (5 sessions)","time":"6:30 PM – 9:00 PM","location":"Studio 1","audience":"Adults","medium":"All Media","price":16000,"member_price":15200,"materials_fee":2500,"availability":"open"},
    {"id":"652","code":"27W-ADT-0024","title":"Drawing: The Art of Pastel (Thursday Evening)","instructor":"Albert Fung","start":"2027-02-11","end":"2027-03-11","schedule":"Thursdays, February 11 - March 11, 2027 (5 sessions)","time":"6:30 PM – 9:30 PM","location":"Studio 2","audience":"Adults","medium":"All Media","price":18000,"member_price":17100,"materials_fee":0,"availability":"open"},
    {"id":"656","code":"27W-ADT-0028","title":"Make it Friday!: Candle Craft","instructor":"Felicia Crisden","start":"2027-02-12","end":"2027-02-12","schedule":"Friday, February 12, 2027","time":"6:30 PM – 9:00 PM","location":"Studio 2","audience":"Adults","medium":"All Media","price":3000,"member_price":2900,"materials_fee":0,"availability":"open"},
    {"id":"658","code":"27W-CER-0029","title":"Make it Friday!: Ceramics Pasta and Charcuterie Board Making","instructor":"Chloe Theodosiou","start":"2027-02-12","end":"2027-02-12","schedule":"Friday, February 12, 2027","time":"6:30 PM – 9:30 PM","location":"Ceramics Handbuilding","audience":"Adults","medium":"Ceramics","price":3800,"member_price":3500,"materials_fee":0,"availability":"open"},
    {"id":"675","code":"27W-5-0047","title":"Day off Camp Clay (ages 9 - 12)","instructor":"Linda Johnson","start":"2027-02-12","end":"2027-02-12","schedule":"Friday, February 12, 2027","time":"9:00 AM – 3:30 PM","location":"Ceramics Handbuilding","audience":"Youth","medium":"All Media","price":7000,"member_price":6700,"materials_fee":0,"availability":"open"},
    {"id":"678","code":"27W-5-0046","title":"Day Off Camp: Theater Workshop (ages 6-8)","instructor":"TBD","start":"2027-02-12","end":"2027-02-12","schedule":"Friday, February 12, 2027","time":"9:00 AM – 3:30 PM","location":"Theater","audience":"Youth","medium":"All Media","price":7000,"member_price":6700,"materials_fee":0,"availability":"open"},
    {"id":"654","code":"27W-ADT-0034","title":"Color for Printmaking","instructor":"Romy Burkus","start":"2027-02-22","end":"2027-03-08","schedule":"Mondays, February 22 - March 8, 2027 (3 sessions)","time":"6:30 PM – 9:30 PM","location":"Studio 2","audience":"Adults","medium":"All Media","price":10500,"member_price":10000,"materials_fee":0,"availability":"open"},
    {"id":"659","code":"27W-CER-0030","title":"Make it Friday!: Custom Planters","instructor":"Chloe Theodosiou","start":"2027-03-12","end":"2027-03-12","schedule":"Friday, March 12, 2027","time":"6:30 PM – 9:30 PM","location":"Ceramics Handbuilding","audience":"Adults","medium":"Ceramics","price":3800,"member_price":3500,"materials_fee":0,"availability":"open"},
    {"id":"661","code":"27W-ADT-0031","title":"Make it Friday!: Collage Creations","instructor":"Gerardine Aldamar","start":"2027-03-12","end":"2027-03-12","schedule":"Friday, March 12, 2027","time":"6:30 PM – 9:00 PM","location":"Studio 1","audience":"Adults","medium":"All Media","price":3000,"member_price":2900,"materials_fee":0,"availability":"open"}
  ]
  $catalog$::jsonb) as row(
    id text, code text, title text, instructor text, start date, "end" date,
    schedule text, time text, location text, audience text, medium text,
    price integer, member_price integer, materials_fee integer, availability text
  )
), upserted as (
  insert into public.catalog_items (
    item_type, status, slug, title, short_description, audience, starts_on, ends_on,
    location, price_cents, requires_registration, sort_order, metadata, published_at
  )
  select
    'class', 'published', 'canvas-class-' || id, title,
    schedule || ' · ' || time || ' · ' || location,
    audience, start, "end", location, price, true,
    (row_number() over (order by start, id))::integer,
    jsonb_build_object(
      'source', 'art-center-canvas',
      'source_class_id', id,
      'source_url', 'https://canvas.allenslane.org/classes/' || id,
      'course_code', code,
      'instructor', instructor,
      'schedule_text', schedule,
      'time_text', time,
      'medium', medium,
      'member_price_cents', member_price,
      'materials_fee_cents', materials_fee,
      'availability', availability
    ), now()
  from source
  on conflict (slug) do update set
    title = excluded.title, short_description = excluded.short_description,
    audience = excluded.audience, starts_on = excluded.starts_on, ends_on = excluded.ends_on,
    location = excluded.location, price_cents = excluded.price_cents,
    metadata = excluded.metadata, status = 'published', published_at = now(), updated_at = now()
  returning id, slug
)
insert into public.catalog_item_categories (catalog_item_id, category_id)
select i.id, c.id
from source s
join upserted i on i.slug = 'canvas-class-' || s.id
join public.catalog_categories c on c.slug = case
  when c.category_type = 'program' then case when s.audience = 'Youth' then 'youth-programs' else 'adult-programs' end
  else case s.medium when 'Ceramics' then 'ceramics' when 'Drawing' then 'drawing' else 'all-media' end
end
on conflict do nothing;

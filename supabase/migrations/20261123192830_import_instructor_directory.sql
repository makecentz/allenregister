create table public.instructors (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  slug text not null unique,
  full_name text not null,
  short_bio text,
  biography text,
  image_url text,
  website_url text,
  specialties text[] not null default '{}',
  source_provider text,
  source_instructor_id text,
  source_profile_url text,
  sort_order integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index instructors_public_browse_idx on public.instructors (sort_order, full_name) where status = 'published';

alter table public.instructors enable row level security;
revoke all on public.instructors from anon, authenticated;
grant select on public.instructors to anon, authenticated;
grant insert, update, delete on public.instructors to authenticated;

create policy "Published instructors are public"
on public.instructors for select
using (status = 'published' or exists (select 1 from public.staff_roles where user_id = auth.uid()));

create policy "Staff manage instructors"
on public.instructors for all to authenticated
using (exists (select 1 from public.staff_roles where user_id = auth.uid()))
with check (exists (select 1 from public.staff_roles where user_id = auth.uid()));

with directory(source_id, full_name, short_bio, biography, image_url) as (
  values
    ('10893','Gerardine Aldamar','Philadelphia-based artist and educator working across painting and drawing.','Gerardine Aldamar is a Philadelphia-based artist and educator. Her work explores memory, place, and the expressive possibilities of painting and drawing.','https://alnimages.artcentercanvas.com/library/artist//10893_0534.jpg'),
    ('8389','Inga Kimberly Brown','Artist and educator.','Artist and educator at Allens Lane Art Center.',null),
    ('9752','Romy Burkus','Philadelphia artist, educator, and curator.','Romy Burkus is a Philadelphia-based artist, educator, and curator whose practice centers material exploration and community learning.','https://alnimages.artcentercanvas.com/library/artist//9752_4794.jpg'),
    ('12197','Sarah Clemency','Artist and educator.','Sarah Clemency is an artist and educator at Allens Lane Art Center.','https://alnimages.artcentercanvas.com/library/artist//12197_3947.jpg'),
    ('9581','Felicia Crisden',null,null,null),
    ('12353','Mostafa Darwish',null,null,null),
    ('12227','Dehmie Dehmlow',null,null,null),
    ('12199','Linda Dubin Garfield',null,null,null),
    ('8295','Albert Fung','Artist and educator.','Albert Fung is an artist and educator at Allens Lane Art Center.',null),
    ('9823','Josh Gold',null,null,null),
    ('12324','Barbara Gregson','Ceramic artist and teacher.','Barbara Gregson is a ceramic artist and teacher. Her work and instruction focus on the possibilities of clay.','https://alnimages.artcentercanvas.com/library/artist//12324_3947.jpg'),
    ('12219','Dre Grigoropol',null,null,null),
    ('8400','Rebecca J Hoenig','Artist and educator.','Rebecca J Hoenig is an artist and educator at Allens Lane Art Center.',null),
    ('12198','Linda Johnson','Artist and educator.','Linda Johnson is an artist and educator at Allens Lane Art Center.',null),
    ('12196','Hannah Judd','Artist and educator.','Hannah Judd is an artist and educator at Allens Lane Art Center.',null),
    ('10279','Emilio Maldonado','Artist and educator.','Emilio Maldonado is an artist and educator at Allens Lane Art Center.',null),
    ('10205','Malik Nick McDonald','Multimedia sculptor and educator.','Nicholas Malik McDonald is a multimedia sculptor and educator whose work explores material, form, and cultural memory.',null),
    ('9051','Monitor Monitor',null,null,null),
    ('8402','Samantha Moran','Artist and educator.','Samantha Moran is an artist and educator at Allens Lane Art Center.',null),
    ('11569','Mackenzie Pikaart','Artist and educator.','Mackenzie Pikaart is an artist and educator at Allens Lane Art Center.',null),
    ('555','Peter Samuel',null,null,null),
    ('8973','Zipora Schulz',null,null,null),
    ('12091','Greg Stefan','Artist and educator.','Greg Stefan is an artist and educator at Allens Lane Art Center.',null),
    ('9050','TBD TBD',null,null,null),
    ('9341','Chloe Theodosiou','Ceramic artist and educator.','Chloe Theodosiou is a ceramic artist and educator at Allens Lane Art Center.',null),
    ('12195','Bex Ulm','Artist and educator.','Bex Ulm is an artist and educator at Allens Lane Art Center.',null),
    ('8405','Nathan Willever','Artist and educator.','Nathan Willever is an artist and educator at Allens Lane Art Center.',null),
    ('12165','Shannan Williams',null,null,null),
    ('8406','Robin Williams-Turnage','Ceramic artist and educator.','Robin Williams-Turnage is a ceramic artist and educator at Allens Lane Art Center.',null)
)
insert into public.instructors (status, slug, full_name, short_bio, biography, image_url, source_provider, source_instructor_id, source_profile_url, sort_order, published_at)
select 'published', lower(regexp_replace(regexp_replace(translate(full_name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '[^a-z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')), full_name, short_bio, biography, image_url, 'art-center-canvas', source_id, 'https://canvas.allenslane.org/instructors/' || source_id, row_number() over (order by full_name), now()
from directory
on conflict (slug) do update set full_name = excluded.full_name, short_bio = excluded.short_bio, biography = excluded.biography, image_url = excluded.image_url, source_provider = excluded.source_provider, source_instructor_id = excluded.source_instructor_id, source_profile_url = excluded.source_profile_url, status = excluded.status, published_at = excluded.published_at;

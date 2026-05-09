-- 0008_brand_seed.sql
-- Repositionnement de marque : Hamarea = sacoches étanches / lunettes / casquettes.
-- - Désactive les catégories génériques héritées (accessoires/maison/mode)
-- - Insère/met à jour les 3 catégories réelles avec libellés i18n
-- - Met à jour le shop_settings.shipping (palier livraison offerte aligné copy)

update public.categories
   set active = false
 where slug in ('accessoires', 'maison', 'mode');

insert into public.categories (slug, name_i18n, description_i18n, position, active)
values
  (
    'sacoches',
    '{"fr":"Sacoches","en":"Bags","es":"Bolsas","de":"Taschen"}'::jsonb,
    '{"fr":"Sacoches étanches roll-top et bandoulière","en":"Waterproof roll-top and crossbody bags","es":"Bolsas estancas roll-top","de":"Wasserdichte Roll-Top-Taschen"}'::jsonb,
    1,
    true
  ),
  (
    'lunettes',
    '{"fr":"Lunettes","en":"Sunglasses","es":"Gafas","de":"Sonnenbrillen"}'::jsonb,
    '{"fr":"Solaires polarisées UV400","en":"UV400 polarized eyewear","es":"Gafas polarizadas UV400","de":"Polarisierte Sonnenbrillen UV400"}'::jsonb,
    2,
    true
  ),
  (
    'casquettes',
    '{"fr":"Casquettes","en":"Caps","es":"Gorras","de":"Kappen"}'::jsonb,
    '{"fr":"Casquettes 6-panneaux et trucker","en":"6-panel and trucker caps","es":"Gorras 6-paneles y trucker","de":"6-Panel- und Trucker-Kappen"}'::jsonb,
    3,
    true
  )
on conflict (slug) do update
  set name_i18n        = excluded.name_i18n,
      description_i18n = excluded.description_i18n,
      position         = excluded.position,
      active           = true;

-- Update shipping threshold to match the new hero copy (livraison offerte dès 80€)
update public.shop_settings
   set value = jsonb_set(value, '{freeAbove}', to_jsonb(8000))
 where key = 'shipping';

update public.shop_settings
   set value = jsonb_build_object(
     'name', 'Hamarea',
     'supportEmail', 'hello@hamarea.com',
     'tagline', 'Sacoches étanches, lunettes & casquettes — pensés pour partir loin.'
   )
 where key = 'site';

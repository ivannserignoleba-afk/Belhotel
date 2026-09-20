-- ---------------------------------------------------------------------------
-- Belhotel — points QR en double : nettoyage ET interdiction définitive
-- ---------------------------------------------------------------------------
-- Le 14/08/2026, un double-clic sur le bouton « + » de l'écran QR codes a créé
-- deux fois « Table 9 » et deux fois « Table 10 » (à 0,16 s et 0,28 s d'écart).
--
-- Trois verrous sont posés, du plus fragile au plus solide :
--   1. l'application verrouille le bouton pendant l'enregistrement (fait) ;
--   2. elle traite proprement le refus de la base (fait) ;
--   3. LA BASE REFUSE elle-même deux noms identiques — c'est ce script.
-- Le verrou 3 est le seul qui protège aussi contre deux appareils qui
-- cliqueraient au même instant, ou deux onglets ouverts en parallèle.
--
-- À coller dans le SQL Editor de Supabase, puis Ctrl + Entrée.
-- ---------------------------------------------------------------------------


-- ÉTAPE 1 — Supprimer les doublons qui n'ont JAMAIS servi.
--
-- Règle : pour chaque nom en double on GARDE celui qui a déjà reçu des
-- commandes (c'est donc l'affiche réellement posée en salle), et à défaut le
-- plus ancien. On ne supprime que ceux qui n'ont jamais été scannés, donc
-- aucun historique de commande n'est perdu et aucune affiche en circulation
-- ne cesse de fonctionner.
with classement as (
  select
    p.id,
    count(o.id) as commandes,
    row_number() over (
      partition by p.type, lower(trim(p.label))
      order by count(o.id) desc, p.created_at asc
    ) as rang
  from public.qr_points p
  left join public.orders o on o.qr_point_id = p.id
  group by p.id, p.type, p.label, p.created_at
)
delete from public.qr_points
where id in (select id from classement where rang > 1 and commandes = 0);


-- ÉTAPE 2 — Garde-fou.
-- S'il reste des doublons, c'est que les DEUX affiches d'un même nom ont déjà
-- été scannées : elles sont donc toutes les deux en circulation en salle.
-- Aucun script ne peut deviner laquelle retirer — on s'arrête avec un message
-- clair plutôt que de supprimer au hasard.
do $$
declare
  restants text;
begin
  select string_agg(nom, ', ')
    into restants
  from (
    select min(label) as nom
    from public.qr_points
    group by type, lower(trim(label))
    having count(*) > 1
  ) d;

  if restants is not null then
    raise exception
      'Doublons impossibles à trancher automatiquement : %. Ces QR ont tous les deux déjà reçu des commandes, donc les deux affiches sont posées en salle. Allez voir physiquement laquelle garder, supprimez l''autre à la main, puis relancez ce script.', restants;
  end if;
end $$;


-- ÉTAPE 3 — Interdiction définitive.
-- À partir d'ici, la base refuse elle-même deux points de même type portant le
-- même nom, quelle que soit la manière dont on essaie de les créer.
-- « Table 9 », « table 9 » et « Table 9  » sont considérés comme identiques.
create unique index if not exists qr_points_type_label_unique
  on public.qr_points (type, lower(trim(label)));


-- ÉTAPE 4 — Contrôle. Doit afficher « aucun doublon ».
select
  case
    when count(*) = 0 then 'aucun doublon — la base est propre et protégée'
    else count(*) || ' doublon(s) restant(s)'
  end as resultat
from (
  select 1
  from public.qr_points
  group by type, lower(trim(label))
  having count(*) > 1
) d;

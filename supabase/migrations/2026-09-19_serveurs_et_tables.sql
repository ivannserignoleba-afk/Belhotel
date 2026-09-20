-- ---------------------------------------------------------------------------
-- Belhotel — assignation des tables aux serveurs + accusé de réception
-- ---------------------------------------------------------------------------
-- À exécuter UNE SEULE FOIS dans le SQL Editor de Supabase.
--
-- Ce script est purement ADDITIF : il n'ajoute que des colonnes et des index.
-- Aucune règle de sécurité (RLS) n'est créée, modifiée ni supprimée — les
-- nouvelles colonnes héritent automatiquement des règles déjà en place sur
-- leur table. Rien de ce qui fonctionne aujourd'hui ne peut donc casser.
--
-- Il est ré-exécutable sans danger (« if not exists » partout).
-- ---------------------------------------------------------------------------

-- 1) Secteur d'un compte serveur.
--    Un serveur du bar ne reçoit que les commandes du bar, et inversement.
--    Reste NULL pour les autres rôles (réception, cuisine, direction).
alter table public.admins
  add column if not exists sector text check (sector in ('resto', 'bar'));

comment on column public.admins.sector is
  'Comptes serveur uniquement : pôle dont le serveur reçoit les commandes (resto ou bar).';

-- 2) Serveur responsable d'un point de commande.
--    Une table n'a qu'un seul responsable ; un serveur peut en avoir plusieurs.
--    Si le compte du serveur est supprimé, la table redevient simplement libre.
alter table public.qr_points
  add column if not exists assigned_to uuid references public.admins(id) on delete set null;

create index if not exists qr_points_assigned_to_idx
  on public.qr_points (assigned_to);

comment on column public.qr_points.assigned_to is
  'Serveur responsable de cette table / de ce salon. NULL = table non assignée.';

-- 3) Accusé de réception du serveur.
--    Indépendant du flux de la cuisine : la cuisine prépare même si le serveur
--    n'a pas encore cliqué, pour qu'une commande ne reste jamais bloquée.
alter table public.orders
  add column if not exists received_at timestamptz,
  add column if not exists received_by uuid references public.admins(id) on delete set null;

-- Index partiel : sert à retrouver vite les commandes encore non prises en charge.
create index if not exists orders_not_received_idx
  on public.orders (created_at)
  where received_at is null;

comment on column public.orders.received_at is
  'Heure du clic sur « Reçu » par le serveur. NULL = pas encore prise en charge.';
comment on column public.orders.received_by is
  'Serveur qui a cliqué sur « Reçu » (pas forcément celui assigné, en cas de reprise).';

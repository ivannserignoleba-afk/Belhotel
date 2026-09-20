// Tests des règles du tableau serveur.
// Lancer avec :  node scripts/test-serveur.mjs
//
// Ne touche ni à la base, ni au réseau : on fabrique des commandes en mémoire
// et on vérifie qui doit les voir.

import { splitServeurOrders, ACK_DEADLINE_MS } from '../lib/serveurOrders.mjs';

const MOI = 'serveur-awa';
const COLLEGUE = 'serveur-kofi';
const MAINTENANT = new Date('2026-09-20T12:00:00Z').getTime();

// Fabrique une commande : il y a `ageSec` secondes, sur la table de `owner`.
function commande({ id, owner, ageSec, status = 'sent', received = false }) {
  return {
    id,
    status,
    created_at: new Date(MAINTENANT - ageSec * 1000).toISOString(),
    received_at: received ? new Date(MAINTENANT - 1000).toISOString() : null,
    qr_points: owner === undefined ? null : { label: 'Table 1', assigned_to: owner },
  };
}

let reussis = 0;
let echecs = 0;

function verifie(intitule, condition) {
  if (condition) {
    reussis += 1;
    console.log(`  OK    ${intitule}`);
  } else {
    echecs += 1;
    console.log(`  ECHEC ${intitule}`);
  }
}

function repartition(orders) {
  const { mine, toTakeOver } = splitServeurOrders(orders, MOI, MAINTENANT);
  return {
    mine: mine.map((o) => o.id),
    reprise: toTakeOver.map((o) => o.id),
  };
}

console.log('\nRègles du tableau serveur\n');

// --- Mes tables ---
{
  const r = repartition([commande({ id: 'a', owner: MOI, ageSec: 5 })]);
  verifie('une commande de MA table arrive dans « Mes tables »', r.mine.includes('a'));
  verifie('elle n’est pas proposée en reprise', !r.reprise.includes('a'));
}

// --- Table d'un collègue, dans la minute ---
{
  const r = repartition([commande({ id: 'b', owner: COLLEGUE, ageSec: 30 })]);
  verifie('la table d’un collègue reste invisible avant 1 min', !r.mine.includes('b') && !r.reprise.includes('b'));
}

// --- Table d'un collègue, après la minute ---
{
  const r = repartition([commande({ id: 'c', owner: COLLEGUE, ageSec: 90 })]);
  verifie('après 1 min sans prise en charge, elle passe en reprise', r.reprise.includes('c'));
  verifie('elle ne bascule pas dans « Mes tables »', !r.mine.includes('c'));
}

// --- Le collègue a cliqué « Reçu » ---
{
  const r = repartition([commande({ id: 'd', owner: COLLEGUE, ageSec: 90, received: true })]);
  verifie('si le collègue a cliqué Reçu, aucune reprise même après 1 min', !r.reprise.includes('d'));
}

// --- Table sans serveur assigné ---
{
  const r = repartition([commande({ id: 'e', owner: null, ageSec: 5 })]);
  verifie('une table SANS serveur assigné est proposée tout de suite', r.reprise.includes('e'));
}
{
  const r = repartition([commande({ id: 'f', owner: undefined, ageSec: 5 })]);
  verifie('une commande sans table rattachée est traitée comme non assignée', r.reprise.includes('f'));
}

// --- Commandes terminées ---
{
  const r = repartition([
    commande({ id: 'g', owner: COLLEGUE, ageSec: 900, status: 'delivered' }),
    commande({ id: 'h', owner: COLLEGUE, ageSec: 900, status: 'cancelled' }),
  ]);
  verifie('une commande servie n’est jamais proposée en reprise', !r.reprise.includes('g'));
  verifie('une commande annulée n’est jamais proposée en reprise', !r.reprise.includes('h'));
}
{
  const r = repartition([commande({ id: 'i', owner: MOI, ageSec: 900, status: 'delivered' })]);
  verifie('mes commandes servies restent visibles (historique)', r.mine.includes('i'));
}

// --- La frontière exacte de la minute ---
{
  const pile = repartition([commande({ id: 'j', owner: COLLEGUE, ageSec: ACK_DEADLINE_MS / 1000 })]);
  verifie('à 60 s pile, pas encore de reprise', !pile.reprise.includes('j'));

  const apres = repartition([commande({ id: 'k', owner: COLLEGUE, ageSec: ACK_DEADLINE_MS / 1000 + 1 })]);
  verifie('à 61 s, la reprise est proposée', apres.reprise.includes('k'));
}

// --- En préparation : la reprise reste possible ---
{
  const r = repartition([commande({ id: 'l', owner: COLLEGUE, ageSec: 90, status: 'preparing' })]);
  verifie('une commande en préparation non prise en charge est reprenable', r.reprise.includes('l'));
}

// --- Rien ne se perd ni ne se duplique ---
{
  const toutes = [
    commande({ id: 'm1', owner: MOI, ageSec: 10 }),
    commande({ id: 'm2', owner: COLLEGUE, ageSec: 10 }),
    commande({ id: 'm3', owner: COLLEGUE, ageSec: 120 }),
    commande({ id: 'm4', owner: null, ageSec: 10 }),
  ];
  const r = repartition(toutes);
  const croisement = r.mine.filter((id) => r.reprise.includes(id));
  verifie('aucune commande n’apparaît dans les deux listes', croisement.length === 0);
  verifie('la liste vide ne fait pas planter', repartition([]).mine.length === 0);
  verifie('une liste nulle ne fait pas planter', splitServeurOrders(null, MOI, MAINTENANT).mine.length === 0);
}

console.log(`\n${reussis} réussis, ${echecs} échoués\n`);
process.exit(echecs === 0 ? 0 : 1);

// Tests du paiement mixte.
// Lancer avec :  node scripts/test-paiement.mjs

import {
  changeDue,
  cashToRegister,
  completeSplit,
  formatFcfa,
  momoToRegister,
  paymentIssue,
  splitShortcut,
} from '../lib/paiement.mjs';

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

console.log('\nPaiement mixte\n');

// --- Auto-complément ---
{
  const r = completeSplit(5000, 3000, 'cash');
  verifie('3000 en espèces sur 5000 met 2000 en MoMo', r.cash === 3000 && r.momo === 2000);
}
{
  const r = completeSplit(5000, 2000, 'momo');
  verifie('2000 en MoMo sur 5000 met 3000 en espèces', r.cash === 3000 && r.momo === 2000);
}
{
  const r = completeSplit(5000, 9000, 'cash');
  verifie('une part supérieure au total est plafonnée', r.cash === 5000 && r.momo === 0);
}
{
  const r = completeSplit(5000, -100, 'cash');
  verifie('une part négative retombe à zéro', r.cash === 0 && r.momo === 5000);
}
{
  const r = completeSplit(5000, '', 'cash');
  verifie('un champ vidé ne casse pas le calcul', r.cash === 0 && r.momo === 5000);
}

// --- Raccourcis ---
{
  const r = splitShortcut(5000, 0.5);
  verifie('50/50 sur 5000 donne 2500 et 2500', r.cash === 2500 && r.momo === 2500);
}
{
  const r = splitShortcut(5000, 0.25);
  verifie('¼ espèces sur 5000 donne 1250 et 3750', r.cash === 1250 && r.momo === 3750);
}
{
  const r = splitShortcut(5000, 0.75);
  verifie('¾ espèces sur 5000 donne 3750 et 1250', r.cash === 3750 && r.momo === 1250);
}
{
  const r = splitShortcut(5001, 0.5);
  verifie('sur un montant impair, la somme retombe pile sur le total', r.cash + r.momo === 5001);
}
{
  const r = splitShortcut(3333, 0.25);
  verifie('¼ d’un montant non divisible retombe pile sur le total', r.cash + r.momo === 3333);
}

// --- Monnaie à rendre ---
{
  verifie('tendre 5000 pour une part de 3000 rend 2000', changeDue(5000, 3000) === 2000);
  verifie('l’appoint exact ne rend rien', changeDue(3000, 3000) === 0);
  verifie('tendre moins ne donne jamais une monnaie négative', changeDue(2000, 3000) === 0);
}

// --- Ce qui part vraiment en caisse ---
{
  verifie('paiement espèces : tout le total en caisse', cashToRegister(5000, 'cash') === 5000);
  verifie('paiement espèces : rien en MoMo', momoToRegister(5000, 'cash') === 0);
  verifie('paiement MoMo : rien en caisse', cashToRegister(5000, 'mobile_money') === 0);
  verifie('paiement MoMo : tout en mobile money', momoToRegister(5000, 'mobile_money') === 5000);
}
{
  const split = { cash: 3000, momo: 2000 };
  verifie('mixte : la part espèces est ventilée en caisse', cashToRegister(5000, 'mixed', split) === 3000);
  verifie('mixte : la part MoMo est ventilée en mobile money', momoToRegister(5000, 'mixed', split) === 2000);
  verifie(
    'mixte : les deux parts additionnées font le total',
    cashToRegister(5000, 'mixed', split) + momoToRegister(5000, 'mixed', split) === 5000,
  );
}

// --- LE piège : la monnaie rendue ne doit pas gonfler la caisse ---
{
  const split = { cash: 3000, momo: 2000 };
  const tendu = 5000; // le client tend un billet de 5000 pour sa part de 3000
  verifie(
    'la monnaie rendue ne gonfle pas la caisse (3000 enregistrés, pas 5000)',
    cashToRegister(5000, 'mixed', split) === 3000 && changeDue(tendu, split.cash) === 2000,
  );
}

// --- Contrôles avant encaissement ---
{
  verifie('un mixte équilibré passe', paymentIssue(5000, 'mixed', { cash: 3000, momo: 2000 }) === null);
  verifie(
    'un mixte déséquilibré est refusé',
    typeof paymentIssue(5000, 'mixed', { cash: 3000, momo: 1000 }) === 'string',
  );
  verifie(
    'un mixte avec une part vide est refusé',
    typeof paymentIssue(5000, 'mixed', { cash: 5000, momo: 0 }) === 'string',
  );
  verifie('un paiement tout espèces passe', paymentIssue(5000, 'cash') === null);
  verifie('un paiement tout MoMo passe', paymentIssue(5000, 'mobile_money') === null);
  verifie('un total nul est refusé', typeof paymentIssue(0, 'cash') === 'string');
}
{
  const message = paymentIssue(5000, 'cash', null, 3000);
  verifie('espèces insuffisantes : le manque est annoncé', typeof message === 'string' && message.includes('manque'));
  verifie('tendre plus que la part est accepté', paymentIssue(5000, 'cash', null, 10000) === null);
  verifie('ne rien saisir vaut appoint exact', paymentIssue(5000, 'cash', null, '') === null);
}

// --- Format des montants ---
{
  const formate = formatFcfa(1500).replace(/\s/g, ' ');
  verifie(`1500 s’affiche « 1 500 FCFA » (obtenu : « ${formate} »)`, formate === '1 500 FCFA');
  verifie('un montant nul reste lisible', formatFcfa(0).includes('0'));
}

console.log(`\n${reussis} réussis, ${echecs} échoués\n`);
process.exit(echecs === 0 ? 0 : 1);

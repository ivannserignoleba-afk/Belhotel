// Calculs du paiement mixte.
//
// Fichier volontairement sans aucune dépendance : ni réseau, ni base, ni
// React. C'est ce qui permet de le tester seul avec `npm test`.
//
// Règle qui structure tout : on distingue la PART espèces (ce que le client
// doit régler en liquide, qui part en caisse) de ce qu'il TEND réellement
// (qui peut être plus, d'où la monnaie à rendre). Seule la part compte dans
// la caisse — sinon la monnaie rendue gonflerait le solde théorique.

export const PAYMENT_METHODS = [
  ['cash', 'Espèces'],
  ['mobile_money', 'Mobile Money'],
  ['mixed', 'Mixte'],
];

export const PAYMENT_LABELS = {
  cash: 'Espèces',
  mobile_money: 'Mobile Money',
  mixed: 'Mixte',
};

// Les raccourcis demandés : moitié-moitié, un quart, trois quarts en espèces.
export const SPLIT_SHORTCUTS = [
  ['50 / 50', 0.5],
  ['¼ Espèces', 0.25],
  ['¾ Espèces', 0.75],
];

// Le FCFA n'a pas de centimes : tout est entier, et jamais négatif.
export function toAmount(value) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// « 1 500 FCFA »
export function formatFcfa(value) {
  return `${toAmount(value).toLocaleString('fr-FR')} FCFA`;
}

// Auto-complément : on saisit une part, l'autre se déduit pour que la somme
// tombe exactement sur le total. Saisir 3000 sur 5000 met 2000 en face.
// `field` vaut 'cash' ou 'momo' : c'est le champ que la personne édite.
export function completeSplit(total, value, field) {
  const max = toAmount(total);
  const typed = Math.min(toAmount(value), max);
  return field === 'momo' ? { cash: max - typed, momo: typed } : { cash: typed, momo: max - typed };
}

// Raccourci : la part espèces vaut `cashRatio` du total, le reste en MoMo.
// L'arrondi va sur les espèces, et le MoMo prend la différence — comme ça
// la somme retombe toujours pile sur le total, même sur un montant impair.
export function splitShortcut(total, cashRatio) {
  const max = toAmount(total);
  const cash = Math.min(Math.round(max * cashRatio), max);
  return { cash, momo: max - cash };
}

// Monnaie à rendre : ce que le client a tendu en liquide, moins sa part
// espèces. Jamais négatif — s'il a tendu moins, c'est un manque, pas une
// monnaie (voir paymentIssue).
export function changeDue(cashGiven, cashPart) {
  return Math.max(0, toAmount(cashGiven) - toAmount(cashPart));
}

// Ce qui part réellement en caisse pour cette commande.
export function cashToRegister(total, method, split) {
  if (method === 'cash') return toAmount(total);
  if (method === 'mobile_money') return 0;
  return toAmount(split && split.cash);
}

export function momoToRegister(total, method, split) {
  if (method === 'cash') return 0;
  if (method === 'mobile_money') return toAmount(total);
  return toAmount(split && split.momo);
}

// Retourne null si le paiement est encaissable, sinon le message à afficher.
// `cashGiven` est ce que le client tend en liquide (facultatif : s'il n'est
// pas renseigné, on considère qu'il donne l'appoint).
export function paymentIssue(total, method, split, cashGiven) {
  const max = toAmount(total);
  if (max <= 0) return 'Le montant de la commande est invalide.';

  const cashPart = cashToRegister(max, method, split);
  const momoPart = momoToRegister(max, method, split);

  if (method === 'mixed') {
    if (cashPart + momoPart !== max) {
      return 'Les deux parts doivent faire exactement le total de la commande.';
    }
    if (cashPart === 0 || momoPart === 0) {
      return 'Un paiement mixte demande une part dans chacun des deux moyens.';
    }
  }

  if (cashPart > 0 && cashGiven !== undefined && cashGiven !== null && cashGiven !== '') {
    if (toAmount(cashGiven) < cashPart) {
      return `Espèces insuffisantes : il manque ${formatFcfa(cashPart - toAmount(cashGiven))}.`;
    }
  }

  return null;
}

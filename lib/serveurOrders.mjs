// Règles de répartition des commandes sur le tableau d'un serveur.
//
// Ce fichier n'a VOLONTAIREMENT aucune dépendance : ni réseau, ni base, ni
// React. C'est ce qui permet de le tester seul, en une seconde, avec
//     node scripts/test-serveur.mjs

// Délai laissé au serveur responsable pour cliquer « Reçu ». Passé ce délai,
// la commande est proposée aux autres serveurs du même pôle.
export const ACK_DEADLINE_MS = 60000;

// Statuts pour lesquels une commande est encore à servir.
export const ACTIVE_STATUSES = ['sent', 'preparing'];

export function isActive(order) {
  return ACTIVE_STATUSES.includes(order.status);
}

// Serveur responsable de la table d'où vient la commande (null si aucune).
export function ownerOf(order) {
  return (order.qr_points && order.qr_points.assigned_to) || null;
}

// Une commande est « en retard » si personne ne l'a prise en charge dans
// la minute qui a suivi son arrivée.
export function isLate(order, now) {
  return !order.received_at && now - new Date(order.created_at).getTime() > ACK_DEADLINE_MS;
}

// Répartit les commandes d'un pôle en deux paquets, du point de vue d'un
// serveur donné :
//   - mine       : les commandes de SES tables (quel que soit leur statut,
//                  l'historique récent compris) ;
//   - toTakeOver : celles qu'il peut reprendre — table sans responsable, ou
//                  table d'un collègue qui n'a pas cliqué « Reçu » à temps.
// Une commande déjà prise en charge, terminée ou annulée n'est jamais
// proposée à la reprise.
export function splitServeurOrders(orders, serveurId, now) {
  const mine = [];
  const toTakeOver = [];

  (orders || []).forEach((order) => {
    const owner = ownerOf(order);

    if (owner && owner === serveurId) {
      mine.push(order);
      return;
    }

    if (!isActive(order) || order.received_at) return;
    if (!owner || isLate(order, now)) toTakeOver.push(order);
  });

  return { mine, toTakeOver };
}

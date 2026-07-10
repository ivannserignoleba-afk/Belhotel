import Swal from 'sweetalert2';

const BRAND = '#ea580c';

// Confirmation avant suppression (renvoie true si confirmé)
export async function confirmDelete(title, text) {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Oui, supprimer',
    cancelButtonText: 'Annuler',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#9ca3af',
    reverseButtons: true,
  });
  return result.isConfirmed;
}

// Confirmation d'action (renvoie true si confirmé)
export async function confirmAction(title, text, confirmText = 'Oui, continuer') {
  const result = await Swal.fire({
    title,
    text,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: 'Annuler',
    confirmButtonColor: BRAND,
    cancelButtonColor: '#9ca3af',
    reverseButtons: true,
  });
  return result.isConfirmed;
}

// Petit toast de succès en haut à droite
export function toastSuccess(title) {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    title,
    timer: 2200,
    timerProgressBar: true,
    showConfirmButton: false,
  });
}

export function showError(text) {
  Swal.fire({
    icon: 'error',
    title: 'Erreur',
    text,
    confirmButtonColor: BRAND,
  });
}

// Alerte de stock bas (une fois par session de page)
export function warnLowStock(items) {
  Swal.fire({
    icon: 'warning',
    title: 'Alerte stock',
    html: `Certains articles sont bientôt épuisés :<br/><b>${items.join('<br/>')}</b>`,
    confirmButtonText: 'Compris',
    confirmButtonColor: BRAND,
  });
}

const adminList = document.getElementById('admin-list');
const apiBase = '/api/salons';

async function loadAdminSalons() {
  const response = await fetch(apiBase);
  return response.ok ? await response.json() : [];
}

function renderAdminSalons(salons) {
  adminList.innerHTML = '';
  if (salons.length === 0) {
    adminList.innerHTML = '<p>Aucun salon inscrit pour l\'instant.</p>';
    return;
  }

  salons.forEach((salon) => {
    const card = document.createElement('article');
    card.className = 'salon-card';
    card.innerHTML = `
      <h3>${salon.salonName}</h3>
      <p><strong>Coiffeur(se) :</strong> ${salon.ownerName}</p>
      <p><strong>Type :</strong> ${salon.gender}</p>
      <p><strong>Adresse :</strong> ${salon.address}</p>
      <p><strong>Téléphone :</strong> ${salon.phone}</p>
      <p><strong>Email :</strong> ${salon.email}</p>
      <p><strong>Services :</strong> ${salon.services || 'Non précisé'}</p>
      <button class="delete-button" data-id="${salon.id}">Supprimer</button>
    `;
    adminList.appendChild(card);
  });

  adminList.querySelectorAll('.delete-button').forEach((button) => {
    button.addEventListener('click', async () => {
      const salonId = button.dataset.id;
      const response = await fetch(`${apiBase}/${salonId}`, { method: 'DELETE' });
      if (response.ok) {
        loadAndRenderAdmin();
      } else {
        alert('Impossible de supprimer ce salon.');
      }
    });
  });
}

async function loadAndRenderAdmin() {
  const salons = await loadAdminSalons();
  renderAdminSalons(salons);
}

loadAndRenderAdmin();

document.addEventListener('DOMContentLoaded', () => {
  const year = document.getElementById('year');
  if (year) {
    year.textContent = new Date().getFullYear();
  }

  const forms = [
    { id: 'room-form', endpoint: '/api/rooms' },
    { id: 'restaurant-form', endpoint: '/api/restaurant' },
    { id: 'bar-form', endpoint: '/api/bar' },
  ];

  const collections = [
    { id: 'room-list', endpoint: '/api/rooms', deleteEndpoint: '/api/rooms', title: 'chambre' },
    { id: 'restaurant-list', endpoint: '/api/restaurant', deleteEndpoint: '/api/restaurant', title: 'plat' },
    { id: 'bar-list', endpoint: '/api/bar', deleteEndpoint: '/api/bar', title: 'boisson' },
  ];

  const renderCollection = async (container, endpoint, deleteEndpoint, title) => {
    const response = await fetch(endpoint);
    const items = await response.json();

    if (!container) return;

    if (!items.length) {
      container.innerHTML = `<p class="empty-state">Aucune ${title} enregistrée.</p>`;
      return;
    }

    container.innerHTML = '';
    const list = document.createElement('div');
    list.className = 'admin-item-list';

    items.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'admin-item';

      const info = document.createElement('div');
      const nameEl = document.createElement('strong');
      nameEl.textContent = item.name;
      const descEl = document.createElement('p');
      descEl.textContent = item.description || 'Aucune description.';
      const priceEl = document.createElement('p');
      priceEl.className = 'price-tag';
      priceEl.textContent = `${Number(item.price).toLocaleString('fr-FR')} FCFA`;
      info.append(nameEl, descEl, priceEl);

      const button = document.createElement('button');
      button.className = 'delete-btn';
      button.type = 'button';
      button.dataset.id = item.id;
      button.textContent = 'Supprimer';

      card.append(info, button);

      button.addEventListener('click', async () => {
        const deleteResponse = await fetch(`${deleteEndpoint}/${item.id}`, { method: 'DELETE' });
        if (deleteResponse.ok) {
          await renderCollection(container, endpoint, deleteEndpoint, title);
        }
      });

      list.appendChild(card);
    });

    container.appendChild(list);
  };

  const renderBookings = async () => {
    const container = document.getElementById('booking-list');
    if (!container) return;

    const response = await fetch('/api/bookings');
    const bookings = await response.json();

    if (!bookings.length) {
      container.innerHTML = '<p class="empty-state">Aucune réservation pour le moment.</p>';
      return;
    }

    container.innerHTML = '';
    const list = document.createElement('div');
    list.className = 'admin-item-list';

    bookings.forEach((booking) => {
      const card = document.createElement('article');
      card.className = 'admin-item';

      const info = document.createElement('div');
      const nameEl = document.createElement('strong');
      nameEl.textContent = booking.name;
      const roomEl = document.createElement('p');
      roomEl.textContent = booking.room;
      const emailEl = document.createElement('p');
      emailEl.textContent = booking.email;
      const datesEl = document.createElement('p');
      datesEl.textContent = `Du ${booking.checkin} au ${booking.checkout}`;
      info.append(nameEl, roomEl, emailEl, datesEl);

      const button = document.createElement('button');
      button.className = 'delete-btn';
      button.type = 'button';
      button.dataset.id = booking.id;
      button.textContent = 'Supprimer';

      card.append(info, button);

      button.addEventListener('click', async () => {
        const deleteResponse = await fetch(`/api/bookings/${booking.id}`, { method: 'DELETE' });
        if (deleteResponse.ok) {
          await renderBookings();
        }
      });

      list.appendChild(card);
    });

    container.appendChild(list);
  };

  forms.forEach(({ id, endpoint }) => {
    const form = document.getElementById(id);
    if (!form) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      payload.price = Number(payload.price);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        form.reset();
        await Promise.all(collections.map(({ id: listId, endpoint: collectionEndpoint, deleteEndpoint, title }) => renderCollection(document.getElementById(listId), collectionEndpoint, deleteEndpoint, title)));
        await renderBookings();
        alert('Élément ajouté avec succès.');
      } else {
        alert('Erreur lors de l’ajout.');
      }
    });
  });

  collections.forEach(({ id, endpoint, deleteEndpoint, title }) => {
    renderCollection(document.getElementById(id), endpoint, deleteEndpoint, title);
  });

  renderBookings();
});

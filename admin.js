document.addEventListener('DOMContentLoaded', async () => {
  const year = document.getElementById('year');
  if (year) {
    year.textContent = new Date().getFullYear();
  }

  // ----- Garde d'authentification -----
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    window.location.href = 'admin-login.html';
    return;
  }
  document.getElementById('admin-email').textContent = session.user.email;

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await db.auth.signOut();
    window.location.href = 'admin-login.html';
  });

  // ----- Onglets -----
  const tabs = document.querySelectorAll('.admin-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.admin-panel-section').forEach((section) => {
        section.hidden = section.id !== `tab-${tab.dataset.tab}`;
      });
    });
  });

  // ----- Chambres -----
  async function loadRooms() {
    const container = document.getElementById('room-list');
    const { data: rooms, error } = await db
      .from('rooms')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      container.innerHTML = `<p class="empty-state">Erreur de chargement : ${error.message}</p>`;
      return;
    }
    if (!rooms.length) {
      container.innerHTML = '<p class="empty-state">Aucune chambre enregistrée.</p>';
      return;
    }

    container.innerHTML = '';
    rooms.forEach((room) => {
      const image = room.image_urls?.[0];
      const available = room.status === 'available';
      const card = document.createElement('article');
      card.className = 'admin-item';
      card.innerHTML = `
        <div class="admin-item-main">
          ${image ? `<img src="${image}" alt="" class="thumb" />` : ''}
          <div>
            <strong>${(room.name || '').trim()}</strong>
            <span class="badge ${available ? 'status-confirmed' : 'status-pending'}">${available ? 'Disponible' : 'Indisponible'}</span>
            <p>${room.description || 'Aucune description.'}</p>
            <p class="price-tag">${formatPrice(room.price)} / nuit</p>
          </div>
        </div>
        <div class="admin-item-actions">
          <button class="confirm-btn" type="button">${available ? 'Rendre indisponible' : 'Rendre disponible'}</button>
          <button class="delete-btn" type="button">Supprimer</button>
        </div>
      `;

      card.querySelector('.confirm-btn').addEventListener('click', async () => {
        const { error: updateError } = await db
          .from('rooms')
          .update({ status: available ? 'unavailable' : 'available' })
          .eq('id', room.id);
        if (updateError) alert('Erreur : ' + updateError.message);
        else loadRooms();
      });

      card.querySelector('.delete-btn').addEventListener('click', async () => {
        if (!confirm(`Supprimer la chambre « ${(room.name || '').trim()} » ?`)) return;
        const { error: deleteError } = await db.from('rooms').delete().eq('id', room.id);
        if (deleteError) alert('Erreur : ' + deleteError.message + '\n(Une chambre liée à des réservations ne peut pas être supprimée.)');
        else loadRooms();
      });

      container.appendChild(card);
    });
  }

  document.getElementById('room-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;

    const { error } = await db.from('rooms').insert([{
      name: form.name.value.trim(),
      description: form.description.value.trim() || null,
      price: Number(form.price.value),
      image_urls: form.image.value.trim() ? [form.image.value.trim()] : null,
      status: form.status.value,
    }]);

    button.disabled = false;
    if (error) {
      alert('Erreur lors de l’ajout : ' + error.message);
      return;
    }
    form.reset();
    loadRooms();
  });

  // ----- Menus (restaurant + bar) -----
  function menuHandlers(table, formId, listId, itemLabel) {
    async function loadItems() {
      const container = document.getElementById(listId);
      const { data: items, error } = await db
        .from(table)
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        container.innerHTML = `<p class="empty-state">Erreur de chargement : ${error.message}</p>`;
        return;
      }
      if (!items.length) {
        container.innerHTML = `<p class="empty-state">Aucun ${itemLabel} enregistré.</p>`;
        return;
      }

      container.innerHTML = '';
      items.forEach((item) => {
        const card = document.createElement('article');
        card.className = 'admin-item';
        card.innerHTML = `
          <div class="admin-item-main">
            ${item.image_url ? `<img src="${item.image_url}" alt="" class="thumb" />` : ''}
            <div>
              <strong>${item.name}</strong>
              <span class="badge">${CATEGORY_LABELS[item.category] || item.category}</span>
              <p>${item.description || 'Aucune description.'}</p>
              <p class="price-tag">${formatPrice(item.price)}</p>
            </div>
          </div>
          <div class="admin-item-actions">
            <button class="delete-btn" type="button">Supprimer</button>
          </div>
        `;

        card.querySelector('.delete-btn').addEventListener('click', async () => {
          if (!confirm(`Supprimer « ${item.name} » ?`)) return;
          const { error: deleteError } = await db.from(table).delete().eq('id', item.id);
          if (deleteError) alert('Erreur : ' + deleteError.message);
          else loadItems();
        });

        container.appendChild(card);
      });
    }

    document.getElementById(formId).addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.target;
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;

      const { error } = await db.from(table).insert([{
        name: form.name.value.trim(),
        description: form.description.value.trim() || null,
        price: Number(form.price.value),
        category: form.category.value,
        image_url: form.image.value.trim() || null,
      }]);

      button.disabled = false;
      if (error) {
        alert('Erreur lors de l’ajout : ' + error.message);
        return;
      }
      form.reset();
      loadItems();
    });

    return loadItems;
  }

  const loadRestaurant = menuHandlers('restaurant_menu', 'restaurant-form', 'restaurant-list', 'plat');
  const loadBar = menuHandlers('bar_menu', 'bar-form', 'bar-list', 'boisson');

  loadRooms();
  loadRestaurant();
  loadBar();
});

document.addEventListener('DOMContentLoaded', async () => {
  // ----- Garde d'authentification + rôle -----
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    window.location.href = 'admin-login.html';
    return;
  }

  const { data: staff } = await db
    .from('admins')
    .select('role, full_name')
    .eq('email', session.user.email)
    .maybeSingle();

  if (!staff) {
    await db.auth.signOut();
    window.location.href = 'admin-login.html';
    return;
  }

  const role = staff.role;

  const ROLE_LABELS = {
    superadmin: 'Super Admin',
    reception: 'Réception',
    resto: 'Restauration',
    bar: 'Bar',
  };

  // ----- Icônes SVG de la navigation -----
  const ICONS = {
    overview: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>',
    orders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M9 12h6"/><path d="M9 16h6"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    bed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M2 18h20"/></svg>',
    utensils: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>',
    wine: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 22h8"/><path d="M7 10h10"/><path d="M12 15v7"/><path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z"/></svg>',
    qr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="M3.3 7 12 12l8.7-5"/><path d="M12 22V12"/></svg>',
  };

  // ----- Sections par rôle -----
  const SECTIONS = {
    overview: { title: 'Aperçu', subtitle: 'Vue d’ensemble du complexe Belhotel', icon: 'overview' },
    'orders-rooms': { title: 'Commandes des chambres', subtitle: 'Commandes reçues depuis les QR codes des chambres', icon: 'orders' },
    requests: { title: 'Demandes de service', subtitle: 'Serviettes, climatisation, ménage...', icon: 'bell' },
    'orders-resto': { title: 'Commandes', subtitle: 'Commandes des tables et des chambres en temps réel', icon: 'orders' },
    'orders-bar': { title: 'Commandes', subtitle: 'Commandes des salons et des chambres en temps réel', icon: 'orders' },
    rooms: { title: 'Chambres', subtitle: 'Gérez les chambres de l’hôtel', icon: 'bed' },
    restaurant: { title: 'Menus du restaurant', subtitle: 'Gérez les cartes Standard, VIP et VVIP', icon: 'utensils' },
    bar: { title: 'Carte du bar', subtitle: 'Gérez les boissons du bar', icon: 'wine' },
    qr: { title: 'QR codes', subtitle: 'Générez les QR codes des chambres, tables et salons', icon: 'qr' },
    staff: { title: 'Personnel', subtitle: 'Gérez les comptes de votre équipe', icon: 'users' },
    stock: { title: 'Stock', subtitle: 'Suivi des quantités disponibles', icon: 'box' },
  };

  const NAV_LABELS = {
    overview: 'Aperçu',
    'orders-rooms': 'Commandes chambres',
    requests: 'Demandes de service',
    'orders-resto': 'Commandes',
    'orders-bar': 'Commandes',
    rooms: 'Chambres',
    restaurant: 'Restaurant',
    bar: 'Bar',
    qr: 'QR codes',
    staff: 'Personnel',
    stock: 'Stock',
  };

  const ROLE_SECTIONS = {
    superadmin: ['overview', 'orders-rooms', 'requests', 'orders-resto', 'orders-bar', 'rooms', 'restaurant', 'bar', 'qr', 'staff', 'stock'],
    reception: ['orders-rooms', 'requests', 'rooms', 'qr'],
    resto: ['orders-resto', 'restaurant', 'qr', 'stock'],
    bar: ['orders-bar', 'bar', 'qr', 'stock'],
  };

  const sections = ROLE_SECTIONS[role] || [];

  // ----- Construction de la barre latérale -----
  const nav = document.getElementById('dash-nav');
  sections.forEach((key, index) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'dash-nav-item' + (index === 0 ? ' active' : '');
    item.dataset.section = key;
    item.innerHTML = `${ICONS[SECTIONS[key].icon]}<span>${NAV_LABELS[key]}</span>`;
    item.addEventListener('click', () => showSection(key));
    nav.appendChild(item);
  });

  function showSection(key) {
    document.querySelectorAll('.dash-nav-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.section === key);
    });
    document.querySelectorAll('.dash-panel').forEach((panel) => {
      panel.hidden = panel.id !== `panel-${key}`;
    });
    document.getElementById('section-title').textContent = SECTIONS[key].title;
    document.getElementById('section-subtitle').textContent = SECTIONS[key].subtitle;
  }

  // ----- Infos utilisateur -----
  const name = staff.full_name || session.user.email;
  document.getElementById('user-name').textContent = name;
  document.getElementById('user-role').textContent = ROLE_LABELS[role] || role;
  document.getElementById('user-avatar').textContent = name.trim().charAt(0).toUpperCase();

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await db.auth.signOut();
    window.location.href = 'admin-login.html';
  });

  // Affiche le shell une fois le rôle connu (évite le flash)
  document.getElementById('dash-shell').hidden = false;
  showSection(sections[0]);

  // ----- Aperçu : compteurs (superadmin) -----
  if (sections.includes('overview')) {
    loadStats();
  }

  async function loadStats() {
    const grid = document.getElementById('stat-grid');
    const stats = [
      { table: 'rooms', label: 'Chambres' },
      { table: 'restaurant_menu', label: 'Plats au menu' },
      { table: 'bar_menu', label: 'Boissons à la carte' },
      { table: 'orders', label: 'Commandes' },
      { table: 'service_requests', label: 'Demandes de service' },
      { table: 'qr_points', label: 'QR codes actifs' },
    ];
    grid.innerHTML = '';
    for (const stat of stats) {
      const { count } = await db.from(stat.table).select('*', { count: 'exact', head: true });
      const tile = document.createElement('div');
      tile.className = 'stat-tile';
      tile.innerHTML = `<strong>${count ?? 0}</strong><span>${stat.label}</span>`;
      grid.appendChild(tile);
    }
  }

  // ----- Gestion des chambres -----
  if (sections.includes('rooms')) {
    initRooms();
  }

  function initRooms() {
    loadRooms();
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
  }

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
        if (deleteError) alert('Erreur : ' + deleteError.message);
        else loadRooms();
      });

      container.appendChild(card);
    });
  }

  // ----- Gestion des menus (restaurant + bar) -----
  function initMenu(table, formId, listId, itemLabel) {
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

    loadItems();
  }

  if (sections.includes('restaurant')) {
    initMenu('restaurant_menu', 'restaurant-form', 'restaurant-list', 'plat');
  }
  if (sections.includes('bar')) {
    initMenu('bar_menu', 'bar-form', 'bar-list', 'boisson');
  }
});

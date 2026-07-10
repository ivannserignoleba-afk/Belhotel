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
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="M3.3 7 12 12l8.7-5"/><path d="M12 22V12"/></svg>',
  };

  // ----- Sections organisées en pôles : Hôtel / Restauration / Bar -----
  const SECTIONS = {
    overview: { title: 'Aperçu', subtitle: 'Vue d’ensemble du complexe Belhotel', icon: 'overview', panel: 'overview' },
    staff: { title: 'Personnel', subtitle: 'Gérez les comptes de votre équipe', icon: 'users', panel: 'staff' },
    'orders-rooms': { title: 'Commandes des chambres', subtitle: 'Commandes reçues depuis les QR codes des chambres', icon: 'orders', panel: 'orders-rooms' },
    requests: { title: 'Demandes de service', subtitle: 'Serviettes, climatisation, ménage...', icon: 'bell', panel: 'requests' },
    rooms: { title: 'Chambres', subtitle: 'Gérez les chambres de l’hôtel', icon: 'bed', panel: 'rooms' },
    'qr-room': { title: 'QR codes des chambres', subtitle: 'Créez et imprimez les QR codes à placer dans les chambres', icon: 'qr', panel: 'qr', qrType: 'room' },
    'orders-resto': { title: 'Commandes', subtitle: 'Commandes des tables et des chambres en temps réel', icon: 'orders', panel: 'orders-resto' },
    restaurant: { title: 'Menus du restaurant', subtitle: 'Gérez les cartes Standard, VIP et VVIP', icon: 'utensils', panel: 'restaurant' },
    'stock-resto': { title: 'Stock du restaurant', subtitle: 'Quantités disponibles des plats', icon: 'box', panel: 'stock', stockTarget: 'resto' },
    'qr-table': { title: 'QR codes des tables', subtitle: 'Créez et imprimez les QR codes des tables', icon: 'qr', panel: 'qr', qrType: 'table' },
    'orders-bar': { title: 'Commandes', subtitle: 'Commandes des salons et des chambres en temps réel', icon: 'orders', panel: 'orders-bar' },
    bar: { title: 'Carte du bar', subtitle: 'Gérez les boissons du bar', icon: 'wine', panel: 'bar' },
    'stock-bar': { title: 'Stock du bar', subtitle: 'Quantités disponibles des boissons', icon: 'box', panel: 'stock', stockTarget: 'bar' },
    'qr-salon': { title: 'QR codes des salons', subtitle: 'Créez et imprimez les QR codes des salons', icon: 'qr', panel: 'qr', qrType: 'salon' },
  };

  SECTIONS.settings = { title: 'Réglages', subtitle: 'Paramètres du site et des réservations', icon: 'settings', panel: 'settings' };

  const NAV_LABELS = {
    overview: 'Statistiques',
    staff: 'Équipe',
    settings: 'Réglages',
    'orders-rooms': 'Commandes',
    requests: 'Demandes de service',
    rooms: 'Chambres',
    'qr-room': 'QR codes',
    'orders-resto': 'Commandes',
    restaurant: 'Menus',
    'stock-resto': 'Stock',
    'qr-table': 'QR codes',
    'orders-bar': 'Commandes',
    bar: 'Carte',
    'stock-bar': 'Stock',
    'qr-salon': 'QR codes',
  };

  // Sections du haut (comme le modèle) et leurs compartiments
  const TOP_SECTIONS = [
    { key: 'stats', label: 'Stats', icon: 'overview', items: ['overview'] },
    { key: 'hotel', label: 'Hôtel', icon: 'bed', items: ['orders-rooms', 'requests', 'rooms', 'qr-room'] },
    { key: 'restaurant', label: 'Restaurant', icon: 'utensils', items: ['orders-resto', 'restaurant', 'stock-resto', 'qr-table'] },
    { key: 'bar', label: 'Bar', icon: 'wine', items: ['orders-bar', 'bar', 'stock-bar', 'qr-salon'] },
    { key: 'equipe', label: 'Équipe', icon: 'users', items: ['staff'] },
    { key: 'reglages', label: 'Réglages', icon: 'settings', items: ['settings'] },
  ];

  const ROLE_SECTIONS = {
    superadmin: ['overview', 'staff', 'settings', 'orders-rooms', 'requests', 'rooms', 'qr-room', 'orders-resto', 'restaurant', 'stock-resto', 'qr-table', 'orders-bar', 'bar', 'stock-bar', 'qr-salon'],
    reception: ['orders-rooms', 'requests', 'rooms', 'qr-room'],
    resto: ['orders-resto', 'restaurant', 'stock-resto', 'qr-table'],
    bar: ['orders-bar', 'bar', 'stock-bar', 'qr-salon'],
  };

  const sections = ROLE_SECTIONS[role] || [];

  const myTopSections = TOP_SECTIONS
    .map((top) => ({ ...top, items: top.items.filter((key) => sections.includes(key)) }))
    .filter((top) => top.items.length);

  // ----- Navigation horizontale du haut -----
  const nav = document.getElementById('dash-nav');
  const subnav = document.getElementById('dash-subnav');
  const badgeCounts = {};
  let currentTop = null;

  myTopSections.forEach((top) => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'topnav-pill';
    pill.dataset.top = top.key;
    pill.innerHTML = `${ICONS[top.icon]}<span>${top.label}</span>`;
    pill.addEventListener('click', () => showTopSection(top.key));
    nav.appendChild(pill);
  });

  function showTopSection(topKey) {
    currentTop = myTopSections.find((top) => top.key === topKey);
    document.querySelectorAll('.topnav-pill').forEach((pill) => {
      pill.classList.toggle('active', pill.dataset.top === topKey);
    });

    // Compartiments de la section
    subnav.innerHTML = '';
    subnav.hidden = currentTop.items.length < 2;
    currentTop.items.forEach((key) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip subnav-chip';
      chip.dataset.section = key;
      chip.innerHTML = `<span>${NAV_LABELS[key]}</span>`;
      chip.addEventListener('click', () => showSection(key));
      subnav.appendChild(chip);
    });

    refreshBadges();
    showSection(currentTop.items[0]);
  }

  function showSection(key) {
    const meta = SECTIONS[key];
    document.querySelectorAll('.subnav-chip').forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.section === key);
    });
    document.querySelectorAll('.dash-panel').forEach((panel) => {
      panel.hidden = panel.id !== `panel-${meta.panel}`;
    });
    document.getElementById('section-title').textContent = meta.title;
    document.getElementById('section-subtitle').textContent = meta.subtitle;

    if (meta.qrType) setQrScope(meta.qrType);
    if (meta.stockTarget) {
      document.getElementById('stock-resto-card').hidden = meta.stockTarget !== 'resto';
      document.getElementById('stock-bar-card').hidden = meta.stockTarget !== 'bar';
    }
  }

  // ----- Badges (compteurs) sur les sections et compartiments -----
  function applyBadge(element, count) {
    if (!element) return;
    let badge = element.querySelector('.nav-badge');
    if (!count) {
      badge?.remove();
      return;
    }
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'nav-badge';
      element.appendChild(badge);
    }
    badge.textContent = count;
  }

  function refreshBadges() {
    myTopSections.forEach((top) => {
      const total = top.items.reduce((sum, key) => sum + (badgeCounts[key] || 0), 0);
      applyBadge(document.querySelector(`.topnav-pill[data-top="${top.key}"]`), total);
    });
    document.querySelectorAll('.subnav-chip').forEach((chip) => {
      applyBadge(chip, badgeCounts[chip.dataset.section] || 0);
    });
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
  showTopSection(myTopSections[0].key);

  // ================= COMMANDES EN TEMPS RÉEL =================

  const STATUS_LABELS = {
    reception: 'À traiter',
    sent: 'Envoyée',
    preparing: 'En préparation',
    delivered: 'Livrée',
    cancelled: 'Annulée',
  };

  // Configuration des trois tableaux de commandes
  const ORDER_BOARDS = {
    'orders-rooms': {
      board: 'board-orders-rooms',
      context: 'reception',
      active: ['reception'],
      kpis: [['reception', 'À traiter'], ['sent', 'Envoyées'], ['delivered', 'Livrées'], ['cancelled', 'Annulées']],
      applyFilter: (query) => query.eq('origin_type', 'room'),
    },
    'orders-resto': {
      board: 'board-orders-resto',
      context: 'kitchen',
      active: ['sent', 'preparing'],
      kpis: [['sent', 'En attente'], ['preparing', 'En préparation'], ['delivered', 'Livrées'], ['cancelled', 'Annulées']],
      applyFilter: (query) => query.eq('target', 'resto').neq('status', 'reception'),
    },
    'orders-bar': {
      board: 'board-orders-bar',
      context: 'kitchen',
      active: ['sent', 'preparing'],
      kpis: [['sent', 'En attente'], ['preparing', 'En préparation'], ['delivered', 'Livrées'], ['cancelled', 'Annulées']],
      applyFilter: (query) => query.eq('target', 'bar').neq('status', 'reception'),
    },
  };

  // Filtre de statut choisi par tableau (pastilles)
  const boardFilters = {};

  function timeAgo(dateString) {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'à l’instant';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours} h`;
    return new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function setNavBadge(sectionKey, count) {
    badgeCounts[sectionKey] = count;
    refreshBadges();
  }

  async function updateOrderStatus(orderId, status, boardKey) {
    const { error } = await db.from('orders').update({ status }).eq('id', orderId);
    if (error) alert('Erreur : ' + error.message);
    else loadOrdersBoard(boardKey);
  }

  function renderOrderCard(order, config, withActions) {
    const originName = (order.origin_type === 'room' ? 'Chambre ' : '') + order.origin_label.trim();
    const card = document.createElement('article');
    card.className = 'order-ticket' + (['delivered', 'cancelled'].includes(order.status) ? ' is-history' : '');

    const lines = (order.order_items || []).map((line) => `
      <div class="ticket-line">
        ${line.item_image ? `<img src="${line.item_image}" alt="" loading="lazy" />` : '<span class="ticket-noimg"></span>'}
        <span class="ticket-line-name">${line.qty} × ${line.item_name}</span>
        <span class="ticket-line-price">${formatPrice(line.unit_price * line.qty)}</span>
      </div>
    `).join('');

    card.innerHTML = `
      <div class="ticket-head">
        <div>
          <strong>${originName}</strong>
          <span class="ticket-time">${timeAgo(order.created_at)}</span>
        </div>
        <span class="badge status-${order.status}">${STATUS_LABELS[order.status]}</span>
      </div>
      <div class="ticket-lines">${lines}</div>
      ${order.note ? `<p class="ticket-note">Note : ${order.note}</p>` : ''}
      <div class="ticket-total"><span>Total</span><strong>${formatPrice(order.total)}</strong></div>
      <div class="ticket-actions"></div>
    `;

    if (withActions) {
      const actions = card.querySelector('.ticket-actions');

      const addAction = (label, status, className) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.textContent = label;
        button.addEventListener('click', () => updateOrderStatus(order.id, status, config.key));
        actions.appendChild(button);
      };

      if (config.context === 'reception' && order.status === 'reception') {
        addAction(order.target === 'resto' ? 'Envoyer à la restauration' : 'Envoyer au barman', 'sent', 'confirm-btn');
        addAction('Annuler', 'cancelled', 'delete-btn');
      }
      if (config.context === 'kitchen') {
        if (order.status === 'sent') {
          addAction('Commencer la préparation', 'preparing', 'confirm-btn');
          addAction('Annuler', 'cancelled', 'delete-btn');
        }
        if (order.status === 'preparing') {
          addAction('Marquer comme livrée', 'delivered', 'confirm-btn');
        }
      }
    }

    return card;
  }

  async function loadOrdersBoard(key) {
    const config = { ...ORDER_BOARDS[key], key };
    const container = document.getElementById(config.board);
    if (!container) return;

    let query = db
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .limit(80);
    query = config.applyFilter(query);
    const { data: orders, error } = await query;

    if (error) {
      container.innerHTML = `<p class="empty-state">Erreur de chargement : ${error.message}</p>`;
      return;
    }

    const counts = { all: orders.length };
    ['reception', 'sent', 'preparing', 'delivered', 'cancelled'].forEach((status) => {
      counts[status] = orders.filter((order) => order.status === status).length;
    });
    const activeCount = orders.filter((order) => config.active.includes(order.status)).length;
    const revenue = orders
      .filter((order) => ['reception', 'sent', 'preparing'].includes(order.status))
      .reduce((total, order) => total + (order.total || 0), 0);

    setNavBadge(key, activeCount);

    const filter = boardFilters[key] || 'all';
    container.innerHTML = '';

    // Barre du haut : indicateur temps réel + test du son
    const top = document.createElement('div');
    top.className = 'board-topbar';
    top.innerHTML = `
      <span class="live-indicator"><span class="live-dot"></span>Temps réel actif</span>
      <button type="button" class="qr-toggle sound-test">Tester le son</button>
    `;
    top.querySelector('.sound-test').addEventListener('click', beep);
    container.appendChild(top);

    // Cartes indicateurs
    const kpiRow = document.createElement('div');
    kpiRow.className = 'kpi-row';
    config.kpis.forEach(([status, label]) => {
      kpiRow.insertAdjacentHTML('beforeend',
        `<div class="kpi-card kpi-${status}"><span>${label}</span><strong>${counts[status]}</strong></div>`);
    });
    kpiRow.insertAdjacentHTML('beforeend',
      `<div class="kpi-card kpi-revenue"><span>Revenus en cours</span><strong>${formatPrice(revenue)}</strong></div>`);
    container.appendChild(kpiRow);

    // Pastilles de filtre
    const chips = document.createElement('div');
    chips.className = 'chip-row';
    [['all', 'Toutes'], ...config.kpis].forEach(([value, label]) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip' + (filter === value ? ' active' : '');
      chip.textContent = `${label} (${counts[value]})`;
      chip.addEventListener('click', () => {
        boardFilters[key] = value;
        loadOrdersBoard(key);
      });
      chips.appendChild(chip);
    });
    container.appendChild(chips);

    // Tickets (les commandes à traiter d'abord)
    const visible = filter === 'all' ? orders : orders.filter((order) => order.status === filter);
    const sorted = [...visible].sort((a, b) => {
      const aActive = config.active.includes(a.status) ? 0 : 1;
      const bActive = config.active.includes(b.status) ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    if (!sorted.length) {
      container.insertAdjacentHTML('beforeend', `
        <div class="board-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          <p>Aucune commande</p>
        </div>`);
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'ticket-grid';
    const actionable = config.context === 'reception' ? ['reception'] : ['sent', 'preparing'];
    sorted.forEach((order) => grid.appendChild(renderOrderCard(order, config, actionable.includes(order.status))));
    container.appendChild(grid);
  }

  // ----- Demandes de service -----
  const REQUEST_STATUS_LABELS = { new: 'Nouvelle', in_progress: 'En cours', done: 'Traitée' };

  async function loadRequestsBoard() {
    const container = document.getElementById('board-requests');
    if (!container) return;

    const { data: requests, error } = await db
      .from('service_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(60);

    if (error) {
      container.innerHTML = `<p class="empty-state">Erreur de chargement : ${error.message}</p>`;
      return;
    }

    const active = requests.filter((request) => request.status !== 'done');
    const history = requests.filter((request) => request.status === 'done').slice(0, 12);

    setNavBadge('requests', requests.filter((request) => request.status === 'new').length);

    container.innerHTML = '';
    if (!active.length) {
      container.insertAdjacentHTML('beforeend', '<p class="empty-state">Aucune demande en attente. Les demandes des chambres (serviettes, climatisation...) apparaîtront ici automatiquement.</p>');
    }

    const renderRequest = (request, withActions) => {
      const card = document.createElement('article');
      card.className = 'order-ticket' + (withActions ? '' : ' is-history');
      card.innerHTML = `
        <div class="ticket-head">
          <div>
            <strong>Chambre ${request.origin_label.trim()}</strong>
            <span class="ticket-time">${timeAgo(request.created_at)}</span>
          </div>
          <span class="badge request-${request.status}">${REQUEST_STATUS_LABELS[request.status]}</span>
        </div>
        <p class="ticket-request-cat">${request.category}</p>
        ${request.message ? `<p class="ticket-note">${request.message}</p>` : ''}
        <div class="ticket-actions"></div>
      `;
      if (withActions) {
        const actions = card.querySelector('.ticket-actions');
        const advance = async (status) => {
          const { error: updateError } = await db.from('service_requests').update({ status }).eq('id', request.id);
          if (updateError) alert('Erreur : ' + updateError.message);
          else loadRequestsBoard();
        };
        if (request.status === 'new') {
          const take = document.createElement('button');
          take.type = 'button';
          take.className = 'confirm-btn';
          take.textContent = 'Prendre en charge';
          take.addEventListener('click', () => advance('in_progress'));
          actions.appendChild(take);
        }
        if (request.status === 'in_progress') {
          const done = document.createElement('button');
          done.type = 'button';
          done.className = 'confirm-btn';
          done.textContent = 'Marquer comme traitée';
          done.addEventListener('click', () => advance('done'));
          actions.appendChild(done);
        }
      }
      return card;
    };

    if (active.length) {
      const grid = document.createElement('div');
      grid.className = 'ticket-grid';
      active.forEach((request) => grid.appendChild(renderRequest(request, true)));
      container.appendChild(grid);
    }
    if (history.length) {
      container.insertAdjacentHTML('beforeend', '<h3 class="board-subtitle">Historique récent</h3>');
      const grid = document.createElement('div');
      grid.className = 'ticket-grid';
      history.forEach((request) => grid.appendChild(renderRequest(request, false)));
      container.appendChild(grid);
    }
  }

  // ----- Bip sonore à l'arrivée d'une commande -----
  function beep() {
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.18].forEach((delay) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.frequency.value = 880;
        gain.gain.setValueAtTime(0.15, context.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + delay + 0.15);
        oscillator.start(context.currentTime + delay);
        oscillator.stop(context.currentTime + delay + 0.16);
      });
    } catch (ignore) { /* audio non disponible */ }
  }

  // ----- Chargement + temps réel + filet de sécurité (30 s) -----
  const myBoards = sections.filter((key) => ORDER_BOARDS[key]);
  const watchRequests = sections.includes('requests');

  function refreshAllBoards() {
    myBoards.forEach((key) => loadOrdersBoard(key));
    if (watchRequests) loadRequestsBoard();
  }

  if (myBoards.length || watchRequests) {
    refreshAllBoards();

    db.channel('staff-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT') beep();
        myBoards.forEach((key) => loadOrdersBoard(key));
        if (sections.includes('overview')) loadStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests' }, (payload) => {
        if (payload.eventType === 'INSERT') beep();
        if (watchRequests) loadRequestsBoard();
      })
      .subscribe();

    setInterval(refreshAllBoards, 30000);
  }

  // ----- Aperçu : dashboard de direction (superadmin) -----
  const OVERVIEW_PERIODS = [
    ['today', 'Aujourd’hui', 1],
    ['7', '7 jours', 7],
    ['14', '14 jours', 14],
    ['30', '30 jours', 30],
    ['all', 'Tout', null],
  ];
  let overviewPeriod = 'today';

  const KPI_ICONS = {
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>',
    receipt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></svg>',
    target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    crown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7Z"/><path d="M5 20h14"/></svg>',
  };

  if (sections.includes('overview')) {
    const chipsContainer = document.getElementById('period-chips');
    OVERVIEW_PERIODS.forEach(([value, label]) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip' + (overviewPeriod === value ? ' active' : '');
      chip.textContent = label;
      chip.dataset.period = value;
      chip.addEventListener('click', () => {
        overviewPeriod = value;
        chipsContainer.querySelectorAll('.chip').forEach((item) => {
          item.classList.toggle('active', item.dataset.period === value);
        });
        loadStats();
      });
      chipsContainer.appendChild(chip);
    });
    loadStats();
  }

  async function loadStats() {
    const kpiContainer = document.getElementById('overview-kpis');
    if (!kpiContainer) return;

    const periodMeta = OVERVIEW_PERIODS.find(([value]) => value === overviewPeriod);
    const days = periodMeta[2];
    let since = null;
    if (days) {
      since = new Date();
      since.setHours(0, 0, 0, 0);
      since.setDate(since.getDate() - (days - 1));
    }

    let query = db.from('orders').select('*, order_items(item_name, qty, unit_price)').limit(2000);
    if (since) query = query.gte('created_at', since.toISOString());
    const [{ data: orders }, requestsRes] = await Promise.all([
      query,
      db.from('service_requests').select('*', { count: 'exact', head: true }).neq('status', 'done'),
    ]);

    const valid = (orders || []).filter((order) => order.status !== 'cancelled');
    const revenue = valid.reduce((total, order) => total + (order.total || 0), 0);
    const average = valid.length ? Math.round(revenue / valid.length) : 0;

    // Regroupement par jour
    const byDay = new Map();
    valid.forEach((order) => {
      const day = order.created_at.slice(0, 10);
      byDay.set(day, (byDay.get(day) || 0) + (order.total || 0));
    });
    let bestDay = null;
    byDay.forEach((total, day) => {
      if (!bestDay || total > bestDay.total) bestDay = { day, total };
    });
    const bestDayLabel = bestDay
      ? new Date(bestDay.day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      : '—';

    kpiContainer.innerHTML = `
      <div class="kpi-card kpi-stat"><div><span>Chiffre d’affaires</span><strong>${formatPrice(revenue)}</strong></div><i class="kpi-icon icon-green">${KPI_ICONS.wallet}</i></div>
      <div class="kpi-card kpi-stat"><div><span>Commandes</span><strong>${valid.length}</strong></div><i class="kpi-icon icon-blue">${KPI_ICONS.receipt}</i></div>
      <div class="kpi-card kpi-stat"><div><span>Ticket moyen</span><strong>${formatPrice(average)}</strong></div><i class="kpi-icon icon-amber">${KPI_ICONS.target}</i></div>
      <div class="kpi-card kpi-stat"><div><span>Meilleur jour</span><strong>${bestDayLabel}</strong><em>${bestDay ? formatPrice(bestDay.total) : ''}</em></div><i class="kpi-icon icon-purple">${KPI_ICONS.crown}</i></div>
    `;

    // Graphique : revenu par jour
    const chartDays = [];
    const chartSpan = days || 30;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (chartSpan - 1));
    for (let index = 0; index < chartSpan; index += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      chartDays.push({
        key,
        label: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        total: byDay.get(key) || 0,
      });
    }
    const maxTotal = Math.max(...chartDays.map((day) => day.total), 1);
    document.getElementById('chart-period-label').textContent =
      `${periodMeta[1]} · ${chartSpan} jour${chartSpan > 1 ? 's' : ''}${overviewPeriod === 'all' ? ' (graphique : 30 derniers jours)' : ''}`;
    document.getElementById('revenue-chart').innerHTML = chartDays.map((day) => `
      <div class="rc-col" title="${day.label} : ${formatPrice(day.total)}">
        <div class="rc-bar" style="height:${Math.max(Math.round((day.total / maxTotal) * 100), 2)}%"></div>
        ${chartSpan <= 14 ? `<span class="rc-label">${day.label}</span>` : ''}
      </div>
    `).join('');

    // Répartition par pôle : Hôtel / Restauration / Bar
    const bySection = { resto: { count: 0, revenue: 0 }, bar: { count: 0, revenue: 0 } };
    const roomOrders = { count: 0, revenue: 0 };
    valid.forEach((order) => {
      bySection[order.target].count += 1;
      bySection[order.target].revenue += order.total || 0;
      if (order.origin_type === 'room') {
        roomOrders.count += 1;
        roomOrders.revenue += order.total || 0;
      }
    });

    document.getElementById('section-activity').innerHTML = `
      <div class="rank-row"><div class="rank-info"><strong>Hôtel (chambres)</strong><span>${roomOrders.count} commandes · ${formatPrice(roomOrders.revenue)} · ${requestsRes.count ?? 0} demande(s) ouverte(s)</span></div></div>
      <div class="rank-row"><div class="rank-info"><strong>Restauration</strong><span>${bySection.resto.count} commandes · ${formatPrice(bySection.resto.revenue)}</span></div></div>
      <div class="rank-row"><div class="rank-info"><strong>Bar</strong><span>${bySection.bar.count} commandes · ${formatPrice(bySection.bar.revenue)}</span></div></div>
    `;

    // Articles les plus vendus
    const itemTotals = new Map();
    valid.forEach((order) => {
      (order.order_items || []).forEach((line) => {
        const entry = itemTotals.get(line.item_name) || { qty: 0, revenue: 0 };
        entry.qty += line.qty;
        entry.revenue += line.qty * line.unit_price;
        itemTotals.set(line.item_name, entry);
      });
    });
    const top = [...itemTotals.entries()].sort((a, b) => b[1].qty - a[1].qty).slice(0, 6);
    const topContainer = document.getElementById('top-items');
    if (!top.length) {
      topContainer.innerHTML = '<p class="empty-state">Aucune vente sur cette période.</p>';
    } else {
      const maxQty = top[0][1].qty;
      topContainer.innerHTML = top.map(([name, entry]) => `
        <div class="rank-row">
          <div class="rank-info">
            <strong>${name}</strong>
            <span>${entry.qty} vendus · ${formatPrice(entry.revenue)}</span>
          </div>
          <div class="rank-bar"><div style="width:${Math.round((entry.qty / maxQty) * 100)}%"></div></div>
        </div>
      `).join('');
    }
  }

  // ================= PERSONNEL (superadmin) =================

  const ROLE_OPTIONS = [
    ['reception', 'Réception'],
    ['resto', 'Restauration'],
    ['bar', 'Bar'],
    ['superadmin', 'Super Admin'],
  ];

  if (sections.includes('staff')) {
    initStaffPanel();
  }

  function initStaffPanel() {
    loadStaffList();

    // Client auth secondaire : créer un compte sans toucher à ma session
    const signupClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    document.getElementById('staff-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.target;
      const feedback = document.getElementById('staff-feedback');
      const button = form.querySelector('button[type="submit"]');
      feedback.textContent = '';
      feedback.classList.remove('error');
      button.disabled = true;

      const email = form.email.value.trim().toLowerCase();

      const { error: signupError } = await signupClient.auth.signUp({
        email,
        password: form.password.value,
      });

      if (signupError && !/already/i.test(signupError.message)) {
        button.disabled = false;
        feedback.textContent = 'Erreur : ' + signupError.message;
        feedback.classList.add('error');
        return;
      }

      const { error: rowError } = await db.from('admins').upsert([{
        email,
        password_hash: '(supabase-auth)',
        is_active: true,
        role: form.role.value,
        full_name: form.full_name.value.trim(),
      }], { onConflict: 'email' });

      button.disabled = false;
      if (rowError) {
        feedback.textContent = 'Erreur : ' + rowError.message;
        feedback.classList.add('error');
        return;
      }

      feedback.textContent = `Compte créé : ${email} peut se connecter dès maintenant.`;
      form.reset();
      loadStaffList();
    });
  }

  async function loadStaffList() {
    const container = document.getElementById('staff-list');
    const { data: staffList, error } = await db
      .from('admins')
      .select('*')
      .order('role')
      .order('full_name');

    if (error) {
      container.innerHTML = `<p class="empty-state">Erreur de chargement : ${error.message}</p>`;
      return;
    }

    container.innerHTML = '';
    staffList.forEach((member) => {
      const isMe = member.email === session.user.email;
      const card = document.createElement('article');
      card.className = 'admin-item';
      const roleOptions = ROLE_OPTIONS
        .map(([value, label]) => `<option value="${value}" ${member.role === value ? 'selected' : ''}>${label}</option>`)
        .join('');
      card.innerHTML = `
        <div class="admin-item-main">
          <div>
            <strong>${member.full_name || member.email}</strong>
            <span class="badge ${member.is_active ? 'status-confirmed' : 'status-cancelled'}">${member.is_active ? 'Actif' : 'Désactivé'}</span>
            <p>${member.email}</p>
            <div class="staff-role-row">
              <select class="staff-role" ${isMe ? 'disabled' : ''}>${roleOptions}</select>
            </div>
          </div>
        </div>
        <div class="admin-item-actions">
          ${isMe ? '<p class="hint">C’est vous</p>' : `<button type="button" class="${member.is_active ? 'delete-btn' : 'confirm-btn'} staff-toggle">${member.is_active ? 'Désactiver' : 'Réactiver'}</button>`}
        </div>
      `;

      if (!isMe) {
        card.querySelector('.staff-role').addEventListener('change', async (event) => {
          const { error: roleError } = await db
            .from('admins')
            .update({ role: event.target.value })
            .eq('id', member.id);
          if (roleError) { alert('Erreur : ' + roleError.message); loadStaffList(); }
        });

        card.querySelector('.staff-toggle')?.addEventListener('click', async () => {
          const { error: toggleError } = await db
            .from('admins')
            .update({ is_active: !member.is_active })
            .eq('id', member.id);
          if (toggleError) alert('Erreur : ' + toggleError.message);
          else loadStaffList();
        });
      }

      container.appendChild(card);
    });
  }

  // ================= STOCK =================

  // Charge les stocks des sections autorisées (la visibilité des cartes
  // est gérée par showSection selon le compartiment ouvert)
  sections
    .map((key) => SECTIONS[key].stockTarget)
    .filter(Boolean)
    .forEach((target) => loadStockList(target));

  async function loadStockList(target) {
    const table = target === 'resto' ? 'restaurant_menu' : 'bar_menu';
    const container = document.getElementById(`stock-${target}-list`);

    const { data: items, error } = await db
      .from(table)
      .select('*')
      .order('category')
      .order('name');

    if (error) {
      container.innerHTML = `<p class="empty-state">Erreur de chargement : ${error.message}</p>`;
      return;
    }
    if (!items.length) {
      container.innerHTML = '<p class="empty-state">Aucun article. Ajoutez-en d’abord dans le menu.</p>';
      return;
    }

    container.innerHTML = '';
    items.forEach((item) => {
      const stock = item.stock_qty;
      let badge;
      if (stock === null) badge = '<span class="badge">Illimité</span>';
      else if (stock === 0) badge = '<span class="badge status-cancelled">Rupture</span>';
      else if (stock <= 5) badge = `<span class="badge status-pending">Stock bas : ${stock}</span>`;
      else badge = `<span class="badge status-confirmed">${stock} restants</span>`;

      const card = document.createElement('article');
      card.className = 'admin-item';
      card.innerHTML = `
        <div class="admin-item-main">
          <div>
            <strong>${item.name}</strong>
            ${badge}
            <p>${CATEGORY_LABELS[item.category] || item.category} · ${formatPrice(item.price)}</p>
          </div>
        </div>
        <div class="admin-item-actions stock-actions">
          <input type="number" min="0" class="stock-input" placeholder="Qté" value="${stock ?? ''}" />
          <button type="button" class="confirm-btn stock-save">Enregistrer</button>
          <button type="button" class="qr-toggle stock-unlimited">Illimité</button>
        </div>
      `;

      const saveStock = async (value) => {
        const { error: stockError } = await db.from(table).update({ stock_qty: value }).eq('id', item.id);
        if (stockError) alert('Erreur : ' + stockError.message);
        else loadStockList(target);
      };

      card.querySelector('.stock-save').addEventListener('click', () => {
        const raw = card.querySelector('.stock-input').value;
        if (raw === '' || Number(raw) < 0) { alert('Indiquez une quantité valide.'); return; }
        saveStock(Number(raw));
      });
      card.querySelector('.stock-unlimited').addEventListener('click', () => saveStock(null));

      container.appendChild(card);
    });
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

  // ================= GÉNÉRATEUR DE QR CODES =================

  const QR_TYPE_LABELS = { room: 'Chambre', table: 'Table', salon: 'Salon' };
  const QR_ORANGE = '#c2410c';
  let qrScope = null;

  if (sections.some((key) => SECTIONS[key].qrType)) {
    initQrPanel();
  }

  function setQrScope(type) {
    if (!type) return;
    qrScope = type;
    const roomMode = document.getElementById('qr-room-mode');
    const bulkMode = document.getElementById('qr-bulk-mode');
    if (!roomMode || !bulkMode) return;

    if (type === 'room') {
      // Mode chambres : formulaire classique
      roomMode.hidden = false;
      bulkMode.hidden = true;
      const typeSelect = document.getElementById('qr-type');
      typeSelect.innerHTML = `<option value="room">${QR_TYPE_LABELS.room}</option>`;
      typeSelect.value = 'room';
      syncQrTypeFields();
      loadQrList();
    } else {
      // Mode tables / salons : compteur + cartes imprimables
      roomMode.hidden = true;
      bulkMode.hidden = false;
      const noun = type === 'table' ? 'tables' : 'salons';
      document.getElementById('qr-count-label').textContent = `Nombre de ${noun}`;
      loadQrBulk();
    }
  }

  async function syncQrTypeFields() {
    const typeSelect = document.getElementById('qr-type');
    const roomSelect = document.getElementById('qr-room');
    const labelInput = document.getElementById('qr-label');
    const isRoom = typeSelect.value === 'room';
    roomSelect.hidden = !isRoom;
    labelInput.hidden = isRoom;
    labelInput.required = !isRoom;
    if (isRoom && !roomSelect.dataset.loaded) {
      const { data: rooms } = await db.from('rooms').select('id, name').order('name');
      roomSelect.innerHTML = '<option value="">Choisissez la chambre...</option>';
      (rooms || []).forEach((room) => {
        const option = document.createElement('option');
        option.value = room.id;
        option.textContent = room.name.trim();
        roomSelect.appendChild(option);
      });
      roomSelect.dataset.loaded = '1';
    }
  }

  function qrUrl(point) {
    return `${window.location.origin}/commander.html?c=${point.code}`;
  }

  function qrDisplayName(point) {
    return point.type === 'room' ? `Chambre ${point.label.trim()}` : point.label.trim();
  }

  // Carte imprimable 900x1240 : fond orange pleine page, marque en haut,
  // libellé en grand, QR dans une carte blanche arrondie (style affiche)
  const QR_CARD_BG = '#b23c0a';

  function roundedRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
  }

  async function buildQrCard(point) {
    await document.fonts.ready;

    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, qrUrl(point), {
      width: 520,
      margin: 0,
      errorCorrectionLevel: 'H',
      color: { dark: QR_ORANGE, light: '#ffffff' },
    });

    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1240;
    const context = canvas.getContext('2d');

    // Fond orange pleine page
    context.fillStyle = QR_CARD_BG;
    context.fillRect(0, 0, 900, 1240);

    context.textAlign = 'center';

    // Marque
    context.fillStyle = '#ffffff';
    context.font = "800 46px Poppins, Arial, sans-serif";
    context.fillText('B E L H O T E L', 450, 305);

    // Libellé en grand (réduit automatiquement s'il est long)
    const label = qrDisplayName(point).toUpperCase();
    let fontSize = 96;
    context.font = `800 ${fontSize}px Poppins, Arial, sans-serif`;
    while (context.measureText(label).width > 760 && fontSize > 38) {
      fontSize -= 4;
      context.font = `800 ${fontSize}px Poppins, Arial, sans-serif`;
    }
    context.fillText(label, 450, 440);

    // Carte blanche arrondie + QR
    roundedRect(context, 140, 505, 620, 620, 44);
    context.fillStyle = '#ffffff';
    context.fill();
    context.drawImage(qrCanvas, 190, 555, 520, 520);

    // Consigne
    context.fillStyle = 'rgba(255,255,255,0.82)';
    context.font = "600 36px Inter, Arial, sans-serif";
    context.fillText('Scannez pour commander', 450, 1195);

    return canvas;
  }

  async function downloadQrCard(point) {
    const canvas = await buildQrCard(point);
    const link = document.createElement('a');
    link.download = `qr-belhotel-${qrDisplayName(point).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function initQrPanel() {
    document.getElementById('qr-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const roomSelect = document.getElementById('qr-room');
      const labelInput = document.getElementById('qr-label');
      const type = document.getElementById('qr-type').value;
      let payload;

      if (type === 'room') {
        const roomId = roomSelect.value;
        if (!roomId) { alert('Choisissez la chambre.'); return; }
        const roomName = roomSelect.options[roomSelect.selectedIndex].textContent;
        payload = { type, label: roomName, room_id: roomId };
      } else {
        const label = labelInput.value.trim();
        if (!label) { alert('Indiquez le nom (ex : Table 3).'); return; }
        payload = { type, label };
      }

      const button = event.target.querySelector('button[type="submit"]');
      button.disabled = true;
      const { error } = await db.from('qr_points').insert([payload]);
      button.disabled = false;

      if (error) {
        alert('Erreur : ' + error.message);
        return;
      }
      labelInput.value = '';
      loadQrList();
    });

    // Mode compteur (tables / salons)
    document.getElementById('qr-plus').addEventListener('click', bulkAdd);
    document.getElementById('qr-minus').addEventListener('click', bulkRemove);
    document.getElementById('qr-print-all').addEventListener('click', printAllQr);

    // Portée initiale : le premier type de QR autorisé pour ce rôle
    const firstType = sections.map((key) => SECTIONS[key].qrType).find(Boolean);
    setQrScope(firstType);
  }

  // ----- Mode compteur : Table 1..N / Salon 1..N (comme le modèle) -----
  const QR_BASE_LABEL = { table: 'Table', salon: 'Salon' };
  let bulkPoints = [];

  function pointNumber(point) {
    const digits = (point.label.match(/\d+/) || ['0'])[0];
    const number = parseInt(digits, 10);
    return Number.isNaN(number) ? 0 : number;
  }

  async function loadQrBulk() {
    const grid = document.getElementById('qr-print-grid');
    if (!grid || qrScope === 'room') return;

    const { data: points, error } = await db
      .from('qr_points')
      .select('*')
      .eq('type', qrScope);

    if (error) {
      grid.innerHTML = `<p class="empty-state">Erreur de chargement : ${error.message}</p>`;
      return;
    }

    bulkPoints = (points || []).sort((a, b) => pointNumber(a) - pointNumber(b));
    const actives = bulkPoints.filter((point) => point.is_active);
    document.getElementById('qr-count').textContent = actives.length;

    grid.innerHTML = '';
    if (!actives.length) {
      grid.innerHTML = '<p class="empty-state">Utilisez le compteur + pour générer vos QR codes.</p>';
      return;
    }

    actives.forEach((point) => {
      const card = document.createElement('div');
      card.className = 'qr-print-card';
      card.innerHTML = `
        <span class="qr-print-brand">BELHOTEL</span>
        <strong class="qr-print-label">${point.label.trim().toUpperCase()}</strong>
        <canvas></canvas>
        <p class="qr-print-hint">Scannez pour commander</p>
        <button type="button" class="qr-toggle qr-dl">Télécharger</button>
      `;
      QRCode.toCanvas(card.querySelector('canvas'), qrUrl(point), {
        width: 170,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: QR_ORANGE, light: '#ffffff' },
      });
      card.querySelector('.qr-dl').addEventListener('click', () => downloadQrCard(point));
      grid.appendChild(card);
    });
  }

  async function bulkAdd() {
    const base = QR_BASE_LABEL[qrScope];
    if (!base) return;
    const actives = bulkPoints.filter((point) => point.is_active);
    const nextNumber = Math.max(0, ...actives.map(pointNumber)) + 1;
    const nextLabel = `${base} ${nextNumber}`;

    // Si ce numéro existe déjà (désactivé), on le réactive au lieu d'en créer un autre
    const existing = bulkPoints.find((point) => point.label.trim().toLowerCase() === nextLabel.toLowerCase());
    const { error } = existing
      ? await db.from('qr_points').update({ is_active: true }).eq('id', existing.id)
      : await db.from('qr_points').insert([{ type: qrScope, label: nextLabel }]);

    if (error) alert('Erreur : ' + error.message);
    else loadQrBulk();
  }

  async function bulkRemove() {
    const actives = bulkPoints.filter((point) => point.is_active);
    if (!actives.length) return;
    const last = actives.reduce((a, b) => (pointNumber(a) >= pointNumber(b) ? a : b));
    const { error } = await db.from('qr_points').update({ is_active: false }).eq('id', last.id);
    if (error) alert('Erreur : ' + error.message);
    else loadQrBulk();
  }

  async function printAllQr() {
    const actives = bulkPoints.filter((point) => point.is_active);
    if (!actives.length) return;

    const button = document.getElementById('qr-print-all');
    button.disabled = true;
    const images = [];
    for (const point of actives) {
      const canvas = await buildQrCard(point);
      images.push(`<img src="${canvas.toDataURL('image/png')}" />`);
    }
    button.disabled = false;

    const win = window.open('', '_blank');
    if (!win) { alert('Autorisez les fenêtres pop-up pour imprimer.'); return; }
    win.document.write(`<!DOCTYPE html><html lang="fr"><head><title>QR codes Belhotel</title>
      <style>
        body { margin: 0; }
        img { display: block; width: 100%; max-height: 100vh; object-fit: contain; page-break-after: always; }
        img:last-child { page-break-after: auto; }
      </style>
      </head><body>${images.join('')}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }

  async function loadQrList() {
    const container = document.getElementById('qr-list');
    if (!container || !qrScope) return;

    const { data: points, error } = await db
      .from('qr_points')
      .select('*')
      .eq('type', qrScope)
      .order('label');

    if (error) {
      container.innerHTML = `<p class="empty-state">Erreur de chargement : ${error.message}</p>`;
      return;
    }
    if (!points.length) {
      container.innerHTML = '<p class="empty-state">Aucun QR code. Créez le premier avec le formulaire.</p>';
      return;
    }

    container.innerHTML = '';
    points.forEach((point) => {
      const card = document.createElement('div');
      card.className = 'qr-card' + (point.is_active ? '' : ' is-inactive');
      card.innerHTML = `
        <canvas class="qr-preview"></canvas>
        <strong>${qrDisplayName(point)}</strong>
        <span class="badge">${QR_TYPE_LABELS[point.type]}</span>
        <div class="qr-actions">
          <button type="button" class="confirm-btn qr-download">Télécharger</button>
          <button type="button" class="qr-toggle">${point.is_active ? 'Désactiver' : 'Activer'}</button>
          <button type="button" class="delete-btn qr-delete">Supprimer</button>
        </div>
      `;

      QRCode.toCanvas(card.querySelector('.qr-preview'), qrUrl(point), {
        width: 130,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: QR_ORANGE, light: '#ffffff' },
      });

      card.querySelector('.qr-download').addEventListener('click', () => downloadQrCard(point));

      card.querySelector('.qr-toggle').addEventListener('click', async () => {
        const { error: toggleError } = await db
          .from('qr_points')
          .update({ is_active: !point.is_active })
          .eq('id', point.id);
        if (toggleError) alert('Erreur : ' + toggleError.message);
        else loadQrList();
      });

      card.querySelector('.qr-delete').addEventListener('click', async () => {
        if (!confirm(`Supprimer le QR code « ${qrDisplayName(point)} » ? Les affiches déjà imprimées ne fonctionneront plus.`)) return;
        const { error: deleteError } = await db.from('qr_points').delete().eq('id', point.id);
        if (deleteError) alert('Erreur : ' + deleteError.message);
        else loadQrList();
      });

      container.appendChild(card);
    });
  }

  // ================= RÉGLAGES (superadmin) =================

  if (sections.includes('settings')) {
    initSettingsPanel();
  }

  async function initSettingsPanel() {
    const input = document.getElementById('setting-whatsapp');
    const { data } = await db.from('app_settings').select('value').eq('key', 'whatsapp_number').maybeSingle();
    input.value = (data && data.value) || WHATSAPP_NUMBER;

    document.getElementById('settings-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const feedback = document.getElementById('settings-feedback');
      feedback.classList.remove('error');
      feedback.textContent = '';

      const value = input.value.replace(/\D/g, '');
      if (value.length < 8 || value.length > 15) {
        feedback.textContent = 'Numéro invalide : indiquez 8 à 15 chiffres, avec l’indicatif pays.';
        feedback.classList.add('error');
        return;
      }

      const button = event.target.querySelector('button[type="submit"]');
      button.disabled = true;
      const { error } = await db.from('app_settings').upsert([{ key: 'whatsapp_number', value }]);
      button.disabled = false;

      if (error) {
        feedback.textContent = 'Erreur : ' + error.message;
        feedback.classList.add('error');
        return;
      }
      input.value = value;
      feedback.textContent = 'Numéro enregistré ! Les boutons WhatsApp du site utilisent ce numéro dès maintenant.';
    });
  }
});

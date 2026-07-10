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

  const NAV_LABELS = {
    overview: 'Aperçu',
    staff: 'Personnel',
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

  const NAV_GROUPS = [
    { title: 'Direction', items: ['overview', 'staff'] },
    { title: 'Hôtel', items: ['orders-rooms', 'requests', 'rooms', 'qr-room'] },
    { title: 'Restauration', items: ['orders-resto', 'restaurant', 'stock-resto', 'qr-table'] },
    { title: 'Bar', items: ['orders-bar', 'bar', 'stock-bar', 'qr-salon'] },
  ];

  const ROLE_SECTIONS = {
    superadmin: ['overview', 'staff', 'orders-rooms', 'requests', 'rooms', 'qr-room', 'orders-resto', 'restaurant', 'stock-resto', 'qr-table', 'orders-bar', 'bar', 'stock-bar', 'qr-salon'],
    reception: ['orders-rooms', 'requests', 'rooms', 'qr-room'],
    resto: ['orders-resto', 'restaurant', 'stock-resto', 'qr-table'],
    bar: ['orders-bar', 'bar', 'stock-bar', 'qr-salon'],
  };

  const sections = ROLE_SECTIONS[role] || [];

  // ----- Barre latérale groupée par pôle -----
  const nav = document.getElementById('dash-nav');
  let firstKey = null;
  NAV_GROUPS.forEach((group) => {
    const items = group.items.filter((key) => sections.includes(key));
    if (!items.length) return;

    const label = document.createElement('div');
    label.className = 'dash-nav-group';
    label.textContent = group.title;
    nav.appendChild(label);

    items.forEach((key) => {
      if (!firstKey) firstKey = key;
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'dash-nav-item';
      item.dataset.section = key;
      item.innerHTML = `${ICONS[SECTIONS[key].icon]}<span>${NAV_LABELS[key]}</span>`;
      item.addEventListener('click', () => showSection(key));
      nav.appendChild(item);
    });
  });

  function showSection(key) {
    const meta = SECTIONS[key];
    document.querySelectorAll('.dash-nav-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.section === key);
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
  showSection(firstKey);

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
      applyFilter: (query) => query.eq('origin_type', 'room'),
      emptyText: 'Aucune commande en attente. Les commandes des chambres apparaîtront ici automatiquement.',
    },
    'orders-resto': {
      board: 'board-orders-resto',
      context: 'kitchen',
      active: ['sent', 'preparing'],
      applyFilter: (query) => query.eq('target', 'resto').neq('status', 'reception'),
      emptyText: 'Aucune commande en cours. Les commandes des tables et des chambres apparaîtront ici automatiquement.',
    },
    'orders-bar': {
      board: 'board-orders-bar',
      context: 'kitchen',
      active: ['sent', 'preparing'],
      applyFilter: (query) => query.eq('target', 'bar').neq('status', 'reception'),
      emptyText: 'Aucune commande en cours. Les commandes des salons et des chambres apparaîtront ici automatiquement.',
    },
  };

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
    const item = document.querySelector(`.dash-nav-item[data-section="${sectionKey}"]`);
    if (!item) return;
    let badge = item.querySelector('.nav-badge');
    if (!count) {
      badge?.remove();
      return;
    }
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'nav-badge';
      item.appendChild(badge);
    }
    badge.textContent = count;
  }

  async function updateOrderStatus(orderId, status, boardKey) {
    const { error } = await db.from('orders').update({ status }).eq('id', orderId);
    if (error) alert('Erreur : ' + error.message);
    else loadOrdersBoard(boardKey);
  }

  function renderOrderCard(order, config, withActions) {
    const originName = (order.origin_type === 'room' ? 'Chambre ' : '') + order.origin_label.trim();
    const card = document.createElement('article');
    card.className = 'order-ticket' + (withActions ? '' : ' is-history');

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
      .limit(60);
    query = config.applyFilter(query);
    const { data: orders, error } = await query;

    if (error) {
      container.innerHTML = `<p class="empty-state">Erreur de chargement : ${error.message}</p>`;
      return;
    }

    const active = orders.filter((order) => config.active.includes(order.status));
    const history = orders.filter((order) => !config.active.includes(order.status)).slice(0, 12);

    setNavBadge(key, active.length);

    container.innerHTML = '';
    if (!active.length) {
      container.insertAdjacentHTML('beforeend', `<p class="empty-state">${config.emptyText}</p>`);
    } else {
      const grid = document.createElement('div');
      grid.className = 'ticket-grid';
      active.forEach((order) => grid.appendChild(renderOrderCard(order, config, true)));
      container.appendChild(grid);
    }

    if (history.length) {
      container.insertAdjacentHTML('beforeend', '<h3 class="board-subtitle">Historique récent</h3>');
      const grid = document.createElement('div');
      grid.className = 'ticket-grid';
      history.forEach((order) => grid.appendChild(renderOrderCard(order, config, false)));
      container.appendChild(grid);
    }
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
  if (sections.includes('overview')) {
    loadStats();
  }

  async function loadStats() {
    const grid = document.getElementById('stat-grid');
    if (!grid) return;

    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [{ data: orders }, requestsRes, roomsRes] = await Promise.all([
      db.from('orders').select('*, order_items(item_name, qty, unit_price)').gte('created_at', since).limit(1000),
      db.from('service_requests').select('*', { count: 'exact', head: true }).neq('status', 'done'),
      db.from('rooms').select('*', { count: 'exact', head: true }).eq('status', 'available'),
    ]);

    const valid = (orders || []).filter((order) => order.status !== 'cancelled');
    const today = valid.filter((order) => new Date(order.created_at) >= todayStart);
    const inProgress = (orders || []).filter((order) => ['reception', 'sent', 'preparing'].includes(order.status));
    const sum = (list) => list.reduce((total, order) => total + (order.total || 0), 0);

    const tiles = [
      { value: formatPrice(sum(today)), label: 'Chiffre d’affaires aujourd’hui' },
      { value: formatPrice(sum(valid)), label: 'Chiffre d’affaires (30 jours)' },
      { value: today.length, label: 'Commandes aujourd’hui' },
      { value: inProgress.length, label: 'Commandes en cours' },
      { value: requestsRes.count ?? 0, label: 'Demandes de service ouvertes' },
      { value: roomsRes.count ?? 0, label: 'Chambres disponibles' },
    ];
    grid.innerHTML = '';
    tiles.forEach((tile) => {
      const element = document.createElement('div');
      element.className = 'stat-tile';
      element.innerHTML = `<strong>${tile.value}</strong><span>${tile.label}</span>`;
      grid.appendChild(element);
    });

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
      topContainer.innerHTML = '<p class="empty-state">Aucune vente sur les 30 derniers jours.</p>';
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

    // Activité par section
    const bySection = { resto: { count: 0, revenue: 0 }, bar: { count: 0, revenue: 0 } };
    valid.forEach((order) => {
      bySection[order.target].count += 1;
      bySection[order.target].revenue += order.total || 0;
    });
    const byOrigin = { room: 0, table: 0, salon: 0 };
    valid.forEach((order) => { byOrigin[order.origin_type] += 1; });

    document.getElementById('section-activity').innerHTML = `
      <div class="rank-row"><div class="rank-info"><strong>Restaurant</strong><span>${bySection.resto.count} commandes · ${formatPrice(bySection.resto.revenue)}</span></div></div>
      <div class="rank-row"><div class="rank-info"><strong>Bar</strong><span>${bySection.bar.count} commandes · ${formatPrice(bySection.bar.revenue)}</span></div></div>
      <div class="rank-row"><div class="rank-info"><strong>Origine des commandes</strong><span>${byOrigin.room} chambres · ${byOrigin.table} tables · ${byOrigin.salon} salons</span></div></div>
    `;
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
    if (!type || type === qrScope) {
      if (type) loadQrList();
      return;
    }
    qrScope = type;
    const typeSelect = document.getElementById('qr-type');
    if (!typeSelect) return;
    typeSelect.innerHTML = `<option value="${type}">${QR_TYPE_LABELS[type]}</option>`;
    typeSelect.value = type;
    syncQrTypeFields();
    loadQrList();
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

  // Carte imprimable 800x1080 : bandeau BELHOTEL, QR orange, libellé
  async function buildQrCard(point) {
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, qrUrl(point), {
      width: 560,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: { dark: QR_ORANGE, light: '#ffffff' },
    });

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1080;
    const context = canvas.getContext('2d');

    // Fond blanc + cadre orange
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, 800, 1080);
    context.strokeStyle = QR_ORANGE;
    context.lineWidth = 10;
    context.strokeRect(5, 5, 790, 1070);

    // Bandeau BELHOTEL
    context.fillStyle = QR_ORANGE;
    context.fillRect(10, 10, 780, 150);
    context.fillStyle = '#ffffff';
    context.font = '800 62px Arial, sans-serif';
    context.textAlign = 'center';
    context.fillText('B E L H O T E L', 400, 105);

    // QR code
    context.drawImage(qrCanvas, 120, 220, 560, 560);

    // Libellé + instruction
    context.fillStyle = '#2b2018';
    context.font = '800 46px Arial, sans-serif';
    context.fillText(qrDisplayName(point), 400, 880);
    context.fillStyle = '#8a7a6d';
    context.font = '600 30px Arial, sans-serif';
    context.fillText('Scannez pour commander', 400, 940);
    context.fillStyle = QR_ORANGE;
    context.font = '700 26px Arial, sans-serif';
    context.fillText('Restaurant · Bar · Service en chambre', 400, 995);

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

    // Portée initiale : le premier type de QR autorisé pour ce rôle
    const firstType = sections.map((key) => SECTIONS[key].qrType).find(Boolean);
    setQrScope(firstType);
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
});

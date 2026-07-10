document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const code = (params.get('c') || '').trim();

  const loadingEl = document.getElementById('order-loading');
  const errorEl = document.getElementById('order-error');
  const appEl = document.getElementById('order-app');

  if (!code) {
    loadingEl.hidden = true;
    errorEl.hidden = false;
    return;
  }

  // ----- Chargement du point de scan -----
  const { data: point } = await db
    .from('qr_points')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .maybeSingle();

  if (!point) {
    loadingEl.hidden = true;
    errorEl.hidden = false;
    return;
  }

  const TYPE_PREFIX = { room: 'Chambre', table: '', salon: '' };
  const pointLabel = `${TYPE_PREFIX[point.type]} ${point.label}`.trim();
  document.getElementById('order-point').textContent = pointLabel;

  // ----- Onglets selon le type de point -----
  const TABS = {
    room: [
      { key: 'resto', label: 'Restaurant' },
      { key: 'bar', label: 'Bar' },
      { key: 'service', label: 'Demandes' },
    ],
    table: [{ key: 'resto', label: 'Restaurant' }],
    salon: [{ key: 'bar', label: 'Bar' }],
  };
  const tabs = TABS[point.type];
  const tabsNav = document.getElementById('order-tabs');

  tabs.forEach((tab, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'order-tab' + (index === 0 ? ' active' : '');
    button.textContent = tab.label;
    button.addEventListener('click', () => showTab(tab.key, button));
    tabsNav.appendChild(button);
  });
  if (tabs.length === 1) tabsNav.hidden = true;

  function showTab(key, button) {
    document.querySelectorAll('.order-tab').forEach((tab) => tab.classList.remove('active'));
    if (button) button.classList.add('active');
    document.getElementById('menu-resto').hidden = key !== 'resto';
    document.getElementById('menu-bar').hidden = key !== 'bar';
    document.getElementById('service-panel').hidden = key !== 'service';
  }

  // ----- Panier -----
  // clé = target:id  → { id, target, name, price, qty }
  const cart = new Map();

  function cartCount() {
    let count = 0;
    cart.forEach((line) => { count += line.qty; });
    return count;
  }
  function cartTotal() {
    let total = 0;
    cart.forEach((line) => { total += line.qty * line.price; });
    return total;
  }

  function updateCartBar() {
    const bar = document.getElementById('cart-bar');
    const count = cartCount();
    bar.hidden = count === 0;
    document.getElementById('cart-bar-count').textContent = count;
    document.getElementById('cart-bar-total').textContent = formatPrice(cartTotal());
  }

  function setQty(target, item, qty) {
    const key = `${target}:${item.id}`;
    if (qty <= 0) {
      cart.delete(key);
    } else {
      cart.set(key, { id: item.id, target, name: item.name, price: item.price, qty });
    }
    updateCartBar();
    updateItemStepper(target, item.id);
  }

  function getQty(target, id) {
    const line = cart.get(`${target}:${id}`);
    return line ? line.qty : 0;
  }

  function updateItemStepper(target, id) {
    const card = document.querySelector(`[data-item="${target}:${id}"]`);
    if (!card) return;
    const qty = getQty(target, id);
    card.querySelector('.item-add').hidden = qty > 0;
    card.querySelector('.item-stepper').hidden = qty === 0;
    card.querySelector('.stepper-qty').textContent = qty;
  }

  // ----- Menus -----
  const CATEGORY_TITLES = {
    resto: { standard: 'Menu Standard', vip: 'Menu VIP', vvip: 'Menu VVIP' },
    bar: { standard: 'Bar Standard', vip: 'Salon VIP', vvip: 'Expérience VVIP' },
  };

  async function loadMenu(target) {
    const table = target === 'resto' ? 'restaurant_menu' : 'bar_menu';
    const container = document.getElementById(`menu-${target}`);

    const { data: items, error } = await db
      .from(table)
      .select('*')
      .or('stock_qty.is.null,stock_qty.gt.0')
      .order('price', { ascending: true });

    if (error) {
      container.innerHTML = '<p class="empty-state">Impossible de charger le menu. Réessayez.</p>';
      return;
    }
    if (!items.length) {
      container.innerHTML = '<p class="empty-state">Le menu arrive bientôt. Contactez la réception.</p>';
      return;
    }

    container.innerHTML = '';
    ['standard', 'vip', 'vvip'].forEach((category) => {
      const categoryItems = items.filter((item) => item.category === category);
      if (!categoryItems.length) return;

      const section = document.createElement('div');
      section.className = 'order-category';
      section.innerHTML = `<h2>${CATEGORY_TITLES[target][category]}</h2>`;

      categoryItems.forEach((item) => {
        const card = document.createElement('article');
        card.className = 'order-item';
        card.dataset.item = `${target}:${item.id}`;
        card.innerHTML = `
          ${item.image_url ? `<img src="${item.image_url}" alt="${item.name}" loading="lazy" />` : '<div class="order-item-noimg"></div>'}
          <div class="order-item-body">
            <h3>${item.name}</h3>
            ${item.description ? `<p>${item.description}</p>` : ''}
            <div class="order-item-foot">
              <span class="price-tag">${formatPrice(item.price)}</span>
              <button type="button" class="item-add">Ajouter</button>
              <div class="item-stepper" hidden>
                <button type="button" class="stepper-minus" aria-label="Retirer">−</button>
                <span class="stepper-qty">0</span>
                <button type="button" class="stepper-plus" aria-label="Ajouter">+</button>
              </div>
            </div>
          </div>
        `;
        card.querySelector('.item-add').addEventListener('click', () => setQty(target, item, 1));
        card.querySelector('.stepper-plus').addEventListener('click', () => setQty(target, item, getQty(target, item.id) + 1));
        card.querySelector('.stepper-minus').addEventListener('click', () => setQty(target, item, getQty(target, item.id) - 1));
        section.appendChild(card);
      });

      container.appendChild(section);
    });
  }

  // ----- Panneau panier -----
  const overlay = document.getElementById('cart-overlay');
  document.getElementById('cart-bar').addEventListener('click', () => {
    renderCartSheet();
    overlay.hidden = false;
  });
  document.getElementById('cart-close').addEventListener('click', () => { overlay.hidden = true; });
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) overlay.hidden = true;
  });

  function renderCartSheet() {
    const container = document.getElementById('cart-items');
    container.innerHTML = '';
    document.getElementById('cart-feedback').textContent = '';

    cart.forEach((line, key) => {
      const row = document.createElement('div');
      row.className = 'cart-line';
      row.innerHTML = `
        <div class="cart-line-info">
          <strong>${line.name}</strong>
          <span>${formatPrice(line.price)}</span>
        </div>
        <div class="item-stepper">
          <button type="button" class="stepper-minus" aria-label="Retirer">−</button>
          <span class="stepper-qty">${line.qty}</span>
          <button type="button" class="stepper-plus" aria-label="Ajouter">+</button>
        </div>
      `;
      const [target, id] = key.split(':');
      const itemRef = { id, name: line.name, price: line.price };
      row.querySelector('.stepper-plus').addEventListener('click', () => {
        setQty(target, itemRef, getQty(target, id) + 1);
        renderCartSheet();
      });
      row.querySelector('.stepper-minus').addEventListener('click', () => {
        setQty(target, itemRef, getQty(target, id) - 1);
        if (cartCount() === 0) overlay.hidden = true;
        else renderCartSheet();
      });
      container.appendChild(row);
    });

    document.getElementById('cart-total').textContent = formatPrice(cartTotal());
  }

  // ----- Envoi de la commande -----
  document.getElementById('cart-submit').addEventListener('click', async () => {
    if (cartCount() === 0) return;
    const submitButton = document.getElementById('cart-submit');
    const feedback = document.getElementById('cart-feedback');
    submitButton.disabled = true;
    submitButton.textContent = 'Envoi en cours...';
    feedback.textContent = '';

    const note = document.getElementById('cart-note').value.trim() || null;

    // Regroupe par destination (resto / bar) : une commande par section
    const groups = {};
    cart.forEach((line) => {
      (groups[line.target] = groups[line.target] || []).push({ id: line.id, qty: line.qty });
    });

    let failed = false;
    for (const target of Object.keys(groups)) {
      const { error } = await db.rpc('place_order', {
        p_code: code,
        p_target: target,
        p_note: note,
        p_items: groups[target],
      });
      if (error) {
        failed = true;
        if ((error.message || '').includes('STOCK_INSUFFISANT')) {
          const itemName = error.message.split(':')[1] || 'un article';
          feedback.textContent = `Stock insuffisant pour ${itemName}. Réduisez la quantité.`;
        } else {
          feedback.textContent = 'Une erreur est survenue. Veuillez réessayer.';
        }
        break;
      }
    }

    submitButton.disabled = false;
    submitButton.textContent = 'Envoyer la commande';
    if (failed) return;

    cart.clear();
    updateCartBar();
    document.getElementById('cart-note').value = '';
    overlay.hidden = true;
    document.querySelectorAll('.order-item').forEach((card) => {
      card.querySelector('.item-add').hidden = false;
      card.querySelector('.item-stepper').hidden = true;
    });

    const MESSAGES = {
      room: 'La réception a bien reçu votre commande et s’en occupe immédiatement.',
      table: 'La cuisine a bien reçu votre commande. Elle vous sera servie à votre table.',
      salon: 'Le bar a bien reçu votre commande. Elle vous sera servie dans votre salon.',
    };
    document.getElementById('success-message').textContent = MESSAGES[point.type];
    document.getElementById('order-success').hidden = false;
  });

  document.getElementById('success-again').addEventListener('click', () => {
    document.getElementById('order-success').hidden = true;
  });

  // ----- Demandes de service (chambres) -----
  if (point.type === 'room') {
    let selectedCategory = null;
    document.querySelectorAll('.service-cat').forEach((button) => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.service-cat').forEach((b) => b.classList.remove('active'));
        button.classList.add('active');
        selectedCategory = button.dataset.cat;
      });
    });

    document.getElementById('service-send').addEventListener('click', async () => {
      const feedback = document.getElementById('service-feedback');
      feedback.classList.remove('error');
      if (!selectedCategory) {
        feedback.textContent = 'Choisissez d’abord le type de demande.';
        feedback.classList.add('error');
        return;
      }
      const sendButton = document.getElementById('service-send');
      sendButton.disabled = true;

      const { error } = await db.from('service_requests').insert([{
        qr_point_id: point.id,
        origin_label: point.label,
        category: selectedCategory,
        message: document.getElementById('service-message').value.trim() || null,
      }]);

      sendButton.disabled = false;
      if (error) {
        feedback.textContent = 'Une erreur est survenue. Veuillez réessayer.';
        feedback.classList.add('error');
        return;
      }
      feedback.textContent = 'Demande envoyée ! La réception arrive.';
      document.getElementById('service-message').value = '';
      document.querySelectorAll('.service-cat').forEach((b) => b.classList.remove('active'));
      selectedCategory = null;
    });
  }

  // ----- Initialisation -----
  if (tabs.some((tab) => tab.key === 'resto')) await loadMenu('resto');
  if (tabs.some((tab) => tab.key === 'bar')) await loadMenu('bar');

  loadingEl.hidden = true;
  appEl.hidden = false;
  showTab(tabs[0].key, tabsNav.querySelector('.order-tab'));
});

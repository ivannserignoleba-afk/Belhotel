document.addEventListener('DOMContentLoaded', () => {
  const year = document.getElementById('year');
  if (year) {
    year.textContent = new Date().getFullYear();
  }

  // ----- Menu mobile -----
  const toggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      const isOpen = toggle.classList.toggle('active');
      toggle.setAttribute('aria-expanded', String(isOpen));
      navLinks.classList.toggle('open', isOpen);
    });

    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        toggle.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
        navLinks.classList.remove('open');
      });
    });

    document.addEventListener('click', (event) => {
      if (!toggle.contains(event.target) && !navLinks.contains(event.target) && navLinks.classList.contains('open')) {
        toggle.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
        navLinks.classList.remove('open');
      }
    });
  }

  const page = document.body.dataset.page;

  // ----- Page Chambres : liste dynamique + réservation WhatsApp -----
  if (page === 'chambres') {
    loadRooms();
  }

  // ----- Pages Restaurant / Bar : menus dynamiques -----
  if (page === 'restaurant') {
    loadMenu('restaurant_menu', 'plat');
  }
  if (page === 'bar') {
    loadMenu('bar_menu', 'boisson');
  }

  // ----- Modale photo (commune) -----
  const photoModal = document.getElementById('room-modal');
  const photoClose = document.getElementById('modal-close');
  photoClose?.addEventListener('click', () => { photoModal.hidden = true; });
  photoModal?.addEventListener('click', (event) => {
    if (event.target === photoModal) photoModal.hidden = true;
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && photoModal && !photoModal.hidden) {
      photoModal.hidden = true;
    }
  });

  async function loadRooms() {
    const list = document.getElementById('rooms-grid');
    if (!list) return;

    const { data: rooms, error } = await db
      .from('rooms')
      .select('*')
      .eq('status', 'available')
      .order('name', { ascending: true });

    if (error) {
      list.innerHTML = '<p class="empty-state">Impossible de charger les chambres. Réessayez plus tard.</p>';
      return;
    }
    if (!rooms.length) {
      list.innerHTML = '<p class="empty-state">Aucune chambre disponible pour le moment.</p>';
      return;
    }

    list.innerHTML = '';
    rooms.forEach((room) => {
      const image = (room.image_urls && room.image_urls[0]) || 'images/slide2.jpg';
      const name = (room.name || '').trim();
      const card = document.createElement('article');
      card.className = 'room-card';
      card.innerHTML = `
        <img src="${image}" alt="${name}" class="item-image" loading="lazy" />
        <h3>${name}</h3>
        <p>${room.description || 'Chambre confortable du complexe Belhotel.'}</p>
        <p class="price-tag">${formatPrice(room.price)} / nuit</p>
        <div class="room-actions">
          <button class="btn btn-outline preview-btn" type="button">Voir la photo</button>
          <button class="btn btn-primary reserve-btn" type="button">Réserver</button>
        </div>
      `;

      card.querySelector('.preview-btn').addEventListener('click', () => {
        const modal = document.getElementById('room-modal');
        document.getElementById('modal-image').src = image;
        document.getElementById('modal-image').alt = name;
        document.getElementById('modal-title').textContent = name;
        document.getElementById('modal-description').textContent = room.description || '';
        modal.hidden = false;
      });

      card.querySelector('.reserve-btn').addEventListener('click', () => {
        const message = `Bonjour, je souhaite réserver la chambre « ${name} » (${formatPrice(room.price)}/nuit). Merci de me confirmer la disponibilité.`;
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
      });

      list.appendChild(card);
    });
  }

  async function loadMenu(table, itemLabel) {
    const container = document.getElementById('menu-sections');
    if (!container) return;

    const { data: items, error } = await db
      .from(table)
      .select('*')
      .order('price', { ascending: true });

    if (error) {
      container.insertAdjacentHTML('beforeend', '<p class="empty-state">Impossible de charger la carte. Réessayez plus tard.</p>');
      return;
    }

    ['standard', 'vip', 'vvip'].forEach((category) => {
      const section = container.querySelector(`[data-category="${category}"] .category-items`);
      if (!section) return;
      const categoryItems = items.filter((item) => item.category === category);

      if (!categoryItems.length) {
        section.innerHTML = `<p class="empty-state">Les ${itemLabel}s de cette carte arrivent bientôt.</p>`;
        return;
      }

      section.innerHTML = '';
      categoryItems.forEach((item) => {
        const card = document.createElement('article');
        card.className = 'menu-item';
        card.innerHTML = `
          ${item.image_url ? `<img src="${item.image_url}" alt="${item.name}" class="item-image" loading="lazy" />` : ''}
          <div class="menu-item-body">
            <h4>${item.name}</h4>
            <p>${item.description || ''}</p>
            <p class="price-tag">${formatPrice(item.price)}</p>
          </div>
        `;
        section.appendChild(card);
      });
    });
  }
});

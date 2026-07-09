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

  // ----- Page d'accueil : diaporama + aperçu des chambres -----
  if (page === 'home') {
    initSlider();
    loadRoomsPreview();

    // Boutons WhatsApp génériques (héros, bandeau, footer)
    const genericMessage = 'Bonjour, je vous contacte depuis le site du Belhotel After Work. Je souhaite des informations.';
    ['hero-whatsapp', 'cta-whatsapp', 'footer-whatsapp'].forEach((id) => {
      const link = document.getElementById(id);
      if (link) {
        link.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(genericMessage)}`;
        link.target = '_blank';
        link.rel = 'noopener';
      }
    });
  }

  // ----- Page Chambres : liste dynamique + réservation WhatsApp -----
  if (page === 'chambres') {
    loadRooms();
  }

  function initSlider() {
    const slider = document.getElementById('hero-slider');
    if (!slider) return;

    const slides = Array.from(slider.querySelectorAll('.hs-slide'));
    const dotsContainer = slider.querySelector('.hs-dots');
    let current = 0;
    let timer = null;

    slides.forEach((_, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'hs-dot' + (index === 0 ? ' is-active' : '');
      dot.setAttribute('aria-label', `Aller à l'image ${index + 1}`);
      dot.addEventListener('click', () => { goTo(index); restart(); });
      dotsContainer.appendChild(dot);
    });
    const dots = Array.from(dotsContainer.children);

    function goTo(index) {
      slides[current].classList.remove('is-active');
      dots[current].classList.remove('is-active');
      current = (index + slides.length) % slides.length;
      slides[current].classList.add('is-active');
      dots[current].classList.add('is-active');
    }

    function restart() {
      clearInterval(timer);
      timer = setInterval(() => goTo(current + 1), 6000);
    }

    restart();
  }

  function whatsappReserveUrl(room) {
    const name = (room.name || '').trim();
    const message = `Bonjour, je souhaite réserver la chambre « ${name} » (${formatPrice(room.price)}/nuit). Merci de me confirmer la disponibilité.`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  }

  async function loadRoomsPreview() {
    const list = document.getElementById('home-rooms-grid');
    if (!list) return;

    const { data: rooms, error } = await db
      .from('rooms')
      .select('*')
      .eq('status', 'available')
      .order('price', { ascending: true })
      .limit(3);

    if (error || !rooms || !rooms.length) {
      list.innerHTML = '<p class="empty-state">Nos chambres arrivent bientôt. Contactez-nous sur WhatsApp !</p>';
      return;
    }

    list.innerHTML = '';
    rooms.forEach((room) => {
      const image = (room.image_urls && room.image_urls[0]) || '';
      const name = (room.name || '').trim();
      const card = document.createElement('article');
      card.className = 'room-card';
      card.innerHTML = `
        ${image ? `<img src="${image}" alt="${name}" class="item-image" loading="lazy" />` : ''}
        <h3>${name}</h3>
        <p>${room.description || 'Chambre confortable du complexe Belhotel.'}</p>
        <p class="price-tag">${formatPrice(room.price)} / nuit</p>
        <a class="btn btn-primary reserve-btn" href="${whatsappReserveUrl(room)}" target="_blank" rel="noopener">Réserver sur WhatsApp</a>
      `;
      list.appendChild(card);
    });
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
        window.open(whatsappReserveUrl(room), '_blank');
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

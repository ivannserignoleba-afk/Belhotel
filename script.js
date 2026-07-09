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

  // ----- Page Chambres : liste dynamique + réservation -----
  if (page === 'chambres') {
    loadRooms();
    setupBookingModal();
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
    if (event.key === 'Escape') {
      if (photoModal && !photoModal.hidden) photoModal.hidden = true;
      const bookingModal = document.getElementById('booking-modal');
      if (bookingModal && !bookingModal.hidden) bookingModal.hidden = true;
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
        openBookingModal(room);
      });

      list.appendChild(card);
    });
  }

  let selectedRoom = null;

  function openBookingModal(room) {
    selectedRoom = room;
    const modal = document.getElementById('booking-modal');
    if (!modal) return;
    document.getElementById('booking-room').value = (room.name || '').trim();
    document.getElementById('booking-total').textContent = '';
    const message = document.getElementById('booking-message');
    if (message) { message.textContent = ''; message.classList.remove('error'); }
    modal.hidden = false;
  }

  function nightsBetween(checkin, checkout) {
    const inDate = new Date(checkin);
    const outDate = new Date(checkout);
    return Math.round((outDate - inDate) / (1000 * 60 * 60 * 24));
  }

  function setupBookingModal() {
    const modal = document.getElementById('booking-modal');
    const closeBtn = document.getElementById('booking-modal-close');
    const form = document.getElementById('booking-form');
    const message = document.getElementById('booking-message');
    if (!modal || !form) return;

    closeBtn?.addEventListener('click', () => { modal.hidden = true; });
    modal.addEventListener('click', (event) => {
      if (event.target === modal) modal.hidden = true;
    });

    // Affiche le total dès que les dates changent
    const updateTotal = () => {
      const checkin = form.checkin.value;
      const checkout = form.checkout.value;
      const totalEl = document.getElementById('booking-total');
      if (selectedRoom && checkin && checkout) {
        const nights = nightsBetween(checkin, checkout);
        if (nights > 0) {
          totalEl.textContent = `${nights} nuit${nights > 1 ? 's' : ''} — Total : ${formatPrice(nights * selectedRoom.price)}`;
          return;
        }
      }
      totalEl.textContent = '';
    };
    form.checkin.addEventListener('change', updateTotal);
    form.checkout.addEventListener('change', updateTotal);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!selectedRoom) return;

      const checkin = form.checkin.value;
      const checkout = form.checkout.value;
      const nights = nightsBetween(checkin, checkout);

      if (nights <= 0) {
        message.textContent = 'La date de départ doit être après la date d’arrivée.';
        message.classList.add('error');
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Envoi en cours...';

      const { error } = await db.from('bookings').insert([{
        room_id: selectedRoom.id,
        customer_name: form.name.value.trim(),
        customer_email: form.email.value.trim(),
        customer_phone: form.phone.value.trim() || null,
        check_in: checkin,
        check_out: checkout,
        total_price: nights * selectedRoom.price,
        status: 'pending',
      }]);

      submitBtn.disabled = false;
      submitBtn.textContent = 'Envoyer la demande';

      if (error) {
        message.textContent = 'Une erreur est survenue. Veuillez réessayer.';
        message.classList.add('error');
        return;
      }

      message.classList.remove('error');
      message.textContent = `Merci ${form.name.value.trim()} ! Votre réservation pour « ${(selectedRoom.name || '').trim()} » a bien été enregistrée. Nous vous contacterons rapidement.`;
      form.reset();
      document.getElementById('booking-room').value = (selectedRoom.name || '').trim();
      document.getElementById('booking-total').textContent = '';
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

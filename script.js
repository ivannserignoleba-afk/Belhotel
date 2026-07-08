document.addEventListener('DOMContentLoaded', () => {
  const year = document.getElementById('year');
  if (year) {
    year.textContent = new Date().getFullYear();
  }

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

  const reserveButtons = document.querySelectorAll('.reserve-btn');
  const previewButtons = document.querySelectorAll('.preview-btn');
  const bookingRoomInput = document.getElementById('booking-room');
  const bookingModal = document.getElementById('booking-modal');
  const bookingModalClose = document.getElementById('booking-modal-close');
  const modal = document.getElementById('room-modal');
  const modalImage = document.getElementById('modal-image');
  const modalTitle = document.getElementById('modal-title');
  const modalDescription = document.getElementById('modal-description');
  const closeModalButton = document.getElementById('modal-close');
  const bookingForm = document.getElementById('booking-form');
  const bookingMessage = document.getElementById('booking-message');

  const openBookingModal = (roomName) => {
    if (!bookingModal || !bookingRoomInput) return;
    bookingRoomInput.value = roomName || '';
    if (bookingMessage) {
      bookingMessage.textContent = '';
    }
    bookingModal.hidden = false;
    bookingRoomInput.focus();
  };

  const closeBookingModal = () => {
    if (!bookingModal) return;
    bookingModal.hidden = true;
  };

  reserveButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const room = button.getAttribute('data-room');
      openBookingModal(room || '');
    });
  });

  previewButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (!modal || !modalImage || !modalTitle || !modalDescription) return;
      modalImage.src = button.getAttribute('data-image') || '';
      modalImage.alt = button.getAttribute('data-title') || 'Photo de la chambre';
      modalTitle.textContent = button.getAttribute('data-title') || 'Chambre';
      modalDescription.textContent = button.getAttribute('data-description') || '';
      modal.hidden = false;
    });
  });

  const closeModal = () => {
    if (modal) {
      modal.hidden = true;
    }
  };

  closeModalButton?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  bookingModalClose?.addEventListener('click', closeBookingModal);
  bookingModal?.addEventListener('click', (event) => {
    if (event.target === bookingModal) {
      closeBookingModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (modal && !modal.hidden) {
        closeModal();
      }
      if (bookingModal && !bookingModal.hidden) {
        closeBookingModal();
      }
    }
  });

  if (bookingForm && bookingMessage) {
    bookingForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(bookingForm);
      const payload = Object.fromEntries(formData.entries());
      const name = payload.name?.toString().trim() || 'Client';
      const room = payload.room?.toString().trim() || 'chambre';

      try {
        const response = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          bookingMessage.textContent = `Merci ${name} ! Votre demande de réservation pour ${room} a bien été enregistrée. Nous vous contacterons rapidement.`;
          bookingForm.reset();
          if (bookingRoomInput) {
            bookingRoomInput.value = '';
          }
        } else {
          bookingMessage.textContent = 'Une erreur est survenue. Veuillez réessayer.';
        }
      } catch (error) {
        console.error('Erreur lors de l’envoi de la réservation:', error);
        bookingMessage.textContent = 'Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.';
      }
    });
  }

  const list = document.getElementById('items-list');
  if (!list) return;

  const page = document.body.dataset.page;
  const endpoint = page === 'restaurant'
    ? '/api/restaurant'
    : page === 'bar'
      ? '/api/bar'
      : '/api/rooms';

  fetch(endpoint)
    .then((response) => response.json())
    .then((items) => {
      if (!items.length) {
        list.innerHTML = '<p class="empty-state">Aucun élément disponible pour le moment.</p>';
        return;
      }

      list.innerHTML = '';
      items.forEach((item) => {
        const card = document.createElement('article');
        card.className = page === 'bar' ? 'bar-card' : page === 'restaurant' ? 'menu-card' : 'room-card';
        card.innerHTML = `
          ${item.image ? `<img src="${item.image}" alt="${item.name}" class="item-image" />` : ''}
          <h3>${item.name}</h3>
          <p>${item.description || ''}</p>
          <p class="price-tag">${Number(item.price).toLocaleString('fr-FR')} FCFA</p>
        `;
        list.appendChild(card);
      });
    })
    .catch(() => {
      list.innerHTML = '<p class="empty-state">Impossible de charger les données.</p>';
    });
});

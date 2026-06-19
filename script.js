const form = document.getElementById('registration-form');
const salonList = document.getElementById('salon-list');

function loadSalons() {
  const savedSalons = localStorage.getItem('daloaSalons');
  return savedSalons ? JSON.parse(savedSalons) : [];
}

function saveSalons(salons) {
  localStorage.setItem('daloaSalons', JSON.stringify(salons));
}

function renderSalons() {
  const salons = loadSalons();
  salonList.innerHTML = '';

  if (salons.length === 0) {
    salonList.innerHTML = '<p>Aucun salon inscrit pour l\'instant.</p>';
    return;
  }

  salons.forEach((salon) => {
    const card = document.createElement('article');
    card.className = 'salon-card';
    card.innerHTML = `
      <h3>${salon.salonName}</h3>
      <p><strong>Coiffeur(se) :</strong> ${salon.ownerName}</p>
      <p><strong>Type :</strong> ${salon.gender}</p>
      <p><strong>Adresse :</strong> ${salon.address}</p>
      <p><strong>Téléphone :</strong> ${salon.phone}</p>
      <p><strong>Services :</strong> ${salon.services || 'Non précisé'}</p>
    `;
    salonList.appendChild(card);
  });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const newSalon = {
    salonName: form.salonName.value.trim(),
    ownerName: form.ownerName.value.trim(),
    email: form.email.value.trim(),
    phone: form.phone.value.trim(),
    gender: form.gender.value,
    address: form.address.value.trim(),
    services: form.services.value.trim(),
  };

  const salons = loadSalons();
  salons.push(newSalon);
  saveSalons(salons);
  renderSalons();
  form.reset();
  form.salonName.focus();
});

renderSalons();

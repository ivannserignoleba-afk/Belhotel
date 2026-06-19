const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const dataPath = path.join(__dirname, 'salons.json');
const publicPath = __dirname;

app.use(express.json());
app.use(express.static(publicPath));

function loadSalons() {
  try {
    const json = fs.readFileSync(dataPath, 'utf-8');
    return JSON.parse(json);
  } catch (error) {
    return [];
  }
}

function saveSalons(salons) {
  fs.writeFileSync(dataPath, JSON.stringify(salons, null, 2), 'utf-8');
}

app.get('/api/salons', (req, res) => {
  const query = req.query.query ? req.query.query.toLowerCase() : '';
  const salons = loadSalons();
  if (!query) {
    return res.json(salons);
  }

  const filtered = salons.filter((salon) => {
    return (
      salon.salonName.toLowerCase().includes(query) ||
      salon.ownerName.toLowerCase().includes(query) ||
      salon.address.toLowerCase().includes(query) ||
      salon.services.toLowerCase().includes(query) ||
      salon.gender.toLowerCase().includes(query)
    );
  });

  res.json(filtered);
});

app.post('/api/salons', (req, res) => {
  const { salonName, ownerName, email, phone, gender, address, services } = req.body;
  if (!salonName || !ownerName || !email || !phone || !gender || !address) {
    return res.status(400).json({ error: 'Tous les champs obligatoires doivent être remplis.' });
  }

  const salons = loadSalons();
  const newSalon = {
    id: Date.now().toString(),
    salonName,
    ownerName,
    email,
    phone,
    gender,
    address,
    services: services || '',
    createdAt: new Date().toISOString(),
  };

  salons.push(newSalon);
  saveSalons(salons);
  res.status(201).json(newSalon);
});

app.delete('/api/salons/:id', (req, res) => {
  const salons = loadSalons();
  const updatedSalons = salons.filter((salon) => salon.id !== req.params.id);

  if (updatedSalons.length === salons.length) {
    return res.status(404).json({ error: 'Salon non trouvé.' });
  }

  saveSalons(updatedSalons);
  res.json({ success: true });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});

import QRCode from 'qrcode';
import { db } from './supabase';

export const ROLE_LABELS = {
  superadmin: 'Super Admin',
  reception: 'Réception',
  resto: 'Restauration',
  bar: 'Bar',
  serveur: 'Serveur',
};

export const ROLE_OPTIONS = [
  ['serveur', 'Serveur (resto + bar)'],
  ['reception', 'Réception'],
  ['resto', 'Restauration'],
  ['bar', 'Bar'],
  ['superadmin', 'Super Admin'],
];

export const STATUS_LABELS = {
  reception: 'À traiter',
  sent: 'Envoyée',
  preparing: 'En préparation',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

export const STATUS_BADGE = {
  reception: 'bg-brand-pale text-brand-deep',
  sent: 'bg-blue-100 text-blue-700',
  preparing: 'bg-amber-100 text-amber-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

export function timeAgo(dateString) {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'à l’instant';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Bip sonore à l'arrivée d'une commande
export function beep() {
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
  } catch (ignore) {
    /* audio non disponible */
  }
}

// Envoie une image (ordinateur / téléphone) dans le stockage
export async function uploadImage(file, folder) {
  const extension = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const { error } = await db.storage.from('belhotel-images').upload(path, file, { cacheControl: '3600' });
  if (error) throw error;
  const { data } = db.storage.from('belhotel-images').getPublicUrl(path);
  return data.publicUrl;
}

// ---------- Cartes QR style affiche ----------
export const QR_ORANGE = '#c2410c';
const QR_CARD_BG = '#b23c0a';

export const QR_TYPE_LABELS = { room: 'Chambre', table: 'Table', salon: 'Salon' };

export function qrUrl(point) {
  return `${window.location.origin}/commander?c=${point.code}`;
}

export function qrDisplayName(point) {
  return point.type === 'room' ? `Chambre ${point.label.trim()}` : point.label.trim();
}

export async function qrToCanvas(canvas, point, width = 170) {
  await QRCode.toCanvas(canvas, qrUrl(point), {
    width,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: QR_ORANGE, light: '#ffffff' },
  });
}

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

export async function buildQrCard(point) {
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

  context.fillStyle = QR_CARD_BG;
  context.fillRect(0, 0, 900, 1240);
  context.textAlign = 'center';

  context.fillStyle = '#ffffff';
  context.font = '800 46px Poppins, Arial, sans-serif';
  context.fillText('B E L H O T E L', 450, 305);

  const label = qrDisplayName(point).toUpperCase();
  let fontSize = 96;
  context.font = `800 ${fontSize}px Poppins, Arial, sans-serif`;
  while (context.measureText(label).width > 760 && fontSize > 38) {
    fontSize -= 4;
    context.font = `800 ${fontSize}px Poppins, Arial, sans-serif`;
  }
  context.fillText(label, 450, 440);

  roundedRect(context, 140, 505, 620, 620, 44);
  context.fillStyle = '#ffffff';
  context.fill();
  context.drawImage(qrCanvas, 190, 555, 520, 520);

  context.fillStyle = 'rgba(255,255,255,0.82)';
  context.font = '600 36px Inter, Arial, sans-serif';
  context.fillText('Scannez pour commander', 450, 1195);

  return canvas;
}

export async function downloadQrCard(point) {
  const canvas = await buildQrCard(point);
  const link = document.createElement('a');
  link.download = `qr-belhotel-${qrDisplayName(point).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export async function printQrCards(points) {
  const images = [];
  for (const point of points) {
    const canvas = await buildQrCard(point);
    images.push(`<img src="${canvas.toDataURL('image/png')}" />`);
  }
  const win = window.open('', '_blank');
  if (!win) {
    alert('Autorisez les fenêtres pop-up pour imprimer.');
    return;
  }
  win.document.write(`<!DOCTYPE html><html lang="fr"><head><title>QR codes Belhotel</title>
    <style>body{margin:0}img{display:block;width:100%;max-height:100vh;object-fit:contain;page-break-after:always}img:last-child{page-break-after:auto}</style>
    </head><body>${images.join('')}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

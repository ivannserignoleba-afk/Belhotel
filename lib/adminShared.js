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

// ---------- Alerte sonore ----------
// Un seul son : un carillon à trois notes (do-mi-sol), joué une fois.
// Élément <audio> déverrouillé au premier geste puis réutilisable.
let beepAudio = null;
let soundUnlocked = false;

// Génère le carillon (WAV 16 bits) sous forme d'URL Blob, sans fichier externe
function makeBeepUrl() {
  const sampleRate = 44100;
  const duration = 0.85;
  const total = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + total * 2);
  const view = new DataView(buffer);
  let pos = 0;
  const str = (text) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(pos++, text.charCodeAt(i));
  };
  const u32 = (value) => {
    view.setUint32(pos, value, true);
    pos += 4;
  };
  const u16 = (value) => {
    view.setUint16(pos, value, true);
    pos += 2;
  };
  str('RIFF'); u32(36 + total * 2); str('WAVE'); str('fmt ');
  u32(16); u16(1); u16(1); u32(sampleRate); u32(sampleRate * 2); u16(2); u16(16);
  str('data'); u32(total * 2);

  // do (523), mi (659), sol (784) qui s'enchaînent
  const notes = [
    { freq: 523.25, start: 0.0, len: 0.22 },
    { freq: 659.25, start: 0.22, len: 0.22 },
    { freq: 783.99, start: 0.44, len: 0.4 },
  ];
  for (let i = 0; i < total; i += 1) {
    const t = i / sampleRate;
    let sample = 0;
    for (const note of notes) {
      if (t >= note.start && t < note.start + note.len) {
        const local = t - note.start;
        // attaque rapide puis extinction douce
        const env = Math.min(local * 60, 1) * Math.exp(-local * 4);
        sample += Math.sin(2 * Math.PI * note.freq * t) * env;
      }
    }
    sample = Math.max(-1, Math.min(1, sample * 0.7));
    view.setInt16(pos, sample * 32767, true);
    pos += 2;
  }
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}

function ensureAudio() {
  try {
    if (!beepAudio) {
      beepAudio = new Audio(makeBeepUrl());
      beepAudio.preload = 'auto';
    }
  } catch (ignore) {
    /* audio indisponible */
  }
}

// À appeler dans un geste utilisateur : déverrouille durablement le son
export function initSound() {
  ensureAudio();
  if (!soundUnlocked && beepAudio) {
    beepAudio.muted = true;
    const promise = beepAudio.play();
    if (promise && promise.then) {
      promise
        .then(() => {
          beepAudio.pause();
          beepAudio.currentTime = 0;
          beepAudio.muted = false;
          soundUnlocked = true;
        })
        .catch(() => {
          beepAudio.muted = false;
        });
    } else {
      soundUnlocked = true;
    }
  }
}

export function beep() {
  ensureAudio();
  if (!beepAudio) return;
  try {
    beepAudio.muted = false;
    beepAudio.currentTime = 0;
    const promise = beepAudio.play();
    if (promise && promise.catch) promise.catch(() => {});
  } catch (ignore) {
    /* ignore */
  }
}

// Notification navigateur (si la permission a été accordée)
export function notify(title, body) {
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body, tag: 'belhotel-order' });
    }
  } catch (ignore) {
    /* notifications non disponibles */
  }
}

// Fait clignoter le titre de l'onglet quelques secondes
export function flashTitle(text) {
  const original = document.title;
  document.title = text;
  setTimeout(() => {
    document.title = original;
  }, 15000);
}

// ---------- Images : compression automatique avant envoi ----------
async function compressImage(file, maxSize = 1280, quality = 0.82) {
  try {
    if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    return blob && blob.size < file.size ? blob : file;
  } catch (ignore) {
    return file;
  }
}

// Envoie une image (ordinateur / téléphone) dans le stockage.
// Les photos sont compressées automatiquement (8 Mo → ~200 Ko) ; on peut
// désactiver la compression pour préserver un logo (transparence, netteté).
export async function uploadImage(file, folder, { compress = true } = {}) {
  const source = compress ? await compressImage(file) : file;
  const isJpeg = source !== file;
  const extension = isJpeg
    ? 'jpg'
    : (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const { error } = await db.storage.from('belhotel-images').upload(path, source, {
    cacheControl: '3600',
    contentType: isJpeg ? 'image/jpeg' : file.type,
  });
  if (error) throw error;
  const { data } = db.storage.from('belhotel-images').getPublicUrl(path);
  return data.publicUrl;
}

// ---------- Ticket de commande imprimable (80 mm) ----------
export function printOrderTicket(order) {
  const lines = (order.order_items || [])
    .map(
      (line) =>
        `<tr><td>${line.qty}×</td><td>${line.item_name}</td><td style="text-align:right">${(
          line.unit_price * line.qty
        ).toLocaleString('fr-FR')}</td></tr>`,
    )
    .join('');
  const when = new Date(order.created_at).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const origin = (order.origin_type === 'room' ? 'Chambre ' : '') + order.origin_label.trim();

  const win = window.open('', '_blank', 'width=400,height=620');
  if (!win) {
    alert('Autorisez les fenêtres pop-up pour imprimer.');
    return;
  }
  win.document.write(`<!DOCTYPE html><html lang="fr"><head><title>Ticket ${origin}</title>
    <style>
      body { font-family: 'Courier New', monospace; width: 72mm; margin: 0 auto; padding: 4mm; font-size: 12px; }
      h1 { text-align: center; font-size: 15px; letter-spacing: 3px; margin: 0 0 2mm; }
      .sep { border-top: 1px dashed #000; margin: 2mm 0; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 1mm 0; vertical-align: top; }
      .total { font-weight: bold; font-size: 14px; }
      .note { font-style: italic; }
      .center { text-align: center; }
    </style></head><body>
    <h1>BELHOTEL</h1>
    <p class="center">${origin}<br/>${when}</p>
    <div class="sep"></div>
    <table>${lines}</table>
    ${order.note ? `<div class="sep"></div><p class="note">Note : ${order.note}</p>` : ''}
    <div class="sep"></div>
    <table><tr class="total"><td>TOTAL</td><td style="text-align:right">${(order.total || 0).toLocaleString('fr-FR')} FCFA</td></tr></table>
    <div class="sep"></div>
    <p class="center">Merci !</p>
    </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
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

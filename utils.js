// Shared browser helpers used by script.js (public pages) and admin.js.
// Loaded as a classic script before the page scripts, exposing a global `Bel`.
window.Bel = (function () {
  const setFooterYear = () => {
    const year = document.getElementById('year');
    if (year) {
      year.textContent = new Date().getFullYear();
    }
  };

  const formatPrice = (value) => `${Number(value).toLocaleString('fr-FR')} FCFA`;

  const postJson = (url, payload) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

  const deleteJson = (url) => fetch(url, { method: 'DELETE' });

  return { setFooterYear, formatPrice, postJson, deleteJson };
})();

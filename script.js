'use strict';
const API_BASE = (window.CAMPAIGN_API_URL || '').replace(/\/$/, '');
const tabs = document.querySelectorAll('.filter-tab');
const cards = document.querySelectorAll('.prize-card');

tabs.forEach((tab) => tab.addEventListener('click', () => {
  const filter = tab.dataset.filter;
  tabs.forEach((item) => {
    const active = item === tab;
    item.classList.toggle('active', active);
    item.setAttribute('aria-selected', String(active));
  });
  cards.forEach((card) => card.classList.toggle('hidden', filter !== 'all' && card.dataset.category !== filter));
}));

const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');
if (menuToggle && mainNav) {
  menuToggle.addEventListener('click', () => {
    const open = mainNav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(open));
  });
  mainNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  }));
}

const registrationForm = document.querySelector('#register-form');
if (registrationForm) registrationForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!registrationForm.reportValidity()) return;
  const message = registrationForm.querySelector('.form-message');
  const submitButton = registrationForm.querySelector('.submit-button');
  submitButton.disabled = true;
  message.textContent = '送信中…';
  const formData = new FormData(registrationForm);
  try {
    const response = await fetch(`${API_BASE}/api/entries`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({
        name: formData.get('name'), email: formData.get('email'), phone: formData.get('phone'),
        prize: formData.get('prize'), terms: formData.get('terms') === 'on'
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '送信に失敗しました。');
    message.textContent = `${result.message} 応募ID: ${result.id}`;
    registrationForm.reset();
  } catch (error) {
    message.textContent = error.message || '通信に失敗しました。時間をおいて再度お試しください。';
  } finally { submitButton.disabled = false; }
});

const tabs = document.querySelectorAll('.filter-tab');
const cards = document.querySelectorAll('.prize-card');

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const filter = tab.dataset.filter;
    tabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle('active', active);
      item.setAttribute('aria-selected', String(active));
    });
    cards.forEach((card) => {
      card.classList.toggle('hidden', filter !== 'all' && card.dataset.category !== filter);
    });
  });
});

const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');
menuToggle.addEventListener('click', () => {
  const open = mainNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
});
mainNav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  });
});

const registrationForm = document.querySelector('#register-form');
registrationForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const message = registrationForm.querySelector('.form-message');
  if (!registrationForm.reportValidity()) return;
  message.textContent = '入力内容を確認しました。このデモでは応募データは送信・保存されません。';
  registrationForm.querySelector('.submit-button').textContent = 'デモ確認済み';
});

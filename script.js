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
if (menuToggle && mainNav) {
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
}

const registrationForm = document.querySelector('#register-form');
if (registrationForm) {
  registrationForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!registrationForm.reportValidity()) return;

    const formData = new FormData(registrationForm);
    const entry = {
      id: `DRV-${Date.now().toString().slice(-6)}`,
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone') || '未入力',
      prize: formData.get('prize'),
      status: '確認中',
      submittedAt: new Date().toISOString()
    };

    try {
      const existing = JSON.parse(localStorage.getItem('drive-your-dream-entries') || '[]');
      existing.push(entry);
      localStorage.setItem('drive-your-dream-entries', JSON.stringify(existing));
      const message = registrationForm.querySelector('.form-message');
      message.textContent = `応募を受け付けました。応募ID: ${entry.id}`;
      registrationForm.reset();
    } catch (error) {
      const message = registrationForm.querySelector('.form-message');
      message.textContent = '応募の保存に失敗しました。再度お試しください。';
    }
  });
}

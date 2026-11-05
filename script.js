document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('giveaway-form');
  const message = document.getElementById('form-message');

  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const name = (data.get('name') || '').toString().trim();
    const email = (data.get('email') || '').toString().trim();
    const prize = (data.get('prize') || '').toString();
    const agreed = data.get('agree') === 'on';

    if (!name || !email || !prize || !agreed) {
      message.textContent = 'Please complete all required fields and confirm the terms.';
      return;
    }

    const entry = {
      id: `JA-${Date.now().toString().slice(-6)}`,
      name,
      email,
      prize,
      createdAt: new Date().toISOString()
    };

    try {
      const existing = JSON.parse(localStorage.getItem('ja-fan-giveaway-entries') || '[]');
      existing.push(entry);
      localStorage.setItem('ja-fan-giveaway-entries', JSON.stringify(existing));
      message.textContent = `Entry received. Your reference ID is ${entry.id}.`;
      form.reset();
    } catch (error) {
      message.textContent = 'There was a problem saving your entry locally. Please try again.';
    }
  });
});

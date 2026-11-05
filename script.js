'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('giveaway-form');
  const message = document.getElementById('form-message');
  if (!form || !message) return;

  const apiBase = (window.CAMPAIGN_API_URL || '').trim().replace(/\/$/, '');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    if (!apiBase || apiBase.includes('YOUR-API-HOST')) {
      message.textContent = '応募を受け付けられません。運営者にお問い合わせください。';
      return;
    }

    const data = new FormData(form);
    const submitButton = form.querySelector('button[type="submit"]');
    const entry = {
      name: String(data.get('name') || '').trim(),
      email: String(data.get('email') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      prize: String(data.get('prize') || ''),
      terms: data.get('terms') === 'on'
    };

    submitButton.disabled = true;
    message.textContent = '';
    try {
      const response = await fetch(`${apiBase}/api/entries`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(entry)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || '応募を受け付けられませんでした。入力内容をご確認ください。');

      message.textContent = `${result.message || '応募を受け付けました。'} 受付番号: ${result.id}`;
      form.reset();
    } catch (error) {
      message.textContent = error.message || '通信に失敗しました。時間をおいて再度お試しください。';
    } finally {
      submitButton.disabled = false;
    }
  });
});

let pending = null;

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.status');
  if (!btn) return;

  const userId = Number(btn.dataset.user);
  const cur = Number(btn.dataset.status) || 0;
  const next = cur ? 0 : 1;

  const confirmText = document.getElementById('confirmText');
  confirmText.textContent = next
    ? `Отметить присутствие пользователя #${userId}?`
    : `Отметить отсутствие пользователя #${userId}?`;

  pending = { btn, userId, next };

  const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
  modal.show();

  const yesBtn = document.getElementById('confirmYesBtn');
  yesBtn.onclick = async () => {
    try {
      // блокируем кнопку, чтобы не было дабл-клика
      yesBtn.disabled = true;

      const r = await fetch('/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: pending.next })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);

      // сохраняем позицию скролла и перезагружаем
      sessionStorage.setItem('scrollY', String(window.scrollY));
      window.location.reload(); // полная перезагрузка
    } catch (err) {
      alert('Ошибка: ' + err.message);
    } finally {
      yesBtn.disabled = false;
      pending = null;
    }
  };
});

// при загрузке восстанавливаем скролл
window.addEventListener('DOMContentLoaded', () => {
  const y = sessionStorage.getItem('scrollY');
  if (y) {
    window.scrollTo(0, Number(y));
    sessionStorage.removeItem('scrollY');
  }
});

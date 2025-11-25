function switchAuthTab(tab) {
  document.querySelectorAll('.tabs-auth .tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('#auth-section .tab-content').forEach(content => content.classList.remove('active'));

  event.target.classList.add('active');
  document.getElementById(tab + '-tab').classList.add('active');
}

function switchTab(tab) {
  document.querySelectorAll('.tabs-main .tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('#main-app .tab-content').forEach(content => content.classList.remove('active'));

  event.target.classList.add('active');
  document.getElementById(tab + '-tab').classList.add('active');
}

function showMessage(message, type) {
  const container = document.getElementById('messages');
  const el = document.createElement('div');
  el.className = `message ${type}`;
  el.textContent = message;
  container.innerHTML = '';
  container.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

// Expose
window.switchAuthTab = switchAuthTab;
window.switchTab = switchTab;
window.showMessage = showMessage;

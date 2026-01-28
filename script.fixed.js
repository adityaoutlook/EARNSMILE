const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const result = document.getElementById('result');

// User management
let currentUser = null;
let userProfiles = JSON.parse(localStorage.getItem('userProfiles')) || {};
let userHistory = JSON.parse(localStorage.getItem('userHistory')) || {};
let userWallets = JSON.parse(localStorage.getItem('userWallets')) || {};
let userImages = JSON.parse(localStorage.getItem('userImages')) || {};
let userCredentials = JSON.parse(localStorage.getItem('userCredentials')) || {};

// Capture image from video
function captureImage() {
  if (!video || !canvas) return null;
  const ctx = canvas.getContext('2d');
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(video, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.9);
}

// Store captured image locally
function storeImage(imageData, score, accepted) {
  if (!currentUser) return;
  if (!userImages[currentUser]) userImages[currentUser] = [];
  userImages[currentUser].push({ data: imageData, date: getToday(), score, accepted, timestamp: Date.now() });
  localStorage.setItem('userImages', JSON.stringify(userImages));
  displayCapturedImages();
}

// Display gallery
function displayCapturedImages() {
  if (!currentUser) return;
  const gallery = document.getElementById('captured-gallery');
  const gallerySection = document.getElementById('gallery-section');
  if (!gallery || !gallerySection) return;
  const images = userImages[currentUser] || [];
  if (images.length === 0) { gallerySection.style.display = 'none'; return; }
  gallerySection.style.display = 'block';
  gallery.innerHTML = '';
  images.slice().reverse().forEach((img, idx) => {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.innerHTML = `\n      <img src="${img.data}" alt="Smile ${idx}">\n      <div class="gallery-item-info">\n        <div>${img.date}</div>\n        <div class="gallery-item-score">Score: ${img.score}/5</div>\n        <div>${img.accepted ? '✅' : '❌'}</div>\n      </div>`;
    item.addEventListener('click', () => openImageModal(img.data));
    gallery.appendChild(item);
  });
}

function openImageModal(imageSrc) {
  let modal = document.getElementById('image-modal');
  if (!modal) {
    const newModal = document.createElement('div');
    newModal.id = 'image-modal';
    newModal.className = 'modal';
    newModal.innerHTML = `\n      <div class="modal-content">\n        <span class="modal-close">&times;</span>\n        <img id="modal-image" src="" alt="Captured Smile">\n      </div>`;
    document.body.appendChild(newModal);
    newModal.querySelector('.modal-close').addEventListener('click', () => newModal.classList.remove('show'));
    modal = newModal;
  }
  modal.querySelector('#modal-image').src = imageSrc;
  modal.classList.add('show');
}

// DOM handlers
document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('login-btn');
  const usernameInput = document.getElementById('username');
  const captureBtn = document.getElementById('capture-btn');
  const learnBtn = document.getElementById('learn-btn');
  if (loginBtn) loginBtn.addEventListener('click', handleLogin);
  if (usernameInput) usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });
  if (captureBtn) captureBtn.addEventListener('click', captureSmile);
  if (learnBtn) learnBtn.addEventListener('click', openInfoModal);
  if (video) { video.style.maxWidth = '720px'; video.style.width = '100%'; }
});

function openInfoModal() {
  const modal = document.getElementById('info-modal');
  if (modal) modal.style.display = 'flex';
}

function closeInfoModal() {
  const modal = document.getElementById('info-modal');
  if (modal) modal.style.display = 'none';
}

function handleLogin() {
  const username = (document.getElementById('username') || {}).value || '';
  const password = (document.getElementById('password') || {}).value || '';
  const name = username.trim();
  if (!name) { alert('Please enter a username'); return; }
  if (!password) { alert('Please enter a password'); return; }
  if (password.length < 4) { alert('Password must be at least 4 characters'); return; }
  // Check if user exists
  if (userCredentials[name]) {
    if (userCredentials[name] !== password) { alert('Invalid password'); return; }
  } else {
    // New user: register with this password
    userCredentials[name] = password;
    localStorage.setItem('userCredentials', JSON.stringify(userCredentials));
  }
  requestCameraAccess(name);
}

function requestCameraAccess(username) {
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 1280, height: 720 } })
    .then(stream => {
      if (video) video.srcObject = stream;
      currentUser = username;
      if (!userProfiles[currentUser]) {
        userProfiles[currentUser] = { streak: 0, lastSubmit: null };
        userHistory[currentUser] = [];
        userWallets[currentUser] = { balance: 0 };
        localStorage.setItem('userProfiles', JSON.stringify(userProfiles));
        localStorage.setItem('userHistory', JSON.stringify(userHistory));
        localStorage.setItem('userWallets', JSON.stringify(userWallets));
      }
      setupDashboard();
    })
    .catch(err => { alert('Camera permission denied. Please enable camera access to continue.'); console.error('Camera error', err); });
}

function setupDashboard() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('user-greeting').textContent = `Welcome, ${currentUser}! 👋`;
  loadUserData();
  loadImagesFromBackend();
}

function loadUserData() {
  if (!currentUser) return;
  updateProgressBar(userProfiles[currentUser].streak || 0);
  updateBadges(userProfiles[currentUser].streak || 0);
  updateWallet();
  displaySmileHistory();
  displayCapturedImages();
}

function updateWallet() {
  if (!currentUser) return;
  const wallet = userWallets[currentUser] || { balance: 0 };
  const balanceDisplay = document.getElementById('wallet-balance');
  if (balanceDisplay) balanceDisplay.textContent = `${wallet.balance} USDC`;
}

function analyzeSmile() {
  const ratio = Math.random() * 1.5;
  if (ratio > 1.0) return 5;
  if (ratio > 0.8) return 4;
  if (ratio > 0.6) return 3;
  return 2;
}

function getToday() { return new Date().toDateString(); }
function getYesterday() { const d = new Date(); d.setDate(d.getDate() - 1); return d.toDateString(); }

function submitSmile(score) {
  if (!currentUser) { alert('Please login first'); return; }
  if (userProfiles[currentUser].lastSubmit === getToday()) { alert('You already submitted your smile today! Come back tomorrow.'); return; }
  const imageData = captureImage();
  const payload = { score, username: currentUser, imageData };

  fetch(`http://localhost:8080/api/smile/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    .then(res => { if (!res.ok) throw new Error('Network response not ok'); return res.json(); })
    .then(data => {
      const accepted = !!data.accepted;
      storeImage(imageData, score, accepted);
      logSmileHistory(score, accepted);
      if (accepted) alert(`Great! Genuine smile! You earned 5 USDC. Streak: ${userProfiles[currentUser].streak}`);
      else alert('Smile not genuine enough. Try again tomorrow!');
      loadImagesFromBackend();
    })
    .catch(err => {
      console.warn('Backend unreachable, saving locally.', err);
      const accepted = score >= 4;
      storeImage(imageData, score, accepted);
      logSmileHistory(score, accepted);
      if (accepted) alert('Saved locally: genuine smile! You earned 5 USDC (local).'); else alert('Saved locally: smile not accepted.');
    });
}

function logSmileHistory(score, accepted) {
  if (!currentUser) return;
  if (!userHistory[currentUser]) userHistory[currentUser] = [];
  userHistory[currentUser].push({ date: getToday(), score, accepted });
  if (accepted) {
    userProfiles[currentUser].lastSubmit = getToday();
    userProfiles[currentUser].streak = (userProfiles[currentUser].streak || 0) + 1;
    userWallets[currentUser].balance = (userWallets[currentUser].balance || 0) + 5;
  }
  localStorage.setItem('userProfiles', JSON.stringify(userProfiles));
  localStorage.setItem('userHistory', JSON.stringify(userHistory));
  localStorage.setItem('userWallets', JSON.stringify(userWallets));
  loadUserData();
}

function displaySmileHistory() {
  if (!currentUser) return;
  const historyTable = document.querySelector('#history-table tbody');
  if (!historyTable) return;
  historyTable.innerHTML = '';
  const history = userHistory[currentUser] || [];
  if (history.length === 0) { historyTable.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#999;">No smile history yet</td></tr>'; return; }
  history.slice().reverse().forEach(entry => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${entry.date}</td><td>${entry.score}/5</td><td>${entry.accepted ? '✅ Accepted' : '❌ Rejected'}</td>`;
    historyTable.appendChild(row);
  });
}

function updateProgressBar(streak) {
  const progress = document.getElementById('progress');
  if (progress) progress.style.width = `${Math.min(streak * 10, 100)}%`;
}

function getLevel(streak) { if (streak >= 30) return ['Smile Legend 😎','🏆 Gold']; if (streak >= 7) return ['Smiley Pro 😄','🥇 Silver']; if (streak >= 3) return ['Getting Better 🙂','🥉 Bronze']; return ['Beginner 🙂','None']; }

function updateBadges(streak) {
  const level = getLevel(streak);
  const badgesDiv = document.getElementById('badges');
  const streakDisplay = document.getElementById('streak-display');
  if (streakDisplay) streakDisplay.textContent = streak;
  if (badgesDiv) badgesDiv.innerHTML = `<div class="badge">${level[0]}</div><div class="badge">${level[1]}</div>`;
}

function loadImagesFromBackend() {
  if (!currentUser) return;
  fetch(`http://localhost:8080/api/smile/history/${currentUser}`)
    .then(res => { if (!res.ok) throw new Error('No data'); return res.json(); })
    .then(data => {
      userImages[currentUser] = [];
      data.forEach(smile => { if (smile.imageData) userImages[currentUser].push({ data: `data:image/jpeg;base64,${smile.imageData}`, date: smile.submissionDate || getToday(), score: smile.score || 0, accepted: smile.accepted || false }); });
      displayCapturedImages();
    })
    .catch(err => { console.warn('Could not load images from backend, using local cache.', err); displayCapturedImages(); });
}

function captureSmile() { if (!currentUser) { alert('Please login first'); return; } const score = analyzeSmile(); if (result) result.innerText = `Score: ${score}/5`; submitSmile(score); }

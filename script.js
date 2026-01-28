const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const result = document.getElementById("result");
const scoreText = document.getElementById('scoreText');
const progressBar = document.getElementById('progressBar');
const levelText = document.getElementById('levelText');
const badgeText = document.getElementById('badgeText');
const streakText = document.getElementById('streakText');
const historyList = document.getElementById('history');

// User management
let currentUser = null;
let userProfiles = JSON.parse(localStorage.getItem('userProfiles')) || {};
let userHistory = JSON.parse(localStorage.getItem('userHistory')) || {};
let userWallets = JSON.parse(localStorage.getItem('userWallets')) || {};
let userImages = JSON.parse(localStorage.getItem('userImages')) || {};

// Capture image from video
function captureImage() {
    if (!video || !canvas) return null;
    
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    return canvas.toDataURL('image/jpeg', 0.9);
}

// Store captured image
function storeImage(imageData, score, accepted) {
    if (!currentUser) return;
    
    if (!userImages[currentUser]) {
        userImages[currentUser] = [];
    }
    
    userImages[currentUser].push({
        data: imageData,
        date: getToday(),
        score: score,
        accepted: accepted,
        timestamp: new Date().getTime()
    });
    
    localStorage.setItem('userImages', JSON.stringify(userImages));
    displayCapturedImages();
}

// Display captured images gallery
function displayCapturedImages() {
    if (!currentUser) return;
    
    const gallery = document.getElementById('captured-gallery');
    const gallerySection = document.getElementById('gallery-section');
    
    if (!gallery || !gallerySection) return;
    
    const images = userImages[currentUser] || [];
    
    if (images.length === 0) {
        gallerySection.style.display = 'none';
        return;
    }
    
    gallerySection.style.display = 'block';
    gallery.innerHTML = '';
    
    images.slice().reverse().forEach((img, index) => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.innerHTML = `
            <img src="${img.data}" alt="Smile ${index}">
            <div class="gallery-item-info">
                <div>${img.date}</div>
                <div class="gallery-item-score">Score: ${img.score}/5</div>
                <div>${img.accepted ? '✅' : '❌'}</div>
            </div>
        `;
        item.addEventListener('click', () => openImageModal(img.data));
        gallery.appendChild(item);
    });
}

// Open image in modal
function openImageModal(imageSrc) {
    let modal = document.getElementById('image-modal');
    if (!modal) {
        const newModal = document.createElement('div');
        newModal.id = 'image-modal';
        newModal.className = 'modal';
        newModal.innerHTML = `
            <div class="modal-content">
                <span class="modal-close">&times;</span>
                <img id="modal-image" src="" alt="Captured Smile">
            </div>
        `;
        document.body.appendChild(newModal);
        newModal.querySelector('.modal-close').addEventListener('click', () => {
            newModal.classList.remove('show');
        });
        modal = newModal;
    }
    
    const modalImg = modal.querySelector('#modal-image');
    modalImg.src = imageSrc;
    modal.classList.add('show');
}

// Login functionality
document.addEventListener('DOMContentLoaded', function() {
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', handleLogin);
  }
  const usernameInput = document.getElementById('username');
  if (usernameInput) {
    usernameInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') handleLogin();
    });
  }
});

function handleLogin() {
  const username = document.getElementById('username').value.trim();
  if (!username) {
    alert('Please enter a username');
    return;
  }
  
  // Check if user already submitted today
  if (userProfiles[username]) {
    const lastSubmit = userProfiles[username].lastSubmit;
    if (lastSubmit === getToday()) {
      alert(`${username}, you already submitted your smile today! Come back tomorrow.`);
      return;
    }
  }
  
  // Request camera permission
  requestCameraAccess(username);
}

function requestCameraAccess(username) {
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
    .then(stream => {
      if (video) {
        video.srcObject = stream;
        currentUser = username;
        setupDashboard();
      }
    })
    .catch(err => {
      alert('Camera permission denied. Please enable camera access to continue.');
      console.error('Camera access error:', err);
    });
}

function setupDashboard() {
  if (!userProfiles[currentUser]) {
    userProfiles[currentUser] = { streak: 0, lastSubmit: null };
    userHistory[currentUser] = [];
    userWallets[currentUser] = { balance: 0 };
  }
  
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('dashboard').classList.remove('hidden');
  
  document.getElementById('user-greeting').textContent = `Welcome, ${currentUser}! 👋`;
  
  loadUserData();
  loadImagesFromBackend();
}

function loadUserData() {
  if (!currentUser) return;
  
  const userData = userProfiles[currentUser];
  updateProgressBar(userData.streak);
  updateBadges(userData.streak);
  updateWallet();
  displaySmileHistory();
}

function updateWallet() {
  if (!currentUser) return;
  const wallet = userWallets[currentUser];
  const balanceDisplay = document.getElementById('wallet-balance');
  if (balanceDisplay) {
    balanceDisplay.textContent = `${wallet.balance} USDC`;
  }
}

// -------- REALISTIC SMILE LOGIC (Simplified AI) ----------
function analyzeSmile() {
  // simulate facial landmark ratio logic
  // later replace with MediaPipe / face-api.js
  const ratio = Math.random() * 1.5; // placeholder for mouth ratio
  if (ratio > 1.0) return 5;
  if (ratio > 0.8) return 4;
  if (ratio > 0.6) return 3;
  return 2;
}

function getToday() {
  return new Date().toDateString();
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toDateString();
}

// Function to submit smile and update UI
function submitSmile(score) {
    if (!currentUser) {
      alert('Please login first');
      return;
    }
    
    // Check if already submitted today
    if (userProfiles[currentUser].lastSubmit === getToday()) {
      alert('You already submitted your smile today! Come back tomorrow.');
      return;
    }
    
    // Capture image before sending
    const imageData = captureImage();
    
    fetch('http://localhost:8080/api/smile/submit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ score: score, username: currentUser, imageData: imageData })
    })
    .then(response => response.json())
    .then(data => {
        const accepted = data.accepted;
        logSmileHistory(score, accepted);
        
        if (accepted) {
          alert(`Great! Genuine smile! You earned 5 USDC. Streak: ${userProfiles[currentUser].streak}`);\n          loadImagesFromBackend();
        } else {
          alert('Smile not genuine enough. Try again tomorrow!');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error submitting smile. Please try again.');
    });
}

function getToday() {
  return new Date().toDateString();
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toDateString();
}

function getLevel(streak) {
  if (streak >= 30) return ["Smile Legend 😎", "🏆 Gold"];
  if (streak >= 7) return ["Smiley Pro 😄", "🥇 Silver"];
  if (streak >= 3) return ["Getting Better 🙂", "🥉 Bronze"];
  return ["Beginner 🙂", "None"];
}

// Function to log smile history
function logSmileHistory(score, accepted) {
    if (!currentUser) return;
    
    if (!userHistory[currentUser]) {
      userHistory[currentUser] = [];
    }
    
    userHistory[currentUser].push({
      date: getToday(),
      score: score,
      accepted: accepted
    });
    
    if (accepted) {
      userProfiles[currentUser].lastSubmit = getToday();
      userProfiles[currentUser].streak++;
      userWallets[currentUser].balance += 5; // Add 5 USDC reward
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
    
    if (history.length === 0) {
      historyTable.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #999;">No smile history yet</td></tr>';
      return;
    }
    
    history.slice().reverse().forEach(entry => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${entry.date}</td>
        <td>${entry.score}/5</td>
        <td>${entry.accepted ? '✅ Accepted' : '❌ Rejected'}</td>
      `;
      historyTable.appendChild(row);
    });
}

// Function to update progress bar
function updateProgressBar(streak) {
    const progress = document.getElementById('progress');
    if (progress) {
      progress.style.width = `${Math.min(streak * 10, 100)}%`;
    }
}

function updateBadges(streak) {
    const level = getLevel(streak);
    const badgesDiv = document.getElementById('badges');
    const streakDisplay = document.getElementById('streak-display');
    
    if (streakDisplay) {
      streakDisplay.textContent = streak;
    }
    
    if (badgesDiv) {
      badgesDiv.innerHTML = `
        <div class="badge">${level[0]}</div>
        <div class="badge">${level[1]}</div>
      `;
    }
}

// Function to update cards
function updateCards(data) {
    const cardsContainer = document.getElementById('cards');
    if (cardsContainer) {
      cardsContainer.innerHTML = `
        <div class="card">
          <h3>${data.message}</h3>
          <p>Reward: ${data.reward}</p>
        </div>
      `;
    }
}

// Load images from backend\nfunction loadImagesFromBackend() {\n    if (!currentUser) return;\n    \n    fetch(`http://localhost:8080/api/smile/history/${currentUser}`)\n    .then(response => response.json())\n    .then(data => {\n        userImages[currentUser] = [];\n        data.forEach(smile => {\n            if (smile.imageData) {\n                userImages[currentUser].push({\n                    data: `data:image/jpeg;base64,${smile.imageData}`,\n                    date: smile.submissionDate,\n                    score: smile.score,\n                    accepted: smile.accepted\n                });\n            }\n        });\n        displayCapturedImages();\n    })\n    .catch(error => console.error('Error loading images:', error));\n}\n\nfunction captureSmile() {\n  if (!currentUser) {\n    alert('Please login first');\n    return;\n  }\n  \n  const score = analyzeSmile();\n  if (result) result.innerText = `Score: ${score}/5`;\n  \n  submitSmile(score);\n}

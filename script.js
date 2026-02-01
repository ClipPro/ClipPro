import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ===== FIREBASE ===== */
const firebaseConfig = {
  apiKey: "AIzaSyDpjR8...",
  authDomain: "komentarze-clipro.firebaseapp.com",
  projectId: "komentarze-clipro",
  storageBucket: "komentarze-clipro.firebasestorage.app",
  messagingSenderId: "1095372708623",
  appId: "1:1095372708623:web:16256fc2cb756fa7cffc7a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {

  /* ===== REGULAMIN ===== */
  const regModal = document.getElementById("reg-modal");
  const acceptBtn = document.getElementById("accept-reg");
  const exitBtn = document.getElementById("exit-reg");

  if (regModal) {
    regModal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  acceptBtn?.addEventListener("click", () => {
    regModal.style.display = "none";
    document.body.style.overflow = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  exitBtn?.addEventListener("click", e => {
    e.preventDefault();
    window.location.href = "about:blank";
  });

  /* ===== FILE UPLOAD ===== */
  const uploadBox = document.querySelector(".upload-box");
  const fileInput = uploadBox?.querySelector("input");
  const fileList = document.querySelector(".file-list");

  const renderFiles = () => {
    if (!fileInput || !fileList) return;
    fileList.innerHTML = "";
    [...fileInput.files].forEach((file, i) => {
      const item = document.createElement("div");
      item.className = "file-item";
      item.innerHTML = `<span>${file.name}</span><button type="button">✕</button>`;
      item.querySelector("button").onclick = () => {
        const dt = new DataTransfer();
        [...fileInput.files].forEach((f, idx) => idx !== i && dt.items.add(f));
        fileInput.files = dt.files;
        renderFiles();
      };
      fileList.appendChild(item);
    });
  };

  uploadBox?.addEventListener("dragover", e => {
    e.preventDefault();
    uploadBox.classList.add("dragover");
  });

  uploadBox?.addEventListener("dragleave", () => uploadBox.classList.remove("dragover"));

  uploadBox?.addEventListener("drop", e => {
    e.preventDefault();
    uploadBox.classList.remove("dragover");
    const dt = new DataTransfer();
    [...fileInput.files, ...e.dataTransfer.files].forEach(f => dt.items.add(f));
    fileInput.files = dt.files;
    renderFiles();
  });

  fileInput?.addEventListener("change", renderFiles);

  /* ===== DAILY SLOTS ===== */
  (function () {
    const today = new Date().toISOString().slice(0, 10);
    const savedDate = localStorage.getItem("clipro-slot-date");
    const slotEl = document.getElementById("daily-slots");
    if (!slotEl) return;

    if (savedDate !== today) {
      const slots = Math.floor(Math.random() * 4) + 2;
      localStorage.setItem("clipro-slots", slots);
      localStorage.setItem("clipro-slot-date", today);
      slotEl.textContent = slots;
    } else {
      slotEl.textContent = localStorage.getItem("clipro-slots");
    }
  })();

  /* ===== STAR RATING ===== */
  const stars = document.querySelectorAll(".star");
  const ratingInput = document.getElementById("rating-value");
  let currentRating = 5;

  stars.forEach(star => {
    star.addEventListener("click", () => {
      currentRating = star.dataset.value;
      ratingInput.value = currentRating;
      updateStars(currentRating);
    });
  });

  function updateStars(rating) {
    stars.forEach(star => {
      star.classList.toggle("active", star.dataset.value <= rating);
    });
  }

  updateStars(currentRating);

  /* ===== AVATAR PICKER ===== */
  const avatarOptions = document.querySelectorAll(".avatar-option");
  const customAvatarInput = document.getElementById("custom-avatar-input");
  let selectedAvatar = avatarOptions[0]?.dataset.avatar;
  let customAvatarDataUrl = null;

  avatarOptions.forEach(img => {
    img.addEventListener("click", () => {
      avatarOptions.forEach(a => a.classList.remove("selected"));
      img.classList.add("selected");
      selectedAvatar = img.dataset.avatar;
      customAvatarDataUrl = null;
    });
  });

  customAvatarInput?.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      customAvatarDataUrl = reader.result;
      avatarOptions.forEach(a => a.classList.remove("selected"));
      let previewImg = document.querySelector(".avatar-option.custom");
      if (!previewImg) {
        previewImg = document.createElement("img");
        previewImg.className = "avatar-option custom";
        document.querySelector(".avatar-picker").prepend(previewImg);
      }
      previewImg.src = customAvatarDataUrl;
      previewImg.classList.add("selected");
      selectedAvatar = null;
    };
    reader.readAsDataURL(file);
  });

  /* ===== KOMENTARZE — FIREBASE + SMOOTH SLIDER ===== */
  const reviewsTrack = document.getElementById("reviews-track");
  const prevBtn = document.getElementById("reviews-prev");
  const nextBtn = document.getElementById("reviews-next");
  const form = document.getElementById("comment-form");
  const notice = document.getElementById("comment-notice");

  let currentIndex = 0;
  const cardsPerView = 3;
  let totalCards = 0;
  let cardWidth = 0;

  async function loadComments() {
    if (!reviewsTrack) return;

    const q = query(collection(db, "uwagi"), where("status", "==", "approved"));
    const snap = await getDocs(q);
    const docs = [];
    snap.forEach(d => docs.push(d.data()));
    docs.sort((a, b) => b.createdAt - a.createdAt);

    reviewsTrack.innerHTML = "";

    docs.forEach(c => {
      const div = document.createElement("div");
      div.className = "testimonial";
      div.innerHTML = `
        <div class="testimonial-header">
          <img src="${c.avatar}" class="testimonial-avatar">
          <strong>${c.name}</strong>
        </div>
        <p>${c.text}</p>
        <span>${"★".repeat(c.rating)}${"☆".repeat(5 - c.rating)}</span>
      `;
      reviewsTrack.appendChild(div);
    });

    totalCards = reviewsTrack.children.length;
    requestAnimationFrame(calcSizes);
  }

  function calcSizes() {
    const card = reviewsTrack.children[0];
    if (!card) return;
    const gap = 20;
    cardWidth = card.offsetWidth + gap;
    updateSlider();
  }

  function updateSlider() {
    reviewsTrack.style.transform = `translate3d(-${currentIndex * cardWidth}px,0,0)`;
  }

  function next() {
    if (currentIndex < totalCards - cardsPerView) {
      currentIndex++;
      updateSlider();
    }
  }

  function prev() {
    if (currentIndex > 0) {
      currentIndex--;
      updateSlider();
    }
  }

  nextBtn?.addEventListener("click", next);
  prevBtn?.addEventListener("click", prev);

  window.addEventListener("resize", () => {
    currentIndex = 0;
    requestAnimationFrame(calcSizes);
  });

  loadComments();

  /* ===== FORM ===== */
  form?.addEventListener("submit", async e => {
    e.preventDefault();

    const name = form.name.value.trim();
    const text = form.comment.value.trim();
    const rating = Number(form.rating.value);
    if (!name || !text) return;

    const avatar = customAvatarDataUrl || selectedAvatar;

    await addDoc(collection(db, "uwagi"), {
      name,
      text,
      rating,
      avatar,
      status: "pending",
      createdAt: Date.now()
    });

    form.reset();
    updateStars(5);
    avatarOptions.forEach(a => a.classList.remove("selected"));
    avatarOptions[0]?.classList.add("selected");
    selectedAvatar = avatarOptions[0]?.dataset.avatar;
    customAvatarDataUrl = null;
    notice.style.display = "block";
    notice.scrollIntoView({ behavior: "smooth" });
  });

  /* ===== FOOTER YEAR ===== */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ===== SCROLL ANIMATIONS ===== */
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add("show");
    });
  }, { threshold: 0.15 });

  document.querySelectorAll("[data-animate]").forEach(el => observer.observe(el));
});

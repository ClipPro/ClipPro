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
    apiKey: "AIzaSyDpj6rJBUOC2ewZE2-h3zgJFKP2NFezCYY",
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

    /* ===== AVATAR PICKER (FIXED) ===== */
    const avatarOptions = document.querySelectorAll(".avatar-option");
    let selectedAvatar = "male.png";

    avatarOptions.forEach(img => {
        img.addEventListener("click", () => {
            avatarOptions.forEach(a => a.classList.remove("selected"));
            img.classList.add("selected");
            selectedAvatar = img.dataset.avatar === "female" ? "female.png" : "male.png";
        });
    });

    /* ===== KOMENTARZE — FIREBASE + SLIDER ===== */
    const reviewsTrack = document.getElementById("reviews-track");
    const prevBtn = document.getElementById("reviews-prev");
    const nextBtn = document.getElementById("reviews-next");
    const form = document.getElementById("comment-form");
    const notice = document.getElementById("comment-notice");

    let currentIndex = 0;
    let cardsPerView = 3;
    let totalCards = 0;

    function getCardsPerView() {
        return window.innerWidth <= 640 ? 1 : 3;
    }

    async function loadComments() {
        if (!reviewsTrack) return;

        const q = query(collection(db, "uwagi"), where("status", "==", "approved"));
        const snap = await getDocs(q);
        const docs = [];
        snap.forEach(d => docs.push(d.data()));
        docs.sort((a, b) => b.createdAt - a.createdAt);

        reviewsTrack.innerHTML = "";

        docs.forEach(c => {
            const gender = c.gender === "female" ? "female.png" : "male.png";

            const div = document.createElement("div");
            div.className = "testimonial";
            div.innerHTML = `
        <div class="testimonial-header">
          <img src="${gender}" class="testimonial-avatar">
          <strong>${c.name}</strong>
        </div>
        <p>${c.text}</p>
        <span>${"★".repeat(c.rating)}${"☆".repeat(5 - c.rating)}</span>
      `;
            reviewsTrack.appendChild(div);
        });

        totalCards = reviewsTrack.children.length;
        updateSlider();
    }

    function updateSlider() {
        cardsPerView = getCardsPerView();
        const card = reviewsTrack?.children[0];
        if (!card) return;

        const gap = 20;
        const cardWidth = card.offsetWidth + gap;
        reviewsTrack.style.transform = `translateX(-${currentIndex * cardWidth}px)`;
    }

    prevBtn?.addEventListener("click", () => {
        if (currentIndex > 0) {
            currentIndex--;
            updateSlider();
        }
    });

    nextBtn?.addEventListener("click", () => {
        if (currentIndex < totalCards - cardsPerView) {
            currentIndex++;
            updateSlider();
        }
    });

    window.addEventListener("resize", () => {
        currentIndex = 0;
        updateSlider();
    });

    loadComments();

    form?.addEventListener("submit", async e => {
        e.preventDefault();

        const name = form.name.value.trim();
        const text = form.comment.value.trim();
        const rating = Number(form.rating.value);
        if (!name || !text) return;

        const avatar = selectedAvatar;
        const gender = selectedAvatar === "female.png" ? "female" : "male";

        await addDoc(collection(db, "uwagi"), {
            name,
            text,
            rating,
            avatar,
            gender,
            status: "pending",
            createdAt: Date.now()
        });

        form.reset();
        updateStars(5);
        avatarOptions.forEach(a => a.classList.remove("selected"));
        avatarOptions[0]?.classList.add("selected");
        selectedAvatar = "male.png";
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
    }, { threshold: .15 });

    document.querySelectorAll("[data-animate]").forEach(el => observer.observe(el));
});

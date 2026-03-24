// ==========================================
// 1. FIREBASE KONFİGÜRASYONU 
// ==========================================
console.log("🚀 APP.JS BAŞLADI (Versiyon: CRITICAL DEBUG - v3)");

// KULLANICI KURULUMU YAPTIKTAN SONRA KENDİ AGI KEYLERİNİ BURAYA YAPIŞTIRACAK
const firebaseConfig = {
    apiKey: "AIzaSyBkUHjvOXfHyGFNZNgdMTPqzjEvLCKbh_8",
    authDomain: "gamedu-database.firebaseapp.com",
    databaseURL: "https://gamedu-database-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "gamedu-database",
    storageBucket: "gamedu-database.firebasestorage.app",
    messagingSenderId: "880063057821",
    appId: "1:880063057821:web:612406a29a6bc2d215e974"
};

// Config geçerli mi diye basit bir kontrol (User'ı engellememek için)
let isFirebaseInitialized = false;

if (firebaseConfig.apiKey !== "BURAYA_API_KEY_GELECEK") {
    firebase.initializeApp(firebaseConfig);
    isFirebaseInitialized = true;
    console.log("Firebase Başarıyla Başlatıldı!");
} else {
    console.warn("LÜTFEN FIREBASE_KURULUM_REHBERI.txt DOSYASINI OKUYARAK YUKARIDAKİ CONFIG AYARLARINI DOLDURUNUZ.");
    setTimeout(() => {
        showMessage("Lütfen 'app.js' dosyasının başındaki firebaseConfig ayarlarını kendi oluşturduğunuz projenin kodlarıyla doldurunuz.", "error");
    }, 1000);
}

// Uygulama Değişkenleri
let auth = isFirebaseInitialized ? firebase.auth() : null;
let database = isFirebaseInitialized ? firebase.database() : null;
let currentUser = null;

// Global Hata Yakalayıcı (Diagnostic için Eklendi)
window.onerror = function (message, source, lineno, colno, error) {
    if (message.includes("is not defined") || message.includes("Cannot read properties of null") || message.includes("is not a function")) {
        alert("CRITICAL JS ERROR DETECTED:\\n" + message + "\\nSatır: " + lineno + "\\nLütfen bu mesajı AI Asistanına iletin.");
    }
    return false; // Konsola da bassın
};

// ==========================================
// 2. DOM ELEMANLARI
// ==========================================
const authArea = document.getElementById('authArea');
const dashboardArea = document.getElementById('dashboardArea');
const messageBox = document.getElementById('messageBox');
const userEmailDisplay = document.getElementById('userEmailDisplay');

// Form Elementleri
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const setTypeSelect = document.getElementById('setTypeSelect');
const templateGuide = document.getElementById('templateGuide');
const setNameInput = document.getElementById('setNameInput');
const setDataInput = document.getElementById('setDataInput');
const isPublicCheck = document.getElementById('isPublicCheck');
const excelInputArea = document.getElementById('excelInputArea');
const manualInputArea = document.getElementById('manualInputArea');

// Butonlar
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const saveSetBtn = document.getElementById('saveSetBtn');
const createEmptySetBtn = document.getElementById('createEmptySetBtn');
const globalSetsList = document.getElementById('globalSetsList');
const tabExcelBtn = document.getElementById('tabExcelBtn');
const tabManualBtn = document.getElementById('tabManualBtn');

// CRUD Modal Elementleri
const crudModal = document.getElementById('crudModal');
const closeCrudModal = document.getElementById('closeCrudModal');
const crudTableHeadRow = document.getElementById('crudTableHeadRow');
const crudTableBody = document.getElementById('crudTableBody');
const crudModalTitle = document.getElementById('crudModalTitle');
const editSetTitleBtn = document.getElementById('editSetTitleBtn');
const crudTableSection = document.getElementById('crudTableSection');
const crudAddFormSection = document.getElementById('crudAddFormSection');
const showAddFormBtn = document.getElementById('showAddFormBtn');
const hideAddFormBtn = document.getElementById('hideAddFormBtn');

const crudAddNewItemBtn = document.getElementById('crudAddNewItemBtn');
const addRowBtn = document.getElementById('addRowBtn');
const deleteEntireSetBtn = document.getElementById('deleteEntireSetBtn');

// Ortak Tab Control Func (Yeni Tasarım)
window.switchDashboardTab = function (tabId) {
    const contents = document.querySelectorAll('.dash-tab-content');
    contents.forEach(content => content.style.display = 'none');

    const tabs = ['globalSetsTab', 'mySetsTab', 'createSetTab'];
    tabs.forEach(t => {
        let btn = document.getElementById('btnTab_' + t);
        if (btn) {
            btn.style.background = 'transparent';
            if (t === 'globalSetsTab') btn.style.border = '1px solid #8b5cf6';
            if (t === 'mySetsTab') btn.style.border = '1px solid #3b82f6';
            if (t === 'createSetTab') btn.style.border = '1px solid #10b981';
        }
    });

    const targetContent = document.getElementById(tabId);
    if (targetContent) targetContent.style.display = 'block';

    const targetBtn = document.getElementById('btnTab_' + tabId);
    if (targetBtn) {
        if (tabId === 'globalSetsTab') { targetBtn.style.background = '#8b5cf6'; targetBtn.style.color = '#fff'; }
        else if (tabId === 'mySetsTab') { targetBtn.style.background = '#3b82f6'; targetBtn.style.color = '#fff'; }
        else if (tabId === 'createSetTab') { targetBtn.style.background = '#10b981'; targetBtn.style.color = '#fff'; }
    }
};

// Kelime/Set Arama/Filtreleme Fonksiyonu (Çoklu Filtre Destekli)
window.filterSets = function (listId, inputId) {
    const listContainer = document.getElementById(listId);
    if (!listContainer) return;

    // Arama Çubuğu Metni
    const searchInput = document.getElementById(inputId);
    const filterText = searchInput ? searchInput.value.toLowerCase().trim() : "";

    // Filtre Dropdown'ları (Aynı Satırdaki select etiketleri)
    let gradeFilter = "";
    let classFilter = "";
    let lessonFilter = "";

    // Tab Id'sine göre hangi dropdown'u okuyacağımızı seçiyoruz
    if (listId === 'globalSetsList') {
        const gSelect = document.getElementById('globalFilterGrade');
        const cSelect = document.getElementById('globalFilterClass');
        const lSelect = document.getElementById('globalFilterLesson');
        if (gSelect) gradeFilter = gSelect.value.toLowerCase().trim();
        if (cSelect) classFilter = cSelect.value.toLowerCase().trim();
        if (lSelect) lessonFilter = lSelect.value.toLowerCase().trim();
    } else if (listId === 'mySetsList') {
        const mSelect = document.getElementById('mySetsFilterGrade');
        const mSelectC = document.getElementById('mySetsFilterClass');
        const mSelectL = document.getElementById('mySetsFilterLesson');
        if (mSelect) gradeFilter = mSelect.value.toLowerCase().trim();
        if (mSelectC) classFilter = mSelectC.value.toLowerCase().trim();
        if (mSelectL) lessonFilter = mSelectL.value.toLowerCase().trim();
    }

    const cards = listContainer.getElementsByClassName('set-card');

    for (let i = 0; i < cards.length; i++) {
        let card = cards[i];

        // Data Attributeları varsa oradan okuruz, yoksa boş sayarız
        let cardGrade = (card.getAttribute('data-grade') || "").toLowerCase();
        let cardClass = (card.getAttribute('data-class') || "").toLowerCase();
        let cardLesson = (card.getAttribute('data-lesson') || "").toLowerCase();
        let cardText = (card.innerText || card.textContent || "").toLowerCase();

        // 4 Şartın aynı anda tutması lazım (Süzgeçleme Mantığı)
        let matchesText = filterText === "" || cardText.indexOf(filterText) > -1;
        let matchesGrade = gradeFilter === "" || cardGrade === gradeFilter;
        let matchesClass = classFilter === "" || cardClass === classFilter;
        let matchesLesson = lessonFilter === "" || cardLesson === lessonFilter;

        if (matchesText && matchesGrade && matchesClass && matchesLesson) {
            card.style.display = "";
        } else {
            card.style.display = "none";
        }
    }
};

// Orijinal Özel Uyarı Tanımlama Yönlendirmesi (Kullanıcı İstemi - GEMINI.md Kural 16 uyarınca)
// showOzelAlert fonksiyonu index seviyesinde var olmalı, yoksa basit alert/confirm düş.
if (typeof showOzelAlert !== 'function') {
    window.showOzelAlert = function (msg, type, callback, defaultValue = "") {
        if (type === 'evethayir') {
            if (callback) callback(confirm(msg));
        } else if (type === 'prompt') {
            if (callback) callback(prompt(msg, defaultValue));
        } else {
            alert(msg);
            if (callback) callback(true);
        }
    };
}

let currentSetId = null;
let currentSetData = null;

// ==========================================
// 3. YARDIMCI FONKSİYONLAR
// ==========================================
function showMessage(text, type = "success") {
    if (typeof showOzelAlert === 'function') {
        showOzelAlert(text, type === "error" ? "hata" : "tamam");
    } else {
        messageBox.textContent = text;
        messageBox.className = "alert " + (type === "error" ? "alert-error" : "alert-success");
        messageBox.classList.remove('hidden');
        setTimeout(() => { messageBox.classList.add('hidden'); }, 4000);
    }
}

function updateUI() {
    const welcomeHero = document.getElementById('welcomeHero');
    const gamesListArea = document.getElementById('gamesListArea');
    const authOverlay = document.getElementById('authOverlay');
    const navTeacherBtn = document.getElementById('navTeacherBtn');

    if (currentUser) {
        if (authOverlay) authOverlay.classList.remove('active');
        if (userEmailDisplay) userEmailDisplay.textContent = currentUser.email;

        const userShortName = document.getElementById('userShortName');
        const modalProfileShortName = document.getElementById('modalProfileShortName');
        const modalUserEmail = document.getElementById('modalUserEmail');
        const profileNicknameInput = document.getElementById('profileNicknameInput');

        if (modalUserEmail) modalUserEmail.textContent = currentUser.email;
        
        // Baş harf ikonlarını güncelle
        let initial = currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : (currentUser.email ? currentUser.email.charAt(0).toUpperCase() : '?');
        if (userShortName) userShortName.textContent = initial;
        if (modalProfileShortName) modalProfileShortName.textContent = initial;

        const nicknameDisplay = document.getElementById('currentNicknameDisplay');
        if (nicknameDisplay) nicknameDisplay.textContent = currentUser.displayName || 'İsim Belirtilmemiş';

        if (profileNicknameInput) {
            profileNicknameInput.value = currentUser.displayName || '';
        }
        
        // Modal her açıldığında düzenleme modunu kapat
        toggleNicknameEditMode(false);

        // Dashboard modundaysak Navbar'ı gizle
        const dashboardArea = document.getElementById('dashboardArea');
        const navbar = document.querySelector('.navbar');
        const trigger = document.getElementById('navbarTriggerArea');
        
        if (dashboardArea && dashboardArea.style.display !== 'none') {
            if (navbar) navbar.classList.add('hidden-dashboard');
            if (trigger) trigger.style.display = 'block';
        } else {
            if (navbar) navbar.classList.remove('hidden-dashboard');
            if (trigger) trigger.style.display = 'none';
        }

        // Yönetim Paneli Metnine Dönüştür
        if (navTeacherBtn) {
            navTeacherBtn.textContent = 'Yönetim Paneli';
            navTeacherBtn.style.background = '#8b5cf6';
        }

        if (typeof updateTemplateUI === 'function') updateTemplateUI();
        if (typeof loadMySets === 'function') loadMySets();
        if (typeof loadGlobalSets === 'function') loadGlobalSets();

    } else {
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';

        // Öğretmen Girişi Metnine Geri Döndür
        if (navTeacherBtn) {
            navTeacherBtn.textContent = 'Öğretmen Girişi';
            navTeacherBtn.style.background = '#3b82f6';
        }

        // Çıkış yapıldığında mutlaka lobiye dön (güvenlik ve UI akışı için)
        if (typeof window.goToLobby === 'function') {
            window.goToLobby();
        }
    }
}

// Profil Modalı Kontrolü
window.toggleProfileModal = function() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        if (modal.classList.contains('active')) {
            modal.classList.remove('active');
        } else {
            modal.classList.add('active');
        }
    }
};



window.toggleNicknameEditMode = function(isEdit) {
    const displayArea = document.getElementById('nicknameDisplayArea');
    const editArea = document.getElementById('nicknameEditArea');
    if (displayArea && editArea) {
        displayArea.style.display = isEdit ? 'none' : 'flex';
        editArea.style.display = isEdit ? 'flex' : 'none';
        
        if (isEdit) {
            const input = document.getElementById('profileNicknameInput');
            if (input) input.focus();
        }
    }
};

window.updateProfileNickname = function() {
    const input = document.getElementById('profileNicknameInput');
    if (!input || !currentUser || !isFirebaseInitialized) return;

    const newName = input.value.trim();
    if (!newName) return showMessage("Lütfen geçerli bir isim girin.", "error");

    // 1. Firebase Auth Profilini Güncelle
    currentUser.updateProfile({
        displayName: newName
    }).then(() => {
        // Auth nesnesini tazeleyelim ki displayName anında yansısın
        auth.currentUser.reload().then(() => {
            currentUser = auth.currentUser;
            if (typeof updateUI === 'function') updateUI(); 
            if (typeof toggleNicknameEditMode === 'function') toggleNicknameEditMode(false); 
            
            showOzelAlert("Profil bilgileriniz başarıyla güncellendi.", "tamam");
        }).catch(e => {
            console.error("Reload error:", e);
            showOzelAlert("İsim güncellendi ancak görsel yenilenemedi: " + e.message, "hata");
        });
    }).catch(err => {
        showOzelAlert("Hata: " + err.message, "hata");
    });
};

// Global scope'a ekliyoruz ki HTML'deki onclick erişebilsin
window.handleNavTeacherBtn = function () {
    // Önce tüm oyun alanlarını kapat
    const gameAreas = ['gameArea', 'lingoGameArea', 'beeCombGameArea', 'dictionaryGameArea', 'baambooGameArea', 'quickRevealGameArea', 'triviaGameArea', 'setupArea'];
    gameAreas.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    if (currentUser) {
        // Zaten giriş yapmışsa, Lobi ekranından panele dönmeyi sağlar
        const dashboardArea = document.getElementById('dashboardArea');
        if (dashboardArea) {
            dashboardArea.classList.remove('hidden-spa-module');
            dashboardArea.style.display = 'block';
        }

        const welcomeHero = document.getElementById('welcomeHero');
        if (welcomeHero) welcomeHero.style.display = 'none';

        const gamesListArea = document.getElementById('gamesListArea');
        if (gamesListArea) gamesListArea.style.display = 'none';

        // Eğer setup vs açıksa kapat
        document.querySelectorAll('.hidden-spa-module').forEach(el => {
            if (el.id !== 'dashboardArea') el.style.display = 'none';
        });
    } else {
        // Giriş yapmamışsa modalı açar
        const authOverlay = document.getElementById('authOverlay');
        if (authOverlay) authOverlay.classList.add('active');
    }
};

window.goToLobby = function () {
    // Tüm gizlenmesi gereken component id'leri
    const areasToHide = ['dashboardArea', 'setupArea', 'gameArea', 'lingoGameArea', 'beeCombGameArea', 'dictionaryGameArea', 'baambooGameArea', 'quickRevealGameArea', 'triviaGameArea'];
    areasToHide.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'none';
            // CSS'deki !important ezilmesi sebebiyle inline style yetmez classList gerekebilir
            if (id === 'dashboardArea' || id === 'setupArea') {
                el.classList.add('hidden-spa-module');
            }
        }
    });

    // Lobi ekranlarını tekrar göster
    const welcomeHero = document.getElementById('welcomeHero');
    const gamesListArea = document.getElementById('gamesListArea');
    if (welcomeHero) welcomeHero.style.display = 'block';
    if (gamesListArea) gamesListArea.style.display = '';
};

// Sekme (Tab) Geçişleri: Excel vs Manuel
if (tabExcelBtn && tabManualBtn) {
    tabExcelBtn.addEventListener('click', () => {
        excelInputArea.style.display = 'block';
        manualInputArea.style.display = 'none';
        tabExcelBtn.style.backgroundColor = '#3b82f6';
        tabExcelBtn.style.color = '#fff';
        tabManualBtn.style.backgroundColor = '#e5e7eb';
        tabManualBtn.style.color = '#374151';
    });

    tabManualBtn.addEventListener('click', () => {
        excelInputArea.style.display = 'none';
        manualInputArea.style.display = 'block';
        tabManualBtn.style.backgroundColor = '#8b5cf6';
        tabManualBtn.style.color = '#fff';
        tabExcelBtn.style.backgroundColor = '#e5e7eb';
        tabExcelBtn.style.color = '#374151';
    });
}

// Şablon Bilgilendirmesi UI Değişimi
function updateTemplateUI() {
    if (!setTypeSelect || !templateGuide) return;
    const isQPool = setTypeSelect.value === 'qpool';
    const subTypeSelect = document.getElementById('setSubTypeSelect');
    const questionTypePreference = document.getElementById('questionTypePreference');

    if (isQPool) {
        if (questionTypePreference) questionTypePreference.style.display = 'block';
        const isAcikUclu = subTypeSelect && subTypeSelect.value === 'acik_uclu';

        if (isAcikUclu) {
            templateGuide.innerHTML = `
                <strong>Açık Uçlu Soru Seti Excel Sütun Sırası (5 Sütun):</strong><br>
                <span style="color:#ce3131; font-size:11px;">Not: Kırmızı yazılı başlıkların doldurulması ZORUNLUDUR!</span><br>
                <code><span style="color:#ce3131;">Soru No</span> | <span style="color:#ce3131;">Soru Metni</span> | İpucu | <span style="color:#ce3131;">Doğru Cevap</span> | Resim URL</code>
                <p style="font-size:11px; margin-top:5px; color:#6b7280;">* İpucu kısmına metin veya doğrudan bir görsel linki (http...jpg/png) girebilirsiniz. Görsel linki girerseniz oyunlarda tıklanabilir resim olarak görünür.</p>
            `;
        } else {
            templateGuide.innerHTML = `
                <strong>Çoktan Seçmeli Soru Seti Excel Sütun Sırası (10 Sütun):</strong><br>
                <span style="color:#ce3131; font-size:11px;">Not: Kırmızı yazılı başlıkların doldurulması ZORUNLUDUR!</span><br>
                <code><span style="color:#ce3131;">Soru No</span> | <span style="color:#ce3131;">Soru Metni</span> | İpucu | <span style="color:#ce3131;">A</span> | <span style="color:#ce3131;">B</span> | <span style="color:#ce3131;">C</span> | <span style="color:#ce3131;">D</span> | E | <span style="color:#ce3131;">Doğru Cevap</span> | Resim URL</code>
                <p style="font-size:11px; margin-top:5px; color:#6b7280;">* İpucu kısmına metin veya doğrudan bir görsel linki (http...jpg/png) girebilirsiniz. Görsel linki girerseniz oyunlarda tıklanabilir resim olarak görünür.</p>
            `;
        }
    } else {
        if (questionTypePreference) questionTypePreference.style.display = 'none';
        templateGuide.innerHTML = `
            <strong>Kelime Seti (WordsPool) Excel Sütun Sırası (5 Sütun):</strong><br>
            <span style="color:#ce3131; font-size:11px;">Not: Kırmızı yazılı başlıkların doldurulması ZORUNLUDUR!</span><br>
            <code><span style="color:#ce3131;">Kelime</span> | İpucu | Türkçe Anlam | İngilizce Anlam | Resim URL</code>
            <p style="font-size:11px; margin-top:5px; color:#6b7280;">* İpucu kısmına metin veya doğrudan bir görsel linki (http...jpg/png) girebilirsiniz. Görsel linki girerseniz oyunlarda tıklanabilir resim olarak görünür.</p>
        `;
    }
}


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

        const adminMigrateBtn = document.getElementById('adminMigrateBtn');
        if (adminMigrateBtn) {
            if (currentUser.email === 'aahmetaytekin@gmail.com') {
                adminMigrateBtn.style.display = 'inline-block';
            } else {
                adminMigrateBtn.style.display = 'none';
            }
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

// Global scope'a ekliyoruz ki HTML'deki onclick erişebilsin
window.handleNavTeacherBtn = function () {
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
    const areasToHide = ['dashboardArea', 'setupArea', 'gameArea', 'lingoGameArea', 'beeCombGameArea', 'dictionaryGameArea', 'baambooGameArea', 'quickRevealGameArea'];
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
                <code><span style="color:#ce3131;">Soru No</span> | Resim URL | <span style="color:#ce3131;">Soru Metni</span> | İpucu | <span style="color:#ce3131;">Doğru Cevap</span></code>
                <p style="font-size:11px; margin-top:5px; color:#6b7280;">* İpucu kısmına metin veya doğrudan bir görsel linki (http...jpg/png) girebilirsiniz. Görsel linki girerseniz oyunlarda tıklanabilir resim olarak görünür.</p>
            `;
        } else {
            templateGuide.innerHTML = `
                <strong>Çoktan Seçmeli Soru Seti Excel Sütun Sırası (10 Sütun):</strong><br>
                <span style="color:#ce3131; font-size:11px;">Not: Kırmızı yazılı başlıkların doldurulması ZORUNLUDUR!</span><br>
                <code><span style="color:#ce3131;">Soru No</span> | Resim URL | <span style="color:#ce3131;">Soru Metni</span> | İpucu | <span style="color:#ce3131;">A Şıkkı</span> | <span style="color:#ce3131;">B Şıkkı</span> | <span style="color:#ce3131;">C Şıkkı</span> | <span style="color:#ce3131;">D Şıkkı</span> | E Şıkkı | <span style="color:#ce3131;">Doğru Cevap</span></code>
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

// ==========================================
// 4. AUTHENTICATION (KAYIT & GİRİŞ) İŞLEMLERİ
// ==========================================
if (isFirebaseInitialized) {
    // Auth Durumu Dinleyicisi (Kullanıcı sekme kapatıp açsa da giriş yapmış sayılır)
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            updateUI();
        } else {
            currentUser = null;
            updateUI();
        }
    });

    // Kayıt Ol
    registerBtn.addEventListener('click', () => {
        const usernameInput = document.getElementById('usernameInput');
        const username = usernameInput ? usernameInput.value.trim() : "";
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password || !username) {
            if (typeof showOzelAlert === 'function') {
                showOzelAlert("Lütfen Kullanıcı Adı, E-posta ve şifre girin.", "tamam");
            } else {
                showMessage("Lütfen Kullanıcı Adı, E-posta ve şifre girin.", "error");
            }
            return;
        }

        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                return userCredential.user.updateProfile({
                    displayName: username
                }).then(() => {
                    if (typeof showOzelAlert === 'function') {
                        showOzelAlert("Kayıt başarılı! Öğretmen Paneline yönlendiriliyorsunuz.", "tamam", () => {
                            if (window.handleNavTeacherBtn) window.handleNavTeacherBtn();
                        });
                    } else {
                        showMessage("Kayıt başarılı! Öğretmen Paneline yönlendiriliyorsunuz.");
                        if (window.handleNavTeacherBtn) window.handleNavTeacherBtn();
                    }
                });
            })
            .catch((error) => {
                if (typeof showOzelAlert === 'function') {
                    showOzelAlert("Kayıt Hatası: " + error.message, "tamam");
                } else {
                    showMessage("Kayıt Hatası: " + error.message, "error");
                }
            });
    });

    // Giriş Yap
    loginBtn.addEventListener('click', () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        if (!email || !password) return showMessage("Lütfen E-posta ve şifre girin.", "error");

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                showMessage("Giriş başarılı!");
                if (window.handleNavTeacherBtn) window.handleNavTeacherBtn();
            })
            .catch((error) => {
                showMessage("Giriş Hatası: Bilgilerinizi kontrol ediniz.", "error");
            });
    });

    // Şifremi Unuttum
    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();
            if (!email) {
                if (typeof showOzelAlert === 'function') {
                    showOzelAlert("Lütfen şifre sıfırlama bağlantısı göndermek için E-posta adresinizi girin.", "tamam");
                } else {
                    showMessage("Lütfen şifre sıfırlama bağlantısı göndermek için E-posta adresinizi girin.", "error");
                }
                return;
            }

            auth.sendPasswordResetEmail(email)
                .then(() => {
                    if (typeof showOzelAlert === 'function') {
                        showOzelAlert("Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin.", "tamam");
                    } else {
                        showMessage("Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.", "success");
                    }
                })
                .catch((error) => {
                    if (typeof showOzelAlert === 'function') {
                        showOzelAlert("Hata: " + error.message, "tamam");
                    } else {
                        showMessage("Hata: " + error.message, "error");
                    }
                });
        });
    }

    // Çıkış Yap
    logoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => {
            showMessage("Güvenli bir şekilde çıkış yapıldı.");
        });
    });

    // Admin Migration İşlemleri
    const adminMigrateBtn = document.getElementById('adminMigrateBtn');
    const migrationModal = document.getElementById('migrationModal');
    const migStartBtn = document.getElementById('migStartBtn');

    if (adminMigrateBtn && migrationModal) {
        adminMigrateBtn.addEventListener('click', () => {
            migrationModal.style.display = 'flex';
            document.getElementById('migLog').innerHTML = '';
            document.getElementById('migData').value = '';
        });

        if (migStartBtn) {
            migStartBtn.addEventListener('click', () => {
                const migType = document.getElementById('migType').value;
                const migData = document.getElementById('migData').value.trim();
                const logEl = document.getElementById('migLog');

                if (!migData) {
                    if (typeof showOzelAlert === 'function') showOzelAlert("Veri alanı boş!", "tamam");
                    return;
                }

                logEl.innerHTML += `<br>> Aktarım işlemi başlatıldı (${migType})...`;

                let baseType = migType === 'wordspool' ? 'wordspool' : 'qpool';
                let subType = 'coktan_secmeli';
                if (migType === 'qpool_klasik') subType = 'acik_uclu';

                const parseResult = parseHibritData(migData, baseType, subType);

                if (parseResult.errors.length > 0) {
                    logEl.innerHTML += `<br>> <span style="color:#ef4444;">PARSE HATALARI BULUNDU (${parseResult.errors.length} adet). Hatalı satırlar atlanacak.</span>`;
                }

                const dataList = parseResult.data;
                if (dataList.length === 0) {
                    logEl.innerHTML += `<br>> <span style="color:#ef4444;">Elde edilen geçerli veri yok. İşlem iptal edildi.</span>`;
                    return;
                }

                logEl.innerHTML += `<br>> ${dataList.length} adet satır okundu. Gruplama yapılıyor...`;

                // Kademe - Ders gruplaması
                let groups = {};
                dataList.forEach(item => {
                    let groupLvl = item.Level ? item.Level.toUpperCase() : 'Diğer';
                    let groupLes = item.Lesson ? item.Lesson : 'Genel';
                    let key = `${groupLvl} - ${groupLes}`;
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(item);
                });

                logEl.innerHTML += `<br>> Toplam ${Object.keys(groups).length} farklı Kademe-Ders tespit edildi. Firebase'e yazılıyor...`;

                let promises = [];
                Object.keys(groups).forEach(groupKey => {
                    const setArray = groups[groupKey];
                    const title = `GamEdu: ${groupKey}`;

                    const newSetRef = database.ref('MasterPool').push();
                    const setData = {
                        Author_ID: currentUser.uid,
                        Author_Email: currentUser.email,
                        Author_DisplayName: 'GamEdu',
                        Title: title,
                        Type: baseType,
                        SubType: subType,
                        IsPublic: true,
                        ItemCount: setArray.length,
                        CreatedAt: firebase.database.ServerValue.TIMESTAMP,
                        Data: setArray
                    };

                    promises.push(newSetRef.set(setData));
                });

                Promise.all(promises).then(() => {
                    logEl.innerHTML += `<br>> <span style="color:#10b981;">Tüm gruplar GamEdu Global veritabanına aktarıldı!</span>`;
                    showMessage("Aktarım Başarılı!", "success");
                    if (typeof loadGlobalSets === 'function') loadGlobalSets();
                    if (typeof loadMySets === 'function') loadMySets();
                }).catch(err => {
                    logEl.innerHTML += `<br>> <span style="color:#ef4444;">HATA: ${err.message}</span>`;
                });
            });
        }
    }
}

// ==========================================
// 5. MASTERPOOL VERİTABANI İŞLEMLERİ (KAYDET VE OKU)
// ==========================================

// EXCEL/TSV FORMATINDAKİ VERİYİ JSON'A ÇEVİRME ALGORİTMASI
function parseHibritData(rawData, setType, subType = 'coktan_secmeli', globalLevel = '', globalClass = '', globalLesson = '', globalTopic = '') {
    const lines = rawData.split('\n');
    let parsedArray = [];
    let errors = [];
    const isAcikUclu = (setType === 'qpool' && subType === 'acik_uclu');

    lines.forEach((line, index) => {
        let rowNum = index + 1; // Satır numarası
        if (line.trim() !== "") {
            const parts = line.split('\t');

            if (setType === 'qpool') {
                if (parts.length >= 1) { // Adjusted to 1 because 'Sınıf' is removed from row
                    let s_no = parts[0] ? parts[0].trim() : "";
                    let img_url = parts[1] ? parts[1].trim() : "";
                    let s_text = parts[2] ? parts[2].trim() : "";
                    let clue = parts[3] ? parts[3].trim() : "";

                    let optA = "", optB = "", optC = "", optD = "", optE = "", correctAns = "";

                    if (isAcikUclu) {
                        correctAns = parts[4] ? parts[4].trim() : (parts[parts.length - 1] ? parts[parts.length - 1].trim() : "");
                    } else {
                        optA = parts[4] ? parts[4].trim() : "";
                        optB = parts[5] ? parts[5].trim() : "";
                        optC = parts[6] ? parts[6].trim() : "";
                        optD = parts[7] ? parts[7].trim() : "";
                        optE = parts[8] ? parts[8].trim() : "";
                        correctAns = parts[9] ? parts[9].trim() : (parts[parts.length - 1] ? parts[parts.length - 1].trim() : "");
                    }

                    // Zorunlu alan validasyonları
                    if (!globalLevel) errors.push(`Satır ${rowNum}: 'Set Kademesi' genel formdan seçilmemiş!`);
                    if (!globalClass) errors.push(`Satır ${rowNum}: 'Sınıf' genel formdan seçilmemiş!`);
                    if (!globalLesson) errors.push(`Satır ${rowNum}: 'Ders' genel formdan girilmemiş!`);
                    if (!globalTopic) errors.push(`Satır ${rowNum}: 'Konu' genel formdan girilmemiş!`);
                    if (!s_no) errors.push(`Satır ${rowNum}: 'Soru Numarası' eksik!`);
                    if (!s_text && !img_url) errors.push(`Satır ${rowNum}: 'Soru Metni' veya Resim eksik!`);

                    if (!isAcikUclu) {
                        if (!optA || !optB || !optC || !optD) {
                            errors.push(`Satır ${rowNum}: En az 4 şık (A, B, C, D) bulunmalıdır!`);
                        }
                        if (globalLevel === 'LİSE' || globalLevel.includes('Lise')) {
                            if (!optE) errors.push(`Satır ${rowNum}: Kademe Lise olduğu için 5. şık (E) zorunludur!`);
                        }
                    }

                    if (!correctAns) errors.push(`Satır ${rowNum}: 'Doğru Cevap' girilmemiş!`);

                    parsedArray.push({
                        Level: globalLevel,
                        Grade: globalLevel, // Yedek/Eski sistem uyumu
                        ClassGrade: globalClass,
                        Lesson: globalLesson,
                        Topic: globalTopic,
                        Unit: globalTopic, // Yedek/Eski sistem uyumu
                        QNumber: s_no,
                        ImgURL: img_url,
                        QuestionText: s_text,
                        Clue: clue,
                        OptionA: optA, OptionB: optB, OptionC: optC, OptionD: optD, OptionE: optE,
                        CorrectAnswer: correctAns
                    });
                }
            } else {
                // WordsPool
                if (parts.length >= 1) {
                    let w_word = parts[0] ? parts[0].trim() : "";

                    if (!globalLevel) errors.push(`Satır ${rowNum}: 'Set Kademesi' formdan seçilmemiş!`);
                    if (!globalClass) errors.push(`Satır ${rowNum}: 'Sınıf' formdan seçilmemiş!`);
                    if (!globalLesson) errors.push(`Satır ${rowNum}: 'Ders' formdan girilmemiş!`);
                    if (!globalTopic) errors.push(`Satır ${rowNum}: 'Ünite' formdan girilmemiş!`);
                    if (!w_word) errors.push(`Satır ${rowNum}: 'Kelime' boş bırakılamaz!`);

                    parsedArray.push({
                        Level: globalLevel,
                        Grade: globalLevel, // Yedek
                        ClassGrade: globalClass,
                        Lesson: globalLesson,
                        Unit: globalTopic,
                        Topic: globalTopic, // Dashboard Topic beklediği için ikisini de yazıyoruz
                        Word: w_word,
                        Clue: parts.length > 1 ? (parts[1] ? parts[1].trim() : "") : "",
                        MeaningTR: parts.length > 2 ? (parts[2] ? parts[2].trim() : "") : "",
                        MeaningEN: parts.length > 3 ? (parts[3] ? parts[3].trim() : "") : "",
                        ImgURL: parts.length > 4 ? (parts[4] ? parts[4].trim() : "") : ""
                    });
                }
            }
        }
    });

    return { data: parsedArray, errors: errors };
}

if (isFirebaseInitialized) {
    // Set Kaydetme (MasterPool'a Gönder)
    if (saveSetBtn) {
        saveSetBtn.addEventListener('click', () => {
            const type = setTypeSelect ? setTypeSelect.value : 'wordspool';
            const subTypeSelect = document.getElementById('setSubTypeSelect');
            const subType = subTypeSelect ? subTypeSelect.value : 'coktan_secmeli';
            const title = setNameInput ? setNameInput.value.trim() : '';
            const gLevel = document.getElementById('setKademeSelect') ? document.getElementById('setKademeSelect').value : 'Ortaokul';
            const gClass = document.getElementById('setClassGradeSelect') ? document.getElementById('setClassGradeSelect').value : '';
            const gLesson = document.getElementById('setLessonInput') ? document.getElementById('setLessonInput').value.trim() : '';
            const gTopic = document.getElementById('setTopicInput') ? document.getElementById('setTopicInput').value.trim() : '';
            const rawData = setDataInput ? setDataInput.value.trim() : '';
            const isPublic = isPublicCheck ? isPublicCheck.checked : true;

            if (!title || !rawData || !gLesson || !gTopic || !gClass) return showMessage("Lütfen Set Adı, Sınıf, Ders, Konu alanlarını girin ve Excel verilerini kutuya yapıştırın.", "error");

            const parseResult = parseHibritData(rawData, type, subType, gLevel, gClass, gLesson, gTopic);

            if (parseResult.errors.length > 0) {
                let limitErrors = parseResult.errors.slice(0, 3).join("<br>");
                if (parseResult.errors.length > 3) limitErrors += `<br>...ve ${parseResult.errors.length - 3} hata daha.`;
                return showMessage(`SÜTUN HATALARI BULUNDU:<br><br><span style="color:#d32f2f; font-size:13px;">${limitErrors}</span>`, "error");
            }

            if (parseResult.data.length === 0) {
                return showMessage("Kutuya girdiğiniz veriler ayrıştırılamadı. Sütunların eksiksiz olduğundan emin olun.", "error");
            }

            // Firebase Realtime DB Referansı
            const newSetRef = database.ref('MasterPool').push();

            const setData = {
                Author_ID: currentUser.uid,
                Author_Email: currentUser.email,
                Title: title,
                Type: type, // wordspool mu qpool mu?
                SubType: subType, // coktan_secmeli mi acik_uclu mu?
                IsPublic: isPublic,
                GlobalLevel: gLevel,
                GlobalClass: gClass,
                GlobalLesson: gLesson,
                GlobalTopic: gTopic,
                ItemCount: parseResult.data.length,
                CreatedAt: firebase.database.ServerValue.TIMESTAMP,
                Data: parseResult.data
            };

            // Veritabanına yaz
            newSetRef.set(setData)
                .then(() => {
                    showMessage(`Başarılı! '${title}' setinize toplam ${parseResult.data.length} eleman yüklendi.`, "success");
                    if (setNameInput) setNameInput.value = '';
                    if (setDataInput) setDataInput.value = '';
                    loadMySets(); // Listeyi güncelle
                })
                .catch((error) => {
                    showMessage("Veritabanına yazılırken hata oluştu: " + error.message, "error");
                });
        });
    }

    // Sıfırdan Boş Set Oluştur (SADECE MODALI AÇ)
    if (createEmptySetBtn) {
        createEmptySetBtn.addEventListener('click', () => {
            console.log("createEmptySetBtn tıklandı!");
            try {
                const type = setTypeSelect ? setTypeSelect.value : 'wordspool';
                const subTypeSelect = document.getElementById('setSubTypeSelect');
                const subType = subTypeSelect ? subTypeSelect.value : 'coktan_secmeli';
                const title = setNameInput ? setNameInput.value.trim() : '';
                const isPublic = isPublicCheck ? isPublicCheck.checked : true;
                const gLevel = document.getElementById('setKademeSelect') ? document.getElementById('setKademeSelect').value : 'Tümü';
                const gClass = document.getElementById('setClassGradeSelect') ? document.getElementById('setClassGradeSelect').value : 'Tümü';
                const gLesson = document.getElementById('setLessonInput') ? document.getElementById('setLessonInput').value.trim() : '';
                const gTopic = document.getElementById('setTopicInput') ? document.getElementById('setTopicInput').value.trim() : '';

                if (!title || !gLesson || !gTopic) return showMessage("Lütfen yeni setiniz için Set Adı, Ders ve Konu bilgilerini eksiksiz girin.", "error");

                if (setNameInput) setNameInput.value = ''; // Modala geçerken arkadaki kutuyu boşaltalım

                console.log("Modal çağrılıyor: openCrudModalForNewSet(", title, type, subType, isPublic, gLevel, gClass, gLesson, gTopic, ")");
                // Veritabanına yazmak yerine doğrudan "Yeni Satır Ekleme" Modalı açılır
                window.openCrudModalForNewSet(title, type, subType, isPublic, gLevel, gClass, gLesson, gTopic);
            } catch (err) {
                alert("Buton tıklamasında (createEmptySet) hata: " + err.message);
                console.error(err);
            }
        });
    }
}

// ==========================================
// 6. BENİM SETLERİMİ GETİRME EKRANI
// ==========================================
function loadMySets() {
    if (!isFirebaseInitialized || !currentUser) return;

    const mySetsContainer = document.getElementById('mySetsList');
    mySetsContainer.innerHTML = '<p>Yükleniyor...</p>';

    // MasterPool tablosundan sadece Author_ID'si benim olanları çek
    const poolRef = database.ref('MasterPool').orderByChild('Author_ID').equalTo(currentUser.uid);

    // once('value') ile bir kere çağır.
    poolRef.once('value')
        .then((snapshot) => {
            if (!snapshot.exists()) {
                mySetsContainer.innerHTML = '<p style="color: #999; text-align: center; font-style: italic;">Henüz kayıtlı bir setiniz bulunmuyor...</p>';
                const badge = document.getElementById('mySetsBadge');
                if (badge) badge.textContent = '0';
                return;
            }

            mySetsContainer.innerHTML = ''; // Temizle

            const badge = document.getElementById('mySetsBadge');
            if (badge) badge.textContent = snapshot.numChildren();

            snapshot.forEach((childSnapshot) => {
                const setKey = childSnapshot.key;
                const setVal = childSnapshot.val();

                const card = document.createElement('div');
                card.className = 'set-card';

                let isQPool = setVal.Type === 'qpool';
                let sampleData = setVal.Data && setVal.Data[0] ? (isQPool ? setVal.Data[0].QuestionText : setVal.Data[0].Word) : 'Boş Set';

                // Kök metadata varsa kullan, yoksa ilk item'dan çek (Geriye dönük uyumluluk)
                let itemGrade = setVal.GlobalLevel || (setVal.Data && setVal.Data[0] ? (setVal.Data[0].Level || setVal.Data[0].Grade || "Belirtilmemiş") : "Belirtilmemiş");
                let itemClass = setVal.GlobalClass || (setVal.Data && setVal.Data[0] ? (setVal.Data[0].ClassGrade || setVal.Data[0].Class || "Belirtilmemiş") : "Belirtilmemiş");
                let itemLesson = setVal.GlobalLesson || (setVal.Data && setVal.Data[0] ? (setVal.Data[0].Lesson || "Belirtilmemiş") : "Belirtilmemiş");
                let itemTopic = setVal.GlobalTopic || (setVal.Data && setVal.Data[0] ? (setVal.Data[0].Topic || setVal.Data[0].Unit || "Belirtilmemiş") : "Belirtilmemiş");

                // Yazar Adı belirleme
                let authorName = setVal.Author_DisplayName || setVal.Author_Email || 'Bilinmiyor';
                if (setVal.Author_Email === 'aahmetaytekin@gmail.com') authorName = 'GamEdu';

                // Kartın HTML elementine data- attributelarını bas
                card.setAttribute('data-grade', itemGrade.toLowerCase());
                card.setAttribute('data-class', itemClass.toLowerCase());
                card.setAttribute('data-lesson', itemLesson.toLowerCase());

                card.innerHTML = `
                    <div class="set-detail" style="width: 100%;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
                            <h4 style="margin:0;">${setVal.Title} 
                                <span style="font-size: 11px; font-weight:normal; color: ${setVal.IsPublic ? '#15803d' : '#b91c1c'}; background: ${setVal.IsPublic ? '#dcfce7' : '#fee2e2'}; padding: 2px 6px; border-radius: 12px; margin-left: 5px;">${setVal.IsPublic ? '🌎 Genel' : '🔒 Gizli'}</span> 
                                <span style="font-size: 11px; font-weight:normal; background:#e0e7ff; color:#3730a3; padding: 2px 6px; border-radius: 12px; margin-left: 5px;">${isQPool ? (setVal.SubType === 'acik_uclu' ? 'Açık Uçlu Soru' : 'Çoktan Seçmeli Soru') : 'Kelime Seti'} (${setVal.ItemCount} Kayıt)</span>
                            </h4>
                            <span style="font-size: 12px; color: #94a3b8;">Yazar: <strong style="color: #cbd5e1;">${authorName}</strong></span>
                        </div>
                        <div style="display:flex; gap:10px; font-size: 12px; margin-bottom: 8px; flex-wrap: wrap;">
                            <span style="background:rgba(59,130,246,0.1); color:#60a5fa; padding: 3px 8px; border-radius: 4px; border:1px solid rgba(59,130,246,0.2);">Kademe: ${itemGrade}</span>
                            <span style="background:rgba(59,130,246,0.1); color:#60a5fa; padding: 3px 8px; border-radius: 4px; border:1px solid rgba(59,130,246,0.2);">Sınıf: ${itemClass}</span>
                            <span style="background:rgba(59,130,246,0.1); color:#60a5fa; padding: 3px 8px; border-radius: 4px; border:1px solid rgba(59,130,246,0.2);">Ders: ${itemLesson}</span>
                            <span style="background:rgba(59,130,246,0.1); color:#60a5fa; padding: 3px 8px; border-radius: 4px; border:1px solid rgba(59,130,246,0.2);">Konu/Ünite: ${itemTopic}</span>
                        </div>
                        <p style="margin: 0; font-size: 13px; color: #94a3b8;">Örnek: <i style="color:#cbd5e1;">${sampleData} ...</i></p>
                    </div>
                    <div class="set-actions" style="margin-top: 10px; width: 100%; display:flex; justify-content:flex-end;">
                        <button class="action-btn btn-edit" onclick="openCrudModal('${setKey}')">⚙ Düzenle / İncele</button>
                    </div>
                `;
                mySetsContainer.appendChild(card);
            });
        })
        .catch((error) => {
            mySetsContainer.innerHTML = '<p style="color: red;">Setler çekilirken hata oluştu!</p>';
            console.error(error);
        });
}

// ==========================================
// 6.5. GLOBAL SETLERİ GETİRME EKRANI (KEŞFET) VE KLONLAMA
// ==========================================
function loadGlobalSets() {
    if (!isFirebaseInitialized || !globalSetsList) return;

    globalSetsList.innerHTML = '<p>Yükleniyor...</p>';

    const poolRef = database.ref('MasterPool').orderByChild('IsPublic').equalTo(true);

    poolRef.once('value')
        .then((snapshot) => {
            if (!snapshot.exists()) {
                globalSetsList.innerHTML = '<p style="color: #999; text-align: center; font-style: italic;">Henüz global havuza açılmış bir set bulunmuyor...</p>';
                const badge = document.getElementById('globalSetsBadge');
                if (badge) badge.textContent = '0';
                return;
            }

            globalSetsList.innerHTML = ''; // Temizle

            const badge = document.getElementById('globalSetsBadge');
            if (badge) badge.textContent = snapshot.numChildren();

            snapshot.forEach((childSnapshot) => {
                const setKey = childSnapshot.key;
                const setVal = childSnapshot.val();

                const isMySet = currentUser && setVal.Author_ID === currentUser.uid;

                const card = document.createElement('div');
                card.className = 'set-card';

                let isQPool = setVal.Type === 'qpool';
                let sampleData = setVal.Data && setVal.Data[0] ? (isQPool ? setVal.Data[0].QuestionText : setVal.Data[0].Word) : 'Boş Set';

                // Kök metadata varsa kullan, yoksa ilk item'dan çek (Geriye dönük uyumluluk)
                let itemGrade = setVal.GlobalLevel || (setVal.Data && setVal.Data[0] ? (setVal.Data[0].Level || setVal.Data[0].Grade || "Belirtilmemiş") : "Belirtilmemiş");
                let itemClass = setVal.GlobalClass || (setVal.Data && setVal.Data[0] ? (setVal.Data[0].ClassGrade || setVal.Data[0].Class || "Belirtilmemiş") : "Belirtilmemiş");
                let itemLesson = setVal.GlobalLesson || (setVal.Data && setVal.Data[0] ? (setVal.Data[0].Lesson || "Belirtilmemiş") : "Belirtilmemiş");
                let itemTopic = setVal.GlobalTopic || (setVal.Data && setVal.Data[0] ? (setVal.Data[0].Topic || setVal.Data[0].Unit || "Belirtilmemiş") : "Belirtilmemiş");

                // Yazar Adı belirleme
                let authorName = setVal.Author_DisplayName || setVal.Author_Email || 'Bilinmiyor';
                if (setVal.Author_Email === 'aahmetaytekin@gmail.com') authorName = 'GamEdu';

                // Kartın HTML elementine data- attributelarını bas
                card.setAttribute('data-grade', itemGrade.toLowerCase());
                card.setAttribute('data-class', itemClass.toLowerCase());
                card.setAttribute('data-lesson', itemLesson.toLowerCase());

                card.innerHTML = `
                    <div class="set-detail" style="width: 100%;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
                            <h4 style="margin:0;">${setVal.Title} 
                                <span style="font-size: 11px; font-weight:normal; background:#e0e7ff; color:#3730a3; padding: 2px 6px; border-radius: 12px; margin-left: 5px;">${isQPool ? (setVal.SubType === 'acik_uclu' ? 'Açık Uçlu Soru' : 'Çoktan Seçmeli Soru') : 'Kelime Seti'} (${setVal.ItemCount} Kayıt)</span>
                            </h4>
                            <span style="font-size: 12px; color: #94a3b8;">Yazar: <strong style="color: #cbd5e1;">${authorName}</strong></span>
                        </div>
                        <div style="display:flex; gap:10px; font-size: 12px; margin-bottom: 8px; flex-wrap: wrap;">
                            <span style="background:rgba(59,130,246,0.1); color:#60a5fa; padding: 3px 8px; border-radius: 4px; border:1px solid rgba(59,130,246,0.2);">Kademe: ${itemGrade}</span>
                            <span style="background:rgba(59,130,246,0.1); color:#60a5fa; padding: 3px 8px; border-radius: 4px; border:1px solid rgba(59,130,246,0.2);">Sınıf: ${itemClass}</span>
                            <span style="background:rgba(59,130,246,0.1); color:#60a5fa; padding: 3px 8px; border-radius: 4px; border:1px solid rgba(59,130,246,0.2);">Ders: ${itemLesson}</span>
                            <span style="background:rgba(59,130,246,0.1); color:#60a5fa; padding: 3px 8px; border-radius: 4px; border:1px solid rgba(59,130,246,0.2);">Konu/Ünite: ${itemTopic}</span>
                        </div>
                        <p style="margin: 0; font-size: 13px; color: #94a3b8;">Örnek: <i style="color:#cbd5e1;">${sampleData} ...</i></p>
                    </div>
                    <div class="set-actions" style="margin-top: 10px; width:100%; display:flex; justify-content:flex-end; gap:5px;">
                        ${isMySet
                        ? `<button class="action-btn btn-cancel-inline" disabled style="opacity:0.6; cursor:not-allowed;">Senin Setin</button>`
                        : `
                            <button class="action-btn" style="background-color: #f59e0b; font-size: 0.8rem;" onclick="openCrudModal('${setKey}', true)">🔍 İncele</button>
                            <button class="action-btn" style="background-color: #8b5cf6; font-size: 0.8rem;" onclick="cloneSet('${setKey}')">📥 Kopyala & Düzenle</button>
                        `
                    }
                    </div>
                `;
                globalSetsList.appendChild(card);
            });
        })
        .catch((error) => {
            globalSetsList.innerHTML = '<p style="color: red;">Global setler çekilirken hata oluştu!</p>';
            console.error(error);
        });
}

window.cloneSet = function (setId) {
    if (!setId || !currentUser) return;

    database.ref('MasterPool/' + setId).once('value').then(snapshot => {
        if (!snapshot.exists()) return showMessage("Orijinal set bulunamadı.", "error");

        let originalData = snapshot.val();
        let isQPool = originalData.Type === 'qpool';

        let confirmHtml = 'Bu seti kendi koleksiyonunuza klonlamak istiyor musunuz?<br>';

        if (isQPool) {
            confirmHtml += `<br>
                <div style="text-align:left; background:rgba(0,0,0,0.2); padding:10px; border-radius:5px;">
                    <label style="color:#cbd5e1; font-size:0.9rem; display:block; margin-bottom:5px;">Soru Türünü Yeniden Seçin:</label>
                    <select id="cloneSubTypeSelect" style="width:100%; padding:5px; background:#1e293b; color:#fff; border:1px solid #475569; border-radius:4px;">
                        <option value="coktan_secmeli" ${originalData.SubType !== 'acik_uclu' ? 'selected' : ''}>Çoktan Seçmeli (Test)</option>
                        <option value="acik_uclu" ${originalData.SubType === 'acik_uclu' ? 'selected' : ''}>Açık Uçlu (Klasik)</option>
                    </select>
                </div>
            `;
        }

        showOzelAlert(confirmHtml, 'evethayir', (isConfirmed) => {
            if (isConfirmed) {
                let newSubType = originalData.SubType;
                if (isQPool) {
                    const cloneSubTypeSelect = document.getElementById('cloneSubTypeSelect');
                    if (cloneSubTypeSelect) newSubType = cloneSubTypeSelect.value;
                }

                let clonedSet = {
                    ...originalData,
                    Title: originalData.Title + " (Kopya)",
                    Author_ID: currentUser.uid,
                    Author_Email: currentUser.email,
                    IsPublic: false, // Klonlanan kopya varsayılan olarak gizli gelir
                    SubType: newSubType || 'coktan_secmeli',
                    CreatedAt: firebase.database.ServerValue.TIMESTAMP
                };

                database.ref('MasterPool').push(clonedSet).then((newRef) => {
                    showMessage("Set başarıyla kendi koleksiyonunuza eklendi!", "success");

                    window.switchDashboardTab('mySetsTab'); // Benim setlerim sekmesini aç
                    loadMySets(); // Set listesini yenile

                    // Önceki CRUD Modalı Kapatıyoruz
                    if (crudModal) crudModal.classList.remove('active');
                    window.isCrudReadOnly = false;
                    currentSetId = null;

                    // Yeniseti (ID'si ile) otomatik olarak düzenleme (Okunabilir) modunda aç!
                    setTimeout(() => {
                        window.openCrudModal(newRef.key, false);
                    }, 500);

                }).catch(err => showMessage("Klonlama hatası: " + err.message, "error"));
            }
        });
    }).catch(err => showMessage("Veri çekilemedi: " + err.message, "error"));
};

// ==========================================
// 7. CRUD MODAL İŞLEMLERİ (READ, UPDATE, DELETE)
// ==========================================

// --- YENİ EKLENEN TOPLU DÜZENLEME (MEB FİLTRESİ) ---
window.populateModalMebFilters = function () {
    const lvl = document.getElementById('modalGlobalLevel');
    const cls = document.getElementById('modalGlobalClass');
    const les = document.getElementById('modalGlobalLesson');
    if (!lvl || !cls || !les) return;

    const val = lvl.value;
    let classOpts = [""];
    let lessonOpts = [""];

    if (val === "İlkokul") {
        classOpts.push("1. Sınıf", "2. Sınıf", "3. Sınıf", "4. Sınıf");
        lessonOpts.push("Türkçe", "Matematik", "Hayat Bilgisi", "Fen Bilimleri", "Sosyal Bilgiler", "İngilizce", "Din Kültürü");
    } else if (val === "Ortaokul") {
        classOpts.push("5. Sınıf", "6. Sınıf", "7. Sınıf", "8. Sınıf");
        lessonOpts.push("Türkçe", "Matematik", "Fen Bilimleri", "Sosyal Bilgiler", "İngilizce", "Din Kültürü", "T.C. İnkılap Tarihi");
    } else if (val === "Lise") {
        classOpts.push("9. Sınıf", "10. Sınıf", "11. Sınıf", "12. Sınıf");
        lessonOpts.push("Türk Dili ve Edebiyatı", "Matematik", "Fizik", "Kimya", "Biyoloji", "Tarih", "T.C. İnkılap Tarihi", "Coğrafya", "Felsefe", "İngilizce", "Din Kültürü");
    } else {
        classOpts.push("Tümü");
        lessonOpts.push("Tümü");
    }

    const prevClass = cls.value;
    const prevLesson = les.value;

    cls.innerHTML = classOpts.map(o => `<option value="${o}">${o || 'Sınıf'}</option>`).join('');
    les.innerHTML = lessonOpts.map(o => `<option value="${o}">${o || 'Ders'}</option>`).join('');

    if (classOpts.includes(prevClass) && prevClass !== "") cls.value = prevClass;
    if (lessonOpts.includes(prevLesson) && prevLesson !== "") les.value = prevLesson;
};

document.addEventListener('DOMContentLoaded', () => {
    const metaBtn = document.getElementById('saveGlobalMetadataBtn');
    if (metaBtn) {
        metaBtn.addEventListener('click', () => {
            if (!currentSetId || !currentSetData) return;
            const lvl = document.getElementById('modalGlobalLevel').value;
            const cls = document.getElementById('modalGlobalClass').value;
            const les = document.getElementById('modalGlobalLesson').value;
            const top = document.getElementById('modalGlobalTopic').value.trim();

            if (!lvl || !les || !top) {
                return showOzelAlert("Set güncellemesi için Kademe, Ders ve Konu seçimi zorunludur.", "hata");
            }

            const updates = {};
            updates[`MasterPool/${currentSetId}/GlobalLevel`] = lvl;
            updates[`MasterPool/${currentSetId}/GlobalClass`] = cls;
            updates[`MasterPool/${currentSetId}/GlobalLesson`] = les;
            updates[`MasterPool/${currentSetId}/GlobalTopic`] = top;

            if (currentSetData.Data && Array.isArray(currentSetData.Data)) {
                currentSetData.Data.forEach((item, idx) => {
                    if (item) {
                        updates[`MasterPool/${currentSetId}/Data/${idx}/Level`] = lvl;
                        updates[`MasterPool/${currentSetId}/Data/${idx}/ClassGrade`] = cls;
                        updates[`MasterPool/${currentSetId}/Data/${idx}/Lesson`] = les;
                        updates[`MasterPool/${currentSetId}/Data/${idx}/Topic`] = top;
                        if (currentSetData.Type === 'wordspool') {
                            updates[`MasterPool/${currentSetId}/Data/${idx}/Unit`] = top;
                        }
                    }
                });
            }

            database.ref().update(updates).then(() => {
                currentSetData.GlobalLevel = lvl;
                currentSetData.GlobalClass = cls;
                currentSetData.GlobalLesson = les;
                currentSetData.GlobalTopic = top;

                if (currentSetData.Data && Array.isArray(currentSetData.Data)) {
                    currentSetData.Data.forEach(item => {
                        if (item) {
                            item.Level = lvl;
                            item.ClassGrade = cls;
                            item.Lesson = les;
                            item.Topic = top;
                            if (currentSetData.Type === 'wordspool') item.Unit = top;
                        }
                    });
                }

                const stat = document.getElementById('globalMetadataStatus');
                if (stat) {
                    stat.style.opacity = '1';
                    setTimeout(() => stat.style.opacity = '0', 3000);
                }
                loadMySets();
            }).catch(err => showOzelAlert("Güncelleme hatası: " + err.message, "hata"));
        });
    }

    const lvlEl = document.getElementById('modalGlobalLevel');
    if (lvlEl) lvlEl.addEventListener('change', window.populateModalMebFilters);
});

window.isCrudReadOnly = false;

window.openCrudModal = function (setId, isReadOnly = false) {
    if (!setId) return;

    currentSetId = setId;
    window.isCrudReadOnly = isReadOnly;

    database.ref('MasterPool/' + setId).once('value').then(snapshot => {
        if (!snapshot.exists()) return showMessage("Bu set bulunamadı veya silinmiş.", "error");

        currentSetData = snapshot.val();

        // Modal Başlığı
        if (crudModalTitle) {
            if (isReadOnly) {
                crudModalTitle.innerHTML = `Seti İncele: <span style="font-weight:bold; color:#a78bfa;">${currentSetData.Title || 'İsimsiz Set'}</span> <span style="font-size:12px; color:#94a3b8; font-weight:normal;">(Salt Okunur)</span>`;
            } else {
                crudModalTitle.innerHTML = `Seti Düzenle: <span style="font-weight:bold; color:#2563eb;">${currentSetData.Title || 'İsimsiz Set'}</span>`;
            }
        }

        if (editSetTitleBtn) editSetTitleBtn.style.display = isReadOnly ? 'none' : 'inline-block';

        // Set Global Metadata Defaults
        const globalEditDiv = document.getElementById('globalMetadataEdit');
        if (globalEditDiv) {
            globalEditDiv.style.display = isReadOnly ? 'none' : 'flex';
            if (!isReadOnly) {
                let gLev = currentSetData.GlobalLevel;
                let gCls = currentSetData.GlobalClass;
                let gLes = currentSetData.GlobalLesson;
                let gTop = currentSetData.GlobalTopic;

                // Eskiden global verisi olmayan setler için data[0]'dan yakala
                if (!gLev && currentSetData.Data && currentSetData.Data.length > 0) {
                    const firstObj = currentSetData.Data.find(x => x !== null && x !== undefined);
                    if (firstObj) {
                        gLev = firstObj.Level || '';
                        gCls = firstObj.ClassGrade || '';
                        gLes = firstObj.Lesson || '';
                        gTop = firstObj.Topic || firstObj.Unit || '';
                    }
                }

                document.getElementById('modalGlobalLevel').value = gLev || '';
                window.populateModalMebFilters(); // Sınıf ve ders menülerini kademeye göre doldur
                document.getElementById('modalGlobalClass').value = gCls || '';
                document.getElementById('modalGlobalLesson').value = gLes || '';
                document.getElementById('modalGlobalTopic').value = gTop || '';
            }
        }

        // Tabloyu Çiz
        renderCrudTable(currentSetData.Data, currentSetData.Type);

        // Formu Hazırla (Ekleme için) - Okuma/Düzenleme Geçişleri
        const crudAddForm = document.getElementById('crudAddFormSection');
        const deleteEntireSetBtn = document.getElementById('deleteEntireSetBtn');
        const showAddFormBtn = document.getElementById('showAddFormBtn');
        let existingCloneBtn = document.getElementById('cloneFromModalBtn');

        if (existingCloneBtn) existingCloneBtn.remove(); // Temizle

        if (isReadOnly) {
            if (crudAddForm) crudAddForm.style.display = 'none';
            if (crudTableSection) crudTableSection.style.display = 'block';
            if (showAddFormBtn) showAddFormBtn.style.display = 'none';
            if (deleteEntireSetBtn) deleteEntireSetBtn.style.display = 'none';

            // Klonla Butonu Ekle (CRUD Modal içerisindeyken incelenen seti Kopyalamaya yarar)
            const cloneBtn = document.createElement('button');
            cloneBtn.id = 'cloneFromModalBtn';
            cloneBtn.className = 'login-btn';
            cloneBtn.style.cssText = 'background: #8b5cf6; width: 100%; padding: 15px; font-size:1.2rem; margin-top:15px;';
            cloneBtn.innerHTML = '📥 Kopyala ve Düzenle';
            cloneBtn.onclick = () => window.cloneSet(setId);

            document.querySelector('.ozel-alert-box').appendChild(cloneBtn);
        } else {
            // Edit Modu: Default TABLO gösterilir, FORM gizlenir.
            if (crudAddForm) crudAddForm.style.display = 'none';
            if (crudTableSection) crudTableSection.style.display = 'block';
            if (showAddFormBtn) showAddFormBtn.style.display = 'inline-block';
            if (deleteEntireSetBtn) deleteEntireSetBtn.style.display = 'inline-block';

            renderCrudAddForm(currentSetData.Type);
        }

        // Modalı Göster
        if (crudModal) crudModal.classList.add('active');
    }).catch(err => {
        showMessage("Veri çekilemedi: " + err.message, "error");
    });
};

window.openCrudModalForNewSet = function (title, type, subType, isPublic, gLevel = '', gClass = '', gLesson = '', gTopic = '') {
    console.log("🛠️ openCrudModalForNewSet ÇALIŞTI!", { title, type, subType, isPublic, gLevel, gClass, gLesson, gTopic });
    try {
        currentSetId = null; // null demek YENİ SET demek
        currentSetData = {
            Title: title,
            Type: type,
            SubType: subType,
            IsPublic: isPublic,
            GlobalLevel: gLevel, // Sete ait ortak ayar olarak modal içinde tut
            GlobalClass: gClass,
            GlobalLesson: gLesson,
            GlobalTopic: gTopic,
            Data: []
        };
        window.isCrudReadOnly = false;

        if (crudModalTitle) {
            crudModalTitle.innerHTML = `Yeni Set Oluştur: <span style="font-weight:bold; color:#2563eb;">${currentSetData.Title} (${gLevel} - ${gLesson})</span>`;
        }

        if (editSetTitleBtn) editSetTitleBtn.style.display = 'none'; // Yeni açılan sette başlık değiştirmeye şimdilik gerek yok

        // YENİ SET: Tablo Yok, Sadece Form Gösterilir
        const crudTableSection = document.getElementById('crudTableSection');
        const crudAddForm = document.getElementById('crudAddFormSection');
        const hideAddFormBtn = document.getElementById('hideAddFormBtn');
        const showAddFormBtn = document.getElementById('showAddFormBtn');
        const deleteEntireSetBtn = document.getElementById('deleteEntireSetBtn');

        if (crudTableSection) crudTableSection.style.display = 'none';
        if (showAddFormBtn) showAddFormBtn.style.display = 'none'; // Daha tablo yok, ekleme butonu gizli

        if (crudAddForm) crudAddForm.style.display = 'block';
        if (hideAddFormBtn) hideAddFormBtn.style.display = 'none'; // Geri dönülecek tablo yok

        if (deleteEntireSetBtn) deleteEntireSetBtn.style.display = 'none'; // Daha oluşmamış seti silemeyiz
        if (crudAddNewItemBtn) crudAddNewItemBtn.innerHTML = "Kaydet";

        renderCrudAddForm(type);

        if (crudModal) crudModal.classList.add('active');
        console.log("✅ MODAL AÇILMA KOMUTU VERİLDİ (.active eklendi)");
    } catch (e) {
        console.error("❌ openCrudModalForNewSet İÇİNDE HATA:", e);
        alert("MODAL AÇILIRKEN BEKLENMEYEN HATA: " + e.message);
    }
};

if (closeCrudModal) {
    closeCrudModal.addEventListener('click', () => {
        if (crudModal) crudModal.classList.remove('active');
        currentSetId = null;
        currentSetData = null;
        loadMySets(); // güncellenen miktarı ana ekrana yansıtmak için listeyi tazele
    });
}

if (showAddFormBtn) {
    showAddFormBtn.addEventListener('click', () => {
        if (crudTableSection) crudTableSection.style.display = 'none';
        if (crudAddFormSection) crudAddFormSection.style.display = 'block';
        if (hideAddFormBtn) hideAddFormBtn.style.display = 'block'; // Düzenleme modunda listeye dönülebilir

        // Formu temizle ve 1 satırla başlat
        if (currentSetData) renderCrudAddForm(currentSetData.Type);
    });
}

if (hideAddFormBtn) {
    hideAddFormBtn.addEventListener('click', () => {
        if (crudAddFormSection) crudAddFormSection.style.display = 'none';
        if (crudTableSection) crudTableSection.style.display = 'block';
    });
}

if (editSetTitleBtn) {
    editSetTitleBtn.addEventListener('click', () => {
        if (!currentSetId || !currentSetData) return;

        showOzelAlert("Setin yeni adını girin:", "prompt", (newTitle) => {
            if (newTitle !== null && newTitle.trim() !== "") {
                database.ref('MasterPool/' + currentSetId + '/Title').set(newTitle.trim()).then(() => {
                    currentSetData.Title = newTitle.trim();
                    if (crudModalTitle) {
                        crudModalTitle.innerHTML = `Seti Düzenle: <span style="font-weight:bold; color:#2563eb;">${currentSetData.Title}</span>`;
                    }
                    showMessage("Set başlığı başarıyla güncellendi.", "success");
                    loadMySets();
                    loadGlobalSets();
                }).catch(err => showMessage("Başlık güncellenemedi: " + err.message, "error"));
            }
        }, currentSetData.Title);
    });
}

// Modal dışına tıklandığında kapatma
window.onclick = function (event) {
    if (event.target == crudModal) {
        if (crudModal) crudModal.classList.remove('active');
        currentSetId = null;
        currentSetData = null;
        loadMySets();
    }
};

function renderCrudTable(dataArray, type) {
    if (!crudTableHeadRow || !crudTableBody) return;

    crudTableHeadRow.innerHTML = '';
    crudTableBody.innerHTML = '';

    if (!dataArray || dataArray.length === 0) {
        crudTableBody.innerHTML = `<tr><td colspan="11" style="text-align:center;">Bu sette hiç öğe yok. Kayıt ekleyebilirsiniz.</td></tr>`;
        return;
    }

    // Başlıkları Çiz
    if (type === 'qpool') {
        let isAcikUclu = currentSetData ? currentSetData.SubType === 'acik_uclu' : false;
        crudTableHeadRow.innerHTML = `
            <th>S.No</th>
            <th>Soru Metni</th>
            <th>İpucu</th>
            ${isAcikUclu ? '' : `
            <th>A Şıkkı</th>
            <th>B Şıkkı</th>
            <th>C Şıkkı</th>
            <th>D Şıkkı</th>
            <th>E Şıkkı</th>`}
            <th>Doğru Cev.</th>
            ${window.isCrudReadOnly ? '' : '<th>Aksiyonlar</th>'}
        `;
    } else {
        crudTableHeadRow.innerHTML = `
            <th>Kelime</th>
            <th>İpucu</th>
            <th>Türkçe A.</th>
            <th>İngilizce A.</th>
            <th>Görsel URL</th>
            ${window.isCrudReadOnly ? '' : '<th>Aksiyonlar</th>'}
        `;
    }

    // Satırları Çiz (Döngü)
    dataArray.forEach((item, index) => {
        if (!item) return; // Null olanları atla (silinmiş satırlar)

        const tr = document.createElement('tr');
        tr.id = 'crudRow-' + index;

        if (type === 'qpool') {
            let isAcikUclu = currentSetData ? currentSetData.SubType === 'acik_uclu' : false;
            tr.innerHTML = `
                <td>${item.QNumber || ''}</td>
                <td>${item.QuestionText || ''} ${item.ImgURL ? ' <a href="' + item.ImgURL + '" target="_blank">📷</a>' : ''}</td>
                <td>${item.Clue && item.Clue.startsWith('http') ? '<a href="' + item.Clue + '" target="_blank">📷 (Aç)</a>' : (item.Clue || '-')}</td>
                ${isAcikUclu ? '' : `
                <td>${item.OptionA || ''}</td>
                <td>${item.OptionB || ''}</td>
                <td>${item.OptionC || ''}</td>
                <td>${item.OptionD || ''}</td>
                <td>${item.OptionE || ''}</td>`}
                <td style="font-weight:bold; color:#10b981;">${item.CorrectAnswer || ''}</td>
                ${window.isCrudReadOnly ? '' : `
                <td style="white-space:nowrap;">
                    <button class="action-btn btn-edit" onclick="editRow(${index}, 'qpool')">✎ Düzenle</button>
                    <button class="action-btn btn-delete" onclick="deleteRow(${index})">X</button>
                </td>
                `}
            `;
        } else {
            tr.innerHTML = `
                <td style="font-weight:bold;">${item.Word || ''}</td>
                <td>${item.Clue || ''}</td>
                <td>${item.MeaningTR || '-'}</td>
                <td>${item.MeaningEN || '-'}</td>
                <td>${item.ImgURL ? '<a href="' + item.ImgURL + '" target="_blank">Aç</a>' : '-'}</td>
                ${window.isCrudReadOnly ? '' : `
                <td style="white-space:nowrap;">
                    <button class="action-btn btn-edit" onclick="editRow(${index}, 'wordspool')">✎ Düzenle</button>
                    <button class="action-btn btn-delete" onclick="deleteRow(${index})">X</button>
                </td>
                `}
            `;
        }
        crudTableBody.appendChild(tr);
    });
}

// --- SİLME (DELETE) İŞLEMİ ---
window.deleteRow = function (rowIndex) {
    if (!currentSetId || !currentSetData) return;

    // confirm('Bu öğeyi silmek istediğinize emin misiniz? (Geri alınamaz)')
    showOzelAlert('Bu öğeyi silmek istediğinize emin misiniz? (Geri alınamaz)', 'evethayir', (isConfirmed) => {
        if (isConfirmed) {
            database.ref('MasterPool/' + currentSetId + '/Data/' + rowIndex).set(null).then(() => {
                currentSetData.Data[rowIndex] = null;
                let newCount = currentSetData.Data.filter(x => x !== null).length;
                database.ref('MasterPool/' + currentSetId + '/ItemCount').set(newCount);

                const rowElem = document.getElementById('crudRow-' + rowIndex);
                if (rowElem) rowElem.remove();

                showMessage('Başarıyla silindi.', 'success');
                loadMySets();
            }).catch(err => {
                showMessage('Silinemedi: ' + err.message, 'error');
            });
        }
    });
};

// --- DÜZENLEME (UPDATE) FORMATI OLUŞTURMA ---
window.editRow = function (rowIndex, type) {
    if (!currentSetId || !currentSetData) return;
    const rowElem = document.getElementById('crudRow-' + rowIndex);
    const item = currentSetData.Data[rowIndex];
    if (!rowElem || !item) return;

    if (type === 'qpool') {
        let isAcikUclu = currentSetData.SubType === 'acik_uclu';
        rowElem.innerHTML = `
            <td><input type="text" id="e_Qn_${rowIndex}" value="${item.QNumber || ''}" style="width:40px;"></td>
            <td><input type="text" id="e_Qt_${rowIndex}" value="${item.QuestionText || ''}" style="width:100%;"></td>
            <td><input type="text" id="e_Clue_${rowIndex}" value="${item.Clue || ''}" placeholder="İpucu/URL"></td>
            ${isAcikUclu ? '' : `
            <td><input type="text" id="e_A_${rowIndex}" value="${item.OptionA || ''}"></td>
            <td><input type="text" id="e_B_${rowIndex}" value="${item.OptionB || ''}"></td>
            <td><input type="text" id="e_C2_${rowIndex}" value="${item.OptionC || ''}"></td>
            <td><input type="text" id="e_D_${rowIndex}" value="${item.OptionD || ''}"></td>
            <td><input type="text" id="e_E_${rowIndex}" value="${item.OptionE || ''}"></td>`}
            <td><input type="text" id="e_Ans_${rowIndex}" value="${item.CorrectAnswer || ''}" style="width:60px;"></td>
            <td style="white-space:nowrap;">
                <button class="action-btn btn-save-inline" onclick="saveEditedRow(${rowIndex}, 'qpool')" style="background:#10b981; color:#fff; font-weight:bold; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">✔ Kaydet</button>
                <button class="action-btn btn-cancel-inline" onclick="cancelEdit(${rowIndex}, 'qpool')" style="background:#ef4444; color:#fff; font-weight:bold; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; margin-left:4px;">✖ İptal</button>
            </td>
        `;
    } else {
        rowElem.innerHTML = `
            <td><input type="text" id="e_W_${rowIndex}" value="${item.Word || ''}" style="width:100%;"></td>
            <td><input type="text" id="e_Clue_W_${rowIndex}" value="${item.Clue || ''}"></td>
            <td><input type="text" id="e_MTR_${rowIndex}" value="${item.MeaningTR || ''}"></td>
            <td><input type="text" id="e_MEN_${rowIndex}" value="${item.MeaningEN || ''}"></td>
            <td><input type="text" id="e_I_${rowIndex}" value="${item.ImgURL || ''}"></td>
            <td style="white-space:nowrap;">
                <button class="action-btn btn-save-inline" onclick="saveEditedRow(${rowIndex}, 'wordspool')" style="background:#10b981; color:#fff; font-weight:bold; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">✔ Kaydet</button>
                <button class="action-btn btn-cancel-inline" onclick="cancelEdit(${rowIndex}, 'wordspool')" style="background:#ef4444; color:#fff; font-weight:bold; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; margin-left:4px;">✖ İptal</button>
            </td>
        `;
    }
};

window.cancelEdit = function (rowIndex, type) {
    renderCrudTable(currentSetData.Data, type);
};

// --- DÜZENLEME (UPDATE) KAYDET ---
window.saveEditedRow = function (rowIndex, type) {
    if (!currentSetId || !currentSetData) return;

    let updatedObj = { ...currentSetData.Data[rowIndex] };
    if (type === 'qpool') {
        let isAcikUclu = currentSetData.SubType === 'acik_uclu';
        updatedObj = {
            ...updatedObj,
            QNumber: document.getElementById('e_Qn_' + rowIndex).value.trim(),
            QuestionText: document.getElementById('e_Qt_' + rowIndex).value.trim(),
            Clue: document.getElementById('e_Clue_' + rowIndex).value.trim(),
            CorrectAnswer: document.getElementById('e_Ans_' + rowIndex).value.trim(),
            ImgURL: currentSetData.Data[rowIndex].ImgURL || ""
        };
        if (!isAcikUclu) {
            updatedObj.OptionA = document.getElementById('e_A_' + rowIndex).value.trim();
            updatedObj.OptionB = document.getElementById('e_B_' + rowIndex).value.trim();
            updatedObj.OptionC = document.getElementById('e_C2_' + rowIndex).value.trim();
            updatedObj.OptionD = document.getElementById('e_D_' + rowIndex).value.trim();
            updatedObj.OptionE = document.getElementById('e_E_' + rowIndex).value.trim();
        } else {
            updatedObj.OptionA = "";
            updatedObj.OptionB = "";
            updatedObj.OptionC = "";
            updatedObj.OptionD = "";
            updatedObj.OptionE = "";
        }
    } else {
        updatedObj = {
            ...updatedObj,
            Word: document.getElementById('e_W_' + rowIndex).value.trim(),
            Clue: document.getElementById('e_Clue_W_' + rowIndex).value.trim(),
            MeaningTR: document.getElementById('e_MTR_' + rowIndex) ? document.getElementById('e_MTR_' + rowIndex).value.trim() : "",
            MeaningEN: document.getElementById('e_MEN_' + rowIndex) ? document.getElementById('e_MEN_' + rowIndex).value.trim() : "",
            ImgURL: document.getElementById('e_I_' + rowIndex).value.trim()
        };
    }

    database.ref('MasterPool/' + currentSetId + '/Data/' + rowIndex).update(updatedObj)
        .then(() => {
            currentSetData.Data[rowIndex] = Object.assign(currentSetData.Data[rowIndex], updatedObj);
            renderCrudTable(currentSetData.Data, type);
            showMessage('Düzenleme başarıyla kaydedildi!', 'success');
        })
        .catch(err => showMessage('Düzenleme hatası: ' + err.message, 'error'));
};
// ==========================================
// 8. TEKİL VERİ EKLEME (CREATE SINGLE) VE SET SİLME
// ==========================================

let newRowCounter = 0;

function renderSingleAddRow(type) {
    newRowCounter++;
    const rowDiv = document.createElement('div');
    rowDiv.className = 'add-row-item';
    rowDiv.style.display = 'grid';
    rowDiv.style.gap = '5px';
    rowDiv.style.alignItems = 'start';
    rowDiv.style.backgroundColor = '#f8fafc';
    rowDiv.style.padding = '5px 10px';
    rowDiv.style.border = '1px solid #e2e8f0';
    rowDiv.style.borderRadius = '5px';

    if (type === 'qpool') {
        let isAcikUclu = currentSetData && currentSetData.SubType === 'acik_uclu';
        if (isAcikUclu) {
            rowDiv.style.gridTemplateColumns = "30px 60px 2fr 1.5fr 100px 100px";
        } else {
            rowDiv.style.gridTemplateColumns = "30px 45px 1.5fr 1fr 50px 50px 50px 50px 50px 40px 70px";
        }
    } else {
        rowDiv.style.gridTemplateColumns = "30px 120px 1.5fr 1.5fr 1fr 1fr 150px";
    }

    // Silme Butonu (-)
    const delBtn = document.createElement('button');
    delBtn.innerHTML = '➖';
    delBtn.title = 'Satırı Sil';
    delBtn.style.background = '#ef4444';
    delBtn.style.color = 'white';
    delBtn.style.border = 'none';
    delBtn.style.borderRadius = '4px';
    delBtn.style.padding = '5px 0';
    delBtn.style.fontSize = '12px';
    delBtn.style.cursor = 'pointer';
    delBtn.style.height = '34px'; // input'larla aynı boyda olsun
    delBtn.onclick = () => rowDiv.remove();

    if (type === 'qpool') {
        let isAcikUclu = currentSetData && currentSetData.SubType === 'acik_uclu';
        rowDiv.innerHTML = `
            <input type="number" class="n_QNum" placeholder="1" style="width:100%; padding:5px; border:1px solid #ccc; border-radius:3px;">
            <textarea class="n_QText" rows="1" placeholder="Soru metni..." style="width:100%; padding:5px; border:1px solid #ccc; border-radius:3px; resize:vertical; min-height:34px;"></textarea>
            <input type="text" class="n_Clue" placeholder="İpucu veya Resim URL" style="width:100%; padding:5px; border:1px solid #ccc; border-radius:3px;">
            ${isAcikUclu ? '' : `
            <input type="text" class="n_A" placeholder="A" style="width:100%; padding:5px; border:1px solid #ccc; border-radius:3px;">
            <input type="text" class="n_B" placeholder="B" style="width:100%; padding:5px; border:1px solid #ccc; border-radius:3px;">
            <input type="text" class="n_C" placeholder="C" style="width:100%; padding:5px; border:1px solid #ccc; border-radius:3px;">
            <input type="text" class="n_D" placeholder="D" style="width:100%; padding:5px; border:1px solid #ccc; border-radius:3px;">
            <input type="text" class="n_E" placeholder="E" style="width:100%; padding:5px; border:1px solid #ccc; border-radius:3px;">`}
            <input type="text" class="n_Ans" ${isAcikUclu ? '' : 'maxlength="1"'} style="width:100%; padding:5px; font-weight:bold; color:#10b981; text-align:center; border:1px solid #ccc; border-radius:3px;" placeholder="${isAcikUclu ? 'Doğru Cevabı Yazın' : 'A'}">
            <input type="text" class="n_ImgURL" placeholder="URL" style="width:100%; padding:5px; border:1px solid #ccc; border-radius:3px;">
        `;
    } else {
        rowDiv.innerHTML = `
            <input type="text" class="n_Word" placeholder="Apple" style="font-weight:bold; width:100%; padding:5px; border:1px solid #ccc; border-radius:3px;">
            <input type="text" class="n_Clue" placeholder="Elma" style="width:100%; padding:5px; border:1px solid #ccc; border-radius:3px;">
            <input type="text" class="n_MeaningTR" placeholder="Elma" style="width:100%; padding:5px; border:1px solid #ccc; border-radius:3px;">
            <input type="text" class="n_MeaningEN" placeholder="Apple" style="width:100%; padding:5px; border:1px solid #ccc; border-radius:3px;">
            <input type="text" class="n_ImgURL" placeholder="URL" style="width:100%; padding:5px; border:1px solid #ccc; border-radius:3px;">
        `;
    }

    rowDiv.prepend(delBtn);

    dynamicInputsContainer.appendChild(rowDiv);
}

function renderCrudAddForm(type) {
    if (!dynamicInputsContainer || !dynamicInputsHeader) return;

    dynamicInputsContainer.innerHTML = '';

    // Add helper text for Clue (İpucu) Image URL capability
    const helperText = document.createElement('p');
    helperText.style.cssText = "font-size:12px; color:#9c27b0; margin-bottom:10px; font-weight:bold;";
    helperText.innerHTML = "💡 İpucu: 'İpucu' veya 'Resim URL' kutularına doğrudan görsel linki (http...jpg/png) yapıştırabilirsiniz. Oyun esnasında tıklanabilir görsel eklenecektir.";
    dynamicInputsContainer.appendChild(helperText);

    // Header (Sütun Başlıkları) Oluşturma
    if (type === 'qpool') {
        let isAcikUclu = currentSetData && currentSetData.SubType === 'acik_uclu';
        dynamicInputsHeader.innerHTML = `
            <div></div>
            <div>No <span style="color:red">*</span></div>
            <div>Soru Metni <span style="color:red">*</span></div>
            <div>İpucu</div>
            ${isAcikUclu ? '' : `
            <div>A Şıkkı <span style="color:red">*</span></div>
            <div>B Şıkkı <span style="color:red">*</span></div>
            <div>C Şıkkı <span style="color:red">*</span></div>
            <div>D Şıkkı <span style="color:red">*</span></div>
            <div>E (Lise)</div>`}
            <div>Cevap <span style="color:red">*</span></div>
            <div>Görsel URL</div>
        `;
        dynamicInputsHeader.style.display = "grid";
        if (isAcikUclu) {
            dynamicInputsHeader.style.gridTemplateColumns = "30px 60px 2fr 1.5fr 100px 100px";
        } else {
            dynamicInputsHeader.style.gridTemplateColumns = "30px 45px 1.5fr 1fr 50px 50px 50px 50px 50px 40px 70px";
        }
        dynamicInputsHeader.style.gap = "5px";
    } else {
        dynamicInputsHeader.innerHTML = `
            <div></div>
            <div>Kelime <span style="color:red">*</span></div>
            <div>İpucu</div>
            <div>Türkçe A.</div>
            <div>İngilizce A.</div>
            <div>Görsel URL</div>
        `;
        dynamicInputsHeader.style.display = "grid";
        dynamicInputsHeader.style.gridTemplateColumns = "30px 120px 1.5fr 1.5fr 1fr 1fr 150px";
        dynamicInputsHeader.style.gap = "5px";
    }

    newRowCounter = 0;
    renderSingleAddRow(type); // Varsayılan olarak 1 satırla başlat
}

if (addRowBtn) {
    addRowBtn.addEventListener('click', () => {
        if (currentSetData) renderSingleAddRow(currentSetData.Type);
    });
}

// YENİ ÖĞELERİ TOPLU KAYDET BUTONU TIKLANDIĞINDA
if (crudAddNewItemBtn) {
    crudAddNewItemBtn.addEventListener('click', () => {
        if (!currentSetData) return; // YENİ SET KAYDINDA setId henüz null'dur, engelleme!
        let type = currentSetData.Type;
        let rows = document.querySelectorAll('.add-row-item');
        if (rows.length === 0) return showOzelAlert("Lütfen en az bir satır ekleyin.", "hata");

        let newObjects = [];
        let hasError = false;

        rows.forEach((row, index) => {
            if (hasError) return;

            if (type === 'qpool') {
                let isAcikUclu = currentSetData && currentSetData.SubType === 'acik_uclu';
                const level = currentSetData.GlobalLevel || "Genel"; // Ekranda yok, Object'ten al
                const cg = currentSetData.GlobalClass || "Tümü";
                const ls = currentSetData.GlobalLesson || "Genel";
                const tp = currentSetData.GlobalTopic || "Genel";
                const qn = row.querySelector('.n_QNum').value.trim();
                const qt = row.querySelector('.n_QText').value.trim();
                const clue = row.querySelector('.n_Clue') ? row.querySelector('.n_Clue').value.trim() : "";
                const ansRaw = row.querySelector('.n_Ans').value.trim();
                const ans = isAcikUclu ? ansRaw : ansRaw.toUpperCase();

                if (!qn || (!qt && !row.querySelector('.n_ImgURL').value.trim()) || !ans) {
                    showOzelAlert(`Hata: Satır ${index + 1}'de '*' işaretli tüm alanları doldurun. (Soru Metni veya URL şart)`, "hata");
                    hasError = true; return;
                }
                if (!isAcikUclu && !['A', 'B', 'C', 'D', 'E'].includes(ans)) {
                    showOzelAlert(`Hata: Satır ${index + 1}'de Doğru cevap A, B, C, D veya E olmalıdır.`, "hata");
                    hasError = true; return;
                }

                newObjects.push({
                    Level: level, ClassGrade: cg, Lesson: ls, Topic: tp, QNumber: qn,
                    QuestionText: qt, Clue: clue, ImgURL: row.querySelector('.n_ImgURL').value.trim(),
                    OptionA: isAcikUclu ? "" : row.querySelector('.n_A').value.trim(),
                    OptionB: isAcikUclu ? "" : row.querySelector('.n_B').value.trim(),
                    OptionC: isAcikUclu ? "" : row.querySelector('.n_C').value.trim(),
                    OptionD: isAcikUclu ? "" : row.querySelector('.n_D').value.trim(),
                    OptionE: isAcikUclu ? "" : row.querySelector('.n_E').value.trim(),
                    CorrectAnswer: ans
                });
            } else {
                const level = currentSetData.GlobalLevel || "Genel";
                const cg = currentSetData.GlobalClass || "Tümü";
                const ls = currentSetData.GlobalLesson || "Genel";
                const un = currentSetData.GlobalTopic || "Genel";
                const word = row.querySelector('.n_Word').value.trim();

                if (!word) {
                    showOzelAlert(`Hata: Satır ${index + 1}'de '*' işaretli alanları doldurun. (Kelime şart)`, "hata");
                    hasError = true; return;
                }

                newObjects.push({
                    Level: level, ClassGrade: cg, Lesson: ls, Unit: un, Word: word,
                    Clue: row.querySelector('.n_Clue').value.trim(),
                    MeaningTR: row.querySelector('.n_MeaningTR').value.trim(),
                    MeaningEN: row.querySelector('.n_MeaningEN').value.trim(),
                    ImgURL: row.querySelector('.n_ImgURL').value.trim()
                });
            }
        });

        if (hasError) return;

        if (currentSetId === null) {
            // YENİ SET KAYIT MODU
            if (newObjects.length < 5) {
                return showOzelAlert("Yeni bir set oluştururken form üzerinden en az 5 adet kayıt girmelisiniz.", "hata");
            }

            const newSetRef = database.ref('MasterPool').push();
            const setData = {
                Author_ID: currentUser.uid,
                Author_Email: currentUser.email,
                Title: currentSetData.Title,
                Type: type,
                IsPublic: currentSetData.IsPublic,
                ItemCount: newObjects.length,
                CreatedAt: firebase.database.ServerValue.TIMESTAMP,
                Data: newObjects
            };

            newSetRef.set(setData).then(() => {
                showMessage(`Başarılı! '${setData.Title}' adlı setiniz oluşturuldu ve kaydedildi.`, "success");

                // Formu kapat ve ana ekrana dön
                if (crudModal) crudModal.classList.remove('active');
                currentSetData = null;

                // Akordiyonun güncellenmesi ve açık kalması için
                loadMySets();

            }).catch(error => {
                showMessage("Kayıt hatası: " + error.message, "error");
            });

        } else {
            // MEVCUT SETE EKLEME MODU
            if (!currentSetData.Data) currentSetData.Data = [];
            let startIndex = currentSetData.Data.length;

            // Multi-Update object hazırlama
            let updates = {};
            newObjects.forEach((obj, i) => {
                updates['MasterPool/' + currentSetId + '/Data/' + (startIndex + i)] = obj;
                currentSetData.Data[startIndex + i] = obj;
            });

            // ItemCount güncellemesi
            let newCount = currentSetData.Data.filter(x => x !== null).length;
            updates['MasterPool/' + currentSetId + '/ItemCount'] = newCount;

            database.ref().update(updates).then(() => {
                showMessage(`Başarılı! Setinize ${newObjects.length} adet yeni öge topluca eklendi.`, "success");
                renderCrudTable(currentSetData.Data, currentSetData.Type);
                renderCrudAddForm(currentSetData.Type); // Formu sıfırla
                loadMySets();
            }).catch(err => showMessage("Eklenirken hata oluştu: " + err.message, "error"));
        }
    });
}

// TÜM SETİ ÇÖPE ATMA
if (deleteEntireSetBtn) {
    deleteEntireSetBtn.addEventListener('click', () => {
        if (!currentSetId) return;
        showOzelAlert('DİKKAT! Bu seti KÖKTEN silmek üzeresiniz. Sette Bulunan Tüm Verileriniz Kaybolacak ve Lobiden Silinecektir. Onaylıyor musunuz?', 'evethayir', (isConfirmed) => {
            if (isConfirmed) {
                database.ref('MasterPool/' + currentSetId).remove().then(() => {
                    showMessage('Set veritabanından başarıyla uçuruldu.', 'success');
                    if (crudModal) crudModal.classList.remove('active');
                    loadMySets(); // Ekrandan kaldır
                }).catch(err => showMessage('Silinemedi: ' + err.message, 'error'));
            }
        });
    });
}

/* Sistem Mesajları Kuralı: showOzelAlert Uygulaması (Firebase Dashboard İçin) */
window.showOzelAlert = function (message, type, callback = null) {
    const overlay = document.getElementById('ozelAlertOverlay');
    const messageEl = document.getElementById('ozelAlertMessage');
    const iconEl = document.getElementById('ozelAlertIcon');
    const buttonsEl = document.getElementById('ozelAlertButtons');

    if (!overlay) {
        // Fallback (HTML update edilmeden önce çağrılırsa diye)
        if (type === 'evethayir') {
            if (callback) callback(confirm(message));
        } else {
            alert(message);
            if (callback) callback(true);
        }
        return;
    }

    messageEl.innerHTML = message;
    buttonsEl.innerHTML = '';

    if (type === 'hata') { iconEl.innerHTML = '❌'; iconEl.style.color = '#ef4444'; }
    else if (type === 'bilgi') { iconEl.innerHTML = 'ℹ️'; iconEl.style.color = '#3b82f6'; }
    else if (type === 'onay' || type === 'evethayir') { iconEl.innerHTML = '❓'; iconEl.style.color = '#eab308'; }
    else { iconEl.innerHTML = '🔔'; iconEl.style.color = '#22c55e'; }

    if (type === 'evethayir') {
        const btnEvet = document.createElement('button');
        btnEvet.className = 'ozel-alert-btn btn-tamam'; btnEvet.innerText = 'Evet';
        btnEvet.onclick = () => { closeAlert(); if (callback) callback(true); };

        const btnHayir = document.createElement('button');
        btnHayir.className = 'ozel-alert-btn btn-hayir'; btnHayir.innerText = 'Hayır';
        btnHayir.onclick = () => { closeAlert(); if (callback) callback(false); };

        buttonsEl.appendChild(btnHayir); buttonsEl.appendChild(btnEvet);
    } else {
        const btnTamam = document.createElement('button');
        btnTamam.className = 'ozel-alert-btn btn-tamam'; btnTamam.innerText = 'Tamam';
        btnTamam.onclick = () => { closeAlert(); if (callback) callback(true); };
        buttonsEl.appendChild(btnTamam);
    }
    overlay.classList.add('active');
}

window.closeAlert = function () {
    const overlay = document.getElementById('ozelAlertOverlay');
    if (overlay) overlay.classList.remove('active');
}
// Service Worker Kaydı (PWA Desteği İçin)
if ('serviceWorker' in navigator && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker Registered!', reg))
            .catch(err => console.error('Service Worker Registration Failed!', err));
    });
} else {
    console.log("Service Worker registration skipped (running via file:// protocol).");
}

document.addEventListener('DOMContentLoaded', () => {
    // Config.js üzerinden UI ayarlarının yapılması
    if (typeof AppConfig !== 'undefined' && AppConfig.ui.primaryColor) {
        document.documentElement.style.setProperty('--accent-color', AppConfig.ui.primaryColor);
    }
    loadGames();

    // Yeniden Başlat Butonu Event Listener (Aynı ayarlarla Setup'ı tetikler)
    const restartGameBtn = document.getElementById('restartGameBtn');
    if (restartGameBtn) {
        restartGameBtn.addEventListener('click', () => {
            restartGameBtn.textContent = 'Başlatılıyor...';
            const startBtn = document.getElementById('startGameBtn');
            if (startBtn) {
                startBtn.click(); // Gizli olan setup formunu tekrar ateşler
            }
        });
    }
});

function loadGames() {
    const statusContainer = document.getElementById('statusContainer');
    const gamesGrid = document.getElementById('gamesGrid');

    // GitHub'da (Apps Script dışındayken) AppConfig'den oyun verilerini yükle
    if (typeof google === 'undefined' || !google.script || !google.script.run) {
        if (typeof AppConfig !== 'undefined') {
            setTimeout(() => {
                // Config'den statik veriyi kullan 
                renderGames(AppConfig.games, statusContainer, gamesGrid);
            }, 600); // Küçük bir yükleme animasyonu efekti
        } else {
            showError("Config.js yüklenemedi. Lütfen sayfayı yenileyin.", statusContainer);
        }
    } else {
        // Eğer hala Google Apps Script üzerinden yüklenmişse (Geri dönük uyumluluk)
        google.script.run
            .withSuccessHandler((games) => renderGames(games, statusContainer, gamesGrid))
            .withFailureHandler((error) => showError(error, statusContainer))
            .getGamesList();
    }
}

function renderGames(games, statusContainer, gamesGrid) {
    statusContainer.style.display = 'none';
    gamesGrid.style.display = 'grid';
    gamesGrid.innerHTML = '';

    if (!games || games.length === 0 || games.error) {
        showError(games.error || 'Hiç oyun bulunamadı.', statusContainer);
        return;
    }

    games.forEach(game => {
        const card = document.createElement('div');
        card.className = 'game-card';
        if (game.imageUrl) {
            card.style.backgroundImage = `url('${game.imageUrl}')`;
        }

        // Sheet'ten hem SheetTabName hem ConfigSheetName, Config'ten id veya configSheet gelebilir
        let configSheet = game.configSheet || game.ConfigSheetName || game.SheetTabName;
        let redirectUrl = game.redirectUrl || game.RedirectUrl;

        // BeeComb SPA Yaması (Veritabanında eski URL kalmışsa bile SPA'ya zorla)
        const gameId = String(game.id || game.GameName || '').toLowerCase();
        if (gameId === 'beecomb') {
            redirectUrl = null;
            configSheet = "BeeComb_Config";
        }

        let badgeText = redirectUrl ? 'Dış Bağlantı' : 'Modüler Oyun';

        card.innerHTML = `
            <div class="card-content">
                <div class="badge">${badgeText}</div>
                <h3 class="game-title">${game.name || game.GameName || 'Bilinmeyen Oyun'}</h3>
                <p class="game-desc">${game.description || game.Description || 'Harika bir oyun deneyimi.'}</p>
            </div>
            <div class="play-icon" style="${game.themeColor ? 'background:' + game.themeColor : ''}">
                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
            <button class="info-btn" title="Nasıl Oynanır?" style="position: absolute; top: 15px; right: 15px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.2); border-radius: 50%; color: #fff; width: 35px; height: 35px; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10; transition: all 0.3s ease;">?</button>
        `;

        const infoBtn = card.querySelector('.info-btn');
        if (infoBtn) {
            infoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showOzelAlert(game.howToPlay || 'Nasıl oynanacağı yakında eklenecek.', 'bilgi');
            });
        }

        card.addEventListener('click', () => launchGame(game, configSheet, redirectUrl));
        gamesGrid.appendChild(card);
    });
}

function showError(error, statusContainer) {
    statusContainer.style.display = 'block';
    statusContainer.innerHTML = `
    < div style = "color: #ef4444; margin-bottom: 10px;" >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div >
    <p>Oyunlar yüklenirken bir hata oluştu: <br>${error}</p>
`;
    console.error("Hata:", error);
}

function launchGame(game, configSheet, redirectUrl) {
    const gameId = String(game.id || game.GameName || '').toLowerCase();

    // BEECOMB ÖZEL YAMASI (Ayar Sayfası Yok - Direkt Başlat)
    if (gameId === 'beecomb') {
        document.getElementById('welcomeHero').style.display = 'none';
        document.getElementById('gamesListArea').style.display = 'none';

        // Setup alanını hiç göstermeden butona basılmış gibi arka planda API tetikliyoruz
        const formData = {
            GameType: 'beecomb',
            ClassGrade: 'all',  // Auto-grade yapabilmek için tüm soruları RAM'e çekmeliyiz
            Lessons: 'Random'   // Seçili ders offline olarak sonradan filtrelenecek
        };

        const apiUrlStart = typeof AppConfig !== 'undefined' ? AppConfig.apiBaseUrl : '';
        if (apiUrlStart && apiUrlStart.trim() !== '') {
            fetch(apiUrlStart, {
                method: 'POST',
                body: JSON.stringify({ action: 'startGame', formData: formData }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            })
                .then(res => res.json())
                .then(response => {
                    if (response.error) {
                        showOzelAlert("Kurulum Hatası: " + response.error, "hata");
                    } else {
                        currentLoadedGame = game;
                        const beeCombGameArea = document.getElementById('beeCombGameArea');
                        beeCombGameArea.style.display = 'block';
                        beeCombGameArea.classList.remove('hidden-spa-module');
                        BeeCombEngine.init(response.gameConfig || formData);
                    }
                })
                .catch(error => {
                    showOzelAlert("BeeComb başlatılırken bağlantı hatası: " + error, "hata");
                });
        }
        return;
    }

    // SPA Mimarisine Geçiş (Faz 2 Hazırlığı)
    // 1- Eğer oyunun bir Config Sheet'i varsa ÖNCELİKLE SPA içindeki Setup ekranını aç
    if (configSheet && configSheet.trim() !== '') {
        // Dinamik Oyun Setup Modülünün Tetiklenmesi 
        document.getElementById('welcomeHero').style.display = 'none';
        document.getElementById('gamesListArea').style.display = 'none';

        // Setup Modülünü görünür(display:block) yapıyoruz.
        const setupArea = document.getElementById('setupArea');
        setupArea.style.display = 'block';
        setupArea.classList.remove('hidden-spa-module');

        document.getElementById('setupGameTitle').textContent = game.name || game.GameName || 'Oyun Kurulumu';

        // Setup ekranını dolduracak fonksiyon çağrısı
        loadGameSetup(game, configSheet);
    }
    // 2- Config Sheet yok ama harici bir url varsa oraya yönlendir (Eski oyunlar vs)
    else if (redirectUrl && redirectUrl.trim() !== '') {
        window.location.href = redirectUrl;
    } else {
        showOzelAlert('Bu oyun için bir yapılandırma bilgisi bulunamadı.', 'hata');
    }
}

function teacherLogin() {
    showOzelAlert('Öğretmen paneli giriş sistemi (Auth) Modülü Firebase (Veya Google Auth) üzerinden aktif edilecektir.', 'bilgi');
}

/* --- FAZ 2: DİNAMİK SETUP (AYAR) MODÜLÜ FONKSİYONLARI --- */

let currentGameConfigData = [];
let currentLoadedGame = null; // Başlatılacak oyunu tutmak için
let currentGameSessionSheet = ''; // API'den dönen aktif oyun oturumu (Örn: Game_170...)

function loadGameSetup(game, configSheet) {
    currentLoadedGame = game;
    const setupForm = document.getElementById('dynamicSetupForm');
    setupForm.innerHTML = `
        <div style="text-align:center; padding: 2rem; width:100%;">
            <div class="loader" style="margin: 0 auto;"></div>
            <p style="margin-top: 1rem; color: var(--text-muted);">"${configSheet}" yapılandırması getiriliyor...</p>
        </div>
    `;

    // Eğer görsel varsa yükle, yoksa gizle
    const imageArea = document.getElementById('setupImageArea');
    if (game.bannerUrl) {
        imageArea.style.backgroundImage = `url('${game.bannerUrl}')`;
        imageArea.style.display = 'block';
    } else {
        imageArea.style.display = 'none';
    }

    // SPA Fetch API Entegrasyonu (Tam Bağımsız GitHub Uyumlu Mantık)
    const apiUrl = typeof AppConfig !== 'undefined' ? AppConfig.apiBaseUrl : '';

    // QUICKREVEAL ÖZEL YAMASI (APISİZ OFFLINE SETUP)
    if (game.id === 'quickreveal') {
        const qrConfig = [
            { SettingName: "NumGroups", DisplayName: "Grup Sayısı", Type: "number", DefaultValue: 4, Min: 2, Max: 6 },
            { SettingName: "QrCategory", DisplayName: "Ana Kategori", Type: "dropdown", OptionsSource: "Fruits,Body Parts,Public Buildings,Illnesses,Countries & Nationalities,Irregular Verbs,Time,Numbers,Math Operations", DefaultValue: "Fruits" },
            { SettingName: "QrSubCategory", DisplayName: "Alt Kategori", Type: "dropdown", OptionsSource: "Cardinal,Ordinal", DefaultValue: "Cardinal" },
            { SettingName: "QrMathOps", DisplayName: "Matematik İşlemleri", Type: "multiselect", OptionsSource: "Addition (+),Subtraction (-),Multiplication (*),Division (/)", DefaultValue: "Addition (+)" },
            { SettingName: "QrIrregularOps", DisplayName: "Fiil Soruları (Seçilenler Çıkar)", Type: "multiselect", OptionsSource: "V2 (Past Form),V3 (Past Participle),Meaning (Anlam)", DefaultValue: "V2 (Past Form),Meaning (Anlam)" },
            { SettingName: "QrCustomData", DisplayName: "Veri Girişi (Bağlantı URL veya Liste Metni)", Type: "custom-qr-data" },
            { SettingName: "QrMin", DisplayName: "Minimum Değer (Sayı/Mat)", Type: "number", DefaultValue: 1, Min: 1, Max: 1000 },
            { SettingName: "QrMax", DisplayName: "Maksimum Değer (Sayı/Mat)", Type: "number", DefaultValue: 100, Min: 1, Max: 1000 },
            { SettingName: "QrTimeType", DisplayName: "Saat Gösterimi", Type: "dropdown", OptionsSource: "Digital,Analog,Mixed", DefaultValue: "Mixed" }
        ];
        populateSetupForm(qrConfig);

        // Kategoriye Göre Form Filtreleme Mantığı
        setTimeout(() => {
            const catEl = document.getElementById('QrCategory');

            // --- Kendi Setini Oluştur Butonu Enjeksiyonu ---
            const setupFormObj = document.getElementById('dynamicSetupForm');
            if (setupFormObj && !document.getElementById('qrCustomSetModeBtn')) {
                const btn = document.createElement('button');
                btn.id = 'qrCustomSetModeBtn';
                btn.className = 'login-btn fade-in';
                btn.style = 'margin-bottom:15px; width:100%; background:var(--glass-bg); border: 2px dashed #10b981; color:#10b981; font-weight:bold; border-radius:12px; padding:10px; font-size:1.1rem; cursor:pointer; box-shadow:0 4px 15px rgba(16, 185, 129, 0.2);';
                btn.innerHTML = '✨ Kendi Görsel/Kelime Setini Oluştur';
                setupFormObj.prepend(btn);

                btn.onclick = (e) => {
                    e.preventDefault();
                    if (!catEl) return;
                    // Option Listesinde Yoksa Geçici Olarak Ekle
                    let customOpt = Array.from(catEl.options).find(o => o.value === 'Custom Image Set');
                    if (!customOpt) {
                        customOpt = document.createElement('option');
                        customOpt.value = 'Custom Image Set';
                        customOpt.textContent = 'Kendi Özel Setim';
                        catEl.appendChild(customOpt);
                    }
                    catEl.value = 'Custom Image Set';
                    const event = new Event('change');
                    catEl.dispatchEvent(event);
                };
            }
            // ---------------------------------------------

            function updateQrForm() {
                if (!catEl) return;
                const subCatGroup = document.getElementById('QrSubCategory')?.parentElement;
                const minGroup = document.getElementById('QrMin')?.parentElement;
                const maxGroup = document.getElementById('QrMax')?.parentElement;
                const timeGroup = document.getElementById('QrTimeType')?.parentElement;

                // MultiSelect elemanlarının bağlı olduğu form-group div'ini bul
                const mOpsInputs = document.querySelectorAll('input[name="QrMathOps"]');
                let mOpsGroup = null;
                if (mOpsInputs.length > 0) mOpsGroup = mOpsInputs[0].closest('.form-group');

                const iOpsInputs = document.querySelectorAll('input[name="QrIrregularOps"]');
                let iOpsGroup = null;
                if (iOpsInputs.length > 0) iOpsGroup = iOpsInputs[0].closest('.form-group');

                const customDataGroup = document.getElementById('QrCustomData')?.parentElement;

                const val = catEl.value;
                if (val === 'Time') {
                    if (subCatGroup) subCatGroup.style.display = 'none';
                    if (mOpsGroup) mOpsGroup.style.display = 'none';
                    if (iOpsGroup) iOpsGroup.style.display = 'none';
                    if (customDataGroup) customDataGroup.style.display = 'none';
                    if (minGroup) minGroup.style.display = 'none';
                    if (maxGroup) maxGroup.style.display = 'none';
                    if (timeGroup) timeGroup.style.display = 'block';
                } else if (val === 'Math Operations') {
                    if (subCatGroup) subCatGroup.style.display = 'none';
                    if (mOpsGroup) mOpsGroup.style.display = 'block';
                    if (iOpsGroup) iOpsGroup.style.display = 'none';
                    if (customDataGroup) customDataGroup.style.display = 'none';
                    if (minGroup) minGroup.style.display = 'block';
                    if (maxGroup) maxGroup.style.display = 'block';
                    if (timeGroup) timeGroup.style.display = 'none';
                } else if (val === 'Irregular Verbs') {
                    if (subCatGroup) subCatGroup.style.display = 'none';
                    if (mOpsGroup) mOpsGroup.style.display = 'none';
                    if (iOpsGroup) iOpsGroup.style.display = 'block';
                    if (customDataGroup) customDataGroup.style.display = 'none';
                    if (minGroup) minGroup.style.display = 'none';
                    if (maxGroup) maxGroup.style.display = 'none';
                    if (timeGroup) timeGroup.style.display = 'none';
                } else if (val === 'Custom Image Set') {
                    if (subCatGroup) subCatGroup.style.display = 'none';
                    if (mOpsGroup) mOpsGroup.style.display = 'none';
                    if (iOpsGroup) iOpsGroup.style.display = 'none';
                    if (customDataGroup) customDataGroup.style.display = 'block';
                    if (minGroup) minGroup.style.display = 'none';
                    if (maxGroup) maxGroup.style.display = 'none';
                    if (timeGroup) timeGroup.style.display = 'none';
                } else if (['Fruits', 'Body Parts', 'Public Buildings', 'Illnesses', 'Countries & Nationalities'].includes(val)) {
                    // Sadece Emoji/Resim gösterilecek kategoriler (Saf metin sorma mantığı)
                    if (subCatGroup) subCatGroup.style.display = 'none';
                    if (mOpsGroup) mOpsGroup.style.display = 'none';
                    if (iOpsGroup) iOpsGroup.style.display = 'none';
                    if (customDataGroup) customDataGroup.style.display = 'none';
                    if (minGroup) minGroup.style.display = 'none';
                    if (maxGroup) maxGroup.style.display = 'none';
                    if (timeGroup) timeGroup.style.display = 'none';
                } else {
                    // Numbers
                    if (subCatGroup) subCatGroup.style.display = 'block';
                    if (mOpsGroup) mOpsGroup.style.display = 'none';
                    if (iOpsGroup) iOpsGroup.style.display = 'none';
                    if (customDataGroup) customDataGroup.style.display = 'none';
                    if (minGroup) minGroup.style.display = 'block';
                    if (maxGroup) maxGroup.style.display = 'block';
                    if (timeGroup) timeGroup.style.display = 'none';
                }
            }
            if (catEl) {
                catEl.addEventListener('change', updateQrForm);
                updateQrForm(); // Initial state setup
            }
        }, 50);
    }
    // BAAMBOO ÖZEL YAMASI (APISİZ OFFLINE SETUP MOCKUP)
    else if (game.id === 'baamboo') {
        const setupFormObj = document.getElementById('dynamicSetupForm');
        setupFormObj.innerHTML = '<p style="color:white; text-align:center;">QPool Veritabanından Kademe ve Ders Seçenekleri Yükleniyor...</p>';

        if (typeof database !== 'undefined') {
            database.ref('MasterPool').orderByChild('Type').equalTo('qpool').once('value')
                .then(snapshot => {
                    let rows = [];
                    if (snapshot.exists()) {
                        const allData = snapshot.val();
                        Object.entries(allData).forEach(([setKey, set]) => {
                            rows.push({
                                id: setKey,
                                title: set.Title || "İsimsiz Set",
                                level: set.GlobalLevel || (set.Data && set.Data[0] ? set.Data[0].Level : "Tümü"),
                                cls: set.GlobalClass || (set.Data && set.Data[0] ? set.Data[0].ClassGrade : "Tümü"),
                                lesson: set.GlobalLesson || (set.Data && set.Data[0] ? set.Data[0].Lesson : "Tümü"),
                                topic: set.GlobalTopic || (set.Data && set.Data[0] ? set.Data[0].Topic : "Tümü"),
                                isMulti: set.SubType !== 'acik_uclu',
                                author: set.Author_ID,
                                isPublic: set.IsPublic === undefined ? true : set.IsPublic
                            });
                        });
                    }
                    window.bbRawData = rows;

                    const bbConfig = [
                        { SettingName: "SetPreference", DisplayName: "Set Tercihi", Type: "toggle", OptionsSource: "GamEdu Keşfet,Benim Setlerim", DefaultValue: "GamEdu Keşfet" },
                        { SettingName: "NumGroups", DisplayName: "Grup Sayısı", Type: "number", DefaultValue: 4, Min: 2, Max: 6 },
                        { SettingName: "BbCountdown", DisplayName: "Süre (Saniye)", Type: "number", DefaultValue: 15, Min: 10, Max: 120 },
                        { SettingName: "BbIsMultipleChoice", DisplayName: "Soru Tipi", Type: "toggle", OptionsSource: "Tümü,Çoktan Seçmeli,Açık Uçlu", DefaultValue: "Tümü" },
                        { SettingName: "BbLevel", DisplayName: "Kademe", Type: "dropdown", OptionsSource: "Tümü,İlkokul,Ortaokul,Lise", DefaultValue: "Tümü" },
                        { SettingName: "BbClass", DisplayName: "Sınıf", Type: "dropdown", OptionsSource: "Tümü", DefaultValue: "Tümü" },
                        { SettingName: "BbLesson", DisplayName: "Ders", Type: "dropdown", OptionsSource: "Tümü", DefaultValue: "Tümü" },
                        { SettingName: "BbSetsCheckbox", DisplayName: "Oynanacak Setler", Type: "multiselect", OptionsSource: "Seçim Bekleniyor", DefaultValue: "" }
                    ];

                    populateSetupForm(bbConfig);

                    // Dependent Dropdown İçin Event Listener'lar
                    setTimeout(() => {
                        const dPref = document.getElementById('SetPreference');
                        const prefContainer = dPref ? dPref.parentElement : null;

                        const dMul = document.getElementById('BbIsMultipleChoice');
                        const dLvl = document.getElementById('BbLevel');
                        const dCls = document.getElementById('BbClass');
                        const dLes = document.getElementById('BbLesson');
                        const cbContainer = document.getElementById('BbSetsCheckbox');
                        const btnStart = document.getElementById('startGameBtn');

                        // MEB Curriculum Updater for BaamBoo (similar to Global Config)
                        const updateMebFilters = () => {
                            if (!dLvl || !dCls || !dLes) return;
                            const val = dLvl.value;
                            let classOpts = ["Tümü"];
                            let lessonOpts = ["Tümü", "İngilizce", "Din Kültürü"];

                            if (val === "İlkokul") {
                                classOpts.push("1. Sınıf", "2. Sınıf", "3. Sınıf", "4. Sınıf");
                                lessonOpts.push("Türkçe", "Matematik", "Hayat Bilgisi", "Fen Bilimleri", "Sosyal Bilgiler");
                            } else if (val === "Ortaokul") {
                                classOpts.push("5. Sınıf", "6. Sınıf", "7. Sınıf", "8. Sınıf");
                                lessonOpts.push("Türkçe", "Matematik", "Fen Bilimleri", "Sosyal Bilgiler", "T.C. İnkılap Tarihi");
                            } else if (val === "Lise") {
                                classOpts.push("9. Sınıf", "10. Sınıf", "11. Sınıf", "12. Sınıf");
                                lessonOpts.push("Türk Dili ve Edebiyatı", "Matematik", "Fizik", "Kimya", "Biyoloji", "Tarih", "T.C. İnkılap Tarihi", "Coğrafya", "Felsefe");
                            } else {
                                classOpts.push("1. Sınıf", "2. Sınıf", "3. Sınıf", "4. Sınıf", "5. Sınıf", "6. Sınıf", "7. Sınıf", "8. Sınıf", "9. Sınıf", "10. Sınıf", "11. Sınıf", "12. Sınıf");
                                lessonOpts.push("Türkçe", "Türk Dili ve Edebiyatı", "Matematik", "Hayat Bilgisi", "Fen Bilimleri", "Sosyal Bilgiler", "Tarih", "T.C. İnkılap Tarihi", "Coğrafya", "Fizik", "Kimya", "Biyoloji", "Felsefe");
                            }

                            const prevClass = dCls.value;
                            const prevLesson = dLes.value;

                            dCls.innerHTML = classOpts.map(o => `<option value="${o}">${o}</option>`).join('');
                            dLes.innerHTML = lessonOpts.map(o => `<option value="${o}">${o}</option>`).join('');

                            if (classOpts.includes(prevClass)) dCls.value = prevClass;
                            if (lessonOpts.includes(prevLesson)) dLes.value = prevLesson;
                        };

                        function updateBbDropdowns(e) {
                            const changedId = e ? e.target.id : null;

                            const selPref = dPref ? dPref.value : "GamEdu Keşfet";
                            const selMul = dMul ? dMul.value : "Tümü";
                            const selLvl = dLvl ? dLvl.value : "Tümü";
                            let selCls = dCls ? dCls.value : "Tümü";
                            let selLes = dLes ? dLes.value : "Tümü";

                            let filtered = window.bbRawData || [];

                            // 1. SET TERCİHİ
                            if (selPref === "Benim Setlerim") {
                                if (currentUser) {
                                    filtered = filtered.filter(r => r.author === currentUser.uid);
                                } else {
                                    filtered = [];
                                }
                            } else {
                                filtered = filtered.filter(r => r.isPublic === true);
                            }

                            // Soru Tipi Filtresi
                            if (selMul === "Çoktan Seçmeli") filtered = filtered.filter(r => r.isMulti);
                            else if (selMul === "Açık Uçlu") filtered = filtered.filter(r => !r.isMulti);

                            // Seçili statik kriterlere göre (Kademe, Sınıf, Ders) data setini daralt
                            if (selLvl !== "Tümü") filtered = filtered.filter(r => r.level === selLvl);
                            if (selCls !== "Tümü") filtered = filtered.filter(r => r.cls === selCls);
                            if (selLes !== "Tümü") filtered = filtered.filter(r => r.lesson === selLes);

                            const cbCont = document.getElementById('BbSetsCheckbox');
                            if (cbCont) {
                                cbCont.innerHTML = '';
                                if (filtered.length === 0) {
                                    cbCont.innerHTML = '<span style="color:#ef4444; font-size:0.9rem;">Seçili kriterlere uygun set bulunamadı.</span>';
                                    if (btnStart) {
                                        btnStart.disabled = true;
                                        btnStart.textContent = 'Uygun Set Yok';
                                        btnStart.style.opacity = '0.5';
                                        btnStart.style.pointerEvents = 'none';
                                    }
                                } else {
                                    filtered.forEach(s => {
                                        const checkboxId = `BbSetsCheckbox_${s.id}`;
                                        const optContainer = document.createElement('label');
                                        optContainer.setAttribute('for', checkboxId);
                                        optContainer.style.cssText = "display:flex; align-items:center; gap:8px; background:rgba(255,255,255,0.05); padding:8px; border-radius:4px; margin-bottom:4px; font-weight:normal; font-size:0.9rem; cursor:pointer;";

                                        const checkbox = document.createElement('input');
                                        checkbox.type = 'checkbox';
                                        checkbox.id = checkboxId;
                                        checkbox.name = 'BbSetsCheckbox';
                                        checkbox.value = s.id;
                                        checkbox.checked = true; // Auto-check by default
                                        checkbox.style.cssText = "width:18px; height:18px; cursor:pointer;";

                                        optContainer.appendChild(checkbox);
                                        optContainer.appendChild(document.createTextNode(s.title));
                                        cbCont.appendChild(optContainer);
                                    });
                                    if (btnStart) {
                                        btnStart.disabled = false;
                                        btnStart.textContent = 'Oyunu Başlat';
                                        btnStart.style.opacity = '1';
                                        btnStart.style.pointerEvents = 'auto';
                                    }
                                }
                            }
                        }

                        if (dLvl) dLvl.addEventListener('change', () => {
                            updateMebFilters();
                            updateBbDropdowns();
                        });

                        if (prefContainer) prefContainer.addEventListener('click', () => { setTimeout(updateBbDropdowns, 50); });

                        // Because dMul is a toggle with 3 options, it might be rendered as multiple buttons by our config builder.
                        // Wait, if it's rendered as buttons, the select element itself is hidden. So we listen to click on its container.
                        const mulContainer = dMul ? dMul.parentElement : null;
                        if (mulContainer) mulContainer.addEventListener('click', () => { setTimeout(updateBbDropdowns, 50); });

                        if (dCls) dCls.addEventListener('change', updateBbDropdowns);
                        if (dLes) dLes.addEventListener('change', updateBbDropdowns);

                        updateMebFilters(); // First run to populate classes/lessons according to MEB
                        updateBbDropdowns(); // İlk kurulum tetiklemesi

                    }, 200);
                })
                .catch(e => {
                    showOzelAlert("QPool verileri Firebase'den okunurken bağlantı sorunu oluştu: " + e.message, "hata");
                });
        }
    }
    else if (game.id === 'dictionary') {
        const setupFormObj = document.getElementById('dynamicSetupForm');
        setupFormObj.innerHTML = '<p style="color:white; text-align:center;">WordsPool Veritabanından Kademe ve Ders Seçenekleri Yükleniyor...</p>';

        if (typeof database !== 'undefined') {
            database.ref('MasterPool').orderByChild('Type').equalTo('wordspool').once('value')
                .then(snapshot => {
                    let rows = [];
                    if (snapshot.exists()) {
                        const allData = snapshot.val();
                        Object.values(allData).forEach(set => {
                            // DİCTIONARY İÇİN İNGİLİZCE FİLTRESİ
                            let setGlobalLesson = (set.GlobalLesson || "").toLowerCase();
                            // Eğer setin genel dersi varsa ama içinde ingilizce veya english geçmiyorsa atla
                            if (setGlobalLesson && !setGlobalLesson.includes("ingilizce") && !setGlobalLesson.includes("eng")) {
                                return;
                            }

                            if (set.Data && Array.isArray(set.Data)) {
                                set.Data.forEach(item => {
                                    let itemLesson = (item.Lesson || "").toLowerCase();
                                    // Eğer kelime bazlı ders varsa ve içinde ingilizce geçmiyorsa atla
                                    if (itemLesson && !setGlobalLesson && !itemLesson.includes("ingilizce") && !itemLesson.includes("eng")) {
                                        return;
                                    }

                                    rows.push({
                                        cls: item.ClassGrade || item.Level || "Tümü",
                                        lesson: item.Lesson || set.GlobalLesson || "İngilizce",
                                        author: set.Author_ID,
                                        isPublic: set.IsPublic === undefined ? true : set.IsPublic
                                    });
                                });
                            }
                        });
                    }
                    window.dictRawData = rows;

                    const dictConfig = [
                        { SettingName: "SetPreference", DisplayName: "Set Tercihi", Type: "toggle", OptionsSource: "GamEdu Keşfet,Benim Setlerim", DefaultValue: "GamEdu Keşfet" },
                        { SettingName: "NumGroups", DisplayName: "Grup Sayısı", Type: "number", DefaultValue: 4, Min: 2, Max: 6 },
                        { SettingName: "WinTarget", DisplayName: "Kazanma Hedefi (Kaç Kelime)", Type: "number", DefaultValue: 3, Min: 1, Max: 10 },
                        { SettingName: "UseCustomNames", DisplayName: "Özel Grup/Öğrenci İsimleri", Type: "toggle", OptionsSource: "Hayır,Evet", DefaultValue: "Hayır" },
                        { SettingName: "CustomGroupNames", DisplayName: "İsimler (Virgüllerle Ayrılmış)", Type: "text", DefaultValue: "Örn: Ali, Ayşe, Fatma" },
                        { SettingName: "DictClass", DisplayName: "Sınıf / Kademe (Opsiyonel)", Type: "dropdown", OptionsSource: "Tümü,İlkokul,Ortaokul,Lise", DefaultValue: "Tümü" },
                        { SettingName: "DictLesson", DisplayName: "Ders (Opsiyonel)", Type: "dropdown", OptionsSource: "Tümü", DefaultValue: "Tümü" },
                        { SettingName: "DictUnitStart", DisplayName: "Başlangıç Ünitesi", Type: "number", DefaultValue: 1, Min: 1, Max: 50 },
                        { SettingName: "DictUnitEnd", DisplayName: "Bitiş Ünitesi", Type: "number", DefaultValue: 10, Min: 1, Max: 50 }
                    ];

                    populateSetupForm(dictConfig);
                    bindDictionaryCustomNamesToggle();

                    setTimeout(() => {
                        const dPref = document.getElementById('SetPreference');
                        const prefContainer = dPref ? dPref.parentElement : null;

                        const dCls = document.getElementById('DictClass');
                        const dLes = document.getElementById('DictLesson');
                        const btnStart = document.getElementById('startGameBtn');

                        function updateDictDropdowns(e) {
                            const changedId = e ? e.target.id : null;

                            const selPref = dPref ? dPref.value : "GamEdu Keşfet";
                            let selCls = dCls ? dCls.value : "Tümü";
                            let selLes = dLes ? dLes.value : "Tümü";

                            let filtered = window.dictRawData || [];

                            if (selPref === "Benim Setlerim") {
                                if (currentUser) {
                                    filtered = filtered.filter(r => r.author === currentUser.uid);
                                } else {
                                    filtered = [];
                                }
                            } else {
                                filtered = filtered.filter(r => r.isPublic === true);
                            }

                            if (filtered.length === 0) {
                                if (dCls) dCls.innerHTML = '<option value="Tümü">Kayıt Yok</option>';
                                if (dLes) dLes.innerHTML = '<option value="Tümü">Kayıt Yok</option>';
                                if (btnStart) {
                                    btnStart.disabled = true;
                                    btnStart.textContent = "Bu Tercihte Set Yok";
                                }
                                return;
                            } else {
                                if (btnStart) {
                                    btnStart.disabled = false;
                                    btnStart.textContent = "Oyunu Başlat";
                                }
                            }

                            // Kademe statik olduğu için DİNAMİK POPULATE EDİLMİYOR.
                            // if (changedId === 'SetPreference' || !changedId) { ... }

                            if (changedId === 'DictClass' || changedId === 'SetPreference' || !changedId) {
                                let fLes = filtered;
                                if (dCls && dCls.value !== "Tümü") fLes = fLes.filter(r => r.cls === dCls.value);
                                if (dLes) {
                                    const opts = ["Tümü", ...Array.from(new Set(fLes.map(r => r.lesson).filter(Boolean))).sort()];
                                    dLes.innerHTML = opts.map(t => `<option value="${t}">${t}</option>`).join('');
                                    if (opts.includes(selLes)) dLes.value = selLes; else { dLes.value = "Tümü"; selLes = "Tümü"; }
                                }
                            }
                        }

                        if (prefContainer) prefContainer.addEventListener('click', () => { setTimeout(updateDictDropdowns, 50); });
                        if (dCls) dCls.addEventListener('change', updateDictDropdowns);
                        if (dLes) dLes.addEventListener('change', updateDictDropdowns);

                        updateDictDropdowns();
                    }, 200);

                })
                .catch(e => {
                    showOzelAlert("WordsPool verileri okunurken bağlantı sorunu oluştu.", "hata");
                });
        }

        function bindDictionaryCustomNamesToggle() {
            setTimeout(() => {
                const toggleInp = document.getElementById('UseCustomNames');
                const textInp = document.getElementById('CustomGroupNames');
                if (toggleInp && textInp) {
                    const textGroup = textInp.closest('.form-group');
                    const updateVisibility = () => {
                        if (toggleInp.value === 'Evet') {
                            textGroup.style.display = 'block';
                        } else {
                            textGroup.style.display = 'none';
                        }
                    };
                    const parentToggle = toggleInp.parentElement;
                    parentToggle.addEventListener('click', () => { setTimeout(updateVisibility, 50); });
                    updateVisibility();
                }
            }, 100);
        }
    }
    else if (apiUrl && apiUrl.trim() !== '') {
        fetch(`${apiUrl}?api=true&action=getGameConfig&sheetName=${encodeURIComponent(configSheet)}`)
            .then(res => res.json())
            .then(data => {
                if (data && Array.isArray(data) && !data.error) {
                    if (game.id !== 'beecomb') { // BeeComb harici oyunlara zorunlu enjeksiyon

                        // Set Tercihi Toggle
                        data.unshift({
                            SettingName: "SetPreference",
                            DisplayName: "Set Tercihi",
                            Type: "toggle",
                            OptionsSource: "GamEdu,Benim Setlerim",
                            DefaultValue: "GamEdu"
                        });
                        // Kademe Statik
                        data.splice(1, 0, {
                            SettingName: "GlobalLevelFilter",
                            DisplayName: "Kademe",
                            Type: "dropdown",
                            OptionsSource: "Tümü,İlkokul,Ortaokul,Lise",
                            DefaultValue: "Tümü"
                        });

                        if (game.id !== 'lingo') {
                            // Bang ve QuickReveal için eski Sınıf alanlarını silip statik Dropdown ekle
                            data = data.filter(s => s.SettingName !== 'ClassGrades' && s.SettingName !== 'Lessons');

                            // Sınıf
                            data.splice(2, 0, {
                                SettingName: "GlobalClassFilter",
                                DisplayName: "Sınıf",
                                Type: "dropdown",
                                OptionsSource: "Tümü,1. Sınıf,2. Sınıf,3. Sınıf,4. Sınıf,5. Sınıf,6. Sınıf,7. Sınıf,8. Sınıf,9. Sınıf,10. Sınıf,11. Sınıf,12. Sınıf",
                                DefaultValue: "Tümü"
                            });
                            // Ders
                            data.splice(3, 0, {
                                SettingName: "GlobalLessonFilter",
                                DisplayName: "Ders",
                                Type: "dropdown",
                                OptionsSource: "Tümü,Türkçe,Türk Dili ve Edebiyatı,Matematik,Hayat Bilgisi,Fen Bilimleri,Sosyal Bilgiler,Tarih,T.C. İnkılap Tarihi,Coğrafya,Fizik,Kimya,Biyoloji,Felsefe,İngilizce,Din Kültürü",
                                DefaultValue: "Tümü"
                            });

                            // UnitStart/UnitEnd ve BbTopic temizliği
                            data = data.filter(s => !['UnitStart', 'UnitEnd', 'DictUnitStart', 'DictUnitEnd'].includes(s.SettingName));

                            // Oynanacak Setler Checkboksları
                            data.splice(4, 0, {
                                SettingName: "SelectedSets",
                                DisplayName: "Oynanacak Setler",
                                Type: "multiselect",
                                OptionsSource: "Yükleniyor...",
                                DefaultValue: ""
                            });
                        } else {
                            data = [
                                { SettingName: "SetPreference", DisplayName: "Set Tercihi", Type: "toggle", OptionsSource: "GamEdu,Benim Setlerim", DefaultValue: "GamEdu" },
                                { SettingName: "LingoFlow", DisplayName: "Oyun Akışı", Type: "toggle", OptionsSource: "Sıralı,Karışık", DefaultValue: "Karışık" },
                                { SettingName: "NumGroups", DisplayName: "Grup Sayısı", Type: "number", DefaultValue: 4, Min: 2, Max: 6 },
                                { SettingName: "GlobalLevelFilter", DisplayName: "Kademe", Type: "dropdown", OptionsSource: "Tümü,İlkokul,Ortaokul,Lise", DefaultValue: "Ortaokul" },
                                { SettingName: "GlobalLessonFilter", DisplayName: "Ders", Type: "dropdown", OptionsSource: "Tümü,Ortak,Türkçe,Türk Dili ve Edebiyatı,Matematik,Hayat Bilgisi,Fen Bilimleri,Sosyal Bilgiler,Tarih,T.C. İnkılap Tarihi,Coğrafya,Fizik,Kimya,Biyoloji,Felsefe,İngilizce,Din Kültürü", DefaultValue: "Tümü" },
                                { SettingName: "ClassGrades", DisplayName: "Sınıflar", Type: "multiselect", OptionsSource: "1. Sınıf,2. Sınıf,3. Sınıf,4. Sınıf,5. Sınıf,6. Sınıf,7. Sınıf,8. Sınıf,9. Sınıf,10. Sınıf,11. Sınıf,12. Sınıf,Ortak", DefaultValue: "Ortak" },
                                { SettingName: "WordLength4", DisplayName: "4 Harfli", Type: "number", DefaultValue: 3, Min: 0, Max: 20 },
                                { SettingName: "WordLength5", DisplayName: "5 Harfli", Type: "number", DefaultValue: 3, Min: 0, Max: 20 },
                                { SettingName: "WordLength6", DisplayName: "6 Harfli", Type: "number", DefaultValue: 3, Min: 0, Max: 20 },
                                { SettingName: "Countdown", DisplayName: "Süre (Sn)", Type: "number", DefaultValue: 15, Min: 5, Max: 60 }
                            ];
                        }
                    }

                    // Overrides for fetched external configs before rendering
                    data.forEach(s => {
                        if (s.SettingName === 'NumGroups') s.DisplayName = 'Grup Sayısı';
                        if (s.SettingName === 'WinningPoints') s.DisplayName = 'Puan';
                    });
                }
                populateSetupForm(data);

                setTimeout(() => {
                    const setupFormEl = document.getElementById('dynamicSetupForm');
                    if (setupFormEl) {
                        const getParent = (id) => { const el = document.getElementById(id); return el ? el.closest('.form-group') : null; };

                        if (game.id === 'bang') {
                            setupFormEl.style.display = 'grid';
                            setupFormEl.style.gridTemplateColumns = 'repeat(3, 1fr)';
                            setupFormEl.style.gap = '10px';
                            setupFormEl.style.alignItems = 'start';

                            const fPref = getParent('SetPreference');
                            const fWin = getParent('WinningPoints');
                            const fGrp = getParent('NumGroups');
                            if (fPref) { fPref.style.gridColumn = 'span 1'; setupFormEl.appendChild(fPref); }
                            if (fWin) { fWin.style.gridColumn = 'span 1'; setupFormEl.appendChild(fWin); }
                            if (fGrp) { fGrp.style.gridColumn = 'span 1'; setupFormEl.appendChild(fGrp); }

                            const fLvl = getParent('GlobalLevelFilter');
                            const fCls = getParent('GlobalClassFilter');
                            const fLes = getParent('GlobalLessonFilter');
                            if (fLvl) { fLvl.style.gridColumn = 'span 1'; setupFormEl.appendChild(fLvl); }
                            if (fCls) { fCls.style.gridColumn = 'span 1'; setupFormEl.appendChild(fCls); }
                            if (fLes) { fLes.style.gridColumn = 'span 1'; setupFormEl.appendChild(fLes); }

                            const fSets = getParent('SelectedSets');
                            if (fSets) { fSets.style.gridColumn = '1 / -1'; setupFormEl.appendChild(fSets); }
                        } else if (game.id === 'lingo') {
                            setupFormEl.style.display = 'grid';
                            setupFormEl.style.gridTemplateColumns = 'repeat(12, 1fr)';
                            setupFormEl.style.gap = '8px';
                            setupFormEl.style.alignItems = 'start';

                            const fPref = getParent('SetPreference');
                            const fFlow = getParent('LingoFlow');
                            const fGrp = getParent('NumGroups');
                            if (fPref) { fPref.style.gridColumn = 'span 4'; setupFormEl.appendChild(fPref); }
                            if (fFlow) { fFlow.style.gridColumn = 'span 4'; setupFormEl.appendChild(fFlow); }
                            if (fGrp) { fGrp.style.gridColumn = 'span 4'; setupFormEl.appendChild(fGrp); }

                            const fLvl = getParent('GlobalLevelFilter');
                            const fLes = getParent('GlobalLessonFilter');
                            if (fLvl) { fLvl.style.gridColumn = 'span 6'; setupFormEl.appendChild(fLvl); }
                            if (fLes) { fLes.style.gridColumn = 'span 6'; setupFormEl.appendChild(fLes); }

                            const fClass = getParent('ClassGrades');
                            if (fClass) {
                                fClass.style.gridColumn = '1 / -1';
                                const cbGroup = document.getElementById('ClassGrades');
                                if (cbGroup) {
                                    cbGroup.style.display = 'flex';
                                    cbGroup.style.flexWrap = 'wrap';
                                    cbGroup.style.gap = '15px';
                                }
                                setupFormEl.appendChild(fClass);
                            }

                            const fW4 = getParent('WordLength4');
                            const fW5 = getParent('WordLength5');
                            const fW6 = getParent('WordLength6');
                            const fTime = getParent('Countdown');
                            if (fW4) { fW4.style.gridColumn = 'span 3'; setupFormEl.appendChild(fW4); }
                            if (fW5) { fW5.style.gridColumn = 'span 3'; setupFormEl.appendChild(fW5); }
                            if (fW6) { fW6.style.gridColumn = 'span 3'; setupFormEl.appendChild(fW6); }
                            if (fTime) { fTime.style.gridColumn = 'span 3'; setupFormEl.appendChild(fTime); }
                        }
                    }
                }, 100);

                // --- GLOBAL DYNAMIC SET CHECKBOXES (API bazlı oyunlar için) ---
                if (game.id !== 'lingo' && game.id !== 'beecomb') {
                    if (typeof database !== 'undefined') {
                        database.ref('MasterPool').once('value').then(snap => {
                            let sets = [];
                            snap.forEach(child => {
                                let s = child.val();
                                sets.push({
                                    id: child.key,
                                    title: s.Title || "İsimsiz Set",
                                    type: s.Type,
                                    level: s.GlobalLevel || (s.Data && s.Data[0] ? s.Data[0].Level : "Tümü"),
                                    cls: s.GlobalClass || (s.Data && s.Data[0] ? s.Data[0].ClassGrade : "Tümü"),
                                    lesson: s.GlobalLesson || (s.Data && s.Data[0] ? s.Data[0].Lesson : "Tümü"),
                                    author: s.Author_ID,
                                    isPublic: s.IsPublic !== false
                                });
                            });
                            window.globalMasterSets = sets;
                            if (typeof window.updateGlobalCheckboxSets === 'function') {
                                window.updateGlobalCheckboxSets();
                            }
                        });

                        window.updateGlobalCheckboxSets = function () {
                            const cbContainer = document.getElementById('SelectedSets');
                            if (!cbContainer || !window.globalMasterSets) return;

                            const prefEl = document.getElementById('SetPreference') || { value: "GamEdu" };
                            const lvlEl = document.getElementById('GlobalLevelFilter') || { value: "Tümü" };
                            const clsEl = document.getElementById('GlobalClassFilter') || { value: "Tümü" };
                            const lesEl = document.getElementById('GlobalLessonFilter') || { value: "Tümü" };
                            const startBtn = document.getElementById('startGameBtn');

                            let filtered = window.globalMasterSets;
                            filtered = filtered.filter(s => s.type === 'wordspool');

                            if (prefEl.value === 'Benim Setlerim') {
                                filtered = filtered.filter(s => currentUser && s.author === currentUser.uid);
                            } else {
                                filtered = filtered.filter(s => s.isPublic);
                            }

                            if (lvlEl.value !== "Tümü") filtered = filtered.filter(s => s.level === lvlEl.value);
                            if (clsEl.value !== "Tümü") filtered = filtered.filter(s => s.cls === clsEl.value);
                            if (lesEl.value !== "Tümü") filtered = filtered.filter(s => s.lesson === lesEl.value);

                            cbContainer.innerHTML = '';
                            if (filtered.length === 0) {
                                cbContainer.innerHTML = '<span style="color:#ef4444; font-size:0.9rem;">Seçili kriterlere uygun set bulunamadı.</span>';
                                if (startBtn) {
                                    startBtn.disabled = true;
                                    startBtn.textContent = 'Uygun Set Yok';
                                    startBtn.style.opacity = '0.5';
                                    startBtn.style.pointerEvents = 'none';
                                }
                            } else {
                                filtered.forEach(s => {
                                    const checkboxId = `SelectedSets_${s.id}`;
                                    const optContainer = document.createElement('label');
                                    optContainer.setAttribute('for', checkboxId);
                                    optContainer.style.cssText = "display:flex; align-items:center; gap:8px; background:rgba(255,255,255,0.05); padding:8px; border-radius:4px; margin-bottom:4px; font-weight:normal; font-size:0.9rem; cursor:pointer;";

                                    const checkbox = document.createElement('input');
                                    checkbox.type = 'checkbox';
                                    checkbox.id = checkboxId;
                                    checkbox.name = 'SelectedSets';
                                    checkbox.value = s.id;
                                    checkbox.checked = true; // Auto-check by default
                                    checkbox.style.cssText = "width:18px; height:18px; cursor:pointer;";

                                    optContainer.appendChild(checkbox);
                                    optContainer.appendChild(document.createTextNode(s.title));
                                    cbContainer.appendChild(optContainer);
                                });
                                if (startBtn) {
                                    startBtn.disabled = false;
                                    startBtn.textContent = 'Oyunu Başlat';
                                    startBtn.style.opacity = '1';
                                    startBtn.style.pointerEvents = 'auto';
                                }
                            }
                        };

                        setTimeout(() => {
                            const prefCont = document.getElementById('SetPreference') ? document.getElementById('SetPreference').parentElement : null;
                            if (prefCont) prefCont.addEventListener('click', () => setTimeout(window.updateGlobalCheckboxSets, 50));

                            const l = document.getElementById('GlobalLevelFilter');
                            const c = document.getElementById('GlobalClassFilter');
                            const less = document.getElementById('GlobalLessonFilter');
                            if (l) l.addEventListener('change', window.updateGlobalCheckboxSets);
                            if (c) c.addEventListener('change', window.updateGlobalCheckboxSets);
                            if (less) less.addEventListener('change', window.updateGlobalCheckboxSets);
                        }, 500);
                    }
                }


                // MEB Sistemine Göre Kademe Değiştikçe Sınıf ve Dersleri Filtrele
                if (game.id !== 'beecomb') {
                    setTimeout(() => {
                        const levelEl = document.getElementById('GlobalLevelFilter');
                        const classEl = document.getElementById('GlobalClassFilter');
                        const lessonEl = document.getElementById('GlobalLessonFilter');

                        if (levelEl && lessonEl) {
                            const updateFilters = () => {
                                const val = levelEl.value;
                                let classOpts = ["Tümü"];
                                let lessonOpts = ["Tümü", "Ortak", "İngilizce", "Din Kültürü"]; // Ortak Dersler eklendi

                                if (val === "İlkokul") {
                                    classOpts.push("1. Sınıf", "2. Sınıf", "3. Sınıf", "4. Sınıf");
                                    lessonOpts.push("Türkçe", "Matematik", "Hayat Bilgisi", "Fen Bilimleri", "Sosyal Bilgiler");
                                } else if (val === "Ortaokul") {
                                    classOpts.push("5. Sınıf", "6. Sınıf", "7. Sınıf", "8. Sınıf");
                                    lessonOpts.push("Türkçe", "Matematik", "Fen Bilimleri", "Sosyal Bilgiler", "T.C. İnkılap Tarihi");
                                } else if (val === "Lise") {
                                    classOpts.push("9. Sınıf", "10. Sınıf", "11. Sınıf", "12. Sınıf");
                                    lessonOpts.push("Türk Dili ve Edebiyatı", "Matematik", "Fizik", "Kimya", "Biyoloji", "Tarih", "T.C. İnkılap Tarihi", "Coğrafya", "Felsefe");
                                } else {
                                    classOpts.push("1. Sınıf", "2. Sınıf", "3. Sınıf", "4. Sınıf", "5. Sınıf", "6. Sınıf", "7. Sınıf", "8. Sınıf", "9. Sınıf", "10. Sınıf", "11. Sınıf", "12. Sınıf");
                                    lessonOpts.push("Türkçe", "Türk Dili ve Edebiyatı", "Matematik", "Hayat Bilgisi", "Fen Bilimleri", "Sosyal Bilgiler", "Tarih", "T.C. İnkılap Tarihi", "Coğrafya", "Fizik", "Kimya", "Biyoloji", "Felsefe");
                                }

                                if (classEl) {
                                    const prevClass = classEl.value;
                                    classEl.innerHTML = classOpts.map(o => `<option value="${o}">${o}</option>`).join('');
                                    if (classOpts.includes(prevClass)) classEl.value = prevClass;
                                }

                                const prevLesson = lessonEl.value;
                                lessonEl.innerHTML = lessonOpts.map(o => `<option value="${o}">${o}</option>`).join('');
                                if (lessonOpts.includes(prevLesson)) lessonEl.value = prevLesson;

                                if (window.updateGlobalCheckboxSets) window.updateGlobalCheckboxSets();

                                // LİNGO DİNAMİK SINIF (CLASSGRADES) YAPISI
                                if (game.id === 'lingo') {
                                    const lingoClassContainer = document.getElementById('ClassGrades');
                                    if (lingoClassContainer) {
                                        lingoClassContainer.innerHTML = '';
                                        let checkboxOpts = classOpts.filter(c => c !== "Tümü");
                                        checkboxOpts.push("Ortak");

                                        checkboxOpts.forEach(opt => {
                                            const cbId = `ClassGrades_${opt.replace(/\s+/g, '')}`;
                                            const label = document.createElement('label');
                                            label.setAttribute('for', cbId);
                                            label.style.cssText = "display:flex; align-items:center; gap:8px; background:rgba(255,255,255,0.05); padding:8px 12px; border-radius:4px; font-size:0.9rem; cursor:pointer;";
                                            const cb = document.createElement('input');
                                            cb.type = 'checkbox';
                                            cb.id = cbId;
                                            cb.name = 'ClassGrades';
                                            cb.value = opt;
                                            if (opt === "Ortak") cb.checked = true;

                                            label.appendChild(cb);
                                            label.appendChild(document.createTextNode(opt));
                                            lingoClassContainer.appendChild(label);
                                        });
                                    }
                                }
                            };

                            levelEl.addEventListener('change', updateFilters);
                            // İlk kurulum anında 4'lü Checkbox sınıflarını listele
                            updateFilters();
                        }
                    }, 300);
                }
            })
            .catch(err => {
                const setupForm = document.getElementById('dynamicSetupForm');
                if (setupForm) setupForm.innerHTML = `<p style="color:red; width:100%; text-align:center;">Hata: ${err}</p>`;
            });
    } else {
        // Test ortamındaysa uydurma alanlar yerine gerçek Bang Config yapısını simüle et
        setTimeout(() => {
            const fakeConfig = [
                { SettingName: "NumGroups", DisplayName: "Grup Sayısı", Type: "number", DefaultValue: 4, Min: 2, Max: 6 },
                { SettingName: "ClassGrades", DisplayName: "Sınıf Seviyesi", Type: "multiselect", OptionsSource: "9. Sınıf, 10. Sınıf, 11. Sınıf, 12. Sınıf", DefaultValue: "9. Sınıf" },
                { SettingName: "WinningPoints", DisplayName: "Kazanma Puanı (Limit)", Type: "number", DefaultValue: 10, Min: 5, Max: 50 },
                { SettingName: "UnitStart", DisplayName: "Başlangıç Ünitesi", Type: "number", DefaultValue: 1, Min: 1, Max: 10 },
                { SettingName: "UnitEnd", DisplayName: "Bitiş Ünitesi", Type: "number", DefaultValue: 10, Min: 1, Max: 10 }
            ];
            populateSetupForm(fakeConfig);
        }, 1000);
    }
}

function populateSetupForm(config) {
    currentGameConfigData = config;
    const setupForm = document.getElementById('dynamicSetupForm');
    setupForm.innerHTML = '';

    if (config.error) {
        setupForm.innerHTML = `<p style="color:red; width:100%; text-align:center;">${config.error}</p>`;
        return;
    }

    if (config.length === 0) {
        setupForm.innerHTML = '<p style="width:100%; text-align:center;">Bu oyun için herhangi bir ayar bulunamadı. Direkt başlatabilirsiniz.</p>';
        return;
    }

    config.forEach(setting => {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        formGroup.style.display = 'flex';
        formGroup.style.flexDirection = 'column';
        formGroup.style.gap = '4px';
        formGroup.style.minWidth = '0';
        formGroup.style.width = '100%';

        const label = document.createElement('label');
        label.setAttribute('for', setting.SettingName);
        label.textContent = setting.DisplayName + ':';
        label.style.fontWeight = 'bold';
        label.style.fontSize = '0.85rem';
        label.style.marginBottom = '2px';
        formGroup.appendChild(label);

        let inputElement;

        switch (setting.Type) {
            case 'number':
                inputElement = document.createElement('input');
                inputElement.type = 'number';
                inputElement.id = setting.SettingName;
                inputElement.name = setting.SettingName;
                inputElement.style.width = '100%';
                inputElement.style.boxSizing = 'border-box';
                inputElement.value = setting.DefaultValue || '';
                if (setting.Min !== undefined && setting.Min !== null) inputElement.min = setting.Min;
                if (setting.Max !== undefined && setting.Max !== null) inputElement.max = setting.Max;
                break;

            case 'dropdown':
                inputElement = document.createElement('select');
                inputElement.id = setting.SettingName;
                inputElement.name = setting.SettingName;
                inputElement.style.width = '100%';
                inputElement.style.boxSizing = 'border-box';
                const options = setting.OptionsSource ? setting.OptionsSource.split(',') : [];
                options.forEach(optionText => {
                    const option = document.createElement('option');
                    option.value = optionText.trim();
                    option.textContent = optionText.trim();
                    if (optionText.trim() == setting.DefaultValue) {
                        option.selected = true;
                    }
                    inputElement.appendChild(option);
                });
                break;

            case 'multiselect':
                inputElement = document.createElement('div');
                inputElement.id = setting.SettingName;
                inputElement.className = 'checkbox-group';
                const multiOptions = setting.OptionsSource ? setting.OptionsSource.split(',') : [];
                const defaultValues = String(setting.DefaultValue).split(',').map(val => val.trim());

                multiOptions.forEach(optionText => {
                    const checkboxId = `${setting.SettingName}_${optionText.trim()} `;
                    const optContainer = document.createElement('label');
                    optContainer.setAttribute('for', checkboxId);

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.id = checkboxId;
                    checkbox.name = setting.SettingName;
                    checkbox.value = optionText.trim();
                    if (defaultValues.includes(optionText.trim())) {
                        checkbox.checked = true;
                    }

                    optContainer.appendChild(checkbox);
                    optContainer.appendChild(document.createTextNode(optionText.trim()));
                    inputElement.appendChild(optContainer);
                });
                break;

            case 'toggle': {
                inputElement = document.createElement('div');
                inputElement.className = 'toggle-container';
                inputElement.style.cssText = "display: flex; align-items: center; position: relative; background: rgba(0,0,0,0.2); border-radius: 30px; padding: 4px; border: 1px solid var(--glass-border); cursor: pointer; user-select: none; width: 100%; box-sizing: border-box;";

                const toggleOptions = setting.OptionsSource ? setting.OptionsSource.split(',') : ['Sıralı', 'Blok'];
                const val0 = toggleOptions[0] ? toggleOptions[0].trim() : 'Sıralı';
                const val1 = toggleOptions[1] ? toggleOptions[1].trim() : 'Blok';
                const isDefaultVal1 = (setting.DefaultValue == val1);

                // Gizli input (Backend'in veriyi okuyabilmesi için)
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.id = setting.SettingName;
                hiddenInput.name = setting.SettingName;
                hiddenInput.value = isDefaultVal1 ? val1 : val0;

                const slider = document.createElement('div');
                slider.className = 'toggle-slider';
                slider.style.cssText = `position: absolute; top: 3px; bottom: 3px; width: calc(50% - 3px); background: #3b82f6; border-radius: 25px; z-index: 1; transition: 0.3s; left: ${isDefaultVal1 ? 'calc(50% + 1.5px)' : '3px'};`;

                const opt0 = document.createElement('div');
                opt0.textContent = val0;
                opt0.style.cssText = `padding: 6px 4px; z-index: 2; transition: 0.3s; font-weight: bold; font-size: 0.8rem; text-align: center; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: ${isDefaultVal1 ? 'var(--text-muted)' : '#fff'};`;

                const opt1 = document.createElement('div');
                opt1.textContent = val1;
                opt1.style.cssText = `padding: 6px 4px; z-index: 2; transition: 0.3s; font-weight: bold; font-size: 0.8rem; text-align: center; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: ${isDefaultVal1 ? '#fff' : 'var(--text-muted)'};`;

                inputElement.appendChild(slider);
                inputElement.appendChild(opt0);
                inputElement.appendChild(opt1);
                inputElement.appendChild(hiddenInput);

                inputElement.addEventListener('click', () => {
                    if (hiddenInput.value === val0) {
                        hiddenInput.value = val1;
                        slider.style.left = 'calc(50% + 1.5px)';
                        opt0.style.color = "var(--text-muted)";
                        opt1.style.color = "#fff";
                    } else {
                        hiddenInput.value = val0;
                        slider.style.left = '3px';
                        opt0.style.color = "#fff";
                        opt1.style.color = "var(--text-muted)";
                    }
                });
                break;
            }

            case 'dynamic-dropdown': {
                inputElement = document.createElement('select');
                inputElement.id = setting.SettingName;
                inputElement.name = setting.SettingName;

                // HIZLANDIRMA (FAST-PATH): Eğer Config içerisinde Min ve Max önceden sabit girilmişse, API beklemeden anında yükle!
                if (setting.Min !== undefined && setting.Max !== undefined && setting.Min !== "" && setting.Max !== "") {
                    const minVal = parseInt(setting.Min);
                    const maxVal = parseInt(setting.Max);
                    for (let i = minVal; i <= maxVal; i++) {
                        const option = document.createElement('option');
                        option.value = i;
                        option.textContent = i;
                        if (i == setting.DefaultValue) option.selected = true;
                        inputElement.appendChild(option);
                    }
                } else {
                    // Eğer Min ve Max yoksaydı ve mutlaka WordsPool'dan tekil sayılar aranacaksa eski yavaş API metoduna dön.
                    inputElement.innerHTML = '<option value="">Yükleniyor...</option>';
                    // SPA Fetch API Entegrasyonu
                    const apiUrlDd = typeof AppConfig !== 'undefined' ? AppConfig.apiBaseUrl : '';
                    if (apiUrlDd && apiUrlDd.trim() !== '') {
                        fetch(`${apiUrlDd}?api=true&action=getUniqueUnits&optionsSource=${encodeURIComponent(setting.OptionsSource)}`)
                            .then(res => res.json())
                            .then(units => {
                                inputElement.innerHTML = '';
                                if (!units.error && Array.isArray(units)) {
                                    units.forEach(unit => {
                                        const option = document.createElement('option');
                                        option.value = unit; option.textContent = unit;
                                        if (unit == setting.DefaultValue) option.selected = true;
                                        inputElement.appendChild(option);
                                    });
                                } else {
                                    inputElement.innerHTML = '<option value="">Bulunamadı</option>';
                                }
                            })
                            .catch(err => {
                                inputElement.innerHTML = '<option value="">Hata</option>';
                            });
                    }
                }
                break;
            }

            case 'custom-qr-data': {
                // Sadece QuickReveal Custom Set için Ozel Textarea ve Yardım Butonu UI'ı
                const wrapper = document.createElement('div');
                wrapper.style.display = "flex";
                wrapper.style.flexDirection = "column";
                wrapper.style.gap = "10px";

                inputElement = document.createElement('textarea');
                inputElement.id = setting.SettingName;
                inputElement.name = setting.SettingName;
                inputElement.placeholder = "Google Sheets Web App Linkini (URL) VEYA 'Elma|resim-linki.jpg' şeklindeki satırlarınızı buraya yapıştırın...";
                inputElement.style.height = "100px";
                wrapper.appendChild(inputElement);

                const helpBtn = document.createElement('button');
                helpBtn.type = "button";
                helpBtn.className = "btn btn-primary";
                helpBtn.innerHTML = "<i class='fas fa-question-circle'></i> Nasıl Yüklerim? (Yardım Animasyonu)";
                helpBtn.style.marginTop = "5px";
                // Modalı açma eventi
                helpBtn.addEventListener('click', () => {
                    openQrTutorialModal();
                });
                wrapper.appendChild(helpBtn);

                formGroup.appendChild(wrapper);
                inputElement = null; // FormGroup'a wrapper olarak eklendi, aşağıda tekrar eklenmemesi için null geç.
                break;
            }

            default:
                inputElement = document.createElement('input');
                inputElement.type = 'text';
                inputElement.id = setting.SettingName;
                inputElement.name = setting.SettingName;
                inputElement.value = setting.DefaultValue || '';
                break;
        }

        if (inputElement) {
            formGroup.appendChild(inputElement);
        }
        setupForm.appendChild(formGroup);
    });
}

// SETUP BUTONLARI EVENT LISTENER
document.addEventListener('DOMContentLoaded', () => {

    // Lobiye Dön Butonu İşlevi
    const backBtn = document.getElementById('backToLobbyBtn');
    if (backBtn) {
        backBtn.addEventListener('click', goToLobby);
    }

    // Oyunu Başlat İşlevi (API'ye Gönderecek)
    const startBtn = document.getElementById('startGameBtn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            const formData = {};
            currentGameConfigData.forEach(setting => {
                const inputElement = document.getElementById(setting.SettingName);
                if (setting.Type === 'multiselect') {
                    const checkedValues = Array.from(document.querySelectorAll(`input[name="${setting.SettingName}"]:checked`))
                        .map(cb => cb.value);
                    formData[setting.SettingName] = checkedValues.join(',');
                } else if (inputElement) {
                    formData[setting.SettingName] = inputElement.value;
                }
            });

            // Girdi kontrolleri
            if (formData.UnitStart && formData.UnitEnd) {
                if (parseInt(formData.UnitStart) > parseInt(formData.UnitEnd)) {
                    showOzelAlert("Başlangıç ünitesi, bitiş ünitesinden büyük olamaz.", "hata");
                    return;
                }
            }
            const startBtnText = startBtn.textContent;
            startBtn.textContent = 'Başlatılıyor...';
            startBtn.disabled = true;

            // Oyun tipini ekle (Lingo veya Bang) - Backend bu sayede oyunu tanıyıp gereksiz listeleri çalıştırmaz
            formData.GameType = currentLoadedGame ? (currentLoadedGame.id || currentLoadedGame.GameName) : 'bang';

            // QUICKREVEAL İÇİN OFFLINE (API'SİZ) BAŞLATMA OVERRIDE
            if (formData.GameType === 'quickreveal') {
                startBtn.textContent = startBtnText;
                startBtn.disabled = false;
                document.getElementById('setupArea').style.display = 'none';

                const qrGameArea = document.getElementById('quickRevealGameArea');
                qrGameArea.style.display = 'block';
                qrGameArea.classList.remove('hidden-spa-module');
                QuickRevealEngine.init(formData);
                return; // Server'a istek atmayı iptal et
            }

            // BAAMBOO İÇİN BAŞLATMA OVERRIDE
            if (formData.GameType === 'baamboo') {
                startBtn.textContent = startBtnText;
                startBtn.disabled = false;
                document.getElementById('setupArea').style.display = 'none';

                const bbGameArea = document.getElementById('baambooGameArea');
                bbGameArea.style.display = 'block';
                bbGameArea.classList.remove('hidden-spa-module');
                if (typeof BaambooEngine !== 'undefined') {
                    BaambooEngine.init(formData);
                } else {
                    console.error("BaambooEngine yüklenemedi!");
                }
                return; // Normal oyun kurma rutinine istek atmayı iptal et
            }

            // DICTIONARY İÇİN BAŞLATMA OVERRIDE
            if (formData.GameType === 'dictionary') {
                startBtn.textContent = startBtnText;
                startBtn.disabled = false;
                document.getElementById('setupArea').style.display = 'none';

                const dictGameArea = document.getElementById('dictionaryGameArea');
                dictGameArea.style.display = 'block';
                dictGameArea.classList.remove('hidden-spa-module');
                if (typeof DictionaryEngine !== 'undefined') {
                    DictionaryEngine.init(formData);
                } else {
                    console.error("DictionaryEngine yüklenemedi!");
                }
                return;
            }

            const apiUrlStart = typeof AppConfig !== 'undefined' ? AppConfig.apiBaseUrl : '';
            if (apiUrlStart && apiUrlStart.trim() !== '') {
                fetch(apiUrlStart, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'startGame', formData: formData }),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                })
                    .then(res => res.json())
                    .then(response => {
                        startBtn.textContent = startBtnText;
                        startBtn.disabled = false;

                        if (response.error) {
                            showOzelAlert("Kurulum Hatası: " + response.error, "hata");
                        } else {
                            // API'nin ürettiği canli oyun sekmesini (Game_...) kaydet
                            currentGameSessionSheet = response.gameSheetName;

                            document.getElementById('setupArea').style.display = 'none';

                            if (currentLoadedGame && currentLoadedGame.id === "lingo") {
                                // Lingo Oyun Ekranı
                                const lingoGameArea = document.getElementById('lingoGameArea');
                                lingoGameArea.style.display = 'block';
                                lingoGameArea.classList.remove('hidden-spa-module');
                                document.getElementById('lingoPlayingGameTitle').textContent = currentLoadedGame.name || 'Lingo';
                                // Lingo oyunu için ayrı bir yükleme (Kelimeler bir kere gelecek)
                                loadInitialLingoState(response.gameSheetName);
                            } else if (currentLoadedGame && currentLoadedGame.id === "beecomb") {
                                // BeeComb Oyun Ekranı
                                const beeCombGameArea = document.getElementById('beeCombGameArea');
                                beeCombGameArea.style.display = 'block';
                                beeCombGameArea.classList.remove('hidden-spa-module');
                                BeeCombEngine.init(response.gameConfig);
                            } else {
                                // Varsayılan Bang Oyun Ekranı
                                const gameArea = document.getElementById('gameArea');
                                gameArea.style.display = 'block';
                                gameArea.classList.remove('hidden-spa-module');
                                document.getElementById('playingGameTitle').textContent = currentLoadedGame ? (currentLoadedGame.name || currentLoadedGame.GameName) : 'Oyun';
                                loadInitialGameState(response.gameSheetName);
                            }
                        }
                    })
                    .catch(error => {
                        startBtn.textContent = startBtnText;
                        startBtn.disabled = false;
                        showOzelAlert("Oyunu başlatırken bağlantı hatası: " + error, "hata");
                    });
            } else {
                // Apps script dışı test ortamı
                setTimeout(() => {
                    startBtn.textContent = startBtnText;
                    startBtn.disabled = false;

                    document.getElementById('setupArea').style.display = 'none';
                    const gameArea = document.getElementById('gameArea');
                    gameArea.style.display = 'block';
                    gameArea.classList.remove('hidden-spa-module');

                    document.getElementById('playingGameTitle').textContent = currentLoadedGame.name || 'Test Oyunu';

                    // Sahte bir test yüklemesi
                    updateGameUI({
                        winningPoints: 10,
                        currentWord: 'TEST KELİMESİ',
                        groupNames: ['Grup 1', 'Grup 2'],
                        scores: { 'Grup 1': 0, 'Grup 2': 0 },
                        activeGroup: 'Grup 1'
                    });
                }, 1000);
            }
        });
    }
});

// --- OYUN ALANI (GAME AREA) YARDIMCI FONKSİYONLARI ---


// Lobi Ekranına (Ana Ekrana) SPA Geçişi
function goToLobby() {
    const setupArea = document.getElementById('setupArea');
    if (setupArea) setupArea.style.display = 'none';

    const gameArea = document.getElementById('gameArea');
    if (gameArea) gameArea.style.display = 'none';

    const lingoGameArea = document.getElementById('lingoGameArea');
    if (lingoGameArea) lingoGameArea.style.display = 'none';

    const qrGameArea = document.getElementById('quickRevealGameArea');
    if (qrGameArea) qrGameArea.style.display = 'none';

    const bbGameArea = document.getElementById('baambooGameArea');
    if (bbGameArea) bbGameArea.style.display = 'none';

    const dictGameArea = document.getElementById('dictionaryGameArea');
    if (dictGameArea) dictGameArea.style.display = 'none';

    const welcomeHero = document.getElementById('welcomeHero');
    if (welcomeHero) welcomeHero.style.display = 'block';

    const gamesListArea = document.getElementById('gamesListArea');
    if (gamesListArea) gamesListArea.style.display = 'block';
}
/* Sistem Mesajları Kuralı: showOzelAlert Uygulaması */
function showOzelAlert(message, type, callback = null, defaultValue = "") {
    const overlay = document.getElementById('ozelAlertOverlay');
    const messageEl = document.getElementById('ozelAlertMessage');
    const iconEl = document.getElementById('ozelAlertIcon');
    const buttonsEl = document.getElementById('ozelAlertButtons');

    messageEl.innerHTML = message;
    buttonsEl.innerHTML = '';

    if (type === 'hata') { iconEl.innerHTML = '❌'; iconEl.style.color = '#ef4444'; }
    else if (type === 'bilgi') { iconEl.innerHTML = 'ℹ️'; iconEl.style.color = '#3b82f6'; }
    else if (type === 'onay' || type === 'evethayir') { iconEl.innerHTML = '❓'; iconEl.style.color = '#eab308'; }
    else if (type === 'prompt') { iconEl.innerHTML = '✏️'; iconEl.style.color = '#3b82f6'; }
    else { iconEl.innerHTML = '🔔'; iconEl.style.color = '#22c55e'; }

    if (type === 'evethayir') {
        const btnEvet = document.createElement('button');
        btnEvet.className = 'ozel-alert-btn btn-tamam'; btnEvet.innerText = 'Evet';
        btnEvet.onclick = () => { closeAlert(); if (callback) callback(true); };

        const btnHayir = document.createElement('button');
        btnHayir.className = 'ozel-alert-btn btn-hayir'; btnHayir.innerText = 'Hayır';
        btnHayir.onclick = () => { closeAlert(); if (callback) callback(false); };

        buttonsEl.appendChild(btnHayir); buttonsEl.appendChild(btnEvet);
    } else if (type === 'prompt') {
        const inputEl = document.createElement('input');
        inputEl.type = 'text';
        inputEl.value = defaultValue;
        inputEl.style.width = '100%';
        inputEl.style.padding = '10px';
        inputEl.style.marginTop = '15px';
        inputEl.style.borderRadius = '8px';
        inputEl.style.border = '1px solid var(--glass-border)';
        inputEl.style.background = 'rgba(0,0,0,0.3)';
        inputEl.style.color = '#fff';
        inputEl.style.fontSize = '1.1rem';

        messageEl.appendChild(inputEl);

        const btnTamam = document.createElement('button');
        btnTamam.className = 'ozel-alert-btn btn-tamam'; btnTamam.innerText = 'Kaydet';
        btnTamam.onclick = () => { closeAlert(); if (callback) callback(inputEl.value); };

        const btnIptal = document.createElement('button');
        btnIptal.className = 'ozel-alert-btn btn-hayir'; btnIptal.innerText = 'İptal';
        btnIptal.onclick = () => { closeAlert(); if (callback) callback(null); };

        buttonsEl.appendChild(btnIptal); buttonsEl.appendChild(btnTamam);

        // Input'a focus olmasını sağla
        setTimeout(() => inputEl.focus(), 100);
    } else {
        const btnTamam = document.createElement('button');
        btnTamam.className = 'ozel-alert-btn btn-tamam'; btnTamam.innerText = 'Tamam';
        btnTamam.onclick = () => { closeAlert(); if (callback) callback(true); };
        buttonsEl.appendChild(btnTamam);
    }
    overlay.classList.add('active');
}

function closeAlert() {
    document.getElementById('ozelAlertOverlay').classList.remove('active');
}

// ==========================================
// QUICK REVEAL - ÖĞRETMEN YARDIM (TUTORIAL) MODAL VE ANİMASYONU
// ==========================================
function openQrTutorialModal() {
    let tModal = document.getElementById('qrTutorialModal');
    if (!tModal) {
        tModal = document.createElement('div');
        tModal.id = 'qrTutorialModal';
        tModal.style.position = 'fixed';
        tModal.style.top = '0'; tModal.style.left = '0';
        tModal.style.width = '100vw'; tModal.style.height = '100vh';
        tModal.style.backgroundColor = 'rgba(0,0,0,0.85)';
        tModal.style.zIndex = '9999';
        tModal.style.display = 'flex';
        tModal.style.justifyContent = 'center';
        tModal.style.alignItems = 'center';

        const box = document.createElement('div');
        box.style.background = 'var(--card-bg)';
        box.style.border = '1px solid var(--glass-border)';
        box.style.borderRadius = 'var(--radius)';
        box.style.padding = '2rem';
        box.style.maxWidth = '800px';
        box.style.width = '90%';
        box.style.maxHeight = '90vh';
        box.style.overflowY = 'auto';
        box.style.boxShadow = '0 25px 50px -12px rgba(0,0,0,0.5)';
        box.style.position = 'relative';

        box.innerHTML = `
    < button id = "closeQrModalBtn" style = "position:absolute; top:15px; right:15px; background:transparent; border:none; color:var(--text-color); font-size:1.5rem; cursor:pointer;" > <i class="fas fa-times"></i></button >
            <h2 style="color:var(--primary-color); margin-bottom:1rem; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:10px;"><i class="fas fa-magic"></i> Kendi Listenizi Nasıl Yüklersiniz?</h2>
            
            <p style="color:var(--text-muted); margin-bottom:1.5rem;">Sadece 3 adımda öğrencilerinize özel oyununuz hazır! En pratik yol olan <b>Özel Metin Listesi</b> veya <b>Google Sheets</b> kullanabilirsiniz.</p>

            <div style="display:flex; gap:20px; flex-wrap:wrap;">
                
                <!-- YOL 1: METİN İLE -->
                <div style="flex:1; min-width:300px; background:rgba(0,0,0,0.2); border-radius:12px; padding:1.5rem; border:1px solid var(--glass-border);">
                    <h3 style="color:#6ee7b7; margin-bottom:1rem;"><i class="fas fa-keyboard"></i> Yöntem 1: Basit Metin (Hızlı)</h3>
                    <p style="font-size:0.9rem;">Elinizdeki listeyi <b>Kelime|ResimURLsi</b> formatında (araya altgr+< basarak dik çizgi koyarak) aşağıdaki gibi alt alta yazıp kopyalayın ve az önceki siyah kutuya yapıştırın.</p>
                    <div style="background:#1e293b; padding:10px; border-radius:8px; font-family:monospace; color:#a78bfa; margin-top:10px; font-size:0.85rem;">
                        Apple | https://site.com/elma.jpg<br>
                        School | https://site.com/okul.png<br>
                        Running | https://site.com/kosu.gif
                    </div>
                </div>

                <!-- YOL 2: GOOGLE SHEETS İLE -->
                <div style="flex:1; min-width:300px; background:rgba(0,0,0,0.2); border-radius:12px; padding:1.5rem; border:1px solid var(--glass-border);">
                    <h3 style="color:#fcd34d; margin-bottom:1rem;"><i class="fas fa-table"></i> Yöntem 2: Google Sheets (Önerilen)</h3>
                    <p style="font-size:0.9rem;">Sizin için hazırladığımız özel taslak E-Tablo'yu kopyalayın, kelimelerinizi ve resim linklerinizi hücrelere girin.</p>
                    <button id="qrCopyTemplateBtn" class="btn btn-primary" style="margin-top:10px; width:100%;"><i class="fas fa-external-link-alt"></i> Şablon E-Tablo'ya Git</button>
                    <ul style="margin-top:15px; font-size:0.85rem; padding-left:20px; color:#cbd5e1;">
                        <li style="margin-bottom:5px;"><b>Dosya -> Kopyasını Çıkar</b> diyerek kendi Drive'nıza alın.</li>
                        <li style="margin-bottom:5px;">İçini kendinize göre doldurun.</li>
                        <li style="margin-bottom:5px;">Sağ üstten <b>Paylaş -> Bağlantıya sahip olan herkes</b> ayarını yapın ve URL'yi kopyalayıp buraya yapıştırın.</li>
                    </ul>
                </div>
            </div>

            <!-- SIMULATION AREA -->
            <div style="margin-top:2rem; text-align:center;">
                <h4 style="margin-bottom:1rem; color:var(--text-color);">Nasıl Yapıldığını İzleyin</h4>
                <div id="qrSimulationBox" style="position:relative; width:400px; height:200px; margin:0 auto; background:#1e293b; border-radius:8px; overflow:hidden; border:2px solid #475569;">
                    <!-- Simülasyon Elemanları CSS ile canlandırılacak -->
                    <div id="simHeader" style="background:#0f172a; padding:5px; text-align:left; color:#94a3b8; font-size:10px;">docs.google.com/spreadsheets...</div>
                    <div style="display:flex; padding:5px; border-bottom:1px solid #334155; font-size:12px;">
                        <div style="flex:1; border-right:1px solid #334155; padding-left:5px;">Word</div>
                        <div style="flex:2; padding-left:5px;">Image URL</div>
                    </div>
                    <div style="display:flex; padding:5px; border-bottom:1px solid #334155; font-size:12px;">
                        <div style="flex:1; border-right:1px solid #334155; padding-left:5px;">Apple</div>
                        <div style="flex:2; padding-left:5px; color:#3b82f6;">http://ornek.com/elma.jpg</div>
                    </div>
                    <div style="display:flex; padding:5px; border-bottom:1px solid #334155; font-size:12px;">
                        <div style="flex:1; border-right:1px solid #334155; padding-left:5px;">Dog</div>
                        <div style="flex:2; padding-left:5px; color:#3b82f6;">http://ornek.com/kopek.png</div>
                    </div>
                    
                    <!-- Mouse Cursor (Animated) -->
                    <div id="simCursor" style="position:absolute; top:150px; left:250px; width:15px; height:20px; transition:all 1.5s ease; z-index:10; font-size:20px;">🖱️</div>
                    
                    <!-- Simülasyon State Yazısı -->
                    <div id="simText" style="position:absolute; bottom:10px; right:10px; background:rgba(0,0,0,0.7); padding:5px 10px; border-radius:5px; font-size:0.8rem; color:#fff;">1) Listeyi Hazırla</div>
                </div>
            </div>
        `;

        tModal.appendChild(box);
        document.body.appendChild(tModal);

        document.getElementById('closeQrModalBtn').addEventListener('click', () => {
            tModal.style.display = 'none';
        });

        document.getElementById('qrCopyTemplateBtn').addEventListener('click', () => {
            // Opsiyonel: Sizin oluşturacağınız Şablon Sheetin Linki Boş Halde Veriliyor
            showOzelAlert("Veritabanı oluşturucumuz çok yakında Google Drive entegrasyonuyla yayında olacak!", "bilgi");
        });

        // Simülasyon Döngüsü (Animation Loop)
        setInterval(playQrSimulation, 6000);
        setTimeout(playQrSimulation, 500); // İlkini hemen başlat
    } else {
        tModal.style.display = 'flex';
    }
}

let simStep = 0;
function playQrSimulation() {
    const cursor = document.getElementById('simCursor');
    const simText = document.getElementById('simText');
    const simHeader = document.getElementById('simHeader');

    if (!cursor || !simText || !simHeader) return;

    if (simStep === 0) {
        cursor.style.left = "40px";
        cursor.style.top = "60px";
        simText.innerText = "1) Tabloyu kelimeler ve bağlantılarla doldur";
        simHeader.style.background = "#0f172a";
        simHeader.style.color = "#94a3b8";
        simStep = 1;
    }
    else if (simStep === 1) {
        cursor.style.left = "300px";
        cursor.style.top = "10px";
        simText.innerText = "2) Paylaş butonu -> URL'yi Kopyala";
        simHeader.style.background = "#3b82f6"; // Seçili hissi
        simHeader.style.color = "#fff";
        simStep = 2;
    }
    else if (simStep === 2) {
        cursor.style.left = "150px";
        cursor.style.top = "100px";
        simText.innerText = "3) Ayarlardaki siyah kutuya yapıştır!";
        simHeader.style.background = "#0f172a";
        simHeader.style.color = "#94a3b8";
        simStep = 0; // Başa dön
    }
}

// --- YENİ EKLENEN KADEME/SINIF DİNAMİK LİSTELEYİCİSİ (YENİ SET EKLE & CRUD MODAL İÇİN) ---
document.addEventListener('DOMContentLoaded', () => {
    const bindKademeClassSelects = (kademeId, classId) => {
        const kademeEl = document.getElementById(kademeId);
        const classEl = document.getElementById(classId);

        if (!kademeEl || !classEl) return;

        const applyKademeFilter = () => {
            const val = kademeEl.value;
            let classOpts = [];

            if (val === "İlkokul") {
                classOpts = ["1. Sınıf", "2. Sınıf", "3. Sınıf", "4. Sınıf", "Ortak"];
            } else if (val === "Ortaokul") {
                classOpts = ["5. Sınıf", "6. Sınıf", "7. Sınıf", "8. Sınıf", "Ortak"];
            } else if (val === "Lise") {
                classOpts = ["9. Sınıf", "10. Sınıf", "11. Sınıf", "12. Sınıf", "Ortak"];
            } else {
                classOpts = ["1. Sınıf", "2. Sınıf", "3. Sınıf", "4. Sınıf", "5. Sınıf", "6. Sınıf", "7. Sınıf", "8. Sınıf", "9. Sınıf", "10. Sınıf", "11. Sınıf", "12. Sınıf", "Ortak"];
            }

            const currentVal = classEl.value;
            classEl.innerHTML = '<option value="">Sınıf Seçiniz</option>' + classOpts.map(o => `<option value="${o}">${o}</option>`).join('');

            // Eğer önceki seçim yeni listede varsa onu koru
            if (classOpts.includes(currentVal)) {
                classEl.value = currentVal;
            }
        };

        kademeEl.addEventListener('change', applyKademeFilter);
        applyKademeFilter(); // Başlangıçta 1 kez çalıştır
    };

    // İlgili dropdown'ları çalıştır
    setTimeout(() => {
        bindKademeClassSelects('setKademeSelect', 'setClassGradeSelect');
        bindKademeClassSelects('modalGlobalLevel', 'modalGlobalClass');
        bindKademeClassSelects('globalFilterGrade', 'globalFilterClass');
        bindKademeClassSelects('mySetsFilterGrade', 'mySetsFilterClass');
    }, 500); // DOM yüklenmelerine karşı güvenli aralık
});

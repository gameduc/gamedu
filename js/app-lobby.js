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
    else if (type === 'none') { iconEl.innerHTML = ''; }
    else { iconEl.innerHTML = ''; } // Zil ikonu kaldırıldı, varsayılan boş

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
            if (game.id === 'tagwar') {
                // Özel olarak tug of war kare görselinin kutuya kesilmeden sığmasını sağlıyoruz
                card.style.setProperty('background-size', 'contain', 'important');
                card.style.setProperty('background-position', 'center top', 'important');
            }
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

function openGameSetup(game) {
    window.currentGameObj = game;
    currentLoadedGame = game; // Bütün oyunların GameType referansını doğrulayan yama.

    document.getElementById('gamesListArea').style.display = 'none';
    const setupArea = document.getElementById('setupArea');
    setupArea.style.display = 'block';
    setupArea.classList.remove('hidden-spa-module');

    document.getElementById('setupGameTitle').textContent = game.name || game.GameName || 'Oyun Kurulumu';
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
                            // DİCTIONARY İÇİN İNGİLİZCE FİLTRESİ (geniş eşleştirme)
                            const ingRegex = /ing|eng|ingilizce|english|İng|İngilizce/i;
                            let setGlobalLesson = set.GlobalLesson || "";
                            // Set düzeyinde ders adı varsa ama İngilizceyle ilgili değilse atla
                            if (setGlobalLesson && !ingRegex.test(setGlobalLesson)) {
                                return;
                            }

                            if (set.Data && Array.isArray(set.Data)) {
                                set.Data.forEach(item => {
                                    let itemLesson = (item.Lesson || "").toLowerCase();
                                    // Kelime bazlı ders varsa ve İngilizceyle ilgili değilse atla
                                    if (itemLesson && !setGlobalLesson && !ingRegex.test(itemLesson)) {
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
    else if (game.id === 'trivia') {
        const setupFormObj = document.getElementById('dynamicSetupForm');
        setupFormObj.innerHTML = '<p style="color:white; text-align:center;">Trivia Setleri Yükleniyor...</p>';

        if (typeof database !== 'undefined') {
            database.ref('MasterPool').once('value')
                .then(snapshot => {
                    let rows = [];
                    if (snapshot.exists()) {
                        const allData = snapshot.val();
                        Object.entries(allData).forEach(([setKey, set]) => {
                            if (set.Type === 'trivia' || set.Type === 'wordspool' || set.Type === 'qpool') {
                                rows.push({
                                    id: setKey,
                                    title: set.Title || "İsimsiz Set",
                                    type: set.Type || "wordspool",
                                    subType: set.SubType || "coktan_secmeli",
                                    author: set.Author_ID,
                                    isPublic: set.IsPublic === undefined ? true : set.IsPublic,
                                    level: set.GlobalLevel || "Tümü",
                                    cls: set.GlobalClass || "Tümü",
                                    lesson: set.GlobalLesson || "Tümü"
                                });
                            }
                        });
                    }
                    window.triviaRawData = rows;

                    const triviaConfig = [
                        { SettingName: "TriviaGameMode", DisplayName: "Oyun Modu", Type: "toggle", OptionsSource: "PIN ile Canlı Oyun,Akıllı Tahta Düellosu", DefaultValue: "PIN ile Canlı Oyun" },
                        { SettingName: "TriviaSource", DisplayName: "İçerik Kaynağı", Type: "toggle", OptionsSource: "Hazır Trivia Setleri,Mevcut Soru/Kelime Havuzundan Üret", DefaultValue: "Hazır Trivia Setleri" },
                        { SettingName: "SetPreference", DisplayName: "Set Havuzu", Type: "dropdown", OptionsSource: "GamEdu Keşfet,Benim Setlerim", DefaultValue: "GamEdu Keşfet" },
                        { SettingName: "GlobalLevelFilter", DisplayName: "Kademe", Type: "dropdown", OptionsSource: "Tümü,İlkokul,Ortaokul,Lise", DefaultValue: "Tümü" },
                        { SettingName: "GlobalClassFilter", DisplayName: "Sınıf", Type: "dropdown", OptionsSource: "Tümü,1. Sınıf,2. Sınıf,3. Sınıf,4. Sınıf,5. Sınıf,6. Sınıf,7. Sınıf,8. Sınıf,9. Sınıf,10. Sınıf,11. Sınıf,12. Sınıf", DefaultValue: "Tümü" },
                        { SettingName: "GlobalLessonFilter", DisplayName: "Ders", Type: "dropdown", OptionsSource: "Tümü,Türkçe,Türk Dili ve Edebiyatı,Matematik,Hayat Bilgisi,Fen Bilimleri,Sosyal Bilgiler,Tarih,T.C. İnkılap Tarihi,Coğrafya,Fizik,Kimya,Biyoloji,Felsefe,İngilizce,Din Kültürü", DefaultValue: "Tümü" },
                        { SettingName: "TriviaSetsCheckbox", DisplayName: "Seçilebilir Setler (Tek Seçim)", Type: "multiselect", OptionsSource: "Seçim Bekleniyor", DefaultValue: "" }
                    ];

                    populateSetupForm(triviaConfig);

                    setTimeout(() => {
                        const dynamicForm = document.getElementById('dynamicSetupForm');
                        if (dynamicForm && !document.getElementById('openTriviaEditorBtn_main')) {
                            const btn = document.createElement('button');
                            btn.id = 'openTriviaEditorBtn_main';
                            btn.className = 'login-btn fade-in';
                            btn.style = 'margin-bottom:15px; width:100%; background:var(--glass-bg); border: 2px dashed #8b5cf6; color:#a78bfa; font-weight:bold; border-radius:12px; padding:10px; font-size:1.1rem; cursor:pointer; box-shadow:0 4px 15px rgba(139, 92, 246, 0.2);';
                            btn.innerHTML = '✨ Sıfırdan Yeni Karma Trivia Seti Oluştur (Editör)';
                            dynamicForm.prepend(btn);

                            btn.onclick = (e) => {
                                e.preventDefault();
                                // Önceki setten kalan verileri SIFIRLA
                                window.triviaQuestions = [];
                                window.activeTriviaQuestionId = null;
                                if (window.TriviaEditor) {
                                    document.getElementById('gameTitleInput').value = '';
                                    TriviaEditor.renderQuestionsList();
                                    TriviaEditor.showEmptyState();
                                }
                                document.getElementById('triviaEditorModal').classList.add('active');
                                if (typeof initTriviaEditor === 'function') initTriviaEditor();
                            };
                        }

                        // Checkbox filtreleme
                        const pref = document.getElementById('SetPreference');
                        const sourceToggle = document.getElementById('TriviaSource');
                        const lvlEl = document.getElementById('GlobalLevelFilter');
                        const clsEl = document.getElementById('GlobalClassFilter');
                        const lesEl = document.getElementById('GlobalLessonFilter');
                        const cbContainer = document.getElementById('TriviaSetsCheckbox');
                        const startBtn = document.getElementById('startGameBtn');

                        function updateTriviaDropdowns() {
                            let filtered = window.triviaRawData || [];
                            const isAutoProduce = sourceToggle && sourceToggle.value === 'Mevcut Soru/Kelime Havuzundan Üret';

                            // 1. Tip Filtresi
                            if (isAutoProduce) {
                                filtered = filtered.filter(r => r.type === 'wordspool' || r.type === 'qpool');
                                if (startBtn) startBtn.innerHTML = "Otomatik Üret ve Başlat";
                            } else {
                                filtered = filtered.filter(r => r.type === 'trivia');
                                if (startBtn) startBtn.innerHTML = "Seçili Trivia Oyununu Başlat";
                            }

                            // 2. Sahip Filtresi
                            if (pref && pref.value === "Benim Setlerim") {
                                if (typeof currentUser !== 'undefined' && currentUser) {
                                    filtered = filtered.filter(r => r.author === currentUser.uid);
                                } else {
                                    filtered = [];
                                }
                            } else {
                                filtered = filtered.filter(r => r.isPublic === true);
                            }

                            // 3. DD Filtreleri (Kademe, Sınıf, Ders)
                            if (lvlEl && lvlEl.value !== "Tümü") filtered = filtered.filter(s => s.level === lvlEl.value);
                            if (clsEl && clsEl.value !== "Tümü") filtered = filtered.filter(s => s.cls === clsEl.value);
                            if (lesEl && lesEl.value !== "Tümü") filtered = filtered.filter(s => s.lesson === lesEl.value);

                            if (cbContainer) {
                                if (filtered.length === 0) {
                                    cbContainer.innerHTML = '<span style="color:#ef4444; font-size:0.9rem;">Bu kategoride set bulunamadı.</span>';
                                } else {
                                    // Sadece Tek Bir Radio button oluştur (Tek Seçim)
                                    cbContainer.innerHTML = filtered.map(s =>
                                        '<label style="display:flex; align-items:center; gap:8px; padding:8px; background:rgba(0,0,0,0.3); border-radius:6px; margin-bottom:5px; cursor:pointer;">' +
                                        '<input type="radio" name="TriviaSetsCheckbox" value="' + s.id + '" style="cursor:pointer;" ' + (filtered.length === 1 ? "checked" : "") + '>' +
                                        '<span style="color:#fff;">' + s.title + ' <small style="color:#94a3b8; font-size:0.75rem;">(' + s.type.toUpperCase() + ')</small></span></label>'
                                    ).join('');
                                }
                            }
                        }

                        if (pref) pref.addEventListener('change', updateTriviaDropdowns);
                        if (lvlEl) lvlEl.addEventListener('change', updateTriviaDropdowns);
                        if (clsEl) clsEl.addEventListener('change', updateTriviaDropdowns);
                        if (lesEl) lesEl.addEventListener('change', updateTriviaDropdowns);
                        if (sourceToggle && sourceToggle.parentElement) sourceToggle.parentElement.addEventListener('click', () => { setTimeout(updateTriviaDropdowns, 50); });
                        updateTriviaDropdowns();

                    }, 200);
                });
        }
    }
    else if (game.id === 'tagwar') {
        const tagWarConfig = [
            { SettingName: "TagGameType", DisplayName: "Oyun Türü", Type: "toggle", OptionsSource: "Matematik,Kelime Dağarcığı", DefaultValue: "Matematik" },
            { SettingName: "TagMode", DisplayName: "Oyun Modu", Type: "toggle", OptionsSource: "Zaman Yarışı,Hız Düellosu", DefaultValue: "Zaman Yarışı" },
            { SettingName: "TagMathOperations", DisplayName: "İşlem Türü (Mat)", Type: "multiselect", OptionsSource: "Toplama, Çıkarma, Çarpma, Bölme, Üslü Sayılar", DefaultValue: "Toplama, Çıkarma" },
            { SettingName: "TagMathDifficulty", DisplayName: "Zorluk (Mat)", Type: "dropdown", OptionsSource: "1. Sınıf (Kolay),2. Sınıf (Orta),3-4. Sınıf (Zor),Ortaokul (Uzman)", DefaultValue: "1. Sınıf (Kolay)" },
            { SettingName: "TagDuration", DisplayName: "Oyun Süresi (Saniye)", Type: "number", DefaultValue: 60, Min: 30, Max: 300 },
            { SettingName: "TagWinningScore", DisplayName: "Hedef Puan (Düello)", Type: "number", DefaultValue: 20, Min: 5, Max: 100 },
            { SettingName: "SetPreference", DisplayName: "Set Tercihi", Type: "toggle", OptionsSource: "GamEdu,Benim Setlerim", DefaultValue: "GamEdu" },
            { SettingName: "GlobalLevelFilter", DisplayName: "Kademe", Type: "dropdown", OptionsSource: "Tümü,İlkokul,Ortaokul,Lise", DefaultValue: "Tümü" },
            { SettingName: "GlobalClassFilter", DisplayName: "Sınıf", Type: "dropdown", OptionsSource: "Tümü,1. Sınıf,2. Sınıf,3. Sınıf,4. Sınıf,5. Sınıf,6. Sınıf,7. Sınıf,8. Sınıf,9. Sınıf,10. Sınıf,11. Sınıf,12. Sınıf", DefaultValue: "Tümü" },
            { SettingName: "GlobalLessonFilter", DisplayName: "Ders", Type: "dropdown", OptionsSource: "Tümü,Türkçe,Türk Dili ve Edebiyatı,Matematik,Hayat Bilgisi,Fen Bilimleri,Sosyal Bilgiler,Tarih,T.C. İnkılap Tarihi,Coğrafya,Fizik,Kimya,Biyoloji,Felsefe,İngilizce,Din Kültürü", DefaultValue: "Tümü" },
            { SettingName: "DisplayMode", DisplayName: "Kart Gösterimi", Type: "dropdown", OptionsSource: "Kelime,Türkçe Anlam,İngilizce Anlam", DefaultValue: "Kelime" },
            { SettingName: "SelectedSets", DisplayName: "Oynanacak Setler", Type: "multiselect", OptionsSource: "Yükleniyor...", DefaultValue: "" }
        ];
        populateSetupForm(tagWarConfig);

        // Fetch Firebase word sets globally for Tag War as well
        if (typeof database !== 'undefined') {
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
                    if (typeof currentUser !== 'undefined' && currentUser) {
                        filtered = filtered.filter(s => s.author === currentUser.uid);
                    } else {
                        filtered = [];
                    }
                } else {
                    filtered = filtered.filter(s => s.isPublic);
                }

                if (lvlEl.value !== "Tümü") filtered = filtered.filter(s => s.level === lvlEl.value);
                if (clsEl.value !== "Tümü") filtered = filtered.filter(s => s.cls === clsEl.value);
                if (lesEl.value !== "Tümü") filtered = filtered.filter(s => s.lesson === lesEl.value);

                const dispModeEl = document.getElementById('DisplayMode');
                if (dispModeEl && dispModeEl.value === 'Resim') {
                    filtered = filtered.filter(s => s.hasImages === true);
                }

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

            database.ref('MasterPool').once('value').then(snap => {
                let sets = [];
                snap.forEach(child => {
                    let s = child.val();
                    const hasImages = s.Data && Array.isArray(s.Data) && s.Data.some(item => item && item.ImgURL && item.ImgURL.trim() !== '');
                    sets.push({
                        id: child.key,
                        title: s.Title || "İsimsiz Set",
                        type: s.Type,
                        level: s.GlobalLevel || (s.Data && s.Data[0] ? s.Data[0].Level : "Tümü"),
                        cls: s.GlobalClass || (s.Data && s.Data[0] ? s.Data[0].ClassGrade : "Tümü"),
                        lesson: s.GlobalLesson || (s.Data && s.Data[0] ? s.Data[0].Lesson : "Tümü"),
                        author: s.Author_ID,
                        isPublic: s.IsPublic !== false,
                        hasImages: hasImages
                    });
                });
                window.globalMasterSets = sets;
                if (typeof window.updateGlobalCheckboxSets === 'function') {
                    window.updateGlobalCheckboxSets();
                }
            });
        }

        setTimeout(() => {
            const setupFormEl = document.getElementById('dynamicSetupForm');
            if (setupFormEl) {
                const getParent = (id) => { const el = document.getElementById(id); return el ? el.closest('.form-group') : null; };
                setupFormEl.style.display = 'grid';
                setupFormEl.style.gridTemplateColumns = 'repeat(4, 1fr)';
                setupFormEl.style.gap = '10px';
                setupFormEl.style.alignItems = 'start';

                const fType = getParent('TagGameType');
                const fMode = getParent('TagMode');
                const fDur = getParent('TagDuration');
                const fWin = getParent('TagWinningScore');

                const fOp = getParent('TagMathOperations');
                const fDiff = getParent('TagMathDifficulty');

                const fPref = getParent('SetPreference');
                const fLvl = getParent('GlobalLevelFilter');
                const fCls = getParent('GlobalClassFilter');
                const fLes = getParent('GlobalLessonFilter');
                const fDisp = getParent('DisplayMode');
                const fSets = getParent('SelectedSets');

                if (fType) { fType.style.gridColumn = 'span 2'; setupFormEl.appendChild(fType); }
                if (fMode) { fMode.style.gridColumn = 'span 2'; setupFormEl.appendChild(fMode); }
                if (fDur) { fDur.style.gridColumn = 'span 2'; setupFormEl.appendChild(fDur); }
                if (fWin) { fWin.style.gridColumn = 'span 2'; setupFormEl.appendChild(fWin); }

                if (fOp) { fOp.style.gridColumn = 'span 2'; setupFormEl.appendChild(fOp); }
                if (fDiff) { fDiff.style.gridColumn = 'span 2'; setupFormEl.appendChild(fDiff); }

                if (fPref) { fPref.style.gridColumn = 'span 2'; setupFormEl.appendChild(fPref); }
                if (fLvl) { fLvl.style.gridColumn = 'span 1'; setupFormEl.appendChild(fLvl); }
                if (fCls) { fCls.style.gridColumn = 'span 1'; setupFormEl.appendChild(fCls); }
                if (fLes) { fLes.style.gridColumn = 'span 2'; setupFormEl.appendChild(fLes); }
                if (fDisp) { fDisp.style.gridColumn = 'span 2'; setupFormEl.appendChild(fDisp); }
                if (fSets) { fSets.style.gridColumn = '1 / -1'; setupFormEl.appendChild(fSets); }

                const typeEl = document.getElementById('TagGameType');
                const modeEl = document.getElementById('TagMode');

                if (typeEl) {
                    const updateVis = () => {
                        const isMath = typeEl.value === 'Matematik';
                        if (fOp) fOp.style.display = isMath ? 'flex' : 'none';
                        if (fDiff) fDiff.style.display = isMath ? 'flex' : 'none';

                        if (fPref) fPref.style.display = isMath ? 'none' : 'flex';
                        if (fLvl) fLvl.style.display = isMath ? 'none' : 'flex';
                        if (fCls) fCls.style.display = isMath ? 'none' : 'flex';
                        if (fLes) fLes.style.display = isMath ? 'none' : 'flex';
                        if (fDisp) fDisp.style.display = isMath ? 'none' : 'flex';
                        if (fSets) fSets.style.display = isMath ? 'none' : 'flex';

                        // Checkbox güncelleme tetikleyelim
                        if (!isMath && typeof window.updateGlobalCheckboxSets === 'function') {
                            window.updateGlobalCheckboxSets();
                        }
                    };
                    typeEl.parentElement.addEventListener('click', () => setTimeout(updateVis, 50));
                    updateVis();
                }

                if (modeEl) {
                    const updateModeVis = () => {
                        const isTimeMode = modeEl.value === 'Zaman Yarışı';
                        if (fDur) fDur.style.display = isTimeMode ? 'flex' : 'none';
                        if (fWin) fWin.style.display = isTimeMode ? 'none' : 'flex';
                    };
                    modeEl.parentElement.addEventListener('click', () => setTimeout(updateModeVis, 50));
                    updateModeVis();
                }

                // Global filtre tetikleyicileri (TagWar için)
                const prefCont = document.getElementById('SetPreference') ? document.getElementById('SetPreference').parentElement : null;
                if (prefCont) prefCont.addEventListener('click', () => setTimeout(window.updateGlobalCheckboxSets, 50));

                const l = document.getElementById('GlobalLevelFilter');
                const c = document.getElementById('GlobalClassFilter');
                const less = document.getElementById('GlobalLessonFilter');
                if (l) l.addEventListener('change', window.updateGlobalCheckboxSets);
                if (c) c.addEventListener('change', window.updateGlobalCheckboxSets);
                if (less) less.addEventListener('change', window.updateGlobalCheckboxSets);
            }
        }, 100);
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

                            // Kart Gösterimi (Sadece Bang için)
                            if (game.id === 'bang') {
                                data.splice(4, 0, {
                                    SettingName: "DisplayMode",
                                    DisplayName: "Kart Gösterimi",
                                    Type: "dropdown",
                                    OptionsSource: "Kelime,Türkçe Anlam,İngilizce Anlam,Resim",
                                    DefaultValue: "Kelime"
                                });
                            }

                            // UnitStart/UnitEnd ve BbTopic temizliği
                            data = data.filter(s => !['UnitStart', 'UnitEnd', 'DictUnitStart', 'DictUnitEnd'].includes(s.SettingName));

                            // Oynanacak Setler Checkboksları
                            data.splice(game.id === 'bang' ? 5 : 4, 0, {
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
                                { SettingName: "GlobalLessonFilter", DisplayName: "Ders", Type: "dropdown", OptionsSource: "Tümü", DefaultValue: "Tümü" },
                                { SettingName: "SelectedSets", DisplayName: "Oynanacak Setler", Type: "multiselect", OptionsSource: "Yükleniyor...", DefaultValue: "" },
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
                            setupFormEl.style.gridTemplateColumns = 'repeat(4, 1fr)';
                            setupFormEl.style.gap = '10px';
                            setupFormEl.style.alignItems = 'start';

                            const fPref = getParent('SetPreference');
                            const fWin = getParent('WinningPoints');
                            const fGrp = getParent('NumGroups');
                            if (fPref) { fPref.style.gridColumn = 'span 2'; setupFormEl.appendChild(fPref); }
                            if (fWin) { fWin.style.gridColumn = 'span 1'; setupFormEl.appendChild(fWin); }
                            if (fGrp) { fGrp.style.gridColumn = 'span 1'; setupFormEl.appendChild(fGrp); }

                            const fLvl = getParent('GlobalLevelFilter');
                            const fCls = getParent('GlobalClassFilter');
                            const fLes = getParent('GlobalLessonFilter');
                            const fDisp = getParent('DisplayMode');
                            if (fLvl) { fLvl.style.gridColumn = 'span 1'; setupFormEl.appendChild(fLvl); }
                            if (fCls) { fCls.style.gridColumn = 'span 1'; setupFormEl.appendChild(fCls); }
                            if (fLes) { fLes.style.gridColumn = 'span 1'; setupFormEl.appendChild(fLes); }
                            if (fDisp) { fDisp.style.gridColumn = 'span 1'; setupFormEl.appendChild(fDisp); }

                            const fSets = getParent('SelectedSets');
                            if (fSets) { fSets.style.gridColumn = '1 / -1'; setupFormEl.appendChild(fSets); }

                            // DisplayMode değişince Resim seçiliyse set listesini filtrele
                            setTimeout(() => {
                                const dispEl = document.getElementById('DisplayMode');
                                if (dispEl) {
                                    dispEl.addEventListener('change', () => {
                                        if (typeof window.updateGlobalCheckboxSets === 'function') {
                                            window.updateGlobalCheckboxSets();
                                        }
                                    });
                                }
                            }, 300);
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

                            // SelectedSets — tam satır genişliği
                            const fSets = getParent('SelectedSets');
                            if (fSets) {
                                fSets.style.gridColumn = '1 / -1';
                                setupFormEl.appendChild(fSets);
                            }

                            if (fW4) { fW4.style.gridColumn = 'span 3'; setupFormEl.appendChild(fW4); }
                            if (fW5) { fW5.style.gridColumn = 'span 3'; setupFormEl.appendChild(fW5); }
                            if (fW6) { fW6.style.gridColumn = 'span 3'; setupFormEl.appendChild(fW6); }
                            if (fTime) { fTime.style.gridColumn = 'span 3'; setupFormEl.appendChild(fTime); }

                        } else if (game.id === 'quickreveal') {
                            // QuickReveal: block düzen — prepend edilen buton grid'i bozmasın
                            setupFormEl.style.display = 'block';
                            setupFormEl.style.gridTemplateColumns = '';
                            setupFormEl.style.gap = '';

                        } else if (game.id === 'baamboo') {
                            // BaamBoo: 2 sütunlu grid
                            setupFormEl.style.display = 'grid';
                            setupFormEl.style.gridTemplateColumns = 'repeat(2, 1fr)';
                            setupFormEl.style.gap = '12px';
                            setupFormEl.style.alignItems = 'start';
                            const fPref = getParent('SetPreference');
                            const fGrp = getParent('NumGroups');
                            const fTime = getParent('BbCountdown');
                            const fType = getParent('BbIsMultipleChoice');
                            const fLvl = getParent('BbLevel');
                            const fCls = getParent('BbClass');
                            const fLes = getParent('BbLesson');
                            const fSets = getParent('BbSetsCheckbox');
                            if (fPref) { fPref.style.gridColumn = 'span 2'; setupFormEl.appendChild(fPref); }
                            if (fGrp) { fGrp.style.gridColumn = 'span 1'; setupFormEl.appendChild(fGrp); }
                            if (fTime) { fTime.style.gridColumn = 'span 1'; setupFormEl.appendChild(fTime); }
                            if (fType) { fType.style.gridColumn = 'span 2'; setupFormEl.appendChild(fType); }
                            if (fLvl) { fLvl.style.gridColumn = 'span 1'; setupFormEl.appendChild(fLvl); }
                            if (fCls) { fCls.style.gridColumn = 'span 1'; setupFormEl.appendChild(fCls); }
                            if (fLes) { fLes.style.gridColumn = 'span 2'; setupFormEl.appendChild(fLes); }
                            if (fSets) { fSets.style.gridColumn = 'span 2'; setupFormEl.appendChild(fSets); }
                        }
                    }
                }, 100);

                // --- GLOBAL DYNAMIC SET CHECKBOXES (API bazlı oyunlar için, lingo dahil) ---
                if (game.id !== 'beecomb') {
                    if (typeof database !== 'undefined') {
                        database.ref('MasterPool').once('value').then(snap => {
                            let sets = [];
                            snap.forEach(child => {
                                let s = child.val();
                                // Resimli set kontrolü: Data içinde en az bir ImageUrl dolu kayıt varsa
                                const hasImages = s.Data && Array.isArray(s.Data) && s.Data.some(item => item && item.ImgURL && item.ImgURL.trim() !== '');
                                sets.push({
                                    id: child.key,
                                    title: s.Title || "İsimsiz Set",
                                    type: s.Type,
                                    level: s.GlobalLevel || (s.Data && s.Data[0] ? s.Data[0].Level : "Tümü"),
                                    cls: s.GlobalClass || (s.Data && s.Data[0] ? s.Data[0].ClassGrade : "Tümü"),
                                    lesson: s.GlobalLesson || (s.Data && s.Data[0] ? s.Data[0].Lesson : "Tümü"),
                                    author: s.Author_ID,
                                    isPublic: s.IsPublic !== false,
                                    hasImages: hasImages
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

                            // DisplayMode = Resim ise yalnızca resimli setleri göster
                            const dispModeEl = document.getElementById('DisplayMode');
                            if (dispModeEl && dispModeEl.value === 'Resim') {
                                filtered = filtered.filter(s => s.hasImages === true);
                            }

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

                                if (val === "İlkokul") {
                                    classOpts.push("1. Sınıf", "2. Sınıf", "3. Sınıf", "4. Sınıf", "Ortak");
                                } else if (val === "Ortaokul") {
                                    classOpts.push("5. Sınıf", "6. Sınıf", "7. Sınıf", "8. Sınıf", "Ortak");
                                } else if (val === "Lise") {
                                    classOpts.push("9. Sınıf", "10. Sınıf", "11. Sınıf", "12. Sınıf", "Ortak");
                                } else {
                                    classOpts.push("1. Sınıf", "2. Sınıf", "3. Sınıf", "4. Sınıf", "5. Sınıf", "6. Sınıf", "7. Sınıf", "8. Sınıf", "9. Sınıf", "10. Sınıf", "11. Sınıf", "12. Sınıf", "Ortak");
                                }

                                if (classEl) {
                                    const prevClass = classEl.value;
                                    classEl.innerHTML = classOpts.map(o => `<option value="${o}">${o}</option>`).join('');
                                    if (classOpts.includes(prevClass)) classEl.value = prevClass;
                                }

                                // LİNGO DİNAMİK SINIF (CLASSGRADES) YAPISI
                                if (game.id === 'lingo') {
                                    const lingoClassContainer = document.getElementById('ClassGrades');
                                    if (lingoClassContainer) {
                                        lingoClassContainer.innerHTML = '';
                                        let checkboxOpts = classOpts.filter(c => c !== "Tümü");
                                        if (!checkboxOpts.includes("Ortak")) checkboxOpts.push("Ortak");

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

                                // === DİNAMİK DERS FİLTRESİ: Firebase'den unique GlobalLesson çek ===
                                lessonEl.innerHTML = '<option value="Tümü">⏳ Yükleniyor...</option>';
                                const prevLesson = lessonEl.dataset.prevLesson || "Tümü";

                                let lessonQuery;
                                if (!val || val === "Tümü") {
                                    lessonQuery = database.ref('MasterPool');
                                } else {
                                    lessonQuery = database.ref('MasterPool').orderByChild('GlobalLevel').equalTo(val);
                                }

                                lessonQuery.once('value').then(snapshot => {
                                    const lessonSet = new Set();
                                    snapshot.forEach(child => {
                                        const lesson = child.val().GlobalLesson;
                                        if (lesson && lesson.trim() !== '') lessonSet.add(lesson.trim());
                                    });

                                    // Sabit başlangıç: Tümü, Ortak, Genel — ardından alfabetik sıra
                                    const pinnedFirst = ["Tümü", "Ortak", "Genel"].filter(p => lessonSet.has(p) || p === "Tümü");
                                    const rest = Array.from(lessonSet)
                                        .filter(l => !["Tümü", "Ortak", "Genel"].includes(l))
                                        .sort((a, b) => a.localeCompare(b, 'tr'));
                                    const lessonOpts = [...pinnedFirst, ...rest];

                                    lessonEl.innerHTML = lessonOpts.map(o => `<option value="${o}">${o}</option>`).join('');

                                    // Önceki seçimi koru
                                    if (lessonOpts.includes(prevLesson)) lessonEl.value = prevLesson;

                                    if (window.updateGlobalCheckboxSets) window.updateGlobalCheckboxSets();
                                }).catch(() => {
                                    lessonEl.innerHTML = '<option value="Tümü">Tümü</option>';
                                    if (window.updateGlobalCheckboxSets) window.updateGlobalCheckboxSets();
                                });
                            };

                            // Ders seçimi değişince önceki değeri sakla
                            lessonEl.addEventListener('change', () => {
                                lessonEl.dataset.prevLesson = lessonEl.value;
                            });

                            levelEl.addEventListener('change', updateFilters);
                            // İlk kurulum anında çalıştır
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
            // BANG İÇİN OFFLINE FIREBASE OVERRIDE
            if (formData.GameType === 'bang' && typeof database !== 'undefined') {
                const selectedIds = formData.SelectedSets
                    ? formData.SelectedSets.split(',').map(s => s.trim()).filter(s => s)
                    : [];
                const igwRate = Math.min(50, Math.max(0, parseInt(formData.InGameWordRate) || 15));
                const winPts = parseInt(formData.WinningPoints) || 10;
                const numGrp = parseInt(formData.NumGroups) || 4;
                const groupNames = Array.from({ length: numGrp }, (_, i) => String.fromCharCode(65 + i));

                database.ref('MasterPool').once('value').then(snap => {
                    let rawWords = [];
                    snap.forEach(child => {
                        const set = child.val();
                        if (selectedIds.length > 0 && !selectedIds.includes(child.key)) return;
                        if (set.Type !== 'wordspool') return;
                        if (set.Data && Array.isArray(set.Data)) {
                            set.Data.forEach(item => {
                                if (item && item.Word) rawWords.push({
                                    Word: item.Word.trim(),
                                    Clue: item.Clue || '',
                                    TurkishMeaning: item.MeaningTR || '',
                                    EnglishMeaning: item.MeaningEN || '',
                                    ImageUrl: item.ImgURL || ''
                                });
                            });
                        }
                    });
                    rawWords = rawWords.filter((v, i, a) => a.findIndex(x => x.Word === v.Word) === i);
                    if (rawWords.length === 0) {
                        showOzelAlert('Seçilen setlerde kelime bulunamadı!', 'hata');
                        startBtn.textContent = startBtnText; startBtn.disabled = false; return;
                    }
                    const igwPool = ['BANG!', 'Give +1 Right', 'Give +1 Left', 'Take +1 Right', 'Take +1 Left'];

                    let preparedList = [];
                    // Aksiyon kartlarını ekle
                    igwPool.forEach(act => {
                        preparedList.push({ Word: act, Clue: '', isGameInWord: true });
                    });
                    // Normal kelimeleri ekle
                    rawWords.forEach(item => {
                        preparedList.push({
                            Word: item.Word,
                            Clue: item.Clue,
                            TurkishMeaning: item.TurkishMeaning,
                            EnglishMeaning: item.EnglishMeaning,
                            ImageUrl: item.ImageUrl,
                            isGameInWord: false
                        });
                    });

                    window.bangOfflineMode = true;
                    window.bangDisplayMode = formData.DisplayMode || 'Kelime';
                    startBtn.textContent = startBtnText; startBtn.disabled = false;
                    document.getElementById('setupArea').style.display = 'none';
                    const gameArea = document.getElementById('gameArea');
                    gameArea.style.display = 'block';
                    gameArea.classList.remove('hidden-spa-module');
                    BangEngine.startOffline(preparedList, groupNames, winPts);
                }).catch(err => {
                    showOzelAlert('Firebase Hatası: ' + err.message, 'hata');
                    startBtn.textContent = startBtnText; startBtn.disabled = false;
                });
                return;
            }

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

            // TRIVIA İÇİN BAŞLATMA OVERRIDE
            if (formData.GameType === 'trivia') {
                startBtn.textContent = startBtnText;
                startBtn.disabled = false;

                if (!formData.TriviaSetsCheckbox || formData.TriviaSetsCheckbox.trim() === '') {
                    showOzelAlert("Lütfen işleme devam etmek için listeden bir set seçin.", "hata");
                    return;
                }

                if (formData.TriviaSource === 'Mevcut Soru/Kelime Havuzundan Üret') {
                    if (typeof window.generateTriviaFromWordspool === 'function') {
                        window.generateTriviaFromWordspool(formData.TriviaSetsCheckbox);
                    } else {
                        showOzelAlert("Oto-Üretim modülü henüz yüklenmedi veya bulunamadı.", "hata");
                    }
                    return;
                }

                document.getElementById('setupArea').style.display = 'none';

                const triviaGameArea = document.getElementById('triviaGameArea');
                triviaGameArea.style.display = 'block';
                triviaGameArea.classList.remove('hidden-spa-module');

                if (typeof TriviaEngine !== 'undefined') {
                    TriviaEngine.init(formData);
                } else {
                    console.error("TriviaEngine yüklenemedi!");
                }
                return;
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

            // TUG OF WAR İÇİN BAŞLATMA OVERRIDE
            if (formData.TagGameType || formData.GameType === 'tagwar') {
                startBtn.textContent = startBtnText;
                startBtn.disabled = false;
                document.getElementById('setupArea').style.display = 'none';

                const tagGameArea = document.getElementById('tagWarGameArea');
                tagGameArea.style.display = 'flex';
                tagGameArea.classList.remove('hidden-spa-module');

                if (typeof TagWarEngine !== 'undefined') {
                    TagWarEngine.init(formData);
                } else {
                    console.error("TagWarEngine yüklenemedi!");
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
    window.bangOfflineMode = false; // Bang offline bayrağını sıfırla
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

    const tagWarGameArea = document.getElementById('tagWarGameArea');
    if (tagWarGameArea) {
        tagWarGameArea.style.display = 'none';
        tagWarGameArea.classList.add('hidden-spa-module');
    }

    const triviaGameArea = document.getElementById('triviaGameArea');
    if (triviaGameArea) triviaGameArea.style.display = 'none'; // Added this line
    if (triviaGameArea) triviaGameArea.classList.add('hidden-spa-module'); // Added this line

    const livePinJoinArea = document.getElementById('livePinJoinArea');
    if (livePinJoinArea) {
        livePinJoinArea.style.display = 'none';
        livePinJoinArea.classList.add('hidden-spa-module');
    }

    const livePinStudentArea = document.getElementById('livePinStudentArea');
    if (livePinStudentArea) {
        livePinStudentArea.style.display = 'none';
        livePinStudentArea.classList.add('hidden-spa-module');
    }

    const livePinHostArea = document.getElementById('livePinHostArea');
    if (livePinHostArea) {
        livePinHostArea.style.display = 'none';
        livePinHostArea.classList.add('hidden-spa-module');
    }

    const welcomeHero = document.getElementById('welcomeHero');
    if (welcomeHero) welcomeHero.style.display = 'block';

    const gamesListArea = document.getElementById('gamesListArea');
    if (gamesListArea) gamesListArea.style.display = 'block';
}

// Öğrenci PIN ile Katılım Ekranını Açar ve Avatarları Yükler
window.openLivePinJoinArea = function() {
    // Diğer tüm alanları gizle
    const areasToHide = ['setupArea', 'gameArea', 'lingoGameArea', 'quickRevealGameArea', 
                         'baambooGameArea', 'dictionaryGameArea', 'tagWarGameArea', 
                         'triviaGameArea', 'welcomeHero', 'gamesListArea', 'livePinStudentArea', 'livePinHostArea'];
    areasToHide.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'none';
            el.classList.add('hidden-spa-module');
        }
    });

    // Join alanını göster
    const joinArea = document.getElementById('livePinJoinArea');
    if (joinArea) {
        joinArea.style.display = 'flex';
        joinArea.classList.remove('hidden-spa-module');
    }

    // Avatarları oluştur (1'den 100'e kadar)
    const grid = document.getElementById('liveJoinAvatarGrid');
    if (grid && grid.innerHTML === '') {
        for (let i = 1; i <= 100; i++) {
            const img = document.createElement('img');
            img.src = `game pics/avatars/${i}.png`;
            img.style = "width: 100%; aspect-ratio: 1; object-fit: contain; cursor: pointer; border-radius: 50%; opacity: 0.7; transition: 0.2s; border: 3px solid transparent;";
            img.onerror = function() { this.style.display = 'none'; }; // Resim yoksa gizle
            
            img.onclick = function() {
                // Öncekilerin seçimini kaldır
                const allAvatars = grid.querySelectorAll('img');
                allAvatars.forEach(a => {
                    a.style.opacity = '0.7';
                    a.style.borderColor = 'transparent';
                    a.style.transform = 'scale(1)';
                });
                // Bunu seç
                this.style.opacity = '1';
                this.style.borderColor = '#10b981';
                this.style.transform = 'scale(1.1)';
                document.getElementById('liveJoinSelectedAvatar').value = `${i}.png`;
            };
            grid.appendChild(img);
        }
    }
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
    const bindKademeClassSelects = (kademeId, classId, lessonId = null) => {
        const kademeEl = document.getElementById(kademeId);
        const classEl = document.getElementById(classId);

        if (!kademeEl || !classEl) return;

        const applyKademeFilter = () => {
            const val = kademeEl.value;
            let classOpts = [];
            let lessonOpts = [];

            if (val === "İlkokul") {
                classOpts = ["1. Sınıf", "2. Sınıf", "3. Sınıf", "4. Sınıf", "Ortak"];
                lessonOpts = ["İngilizce", "Türkçe", "Matematik", "Hayat Bilgisi", "Fen Bilimleri", "Sosyal Bilgiler", "Din Kültürü", "Ortak", "Genel"];
            } else if (val === "Ortaokul") {
                classOpts = ["5. Sınıf", "6. Sınıf", "7. Sınıf", "8. Sınıf", "Ortak"];
                lessonOpts = ["İngilizce", "Türkçe", "Matematik", "Fen Bilimleri", "Sosyal Bilgiler", "T.C. İnkılap Tarihi", "Din Kültürü", "Ortak", "Genel"];
            } else if (val === "Lise") {
                classOpts = ["9. Sınıf", "10. Sınıf", "11. Sınıf", "12. Sınıf", "Ortak"];
                lessonOpts = ["İngilizce", "Türk Dili ve Edebiyatı", "Matematik", "Fizik", "Kimya", "Biyoloji", "Tarih", "T.C. İnkılap Tarihi", "Coğrafya", "Felsefe", "Din Kültürü", "Ortak", "Genel"];
            } else {
                classOpts = ["1. Sınıf", "2. Sınıf", "3. Sınıf", "4. Sınıf", "5. Sınıf", "6. Sınıf", "7. Sınıf", "8. Sınıf", "9. Sınıf", "10. Sınıf", "11. Sınıf", "12. Sınıf", "Ortak"];
                lessonOpts = ["İngilizce", "Türkçe", "Türk Dili ve Edebiyatı", "Matematik", "Hayat Bilgisi", "Fen Bilimleri", "Sosyal Bilgiler", "Tarih", "T.C. İnkılap Tarihi", "Coğrafya", "Fizik", "Kimya", "Biyoloji", "Felsefe", "Din Kültürü", "Ortak", "Genel"];
            }

            const currentVal = classEl.value;
            classEl.innerHTML = '<option value="">Sınıf Seçiniz</option>' + classOpts.map(o => `<option value="${o}">${o}</option>`).join('');

            // Eğer önceki seçim yeni listede varsa onu koru
            if (classOpts.includes(currentVal)) {
                classEl.value = currentVal;
            }

            // Ders select'ini güncelle (varsa)
            if (lessonId) {
                const lessonEl = document.getElementById(lessonId);
                const lessonCustom = document.getElementById(lessonId + 'Custom');

                if (lessonEl && lessonEl.tagName === 'SELECT') {
                    const prevLesson = lessonEl.value;
                    lessonEl.innerHTML = '<option value="">Ders Seçiniz</option>'
                        + lessonOpts.map(o => `<option value="${o}">${o}</option>`).join('')
                        + '<option value="__diger__">✏️ Diğer (Manuel Giriş)...</option>';

                    if (lessonOpts.includes(prevLesson)) {
                        lessonEl.value = prevLesson;
                    }

                    // Diğer seçilince custom input'u göster, gizle
                    if (lessonCustom && !lessonEl._dicherBound) {
                        lessonEl._dicherBound = true;
                        lessonEl.addEventListener('change', () => {
                            if (lessonEl.value === '__diger__') {
                                lessonCustom.style.display = 'block';
                                lessonCustom.focus();
                            } else {
                                lessonCustom.style.display = 'none';
                                lessonCustom.value = '';
                            }
                        });
                    }
                    // İlk yükleme: eğer custom zaten dolu ve seçim yoksa Diğer'e al
                    if (lessonCustom) {
                        lessonCustom.style.display = 'none';
                        lessonCustom.value = '';
                    }
                }
            }
        };

        kademeEl.addEventListener('change', applyKademeFilter);
        applyKademeFilter(); // Başlangıçta 1 kez çalıştır
    };

    // İlgili dropdown'ları çalıştır
    setTimeout(() => {
        bindKademeClassSelects('setKademeSelect', 'setClassGradeSelect', 'setLessonInput'); // Yeni set formu
        bindKademeClassSelects('modalGlobalLevel', 'modalGlobalClass'); // CRUD modal (ders populateModalMebFilters ile)
        bindKademeClassSelects('globalFilterGrade', 'globalFilterClass');
        bindKademeClassSelects('mySetsFilterGrade', 'mySetsFilterClass');
    }, 500); // DOM yüklenmelerine karşı güvenli aralık
});

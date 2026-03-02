// Service Worker Kaydı (PWA Desteği İçin)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker Registered!', reg))
            .catch(err => console.error('Service Worker Registration Failed!', err));
    });
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
        `;

        card.addEventListener('click', () => launchGame(game, configSheet, redirectUrl));
        gamesGrid.appendChild(card);
    });
}

function showError(error, statusContainer) {
    statusContainer.style.display = 'block';
    statusContainer.innerHTML = `
        <div style="color: #ef4444; margin-bottom: 10px;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
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

        const apiUrl = typeof AppConfig !== 'undefined' ? AppConfig.apiBaseUrl : '';
        if (apiUrl && apiUrl.trim() !== '') {
            fetch(`${apiUrl}?api=true&action=getBaambooOptions`)
                .then(res => res.json())
                .then(opt => {
                    if (opt.rows) {
                        window.bbRawData = opt.rows;

                        // Benzersiz listeler (Başlangıçta tümü)
                        const levels = ["Tümü", ...Array.from(new Set(opt.rows.map(r => r.level).filter(Boolean))).sort()];
                        const classes = ["Tümü", ...Array.from(new Set(opt.rows.map(r => r.cls).filter(Boolean))).sort()];
                        const lessons = ["Tümü", ...Array.from(new Set(opt.rows.map(r => r.lesson).filter(Boolean))).sort()];
                        const topics = ["Tümü", ...Array.from(new Set(opt.rows.map(r => r.topic).filter(Boolean))).sort()];

                        const bbConfig = [
                            { SettingName: "NumGroups", DisplayName: "Grup Sayısı", Type: "number", DefaultValue: 4, Min: 2, Max: 6 },
                            { SettingName: "BbCountdown", DisplayName: "Süre (Saniye)", Type: "number", DefaultValue: 15, Min: 10, Max: 120 },
                            { SettingName: "BbIsMultipleChoice", DisplayName: "Çoktan Seçmeli Mi?", Type: "dropdown", OptionsSource: "Evet,Hayır,Tümü", DefaultValue: "Tümü" },
                            { SettingName: "BbLevel", DisplayName: "Kademe", Type: "dropdown", OptionsSource: levels.join(','), DefaultValue: "Tümü" },
                            { SettingName: "BbClass", DisplayName: "Sınıf", Type: "dropdown", OptionsSource: classes.join(','), DefaultValue: "Tümü" },
                            { SettingName: "BbLesson", DisplayName: "Ders", Type: "dropdown", OptionsSource: lessons.join(','), DefaultValue: "Tümü" },
                            { SettingName: "BbTopic", DisplayName: "Konu", Type: "dropdown", OptionsSource: topics.join(','), DefaultValue: "Tümü" }
                        ];

                        populateSetupForm(bbConfig);

                        // Dependent Dropdown İçin Event Listener'lar
                        setTimeout(() => {
                            const dMul = document.getElementById('BbIsMultipleChoice');
                            const dLvl = document.getElementById('BbLevel');
                            const dCls = document.getElementById('BbClass');
                            const dLes = document.getElementById('BbLesson');
                            const dTop = document.getElementById('BbTopic');

                            function updateBbDropdowns(e) {
                                const changedId = e ? e.target.id : null;

                                const selMul = dMul ? dMul.value : "Tümü";
                                const selLvl = dLvl ? dLvl.value : "Tümü";
                                let selCls = dCls ? dCls.value : "Tümü";
                                let selLes = dLes ? dLes.value : "Tümü";
                                let selTop = dTop ? dTop.value : "Tümü";

                                let filtered = window.bbRawData;

                                // EN ÜST FİLTRE: ÇOKTAN SEÇMELİ Mİ?
                                if (selMul === "Evet") filtered = filtered.filter(r => r.isMulti);
                                else if (selMul === "Hayır") filtered = filtered.filter(r => !r.isMulti);

                                // Ç.S. Mİ değiştiyse Kademeyi güncelle
                                if (changedId === 'BbIsMultipleChoice' || !changedId) {
                                    if (dLvl) {
                                        const opts = ["Tümü", ...Array.from(new Set(filtered.map(r => r.level).filter(Boolean))).sort()];
                                        dLvl.innerHTML = opts.map(t => `<option value="${t}">${t}</option>`).join('');
                                        if (opts.includes(selLvl)) dLvl.value = selLvl; else dLvl.value = "Tümü";
                                    }
                                }

                                // Ç.S. Mİ veya KADEME değiştiyse Sınıfı güncelle
                                if (changedId === 'BbIsMultipleChoice' || changedId === 'BbLevel' || !changedId) {
                                    let fCls = dLvl && dLvl.value !== "Tümü" ? filtered.filter(r => r.level === dLvl.value) : filtered;
                                    if (dCls) {
                                        const opts = ["Tümü", ...Array.from(new Set(fCls.map(r => r.cls).filter(Boolean))).sort()];
                                        dCls.innerHTML = opts.map(t => `<option value="${t}">${t}</option>`).join('');
                                        if (opts.includes(selCls)) dCls.value = selCls; else { dCls.value = "Tümü"; selCls = "Tümü"; }
                                    }
                                }

                                // Ç.S. Mİ, KADEME veya SINIF değiştiyse Dersi güncelle
                                if (changedId === 'BbIsMultipleChoice' || changedId === 'BbLevel' || changedId === 'BbClass' || !changedId) {
                                    let fLes = filtered;
                                    if (dLvl && dLvl.value !== "Tümü") fLes = fLes.filter(r => r.level === dLvl.value);
                                    if (dCls && dCls.value !== "Tümü") fLes = fLes.filter(r => r.cls === dCls.value);
                                    if (dLes) {
                                        const opts = ["Tümü", ...Array.from(new Set(fLes.map(r => r.lesson).filter(Boolean))).sort()];
                                        dLes.innerHTML = opts.map(t => `<option value="${t}">${t}</option>`).join('');
                                        if (opts.includes(selLes)) dLes.value = selLes; else { dLes.value = "Tümü"; selLes = "Tümü"; }
                                    }
                                }

                                // Herhangi biri değiştiyse Konuyu güncelle
                                let fTop = filtered;
                                if (dLvl && dLvl.value !== "Tümü") fTop = fTop.filter(r => r.level === dLvl.value);
                                if (dCls && dCls.value !== "Tümü") fTop = fTop.filter(r => r.cls === dCls.value);
                                if (dLes && dLes.value !== "Tümü") fTop = fTop.filter(r => r.lesson === dLes.value);

                                if (dTop) {
                                    const opts = ["Tümü", ...Array.from(new Set(fTop.map(r => r.topic).filter(Boolean))).sort()];
                                    dTop.innerHTML = opts.map(t => `<option value="${t}">${t}</option>`).join('');
                                    if (opts.includes(selTop)) dTop.value = selTop; else dTop.value = "Tümü";
                                }
                            }

                            if (dMul) dMul.addEventListener('change', updateBbDropdowns);
                            if (dLvl) dLvl.addEventListener('change', updateBbDropdowns);
                            if (dCls) dCls.addEventListener('change', updateBbDropdowns);
                            if (dLes) dLes.addEventListener('change', updateBbDropdowns);
                        }, 200);
                    } else {
                        setupFormObj.innerHTML = '<p style="color:red; text-align:center;">Metadata çekilemedi.</p>';
                    }
                })
                .catch(e => {
                    showOzelAlert("Seçenekler (Kademe, Ders vb.) Google E-Tablo'dan okunurken bağlantı sorunu oluştu.", "hata");
                });
        }
    }
    else if (game.id === 'dictionary') {
        const dictConfig = [
            { SettingName: "NumGroups", DisplayName: "Grup Sayısı", Type: "number", DefaultValue: 4, Min: 2, Max: 6 },
            { SettingName: "WinTarget", DisplayName: "Kazanma Hedefi (Kaç Kelime)", Type: "number", DefaultValue: 3, Min: 1, Max: 10 },
            { SettingName: "DictClass", DisplayName: "Sınıf / Kademe (Opsiyonel)", Type: "dropdown", OptionsSource: "Tümü,İlkokul,Ortaokul,Lise,2. Sınıf,3. Sınıf,4. Sınıf,5. Sınıf,6. Sınıf,7. Sınıf,8. Sınıf,9. Sınıf,10. Sınıf,11. Sınıf,12. Sınıf", DefaultValue: "Tümü" },
            { SettingName: "DictLesson", DisplayName: "Ders (Opsiyonel)", Type: "dropdown", OptionsSource: "Tümü,İngilizce,Almanca", DefaultValue: "Tümü" },
            { SettingName: "DictUnitStart", DisplayName: "Başlangıç Ünitesi", Type: "number", DefaultValue: 1, Min: 1, Max: 50 },
            { SettingName: "DictUnitEnd", DisplayName: "Bitiş Ünitesi", Type: "number", DefaultValue: 10, Min: 1, Max: 50 }
        ];
        populateSetupForm(dictConfig);
    }
    else if (apiUrl && apiUrl.trim() !== '') {
        fetch(`${apiUrl}?api=true&action=getGameConfig&sheetName=${encodeURIComponent(configSheet)}`)
            .then(res => res.json())
            .then(data => populateSetupForm(data))
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

        const label = document.createElement('label');
        label.setAttribute('for', setting.SettingName);
        label.textContent = setting.DisplayName + ':';
        formGroup.appendChild(label);

        let inputElement;

        switch (setting.Type) {
            case 'number':
                inputElement = document.createElement('input');
                inputElement.type = 'number';
                inputElement.id = setting.SettingName;
                inputElement.name = setting.SettingName;
                inputElement.value = setting.DefaultValue || '';
                if (setting.Min !== undefined && setting.Min !== null) inputElement.min = setting.Min;
                if (setting.Max !== undefined && setting.Max !== null) inputElement.max = setting.Max;
                break;

            case 'dropdown':
                inputElement = document.createElement('select');
                inputElement.id = setting.SettingName;
                inputElement.name = setting.SettingName;
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
                inputElement.className = 'checkbox-group';
                const multiOptions = setting.OptionsSource ? setting.OptionsSource.split(',') : [];
                const defaultValues = String(setting.DefaultValue).split(',').map(val => val.trim());

                multiOptions.forEach(optionText => {
                    const checkboxId = `${setting.SettingName}_${optionText.trim()}`;
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

            case 'toggle':
                inputElement = document.createElement('div');
                inputElement.className = 'toggle-container';
                inputElement.style.cssText = "display: flex; align-items: center; position: relative; background: rgba(0,0,0,0.2); border-radius: 30px; padding: 4px; border: 1px solid var(--glass-border); cursor: pointer; user-select: none; width: max-content; margin-top: 5px;";

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
                slider.style.cssText = `position: absolute; top: 4px; bottom: 4px; width: calc(50% - 4px); background: #3b82f6; border-radius: 25px; z-index: 1; transition: 0.3s; left: ${isDefaultVal1 ? '50%' : '4px'};`;

                const opt0 = document.createElement('div');
                opt0.textContent = val0;
                opt0.style.cssText = `padding: 8px 24px; z-index: 2; transition: 0.3s; font-weight: bold; font-size: 0.9rem; text-align: center; flex: 1; color: ${isDefaultVal1 ? 'var(--text-muted)' : '#fff'};`;

                const opt1 = document.createElement('div');
                opt1.textContent = val1;
                opt1.style.cssText = `padding: 8px 24px; z-index: 2; transition: 0.3s; font-weight: bold; font-size: 0.9rem; text-align: center; flex: 1; color: ${isDefaultVal1 ? '#fff' : 'var(--text-muted)'};`;

                inputElement.appendChild(slider);
                inputElement.appendChild(opt0);
                inputElement.appendChild(opt1);
                inputElement.appendChild(hiddenInput);

                inputElement.addEventListener('click', () => {
                    if (hiddenInput.value === val0) {
                        hiddenInput.value = val1;
                        slider.style.left = '50%';
                        opt0.style.color = "var(--text-muted)";
                        opt1.style.color = "#fff";
                    } else {
                        hiddenInput.value = val0;
                        slider.style.left = '4px';
                        opt0.style.color = "#fff";
                        opt1.style.color = "var(--text-muted)";
                    }
                });
                break;

            case 'dynamic-dropdown':
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

            case 'custom-qr-data':
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
function showOzelAlert(message, type, callback = null) {
    const overlay = document.getElementById('ozelAlertOverlay');
    const messageEl = document.getElementById('ozelAlertMessage');
    const iconEl = document.getElementById('ozelAlertIcon');
    const buttonsEl = document.getElementById('ozelAlertButtons');

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
            <button id="closeQrModalBtn" style="position:absolute; top:15px; right:15px; background:transparent; border:none; color:var(--text-color); font-size:1.5rem; cursor:pointer;"><i class="fas fa-times"></i></button>
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

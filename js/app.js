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
    if (apiUrl && apiUrl.trim() !== '') {
        fetch(`${apiUrl}?api=true&action=getGameConfig&sheetName=${encodeURIComponent(configSheet)}`)
            .then(res => res.json())
            .then(data => populateSetupForm(data))
            .catch(err => {
                setupForm.innerHTML = `<p style="color:red; width:100%; text-align:center;">Hata: ${err}</p>`;
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

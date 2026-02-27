// --- BANG OYUNU MODULU ---
function loadInitialGameState(sheetName) {
    const apiUrlLoad = typeof AppConfig !== 'undefined' ? AppConfig.apiBaseUrl : '';
    if (apiUrlLoad && apiUrlLoad.trim() !== '') {
        fetch(`${apiUrlLoad}?api=true&action=getInitialGameState&sheetName=${encodeURIComponent(sheetName)}`)
            .then(res => res.json())
            .then(state => {
                if (state.error) {
                    showOzelAlert("Oyun yüklenemedi: " + state.error, "hata");
                    return;
                }
                updateGameUI(state);
            })
            .catch(error => {
                showOzelAlert("Bağlantı hatası: " + error, "hata");
            });
    } else {
        showOzelAlert("API adresi tanımsız. Lütfen config.js içindeki apiBaseUrl değerini girin.", "hata");
    }
}
function updateGameUI(state) {
    if (!state) return;

    const wordDisplay = document.getElementById('currentWordDisplay');
    wordDisplay.textContent = state.currentWord || 'Kelime Bekleniyor...';

    // Grupların skoru ve kutuları
    const groupScoresContainer = document.getElementById('groupScores');
    const activeGroupDropdown = document.getElementById('activeGroupDropdown');

    groupScoresContainer.innerHTML = '';
    if (activeGroupDropdown) activeGroupDropdown.innerHTML = '';

    if (state.groupNames && Array.isArray(state.groupNames)) {
        state.groupNames.forEach(gName => {
            // Dropdown seçenekleri (eski sistem)
            if (activeGroupDropdown) {
                const opt = document.createElement('option');
                opt.value = gName;
                opt.textContent = gName;
                if (gName === state.activeGroup) opt.selected = true;
                activeGroupDropdown.appendChild(opt);
            }

            // Score box
            const box = document.createElement('div');
            box.className = 'group-box ' + (gName === state.activeGroup ? 'active' : '');

            // UI üzerinden Grup Seçimi (Click Event)
            box.style.cursor = 'pointer';
            box.dataset.groupName = gName;
            box.addEventListener('click', function () {
                document.querySelectorAll('#groupScores .group-box').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            });

            box.innerHTML = `
                <span class="group-name">${gName}</span>
                <span class="group-score">${state.scores ? (state.scores[gName] || 0) : 0}</span>
            `;
            groupScoresContainer.appendChild(box);
        });
    }

    // Kelime Stilleri (Bang vs)
    wordDisplay.className = '';
    wordDisplay.classList.add('word-base');
    const wordInfo = document.getElementById('wordInfo');

    if (state.currentWordIsGameInWord) {
        wordDisplay.classList.remove('word-base', 'word-repeated');
        switch (state.currentWord) {
            case 'BANG!':
                wordDisplay.classList.add('word-bang');
                break;
            case 'Give +1 Right':
            case 'Give +1 Left':
                wordDisplay.classList.add('word-give');
                break;
            case 'Take +1 Right':
            case 'Take +1 Left':
                wordDisplay.classList.add('word-take');
                break;
        }
        if (wordInfo) wordInfo.textContent = '';
    } else if (state.currentWordIsRepeated) {
        wordDisplay.classList.remove('word-base');
        wordDisplay.classList.add('word-repeated');

        // Tekrarlanan kelimeler için de ipucu varsa göster (Açık/Kapalı Toggle'a göre opacity çalışır)
        const currentWordObj = state.preparedWordList ? state.preparedWordList[state.currentWordIndex] : null;
        if (wordInfo) {
            wordInfo.textContent = (currentWordObj && currentWordObj.Clue) ? currentWordObj.Clue : '';
        }
    } else {
        // Normal kelimelerde ipucu (Clue) varsa Info alanına yazdır.
        const currentWordObj = state.preparedWordList ? state.preparedWordList[state.currentWordIndex] : null;
        if (wordInfo) {
            wordInfo.textContent = (currentWordObj && currentWordObj.Clue) ? currentWordObj.Clue : '';
        }
    }

    // Mesajlar ve Oyun Sonu
    const gameMessageDiv = document.getElementById('gameMessage');
    if (gameMessageDiv) {
        // Eğer tekrar eden bir kelimeyse, alt mesaj kısmında KALICI ve KIRMIZI olarak uyarıyı göster.
        if (state.currentWordIsRepeated) {
            gameMessageDiv.innerHTML = `<span style="color:#ef4444; font-weight:bold; font-size:1.5rem;">Bu kelime daha önce kullanıldı!</span>`;
        } else {
            gameMessageDiv.textContent = state.message || '';
        }
    }

    const gameOverDiv = document.getElementById('gameOverMessage'); // Artık kullanılmıyor ama uyumluluk için duruyor
    const restartGameBtn = document.getElementById('restartGameBtn');

    if (state.gameEnded) {
        let winText = state.winner ? `${state.winner} KAZANDI!` : 'Oyun Bitti!';
        wordDisplay.textContent = winText;
        wordDisplay.style.color = '#ef4444'; // Kırmızı vurgu

        if (gameOverDiv) gameOverDiv.style.display = 'none';
        if (restartGameBtn) {
            restartGameBtn.style.display = 'inline-block';
            restartGameBtn.textContent = 'Yeniden Başlat'; // Eğer "Başlatılıyor..." kaldıysa sıfırlar
        }

        // Sadece bir kere Ozel Alert göster ki her buton basışında tekrar etmesin
        if (wordDisplay.dataset.alertShown !== "true") {
            showOzelAlert(`Oyun Sonucu: ${winText}`, "tamam");
            wordDisplay.dataset.alertShown = "true";
        }
    } else {
        wordDisplay.style.color = ''; // Rengi sıfırla
        if (gameOverDiv) gameOverDiv.style.display = 'none';
        if (restartGameBtn) restartGameBtn.style.display = 'none';
        wordDisplay.dataset.alertShown = "false"; // Yeni oyun için sıfırla
    }
}

// OYUN ALANI (GAME AREA) ETKİLEŞİM FONKSİYONU
function handleGameAction(actionType) {
    let activeGroup = '';
    const activeBox = document.querySelector('#groupScores .group-box.active');
    if (activeBox) {
        activeGroup = activeBox.dataset.groupName;
    } else {
        const activeGroupSelect = document.getElementById('activeGroupDropdown');
        activeGroup = activeGroupSelect ? activeGroupSelect.value : '';
    }

    // Config sayfası değil, o an oynanan canlı oyun (özel id'li sekme) kullanılmalı
    const gameSheetToCall = currentGameSessionSheet;

    const apiUrlAction = typeof AppConfig !== 'undefined' ? AppConfig.apiBaseUrl : '';
    if (apiUrlAction && apiUrlAction.trim() !== '') {
        fetch(apiUrlAction, {
            method: 'POST',
            body: JSON.stringify({ action: 'processGameAction', sheetName: gameSheetToCall, actionType: actionType, activeGroup: activeGroup }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
            .then(res => res.json())
            .then(state => {
                if (state.error) {
                    showOzelAlert("Sunucu Hatası: " + state.error, "hata");
                    return;
                }
                updateGameUI(state);
            })
            .catch(error => {
                showOzelAlert("Bağlantı hatası: " + error, "hata");
            });
    } else {
        showOzelAlert(`Test Ortamı: ${actionType} işlemi backend'e iletilemedi.`, "bilgi");
    }
}

// OYUN İÇİ BUTONLARA EVENT LISTENER'LARIN EKLENMESİ
document.addEventListener('DOMContentLoaded', () => {
    const IDs = {
        'plusBtn': 'plus',
        'minusBtn': 'minus',
        'actionBtn': 'action',
        'changeWordBtn': 'changeWord'
    };

    for (let [btnId, action] of Object.entries(IDs)) {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => handleGameAction(action));
        }
    }

    // İPUCU GÖSTER/GİZLE TOGGLE BUTONU
    const clueToggleBtn = document.getElementById('clueToggleBtn');
    if (clueToggleBtn) {
        clueToggleBtn.addEventListener('change', (e) => {
            const wordInfo = document.getElementById('wordInfo');
            if (wordInfo) {
                wordInfo.style.opacity = e.target.checked ? '1' : '0';
            }
        });
    }

    const backToSetup = document.getElementById('backToSetupBtn');
    if (backToSetup) {
        backToSetup.addEventListener('click', () => {
            // Confirm yapmadan önce uyar! 
            showOzelAlert("Ayarlara dönerseniz mevcut oyun sıfırlanabilir. Emin misiniz?", "evethayir", (isConfirmed) => {
                if (isConfirmed) {
                    document.getElementById('gameArea').style.display = 'none';
                    document.getElementById('setupArea').style.display = 'block';
                }
            });
        });
    }

    const newGameBtn = document.getElementById('newGameBtn');
    if (newGameBtn) {
        newGameBtn.addEventListener('click', () => {
            document.getElementById('gameArea').style.display = 'none';
            document.getElementById('setupArea').style.display = 'block';
        });
    }
});

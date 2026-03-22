// --- BANG OYUNU MODULU ---

// ============================================================
// BANG OFFLİNE ENGINE (Firebase üzerinden kelimeler)
// ============================================================
const BangEngine = {
    state: {
        sourceWords: [],     // Temiz kelime havuzu
        actionCards: [],     // Aksiyon kartları (BANG!, Give vb.)
        seenWords: [],       // Çıkmış kelimeler
        unseenWords: [],     // Henüz çıkmamış kelimeler
        currentWordObj: null,
        groupNames: [],
        scores: {},
        activeGroup: '',
        winningPoints: 10,
        isGameOver: false,
        seenWordsCount: {} 
    },

    startOffline: function (wordList, groupNames, winningPoints) {
        // wordList içinden Action ve Normal kelimeleri ayır
        this.state.sourceWords = wordList.filter(w => !w.isGameInWord);
        this.state.actionCards = wordList.filter(w => w.isGameInWord);
        
        // Havuzları hazırla
        this.state.seenWords = [];
        this.state.unseenWords = [...this.state.sourceWords];
        this.state.seenWordsCount = {};

        this.state.groupNames = groupNames;
        this.state.winningPoints = winningPoints;
        this.state.isGameOver = false;
        this.state.activeGroup = groupNames[0] || 'A';
        this.state.scores = {};
        groupNames.forEach(g => this.state.scores[g] = 0);
        
        // İlk kelimeyi seç
        this._pickNextWord();

        // UI Başlıklarını Güncelle
        const gameTitle = document.getElementById('playingGameTitle');
        if (gameTitle) gameTitle.textContent = 'Bang!';
        const winDisplay = document.getElementById('winningPointsDisplay');
        if (winDisplay) winDisplay.textContent = winningPoints;

        const wd = document.getElementById('currentWordDisplay');
        if (wd) wd.dataset.alertShown = 'false';
        this.renderState();
    },

    buildState: function () {
        const wordObj = this.state.currentWordObj;
        if (!wordObj || this.state.isGameOver) {
            return {
                currentWord: this.state.isGameOver ? 'Oyun Bitti!' : 'Kelime Bekleniyor...', 
                currentWordIsGameInWord: false,
                currentWordIsRepeated: false, groupNames: this.state.groupNames,
                scores: this.state.scores, activeGroup: this.state.activeGroup,
                message: '', gameEnded: this.state.isGameOver, winner: this.state.isGameOver ? this._topScorer() : null
            };
        }
        const wordKey = wordObj.Word.trim().toLowerCase();
        const isRepeated = !wordObj.isGameInWord && (this.state.seenWordsCount[wordKey] > 1);
        return {
            currentWord: wordObj.Word, 
            currentWordIsGameInWord: wordObj.isGameInWord,
            currentWordIsRepeated: isRepeated, 
            groupNames: this.state.groupNames,
            scores: this.state.scores, 
            activeGroup: this.state.activeGroup,
            currentWordObj: this.state.currentWordObj,
            message: '', 
            gameEnded: this.state.isGameOver,
            winner: this.state.isGameOver ? this._topScorer() : null
        };
    },

    renderState: function () { updateGameUI(this.buildState()); },

    _topScorer: function () {
        const s = this.state.scores;
        return Object.keys(s).reduce((a, b) => s[a] >= s[b] ? a : b, '');
    },

    _nextGroup: function (skip) {
        const idx = this.state.groupNames.indexOf(this.state.activeGroup);
        this.state.activeGroup = this.state.groupNames[(idx + skip) % this.state.groupNames.length];
    },

    _advanceWord: function (groupSkip) {
        this._pickNextWord();
        this._nextGroup(groupSkip);
    },

    handleAction: function (actionType, activeGroup) {
        if (this.state.isGameOver) return;
        if (activeGroup && this.state.groupNames.includes(activeGroup)) this.state.activeGroup = activeGroup;
        
        const wordObj = this.state.currentWordObj;
        const groups = this.state.groupNames;
        const curIdx = groups.indexOf(this.state.activeGroup);
        const rightGroup = groups[(curIdx + 1) % groups.length];
        const leftGroup = groups[(curIdx - 1 + groups.length) % groups.length];

        const isActionWord = wordObj && wordObj.isGameInWord;

        if (actionType === 'plus') {
            if (isActionWord) return; // Aksiyon varken + çalışmaz
            // 1 Puan kazanır, kelime değişir, SIRA DEĞİŞMEZ.
            this.state.scores[this.state.activeGroup]++;
            if (this.state.scores[this.state.activeGroup] >= this.state.winningPoints) {
                this.state.isGameOver = true;
            }
            this._pickNextWord();
        } else if (actionType === 'minus') {
            if (isActionWord) return; // Aksiyon varken - çalışmaz
            // 1 Puan kaybeder, kelime değişir, SIRADAKİ GRUBA geçer.
            this.state.scores[this.state.activeGroup]--;
            this._pickNextWord();
            this._nextGroup(1);
        } else if (actionType === 'changeWord') {
            if (isActionWord) return; // Aksiyon varken "Sıradaki Kelime" çalışmaz
            // Puan değişmez, kelime değişir, AKTİF GRUP +2 atlar.
            this._pickNextWord();
            this._nextGroup(2);
        } else if (actionType === 'action') {
            if (!isActionWord) return; // Normal kelime varken Aksiyon butonu çalışmaz (opsiyonel ama güvenli)
            const word = wordObj ? wordObj.Word : '';
            if (word === 'BANG!') {
                // Puan sıfırlanır, kelime değişir, SIRADAKİ GRUBA geçer.
                this.state.scores[this.state.activeGroup] = 0;
                this._pickNextWord();
                this._nextGroup(1);
            } else {
                // GIVE/TAKE: Puan değişir, kelime değişir, SIRA DEĞİŞMEZ.
                if (word === 'Give +1 Right') {
                    this.state.scores[this.state.activeGroup]--; 
                    this.state.scores[rightGroup]++;
                } else if (word === 'Give +1 Left') {
                    this.state.scores[this.state.activeGroup]--; 
                    this.state.scores[leftGroup]++;
                } else if (word === 'Take +1 Right') {
                    this.state.scores[rightGroup]--; 
                    this.state.scores[this.state.activeGroup]++;
                } else if (word === 'Take +1 Left') {
                    this.state.scores[leftGroup]--; 
                    this.state.scores[this.state.activeGroup]++;
                }
                this._pickNextWord();
            }
        }

        this.renderState();
    },

    _pickNextWord: function() {
        if (this.state.isGameOver) return;

        let RAND = Math.random();
        let selectedWord = null;

        // 1. %15 Aksiyon Kartı?
        if (RAND < 0.15 && this.state.actionCards.length > 0) {
            selectedWord = this.state.actionCards[Math.floor(Math.random() * this.state.actionCards.length)];
        } 
        else {
            // 2. Normal Kelime (%85)
            // Bu %85 içinde %25 Çıkmış Kelime, %75 Yeni Kelime (Oran: 1/4)
            let RAND2 = Math.random();
            if (RAND2 < 0.25 && this.state.seenWords.length > 0) {
                // Çıkmışlardan seç
                selectedWord = this.state.seenWords[Math.floor(Math.random() * this.state.seenWords.length)];
            } else {
                // Yeni kelimelerden seç
                if (this.state.unseenWords.length === 0) {
                    // Tüm kelimeler bittiyse havuzu tazele ama seenWordsCount'u sıfırlama (renk için)
                    this.state.unseenWords = [...this.state.sourceWords];
                    this.state.seenWords = [];
                }
                
                let idx = Math.floor(Math.random() * this.state.unseenWords.length);
                selectedWord = this.state.unseenWords[idx];
                
                // Seçileni unseen'den çıkar, seen'e ekle
                this.state.unseenWords.splice(idx, 1);
                this.state.seenWords.push(selectedWord);
            }
        }

        this.state.currentWordObj = selectedWord;
        this._markCurrentWordSeen();
    },

    _markCurrentWordSeen: function() {
        const wordObj = this.state.currentWordObj;
        if (wordObj && !wordObj.isGameInWord) {
            const wordKey = wordObj.Word.trim().toLowerCase();
            this.state.seenWordsCount[wordKey] = (this.state.seenWordsCount[wordKey] || 0) + 1;
        }
    }
};

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
    const displayMode = window.bangDisplayMode || 'Kelime';
    const wordObj = state.currentWordObj;

    // Aksiyon kartları (BANG!, Give vs.) her zaman metin olarak göster
    if (state.currentWordIsGameInWord || state.gameEnded) {
        wordDisplay.innerHTML = '';
        wordDisplay.textContent = state.currentWord || 'Kelime Bekleniyor...';
    } else if (wordObj && displayMode === 'Türkçe Anlam') {
        wordDisplay.innerHTML = '';
        wordDisplay.textContent = wordObj.TurkishMeaning || wordObj.Word || '—';
    } else if (wordObj && displayMode === 'İngilizce Anlam') {
        wordDisplay.innerHTML = '';
        wordDisplay.textContent = wordObj.EnglishMeaning || wordObj.Word || '—';
    } else if (wordObj && displayMode === 'Resim') {
        if (wordObj.ImageUrl && wordObj.ImageUrl.trim() !== '') {
            wordDisplay.innerHTML = `<img src="${wordObj.ImageUrl}" style="max-height:220px; max-width:100%; border-radius:12px; object-fit:contain;">`;
        } else {
            wordDisplay.innerHTML = '';
            wordDisplay.textContent = wordObj.Word || '—';
        }
    } else {
        wordDisplay.innerHTML = '';
        wordDisplay.textContent = state.currentWord || 'Kelime Bekleniyor...';
    }

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
        wordDisplay.style.color = '#ef4444'; // CSS override garantisi

        // Tekrarlanan kelimeler için de ipucu varsa göster (Açık/Kapalı Toggle'a göre opacity çalışır)
        const currentWordObj = wordObj;
        if (wordInfo) {
            if (currentWordObj && currentWordObj.Clue) {
                wordInfo.innerHTML = currentWordObj.Clue.startsWith('http') ? `<img src="${currentWordObj.Clue}" style="max-height:150px; border-radius:8px; margin-top:10px;">` : currentWordObj.Clue;
            } else {
                wordInfo.innerHTML = '';
            }
        }
    } else {
        // Normal kelimelerde ipucu (Clue) varsa Info alanına yazdır.
        wordDisplay.style.color = ''; // Rengi sıfırla
        const currentWordObj = wordObj;
        if (wordInfo) {
            if (currentWordObj && currentWordObj.Clue) {
                wordInfo.innerHTML = currentWordObj.Clue.startsWith('http') ? `<img src="${currentWordObj.Clue}" style="max-height:150px; border-radius:8px; margin-top:10px;">` : currentWordObj.Clue;
            } else {
                wordInfo.innerHTML = '';
            }
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
        wordDisplay.innerHTML = '';
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

    // OFFLINE MOD: Firebase'den kelimelerle oynanan oyun için API'yi atla
    if (window.bangOfflineMode) {
        BangEngine.handleAction(actionType, activeGroup);
        return;
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


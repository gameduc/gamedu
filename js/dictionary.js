const DictionaryEngine = (function () {
    let state = {
        config: null,
        words: [],
        currentWordIndex: 0,
        scores: [],
        groups: []
    };

    const DOM = {};

    function init(config) {
        state.config = config;
        state.words = [];
        state.currentWordIndex = 0;

        const useCust = config.UseCustomNames === 'Evet';
        const custStr = config.CustomGroupNames || '';
        const custNames = useCust && custStr ? custStr.split(',').map(s => s.trim()).filter(s => s) : [];

        const numGroups = parseInt(config.NumGroups) || 2;
        state.groups = [];
        for (let i = 0; i < numGroups; i++) {
            const defaultName = `Grup ${String.fromCharCode(65 + i)}`;
            state.groups.push(custNames[i] || defaultName);
        }
        state.scores = Array(numGroups).fill(0);

        DOM.title = document.getElementById('dictionaryPlayingGameTitle');
        DOM.scoresContainer = document.getElementById('dictionaryGroupScores');
        DOM.wordDisplay = document.getElementById('dictionaryWordDisplay');
        DOM.message = document.getElementById('dictionaryMessage');
        DOM.nextBtn = document.getElementById('dictionaryNextWordBtn');

        if (DOM.nextBtn) {
            DOM.nextBtn.onclick = () => {
                showNextWord();
            };
        }

        if (DOM.wordDisplay) {
            DOM.wordDisplay.textContent = "Kelimeler Yükleniyor...";
            DOM.wordDisplay.style.color = "#cbd5e1";
        }
        if (DOM.message) {
            DOM.message.textContent = "";
            DOM.message.style.fontSize = "1.5rem"; // Reset
            DOM.message.style.color = "#ec4899"; // Reset
        }

        setupScoresUI();

        fetchWords();
    }

    function fetchWords() {
        const apiUrl = typeof AppConfig !== 'undefined' ? AppConfig.apiBaseUrl : '';
        if (!apiUrl || apiUrl.trim() === '') {
            // Offline testing fallback
            state.words = ["APPLE", "BANANA", "COMPUTER", "SCIENCE", "SCHOOL", "TEACHER", "LIBRARY", "STUDY"];
            startGame();
            return;
        }

        const url = new URL(apiUrl);
        url.searchParams.append('api', 'true');
        url.searchParams.append('action', 'getDictionaryWords');
        url.searchParams.append('dictClass', state.config.DictClass || 'Tümü');
        url.searchParams.append('dictLesson', state.config.DictLesson || 'Tümü');
        url.searchParams.append('unitStart', state.config.DictUnitStart || 1);
        url.searchParams.append('unitEnd', state.config.DictUnitEnd || 50);

        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    if (DOM.wordDisplay) DOM.wordDisplay.textContent = "Hata: " + data.error;
                } else if (!data || data.length === 0) {
                    if (DOM.wordDisplay) DOM.wordDisplay.textContent = "Bu kriterlere uygun kelime bulunamadı.";
                } else {
                    state.words = data;
                    startGame();
                }
            })
            .catch(err => {
                if (DOM.wordDisplay) DOM.wordDisplay.textContent = "Bağlantı Hatası!";
                console.error(err);
            });
    }

    function setupScoresUI() {
        if (!DOM.scoresContainer) return;
        DOM.scoresContainer.innerHTML = '';
        state.groups.forEach((groupName, index) => {
            const card = document.createElement('div');
            card.className = 'group-score-card dictionary-group';
            card.style.cssText = `
                flex: 1; 
                min-width: 140px; 
                background: linear-gradient(145deg, #1e293b, #0f172a); 
                border: 2px solid #334155; 
                border-radius: 12px; 
                padding: 15px; 
                text-align: center; 
                cursor: pointer;
                transition: all 0.2s ease;
                position: relative;
                overflow: hidden;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            `;

            card.onclick = () => awardPoint(index);

            card.onmouseenter = () => { card.style.transform = 'translateY(-5px)'; card.style.borderColor = '#ec4899'; };
            card.onmouseleave = () => { card.style.transform = 'translateY(0)'; card.style.borderColor = '#334155'; };

            const nameEl = document.createElement('div');
            nameEl.style.cssText = `color: #cbd5e1; font-weight: bold; font-size: 1.2rem; margin-bottom: 5px;`;
            nameEl.textContent = groupName;

            const scoreEl = document.createElement('div');
            scoreEl.id = `dictScore_${index}`;
            scoreEl.style.cssText = `color: #fff; font-size: 3rem; font-weight: 900; transition: all 0.3s;`;
            scoreEl.textContent = "0";

            // Click hint
            const hintEl = document.createElement('div');
            hintEl.style.cssText = `color: #64748b; font-size: 0.8rem; margin-top: 10px;`;
            hintEl.textContent = "+1 Puan için Tıkla";

            card.appendChild(nameEl);
            card.appendChild(scoreEl);
            card.appendChild(hintEl);
            DOM.scoresContainer.appendChild(card);
        });
    }

    function startGame() {
        state.currentWordIndex = 0;
        showNextWord();
    }

    function showNextWord() {
        if (!DOM.wordDisplay) return;

        if (state.currentWordIndex >= state.words.length) {
            DOM.wordDisplay.textContent = "KELİMELER BİTTİ!";
            DOM.wordDisplay.style.color = "#ef4444";
            DOM.wordDisplay.style.fontSize = "4rem";
            return;
        }

        const word = state.words[state.currentWordIndex];

        DOM.wordDisplay.style.opacity = '0';
        DOM.wordDisplay.style.transform = 'scale(0.8)';

        setTimeout(() => {
            DOM.wordDisplay.textContent = word;
            DOM.wordDisplay.style.color = "#fff";
            DOM.wordDisplay.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            DOM.wordDisplay.style.opacity = '1';
            DOM.wordDisplay.style.transform = 'scale(1)';

            state.currentWordIndex++;
            if (DOM.message) DOM.message.textContent = "";
        }, 300);
    }

    function awardPoint(index) {
        if (state.currentWordIndex > state.words.length || !DOM.wordDisplay) return;

        // Zaten oyun bitme yazısındaysa tıklamayı engelle
        if (DOM.wordDisplay.textContent === "🏆 OYUN BİTTİ 🏆" || DOM.wordDisplay.textContent === "KELİMELER BİTTİ!") return;

        state.scores[index]++;
        const scoreEl = document.getElementById(`dictScore_${index}`);
        if (scoreEl) {
            scoreEl.textContent = state.scores[index];

            scoreEl.style.color = "#ec4899";
            scoreEl.style.transform = "scale(1.3)";
            setTimeout(() => {
                scoreEl.style.color = "#fff";
                scoreEl.style.transform = "scale(1)";
            }, 300);
        }

        const target = parseInt(state.config.WinTarget) || 5;
        if (state.scores[index] >= target) {
            endGame(state.groups[index]);
        } else {
            if (DOM.message) DOM.message.textContent = `✅ ${state.groups[index]} +1 Puan Katıldı!`;
            setTimeout(() => {
                showNextWord();
            }, 1500);
        }
    }

    function endGame(winnerName) {
        if (DOM.wordDisplay) {
            DOM.wordDisplay.textContent = "🏆 OYUN BİTTİ 🏆";
            DOM.wordDisplay.style.color = "#f59e0b";
            DOM.wordDisplay.style.transform = "scale(1.1)";
        }
        if (DOM.message) {
            DOM.message.innerHTML = `<span style="color:#fff">KAZANAN:</span> ${winnerName} 🥳`;
            DOM.message.style.fontSize = "2.5rem";
            DOM.message.style.color = "#10b981";
        }
        state.currentWordIndex = state.words.length + 99; // İlerlemeyi durdur
    }

    return {
        init: init
    };
})();

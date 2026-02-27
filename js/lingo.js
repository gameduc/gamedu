// --- LINGO OYUNU MODULU ---
// --- LINGO OYUN MODÜLÜ (FRONTEND MOTORU) ---
const LingoEngine = {
    state: {
        gameSheet: '',
        words: [],
        currentWordIndex: 0,
        currentWord: '',
        wordLength: 0,
        quota: 0,
        currentQuota: 1,
        players: [],
        currentPlayerIndex: 0,
        scores: {},
        boardWidth: 0,
        currentRow: 0,
        maxRows: 7,
        timer: null,
        initialTime: 15, // Config'ten gelecek değer
        timeLeft: 15,
        isGameOver: false,
        isWaitingForNext: false
    },

    init: function (sheetName) {
        this.state.gameSheet = sheetName;
        document.getElementById('lingoMessage').className = 'lingo-message';
        document.getElementById('lingoMessage').textContent = 'Oyun kelimeleri getiriliyor...';

        const formData = currentGameConfigData.reduce((acc, setting) => {
            const el = document.getElementById(setting.SettingName);
            if (setting.Type === 'multiselect') {
                const checkedValues = Array.from(document.querySelectorAll(`input[name="${setting.SettingName}"]:checked`))
                    .map(cb => cb.value);
                acc[setting.SettingName] = checkedValues.join(',');
            } else if (el) {
                acc[setting.SettingName] = el.value;
            }
            return acc;
        }, {});

        const apiUrl = typeof AppConfig !== 'undefined' ? AppConfig.apiBaseUrl : '';
        if (apiUrl && apiUrl.trim() !== '') {
            fetch(`${apiUrl}?api=true&action=getInitialLingoState&sheetName=${encodeURIComponent(sheetName)}&formData=${encodeURIComponent(JSON.stringify(formData))}`)
                .then(res => res.json())
                .then(data => {
                    if (data.error) {
                        showOzelAlert("Lingo başlatılamadı: " + data.error, "hata");
                        return;
                    }
                    this.startGame(data);
                })
                .catch(err => showOzelAlert("Bağlantı hatası: " + err, "hata"));
        } else {
            setTimeout(() => {
                this.startGame({
                    winningPoints: 1000,
                    groupNames: ['A', 'B'],
                    wordList: [
                        { Word: 'ELMA', Length: 4, Player: 'A', Quota: 1 },
                        { Word: 'ARMUT', Length: 5, Player: 'B', Quota: 1 }
                    ]
                });
            }, 500);
        }
    },

    startGame: function (data) {
        document.getElementById('lingoMessage').textContent = '';
        this.state.words = data.wordList || [];
        if (this.state.words.length === 0) {
            showOzelAlert('Oyun için kelime bulunamadı!', 'hata');
            return;
        }

        // Config'ten Geri Sayım (Süre) Bilgisini Çek! Varsayılan: 15
        let configTime = 15;
        if (data.gameConfig && data.gameConfig.Countdown) {
            configTime = parseInt(data.gameConfig.Countdown);
        }
        this.state.initialTime = isNaN(configTime) ? 15 : configTime;

        this.state.players = data.groupNames || ['A'];
        this.state.scores = {};
        this.state.players.forEach(p => this.state.scores[p] = 0);

        this.renderScores();

        this.state.currentWordIndex = 0;
        this.state.isGameOver = false;

        // UI Events
        const submitBtn = document.getElementById('lingoSubmitGuessBtn');
        const nextBtn = document.getElementById('lingoNextWordBtn');
        const guessInput = document.getElementById('lingoGuessInput');

        // Clone and replace to clear old listeners
        const newSubmitBtn = submitBtn.cloneNode(true);
        submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
        newSubmitBtn.addEventListener('click', () => this.handleGuess());

        const newNextBtn = nextBtn.cloneNode(true);
        nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
        newNextBtn.addEventListener('click', () => this.nextWord());

        const newGuessInput = guessInput.cloneNode(true);
        guessInput.parentNode.replaceChild(newGuessInput, guessInput);
        newGuessInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleGuess();
        });

        this.loadWord();
    },

    loadWord: function () {
        if (this.state.currentWordIndex >= this.state.words.length) {
            this.endGame();
            return;
        }

        const wordData = this.state.words[this.state.currentWordIndex];
        this.state.currentWord = wordData.Word.toUpperCase();
        this.state.wordLength = this.state.currentWord.length;
        this.state.currentPlayerIndex = this.state.players.indexOf(wordData.Player);
        this.state.currentQuota = wordData.Quota;
        this.state.boardWidth = this.state.wordLength;
        this.state.currentRow = 0;
        this.state.isWaitingForNext = false;
        this.state.timeLeft = this.state.initialTime;

        document.getElementById('lingoCurrentPlayer').textContent = wordData.Player;
        document.getElementById('lingoWordLength').textContent = this.state.wordLength;
        document.getElementById('lingoQuota').textContent = this.state.currentQuota;

        document.getElementById('lingoNextWordBtn').disabled = true;

        const guessInput = document.getElementById('lingoGuessInput');
        guessInput.value = '';
        guessInput.disabled = false;
        guessInput.maxLength = this.state.wordLength;
        document.getElementById('lingoSubmitGuessBtn').disabled = false;

        document.getElementById('lingoCorrectAnswerDisplay').style.display = 'none';

        this.setupBoard();
        this.startTimer();

        setTimeout(() => guessInput.focus(), 100);
    },

    setupBoard: function () {
        const board = document.getElementById('lingoGameBoard');
        board.style.gridTemplateColumns = `repeat(${this.state.boardWidth}, 1fr)`;
        board.innerHTML = '';

        for (let r = 0; r < this.state.maxRows; r++) {
            for (let c = 0; c < this.state.boardWidth; c++) {
                const cell = document.createElement('div');
                cell.className = 'lingo-letter-cell';
                cell.id = `lingo-cell-${r}-${c}`;

                if (r === this.state.maxRows - 1) cell.classList.add('stealing-row-bg');

                if (r === 0 && c === 0) {
                    cell.textContent = this.state.currentWord[0];
                    cell.classList.add('correct');
                } else if (r === 0) {
                    cell.textContent = '.';
                } else {
                    cell.classList.add('hidden');
                }
                board.appendChild(cell);
            }
        }
    },

    startTimer: function () {
        this.stopTimer();
        const display = document.getElementById('lingoTimerDisplay');
        display.classList.add('running');
        display.textContent = this.state.timeLeft;

        this.state.timer = setInterval(() => {
            if (this.state.isWaitingForNext || this.state.isGameOver) {
                this.stopTimer();
                return;
            }

            this.state.timeLeft--;
            display.textContent = this.state.timeLeft;

            if (this.state.timeLeft <= 0) {
                this.stopTimer();
                display.classList.remove('running');
                this.handleTimeout();
            }
        }, 1000);
    },

    stopTimer: function () {
        if (this.state.timer) {
            clearInterval(this.state.timer);
            this.state.timer = null;
        }
    },

    handleTimeout: function () {
        this.showMessage('Süre Bitti!', 'error');
        this.state.currentRow++;

        if (this.state.currentRow >= this.state.maxRows) {
            this.revealSecretWord();
            this.setWaitingForNext();
        } else {
            this.prepareNextRow();
            this.state.timeLeft = this.state.initialTime;
            this.startTimer();
        }
    },

    handleGuess: function () {
        if (this.state.isWaitingForNext || this.state.isGameOver || this.state.timeLeft <= 0) return;

        const inputEl = document.getElementById('lingoGuessInput');
        let guess = inputEl.value.toUpperCase().trim();

        if (guess.length !== this.state.wordLength) {
            this.showMessage(`Kelime ${this.state.wordLength} harfli olmalı!`, 'error');
            return;
        }

        const feedback = this.compareWords(guess, this.state.currentWord);

        for (let c = 0; c < this.state.boardWidth; c++) {
            const cell = document.getElementById(`lingo-cell-${this.state.currentRow}-${c}`);
            cell.classList.remove('hidden');
            cell.textContent = guess[c];
            cell.classList.add(feedback[c]);
        }

        if (guess === this.state.currentWord) {
            this.stopTimer();
            this.showMessage('DOĞRU TAHMİN!', 'success');

            const currentPlayer = this.state.players[this.state.currentPlayerIndex];
            const pointsToAdd = this.state.wordLength * 100;
            this.state.scores[currentPlayer] += pointsToAdd;
            this.renderScores();

            this.revealSecretWord();
            this.setWaitingForNext();
        } else {
            this.state.currentRow++;
            if (this.state.currentRow >= this.state.maxRows) {
                this.stopTimer();
                this.showMessage('HAKKINIZ BİTTİ!', 'error');
                this.revealSecretWord();
                this.setWaitingForNext();
            } else {
                inputEl.value = '';
                this.prepareNextRow(feedback, guess);
                // Kullanıcı her mantıklı tahminde bulunduğunda süre sıfırlanır
                this.state.timeLeft = this.state.initialTime;
                this.startTimer();
            }
        }
    },

    compareWords: function (guess, secret) {
        const feedback = new Array(this.state.boardWidth).fill('absent');
        const secretLetters = secret.split('');
        const guessLetters = guess.split('');
        const tempSecret = [...secretLetters];

        for (let i = 0; i < this.state.boardWidth; i++) {
            if (guessLetters[i] === tempSecret[i]) {
                feedback[i] = 'correct';
                tempSecret[i] = null;
            }
        }

        for (let i = 0; i < this.state.boardWidth; i++) {
            if (feedback[i] === 'correct') continue;
            for (let j = 0; j < this.state.boardWidth; j++) {
                if (tempSecret[j] !== null && guessLetters[i] === tempSecret[j]) {
                    feedback[i] = 'present';
                    tempSecret[j] = null;
                    break;
                }
            }
        }
        return feedback;
    },

    prepareNextRow: function (lastFeedback = [], lastGuess = '') {
        for (let c = 0; c < this.state.boardWidth; c++) {
            const cell = document.getElementById(`lingo-cell-${this.state.currentRow}-${c}`);
            cell.classList.remove('hidden');

            if (c === 0) {
                cell.textContent = this.state.currentWord[0];
                cell.classList.add('correct');
            } else if (lastFeedback[c] === 'correct') {
                cell.textContent = lastGuess[c];
                cell.classList.add('correct');
            } else {
                cell.textContent = '.';
            }
        }
        document.getElementById('lingoGuessInput').focus();
    },

    revealSecretWord: function () {
        const revealDiv = document.getElementById('lingoCorrectAnswerDisplay');
        revealDiv.style.gridTemplateColumns = `repeat(${this.state.boardWidth}, 1fr)`;
        revealDiv.innerHTML = '';

        for (let c = 0; c < this.state.boardWidth; c++) {
            const cell = document.createElement('div');
            cell.className = 'lingo-letter-cell correct';
            cell.textContent = this.state.currentWord[c];
            revealDiv.appendChild(cell);
        }
        revealDiv.style.display = 'grid';
    },

    setWaitingForNext: function () {
        this.state.isWaitingForNext = true;
        document.getElementById('lingoGuessInput').disabled = true;
        document.getElementById('lingoSubmitGuessBtn').disabled = true;
        document.getElementById('lingoNextWordBtn').disabled = false;
        document.getElementById('lingoNextWordBtn').focus();

        document.getElementById('lingoAddWordsToPoolBtn').style.display = 'inline-block';
    },

    nextWord: function () {
        this.state.currentWordIndex++;
        document.getElementById('lingoAddWordsToPoolBtn').style.display = 'none';
        this.loadWord();
    },

    endGame: function () {
        this.state.isGameOver = true;
        this.stopTimer();
        document.getElementById('lingoGameOverMessage').textContent = 'Oyun Bitti! Skorları Kontrol Edin.';
        document.getElementById('lingoGameOverMessage').style.display = 'block';
        document.getElementById('lingoNewGameBtn').style.display = 'inline-block';

        document.getElementById('lingoGuessInput').disabled = true;
        document.getElementById('lingoSubmitGuessBtn').disabled = true;
    },

    showMessage: function (msg, type) {
        const msgEl = document.getElementById('lingoMessage');
        msgEl.textContent = msg;
        msgEl.className = 'lingo-message ' + (type === 'success' ? 'success' : '');

        if (type !== 'error') {
            setTimeout(() => {
                if (msgEl.textContent === msg) msgEl.textContent = '';
            }, 3000);
        }
    },

    renderScores: function () {
        const container = document.getElementById('lingoGroupScores');
        container.innerHTML = '';
        this.state.players.forEach(p => {
            const isActive = (this.state.players[this.state.currentPlayerIndex] === p);
            const scoreBox = document.createElement('div');

            // Küçültülmüş, Başlık Yanına Sığan Inline Style
            scoreBox.style = `background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 2px 10px; min-width: 60px; text-align: center; ${isActive ? 'border-color: #3b82f6; background: rgba(59,130,246,0.1);' : ''}`;
            scoreBox.innerHTML = `
                <div style="font-size: 0.70rem; color: #94a3b8; font-weight: bold; margin-bottom: 2px;">Grup ${p}</div>
                <div style="font-size: 1.1rem; font-weight: bold; color: #fff;">${this.state.scores[p]}</div>
            `;
            container.appendChild(scoreBox);
        });
    }
};

function loadInitialLingoState(sheetName) {
    LingoEngine.init(sheetName);
}

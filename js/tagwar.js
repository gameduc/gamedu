/**
 * TAG WAR ENGINE
 * Akıllı Tahta Düellosu - Bölünmüş Ekran Halat Çekme
 */

const TagWarEngine = {
    state: {
        mode: 'accumulation', // accumulation | speed
        difficulty: '1. Sınıf (Kolay)',
        operations: ['Toplama', 'Çıkarma'],
        sourceData: [],
        timer: 60,
        scores: { A: 0, B: 0 },
        currentQuestions: { A: null, B: null },
        isGameOver: false,
        timerInterval: null,
        gameType: 'math',     // math | words
        winningPoints: 20
    },

    init: function(config) {
        this.state.mode = (config.TagMode === 'Hız Düellosu') ? 'speed' : 'accumulation';
        this.state.difficulty = config.TagMathDifficulty || '1. Sınıf (Kolay)';
        this.state.operations = config.TagMathOperations ? config.TagMathOperations.split(',').map(s => s.trim()) : ['Toplama'];
        this.state.timer = parseInt(config.TagDuration) || 60;
        this.state.winningPoints = parseInt(config.TagWinningScore) || 20;
        this.state.gameType = (config.TagGameType === 'Matematik') ? 'math' : 'words';
        this.state.scores = { A: 0, B: 0 };
        this.state.isGameOver = false;
        
        this.state.displayMode = config.DisplayMode || "Türkçe Sor - İngilizce İste";
        document.getElementById('tagInputA').value = '';
        document.getElementById('tagInputB').value = '';

        if (this.state.gameType === 'math') {
            if (this.state.mode === 'speed') {
                this._generateNewQuestion('CENTER');
                this.state.currentQuestions['A'] = this.state.currentQuestions['CENTER'];
                this.state.currentQuestions['B'] = this.state.currentQuestions['CENTER'];
            } else {
                this._generateNewQuestion('A');
                this._generateNewQuestion('B');
            }
        } else {
            // Eger Kelime secildiyse kelime setini offline fetchleyeceğiz
            this._fetchWordsFromFirebase(config);
            return; // renderUI, startTimer vb fetching bitince cagirilir.
        }

        this.renderUI();
        this.renderKeypads();
        this.addInputListeners();
        this.startTimer();
    },

    _fetchWordsFromFirebase: function(config) {
        const stage = document.getElementById('tagWarStage');
        let orgHtml = stage ? stage.innerHTML : '';
        if (stage) stage.innerHTML = '<h2 style="color:white; z-index:100; position:absolute; left:50%; transform:translateX(-50%); top:10%; text-align:center;">Firebase Veritabanından Sorular Çekiliyor...<br>Lütfen Bekleyin 🚀</h2>';

        const setIds = config.SelectedSets ? config.SelectedSets.split(',') : [];
        if (setIds.length === 0 || typeof database === 'undefined') {
            showOzelAlert("Seçilen set bulunamadı veya veritabanına bağlanılamadı.", "hata");
            TagWarEngine.requestEarlyExit();
            return;
        }

        let allWords = [];
        let promises = setIds.map(id => database.ref('MasterPool/' + id).once('value'));

        Promise.all(promises).then(snapshots => {
            snapshots.forEach(snap => {
                if (snap.exists()) {
                    let setData = snap.val();
                    if (setData.Data && Array.isArray(setData.Data)) {
                        setData.Data.forEach(item => {
                            if (item && item.Word) {
                                allWords.push(item);
                            }
                        });
                    }
                }
            });

            if (allWords.length === 0) {
                showOzelAlert("Seçili setlerde geçerli kelime bulunamadı.", "hata");
                TagWarEngine.requestEarlyExit();
                return;
            }

            // Shuffle
            for (let i = allWords.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
            }

            this.state.sourceData = allWords;
            if (stage) stage.innerHTML = orgHtml; // Restore gif

            if (this.state.mode === 'speed') {
                this._pickWordQuestion('CENTER');
                this.state.currentQuestions['A'] = this.state.currentQuestions['CENTER'];
                this.state.currentQuestions['B'] = this.state.currentQuestions['CENTER'];
            } else {
                this._pickWordQuestion('A');
                this._pickWordQuestion('B');
            }
            
            this.renderUI();
            this.renderKeypads();
            this.addInputListeners();
            this.startTimer();
        }).catch(err => {
            console.error("Firebase Hatası: ", err);
            showOzelAlert("Kelimeler çekilirken bir hata oluştu.", "hata");
            TagWarEngine.requestEarlyExit();
        });
    },

    renderKeypads: function() {
        this.renderKeypad('A');
        this.renderKeypad('B');
    },

    renderKeypad: function(side) {
        const container = document.getElementById(`keypad${side}`);
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.state.gameType === 'math') {
            container.style.display = 'grid'; // .virtual-keypad default is grid
            const keys = [7, 8, 9, 4, 5, 6, 1, 2, 3, 'C', 0, '⌫'];
            
            keys.forEach(key => {
                const btn = document.createElement('button');
                btn.textContent = key;
                if (key === '⌫') btn.className = 'key-del';
                if (key === 'C') btn.className = 'key-clear';
                
                btn.onclick = () => this.handleKeypress(side, key);
                container.appendChild(btn);
            });
        } else {
            // Words: Turkish Q-Keyboard
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '5px';
            container.style.alignItems = 'center';
            container.style.width = '100%';

            const row1 = ['q','w','e','r','t','y','u','ı','o','p','ğ','ü'];
            const row2 = ['a','s','d','f','g','h','j','k','l','ş','i'];
            const row3 = ['z','x','c','v','b','n','m','ö','ç'];
            const row4 = ['C', 'Space', '⌫', 'ENTER'];

            const createRow = (keysArr) => {
                const r = document.createElement('div');
                r.style.display = 'flex'; r.style.gap = '5px'; r.style.justifyContent = 'center'; r.style.width = '100%';
                keysArr.forEach(key => {
                    const btn = document.createElement('button');
                    if (key === 'Space') btn.textContent = 'Boşluk';
                    else if (key === 'ENTER') btn.innerHTML = '✔️';
                    else btn.textContent = key.toUpperCase();

                    btn.style.flex = (key === 'Space' || key === 'ENTER') ? '2' : '1';
                    btn.style.padding = '8px 0';
                    btn.style.fontSize = '1.1rem';
                    btn.style.fontWeight = 'bold';
                    btn.style.borderRadius = '5px';
                    btn.style.border = '1px solid rgba(255,255,255,0.2)';
                    btn.style.background = 'rgba(255,255,255,0.1)';
                    btn.style.color = '#fff';
                    btn.style.cursor = 'pointer';

                    // Modifiers
                    if (key === '⌫') btn.style.background = '#f59e0b';
                    if (key === 'C') btn.style.background = '#ef4444';
                    if (key === 'ENTER') btn.style.background = '#10b981';

                    btn.onmousedown = () => btn.style.transform = 'scale(0.95)';
                    btn.onmouseup = () => btn.style.transform = 'scale(1)';
                    btn.onmouseleave = () => btn.style.transform = 'scale(1)';

                    btn.onclick = () => this.handleKeypress(side, key);
                    r.appendChild(btn);
                });
                return r;
            };

            container.appendChild(createRow(row1));
            container.appendChild(createRow(row2));
            container.appendChild(createRow(row3));
            container.appendChild(createRow(row4));
        }
    },

    handleKeypress: function(side, key) {
        const input = document.getElementById(`tagInput${side}`);
        if (!input) return;

        if (key === '⌫') {
            input.value = input.value.slice(0, -1);
        } else if (key === 'C') {
            input.value = '';
        } else if (key === 'Space') {
            input.value += ' ';
        } else if (key === 'ENTER') {
            if (this.state.gameType === 'words') {
                this.handleInput(side, input.value, true);
            }
        } else {
            input.value += key;
        }

        // Matematikte anında kontrol
        if (this.state.gameType === 'math' && key !== 'ENTER') {
            this.handleInput(side, input.value, false);
        }

        this.renderUI();
    },

    addInputListeners: function() {
        // Fiziksel klavye desteği (İsteğe bağlı, Akıllı tahta için dokunmatik öncelikli)
        document.addEventListener('keydown', (e) => {
            if (this.state.isGameOver) return;
            // Sol taraf (A) için Q, W, E... gibi tuşlar veya sağ taraf için P, O, L...
            // Şimdilik sadece virtual keypad üzerinden işlem yapıyoruz.
        });
    },

    _generateNewQuestion: function(side) {
        let q = "";
        let ans = 0;
        
        let diff = this.state.difficulty;
        let ops = this.state.operations;
        if (ops.length === 0) ops = ['Toplama'];

        // Seçilen işlemlerden rastgele birini seç
        let op = ops[Math.floor(Math.random() * ops.length)];

        if (op === 'Toplama') {
            if (diff.includes('1. Sınıf')) {
                let a = Math.floor(Math.random() * 10) + 1;
                let b = Math.floor(Math.random() * 10) + 1;
                q = `${a} + ${b}`; ans = a + b;
            } else if (diff.includes('2. Sınıf')) {
                let a = Math.floor(Math.random() * 50) + 5;
                let b = Math.floor(Math.random() * 45) + 5;
                q = `${a} + ${b}`; ans = a + b;
            } else if (diff.includes('3-4. Sınıf')) {
                let a = Math.floor(Math.random() * 100) + 10;
                let b = Math.floor(Math.random() * 100) + 10;
                q = `${a} + ${b}`; ans = a + b;
            } else { // Ortaokul
                let a = Math.floor(Math.random() * 500) + 100;
                let b = Math.floor(Math.random() * 500) + 100;
                q = `${a} + ${b}`; ans = a + b;
            }
        } else if (op === 'Çıkarma') {
            if (diff.includes('1. Sınıf')) {
                let a = Math.floor(Math.random() * 20) + 5;
                let b = Math.floor(Math.random() * 10) + 1;
                if (b > a) [a, b] = [b, a]; // A her zaman büyük eksi çıkmasın
                q = `${a} - ${b}`; ans = a - b;
            } else if (diff.includes('2. Sınıf')) {
                let a = Math.floor(Math.random() * 50) + 20;
                let b = Math.floor(Math.random() * 30) + 5;
                if (b > a) [a, b] = [b, a];
                q = `${a} - ${b}`; ans = a - b;
            } else if (diff.includes('3-4. Sınıf')) {
                let a = Math.floor(Math.random() * 200) + 50;
                let b = Math.floor(Math.random() * 100) + 10;
                if (b > a) [a, b] = [b, a];
                q = `${a} - ${b}`; ans = a - b;
            } else { // Ortaokul
                let a = Math.floor(Math.random() * 1000) + 200;
                let b = Math.floor(Math.random() * 500) + 50;
                if (b > a) [a, b] = [b, a]; // İleride eksi bırakılabilir zor seviyede
                q = `${a} - ${b}`; ans = a - b;
            }
        } else if (op === 'Çarpma') {
            if (diff.includes('1. Sınıf') || diff.includes('2. Sınıf')) {
                let a = Math.floor(Math.random() * 5) + 1;
                let b = Math.floor(Math.random() * 5) + 1;
                q = `${a} x ${b}`; ans = a * b;
            } else if (diff.includes('3-4. Sınıf')) {
                let a = Math.floor(Math.random() * 9) + 2;
                let b = Math.floor(Math.random() * 9) + 2;
                q = `${a} x ${b}`; ans = a * b;
            } else { // Ortaokul
                let a = Math.floor(Math.random() * 15) + 5;
                let b = Math.floor(Math.random() * 9) + 2;
                q = `${a} x ${b}`; ans = a * b;
            }
        } else if (op === 'Bölme') {
            if (diff.includes('1. Sınıf') || diff.includes('2. Sınıf')) {
                let b = Math.floor(Math.random() * 5) + 1;
                let ansT = Math.floor(Math.random() * 5) + 1;
                let a = b * ansT;
                q = `${a} ÷ ${b}`; ans = ansT;
            } else if (diff.includes('3-4. Sınıf')) {
                let b = Math.floor(Math.random() * 9) + 2;
                let ansT = Math.floor(Math.random() * 9) + 2;
                let a = b * ansT;
                q = `${a} ÷ ${b}`; ans = ansT;
            } else { // Ortaokul
                let b = Math.floor(Math.random() * 12) + 2;
                let ansT = Math.floor(Math.random() * 20) + 5;
                let a = b * ansT;
                q = `${a} ÷ ${b}`; ans = ansT;
            }
        } else if (op === 'Üslü Sayılar') {
            if (diff.includes('1. Sınıf') || diff.includes('2. Sınıf')) {
                let a = Math.floor(Math.random() * 5) + 1;
                q = `${a}²`; ans = a * a;
            } else if (diff.includes('3-4. Sınıf')) {
                let a = Math.floor(Math.random() * 10) + 1;
                q = `${a}²`; ans = a * a;
            } else { // Ortaokul
                if (Math.random() > 0.5) {
                    let a = Math.floor(Math.random() * 5) + 2;
                    q = `${a}³`; ans = a * a * a;
                } else {
                    let a = Math.floor(Math.random() * 15) + 2;
                    q = `${a}²`; ans = a * a;
                }
            }
        } else {
            let a = Math.floor(Math.random() * 10) + 1;
            let b = Math.floor(Math.random() * 10) + 1;
            q = `${a} + ${b}`; ans = a + b;
        }

        this.state.currentQuestions[side] = { question: q, answer: ans.toString() };
    },

    _pickWordQuestion: function(side) {
        if (this.state.sourceData.length === 0) return;
        let idx = Math.floor(Math.random() * this.state.sourceData.length);
        let item = this.state.sourceData[idx];
        
        let qText = item.Word;
        let aText = item.MeaningTR || item.TurkishMeaning || item.Word;

        if (this.state.displayMode === "Kelime" || this.state.displayMode === "İngilizce Sor - Türkçe İste") {
            qText = item.Word;
            aText = item.MeaningTR || item.TurkishMeaning || item.Word;
        } else if (this.state.displayMode === "Türkçe Anlam" || this.state.displayMode === "Türkçe Sor - İngilizce İste") {
            let mTR = item.MeaningTR || item.TurkishMeaning;
            qText = mTR ? mTR : `[Anlamı Yok] ${item.Word}`;
            aText = item.Word;
        } else if (this.state.displayMode === "İngilizce Anlam" || this.state.displayMode === "Sadece Yazım Pratiği (İng - İng)") {
            qText = item.MeaningEN || item.EnglishMeaning || item.Word;
            aText = item.Word;
        } else {
            // Varsayılan (Geriye uyumluluk)
            qText = item.Word;
            aText = item.MeaningTR || item.TurkishMeaning || item.Word;
        }

        this.state.currentQuestions[side] = { 
            question: qText, 
            answer: aText.trim().toLocaleLowerCase('tr-TR'),
            originalData: item // debug için
        };
    },

    handleInput: function(side, val, isSubmit = false) {
        if (this.state.isGameOver) return;
        const target = this.state.currentQuestions[side];
        if (!target) return;

        // Virgülle veya / ile ayrılmış cevapları kabul etmek
        let sepAnswers = [];
        if (target.answer.includes(',')) sepAnswers = target.answer.split(',');
        else if (target.answer.includes('/')) sepAnswers = target.answer.split('/');
        else sepAnswers = [target.answer];

        const correctAnswers = sepAnswers.map(s => s.trim().toLocaleLowerCase('tr-TR'));
        const userVal = val.trim().toLocaleLowerCase('tr-TR');

        console.log(`[TagWar Debug] Beklenen: ${correctAnswers} | Girilen: ${userVal}`);

        if (correctAnswers.includes(userVal)) {
            this.state.scores[side]++;
            // İki tarafın da giriş alanını temizle (özellikle hız düellosunda)
            const inputA = document.getElementById(`tagInputA`);
            const inputB = document.getElementById(`tagInputB`);
            if (inputA) inputA.value = '';
            if (inputB) inputB.value = '';
            
            this._onSuccess(side);
        } else if (isSubmit && this.state.gameType === 'words') {
            // Yanlış cevap + Enter
            const input = document.getElementById(`tagInput${side}`);
            if (input) {
                input.value = '';
                // Basit bir kırmızı ekran pırıltısı
                const sideEl = document.querySelector(`.side-${side.toLowerCase()}`);
                if (sideEl) {
                    sideEl.style.boxShadow = "inset 0 0 50px rgba(239,68,68,0.8)";
                    setTimeout(() => sideEl.style.boxShadow = "none", 300);
                }
            }
        }
    },

    _onSuccess: function(side) {
        // Görsel efekt: Cevap verildiği an küçük bir sarsıntı hissi eklenebilir
        const stage = document.getElementById('tagWarStage');
        if (stage) {
            stage.style.transform = stage.style.transform + ' scale(1.02)';
            setTimeout(() => this.updateAnimation(), 150);
        } else {
            this.updateAnimation();
        }

        this.updateAnimation();
        
        if (this.state.mode === 'speed') {
            // Hız düellosunda biri bilince her iki tarafın sorusu değişir
            this._nextStep('A');
            this._nextStep('B');
            this._checkWinCondition();
        } else {
            // Zaman yarışında sadece bilen tarafın sorusu değişir
            this._nextStep(side);
        }
        this.renderUI();
    },

    _nextStep: function(side) {
        if (this.state.mode === 'speed') {
            if (this.state.gameType === 'math') {
                 this._generateNewQuestion('CENTER');
                 this.state.currentQuestions['A'] = this.state.currentQuestions['CENTER'];
                 this.state.currentQuestions['B'] = this.state.currentQuestions['CENTER'];
            } else {
                 this._pickWordQuestion('CENTER');
                 this.state.currentQuestions['A'] = this.state.currentQuestions['CENTER'];
                 this.state.currentQuestions['B'] = this.state.currentQuestions['CENTER'];
            }
        } else {
            if (this.state.gameType === 'math') {
                this._generateNewQuestion(side);
            } else {
                this._pickWordQuestion(side);
            }
        }
    },

    _checkWinCondition: function() {
        if (this.state.mode === 'speed') {
            if (this.state.scores.A >= this.state.winningPoints || this.state.scores.B >= this.state.winningPoints) {
                this.endGame();
            }
        }
    },

    startTimer: function() {
        if (this.state.mode !== 'accumulation') return;
        clearInterval(this.state.timerInterval);
        this.state.timerInterval = setInterval(() => {
            this.state.timer--;
            if (this.state.timer <= 0) {
                this.endGame();
            }
            this.updateTimerUI();
        }, 1000);
    },

    updateTimerUI: function() {
        const timerEl = document.getElementById('tagWarTimer');
        if (timerEl) timerEl.textContent = this.state.timer;
    },

    requestEarlyExit: function() {
        if (this.state.isGameOver) {
            if(typeof goToLobby === 'function') goToLobby();
            return;
        }

        // Timer'ı gecici durdur
        clearInterval(this.state.timerInterval);

        // Ozel onay kutusunu cagirma
        try {
            showOzelAlert("Oyundan çıkıp lobiye dönmek istediğinize emin misiniz?", "evethayir", (isConfirmed) => {
                if (isConfirmed) {
                    this.state.isGameOver = true;
                    if(typeof goToLobby === 'function') goToLobby();
                } else {
                    // Hayır derse timer'i kaldiya yerden devam ettir (sadece zaman yarisindaysa)
                    if (this.state.mode === 'accumulation') {
                        this.startTimer();
                    }
                }
            });
        } catch (e) {
            // Eger showOzelAlert yoksa klasik confirm()
            if (confirm("Oyundan çıkıp lobiye dönmek istediğinize emin misiniz?")) {
                this.state.isGameOver = true;
                if(typeof goToLobby === 'function') goToLobby();
            } else {
                if (this.state.mode === 'accumulation') {
                    this.startTimer();
                }
            }
        }
    },

    updateAnimation: function() {
        const diff = this.state.scores.A - this.state.scores.B;
        // Puan farkına göre halatı ve askerleri kaydır
        // Her puan 20px kayma yapsın (max 200px sınırlı)
        let offset = diff * 15; 
        if (offset > 250) offset = 250;
        if (offset < -250) offset = -250;

        const stage = document.getElementById('tagWarStage');
        if (stage) {
            stage.style.transform = `translateX(${offset}px)`;
        }
    },

    renderUI: function() {
        const qA = document.getElementById('tagWarQuestionA');
        const qB = document.getElementById('tagWarQuestionB');
        const qCenter = document.getElementById('tagWarQuestionCenter');
        
        const inA = document.getElementById('tagInputA');
        const inB = document.getElementById('tagInputB');

        const sA = document.getElementById('tagWarScoreA');
        const sB = document.getElementById('tagWarScoreB');

        if (sA) sA.textContent = this.state.scores.A;
        if (sB) sB.textContent = this.state.scores.B;

        // Speed Duel vs Accumulation Mode Display
        if (this.state.mode === 'speed') {
            if (qA) qA.style.display = 'none';
            if (qB) qB.style.display = 'none';
            if (qCenter) {
                qCenter.style.display = 'block';
                qCenter.textContent = this.state.currentQuestions.A ? this.state.currentQuestions.A.question : '';
            }

            // Text Inputs Horizontal Display for Speed Mode (Above Keypads)
            let dA = document.getElementById('tagDisplayA');
            if (!dA) { 
                dA = document.createElement('div'); 
                dA.id='tagDisplayA'; 
                dA.style.cssText="font-size:1.8rem; color:#fff; min-height:1.2em; border-bottom:2px solid rgba(255,255,255,0.2); width:80%; margin-bottom:10px; text-align:center;"; 
                const keypadA = document.getElementById('keypadA');
                if(keypadA) keypadA.before(dA); 
            }
            let dB = document.getElementById('tagDisplayB');
            if (!dB) { 
                dB = document.createElement('div'); 
                dB.id='tagDisplayB'; 
                dB.style.cssText="font-size:1.8rem; color:#fff; min-height:1.2em; border-bottom:2px solid rgba(255,255,255,0.2); width:80%; margin-bottom:10px; text-align:center;"; 
                const keypadB = document.getElementById('keypadB');
                if(keypadB) keypadB.before(dB); 
            }

            if (inA && dA) dA.textContent = inA.value || '...';
            if (inB && dB) dB.textContent = inB.value || '...';

        } else {
            // Accumulation / Time Trial Mode
            if (qCenter) qCenter.style.display = 'none';
            if (qA) qA.style.display = 'block';
            if (qB) qB.style.display = 'block';

            if (qA && inA && this.state.currentQuestions.A) {
                let currentInput = inA.value ? `<div style="font-size:1.8rem; color:#fff; margin-top:10px; min-height:1.2em; border-bottom: 2px solid rgba(255,255,255,0.2); width: 80%; margin-left: 10%;">${inA.value}</div>` : `<div style="font-size:1.8rem; color:rgba(255,255,255,0.2); margin-top:10px; min-height:1.2em;">...</div>`;
                qA.innerHTML = `<div>${this.state.currentQuestions.A.question}</div>${currentInput}`;
            }
            if (qB && inB && this.state.currentQuestions.B) {
                let currentInput = inB.value ? `<div style="font-size:1.8rem; color:#fff; margin-top:10px; min-height:1.2em; border-bottom: 2px solid rgba(255,255,255,0.2); width: 80%; margin-left: 10%;">${inB.value}</div>` : `<div style="font-size:1.8rem; color:rgba(255,255,255,0.2); margin-top:10px; min-height:1.2em;">...</div>`;
                qB.innerHTML = `<div>${this.state.currentQuestions.B.question}</div>${currentInput}`;
            }

            // Cleanup any tags from speed mode
            const dA = document.getElementById('tagDisplayA');
            const dB = document.getElementById('tagDisplayB');
            if(dA) { dA.style.display = 'none'; dA.textContent = ''; }
            if(dB) { dB.style.display = 'none'; dB.textContent = ''; }
        }
    },

    endGame: function(isEarlyExit = false) {
        this.state.isGameOver = true;
        clearInterval(this.state.timerInterval);
        
        if (isEarlyExit) {
            // Sadece lobiye dön, win uyarısı basma
            if(typeof goToLobby === 'function') goToLobby();
            return;
        }

        let winner = this.state.scores.A > this.state.scores.B ? "YEŞİL TAKIM" : "KIRMIZI TAKIM";
        if (this.state.scores.A === this.state.scores.B) winner = "BERABERE";
        
        showOzelAlert(`Oyun Bitti! Kazanan: ${winner}`, "tamam", () => {
            // Lobiye dönme butonu aktif edilebilir
        });
    }
};

window.TagWarEngine = TagWarEngine;

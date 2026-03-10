// BAAMBOO OYUN MOTORU (Faz 7)

const BaambooEngine = {
    config: null,
    groups: [],
    groupScores: {},
    currentActiveGroupIndex: 0,
    boxes: [], // 24 kutunun state'leri
    actions: ['baam', 'boo', 'magnet', 'swap', 'plus20'],
    remainingActions: [],
    countdownSecs: 15,
    timerInterval: null,

    init: function (config) {
        this.config = config;
        this.numGroups = parseInt(config.NumGroups) || 4;
        this.countdownSecs = parseInt(config.BbCountdown) || 15;

        // Reset states
        this.groupScores = {};
        this.groups = [];
        for (let i = 0; i < this.numGroups; i++) {
            const groupName = String.fromCharCode(65 + i); // A, B, C...
            this.groups.push(groupName);
            this.groupScores[groupName] = 0;
        }

        this.currentActiveGroupIndex = 0;

        // Fetch Data from Firebase (Dinamik Set Checkbox Sistemine Geçildi)
        if (typeof database !== 'undefined') {
            this.fetchDataFromFirebase(config);
        } else {
            // Şimdilik sorular ve aksiyonlar için sahte bir dağılım yapalım (19 Soru + 5 Aksiyon)
            this.generateBoxData();
            this.startUI();
        }
    },

    startUI: function () {
        // UI Hazırlıkları
        this.renderGroupScores();
        this.renderGrid();
        this.updateActionHUD();
        this.updateActiveGroupHighlight();

        // Dinleyici Atamaları
        document.getElementById('bbPassBtn').onclick = () => this.closeQuestionModal(false);
        document.getElementById('bbPlusBtn').onclick = () => this.awardPoints(15);
        document.getElementById('bbShowAnswerBtn').onclick = () => this.showAnswer();
        document.getElementById('bbClueBtn').onclick = () => this.showClue();
    },

    fetchDataFromFirebase: function (config) {
        document.getElementById('baambooGridContainer').innerHTML = '<h2 style="color:white; grid-column: 1 / -1; text-align:center;">Firebase Veritabanından Sorular Çekiliyor... Lütfen Bekleyin 🚀</h2>';

        const setIds = config.BbSetsCheckbox ? config.BbSetsCheckbox.split(',') : [];
        if (setIds.length === 0 || typeof database === 'undefined') {
            showOzelAlert("Seçilen set bulunamadı veya veritabanına bağlanılamadı.", "hata");
            this.generateBoxData();
            this.startUI();
            return;
        }

        let allQuestions = [];
        let promises = setIds.map(id => database.ref('MasterPool/' + id).once('value'));

        Promise.all(promises).then(snapshots => {
            snapshots.forEach(snap => {
                if (snap.exists()) {
                    let setData = snap.val();
                    if (setData.Data && Array.isArray(setData.Data)) {
                        setData.Data.forEach(item => {
                            if (item) {
                                // Apply settings filter (Multichoice vs OpenEnded)
                                const reqAction = config.BbIsMultipleChoice || "Tümü"; // "Tümü", "Çoktan Seçmeli", "Açık Uçlu"
                                let isItemMulti = (setData.SubType !== 'acik_uclu');
                                let addIt = false;
                                if (reqAction === "Tümü") addIt = true;
                                else if (reqAction === "Çoktan Seçmeli" && isItemMulti) addIt = true;
                                else if (reqAction === "Açık Uçlu" && !isItemMulti) addIt = true;

                                if (addIt) {
                                    allQuestions.push({
                                        text: item.QuestionText,
                                        correctAnswer: item.CorrectAnswer || item.OptionA || "Cevap Yok",
                                        clue: item.Clue || "",
                                        imgUrl: item.ImgURL || "",
                                        isMultipleChoice: isItemMulti,
                                        options: {
                                            A: item.OptionA || "",
                                            B: item.OptionB || "",
                                            C: item.OptionC || "",
                                            D: item.OptionD || "",
                                            E: item.OptionE || ""
                                        }
                                    });
                                }
                            }
                        });
                    }
                }
            });

            // Shuffle and pick
            allQuestions = allQuestions.sort(() => 0.5 - Math.random());
            if (allQuestions.length === 0) {
                showOzelAlert("Seçilen setlerde bu kriterlere uygun soru bulunamadı.", "hata");
                this.generateBoxData(); // Fallback
                this.startUI();
            } else {
                this.processApiData(allQuestions);
                this.startUI();
            }
        }).catch(err => {
            showOzelAlert("Firebase Hatası: " + err.message, "hata");
            this.generateBoxData();
            this.startUI();
        });
    },

    processApiData: function (questions) {
        this.boxes = [];
        this.remainingActions = [...this.actions];

        // Rastgele 5 kutu seçip aksiyon atayalım
        let actionPositions = [];
        while (actionPositions.length < 5) {
            let r = Math.floor(Math.random() * 24);
            if (actionPositions.indexOf(r) === -1) actionPositions.push(r);
        }

        let actionIndex = 0;
        let qIndex = 0;
        for (let i = 0; i < 24; i++) {
            if (actionPositions.includes(i)) {
                this.boxes.push({ type: 'action', value: this.actions[actionIndex], used: false });
                actionIndex++;
            } else {
                let q = questions[qIndex] || { text: "Yedek Soru: Tabloda 19 soru yetmedi.", correctAnswer: "Yok" };
                this.boxes.push({
                    type: 'question',
                    questionObj: q,
                    questionText: q.text,
                    clue: q.clue,
                    answer: q.correctAnswer,
                    used: false
                });
                qIndex++;
            }
        }
    },

    generateBoxData: function () {
        this.boxes = [];
        this.remainingActions = [...this.actions];

        // Rastgele 5 kutu seçip aksiyon atayalım, diğerleri soru olsun
        let actionPositions = [];
        while (actionPositions.length < 5) {
            let r = Math.floor(Math.random() * 24);
            if (actionPositions.indexOf(r) === -1) actionPositions.push(r);
        }

        let actionIndex = 0;
        for (let i = 0; i < 24; i++) {
            if (actionPositions.includes(i)) {
                this.boxes.push({ type: 'action', value: this.actions[actionIndex], used: false });
                actionIndex++;
            } else {
                this.boxes.push({
                    type: 'question',
                    questionText: `Örnek Soru Metni: ${i + 1}. Kutu sorusu`,
                    clue: `İpucu ${i + 1}`,
                    answer: `Doğru Cevap ${i + 1}`,
                    used: false
                });
            }
        }
    },

    renderGroupScores: function () {
        const container = document.getElementById('baambooGroupScores');
        container.innerHTML = '';

        this.groups.forEach(g => {
            const box = document.createElement('div');
            box.className = `group-score-box`;
            box.id = `bbGroupBox_${g}`;
            box.style.cssText = 'background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 10px 20px; min-width: 100px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); backdrop-filter: blur(10px); display: flex; flex-direction: column; align-items: center; transition: all 0.3s ease;';
            box.innerHTML = `
                <span style="font-size:0.9rem; color:#cbd5e1; font-weight:bold; letter-spacing:1px; margin-bottom:5px; text-transform:uppercase;">GRUP ${g}</span>
                <div class="score" id="bbScore_${g}" style="font-size:2.2rem; font-weight:900; color:#fff; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">0</div>
            `;
            container.appendChild(box);
        });
    },

    updateActiveGroupHighlight: function () {
        this.groups.forEach((g, index) => {
            const box = document.getElementById(`bbGroupBox_${g}`);
            if (box) {
                if (index === this.currentActiveGroupIndex) {
                    box.style.border = "3px solid #06b6d4";
                    box.style.boxShadow = "0 0 25px rgba(6, 182, 212, 0.7)";
                    box.style.transform = "scale(1.1)";
                    box.style.background = "rgba(6, 182, 212, 0.2)";
                } else {
                    box.style.border = "1px solid rgba(255,255,255,0.1)";
                    box.style.boxShadow = "0 8px 32px rgba(0,0,0,0.2)";
                    box.style.transform = "scale(1)";
                    box.style.background = "rgba(255,255,255,0.05)";
                }
            }
        });
    },

    renderGrid: function () {
        const grid = document.getElementById('baambooGridContainer');
        grid.innerHTML = '';

        for (let i = 0; i < 24; i++) {
            const box = document.createElement('div');
            box.className = 'baamboo-box';
            box.id = `bbBox_${i}`;
            box.innerText = i + 1;

            if (this.boxes[i].used) {
                box.classList.add('used');
                box.innerText = ""; // kullanılmışları boşalt (veya gri X de konabilir)
            } else {
                box.onclick = () => this.handleBoxClick(i);
            }
            grid.appendChild(box);
        }
    },

    updateActionHUD: function () {
        // BAAM
        document.getElementById('hud-baam').style.opacity = this.remainingActions.includes('baam') ? '1' : '0.3';
        document.getElementById('hud-boo').style.opacity = this.remainingActions.includes('boo') ? '1' : '0.3';
        document.getElementById('hud-magnet').style.opacity = this.remainingActions.includes('magnet') ? '1' : '0.3';
        document.getElementById('hud-swap').style.opacity = this.remainingActions.includes('swap') ? '1' : '0.3';
        document.getElementById('hud-plus20').style.opacity = this.remainingActions.includes('plus20') ? '1' : '0.3';
    },

    handleBoxClick: function (index) {
        if (this.boxes[index].used) return;

        const boxData = this.boxes[index];
        const uiBox = document.getElementById(`bbBox_${index}`);

        // Tıklanma animasyonu
        uiBox.style.transform = "scale(0.9)";

        setTimeout(() => {
            if (boxData.type === 'action') {
                this.executeAction(boxData.value, index);
            } else {
                this.showQuestionModal(boxData, index);
            }
        }, 300);
    },

    executeAction: function (actionType, boxIndex) {
        // Kullanılmış olarak işaretle
        this.boxes[boxIndex].used = true;
        this.remainingActions = this.remainingActions.filter(a => a !== actionType);

        const currentGroupName = this.groups[this.currentActiveGroupIndex];

        // Aksiyon sağdakini etkiler hesabı:
        let rightGroupIndex = (this.currentActiveGroupIndex + 1) % this.numGroups;
        const rightGroupName = this.groups[rightGroupIndex];

        let msg = "";

        switch (actionType) {
            case 'baam':
                this.groupScores[currentGroupName] += 30;
                msg = `<h1 style='color:#06b6d4; font-size:4rem;'>BAAM!</h1><p style='font-size:1.5rem'>Grup ${currentGroupName} +30 Puan Kazandı!</p>`;
                break;
            case 'boo':
                this.groupScores[currentGroupName] -= 30;
                msg = `<h1 style='color:#ef4444; font-size:4rem;'>BOO!</h1><p style='font-size:1.5rem'>Grup ${currentGroupName} -30 Puan Kaybetti!</p>`;
                break;
            case 'plus20':
                this.groupScores[currentGroupName] += 20;
                msg = `<h1 style='color:#10b981; font-size:4rem;'>+20 PUAN!</h1><p style='font-size:1.5rem'>Harika! Grup ${currentGroupName} +20 Puan!</p>`;
                break;
            case 'magnet':
                const stolenPoints = this.groupScores[rightGroupName];
                this.groupScores[currentGroupName] += stolenPoints;
                this.groupScores[rightGroupName] = 0;
                msg = `<h1 style='color:#eab308; font-size:4rem;'>🧲 MAGNET!</h1><p style='font-size:1.5rem'>Grup ${currentGroupName}, sağındaki Grup ${rightGroupName}'nin tüm puanını (${stolenPoints} Puan) ÇALDI!</p>`;
                break;
            case 'swap':
                const temp = this.groupScores[currentGroupName];
                this.groupScores[currentGroupName] = this.groupScores[rightGroupName];
                this.groupScores[rightGroupName] = temp;
                msg = `<h1 style='color:#a855f7; font-size:4rem;'>⚖️ SWAP!</h1><p style='font-size:1.5rem'>Grup ${currentGroupName} ile Grup ${rightGroupName} puanlarını yer değiştirdi!</p>`;
                break;
        }

        this.syncScoresUI();
        this.updateActionHUD();
        this.renderGrid();

        showOzelAlert(msg, 'tamam', () => {
            this.nextTurn();
        });
    },

    showQuestionModal: function (boxData, index) {
        this.currentBoxIndex = index;

        // Soru Başlığı ve Zamanlayıcı
        document.getElementById('baambooQuestionTitle').textContent = `KUTU ${index + 1}`;
        const contentDiv = document.getElementById('baambooQuestionContent');
        contentDiv.innerHTML = ''; // Temizle

        let qHTML = '';

        // GÖRSEL VARSA YÜKLE
        if (boxData.questionObj && boxData.questionObj.imgUrl) {
            qHTML += `<img src="${boxData.questionObj.imgUrl}" style="max-width:100%; max-height:250px; border-radius:12px; box-shadow:0 5px 15px rgba(0,0,0,0.3); margin-bottom:15px;" />`;
        }

        // METİN VARSA YÜKLE
        if (boxData.questionText && boxData.questionText.trim() !== "") {
            qHTML += `<h2 style="font-size: 2.2rem; color:#fff; text-shadow:2px 2px 5px rgba(0,0,0,0.4);">${boxData.questionText}</h2>`;
        }

        contentDiv.innerHTML = qHTML;

        // ÇOKTAN SEÇMELİ ŞIKLARINI OLUŞTUR
        const optionsContainer = document.getElementById('baambooOptionsContainer');
        optionsContainer.innerHTML = '';

        if (boxData.questionObj && boxData.questionObj.isMultipleChoice && boxData.questionObj.options) {
            optionsContainer.style.display = 'grid';
            optionsContainer.style.gridTemplateColumns = '1fr 1fr';
            optionsContainer.style.gap = '15px';
            optionsContainer.style.width = '100%';
            optionsContainer.style.marginTop = '20px';

            const opts = boxData.questionObj.options;
            const availableOpts = ['A', 'B', 'C', 'D', 'E'].filter(optLet => opts[optLet] && opts[optLet].trim() !== "");

            availableOpts.forEach((optLet, index) => {
                const btn = document.createElement('button');
                btn.className = "login-btn bb-option-btn";

                // Seçeneklerin Grid span ayarı
                if ((availableOpts.length === 5 && index === 4) || (availableOpts.length === 3 && index === 2)) {
                    btn.style.gridColumn = "1 / span 2"; // Son tek kalan elemanlar tüm satırı kaplasın, ortaya gelsin
                }

                btn.style.cssText += "background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); color: #fff; padding: 15px 20px; font-size: 1.2rem; text-align: left; transition: 0.3s; cursor: pointer; border-radius: 12px; display: flex; align-items: center; justify-content: flex-start;";
                btn.innerHTML = `<span style="color:#06b6d4; font-weight:900; font-size:1.4rem; margin-right:15px;">${optLet})</span> <span style="flex-grow:1; text-align:center;">${opts[optLet]}</span>`;

                // Şıkka Tıklama Olayı
                btn.onclick = () => this.selectOption(btn, optLet, boxData.answer);
                optionsContainer.appendChild(btn);
            });
        } else {
            optionsContainer.style.display = 'block';
        }

        document.getElementById('bbClueDisplay').style.display = 'none';

        if (boxData.clue) {
            document.getElementById('bbClueBtn').style.display = 'inline-block';
            document.getElementById('bbClueDisplay').innerHTML = boxData.clue.startsWith('http') ? `<img src="${boxData.clue}" style="max-height:100px; border-radius:5px; margin-top:5px;">` : boxData.clue;
        } else {
            document.getElementById('bbClueBtn').style.display = 'none';
        }

        document.getElementById('baambooGridContainer').style.display = 'none';
        document.getElementById('baambooQuestionArea').style.display = 'block';

        this.startTimer();
    },

    startTimer: function () {
        clearInterval(this.timerInterval);
        let timeLeft = this.countdownSecs;
        const timerDisplay = document.getElementById('baambooTimerDisplay');
        timerDisplay.innerText = timeLeft;
        timerDisplay.style.color = "#ef4444";

        this.timerInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft >= 0) {
                timerDisplay.innerText = timeLeft;
            } else {
                clearInterval(this.timerInterval);
                timerDisplay.innerText = "Süre Bitti!";
                this.handleTimeout();
            }
        }, 1000);
    },

    handleTimeout: function () {
        const boxData = this.boxes[this.currentBoxIndex];

        // Çoktan seçmeli ise tüm butonları kilitle ve cevabı yeşil yap
        if (boxData.questionObj && boxData.questionObj.isMultipleChoice) {
            document.querySelectorAll('.bb-option-btn').forEach(b => {
                b.disabled = true;
                if (b.innerHTML.includes(`>${boxData.answer.toUpperCase()})<`) || b.innerHTML.includes(`${boxData.answer.toUpperCase()})</span>`)) {
                    b.style.background = "#10b981";
                    b.style.borderColor = "#059669";
                }
            });
        }

        // Klasik soru ve diğerleri için ana cevabı göster
        this.showAnswer();

        // 3.5 saniye sonra tabloya geri dön
        setTimeout(() => this.closeQuestionModal(false), 3500);
    },

    showClue: function () {
        document.getElementById('bbClueDisplay').style.display = 'block';
    },

    selectOption: function (btn, selectedLetter, correctAnswer) {
        // Zaten cevaplanmışsa tıklamayı engelle
        if (document.querySelector('.bb-option-btn[disabled]')) return;

        clearInterval(this.timerInterval); // Süreyi durdur

        // Tüm butonları kilitle
        document.querySelectorAll('.bb-option-btn').forEach(b => b.disabled = true);

        const isCorrect = (selectedLetter.toUpperCase() === correctAnswer.toUpperCase());

        if (isCorrect) {
            btn.style.background = "#10b981"; // Yeşil
            btn.style.borderColor = "#059669";

            // Otomatik Puan Ver (+15)
            setTimeout(() => this.awardPoints(15), 1000);
        } else {
            btn.style.background = "#ef4444"; // Kırmızı
            btn.style.borderColor = "#b91c1c";

            // Doğru cevabı bulup yeşil yap
            document.querySelectorAll('.bb-option-btn').forEach(b => {
                if (b.innerHTML.includes(`>${correctAnswer.toUpperCase()})<`) || b.innerHTML.includes(`${correctAnswer.toUpperCase()})</span>`)) {
                    b.style.background = "#10b981";
                    b.style.borderColor = "#059669";
                }
            });

            // Puan alamadı, doğru cevap gösterildi, sıra geçsin
            setTimeout(() => this.closeQuestionModal(false), 3500);
        }
    },

    showAnswer: function () {
        const boxData = this.boxes[this.currentBoxIndex];
        const content = document.getElementById('baambooQuestionContent');

        // Doğru cevabı yeşil parlayan bir metinle altına ekle
        const answerHtml = `
            <div class="fade-in" style="margin-top:20px; font-size:2.8rem; font-weight:900; color:#10b981; background:rgba(16, 185, 129, 0.1); padding:10px 30px; border-radius:15px; border:2px dashed #10b981;">
                ✅ ${boxData.answer}
            </div>
        `;
        if (!content.innerHTML.includes(boxData.answer)) {
            content.innerHTML += answerHtml;
        }
    },

    awardPoints: function (points) {
        clearInterval(this.timerInterval); // Süreyi durdur

        const currentGroupName = this.groups[this.currentActiveGroupIndex];
        this.groupScores[currentGroupName] += points;

        const scoreUI = document.getElementById(`bbScore_${currentGroupName}`);
        scoreUI.textContent = this.groupScores[currentGroupName];

        // Animasyon
        scoreUI.style.color = "#10b981";
        scoreUI.style.transform = "scale(1.5)";
        setTimeout(() => {
            scoreUI.style.color = "#fff";
            scoreUI.style.transform = "scale(1)";
        }, 500);

        this.showAnswer(); // Puan verilse de cevap gösterilir

        setTimeout(() => this.closeQuestionModal(true), 3500);
    },

    closeQuestionModal: function (isAwarded) {
        clearInterval(this.timerInterval); // Her ihtimale karşı durdur
        document.getElementById('baambooTimerDisplay').innerText = "∞";

        if (this.currentBoxIndex !== undefined) {
            this.boxes[this.currentBoxIndex].used = true;
            this.currentBoxIndex = undefined;
        }

        document.getElementById('baambooQuestionArea').style.display = 'none';

        this.renderGrid();
        document.getElementById('baambooGridContainer').style.display = 'grid'; // .baamboo-grid display tipine geri dön

        this.nextTurn();
    },

    nextTurn: function () {
        this.currentActiveGroupIndex = (this.currentActiveGroupIndex + 1) % this.numGroups;
        this.updateActiveGroupHighlight();

        // Oyun sonu kontrolü
        if (this.boxes.filter(b => !b.used).length === 0) {
            this.declareWinner();
        }
    },

    syncScoresUI: function () {
        this.groups.forEach(g => {
            document.getElementById(`bbScore_${g}`).textContent = this.groupScores[g];
        });
    },

    declareWinner: function () {
        let maxScore = -Infinity;
        let winners = [];
        this.groups.forEach(g => {
            if (this.groupScores[g] > maxScore) {
                maxScore = this.groupScores[g];
                winners = [g];
            } else if (this.groupScores[g] === maxScore) {
                winners.push(g);
            }
        });

        const winnerText = winners.length > 1 ? `Gruplar: ${winners.join(' & ')} BERABERE!` : `GRUP ${winners[0]} Kazandı!`;
        const msg = `
            <h1 style='color:#10b981; font-size:3rem;'>Oyun Bitti!</h1>
            <h2 style='color:#06b6d4;'>🏆 ${winnerText} (${maxScore} Puan)</h2>
        `;
        showOzelAlert(msg, 'tamam');
    }
}

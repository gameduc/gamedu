const TriviaEngine = {
    state: {
        mode: 'split', // split | pin
        questions: [],
        currentIndex: 0,
        scores: { A: 0, B: 0 },
        isAnswering: false,
        timer: 0,
        interval: null
    },

    init: function(formData) {
        console.log("GamEdu Trivia başlatılıyor...", formData);
        
        const qText = document.getElementById('triviaQuestionText');
        const modeBadge = document.getElementById('triviaModeBadge');
        const nextBtn = document.getElementById('triviaHostNextBtn');
        const resBtn = document.getElementById('triviaHostShowResultsBtn');

        if(nextBtn) nextBtn.style.display = 'none';
        if(resBtn) resBtn.style.display = 'none';

        this.state.mode = formData.TriviaGameMode && formData.TriviaGameMode.includes("PIN") ? "pin" : "split";
        if(modeBadge) modeBadge.textContent = this.state.mode === 'split' ? "Akıllı Tahta Düellosu" : "Live PIN Modu (Yakında)";

        if(qText) qText.textContent = "Veritabanından Sorular Çekiliyor...";
        
        this.fetchQuestions(formData.TriviaSetsCheckbox);
    },

    fetchQuestions: function(setId) {
        if(!setId) {
            this.showError("Set ID bulunamadı. Lütfen bir set seçip tekrar deneyin.");
            return;
        }

        database.ref('MasterPool').child(setId).once('value').then(snap => {
            if(!snap.exists()) {
                this.showError("Bu set veritabanında bulunamadı.");
                return;
            }
            const data = snap.val();
            if(!data.Questions || !Array.isArray(data.Questions) || data.Questions.length === 0) {
                this.showError("Sette hiç soru yok veya format uyumsuz.");
                return;
            }

            this.state.questions = data.Questions;
            this.state.currentIndex = 0;
            this.state.scores = { A: 0, B: 0 };
            document.getElementById('triviaGameTitle').textContent = data.Title || "GamEdu Trivia";
            
            if(this.state.mode === 'split') {
                this.startQuestionLoop();
            } else {
                // PIN MODE (Kahoot)
                this.initLiveRoom();
            }
        }).catch(err => {
            this.showError("Firebase Hatası: " + err.message);
        });
    },

    showError: function(msg) {
        const qText = document.getElementById('triviaQuestionText');
        if(qText) qText.textContent = "❌ " + msg;
        document.getElementById('triviaInteractionZone').innerHTML = '';
    },

    initLiveRoom: function() {
        if (typeof database === 'undefined' || !database) {
            this.showError("Firebase bağlantısı kurulamadı!");
            return;
        }

        // 6 Haneli Rastgele PIN Üret
        this.state.livePin = Math.floor(100000 + Math.random() * 900000).toString();
        this.roomRef = database.ref('LiveTriviaRooms/' + this.state.livePin);

        // Odayı Kur
        const initialData = {
            state: 'LOBBY', // LOBBY, QUESTION, LEADERBOARD, END
            currentQuestionIndex: 0,
            questionStartTime: 0,
            players: {}
        };

        this.roomRef.set(initialData).then(() => {
            console.log(`Live Oda Kuruldu. PIN: ${this.state.livePin}`);
            this.renderLiveHostLobby();
        }).catch(err => {
            this.showError("Canlı Oda kurulamadı: " + err.message);
        });

        // Oyuncu Bağlantı Dinleyicisi
        this.roomRef.child('players').on('value', snap => {
            this.state.livePlayers = snap.val() || {};
            this.updateHostLobbyPlayers();
        });
    },

    renderLiveHostLobby: function() {
        // UI Geçişi: Oyun Alanını Gizle, Lobi Alanını Göster
        document.getElementById('triviaGameArea').style.display = 'none';
        
        const hostArea = document.getElementById('livePinHostArea');
        if (hostArea) {
            hostArea.style.display = 'flex';
            hostArea.classList.remove('hidden-spa-module');
        }

        document.getElementById('hostPinDisplay').textContent = this.state.livePin;
        this.updateHostLobbyPlayers();
    },

    updateHostLobbyPlayers: function() {
        const listDiv = document.getElementById('hostPlayerList');
        const countDiv = document.getElementById('hostPlayerCount');
        if (!listDiv || !countDiv) return;

        const players = this.state.livePlayers || {};
        const pKeys = Object.keys(players);
        
        countDiv.textContent = pKeys.length;
        listDiv.innerHTML = '';

        if (pKeys.length === 0) {
            listDiv.innerHTML = `<div style="color: #64748b; font-size: 1.2rem; font-style: italic; width: 100%; text-align: center; margin-top: 20px;">Öğrencilerin PIN ile katılması bekleniyor...</div>`;
            return;
        }

        pKeys.forEach(key => {
            const p = players[key];
            const card = document.createElement('div');
            card.style = "background: rgba(255,255,255,0.05); border: 2px solid rgba(139, 92, 246, 0.3); border-radius: 12px; padding: 10px 20px; display: flex; align-items: center; gap: 15px; animation: scaleIn 0.3s ease-out;";
            
            const avatarSrc = p.avatar ? `game pics/avatars/${p.avatar}` : `game pics/avatars/1.png`;
            card.innerHTML = `
                <img src="${avatarSrc}" onerror="this.style.display='none'" style="width: 50px; height: 50px; border-radius: 50%; object-fit: contain; background: rgba(0,0,0,0.4); border: 2px solid #a78bfa;">
                <span style="color: #fff; font-size: 1.2rem; font-weight: bold;">${p.name || 'Gizli Oyuncu'}</span>
            `;
            listDiv.appendChild(card);
        });
    },

    startLiveQuestionLoop: function() {
        if (!this.state.livePlayers || Object.keys(this.state.livePlayers).length === 0) {
            showOzelAlert("Henüz hiç öğrenci katılmadı! Yine de başlasın mı?", "evethayir", (isConfirmed) => {
                if(isConfirmed) this.proceedToLiveGame();
            });
        } else {
            this.proceedToLiveGame();
        }
    },

    proceedToLiveGame: function() {
        if(this.roomRef) {
            this.roomRef.update({ state: 'QUESTION', currentQuestionIndex: 0 });
        }
        document.getElementById('livePinHostArea').style.display = 'none';
        document.getElementById('livePinHostArea').classList.add('hidden-spa-module');
        
        document.getElementById('triviaGameArea').style.display = 'block';
        document.getElementById('triviaGameArea').classList.remove('hidden-spa-module');
        
        // Akıllı tahta gibi soruları oynatmaya başla
        this.startQuestionLoop();
    },

    // ==========================================
    // ÖĞRENCİ (CLIENT) LIVE PIN METOTLARI
    // ==========================================
    joinLiveRoom: function(pin, name, avatar) {
        if (typeof database === 'undefined' || !database) {
            showOzelAlert("Firebase bağlantısı kurulamadı!", "hata");
            return;
        }

        this.roomRef = database.ref('LiveTriviaRooms/' + pin);
        this.roomRef.once('value').then(snap => {
            if(!snap.exists()) {
                showOzelAlert("Bu PIN numarasına ait aktif bir oda bulunamadı.", "hata");
                return;
            }
            const data = snap.val();
            if(data.state !== 'LOBBY') {
                showOzelAlert("Oyun başlamış veya kapanmış. Lütfen başka bir oyuna katılın.", "hata");
                return;
            }
            
            this.state.mode = 'client';
            this.state.livePin = pin;
            this.state.myId = 'player_' + Date.now() + Math.floor(Math.random()*1000);
            
            // Oyuncuyu Firebase'e kaydet
            this.roomRef.child('players/' + this.state.myId).set({
                name: name,
                avatar: avatar || '1.png',
                score: 0,
                streak: 0,
                answered: false
            }).then(() => {
                // UI geçişi
                document.getElementById('livePinJoinArea').style.display = 'none';
                document.getElementById('livePinJoinArea').classList.add('hidden-spa-module');
                
                const studentArea = document.getElementById('livePinStudentArea');
                if(studentArea) {
                    studentArea.style.display = 'flex';
                    studentArea.classList.remove('hidden-spa-module');
                }
                
                this.listenAsStudent(name);
            });
        }).catch(e => {
            showOzelAlert("Bağlantı Hatası: " + e.message, "hata");
        });
    },

    listenAsStudent: function(myName) {
        if(!this.roomRef) return;
        
        this.roomRef.on('value', snap => {
            if(!snap.exists()) {
                showOzelAlert("Oda kapatıldı. Lobiye dönülüyor.", "tamam", () => {
                    if (typeof goToLobby === 'function') goToLobby();
                });
                this.roomRef.off();
                return;
            }
            
            const data = snap.val();
            const waitArea = document.getElementById('livePinStudentWaitArea');
            const interactionZone = document.getElementById('livePinStudentInteractionZone');
            
            if(data.state === 'LOBBY') {
                if(waitArea) {
                    waitArea.style.display = 'flex';
                    const playerCount = Object.keys(data.players || {}).length;
                    waitArea.innerHTML = `
                        <p style="color:#fff; font-size: 2rem; font-weight: bold; margin-bottom:5px;">Tebrikler ${myName}!</p>
                        <p style="color:#10b981; font-size: 1.2rem; font-weight: bold;">Oyuna başarıyla bağlandın.</p>
                        <p style="color:#94a3b8; font-size: 1rem; margin-top:20px;">Seninle birlikte ${playerCount} kişi bekliyor.<br>Gözün tahtada olsun, yarışma birazdan başlayacak!</p>
                        <div class="loader" style="margin-top:30px;"></div>
                    `;
                }
                if(interactionZone) interactionZone.style.display = 'none';
                
            } else if (data.state === 'QUESTION') {
                if(waitArea) waitArea.style.display = 'none';
                if(interactionZone) {
                    interactionZone.style.display = 'flex';
                    interactionZone.style.flexDirection = 'column';
                    interactionZone.style.gap = '10px';
                    interactionZone.style.padding = '20px';
                    
                    const qData = data.currentQuestionData; // Host can pass question type and answers length
                    
                    if (!qData || qData.type === 'mcq' || qData.type === 'tf') {
                        const colors = ['#ef4444', '#3b82f6', '#eab308', '#22c55e'];
                        const count = (qData && qData.answerCount) || 4;
                        
                        let html = `<div style="display:grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap:15px; width:100%; height:80vh;">`;
                        for(let i=0; i<count; i++) {
                            html += `<button onclick="TriviaEngine.submitLiveAnswer(${i})" style="background:${colors[i%4]}; border:none; border-radius:15px; box-shadow:0 10px 20px rgba(0,0,0,0.3); font-size:3rem; color:#fff; cursor:pointer; active:transform(scale(0.95));"></button>`;
                        }
                        html += `</div>`;
                        interactionZone.innerHTML = html;
                    } else if (qData.type === 'type') {
                        interactionZone.innerHTML = `
                            <div style="display:flex; flex-direction:column; gap:20px; width:100%; align-items:center; justify-content:center; height:80vh;">
                                <h3 style="color:#fff;">Cevabınızı Yazın</h3>
                                <input type="text" id="liveStudentInput" style="width:100%; padding:20px; font-size:2rem; border-radius:10px; text-align:center;">
                                <button onclick="TriviaEngine.submitLiveAnswer(document.getElementById('liveStudentInput').value)" class="login-btn" style="width:100%; background:#8b5cf6; padding:20px; font-size:1.5rem;">Gönder</button>
                            </div>
                        `;
                    }
                }
            } else if (data.state === 'WAITING_FOR_OTHERS') {
                if(waitArea) {
                    waitArea.style.display = 'flex';
                    waitArea.innerHTML = `
                        <p style="color:#10b981; font-size: 2rem; font-weight: bold;">Cevabın Alındı</p>
                        <p style="color:#94a3b8; font-size: 1.2rem;">Diğer oyuncular bekleniyor...</p>
                        <div class="loader" style="margin-top:20px;"></div>
                    `;
                }
                if(interactionZone) interactionZone.style.display = 'none';
            } else if (data.state === 'LEADERBOARD') {
                if(waitArea) {
                    waitArea.style.display = 'flex';
                    const myPlayer = data.players[this.state.myId] || {};
                    let resultMsg = myPlayer.lastAnswerCorrect ? `<span style="color:#10b981">DOĞRU! 🎉</span>` : `<span style="color:#ef4444">YANLIŞ ❌</span>`;
                    waitArea.innerHTML = `
                        <p style="font-size: 3rem; font-weight: bold; margin-bottom:10px;">${resultMsg}</p>
                        <p style="color:#cbd5e1; font-size: 1.5rem;">Puanın: <b>${myPlayer.score || 0}</b></p>
                        <p style="color:#f59e0b; font-size: 1.2rem; margin-top:20px;">Tahtaya Bak!</p>
                    `;
                }
                if(interactionZone) interactionZone.style.display = 'none';
            }
        });
    },

    submitLiveAnswer: function(answerValue) {
        if (!this.roomRef || !this.state.myId) return;
        
        // Host süreyi belirlediği için, istemciden sadece gönderim zamanı ve cevabı yolluyoruz (Host hesaplayacak)
        this.roomRef.child('players/' + this.state.myId).update({
            answered: true,
            answerValue: answerValue,
            answerTime: Date.now()
        }).then(() => {
            // İstemci tarafında beklemeye alıyoruz (Sadece kendi ekranı için lokal durum, firebase tetiklenmese bile ui değişimi)
            const waitArea = document.getElementById('livePinStudentWaitArea');
            const interactionZone = document.getElementById('livePinStudentInteractionZone');
            if(interactionZone) interactionZone.style.display = 'none';
            if(waitArea) {
                waitArea.style.display = 'flex';
                waitArea.innerHTML = `
                    <p style="color:#10b981; font-size: 2rem; font-weight: bold;">Cevabın Alındı</p>
                    <p style="color:#94a3b8; font-size: 1.2rem;">Süre bitimi bekleniyor...</p>
                    <div class="loader" style="margin-top:20px;"></div>
                `;
            }
        });
    },

    // ==========================================
    // HOST LIVE PIN KONTROLLERİ (ÖĞRETMEN)
    // ==========================================
    renderLiveHostQuestion: function(index) {
        if(!this.roomRef) return;
        
        if(index >= this.state.questions.length) {
            this.showLiveFinalLeaderboard();
            return;
        }

        const q = this.state.questions[index];
        this.state.currentQuestionStartTime = Date.now();
        this.state.isAnswering = true;
        this.state.timer = q.timeLimit || 20;

        // Reset player states for new question
        const updates = {};
        if (this.state.livePlayers) {
            Object.keys(this.state.livePlayers).forEach(k => {
                updates[`players/${k}/answered`] = false;
                updates[`players/${k}/answerValue`] = null;
                updates[`players/${k}/lastAnswerCorrect`] = false;
                updates[`players/${k}/lastPointsAwarded`] = 0;
            });
        }
        
        // State update with Q data for students
        updates['state'] = 'QUESTION';
        updates['currentQuestionIndex'] = index;
        updates['questionStartTime'] = this.state.currentQuestionStartTime;
        updates['currentQuestionData'] = { type: q.type, answerCount: q.answers ? q.answers.length : 0 };
        
        this.roomRef.update(updates);

        // Host UI
        let qText = document.getElementById('triviaQuestionText');
        let qCount = document.getElementById('triviaPlayerStatus');
        let qImage = document.getElementById('triviaQuestionImage');
        let qImageCont = document.getElementById('triviaImageContainer');
        let ansArea = document.getElementById('triviaInteractionZone');
        let nextBtn = document.getElementById('triviaHostNextBtn');

        if(nextBtn) nextBtn.style.display = 'none';

        qText.textContent = q.text || "Soru";
        qCount.innerHTML = `<span style="font-size:1.2rem; color:#cbd5e1;">Soru: ${index+1}/${this.state.questions.length}</span>`;

        if(q.imageUrl && q.imageUrl.trim() !== '') {
            qImage.src = q.imageUrl;
            qImageCont.style.display = 'block';
        } else {
            qImageCont.style.display = 'none';
        }

        ansArea.innerHTML = '';
        ansArea.style.display = 'grid';
        ansArea.style.gridTemplateColumns = '1fr 1fr';
        ansArea.style.gap = '20px';
        ansArea.style.width = '100%';

        const colors = ['#ef4444', '#3b82f6', '#eab308', '#22c55e'];
        
        if(q.type === 'mcq' || q.type === 'tf') {
            q.answers.forEach((ans, idx) => {
                const box = document.createElement('div');
                box.style = `background: ${colors[idx%4]}; color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: bold; padding: 25px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); min-height:100px;`;
                // Add tiny shape icon just for visual flair (classic Kahoot)
                const shapes = ['▲', '◆', '●', '■'];
                box.innerHTML = `<span style="font-size:2rem; margin-right:15px; opacity:0.8;">${shapes[idx%4] || ''}</span> <span>${ans.text}</span>`;
                ansArea.appendChild(box);
            });
        } else {
            const box = document.createElement('div');
            box.style = `grid-column: span 2; background: #8b5cf6; color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: bold; padding: 30px; text-align: center;`;
            box.textContent = "Öğrenciler cihazlarından cevap yazıyor...";
            ansArea.appendChild(box);
        }

        this.startHostTimer(q);
    },

    startHostTimer: function(q) {
        if(this.state.interval) clearInterval(this.state.interval);
        
        const timerBar = document.getElementById('triviaTimerBar');
        if(timerBar) {
            timerBar.style.width = '100%';
            timerBar.style.backgroundColor = '#3b82f6';
        }

        let maxTime = q.timeLimit || 20;
        this.state.timer = maxTime;

        this.state.interval = setInterval(() => {
            if(!this.state.isAnswering) {
                clearInterval(this.state.interval);
                return;
            }

            this.state.timer--;
            
            // Güncelle Progress Bar
            if(timerBar) {
                const pct = (this.state.timer / maxTime) * 100;
                timerBar.style.width = pct + '%';
                if(pct < 25) timerBar.style.backgroundColor = '#ef4444';
                else if (pct < 50) timerBar.style.backgroundColor = '#f59e0b';
            }

            // Katılımcı Durumunu Kontrol Et
            const players = this.state.livePlayers || {};
            const pKeys = Object.keys(players);
            const totalP = pKeys.length;
            const answeredP = pKeys.filter(k => players[k].answered).length;

            const qCount = document.getElementById('triviaPlayerStatus');
            if(qCount) {
                qCount.innerHTML = `<span style="font-size:1.2rem; color:#cbd5e1;">Soru: ${this.state.currentIndex+1}/${this.state.questions.length}</span><br><span style="color:#10b981; font-weight:bold; font-size:1.4rem;">Cevaplar: ${answeredP} / ${totalP}</span>`;
            }

            if (this.state.timer <= 0 || (totalP > 0 && answeredP >= totalP)) {
                clearInterval(this.state.interval);
                this.state.isAnswering = false;
                this.evaluateAndShowLiveLeaderboard(q);
            }
        }, 1000);
    },

    evaluateAndShowLiveLeaderboard: function(q) {
        if(!this.roomRef) return;
        
        const players = this.state.livePlayers || {};
        const pKeys = Object.keys(players);
        const updates = {};
        const maxScore = 1000;
        const multiplier = q.doublePoints ? 2 : 1;
        
        // Find correct answer
        let correctIndexes = [];
        let correctText = "";
        if (q.type === 'mcq' || q.type === 'tf') {
            q.answers.forEach((a, i) => { if(a.isCorrect) correctIndexes.push(i); });
        } else if (q.type === 'type' && q.answers.length > 0) {
            correctText = q.answers[0].text.trim().toLowerCase();
        }

        pKeys.forEach(k => {
            const p = players[k];
            let isCorrect = false;
            
            if (p.answered) {
                if (q.type === 'mcq' || q.type === 'tf') {
                    isCorrect = correctIndexes.includes(Number(p.answerValue));
                } else if (q.type === 'type') {
                    isCorrect = (p.answerValue || '').trim().toLowerCase() === correctText;
                }
            }

            let pts = 0;
            if (isCorrect) {
                // Score = (1 - (time_taken / (max_time * 2))) * maxScore * multiplier
                // timeTaken = Math.min(Date.now() - questionStartTime, maxTime * 1000)
                const timeTakenMs = (p.answerTime || Date.now()) - this.state.currentQuestionStartTime;
                const timeTakenSec = Math.max(0, timeTakenMs / 1000);
                const maxTime = q.timeLimit || 20;
                
                let speedFactor = 1 - ((timeTakenSec / maxTime) / 2); // En geç bilirse 500 Puan alır (çarpansız)
                if(speedFactor < 0.5) speedFactor = 0.5;
                if(speedFactor > 1) speedFactor = 1;
                
                pts = Math.round(maxScore * speedFactor * multiplier);
                
                const newStreak = (p.streak || 0) + 1;
                if(newStreak > 2) pts += 200; // Seri bonusu
                
                updates[`players/${k}/score`] = (p.score || 0) + pts;
                updates[`players/${k}/streak`] = newStreak;
            } else {
                updates[`players/${k}/streak`] = 0; // Seri bozuldu
            }

            updates[`players/${k}/lastAnswerCorrect`] = isCorrect;
            updates[`players/${k}/lastPointsAwarded`] = pts;
        });

        updates['state'] = 'LEADERBOARD';
        
        this.roomRef.update(updates).then(() => {
            this.renderLivePodium(q, correctIndexes, correctText);
        });
    },

    renderLivePodium: function(q, correctIndexes, correctText) {
        const ansArea = document.getElementById('triviaInteractionZone');
        ansArea.innerHTML = '';
        ansArea.style.display = 'block';

        // 1. Önce Doğru Cevabı Göster
        const ansHeader = document.createElement('div');
        ansHeader.style = "background: rgba(16, 185, 129, 0.2); border: 2px solid #10b981; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;";
        
        if (q.type === 'mcq' || q.type === 'tf') {
            let correctTexts = correctIndexes.map(i => q.answers[i].text).join(', ');
            ansHeader.innerHTML = `<h3 style="color:#10b981; margin:0 0 10px 0;">Doğru Cevap</h3><p style="font-size:2rem; color:#fff; font-weight:bold; margin:0;">${correctTexts}</p>`;
        } else {
            ansHeader.innerHTML = `<h3 style="color:#10b981; margin:0 0 10px 0;">Doğru Cevap</h3><p style="font-size:2rem; color:#fff; font-weight:bold; margin:0;">${correctText}</p>`;
        }
        ansArea.appendChild(ansHeader);

        // 2. Lider Tablosunu (Sıralamayı) Oluştur
        const players = this.state.livePlayers || {};
        const sortedPlayers = Object.keys(players)
            .map(k => ({ id:k, name: players[k].name, score: players[k].score || 0, streak: players[k].streak || 0, avatar: players[k].avatar || '1.png' }))
            .sort((a,b) => b.score - a.score);

        const top10 = sortedPlayers.slice(0, 10);
        
        const board = document.createElement('div');
        board.style = "background: rgba(0,0,0,0.5); border-radius: 12px; padding: 20px;";
        board.innerHTML = `<h3 style="color:#f59e0b; margin:0 0 20px 0; text-align:center; font-size:1.8rem;">Anlık Liderlik Tablosu (İlk 10)</h3>`;
        
        const listDiv = document.createElement('div');
        listDiv.style = "display:flex; flex-direction:column; gap:10px;";
        
        top10.forEach((p, idx) => {
            let medal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `${idx+1}.`));
            let bgColor = idx === 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.05)';
            let brColor = idx === 0 ? '#f59e0b' : 'rgba(255,255,255,0.1)';
            
            listDiv.innerHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; background:${bgColor}; border:1px solid ${brColor}; padding:10px 20px; border-radius:8px;">
                    <div style="display:flex; align-items:center; gap:15px;">
                        <span style="font-size:1.5rem; font-weight:bold; width:40px; text-align:left;">${medal}</span>
                        <img src="game pics/avatars/${p.avatar}" style="width:40px; height:40px; border-radius:50%; background:rgba(0,0,0,0.4)">
                        <span style="color:#fff; font-size:1.2rem; font-weight:bold;">${p.name}</span>
                        ${p.streak >= 3 ? '<span title="Ateş Serisi" style="color:#ef4444; font-size:1.2rem;">🔥</span>' : ''}
                    </div>
                    <span style="color:#3b82f6; font-weight:bold; font-size:1.3rem;">${p.score} Puan</span>
                </div>
            `;
        });
        
        board.appendChild(listDiv);
        ansArea.appendChild(board);

        // Next Button Görünür Yap
        const nextBtn = document.getElementById('triviaHostNextBtn');
        if (nextBtn) {
            nextBtn.style.display = 'inline-block';
            nextBtn.textContent = (this.state.currentIndex + 1 < this.state.questions.length) ? "Sıradaki Soru" : "Podyumu Gör (Bitiş)";
            nextBtn.onclick = () => {
                this.state.currentIndex++;
                if(this.state.currentIndex < this.state.questions.length) {
                    this.renderLiveHostQuestion(this.state.currentIndex);
                } else {
                    this.showLiveFinalLeaderboard();
                }
            };
        }
    },

    showLiveFinalLeaderboard: function() {
        if(this.roomRef) this.roomRef.update({ state: 'END' });
        
        let qText = document.getElementById('triviaQuestionText');
        let qImageCont = document.getElementById('triviaImageContainer');
        let ansArea = document.getElementById('triviaInteractionZone');
        let nextBtn = document.getElementById('triviaHostNextBtn');
        
        if(qText) qText.textContent = "🏆 TAAÇ TAKMA TÖRENİ 🏆";
        if(qImageCont) qImageCont.style.display = 'none';
        if(nextBtn) {
            nextBtn.style.display = 'inline-block';
            nextBtn.textContent = "Ayarlara Dön (Lobi)";
            nextBtn.onclick = () => {
                document.getElementById('triviaGameArea').style.display = 'none';
                document.getElementById('setupArea').style.display = 'block';
                if(this.roomRef) { this.roomRef.off(); this.roomRef.remove(); }
            };
        }

        // Klasik Podyum, benzer mantıkta ama daha büyük.
        ansArea.innerHTML = `<h2 style="color:#fff;">Oyun Sona Erdi! Zirvedekilere Alkış 👏</h2>`;
        // TODO: Gelişmiş 3'lü Podyum Çizimi eklenebilir, şimdilik basit liste.
        const players = this.state.livePlayers || {};
        const sortedPlayers = Object.keys(players)
            .map(k => ({ name: players[k].name, score: players[k].score || 0, avatar: players[k].avatar || '1.png' }))
            .sort((a,b) => b.score - a.score);
            
        let html = `<div style="display:flex; justify-content:center; align-items:flex-end; gap:20px; height:300px; margin-top:50px;">`;
        if(sortedPlayers[1]) html += `<div style="display:flex; flex-direction:column; align-items:center; animation: slideUp 0.8s ease-out;"><img src="game pics/avatars/${sortedPlayers[1].avatar}" style="width:70px;height:70px; border-radius:50%; border:3px solid silver;"><div style="width:120px; height:150px; background:silver; display:flex; justify-content:center; align-items:center; font-size:3rem; font-weight:bold; color:#fff; border-radius:10px 10px 0 0;">2</div><span style="color:#fff; font-weight:bold; margin-top:10px;">${sortedPlayers[1].name}</span><span style="color:#3b82f6;">${sortedPlayers[1].score}</span></div>`;
        if(sortedPlayers[0]) html += `<div style="display:flex; flex-direction:column; align-items:center; animation: slideUp 0.5s ease-out;"><img src="game pics/avatars/${sortedPlayers[0].avatar}" style="width:100px;height:100px; border-radius:50%; border:4px solid gold;"><div style="width:140px; height:200px; background:gold; display:flex; justify-content:center; align-items:center; font-size:4rem; font-weight:bold; color:#000; border-radius:10px 10px 0 0;">1</div><span style="color:#fff; font-weight:bold; font-size:1.5rem; margin-top:10px;">${sortedPlayers[0].name}</span><span style="color:#3b82f6; font-weight:bold;">${sortedPlayers[0].score}</span></div>`;
        if(sortedPlayers[2]) html += `<div style="display:flex; flex-direction:column; align-items:center; animation: slideUp 1s ease-out;"><img src="game pics/avatars/${sortedPlayers[2].avatar}" style="width:60px;height:60px; border-radius:50%; border:3px solid #cd7f32;"><div style="width:100px; height:100px; background:#cd7f32; display:flex; justify-content:center; align-items:center; font-size:2rem; font-weight:bold; color:#fff; border-radius:10px 10px 0 0;">3</div><span style="color:#fff; font-weight:bold; margin-top:10px;">${sortedPlayers[2].name}</span><span style="color:#3b82f6;">${sortedPlayers[2].score}</span></div>`;
        html += `</div>`;
        
        ansArea.innerHTML += html;
    },

    startQuestionLoop: function() {
        this.renderQuestion(this.state.currentIndex);
    },

    renderQuestion: function(index) {
        this.state.isAnswering = true;
        
        if (this.state.mode === 'pin') {
            this.renderLiveHostQuestion(index);
            return;
        }
        
        let qText = document.getElementById('triviaQuestionText');
        let qCount = document.getElementById('triviaPlayerStatus');
        let qImage = document.getElementById('triviaQuestionImage');
        let qImageCont = document.getElementById('triviaImageContainer');
        let ansArea = document.getElementById('triviaInteractionZone');
        let nextBtn = document.getElementById('triviaHostNextBtn');

        if(nextBtn) {
            nextBtn.style.display = 'none';
            nextBtn.onclick = () => {
                this.state.currentIndex++;
                if(this.state.currentIndex < this.state.questions.length) {
                    this.renderQuestion(this.state.currentIndex);
                } else {
                    this.endGame();
                }
            };
        }

        if(index >= this.state.questions.length) {
            this.endGame();
            return;
        }

        const q = this.state.questions[index];
        qText.textContent = q.text || "Boş Soru";
        qCount.innerHTML = `<span style="color:#60a5fa">${this.state.scores.A}</span> - <span style="color:#f87171">${this.state.scores.B}</span> <br><small style="font-size:0.8rem">Soru: ${index+1}/${this.state.questions.length}</small>`;

        if(q.imageUrl && q.imageUrl.trim() !== '') {
            qImage.src = q.imageUrl;
            qImageCont.style.display = 'block';
        } else {
            qImageCont.style.display = 'none';
        }

        ansArea.innerHTML = '';
        ansArea.style.display = 'flex';
        ansArea.style.flexDirection = 'row';
        ansArea.style.alignItems = 'stretch';
        ansArea.style.justifyContent = 'space-between';
        ansArea.style.gap = '40px';
        ansArea.style.gridTemplateColumns = 'none'; // reset inherited grid

        const teamA = document.createElement('div');
        teamA.style = "flex: 1; background: rgba(59, 130, 246, 0.1); border: 2px solid rgba(59, 130, 246, 0.4); border-radius: 12px; padding: 15px; display:flex; flex-direction:column; gap:10px;";
        teamA.innerHTML = `<h3 style="color:#60a5fa; margin:0 0 10px 0;">Mavi Takım (Sol)</h3>`;

        const teamB = document.createElement('div');
        teamB.style = "flex: 1; background: rgba(239, 68, 68, 0.1); border: 2px solid rgba(239, 68, 68, 0.4); border-radius: 12px; padding: 15px; display:flex; flex-direction:column; gap:10px;";
        teamB.innerHTML = `<h3 style="color:#f87171; margin:0 0 10px 0;">Kırmızı Takım (Sağ)</h3>`;

        if(q.type === 'mcq' || q.type === 'tf') {
            q.answers.forEach((ans, ansIdx) => {
                const btnA = this.createAnswerButton(ans, 'A');
                const btnB = this.createAnswerButton(ans, 'B');
                teamA.appendChild(btnA);
                teamB.appendChild(btnB);
            });
        } else if(q.type === 'type') {
            teamA.appendChild(this.createTypeInput('A', q));
            teamB.appendChild(this.createTypeInput('B', q));
        } else {
            teamA.innerHTML += `<p style="color:#eab308">Bu soru türü (${q.type}) Akıllı Tahta modunda henüz desteklenmiyor.</p>`;
            teamB.innerHTML += `<p style="color:#eab308">Bu soru türü (${q.type}) Akıllı Tahta modunda henüz desteklenmiyor.</p>`;
            if(nextBtn) nextBtn.style.display = 'inline-block';
        }

        ansArea.appendChild(teamA);
        ansArea.appendChild(teamB);
    },

    createAnswerButton: function(ans, team) {
        const btn = document.createElement('button');
        btn.innerText = ans.text;
        btn.className = 'action-btn';
        btn.style = `padding: 15px; font-size: 1.2rem; font-weight: bold; border-radius: 8px; cursor: pointer; transition: 0.2s; border: none; background: rgba(255,255,255,0.1); color: #fff; text-align: left;`;
        
        btn.onclick = () => {
            if(!this.state.isAnswering) return;
            this.handleAnswer(ans.isCorrect, team, btn);
        };
        return btn;
    },

    createTypeInput: function(team, q) {
        const div = document.createElement('div');
        div.style = "display:flex; flex-direction:column; gap:10px;";
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.placeholder = "Cevabı yazın...";
        inp.style = "padding: 15px; font-size: 1.2rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.3); background: rgba(0,0,0,0.5); color: #fff; width: 100%; box-sizing: border-box;";
        inp.autocomplete = "off";

        const btn = document.createElement('button');
        btn.innerText = "Gönder";
        btn.className = 'login-btn';
        btn.style.background = team === 'A' ? '#3b82f6' : '#ef4444';
        
        btn.onclick = () => {
            if(!this.state.isAnswering) return;
            const val = inp.value.trim().toLowerCase();
            const correctText = q.answers[0].text.trim().toLowerCase();
            const isCorrect = (val === correctText);
            this.handleAnswer(isCorrect, team, btn);
        };
        
        div.appendChild(inp);
        div.appendChild(btn);
        return div;
    },

    handleAnswer: function(isCorrect, team, clickedEl) {
        this.state.isAnswering = false; // İlk cevabı veren soruyu kapatır
        
        const finishCallback = () => {
            if (this.state.currentIndex === this.state.questions.length - 1) {
                this.endGame();
            } else {
                const nextBtn = document.getElementById('triviaHostNextBtn');
                nextBtn.textContent = 'Sıradaki Soru';
                nextBtn.style.display = 'inline-block';
            }
        };

        if(isCorrect) {
            this.state.scores[team] += 10;
            clickedEl.style.background = '#10b981'; // Doğru Yeşil
            showOzelAlert(`Doğru cevap! ${team === 'A' ? 'Mavi' : 'Kırmızı'} Takım puanı kaptı.`, "tamam", finishCallback);
        } else {
            clickedEl.style.background = '#ef4444'; // Yanlış Kırmızı
            showOzelAlert(`Yanlış cevap! ${team === 'A' ? 'Mavi' : 'Kırmızı'} Takım şansını kaybetti.`, "tamam", finishCallback);
        }
        
        // Puanları güncelle
        const qCount = document.getElementById('triviaPlayerStatus');
        qCount.innerHTML = `<span style="color:#60a5fa">${this.state.scores.A}</span> - <span style="color:#f87171">${this.state.scores.B}</span> <br><small style="font-size:0.8rem">Soru: ${this.state.currentIndex+1}/${this.state.questions.length}</small>`;
    },

    endGame: function() {
        const qText = document.getElementById('triviaQuestionText');
        const qImageCont = document.getElementById('triviaImageContainer');
        const ansArea = document.getElementById('triviaInteractionZone');
        const nextBtn = document.getElementById('triviaHostNextBtn');

        qText.textContent = "🏆 Yarışma Sonucu";
        qImageCont.style.display = 'none';

        let winnerText = "";
        let winnerColor = "";
        if (this.state.scores.A > this.state.scores.B) { winnerText = "Mavi Takım KAZANDI!"; winnerColor = "#60a5fa"; }
        else if (this.state.scores.B > this.state.scores.A) { winnerText = "Kırmızı Takım KAZANDI!"; winnerColor = "#f87171"; }
        else { winnerText = "BERABERE!"; winnerColor = "#eab308"; }

        ansArea.style.flexDirection = 'column';
        ansArea.innerHTML = `
            <div style="width: 100%; text-align: center; padding: 2rem; background: rgba(0,0,0,0.4); border-radius: 16px; border: 2px solid ${winnerColor};">
                <h1 style="font-size: 3rem; color: ${winnerColor}; margin: 0 0 1rem 0;">${winnerText}</h1>
                <div style="display: flex; justify-content: center; gap: 50px; margin-top: 2rem;">
                    <div>
                        <h3 style="color:#60a5fa; margin: 0;">Mavi Takım</h3>
                        <p style="font-size: 2.5rem; color:#fff; font-weight: bold; margin: 10px 0;">${this.state.scores.A} Puan</p>
                    </div>
                    <div>
                        <h3 style="color:#f87171; margin: 0;">Kırmızı Takım</h3>
                        <p style="font-size: 2.5rem; color:#fff; font-weight: bold; margin: 10px 0;">${this.state.scores.B} Puan</p>
                    </div>
                </div>
            </div>
        `;

        if(nextBtn) {
            nextBtn.textContent = '🔄 Yeniden Oyna';
            nextBtn.style.display = 'inline-block';
            nextBtn.onclick = () => {
                this.state.currentIndex = 0;
                this.state.scores = { A: 0, B: 0 };
                this.startQuestionLoop();
            };
        }
    }
};

window.attemptLiveJoin = function() {
    const pin = document.getElementById('liveJoinPin').value.trim();
    const name = document.getElementById('liveJoinNickname').value.trim();
    const avatar = document.getElementById('liveJoinSelectedAvatar').value;

    if (pin.length < 5 || name.length < 2) {
        if(typeof showOzelAlert === 'function') {
            showOzelAlert("Gerekli alanları doğru doldurun (PIN min 5 hane, İsim min 2 karakter).", "hata");
        } else {
            alert("Gerekli alanları doğru doldurun (PIN min 5 hane, İsim min 2 karakter).");
        }
        return;
    }
    
    // Firebase Routing: Pin'i önce Trivia odalarında ara, yoksa Avatar Run odalarında ara
    if (typeof database !== 'undefined') {
        const joinBtn = document.getElementById('liveJoinEnterBtn');
        const origText = joinBtn ? joinBtn.textContent : "Oyuna Katıl";
        if (joinBtn) joinBtn.textContent = 'Bağlanıyor...';

        database.ref('LiveTriviaRooms/' + pin).once('value').then(snap => {
            if (snap.exists() && snap.val().state !== 'END' && typeof TriviaEngine !== 'undefined') {
                if (joinBtn) joinBtn.textContent = origText;
                TriviaEngine.joinLiveRoom(pin, name, avatar);
            } else {
                // Eğer Trivia'da yoksa Avatar Run için kontrol et
                database.ref('LiveAvatarRunRooms/' + pin).once('value').then(avSnap => {
                    if (joinBtn) joinBtn.textContent = origText;
                    if (avSnap.exists() && avSnap.val().state !== 'END' && typeof AvatarRunEngine !== 'undefined') {
                        AvatarRunEngine.joinLiveRoom(pin, name, avatar);
                    } else {
                        if(typeof showOzelAlert === 'function') {
                            showOzelAlert("Geçersiz PIN Kodu. Oda bulunamadı veya kapanmış olabilir.", "hata");
                        }
                    }
                }).catch(() => {
                    if (joinBtn) joinBtn.textContent = origText;
                    showOzelAlert("PIN Kontrol Hatası (AvatarRun).", "hata");
                });
            }
        }).catch(() => {
            if (joinBtn) joinBtn.textContent = origText;
            showOzelAlert("PIN Kontrol Hatası (Trivia).", "hata");
        });
    } else {
        // Fallback for offline mode or syntax issues
        if (typeof TriviaEngine !== 'undefined') {
            TriviaEngine.joinLiveRoom(pin, name, avatar);
        }
    }
};

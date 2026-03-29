const AvatarRunEngine = {
    // Merkezi durum yöneticisi
    state: {
        livePin: null,
        livePlayers: {},
        gameState: 'LOBBY', // LOBBY, RACING, FINISHED
        currentSetId: null,
        gameMode: null, // "Takım Modu (Quizlet Live)" veya "Bireysel Mod"
        questions: [],
        playerProgress: {} // Öğrenci/Takım bazlı bar ilerlemeleri (0'dan 100'e)
    },
    
    roomRef: null,

    init: function(config) {
        console.log("Avatar Run başlatılıyor...", config);
        this.state.gameMode = config.AvatarRunGameMode || "Takım Modu (Quizlet Live)";
        this.state.currentSetId = config.AvatarRunSetsCheckbox;
        this.state.configJoin = config.join;
        
        // Soru/Kelime listesini çek
        this.fetchQuestionsAndStart(config);
    },

    fetchQuestionsAndStart: function(config) {
        // Eğer oto-üretimle RAM'e atılmışsa (Örn: TriviaEditor'den)
        if (config.AvatarRunSource === 'Mevcut Soru/Kelime Havuzundan Üret' && window.triviaQuestions && window.triviaQuestions.length > 0) {
            this.state.questions = [...window.triviaQuestions];
            this.prepareEngine(config);
            return;
        }

        const setIds = config.AvatarRunSetsCheckbox ? config.AvatarRunSetsCheckbox.split(',') : [];
        if (setIds.length === 0) {
            this.showError("Lütfen en az bir soru seti seçin.");
            return;
        }

        if (typeof database !== 'undefined') {
            let allQuestions = [];
            let promises = setIds.map(id => database.ref('MasterPool/' + id).once('value'));

            Promise.all(promises).then(snapshots => {
                snapshots.forEach(snap => {
                    if (snap.exists()) {
                        const set = snap.val();
                        const qList = set ? (set.Questions || set.Data) : null;
                        if (qList && Array.isArray(qList)) {
                            allQuestions = allQuestions.concat(qList);
                        }
                    }
                });

                if (allQuestions.length > 0) {
                    this.state.questions = allQuestions;
                    this.prepareEngine(config);
                } else {
                    this.showError("Seçilen setlerde soru bulunamadı.");
                }
            }).catch(err => {
                this.showError("Veritabanı okunurken hata: " + err.message);
            });
        }
    },

    prepareEngine: function(config) {
        if (!this.state.questions || this.state.questions.length === 0) {
            this.showError("Yarışılacak hiçbir soru bulunamadı.");
            return;
        }
        this.createLiveRoom(config);
    },

    createLiveRoom: function(config) {
        if (typeof database === 'undefined' || !database) {
            this.showError("Firebase bağlantısı kurulamadı!");
            return;
        }

        // 6 Haneli Rastgele PIN Üret (GamEdu Stili)
        this.state.livePin = Math.floor(100000 + Math.random() * 900000).toString();
        this.roomRef = database.ref('LiveAvatarRunRooms/' + this.state.livePin);

        // Odayı Veritabanına Yaz
        const initialData = {
            state: 'LOBBY',
            gameMode: this.state.gameMode,
            players: {},
            totalQuestions: this.state.questions.length,
            join: config.join || ""
        };

        this.roomRef.set(initialData).then(() => {
            console.log(`Avatar Run Live Oda Kuruldu. PIN: ${this.state.livePin}`);
            this.renderHostLobby();
        }).catch(err => {
            this.showError("Canlı Oda kurulamadı: " + err.message);
        });

        // Oyuncu Katılımlarını Dinle
        this.roomRef.child('players').on('value', snap => {
            this.state.livePlayers = snap.val() || {};
            this.updateHostLobbyPlayers();
        });

        // Takım Skorlarını Dinle (Yarış sırasında arayüzü güncellemek için)
        this.roomRef.child('teams').on('value', snap => {
            this.state.liveTeams = snap.val() || {};
            if (this.state.gameState === 'RACING') {
                this.updateHostRaceTracks();
            } else if (this.state.gameState === 'TEAM_PREVIEW') {
                this.renderTeamPreviewBoard();
            }
        });
    },

    renderHostLobby: function() {
        document.getElementById('avatarrunGameTitle').textContent = `Avatar Run - ${this.state.gameMode.includes('Takım') ? 'Takım Modu' : 'Bireysel'}`;
        document.getElementById('avatarrunModeBadge').textContent = "Bekleniyor...";
        document.getElementById('avatarrunHostNextBtn').style.display = 'none';
        
        // Pisti Temizle ve Lobi Bekleme UI'sını Göster
        const trackContainer = document.getElementById('avatarrunTrackContainer');
        trackContainer.innerHTML = '';
        trackContainer.style.display = 'flex';
        trackContainer.style.flexDirection = 'row';
        trackContainer.style.flexWrap = 'wrap';
        trackContainer.style.justifyContent = 'center';
        trackContainer.style.alignContent = 'flex-start';

        // PIN'i Göster
        const pinDisplay = document.getElementById('avatarrunPinDisplay');
        const pinCode = document.getElementById('avatarrunPinCode');
        if (pinDisplay && pinCode) {
            pinDisplay.style.display = 'flex';
            pinCode.textContent = this.state.livePin;
        }

        // "Oyunu Başlat" Butonunu Göster
        document.getElementById('avatarrunLobbyControlArea').style.display = 'flex';
        const startBtn = document.getElementById('avatarrunStartRaceBtn');
        if(startBtn) {
            startBtn.onclick = () => {
                const isTeamMode = this.state.gameMode.includes('Takım');
                if (isTeamMode) {
                    this.generateTeamsAndPreview();
                } else {
                    this.startRace(); // Bireysel ise direkt başlat
                }
            };
        }

        this.updateHostLobbyPlayers();
    },

    updateHostLobbyPlayers: function() {
        const countDisplay = document.getElementById('avatarrunPlayerStatus');
        const players = this.state.livePlayers || {};
        const pKeys = Object.keys(players);
        
        if (countDisplay) countDisplay.textContent = pKeys.length + " Kişi";

        if (this.state.gameState === 'RACING') {
            this.updateHostRaceTracks(); 
            return; 
        }

        if (this.state.gameState === 'TEAM_PREVIEW') {
            return; // Lobi UI'ını ezme
        }

        const trackContainer = document.getElementById('avatarrunTrackContainer');
        if (!trackContainer) return;
        trackContainer.innerHTML = '';

        if (pKeys.length === 0) {
            trackContainer.innerHTML = `<div style="color: #64748b; font-size: 1.5rem; font-style: italic; width: 100%; text-align: center; margin-top: 50px;">Öğrencilerin PIN ile katılması bekleniyor...</div>`;
            return;
        }

        pKeys.forEach(key => {
            const p = players[key];
            const card = document.createElement('div');
            card.style = "background: rgba(255,255,255,0.05); border: 2px solid rgba(244, 63, 94, 0.3); border-radius: 12px; padding: 10px; display: flex; flex-direction: column; align-items: center; gap: 5px; animation: scaleIn 0.3s ease-out; width: 100px;";
            
            const avatarSrc = p.avatar ? `game pics/avatars/${p.avatar}` : `game pics/avatars/1.png`;
            card.innerHTML = `
                <img src="${avatarSrc}" onerror="this.style.display='none'" style="width: 60px; height: 60px; border-radius: 50%; object-fit: contain; background: rgba(0,0,0,0.4); border: 2px solid #fda4af;">
                <span style="color: #fff; font-size: 0.9rem; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; text-align: center;">${p.name || 'Gizli'}</span>
            `;
            trackContainer.appendChild(card);
        });
    },

    generateTeamsAndPreview: function() {
        if (!this.state.livePlayers || Object.keys(this.state.livePlayers).length === 0) {
            this.showError("Öğrencilerin bağlanmasını bekleyin.");
            return;
        }

        this.state.gameState = 'TEAM_PREVIEW';
        document.getElementById('avatarrunLobbyControlArea').style.display = 'none';
        document.getElementById('avatarrunModeBadge').textContent = "Buluşma Zamanı: Takımları Tanıyalım!";
        
        const pKeys = Object.keys(this.state.livePlayers);
        let teamAssignments = {};
        let teamScores = {};

        // Rastgele Karıştır
        const shuffled = [...pKeys].sort(() => Math.random() - 0.5);
        const totalPlayers = shuffled.length;
        let teamCount = Math.max(2, Math.ceil(totalPlayers / 3)); 
        if (totalPlayers === 1) teamCount = 1; 
        
        const defaultTeamNames = ["Şahinler", "Kaplanlar", "Ejderhalar", "Aslanlar", "Panterler", "Ayılar", "Kurtlar", "Kartallar", "Atmaca", "Puma", "Jaguar", "Leopar", "Anka", "Sırtlanlar"];
        let customTeamNames = [];
        if (this.state.configJoin) {
            customTeamNames = this.state.configJoin.split(',').map(s => s.trim()).filter(s => s);
        }

        for(let i=0; i<teamCount; i++) {
            const tId = 'T' + i;
            const tName = customTeamNames[i] || defaultTeamNames[i % defaultTeamNames.length];
            teamScores[tId] = { score: 0, currentQ: 0, name: tName, members: [], captain: null };
        }

        // Yuvarlak Masa Dağıtımı (Round Robin)
        shuffled.forEach((key, index) => {
            const tId = 'T' + (index % teamCount);
            teamScores[tId].members.push(key);
            if (teamScores[tId].members.length === 1) {
                teamScores[tId].captain = key;
            }
            teamAssignments[key] = { teamId: tId, teamName: teamScores[tId].name };
        });

        if(this.roomRef) {
            this.roomRef.child('teams').set(teamScores);
            pKeys.forEach(key => {
                this.roomRef.child('players').child(key).update({
                    teamId: teamAssignments[key].teamId,
                    teamName: teamAssignments[key].teamName,
                    score: 0,
                    currentQ: 0
                });
            });
            this.roomRef.update({ state: 'TEAM_PREVIEW' });
        }

        // renderTeamPreviewBoard() Firebase'deki teams değişikliği aracılığıyla çağırılacak (listener tetikler).
        // Ancak hızlı olması için manuel olarak da basabiliriz.
        this.renderTeamPreviewBoard();
    },

    renderTeamPreviewBoard: function() {
        // Takılları tahtada kutu kutu gösterelim
        const trackContainer = document.getElementById('avatarrunTrackContainer');
        trackContainer.innerHTML = '';
        trackContainer.style.flexDirection = 'row';
        trackContainer.style.justifyContent = 'center';
        trackContainer.style.alignItems = 'flex-start';
        trackContainer.style.flexWrap = 'wrap';
        trackContainer.style.gap = '20px';
        trackContainer.style.padding = '20px';

        const teams = this.state.liveTeams || {};
        const players = this.state.livePlayers || {};

        Object.keys(teams).forEach(tKey => {
            const t = teams[tKey];
            const tBox = document.createElement('div');
            tBox.style = "background: rgba(15, 23, 42, 0.8); border: 3px solid #6366f1; border-radius: 20px; padding: 20px; width: 300px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); display: flex; flex-direction: column; align-items: center;";
            
            tBox.innerHTML = `<h3 style="color: #a5b4fc; margin-bottom: 20px; font-size: 1.5rem;">${t.name}</h3>`;
            
            const pList = document.createElement('div');
            pList.style = "display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; width: 100%;";
            
            if (t.members) {
                t.members.forEach(mKey => {
                    const p = players[mKey];
                    if(p) {
                        const avatarSrc = p.avatar ? `game pics/avatars/${p.avatar}` : `game pics/avatars/1.png`;
                        const isCaptain = t.captain === mKey;
                        const borderStyle = isCaptain ? "border:3px solid #f59e0b; box-shadow:0 0 15px #f59e0b;" : "border:2px solid #fff;";
                        const crown = isCaptain ? `<div style="position:absolute; top:-10px; right:-5px; font-size:1.5rem;">👑</div>` : "";
                        
                        pList.innerHTML += `
                            <div class="team-member-avatar" data-tid="${tKey}" data-mkey="${mKey}" style="display:flex; flex-direction:column; align-items:center; width:80px; gap:5px; cursor:pointer; position:relative;" title="Kaptan yapmak için tıkla">
                                ${crown}
                                <img src="${avatarSrc}" style="width:50px; height:50px; border-radius:50%; background:rgba(0,0,0,0.5); ${borderStyle} transition:all 0.2s;">
                                <span style="color:${isCaptain ? '#fde68a' : '#fff'}; font-size:0.8rem; text-align:center; overflow:hidden; text-overflow:ellipsis; width:100%; white-space:nowrap; font-weight:${isCaptain ? 'bold' : 'normal'};">${p.name}</span>
                            </div>
                        `;
                    }
                });
            }
            tBox.appendChild(pList);
            trackContainer.appendChild(tBox);
        });

        const controls = document.createElement('div');
        controls.style = "width: 100%; display: flex; justify-content: center; gap: 20px; margin-top: 40px;";
        controls.innerHTML = `
            <button id="btnShuffle" style="background:var(--accent-gradient); border:none; padding:15px 30px; border-radius:15px; font-size:1.2rem; color:#fff; font-weight:bold; cursor:pointer; display:flex; align-items:center; gap:10px;"><i class="fas fa-random"></i> Takımları Karıştır</button>
            <button id="btnRaceStart" style="background:#10b981; border:none; padding:15px 40px; border-radius:15px; font-size:1.5rem; color:#fff; font-weight:bold; cursor:pointer; box-shadow: 0 0 25px rgba(16,185,129,0.5);">🔥 Yarışa Başla!</button>
        `;
        trackContainer.appendChild(controls);

        document.getElementById('btnShuffle').onclick = () => this.generateTeamsAndPreview();
        document.getElementById('btnRaceStart').onclick = () => this.startRaceFromPreview();

        setTimeout(() => {
            document.querySelectorAll('.team-member-avatar').forEach(el => {
                el.onclick = () => {
                    const tid = el.getAttribute('data-tid');
                    const mkey = el.getAttribute('data-mkey');
                    if(this.roomRef) {
                        this.roomRef.child('teams').child(tid).update({ captain: mkey });
                    }
                };
            });
        }, 100);
    },

    startRaceFromPreview: function() {
        this.state.gameState = 'RACING';
        document.getElementById('avatarrunModeBadge').textContent = "🏃 Yarış Başladı!";
        if(this.roomRef) {
            this.roomRef.update({ 
                state: 'RACING',
                qData: this.state.questions
            });
        }
        this.renderHostRaceTracks();
    },

    startRace: function() {
        if (!this.state.livePlayers || Object.keys(this.state.livePlayers).length === 0) {
            this.showError("Öğrencilerin bağlanmasını bekleyin.");
            return;
        }

        this.state.gameState = 'RACING';
        document.getElementById('avatarrunLobbyControlArea').style.display = 'none';
        document.getElementById('avatarrunModeBadge').textContent = "🏃 Yarış Başladı!";
        
        const isTeamMode = this.state.gameMode.includes('Takım');
        const pKeys = Object.keys(this.state.livePlayers);

        let teamAssignments = {};
        let teamScores = {};

        if (isTeamMode) {
            // Rastgele Karıştır
            const shuffled = [...pKeys].sort(() => Math.random() - 0.5);
            const totalPlayers = shuffled.length;
            let teamCount = Math.max(2, Math.ceil(totalPlayers / 3)); 
            if (totalPlayers <= 1) teamCount = 1; 
            
            const teamNames = ["Kırmızı Şahinler", "Mavi Kaplanlar", "Yeşil Ejderhalar", "Sarı Aslanlar", "Mor Panterler", "Turuncu Ayılar", "Beyaz Kurtlar", "Siyah Kartallar"];
            
            for(let i=0; i<teamCount; i++) {
                const tId = 'T' + i;
                teamScores[tId] = { score: 0, currentQ: 0, name: teamNames[i % teamNames.length], members: [] };
            }

            // Yuvarlak Masa Dağıtımı (Round Robin)
            shuffled.forEach((key, index) => {
                const tId = 'T' + (index % teamCount);
                teamScores[tId].members.push(key);
                teamAssignments[key] = { teamId: tId, teamName: teamScores[tId].name };
            });

            if(this.roomRef) {
                this.roomRef.child('teams').set(teamScores);
                pKeys.forEach(key => {
                    this.roomRef.child('players').child(key).update({
                        teamId: teamAssignments[key].teamId,
                        teamName: teamAssignments[key].teamName,
                        score: 0,
                        currentQ: 0
                    });
                });
            }
        } else {
            pKeys.forEach(key => {
                if(this.roomRef) {
                    this.roomRef.child('players').child(key).update({score: 0, currentQ: 0});
                }
            });
        }

        if(this.roomRef) {
            this.roomRef.update({ 
                state: 'RACING',
                qData: this.state.questions
            });
        }

        this.renderHostRaceTracks();
    },

    renderHostRaceTracks: function() {
        const trackContainer = document.getElementById('avatarrunTrackContainer');
        trackContainer.innerHTML = '';
        trackContainer.style.flexDirection = 'column';
        trackContainer.style.justifyContent = 'flex-start';
        trackContainer.style.alignItems = 'stretch';
        trackContainer.style.padding = '20px';

        const isTeamMode = this.state.gameMode.includes('Takım');

        if (isTeamMode) {
            // TAKIM PİSTLERİ
            if (this.roomRef) {
                this.roomRef.once('value').then(snap => {
                    const roomData = snap.val();
                    const teams = roomData.teams || {};
                    const tKeys = Object.keys(teams);

                    tKeys.forEach((tKey, index) => {
                        const t = teams[tKey];
                        const total = this.state.questions.length || 1;
                        let captainAvatar = `game pics/avatars/${(index%40)+1}.png`;
                        if (t.captain && roomData.players && roomData.players[t.captain]) {
                             captainAvatar = `game pics/avatars/${roomData.players[t.captain].avatar}`;
                        } else if (t.members && t.members[0] && roomData.players && roomData.players[t.members[0]]) {
                             captainAvatar = `game pics/avatars/${roomData.players[t.members[0]].avatar}`;
                        }
                        this.buildTrackRow(trackContainer, tKey, t.name, t.score || 0, total, captainAvatar);
                    });
                });
            }
        } else {
            // BİREYSEL PİSTLER
            const players = this.state.livePlayers || {};
            const pKeys = Object.keys(players);
            const total = this.state.questions.length || 1;

            pKeys.forEach(key => {
                const p = players[key];
                const avatarSrc = p.avatar ? `game pics/avatars/${p.avatar}` : `game pics/avatars/1.png`;
                this.buildTrackRow(trackContainer, key, p.name || "Oyuncu", p.score || 0, total, avatarSrc);
            });
        }
    },

    buildTrackRow: function(container, id, displayName, score, total, avatarSrc) {
        const progressPercent = Math.min(95, Math.floor((score / total) * 95));

        const trackRow = document.createElement('div');
        trackRow.style = "display: flex; align-items: center; gap: 15px; margin-bottom: 25px; width: 100%;";
        
        const nameDiv = document.createElement('div');
        nameDiv.style = "width: 140px; text-align: right; color: #fff; font-weight: bold; font-size: 1.1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;";
        nameDiv.textContent = displayName;
        
        const trackArea = document.createElement('div');
        trackArea.style = "flex: 1; height: 50px; background: rgba(0,0,0,0.5); border-radius: 25px; border: 2px dashed rgba(255,255,255,0.2); position: relative; display: flex; align-items: center; box-shadow: inset 0 5px 15px rgba(0,0,0,0.5);";
        
        const filler = document.createElement('div');
        filler.id = `avatarFiller_${id}`;
        filler.style = `position: absolute; left: 0; top: 0; height: 100%; width: ${progressPercent}%; background: linear-gradient(90deg, #cbd5e1, #10b981); border-radius: 25px; transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1); opacity: 0.5;`;
        
        const runner = document.createElement('img');
        runner.id = `avatarRunner_${id}`;
        runner.src = avatarSrc;
        runner.style = `position: absolute; left: calc(${progressPercent}% - 30px); top: -15px; width: 80px; height: 80px; transition: left 0.5s cubic-bezier(0.4, 0, 0.2, 1); filter: drop-shadow(0 5px 10px rgba(0,0,0,0.5)); z-index: 10; object-fit: contain;`;

        const finishLine = document.createElement('div');
        finishLine.style = "position: absolute; right: 10px; top: -10px; bottom: -10px; width: 10px; background: repeating-linear-gradient(45deg, #fff, #fff 5px, #000 5px, #000 10px); z-index: 5;";

        trackArea.appendChild(filler);
        trackArea.appendChild(runner);
        trackArea.appendChild(finishLine);

        trackRow.appendChild(nameDiv);
        trackRow.appendChild(trackArea);
        
        container.appendChild(trackRow);
    },

    updateHostRaceTracks: function() {
        const isTeamMode = this.state.gameMode.includes('Takım');
        const total = this.state.questions.length || 1;
        let winnerName = null;

        if (isTeamMode) {
            if (this.roomRef) {
                this.roomRef.child('teams').once('value').then(snap => {
                    const teams = snap.val() || {};
                    Object.keys(teams).forEach(tKey => {
                        this.updateTrackProgress(tKey, teams[tKey].name, teams[tKey].score || 0, total, (wName) => { if(!winnerName) winnerName = wName; });
                    });
                    this.checkDeclareWinner(winnerName);
                });
            }
        } else {
            const players = this.state.livePlayers || {};
            Object.keys(players).forEach(pKey => {
                this.updateTrackProgress(pKey, players[pKey].name || 'Gizli', players[pKey].score || 0, total, (wName) => { if(!winnerName) winnerName = wName; });
            });
            this.checkDeclareWinner(winnerName);
        }
    },

    updateTrackProgress: function(id, name, score, total, winnerCallback) {
        const progressPercent = Math.min(95, Math.floor((score / total) * 95));
        const filler = document.getElementById(`avatarFiller_${id}`);
        const runner = document.getElementById(`avatarRunner_${id}`);
        if (filler && runner) {
            filler.style.width = `${progressPercent}%`;
            runner.style.left = `calc(${progressPercent}% - 30px)`;
        }
        if (score >= total) {
            winnerCallback(name);
        }
    },

    checkDeclareWinner: function(winnerName) {
        if (winnerName && this.state.gameState !== 'FINISHED') {
            this.state.gameState = 'FINISHED';
            if (this.roomRef) {
                this.roomRef.update({ state: 'END', winner: winnerName });
            }
            this.showWinnerOnBoard(winnerName);
        }
    },

    showWinnerOnBoard: function(winnerName) {
        document.getElementById('avatarrunModeBadge').textContent = "🏆 Yarış Bitti!";
        const trackContainer = document.getElementById('avatarrunTrackContainer');
        
        let confetti = `<div style="position:absolute; width:100%; height:100%; top:0; left:0; pointer-events:none; background: radial-gradient(circle, rgba(16,185,129,0.2) 0%, rgba(0,0,0,0) 70%); z-index:0;"></div>`;
        
        trackContainer.innerHTML += `
            <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); background:rgba(15, 23, 42, 0.95); padding:40px 60px; border-radius:30px; border:4px solid #10b981; box-shadow:0 20px 50px rgba(0,0,0,0.8); z-index:100; text-align:center; animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                <h2 style="color:#a7f3d0; font-size:2rem; margin:0 0 10px 0; letter-spacing:3px;">KAZANAN</h2>
                <h1 style="color:#10b981; font-size:4.5rem; margin:0; text-shadow:0 5px 15px rgba(16,185,129,0.4); font-weight:900;">${winnerName}</h1>
                <p style="color:#cbd5e1; font-size:1.5rem; margin-top:20px;">Tebrikler! Bitiş çizgisine ulaşan ilk sen oldun.</p>
                <div style="margin-top:30px; display:flex; gap:15px; justify-content:center;">
                     <button onclick="AvatarRunEngine.rematchSameTeams()" style="background:#3b82f6; border:none; border-radius:12px; padding:15px 20px; font-size:1.1rem; color:#fff; font-weight:bold; cursor:pointer;">Tekrar (Aynı Takım)</button>
                     <button onclick="AvatarRunEngine.rematchNewTeams()" style="background:#eab308; border:none; border-radius:12px; padding:15px 20px; font-size:1.1rem; color:#fff; font-weight:bold; cursor:pointer;">Yeni Takım Kur</button>
                     <button onclick="AvatarRunEngine.returnToLobby()" style="background:#ef4444; border:none; border-radius:12px; padding:15px 20px; font-size:1.1rem; color:#fff; font-weight:bold; cursor:pointer;">Kapat</button>
                </div>
            </div>
            ${confetti}
        `;
    },

    rematchSameTeams: function() {
        if (!this.roomRef) return;
        
        const pKeys = Object.keys(this.state.livePlayers || {});
        pKeys.forEach(k => {
            this.roomRef.child('players').child(k).update({ score: 0, currentQ: 0 });
        });

        const isTeamMode = this.state.gameMode.includes('Takım');
        if (isTeamMode) {
            const tKeys = Object.keys(this.state.liveTeams || {});
            tKeys.forEach(k => {
                this.roomRef.child('teams').child(k).update({ score: 0, currentQ: 0 });
            });
        }

        this.state.gameState = 'RACING';
        document.getElementById('avatarrunModeBadge').textContent = "🏃 Yarış Başladı!";
        this.roomRef.update({ state: 'RACING' });
        this.renderHostRaceTracks();
    },

    rematchNewTeams: function() {
        if (!this.roomRef) return;
        this.roomRef.child('teams').remove();
        
        const isTeamMode = this.state.gameMode.includes('Takım');
        if (isTeamMode) {
            this.generateTeamsAndPreview();
        } else {
            this.rematchSameTeams();
        }
    },

    returnToLobby: function() {
        if(this.roomRef) {
            this.roomRef.remove(); // Odayı kapatır, socket listeners öğrencileri atar
        }
        if(typeof goToLobby === 'function') goToLobby();
        const trackContainer = document.getElementById('avatarrunTrackContainer');
        if(trackContainer) trackContainer.innerHTML = '';
        this.state.gameState = 'LOBBY';
        this.state.livePlayers = {};
        this.state.livePin = null;
    },

    // ÖĞRENCİ CİHAZINDAN (CLIENT) ÇALIŞACAK FONKSİYON
    joinLiveRoom: function(pin, name, avatar) {
        if (typeof database === 'undefined' || !database) return;
        const myPlayerId = 'p_' + Math.random().toString(36).substr(2, 9);
        
        const myData = {
            id: myPlayerId,
            name: name,
            avatar: avatar,
            score: 0,
            progress: 0,
            hasError: false
        };

        // Firebase'e oyuncuyu ekle
        database.ref(`LiveAvatarRunRooms/${pin}/players/${myPlayerId}`).set(myData)
            .then(() => {
                // Katılım Ekranını Kapat, Öğrenci Bekleme/(veya koşu) Ekranına Geç
                document.getElementById('livePinJoinArea').style.display = 'none';
                
                const studentArea = document.getElementById('livePinStudentArea');
                if (studentArea) {
                    studentArea.style.display = 'flex';
                    studentArea.classList.remove('hidden-spa-module');
                }

                // Bekleme Yazısını Göster
                const waitArea = document.getElementById('livePinStudentWaitArea');
                const interactZone = document.getElementById('livePinStudentInteractionZone');
                if (waitArea) waitArea.style.display = 'flex';
                if (interactZone) interactZone.style.display = 'none';

                // Odanın state değişimini telefon tarafında dinle
                this.listenRoomStateAsClient(pin, myPlayerId);

            }).catch(err => {
                showOzelAlert("Bağlantı hatası: " + err.message, "hata");
            });
    },

    listenRoomStateAsClient: function(pin, myPlayerId) {
        database.ref(`LiveAvatarRunRooms/${pin}`).on('value', snap => {
            const roomData = snap.val();
            if (!roomData) return;
            
            this.state.gameMode = roomData.gameMode || 'Bireysel Mod';
            this.state.questions = roomData.qData || [];
            
            const me = roomData.players ? roomData.players[myPlayerId] : null;
            if (!me) return;

            const isTeamMode = this.state.gameMode.includes('Takım');
            let qIndex = me.currentQ || 0;
            if (isTeamMode && me.teamId && roomData.teams && roomData.teams[me.teamId]) {
                qIndex = roomData.teams[me.teamId].currentQ || 0;
            }

            if (roomData.state === 'RACING') {
                const waitArea = document.getElementById('livePinStudentWaitArea');
                if (waitArea) waitArea.style.display = 'none';
                
                const interactZone = document.getElementById('livePinStudentInteractionZone');
                if (interactZone) {
                    interactZone.style.display = 'flex';
                    // Gereksiz renderları önlemek için:
                    if (this.state.lastRender !== `${qIndex}_${roomData.state}`) {
                        this.state.lastRender = `${qIndex}_${roomData.state}`;
                        this.renderStudentQuestion(pin, myPlayerId, roomData, qIndex);
                    }
                }
            } else if (roomData.state === 'END') {
                const interactZone = document.getElementById('livePinStudentInteractionZone');
                if (interactZone) {
                    interactZone.innerHTML = '<p style="color:#10b981; margin:auto; font-size:2.5rem; text-align:center; font-weight:bold;">🏁 Yarış Bitti!<br><span style="font-size:1.2rem; color:#cbd5e1;">Lütfen tahtaya bakınız.</span></p>';
                }
            }
        });
    },

    renderStudentQuestion: function(pin, myPlayerId, roomData, qIndex) {
        const interactZone = document.getElementById('livePinStudentInteractionZone');
        if (!interactZone) return;
        
        if(qIndex >= this.state.questions.length) {
            interactZone.innerHTML = '<p style="color:#10b981; margin:auto; font-size:2rem; text-align:center;">Harika!<br>Bitiş çizgisine ulaştınız.</p>';
            return;
        }

        const q = this.state.questions[qIndex];
        const isTeamMode = this.state.gameMode.includes('Takım');
        const me = roomData.players[myPlayerId];

        let myAnswers = [];
        let amILuckyForType = true;

        if (isTeamMode && me.teamId && roomData.teams) {
             const team = roomData.teams[me.teamId];
             if (team && team.members) {
                  const members = [...team.members].sort(); 
                  const myIndex = members.indexOf(myPlayerId);
                  const luckyMemberIndex = qIndex % members.length;
                  
                  if (q.type && q.type !== 'mcq' && q.type !== 'default') {
                      amILuckyForType = (myIndex === luckyMemberIndex);
                      if (amILuckyForType) {
                          myAnswers = q.answers ? [...q.answers] : [];
                      } else {
                          myAnswers = [];
                      }
                  } else if (q.answers && Array.isArray(q.answers)) {
                      const allAns = [...q.answers]; 
                      const correctIndex = allAns.findIndex(a => a.isCorrect);
                      const correctAns = correctIndex > -1 ? allAns.splice(correctIndex, 1)[0] : allAns.pop();
                      
                      let myAssignedWrongAnswers = [];
                      allAns.forEach((wrongA, i) => {
                           if ((i % members.length) === myIndex) {
                                myAssignedWrongAnswers.push(wrongA);
                           }
                      });

                      myAnswers = [...myAssignedWrongAnswers];
                      if (myIndex === luckyMemberIndex) {
                           myAnswers.push(correctAns);
                      }
                      
                      const globalDistractors = this.state.questions.flatMap(qq => (qq.answers||[]).filter(a=>!a.isCorrect).map(a=>a.text));
                      const uniqueDistractors = [...new Set(globalDistractors)];
                      
                      while(myAnswers.length < 4) {
                          const shuffled = [...uniqueDistractors].sort(() => Math.random() - 0.5);
                          const validPick = shuffled.find(t => t !== correctAns.text && !myAnswers.some(a => a.text === t));
                          if (validPick) {
                              myAnswers.push({text: validPick, isCorrect: false});
                          } else {
                              myAnswers.push({text: "..." + Math.floor(Math.random()*100), isCorrect: false});
                          }
                      }
                      
                      if (myAnswers.length > 4) {
                          const c = myAnswers.find(a => a.isCorrect);
                          let w = myAnswers.filter(a => !a.isCorrect);
                          if (c) {
                               myAnswers = [c, ...w.slice(0, 3)];
                          } else {
                               myAnswers = w.slice(0, 4);
                          }
                      }
                      
                      myAnswers.sort(() => Math.random() - 0.5);
                  }
             } else {
                 myAnswers = q.answers ? [...q.answers] : [];
                 amILuckyForType = true;
             }
        } else {
            myAnswers = q.answers ? [...q.answers] : [];
            amILuckyForType = true;
        }

        const teamNameText = (isTeamMode && me.teamName) ? `<span style="display:block; font-size:0.9rem; color:#fcd34d; margin-top:5px;">${me.teamName}</span>` : "";

        let html = `
            <div style="padding: 20px; text-align: center; color: white; display: flex; flex-direction: column; width: 100%; height: 100%; box-sizing: border-box;">
                <h3 style="font-size: 1.2rem; margin-bottom: 20px; color: #a78bfa;">Soru ${qIndex + 1} / ${this.state.questions.length}${teamNameText}</h3>
                <p style="font-size: 1.8rem; font-weight: bold; margin-bottom: 30px;">${q.text || q.Word || q.Question || "Soru"}</p>
        `;

        if (q.type === 'type') {
            if (amILuckyForType) {
                const correctText = q.answers[0].text;
                const encodedCorrect = btoa(encodeURIComponent(correctText));
                html += `
                    <div style="display:flex; flex-direction:column; gap:15px; width:100%; align-items:center; flex:1;">
                        <input type="text" id="avatarRunTypeInput" placeholder="Cevabınızı yazın..." style="width:95%; padding:20px; font-size:1.5rem; border-radius:12px; border:2px solid #a78bfa; background:rgba(0,0,0,0.5); color:#fff; text-align:center; outline:none;" autocomplete="off">
                        <button onclick="AvatarRunEngine.submitTypeAnswer('${pin}', '${myPlayerId}', ${qIndex}, '${encodedCorrect}')" style="background:#10b981; border:none; border-radius:15px; padding:15px 40px; font-size:1.5rem; color:#fff; font-weight:bold; cursor:pointer; box-shadow:0 5px 15px rgba(0,0,0,0.3); width:100%; max-width: 300px; margin-top:10px;">Gönder</button>
                    </div>
                `;
            } else {
                html += `
                    <div style="display:flex; align-items:center; justify-content:center; flex:1; background:rgba(0,0,0,0.3); border-radius:15px; border:2px dashed #64748b; padding:20px;">
                        <p style="color:#94a3b8; font-size:1.5rem; font-style:italic;">Cevabı yazma görevi takım arkadaşında!<br>O'na yardım et.</p>
                    </div>
                `;
            }
        } else {
            if (myAnswers.length > 0) {
                html += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; flex: 1; width: 100%;">`;
                myAnswers.forEach((ans, i) => {
                    const colors = ['#ef4444', '#3b82f6', '#eab308', '#22c55e'];
                    const bgColor = colors[i % 4];
                    html += `<button onclick="AvatarRunEngine.submitAnswer('${pin}', '${myPlayerId}', ${qIndex}, ${ans.isCorrect})" style="background: ${bgColor}; border: none; border-radius: 15px; padding: 20px; font-size: 1.2rem; color: #fff; font-weight: bold; cursor: pointer; box-shadow: 0 5px 15px rgba(0,0,0,0.3); word-wrap: break-word;">${ans.text}</button>`;
                });
                html += `</div>`;
            } else {
                html += `
                    <div style="display:flex; align-items:center; justify-content:center; flex:1; background:rgba(0,0,0,0.3); border-radius:15px; border:2px dashed #64748b; padding:20px;">
                        <p style="color:#94a3b8; font-size:1.5rem; font-style:italic;">Şıklar sende değil!<br>Takım arkadaşlarına danış.</p>
                    </div>
                `;
            }
        }
        
        html += `</div>`;
        interactZone.innerHTML = html;
        
        if (q.type === 'type' && amILuckyForType) {
            const inp = document.getElementById('avatarRunTypeInput');
            if(inp) inp.focus();
        }
    },

    submitTypeAnswer: function(pin, myPlayerId, qIndex, encodedCorrectAnswer) {
        const inp = document.getElementById('avatarRunTypeInput');
        if(!inp) return;
        
        const userInput = inp.value.trim().toLocaleLowerCase('tr-TR');
        if (userInput === '') {
            if(typeof showOzelAlert === 'function') showOzelAlert("Boş cevap gönderemezsiniz.", "hata");
            return;
        }

        const correctAns = decodeURIComponent(atob(encodedCorrectAnswer)).trim().toLocaleLowerCase('tr-TR');
        let isCorrect = false;
        
        if (correctAns.includes(',')) {
            const arr = correctAns.split(',').map(s => s.trim());
            if (arr.includes(userInput)) isCorrect = true;
        } else {
            if (userInput === correctAns) isCorrect = true;
        }

        this.submitAnswer(pin, myPlayerId, qIndex, isCorrect);
    },

    submitAnswer: function(pin, myPlayerId, qIndex, isCorrect) {
        database.ref(`LiveAvatarRunRooms/${pin}`).once('value').then(snap => {
            const roomData = snap.val();
            if(!roomData) return;
            
            const isTeamMode = roomData.gameMode.includes('Takım');
            const p = roomData.players[myPlayerId];
            if(!p) return;

            if (isTeamMode) {
                const tId = p.teamId;
                if (!tId || !roomData.teams[tId]) return;
                
                const teamRef = database.ref(`LiveAvatarRunRooms/${pin}/teams/${tId}`);
                const t = roomData.teams[tId];
                if (t.currentQ !== qIndex) return; // Geçersiz veya çift tıklanmış

                if (isCorrect) {
                     teamRef.update({ score: (t.score || 0) + 1, currentQ: qIndex + 1 });
                } else {
                     teamRef.update({ score: 0, currentQ: 0 });
                     if(typeof showOzelAlert === 'function') showOzelAlert("Yanlış Cevap! Takımının ilerlemesi SIFIRLANDI ❌", "hata");
                }
            } else {
                const playerRef = database.ref(`LiveAvatarRunRooms/${pin}/players/${myPlayerId}`);
                if (p.currentQ !== qIndex) return; // Çift tıklama

                if (isCorrect) {
                    playerRef.update({ score: (p.score || 0) + 1, currentQ: qIndex + 1 });
                } else {
                    playerRef.update({ score: 0, currentQ: 0 });
                    if(typeof showOzelAlert === 'function') showOzelAlert("Yanlış Cevap! İlerlemen SIFIRLANDI ❌", "hata");
                }
            }
        });
    },

    showError: function(msg) {
        if (typeof showOzelAlert !== 'undefined') {
            showOzelAlert(msg, "hata");
        } else {
            alert(msg);
        }
        document.getElementById('avatarrunTrackContainer').innerHTML = `<p style="color:#ef4444;">HATA: ${msg}</p>`;
    }
};

// Global Erişilebilirlik
window.AvatarRunEngine = AvatarRunEngine;

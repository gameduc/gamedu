// --- BEECOMB (PETEK) OYUN MOTORU MODULU ---
// ==========================================
// FAZ 5: BEECOMB (PETEK) OYUN MOTORU EKLENTİSİ
// ==========================================
const BeeCombEngine = {
    state: {
        config: null,
        questionsPool: [],
        usedQuestionIds: new Set(),
        currentHexagonElement: null,
        blueCount: 0,
        greenCount: 0,
        countdownTimer: null,
        countdownSeconds: 5,
        layout: [5, 4, 5, 4, 5, 4, 5]
    },

    init: function (config) {
        this.state.config = config;

        // Auto-grade yapısı için RAM'deki 'all' başlangıcını offline '5' zorunluluğuna çeviriyoruz
        if (this.state.config.ClassGrade === 'all') {
            this.state.config.ClassGrade = '5';
        }

        // Visually update the top menu selector right away
        const topGradeSelect = document.getElementById('beeTopGradeSelect');
        if (topGradeSelect) topGradeSelect.value = this.state.config.ClassGrade;

        this.state.blueCount = 0;
        this.state.greenCount = 0;
        this.state.usedQuestionIds.clear();
        this.updateCountsDisplay();

        // 1. Grid'i (Petekleri) Oluştur
        this.generateHexagonGrid();

        // 2. Event Listener'ları kur
        this.setupEventListeners();

        // 3. Backend'den filtreye göre soruları çek ve highlight yap
        this.fetchInitialQuestions();
    },

    updateCountsDisplay: function () {
        const blueEl = document.getElementById('beeBlueCount');
        const greenEl = document.getElementById('beeGreenCount');
        if (blueEl) blueEl.textContent = this.state.blueCount;
        if (greenEl) greenEl.textContent = this.state.greenCount;
    },

    generateHexagonGrid: function () {
        const grid = document.getElementById('beeHexagonGrid');
        if (!grid) return;
        grid.innerHTML = '';
        let hexId = 0;

        let lettersPool = [
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
            'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'Y', 'Z',
            'Ş', 'Ü', 'İ', 'Ç', 'Ö', 'A', 'E'
        ];
        // Karıştır
        for (let i = lettersPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [lettersPool[i], lettersPool[j]] = [lettersPool[j], lettersPool[i]];
        }

        this.state.layout.forEach((columnHeight, colIndex) => {
            const columnDiv = document.createElement('div');
            columnDiv.classList.add('hexagon-column');

            for (let i = 0; i < columnHeight; i++) {
                const wrapper = document.createElement('div');
                wrapper.classList.add('hexagon-wrapper', 'loading'); // İlk başta disabled
                wrapper.dataset.id = hexId;
                wrapper.dataset.col = colIndex;
                wrapper.dataset.row = i;
                wrapper.dataset.letter = lettersPool[hexId];

                const hex = document.createElement('div');
                hex.classList.add('hexagon');
                hex.textContent = wrapper.dataset.letter;

                wrapper.appendChild(hex);
                columnDiv.appendChild(wrapper);

                wrapper.addEventListener('click', () => this.openQuestionModal(wrapper));
                hexId++;
            }
            grid.appendChild(columnDiv);
        });
    },

    fetchInitialQuestions: function () {
        const apiUrl = typeof AppConfig !== 'undefined' ? AppConfig.apiBaseUrl : '';
        if (!apiUrl) return;

        // Tüm soruları önden belleğe al
        fetch(`${apiUrl}?api=true&action=getBeeCombQuestions&grade=all&lesson=Random`)
            .then(res => res.json())
            .then(questions => {
                if (questions.error) {
                    showOzelAlert("BeeComb Soruları yüklenirken hata oluştu: " + questions.error, "hata");
                    return;
                }
                this.state.questionsPool = questions;

                // Modal Ders Dropdown'ını Doldur
                const lessons = new Set();
                questions.forEach(q => {
                    if (q.lesson) lessons.add(String(q.lesson).trim());
                });
                const sortedLessons = Array.from(lessons).sort();

                let optString = '<option value="Random" style="color:#000;">Tümü / Rastgele</option>';
                sortedLessons.forEach(l => {
                    optString += `<option value="${l}" style="color:#000;">${l}</option>`;
                });

                const modalLessonSelect = document.getElementById('beeModalLessonSelect');
                if (modalLessonSelect) modalLessonSelect.innerHTML = optString;

                const topLessonSelect = document.getElementById('beeTopLessonSelect');
                if (topLessonSelect) topLessonSelect.innerHTML = optString;

                const configGrade = this.state.config.ClassGrade || 'all';
                const configLesson = this.state.config.Lessons || 'Random';
                const mainLessons = configLesson.split(',').map(l => l.trim().toLowerCase());

                document.querySelectorAll('#beeHexagonGrid .hexagon-wrapper').forEach(wrapper => {
                    const hexDiv = wrapper.querySelector('.hexagon');
                    if (hexDiv) hexDiv.classList.remove('highlight');

                    // Sadece başlangıç konfigürasyonuna uyan sorular için Highlight yap
                    const hasQuestion = this.state.questionsPool.some(q =>
                        String(q.letter).toUpperCase() === wrapper.dataset.letter.toUpperCase() &&
                        (configGrade === 'all' || q.grade == configGrade) &&
                        (configLesson === 'Random' || mainLessons.includes(String(q.lesson).trim().toLowerCase())) &&
                        !this.state.usedQuestionIds.has(q.questionnumber)
                    );

                    if (hasQuestion) {
                        if (hexDiv) hexDiv.classList.add('highlight');
                    }
                    wrapper.classList.remove('loading'); // Tıklanabilir yap
                });
            })
            .catch(err => {
                showOzelAlert("BeeComb API Bağlantı hatası: " + err, "hata");
            });
    },

    setupEventListeners: function () {
        // Modal Butonları
        const closeBtn = document.getElementById('beeCloseModal');
        const greenBtn = document.getElementById('beeGreenBtn');
        const blueBtn = document.getElementById('beeBlueBtn');
        const changeQuestionBtn = document.getElementById('beeChangeQuestionBtn');
        const countdownBtn = document.getElementById('beeCountdownBtn');
        const checkWinBtn = document.getElementById('beeCheckWinBtn');

        // Önceki eventleri temizle (duplicate engellemek için)
        closeBtn.replaceWith(closeBtn.cloneNode(true));
        greenBtn.replaceWith(greenBtn.cloneNode(true));
        blueBtn.replaceWith(blueBtn.cloneNode(true));
        changeQuestionBtn.replaceWith(changeQuestionBtn.cloneNode(true));
        countdownBtn.replaceWith(countdownBtn.cloneNode(true));
        checkWinBtn.replaceWith(checkWinBtn.cloneNode(true));

        document.getElementById('beeCloseModal').addEventListener('click', () => this.closeQuestionModal());
        document.getElementById('beeGreenBtn').addEventListener('click', () => this.colorHexagon('green'));
        document.getElementById('beeBlueBtn').addEventListener('click', () => this.colorHexagon('blue'));
        document.getElementById('beeChangeQuestionBtn').addEventListener('click', () => this.requestNewQuestion());
        document.getElementById('beeCountdownBtn').addEventListener('click', () => this.startCountdown());
        document.getElementById('beeCheckWinBtn').addEventListener('click', () => this.checkWinCondition());

        // Modal İçi Filtreleme
        const modalGradeSelect = document.getElementById('beeModalGradeSelect');
        const modalLessonSelect = document.getElementById('beeModalLessonSelect');
        if (modalGradeSelect) modalGradeSelect.addEventListener('change', () => this.requestNewQuestion());
        if (modalLessonSelect) modalLessonSelect.addEventListener('change', () => this.requestNewQuestion());

        // Ana Üst Menü İçi Filtreleme (Top Bar)
        const topGradeSelect = document.getElementById('beeTopGradeSelect');
        const topLessonSelect = document.getElementById('beeTopLessonSelect');
        if (topGradeSelect) topGradeSelect.addEventListener('change', () => this.handleTopFilterChange());
        if (topLessonSelect) topLessonSelect.addEventListener('change', () => this.handleTopFilterChange());

        // Yeni Oyun ve Ana Sayfaya Dön (Lobi) Butonları
        const newGameBtn = document.getElementById('beeNewGameBtn');
        const backToLobbyBtn = document.getElementById('beeBackToLobbyBtn');

        if (newGameBtn) {
            newGameBtn.replaceWith(newGameBtn.cloneNode(true));
            document.getElementById('beeNewGameBtn').addEventListener('click', () => {
                showOzelAlert("Mevcut oyun sıfırlanacak, emin misiniz?", "evethayir", (isConfirmed) => {
                    if (isConfirmed) {
                        this.init(this.state.config); // Config'i koruyarak motoru yeniden başlat
                    }
                });
            });
        }

        if (backToLobbyBtn) {
            backToLobbyBtn.replaceWith(backToLobbyBtn.cloneNode(true));
            document.getElementById('beeBackToLobbyBtn').addEventListener('click', () => {
                showOzelAlert("Lobiye dönmek istediğinize emin misiniz? Oyun ilerlemesi kaybolur.", "evethayir", (isConfirmed) => {
                    if (isConfirmed) {
                        document.getElementById('beeCombGameArea').style.display = 'none';
                        document.getElementById('welcomeHero').style.display = 'block';
                        document.getElementById('gamesListArea').style.display = 'block';
                    }
                });
            });
        }
    },

    handleTopFilterChange: function () {
        const topGrade = document.getElementById('beeTopGradeSelect').value;
        const topLesson = document.getElementById('beeTopLessonSelect').value.trim();
        this.state.config.ClassGrade = topGrade;
        this.state.config.Lessons = topLesson;
        this.refreshGridHighlights();
    },

    openQuestionModal: function (wrapper) {
        const hexDiv = wrapper.querySelector('.hexagon');
        if (hexDiv.classList.contains('green') || hexDiv.classList.contains('blue')) {
            showOzelAlert("Bu petek zaten oynanmış.", "bilgi");
            return;
        }

        this.state.currentHexagonElement = wrapper;
        document.getElementById('beeModalHexagonLetter').textContent = wrapper.dataset.letter;

        // Modal Dropdown Varsayılanlarını Ayarla (Her Seferinde Senkronize Et)
        const modalGradeSelect = document.getElementById('beeModalGradeSelect');
        const modalLessonSelect = document.getElementById('beeModalLessonSelect');

        if (modalGradeSelect) {
            modalGradeSelect.value = this.state.config.ClassGrade || '5';
        }
        if (modalLessonSelect) {
            const lessonsStr = this.state.config.Lessons || '';
            const lessonsArr = lessonsStr.split(',');
            modalLessonSelect.value = lessonsArr.length === 1 && lessonsArr[0].trim() !== "" ? lessonsArr[0].trim() : 'Random';
        }

        // İçeriği temizle ve modal'ı göster
        document.getElementById('beeQuestionText').textContent = "Soru aranıyor...";
        document.getElementById('beeCountdownDisplay').textContent = "";
        document.getElementById('beeQuestionModal').style.display = 'flex';

        // Timer varsa iptal et
        if (this.state.countdownTimer) clearInterval(this.state.countdownTimer);

        this.requestQuestion(wrapper.dataset.letter);
    },

    refreshGridHighlights: function () {
        const configGrade = this.state.config.ClassGrade || 'all';
        const configLesson = this.state.config.Lessons || 'Random';
        const mainLessons = configLesson.split(',').map(l => l.trim().toLowerCase());

        document.querySelectorAll('#beeHexagonGrid .hexagon-wrapper').forEach(wrapper => {
            const hexDiv = wrapper.querySelector('.hexagon');
            if (hexDiv) hexDiv.classList.remove('highlight');

            const hasQuestion = this.state.questionsPool.some(q =>
                String(q.letter).toUpperCase() === wrapper.dataset.letter.toUpperCase() &&
                (configGrade === 'all' || q.grade == configGrade) &&
                (configLesson === 'Random' || mainLessons.includes(String(q.lesson).trim().toLowerCase())) &&
                !this.state.usedQuestionIds.has(q.questionnumber)
            );

            if (hasQuestion && !hexDiv.classList.contains('blue') && !hexDiv.classList.contains('green')) {
                hexDiv.classList.add('highlight');
            }
        });
    },

    requestQuestion: function (letter) {
        const modalGradeSelect = document.getElementById('beeModalGradeSelect');
        const modalLessonSelect = document.getElementById('beeModalLessonSelect');
        const searchGrade = modalGradeSelect ? modalGradeSelect.value : '5';
        const searchLesson = modalLessonSelect ? modalLessonSelect.value.trim() : 'Random';

        const availableQs = this.state.questionsPool.filter(q =>
            String(q.letter).toUpperCase() === String(letter).toUpperCase() &&
            (searchGrade === 'all' || q.grade == searchGrade) &&
            (searchLesson === 'Random' || String(q.lesson).trim().toLowerCase() === searchLesson.toLowerCase()) &&
            !this.state.usedQuestionIds.has(q.questionnumber)
        );

        if (availableQs.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableQs.length);
            const questionData = availableQs[randomIndex];
            // Temizleme Regex'i (Baştaki Harfi Silmek)
            let qText = questionData.question || "";
            document.getElementById('beeQuestionText').textContent = qText.replace(/^[A-Za-zŞÜİÇÖĞşüiçöğ]\s/, '');
            this.state.currentHexagonElement.dataset.questionNumber = questionData.questionnumber;
        } else {
            // Hiç Soru Yoksa Geçmiş Sorulardan Getirmeyi Teklif Et (Orjinal Mantık)
            showOzelAlert("Seçili filtrelere uygun YENİ soru kalmadı. Önceden sorulmuş bir soru gösterilsin mi?", "evethayir", (isConfirmed) => {
                if (isConfirmed) {
                    let previouslyUsedQuestions = this.state.questionsPool.filter(q =>
                        String(q.letter).toUpperCase() === String(letter).toUpperCase() &&
                        (searchGrade === 'all' || q.grade == searchGrade) &&
                        (searchLesson === 'Random' || String(q.lesson).trim().toLowerCase() === searchLesson.toLowerCase()) &&
                        this.state.usedQuestionIds.has(q.questionnumber)
                    );

                    if (previouslyUsedQuestions.length > 0) {
                        const randomIndex = Math.floor(Math.random() * previouslyUsedQuestions.length);
                        const questionData = previouslyUsedQuestions[randomIndex];
                        let qText = questionData.question || "";
                        document.getElementById('beeQuestionText').textContent = qText.replace(/^[A-Za-zŞÜİÇÖĞşüiçöğ]\s/, '');
                        this.state.currentHexagonElement.dataset.questionNumber = "reused"; // Tekrar kullanıldığı için ID silinir
                    } else {
                        showOzelAlert("Eskiden sorulmuş uygun soru da bulunamadı. Öğretmen sözlü sormalıdır.", "bilgi");
                        document.getElementById('beeQuestionText').textContent = "Öğretmen sözlü sormalıdır.";
                        this.state.currentHexagonElement.dataset.questionNumber = "none";
                    }
                } else {
                    document.getElementById('beeQuestionText').textContent = "Öğretmen sözlü sormalıdır.";
                    this.state.currentHexagonElement.dataset.questionNumber = "none";
                }
            });
        }
    },

    requestNewQuestion: function () {
        if (!this.state.currentHexagonElement) return;
        const oldQId = this.state.currentHexagonElement.dataset.questionNumber;
        if (oldQId && oldQId !== "reused" && oldQId !== "none") {
            this.state.usedQuestionIds.add(parseInt(oldQId)); // Eski soruyu kullanıldı farz et (Atlanmış Soru)
        }

        // Modal içi lesson 'Random' değilse, diğer dersleri deneme Orijinal mantığı
        const modalLessonSelect = document.getElementById('beeModalLessonSelect');
        const searchLesson = modalLessonSelect ? modalLessonSelect.value.trim() : 'Random';

        // Şimdilik karmaşa yaratmamak için dümdüz tekrar istek atıyoruz. (Orjinaldeki DFS veya karmaşık fallbackleri requestQuestion devraldı)
        this.requestQuestion(this.state.currentHexagonElement.dataset.letter);
    },

    colorHexagon: function (color) {
        if (!this.state.currentHexagonElement) return;
        const hexDiv = this.state.currentHexagonElement.querySelector('.hexagon');

        let isQuestionUsed = false;
        const reqId = this.state.currentHexagonElement.dataset.questionNumber;
        if (reqId && reqId !== "reused" && reqId !== "none") {
            isQuestionUsed = true;
        }

        // Rengi Kaldırma
        if (hexDiv.classList.contains(color)) {
            hexDiv.classList.remove(color);
            if (color === 'green') this.state.greenCount--;
            if (color === 'blue') this.state.blueCount--;
            if (isQuestionUsed) this.state.usedQuestionIds.delete(parseInt(reqId));
        } else {
            // Eskisini temizle
            if (hexDiv.classList.contains('green')) this.state.greenCount--;
            if (hexDiv.classList.contains('blue')) this.state.blueCount--;
            hexDiv.classList.remove('green', 'blue');

            // Yenisini Ekle
            hexDiv.classList.add(color);
            hexDiv.classList.remove('highlight');
            if (color === 'green') this.state.greenCount++;
            if (color === 'blue') this.state.blueCount++;

            if (isQuestionUsed) this.state.usedQuestionIds.add(parseInt(reqId));
        }

        this.updateCountsDisplay();
        this.closeQuestionModal();

        // AUTO GRADE PROGRESS (Otomatik Sınıf Atlama)
        const autoGradeCb = document.getElementById('beeAutoGradeProgress');
        if (autoGradeCb && autoGradeCb.checked) {
            const topGradeSelect = document.getElementById('beeTopGradeSelect');
            const ALL_GRADES = ['5', '6', '7', '8'];
            let currentGrade = String(this.state.config.ClassGrade || '5');
            if (currentGrade === 'all') currentGrade = '5';
            let nextGradeIndex = (ALL_GRADES.indexOf(currentGrade) + 1) % ALL_GRADES.length;
            const newGrade = ALL_GRADES[nextGradeIndex];

            this.state.config.ClassGrade = newGrade;
            if (topGradeSelect) topGradeSelect.value = newGrade;

            // Sınıf değiştiği için parlayan uyarıcı petekleri güncelle
            this.refreshGridHighlights();
        } else {
            // Normal kullanılmış petek kalktığı için
            this.refreshGridHighlights();
        }
    },

    closeQuestionModal: function () {
        document.getElementById('beeQuestionModal').style.display = 'none';
        if (this.state.countdownTimer) clearInterval(this.state.countdownTimer);
        this.state.currentHexagonElement = null;
    },

    startCountdown: function () {
        if (this.state.countdownTimer) clearInterval(this.state.countdownTimer);
        this.state.countdownSeconds = parseInt(this.state.config.Countdown) || 15; // Setup'tan da okunur
        document.getElementById('beeCountdownDisplay').textContent = `${this.state.countdownSeconds}s`;

        this.state.countdownTimer = setInterval(() => {
            this.state.countdownSeconds--;
            document.getElementById('beeCountdownDisplay').textContent = `${this.state.countdownSeconds}s`;
            if (this.state.countdownSeconds <= 0) {
                clearInterval(this.state.countdownTimer);
                document.getElementById('beeCountdownDisplay').textContent = "SÜRE BİTTİ!";
                // Ses çalabilirdi (audio context)
            }
        }, 1000);
    },

    checkWinCondition: function () {
        // First, clear any previous winning path highlights and animations
        document.querySelectorAll('#beeHexagonGrid .hexagon.win-path').forEach(hex => {
            hex.classList.remove('win-path');
        });

        const totalColumns = this.state.layout.length;
        const leftmostColumnIndex = 0;
        const rightmostColumnIndex = totalColumns - 1;

        let blueWin = this.findPath(leftmostColumnIndex, rightmostColumnIndex, 'blue');
        let greenWin = this.findPath(leftmostColumnIndex, rightmostColumnIndex, 'green');

        if (blueWin) {
            showOzelAlert('Mavi takım kazandı! 🔵', 'bilgi');
        } else if (greenWin) {
            showOzelAlert('Yeşil takım kazandı! 🟢', 'bilgi');
        } else {
            showOzelAlert('Henüz iki takım için de kesintisiz bir kazanma yolu bulunamadı.', 'bilgi');
        }
    },

    findPath: function (startCol, endCol, color) {
        const queue = [];
        const visited = new Set();
        const parentMap = new Map();

        document.querySelectorAll(`#beeHexagonGrid .hexagon-wrapper[data-col="${startCol}"]`).forEach(startHexWrapper => {
            const hexDiv = startHexWrapper.querySelector('.hexagon');
            if (hexDiv && hexDiv.classList.contains(color)) {
                queue.push(startHexWrapper);
                visited.add(startHexWrapper.dataset.id);
            }
        });

        while (queue.length > 0) {
            const currentHexWrapper = queue.shift();
            const currentHexId = currentHexWrapper.dataset.id;
            const currentCol = parseInt(currentHexWrapper.dataset.col);

            if (currentCol === endCol) {
                this.highlightPath(currentHexId, parentMap);
                return true;
            }

            const neighbors = this.getNeighbors(currentHexWrapper);

            for (const neighborWrapper of neighbors) {
                const neighborHexDiv = neighborWrapper.querySelector('.hexagon');
                const neighborId = neighborWrapper.dataset.id;

                if (neighborHexDiv && neighborHexDiv.classList.contains(color) && !visited.has(neighborId)) {
                    visited.add(neighborId);
                    parentMap.set(neighborId, currentHexId);
                    queue.push(neighborWrapper);
                }
            }
        }
        return false;
    },

    getNeighbors: function (hexagonWrapper) {
        const currentCol = parseInt(hexagonWrapper.dataset.col);
        const currentRow = parseInt(hexagonWrapper.dataset.row);
        const neighbors = [];

        const evenColOffsets = [
            [0, -1], [0, 1], // Top and Bottom
            [-1, 0], [-1, -1], // Left columns
            [1, 0], [1, -1] // Right columns
        ];
        const oddColOffsets = [
            [0, -1], [0, 1], // Top and Bottom
            [-1, 0], [-1, 1], // Left columns
            [1, 0], [1, 1] // Right columns
        ];

        const offsets = (currentCol % 2 === 0) ? evenColOffsets : oddColOffsets;

        offsets.forEach(offset => {
            const neighborCol = currentCol + offset[0];
            const neighborRow = currentRow + offset[1];

            if (neighborCol >= 0 && neighborCol < this.state.layout.length) {
                const maxRowInNeighborCol = this.state.layout[neighborCol] - 1;
                if (neighborRow >= 0 && neighborRow <= maxRowInNeighborCol) {
                    const neighborElement = document.querySelector(
                        `#beeHexagonGrid .hexagon-wrapper[data-col="${neighborCol}"][data-row="${neighborRow}"]`
                    );
                    if (neighborElement) {
                        neighbors.push(neighborElement);
                    }
                }
            }
        });
        return neighbors;
    },

    highlightPath: function (endHexId, parentMap) {
        let currentId = endHexId;
        while (currentId !== undefined) {
            const hexWrapper = document.querySelector(`#beeHexagonGrid .hexagon-wrapper[data-id="${currentId}"]`);
            if (hexWrapper) {
                const hexDiv = hexWrapper.querySelector('.hexagon');
                if (hexDiv) hexDiv.classList.add('win-path');
            }
            currentId = parentMap.get(currentId);
        }
    }
};


// ==========================================
// 5. MASTERPOOL VERİTABANI İŞLEMLERİ (KAYDET VE OKU)
// ==========================================

// EXCEL/TSV FORMATINDAKİ VERİYİ JSON'A ÇEVİRME ALGORİTMASI
function parseHibritData(rawData, setType, subType = 'coktan_secmeli', globalLevel = '', globalClass = '', globalLesson = '', globalTopic = '') {
    const lines = rawData.split('\n');
    let parsedArray = [];
    let errors = [];
    const isAcikUclu = (setType === 'qpool' && subType === 'acik_uclu');

    lines.forEach((line, index) => {
        let rowNum = index + 1;
        if (line.trim() !== "") {
            const parts = line.split('\t');
            if (setType === 'qpool') {
                let s_no = parts[0] ? parts[0].trim() : "";
                let s_text = parts[1] ? parts[1].trim() : "";
                let clue = parts[2] ? parts[2].trim() : "";
                let optA = "", optB = "", optC = "", optD = "", optE = "", correctAns = "", img_url = "";

                if (isAcikUclu) {
                    correctAns = parts[3] ? parts[3].trim() : "";
                    img_url = parts[4] ? parts[4].trim() : "";
                } else {
                    optA = parts[3] ? parts[3].trim() : "";
                    optB = parts[4] ? parts[4].trim() : "";
                    optC = parts[5] ? parts[5].trim() : "";
                    optD = parts[6] ? parts[6].trim() : "";
                    optE = parts[7] ? parts[7].trim() : "";
                    correctAns = parts[8] ? parts[8].trim() : "";
                    img_url = parts[9] ? parts[9].trim() : "";
                }

                if (!globalLevel) errors.push(`Satır ${rowNum}: 'Set Kademesi' genel formdan seçilmemiş!`);
                if (!globalClass) errors.push(`Satır ${rowNum}: 'Sınıf' genel formdan seçilmemiş!`);
                if (!globalLesson) errors.push(`Satır ${rowNum}: 'Ders' genel formdan girilmemiş!`);
                if (!globalTopic) errors.push(`Satır ${rowNum}: 'Konu' genel formdan girilmemiş!`);
                if (!s_no) errors.push(`Satır ${rowNum}: 'Soru Numarası' eksik!`);
                if (!s_text && !img_url) errors.push(`Satır ${rowNum}: 'Soru Metni' veya Resim eksik!`);

                if (!isAcikUclu) {
                    if (!optA || !optB || !optC || !optD) {
                        errors.push(`Satır ${rowNum}: En az 4 şık (A, B, C, D) bulunmalıdır!`);
                    }
                    if (globalLevel === 'LİSE' || globalLevel.includes('Lise')) {
                        if (!optE) errors.push(`Satır ${rowNum}: Kademe Lise olduğu için 5. şık (E) zorunludur!`);
                    }
                }

                if (!correctAns) errors.push(`Satır ${rowNum}: 'Doğru Cevap' girilmemiş!`);

                parsedArray.push({
                    Level: globalLevel,
                    Grade: globalLevel,
                    ClassGrade: globalClass,
                    Lesson: globalLesson,
                    Topic: globalTopic,
                    Unit: globalTopic,
                    QNumber: s_no,
                    ImgURL: img_url,
                    QuestionText: s_text,
                    Clue: clue,
                    OptionA: optA, OptionB: optB, OptionC: optC, OptionD: optD, OptionE: optE,
                    CorrectAnswer: correctAns
                });
            } else if (setType === 'sentence') {
                if (parts.length >= 1) {
                    let s_text = parts[0] ? parts[0].trim() : "";

                    if (!globalLevel) errors.push(`Satır ${rowNum}: 'Set Kademesi' formdan seçilmemiş!`);
                    if (!globalClass) errors.push(`Satır ${rowNum}: 'Sınıf' formdan seçilmemiş!`);
                    if (!globalLesson) errors.push(`Satır ${rowNum}: 'Ders' formdan girilmemiş!`);
                    if (!globalTopic) errors.push(`Satır ${rowNum}: 'Ünite' formdan girilmemiş!`);
                    if (!s_text) errors.push(`Satır ${rowNum}: 'Cümle' boş bırakılamaz!`);

                    parsedArray.push({
                        Level: globalLevel,
                        Grade: globalLevel,
                        ClassGrade: globalClass,
                        Lesson: globalLesson,
                        Topic: globalTopic,
                        Unit: globalTopic,
                        SentenceText: s_text,
                        SentenceTR: parts.length > 1 ? (parts[1] ? parts[1].trim() : "") : "",
                        Clue: parts.length > 2 ? (parts[2] ? parts[2].trim() : "") : ""
                    });
                }
            } else {
                if (parts.length >= 1) {
                    let w_word = parts[0] ? parts[0].trim() : "";

                    if (!globalLevel) errors.push(`Satır ${rowNum}: 'Set Kademesi' formdan seçilmemiş!`);
                    if (!globalClass) errors.push(`Satır ${rowNum}: 'Sınıf' formdan seçilmemiş!`);
                    if (!globalLesson) errors.push(`Satır ${rowNum}: 'Ders' formdan girilmemiş!`);
                    if (!globalTopic) errors.push(`Satır ${rowNum}: 'Ünite' formdan girilmemiş!`);
                    if (!w_word) errors.push(`Satır ${rowNum}: 'Kelime' boş bırakılamaz!`);

                    parsedArray.push({
                        Level: globalLevel,
                        Grade: globalLevel,
                        ClassGrade: globalClass,
                        Lesson: globalLesson,
                        Unit: globalTopic,
                        Topic: globalTopic,
                        Word: w_word,
                        Clue: parts.length > 1 ? (parts[1] ? parts[1].trim() : "") : "",
                        MeaningTR: parts.length > 2 ? (parts[2] ? parts[2].trim() : "") : "",
                        MeaningEN: parts.length > 3 ? (parts[3] ? parts[3].trim() : "") : "",
                        ImgURL: parts.length > 4 ? (parts[4] ? parts[4].trim() : "") : ""
                    });
                }
            }
        }
    });

    return { data: parsedArray, errors: errors };
}

if (isFirebaseInitialized) {
    // Set Kaydetme (MasterPool'a Gönder)
    if (saveSetBtn) {
        saveSetBtn.addEventListener('click', () => {
            const type = setTypeSelect ? setTypeSelect.value : 'wordspool';
            const subTypeSelect = document.getElementById('setSubTypeSelect');
            const subType = subTypeSelect ? subTypeSelect.value : 'coktan_secmeli';
            const title = setNameInput ? setNameInput.value.trim() : '';
            const gLevel = document.getElementById('setKademeSelect') ? document.getElementById('setKademeSelect').value : 'Ortaokul';
            const gClass = document.getElementById('setClassGradeSelect') ? document.getElementById('setClassGradeSelect').value : '';
            const _lessonEl = document.getElementById('setLessonInput');
            const _lessonCustom = document.getElementById('setLessonCustom');
            const gLesson = _lessonEl
                ? (_lessonEl.value === '__diger__'
                    ? (_lessonCustom ? _lessonCustom.value.trim() : '')
                    : _lessonEl.value.trim())
                : '';
            const gTopic = document.getElementById('setTopicInput') ? document.getElementById('setTopicInput').value.trim() : '';
            const rawData = setDataInput ? setDataInput.value.trim() : '';
            const isPublic = isPublicCheck ? isPublicCheck.checked : true;

            if (!title || !rawData || !gLesson || !gTopic || !gClass) return showMessage("Lütfen Set Adı, Sınıf, Ders, Konu alanlarını girin ve Excel verilerini kutuya yapıştırın.", "error");

            const parseResult = parseHibritData(rawData, type, subType, gLevel, gClass, gLesson, gTopic);

            if (parseResult.errors.length > 0) {
                let limitErrors = parseResult.errors.slice(0, 3).join("<br>");
                if (parseResult.errors.length > 3) limitErrors += `<br>...ve ${parseResult.errors.length - 3} hata daha.`;
                return showMessage(`SÜTUN HATALARI BULUNDU:<br><br><span style="color:#d32f2f; font-size:13px;">${limitErrors}</span>`, "error");
            }

            if (parseResult.data.length === 0) {
                return showMessage("Kutuya girdiğiniz veriler ayrıştırılamadı. Sütunların eksiksiz olduğundan emin olun.", "error");
            }

            // Firebase Realtime DB Referansı
            const newSetRef = database.ref('MasterPool').push();

            const setData = {
                Author_ID: currentUser.uid,
                Author_Email: currentUser.email,
                Title: title,
                Type: type, // wordspool mu qpool mu?
                SubType: subType, // coktan_secmeli mi acik_uclu mu?
                IsPublic: isPublic,
                GlobalLevel: gLevel,
                GlobalClass: gClass,
                GlobalLesson: gLesson,
                GlobalTopic: gTopic,
                ItemCount: parseResult.data.length,
                CreatedAt: firebase.database.ServerValue.TIMESTAMP,
                Data: parseResult.data
            };

            // Veritabanına yaz
            newSetRef.set(setData)
                .then(() => {
                    showMessage(`Başarılı! '${title}' setinize toplam ${parseResult.data.length} eleman yüklendi.`, "success");
                    if (setNameInput) setNameInput.value = '';
                    if (setDataInput) setDataInput.value = '';
                    loadMySets(); // Listeyi güncelle
                })
                .catch((error) => {
                    showMessage("Veritabanına yazılırken hata oluştu: " + error.message, "error");
                });
        });
    }

    // Sıfırdan Boş Set Oluştur (SADECE MODALI AÇ)
    if (createEmptySetBtn) {
        createEmptySetBtn.addEventListener('click', () => {
            console.log("createEmptySetBtn tıklandı!");
            try {
                const type = setTypeSelect ? setTypeSelect.value : 'wordspool';
                const subTypeSelect = document.getElementById('setSubTypeSelect');
                const subType = subTypeSelect ? subTypeSelect.value : 'coktan_secmeli';
                const title = setNameInput ? setNameInput.value.trim() : '';
                const isPublic = isPublicCheck ? isPublicCheck.checked : true;
                const gLevel = document.getElementById('setKademeSelect') ? document.getElementById('setKademeSelect').value : 'Tümü';
                const gClass = document.getElementById('setClassGradeSelect') ? document.getElementById('setClassGradeSelect').value : 'Tümü';
                const _lessonEl2 = document.getElementById('setLessonInput');
                const _lessonCustom2 = document.getElementById('setLessonCustom');
                const gLesson = _lessonEl2
                    ? (_lessonEl2.value === '__diger__'
                        ? (_lessonCustom2 ? _lessonCustom2.value.trim() : '')
                        : _lessonEl2.value.trim())
                    : '';
                const gTopic = document.getElementById('setTopicInput') ? document.getElementById('setTopicInput').value.trim() : '';

                if (!title || !gLesson || !gTopic) return showMessage("Lütfen yeni setiniz için Set Adı, Ders ve Konu bilgilerini eksiksiz girin.", "error");

                if (setNameInput) setNameInput.value = ''; // Modala geçerken arkadaki kutuyu boşaltalım

                console.log("Modal çağrılıyor: openCrudModalForNewSet: " + title);
                // Veritabanına yazmak yerine doğrudan "Yeni Satır Ekleme" Modalı açılır
                window.openCrudModalForNewSet(title, type, subType, isPublic, gLevel, gClass, gLesson, gTopic);
            } catch (err) {
                alert("Buton tıklamasında (createEmptySet) hata: " + err.message);
                console.error(err);
            }
        });
    }
}

// ==========================================
// 6. BENİM SETLERİMİ GETİRME EKRANI
// ==========================================
function loadMySets() {
    if (!isFirebaseInitialized || !currentUser) return;

    const mySetsContainer = document.getElementById('mySetsList');
    if (!mySetsContainer) return;
    mySetsContainer.innerHTML = '<p>Yükleniyor...</p>';

    // MasterPool tablosundan sadece Author_ID'si benim olanları çek
    const poolRef = database.ref('MasterPool').orderByChild('Author_ID').equalTo(currentUser.uid);

    // once('value') ile bir kere çağır.
    poolRef.once('value')
        .then((snapshot) => {
            if (!snapshot.exists()) {
                mySetsContainer.innerHTML = '<p style="color: #999; text-align: center; font-style: italic;">Henüz kayıtlı bir setiniz bulunmuyor...</p>';
                const badge = document.getElementById('mySetsBadge');
                if (badge) badge.textContent = '0';
                return;
            }

            const badge = document.getElementById('mySetsBadge');
            if (badge) badge.textContent = snapshot.numChildren();
            
            const badgeTitle = document.getElementById('mySetsBadgeInTitle');
            if (badgeTitle) badgeTitle.textContent = `(${snapshot.numChildren()} adet)`;

            mySetsContainer.innerHTML = ''; // Kesin temizle

            let setsArr = [];
            snapshot.forEach((childSnapshot) => {
                setsArr.push({
                    key: childSnapshot.key,
                    val: childSnapshot.val()
                });
            });

            // Sıralama Mantığı
            const sortVal = document.getElementById('mySetsSortSelect') ? document.getElementById('mySetsSortSelect').value : 'date_desc';
            
            if (sortVal === 'alpha_asc') {
                setsArr.sort((a, b) => a.val.Title.localeCompare(b.val.Title, 'tr'));
            } else if (sortVal === 'count_desc') {
                setsArr.sort((a, b) => (b.val.ItemCount || 0) - (a.val.ItemCount || 0));
            } else if (sortVal === 'date_asc') {
                setsArr.sort((a, b) => (a.val.CreatedAt || 0) - (b.val.CreatedAt || 0));
            } else { // date_desc (default)
                setsArr.sort((a, b) => (b.val.CreatedAt || 0) - (a.val.CreatedAt || 0));
            }

            setsArr.forEach((itemObj) => {
                const setKey = itemObj.key;
                const setVal = itemObj.val;

                const card = document.createElement('div');
                card.className = 'set-card';

                let isQPool = setVal.Type === 'qpool';
                let sampleData = setVal.Data && setVal.Data[0] ? (isQPool ? setVal.Data[0].QuestionText : setVal.Data[0].Word) : 'Boş Set';

                // Kök metadata varsa kullan, yoksa ilk item'dan çek (Geriye dönük uyumluluk)
                let itemGrade = setVal.GlobalLevel || (setVal.Data && setVal.Data[0] ? (setVal.Data[0].Level || setVal.Data[0].Grade || "Belirtilmemiş") : "Belirtilmemiş");
                let itemClass = setVal.GlobalClass || (setVal.Data && setVal.Data[0] ? (setVal.Data[0].ClassGrade || setVal.Data[0].Class || "Belirtilmemiş") : "Belirtilmemiş");
                let itemLesson = setVal.GlobalLesson || (setVal.Data && setVal.Data[0] ? (setVal.Data[0].Lesson || "Belirtilmemiş") : "Belirtilmemiş");
                let itemTopic = setVal.GlobalTopic || (setVal.Data && setVal.Data[0] ? (setVal.Data[0].Topic || setVal.Data[0].Unit || "Belirtilmemiş") : "Belirtilmemiş");

                // Yazar Adı belirleme
                let authorName = setVal.Author_DisplayName || setVal.Author_Email || 'Bilinmiyor';
                if (setVal.Author_Email === 'aahmetaytekin@gmail.com') authorName = 'GamEdu';

                // Kartın HTML elementine data- attributelarını bas
                card.setAttribute('data-type', setVal.Type.toLowerCase());
                card.setAttribute('data-grade', itemGrade.toLowerCase());
                card.setAttribute('data-class', itemClass.toLowerCase());
                card.setAttribute('data-lesson', itemLesson.toLowerCase());

                let typeLabel = setVal.Type === 'sentence' ? 'Cümle Seti' : (isQPool ? (setVal.SubType === 'acik_uclu' ? 'Açık Uçlu Soru' : 'Çoktan Seçmeli Soru') : 'Kelime Seti');
                let sampleTxt = setVal.Data && setVal.Data[0] ? (setVal.Type === 'sentence' ? setVal.Data[0].SentenceText : (isQPool ? setVal.Data[0].QuestionText : setVal.Data[0].Word)) : 'Boş Set';

                card.innerHTML = `
                    <div class="set-detail" style="width: 100%;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
                            <h4 style="margin:0;">${setVal.Title} 
                                <span style="font-size: 11px; font-weight:normal; color: ${setVal.IsPublic ? '#15803d' : '#b91c1c'}; background: ${setVal.IsPublic ? '#dcfce7' : '#fee2e2'}; padding: 2px 6px; border-radius: 12px; margin-left: 5px;">${setVal.IsPublic ? '🌎 Genel' : '🔒 Gizli'}</span> 
                                <span style="font-size: 11px; font-weight:normal; background:#e0e7ff; color:#3730a3; padding: 2px 6px; border-radius: 12px; margin-left: 5px;">${typeLabel} (${setVal.ItemCount} Kayıt)</span>
                            </h4>
                            <span style="font-size: 12px; color: #94a3b8;">Yazar: <strong style="color: #cbd5e1;">${authorName}</strong></span>
                        </div>
                        <div style="display:flex; gap:10px; font-size: 12px; margin-bottom: 8px; flex-wrap: wrap;">
                            <span style="background:rgba(59,130,246,0.1); color:#60a5fa; padding: 3px 8px; border-radius: 4px; border:1px solid rgba(59,130,246,0.2);">Kademe: ${itemGrade}</span>
                            <span style="background:rgba(59,130,246,0.1); color:#60a5fa; padding: 3px 8px; border-radius: 4px; border:1px solid rgba(59,130,246,0.2);">Sınıf: ${itemClass}</span>
                            <span style="background:rgba(59,130,246,0.1); color:#60a5fa; padding: 3px 8px; border-radius: 4px; border:1px solid rgba(59,130,246,0.2);">Ders: ${itemLesson}</span>
                            <span style="background:rgba(59,130,246,0.1); color:#60a5fa; padding: 3px 8px; border-radius: 4px; border:1px solid rgba(59,130,246,0.2);">Konu/Ünite: ${itemTopic}</span>
                        </div>
                        <p style="margin: 0; font-size: 13px; color: #94a3b8;">Örnek: <i style="color:#cbd5e1;">${sampleTxt} ...</i></p>
                    </div>
                    <div class="set-actions" style="margin-top: 10px; width: 100%; display:flex; justify-content:flex-end;">
                        <button class="action-btn btn-edit" onclick="openCrudModal('${setKey}')">⚙ Düzenle / İncele</button>
                    </div>
                `;
                mySetsContainer.appendChild(card);
            });
        })
        .catch((error) => {
            mySetsContainer.innerHTML = '<p style="color: red;">Setler çekilirken hata oluştu!</p>';
            console.error(error);
        });
}

// ==========================================
// 6.5. GLOBAL SETLERİ GETİRME EKRANI (KEŞFET) VE KLONLAMA
// ==========================================
function loadGlobalSets() {
    if (!isFirebaseInitialized || !globalSetsList) return;

    globalSetsList.innerHTML = '<p>Yükleniyor...</p>';

    const poolRef = database.ref('MasterPool').orderByChild('IsPublic').equalTo(true);

    poolRef.once('value')
        .then((snapshot) => {
            const badge = document.getElementById('globalSetsBadge');
            if (badge) badge.textContent = snapshot.numChildren();
            
            globalSetsList.innerHTML = ''; // Kesin temizle
            
            globalSetsList.innerHTML = ''; // Temizle

            snapshot.forEach((childSnapshot) => {
                const setKey = childSnapshot.key;
                const setVal = childSnapshot.val();

                const isMySet = currentUser && setVal.Author_ID === currentUser.uid;

                const card = document.createElement('div');
                card.className = 'set-card';

                let isQPool = setVal.Type === 'qpool';
                let sampleData = setVal.Data && setVal.Data[0] ? (isQPool ? setVal.Data[0].QuestionText : setVal.Data[0].Word) : 'Boş Set';

                // Kök metadata varsa kullan, yoksa ilk item'dan çek (Geriye dönük uyumluluk)
                let itemGrade = setVal.GlobalLevel || (setVal.Data && setVal.Data[0] ? (setVal.Data[0].Level || setVal.Data[0].Grade || "Belirtilmemiş") : "Belirtilmemiş");
                let itemClass = setVal.GlobalClass || (setVal.Data && setVal.Data[0] ? (setVal.Data[0].ClassGrade || setVal.Data[0].Class || "Belirtilmemiş") : "Belirtilmemiş");
                let itemLesson = setVal.GlobalLesson || (setVal.Data && setVal.Data[0] ? (setVal.Data[0].Lesson || "Belirtilmemiş") : "Belirtilmemiş");
                let itemTopic = setVal.GlobalTopic || (setVal.Data && setVal.Data[0] ? (setVal.Data[0].Topic || setVal.Data[0].Unit || "Belirtilmemiş") : "Belirtilmemiş");

                // Yazar Adı belirleme
                let authorName = setVal.Author_DisplayName || setVal.Author_Email || 'Bilinmiyor';
                if (setVal.Author_Email === 'aahmetaytekin@gmail.com') authorName = 'GamEdu';

                // Kartın HTML elementine data- attributelarını bas
                card.setAttribute('data-type', setVal.Type.toLowerCase());
                card.setAttribute('data-grade', itemGrade.toLowerCase());
                card.setAttribute('data-class', itemClass.toLowerCase());
                card.setAttribute('data-lesson', itemLesson.toLowerCase());

                let typeLabel = setVal.Type === 'sentence' ? 'Cümle Seti' : (isQPool ? (setVal.SubType === 'acik_uclu' ? 'Açık Uçlu Soru' : 'Çoktan Seçmeli Soru') : 'Kelime Seti');
                let sampleTxt = setVal.Data && setVal.Data[0] ? (setVal.Type === 'sentence' ? setVal.Data[0].SentenceText : (isQPool ? setVal.Data[0].QuestionText : setVal.Data[0].Word)) : 'Boş Set';

                card.innerHTML = `
                    <div class="set-detail" style="width: 100%;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
                            <h4 style="margin:0;">${setVal.Title} 
                                <span style="font-size: 11px; font-weight:normal; background:#e0e7ff; color:#3730a3; padding: 2px 6px; border-radius: 12px; margin-left: 5px;">${typeLabel} (${setVal.ItemCount} Kayıt)</span>
                            </h4>
                            <span style="font-size: 12px; color: #94a3b8;">Yazar: <strong style="color: #cbd5e1;">${authorName}</strong></span>
                        </div>
                        <div style="display:flex; gap:10px; font-size: 12px; margin-bottom: 8px; flex-wrap: wrap;">
                            <span style="background:rgba(59,130,246,0.1); color:#60a5fa; padding: 3px 8px; border-radius: 4px; border:1px solid rgba(59,130,246,0.2);">Kademe: ${itemGrade}</span>
                            <span style="background:rgba(59,130,246,0.1); color:#60a5fa; padding: 3px 8px; border-radius: 4px; border:1px solid rgba(59,130,246,0.2);">Sınıf: ${itemClass}</span>
                            <span style="background:rgba(59,130,246,0.1); color:#60a5fa; padding: 3px 8px; border-radius: 4px; border:1px solid rgba(59,130,246,0.2);">Ders: ${itemLesson}</span>
                            <span style="background:rgba(59,130,246,0.1); color:#60a5fa; padding: 3px 8px; border-radius: 4px; border:1px solid rgba(59,130,246,0.2);">Konu/Ünite: ${itemTopic}</span>
                        </div>
                        <p style="margin: 0; font-size: 13px; color: #94a3b8;">Örnek: <i style="color:#cbd5e1;">${sampleTxt} ...</i></p>
                    </div>
                    <div class="set-actions" style="margin-top: 10px; width:100%; display:flex; justify-content:flex-end; gap:5px;">
                        ${isMySet
                        ? `<button class="action-btn btn-cancel-inline" disabled style="opacity:0.6; cursor:not-allowed;">Senin Setin</button>`
                        : `
                            <button class="action-btn" style="background-color: #f59e0b; font-size: 0.8rem;" onclick="openCrudModal('${setKey}', true)">🔍 İncele</button>
                            <button class="action-btn" style="background-color: #8b5cf6; font-size: 0.8rem;" onclick="cloneSet('${setKey}')">📥 Kopyala & Düzenle</button>
                        `
                    }
                    </div>
                `;
                globalSetsList.appendChild(card);
            });
        })
        .catch((error) => {
            globalSetsList.innerHTML = '<p style="color: red;">Global setler çekilirken hata oluştu!</p>';
            console.error(error);
        });
}

window.cloneSet = function (setId) {
    if (!setId || !currentUser) return;

    database.ref('MasterPool/' + setId).once('value').then(snapshot => {
        if (!snapshot.exists()) return showMessage("Orijinal set bulunamadı.", "error");

        let originalData = snapshot.val();
        let isQPool = originalData.Type === 'qpool';

        let confirmHtml = 'Bu seti kendi koleksiyonunuza klonlamak istiyor musunuz?<br>';

        if (isQPool) {
            confirmHtml += `<br>
                <div style="text-align:left; background:rgba(0,0,0,0.2); padding:10px; border-radius:5px;">
                    <label style="color:#cbd5e1; font-size:0.9rem; display:block; margin-bottom:5px;">Soru Türünü Yeniden Seçin:</label>
                    <select id="cloneSubTypeSelect" style="width:100%; padding:5px; background:#1e293b; color:#fff; border:1px solid #475569; border-radius:4px;">
                        <option value="coktan_secmeli" ${originalData.SubType !== 'acik_uclu' ? 'selected' : ''}>Çoktan Seçmeli (Test)</option>
                        <option value="acik_uclu" ${originalData.SubType === 'acik_uclu' ? 'selected' : ''}>Açık Uçlu (Klasik)</option>
                    </select>
                </div>
            `;
        }

        showOzelAlert(confirmHtml, 'evethayir', (isConfirmed) => {
            if (isConfirmed) {
                let newSubType = originalData.SubType;
                if (isQPool) {
                    const cloneSubTypeSelect = document.getElementById('cloneSubTypeSelect');
                    if (cloneSubTypeSelect) newSubType = cloneSubTypeSelect.value;
                }

                let clonedSet = {
                    ...originalData,
                    Title: originalData.Title + " (Kopya)",
                    Author_ID: currentUser.uid,
                    Author_Email: currentUser.email,
                    IsPublic: false, // Klonlanan kopya varsayılan olarak gizli gelir
                    SubType: newSubType || 'coktan_secmeli',
                    CreatedAt: firebase.database.ServerValue.TIMESTAMP
                };

                database.ref('MasterPool').push(clonedSet).then((newRef) => {
                    showMessage("Set başarıyla kendi koleksiyonunuza eklendi!", "success");

                    window.switchDashboardTab('mySetsTab'); // Benim setlerim sekmesini aç
                    loadMySets(); // Set listesini yenile

                    // Önceki CRUD Modalı Kapatıyoruz
                    if (crudModal) crudModal.classList.remove('active');
                    window.isCrudReadOnly = false;
                    currentSetId = null;

                    // Yeniseti (ID'si ile) otomatik olarak düzenleme (Okunabilir) modunda aç!
                    setTimeout(() => {
                        window.openCrudModal(newRef.key, false);
                    }, 500);

                }).catch(err => showMessage("Klonlama hatası: " + err.message, "error"));
            }
        });
    }).catch(err => showMessage("Veri çekilemedi: " + err.message, "error"));
};


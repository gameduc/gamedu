// ==========================================
// 7. CRUD MODAL İŞLEMLERİ (READ, UPDATE, DELETE)
// ==========================================

// Görsel Önizleme Fonksiyonu (Quote hatasını önlemek için ayrıldı)
window.previewImage = function(url) {
    if (!url) return;
    showOzelAlert(`<img src="${url}" style="max-width:100%; max-height:70vh; display:block; margin:0 auto; border-radius:8px;">`, 'none');
};

// --- YENİ EKLENEN TOPLU DÜZENLEME (MEB FİLTRESİ) ---
window.populateModalMebFilters = function () {
    const lvl = document.getElementById('modalGlobalLevel');
    const cls = document.getElementById('modalGlobalClass');
    const les = document.getElementById('modalGlobalLesson');
    if (!lvl || !cls || !les) return;

    const val = lvl.value;
    let classOpts = [""];
    let lessonOpts = [""];

    if (val === "İlkokul") {
        classOpts.push("1. Sınıf", "2. Sınıf", "3. Sınıf", "4. Sınıf", "Ortak");
        lessonOpts.push("Türkçe", "Matematik", "Hayat Bilgisi", "Fen Bilimleri", "Sosyal Bilgiler", "İngilizce", "Din Kültürü", "Ortak", "Genel");
    } else if (val === "Ortaokul") {
        classOpts.push("5. Sınıf", "6. Sınıf", "7. Sınıf", "8. Sınıf", "Ortak");
        lessonOpts.push("Türkçe", "Matematik", "Fen Bilimleri", "Sosyal Bilgiler", "İngilizce", "Din Kültürü", "T.C. İnkılap Tarihi", "Ortak", "Genel");
    } else if (val === "Lise") {
        classOpts.push("9. Sınıf", "10. Sınıf", "11. Sınıf", "12. Sınıf", "Ortak");
        lessonOpts.push("Türk Dili ve Edebiyatı", "Matematik", "Fizik", "Kimya", "Biyoloji", "Tarih", "T.C. İnkılap Tarihi", "Coğrafya", "Felsefe", "İngilizce", "Din Kültürü", "Ortak", "Genel");
    } else {
        classOpts.push("Tümü", "Ortak");
        lessonOpts.push("Tümü", "Ortak", "Genel");
    }

    const prevClass = cls.value;
    const prevLesson = les.value;

    cls.innerHTML = classOpts.map(o => `<option value="${o}">${o || 'Sınıf'}</option>`).join('');

    // Ders alanı bir select ise güncelle, text ise değiştirme
    if (les.tagName === 'SELECT') {
        les.innerHTML = lessonOpts.map(o => `<option value="${o}">${o || 'Ders'}</option>`).join('')
            + '<option value="__diger__">✏️ Diğer (Manuel Giriş)...</option>';
        if (lessonOpts.includes(prevLesson) && prevLesson !== "") les.value = prevLesson;

        // Diğer seçilince custom input'u göster/gizle
        const lessonCust = document.getElementById('modalLessonCustom');
        if (lessonCust && !les._dicherBound) {
            les._dicherBound = true;
            les.addEventListener('change', () => {
                if (les.value === '__diger__') {
                    lessonCust.style.display = 'inline-block';
                    lessonCust.focus();
                } else {
                    lessonCust.style.display = 'none';
                    lessonCust.value = '';
                }
            });
        }
    }

    if (classOpts.includes(prevClass) && prevClass !== "") cls.value = prevClass;
};


document.addEventListener('DOMContentLoaded', () => {
    const metaBtn = document.getElementById('saveGlobalMetadataBtn');
    if (metaBtn) {
        metaBtn.addEventListener('click', () => {
            if (!currentSetId || !currentSetData) return;
            const lvl = document.getElementById('modalGlobalLevel').value;
            const cls = document.getElementById('modalGlobalClass').value;
            const _lessonSel = document.getElementById('modalGlobalLesson');
            const _lessonCust = document.getElementById('modalLessonCustom');
            const les = _lessonSel
                ? (_lessonSel.value === '__diger__'
                    ? (_lessonCust ? _lessonCust.value.trim() : '')
                    : _lessonSel.value)
                : '';
            const top = document.getElementById('modalGlobalTopic').value.trim();

            if (!lvl || !les || !top) {
                return showOzelAlert("Set güncellemesi için Kademe, Ders ve Konu seçimi zorunludur.", "hata");
            }

            const updates = {};
            updates[`MasterPool/${currentSetId}/GlobalLevel`] = lvl;
            updates[`MasterPool/${currentSetId}/GlobalClass`] = cls;
            updates[`MasterPool/${currentSetId}/GlobalLesson`] = les;
            updates[`MasterPool/${currentSetId}/GlobalTopic`] = top;

            if (currentSetData.Data && Array.isArray(currentSetData.Data)) {
                currentSetData.Data.forEach((item, idx) => {
                    if (item) {
                        updates[`MasterPool/${currentSetId}/Data/${idx}/Level`] = lvl;
                        updates[`MasterPool/${currentSetId}/Data/${idx}/ClassGrade`] = cls;
                        updates[`MasterPool/${currentSetId}/Data/${idx}/Lesson`] = les;
                        updates[`MasterPool/${currentSetId}/Data/${idx}/Topic`] = top;
                        if (currentSetData.Type === 'wordspool') {
                            updates[`MasterPool/${currentSetId}/Data/${idx}/Unit`] = top;
                        }
                    }
                });
            }

            database.ref().update(updates).then(() => {
                currentSetData.GlobalLevel = lvl;
                currentSetData.GlobalClass = cls;
                currentSetData.GlobalLesson = les;
                currentSetData.GlobalTopic = top;

                if (currentSetData.Data && Array.isArray(currentSetData.Data)) {
                    currentSetData.Data.forEach(item => {
                        if (item) {
                            item.Level = lvl;
                            item.ClassGrade = cls;
                            item.Lesson = les;
                            item.Topic = top;
                            if (currentSetData.Type === 'wordspool') item.Unit = top;
                        }
                    });
                }

                const stat = document.getElementById('globalMetadataStatus');
                if (stat) {
                    stat.style.opacity = '1';
                    setTimeout(() => stat.style.opacity = '0', 3000);
                }
                loadMySets();
            }).catch(err => showOzelAlert("Güncelleme hatası: " + err.message, "hata"));
        });
    }

    const lvlEl = document.getElementById('modalGlobalLevel');
    if (lvlEl) lvlEl.addEventListener('change', window.populateModalMebFilters);
});

window.isCrudReadOnly = false;

window.openCrudModal = function (setId, isReadOnly = false) {
    if (!setId) return;

    currentSetId = setId;
    window.isCrudReadOnly = isReadOnly;

    database.ref('MasterPool/' + setId).once('value').then(snapshot => {
        if (!snapshot.exists()) return showMessage("Bu set bulunamadı veya silinmiş.", "error");

        currentSetData = snapshot.val();

        // Modal Başlığı
        if (crudModalTitle) {
            if (isReadOnly) {
                crudModalTitle.innerHTML = `Seti İncele: <span style="font-weight:bold; color:#a78bfa;">${currentSetData.Title || 'İsimsiz Set'}</span> <span style="font-size:12px; color:#94a3b8; font-weight:normal;">(Salt Okunur)</span>`;
            } else {
                crudModalTitle.innerHTML = `Seti Düzenle: <span style="font-weight:bold; color:#2563eb;">${currentSetData.Title || 'İsimsiz Set'}</span>`;
            }
        }

        if (editSetTitleBtn) editSetTitleBtn.style.display = isReadOnly ? 'none' : 'inline-block';

        // Set Global Metadata Defaults
        const globalEditDiv = document.getElementById('globalMetadataEdit');
        if (globalEditDiv) {
            globalEditDiv.style.display = isReadOnly ? 'none' : 'flex';
            if (!isReadOnly) {
                let gLev = currentSetData.GlobalLevel;
                let gCls = currentSetData.GlobalClass;
                let gLes = currentSetData.GlobalLesson;
                let gTop = currentSetData.GlobalTopic;

                // Eskiden global verisi olmayan setler için data[0]'dan yakala
                if (!gLev && currentSetData.Data && currentSetData.Data.length > 0) {
                    const firstObj = currentSetData.Data.find(x => x !== null && x !== undefined);
                    if (firstObj) {
                        gLev = firstObj.Level || '';
                        gCls = firstObj.ClassGrade || '';
                        gLes = firstObj.Lesson || '';
                        gTop = firstObj.Topic || firstObj.Unit || '';
                    }
                }

                document.getElementById('modalGlobalLevel').value = gLev || '';
                window.populateModalMebFilters(); // Sınıf ve ders menülerini kademeye göre doldur
                document.getElementById('modalGlobalClass').value = gCls || '';
                document.getElementById('modalGlobalLesson').value = gLes || '';
                document.getElementById('modalGlobalTopic').value = gTop || '';
            }
        }

        // Tabloyu Çiz
        renderCrudTable(currentSetData.Data, currentSetData.Type);

        // Formu Hazırla (Ekleme için) - Okuma/Düzenleme Geçişleri
        const crudAddForm = document.getElementById('crudAddFormSection');
        const deleteEntireSetBtn = document.getElementById('deleteEntireSetBtn');
        const showAddFormBtn = document.getElementById('showAddFormBtn');
        let existingCloneBtn = document.getElementById('cloneFromModalBtn');

        if (existingCloneBtn) existingCloneBtn.remove(); // Temizle

        if (isReadOnly) {
            if (crudAddForm) crudAddForm.style.display = 'none';
            if (crudTableSection) crudTableSection.style.display = 'block';
            if (showAddFormBtn) showAddFormBtn.style.display = 'none';
            if (deleteEntireSetBtn) deleteEntireSetBtn.style.display = 'none';

            // Klonla Butonu Ekle (CRUD Modal içerisindeyken incelenen seti Kopyalamaya yarar)
            const cloneBtn = document.createElement('button');
            cloneBtn.id = 'cloneFromModalBtn';
            cloneBtn.className = 'login-btn';
            cloneBtn.style.cssText = 'background: #8b5cf6; width: 100%; padding: 15px; font-size:1.2rem; margin-top:15px;';
            cloneBtn.innerHTML = '📥 Kopyala ve Düzenle';
            cloneBtn.onclick = () => window.cloneSet(setId);

            document.querySelector('.ozel-alert-box').appendChild(cloneBtn);
        } else {
            // Edit Modu: Default TABLO gösterilir, FORM gizlenir.
            if (crudAddForm) crudAddForm.style.display = 'none';
            if (crudTableSection) crudTableSection.style.display = 'block';
            if (showAddFormBtn) showAddFormBtn.style.display = 'inline-block';
            if (deleteEntireSetBtn) deleteEntireSetBtn.style.display = 'inline-block';

            renderCrudAddForm(currentSetData.Type);
        }

        // Modalı Göster
        if (crudModal) crudModal.classList.add('active');
    }).catch(err => {
        showMessage("Veri çekilemedi: " + err.message, "error");
    });
};

window.openCrudModalForNewSet = function (title, type, subType, isPublic, gLevel = '', gClass = '', gLesson = '', gTopic = '') {
    console.log("🛠️ openCrudModalForNewSet ÇALIŞTI!", { title, type, subType, isPublic, gLevel, gClass, gLesson, gTopic });
    try {
        currentSetId = null; // null demek YENİ SET demek
        currentSetData = {
            Title: title,
            Type: type,
            SubType: subType,
            IsPublic: isPublic,
            GlobalLevel: gLevel, // Sete ait ortak ayar olarak modal içinde tut
            GlobalClass: gClass,
            GlobalLesson: gLesson,
            GlobalTopic: gTopic,
            Data: []
        };
        window.isCrudReadOnly = false;

        if (crudModalTitle) {
            crudModalTitle.innerHTML = `Yeni Set Oluştur: <span style="font-weight:bold; color:#2563eb;">${currentSetData.Title} (${gLevel} - ${gLesson})</span>`;
        }

        if (editSetTitleBtn) editSetTitleBtn.style.display = 'none'; // Yeni açılan sette başlık değiştirmeye şimdilik gerek yok

        // YENİ SET: Tablo Yok, Sadece Form Gösterilir
        const crudTableSection = document.getElementById('crudTableSection');
        const crudAddForm = document.getElementById('crudAddFormSection');
        const hideAddFormBtn = document.getElementById('hideAddFormBtn');
        const showAddFormBtn = document.getElementById('showAddFormBtn');
        const deleteEntireSetBtn = document.getElementById('deleteEntireSetBtn');

        if (crudTableSection) crudTableSection.style.display = 'none';
        if (showAddFormBtn) showAddFormBtn.style.display = 'none'; // Daha tablo yok, ekleme butonu gizli

        if (crudAddForm) crudAddForm.style.display = 'block';
        if (hideAddFormBtn) hideAddFormBtn.style.display = 'none'; // Geri dönülecek tablo yok

        if (deleteEntireSetBtn) deleteEntireSetBtn.style.display = 'none'; // Daha oluşmamış seti silemeyiz
        if (crudAddNewItemBtn) crudAddNewItemBtn.innerHTML = "Kaydet";

        renderCrudAddForm(type);

        if (crudModal) crudModal.classList.add('active');
        console.log("✅ MODAL AÇILMA KOMUTU VERİLDİ (.active eklendi)");
    } catch (e) {
        console.error("❌ openCrudModalForNewSet İÇİNDE HATA:", e);
        alert("MODAL AÇILIRKEN BEKLENMEYEN HATA: " + e.message);
    }
};

if (closeCrudModal) {
    closeCrudModal.addEventListener('click', () => {
        if (crudModal) crudModal.classList.remove('active');
        currentSetId = null;
        currentSetData = null;
        loadMySets(); // güncellenen miktarı ana ekrana yansıtmak için listeyi tazele
    });
}

if (showAddFormBtn) {
    showAddFormBtn.addEventListener('click', () => {
        if (crudTableSection) crudTableSection.style.display = 'none';
        if (crudAddFormSection) crudAddFormSection.style.display = 'block';
        if (hideAddFormBtn) hideAddFormBtn.style.display = 'block'; // Düzenleme modunda listeye dönülebilir

        // Formu temizle ve 1 satırla başlat
        if (currentSetData) renderCrudAddForm(currentSetData.Type);
    });
}

if (hideAddFormBtn) {
    hideAddFormBtn.addEventListener('click', () => {
        if (crudAddFormSection) crudAddFormSection.style.display = 'none';
        if (crudTableSection) crudTableSection.style.display = 'block';
    });
}

if (editSetTitleBtn) {
    editSetTitleBtn.addEventListener('click', () => {
        if (!currentSetId || !currentSetData) return;

        showOzelAlert("Setin yeni adını girin:", "prompt", (newTitle) => {
            if (newTitle !== null && newTitle.trim() !== "") {
                database.ref('MasterPool/' + currentSetId + '/Title').set(newTitle.trim()).then(() => {
                    currentSetData.Title = newTitle.trim();
                    if (crudModalTitle) {
                        crudModalTitle.innerHTML = `Seti Düzenle: <span style="font-weight:bold; color:#2563eb;">${currentSetData.Title}</span>`;
                    }
                    showMessage("Set başlığı başarıyla güncellendi.", "success");
                    loadMySets();
                    loadGlobalSets();
                }).catch(err => showMessage("Başlık güncellenemedi: " + err.message, "error"));
            }
        }, currentSetData.Title);
    });
}

// Modal dışına tıklandığında kapatma
window.onclick = function (event) {
    if (event.target == crudModal) {
        if (crudModal) crudModal.classList.remove('active');
        currentSetId = null;
        currentSetData = null;
        loadMySets();
    }
};

function renderCrudTable(dataArray, type) {
    if (!crudTableHeadRow || !crudTableBody) return;

    crudTableHeadRow.innerHTML = '';
    crudTableBody.innerHTML = '';

    if (!dataArray || dataArray.length === 0) {
        crudTableBody.innerHTML = `<tr><td colspan="11" style="text-align:center;">Bu sette hiç öğe yok. Kayıt ekleyebilirsiniz.</td></tr>`;
        return;
    }

    // Başlıkları Çiz
    if (type === 'qpool') {
        let isAcikUclu = currentSetData ? currentSetData.SubType === 'acik_uclu' : false;
        crudTableHeadRow.innerHTML = `
            <th>S.No</th>
            <th>Soru Metni</th>
            <th>İpucu</th>
            ${isAcikUclu ? '' : `
            <th>A Şıkkı</th>
            <th>B Şıkkı</th>
            <th>C Şıkkı</th>
            <th>D Şıkkı</th>
            <th>E Şıkkı</th>`}
            <th>Doğru Cev.</th>
            <th>Görsel URL</th>
            ${window.isCrudReadOnly ? '' : '<th>Aksiyonlar</th>'}
        `;
    } else {
        crudTableHeadRow.innerHTML = `
            <th>Kelime</th>
            <th>İpucu</th>
            <th>Türkçe A.</th>
            <th>İngilizce A.</th>
            <th>Görsel URL</th>
            ${window.isCrudReadOnly ? '' : '<th>Aksiyonlar</th>'}
        `;
    }

    // Satırları Çiz (Döngü)
    dataArray.forEach((item, index) => {
        if (!item) return; // Null olanları atla (silinmiş satırlar)

        const tr = document.createElement('tr');
        tr.id = 'crudRow-' + index;

        if (type === 'qpool') {
            let isAcikUclu = currentSetData ? currentSetData.SubType === 'acik_uclu' : false;
            tr.innerHTML = `
                <td>${item.QNumber || ''}</td>
                <td>${item.QuestionText || ''}</td>
                <td>${item.Clue && item.Clue.startsWith('http') ? '<a href="' + item.Clue + '" target="_blank">📷 (Aç)</a>' : (item.Clue || '-')}</td>
                ${isAcikUclu ? '' : `
                <td>${item.OptionA || ''}</td>
                <td>${item.OptionB || ''}</td>
                <td>${item.OptionC || ''}</td>
                <td>${item.OptionD || ''}</td>
                <td>${item.OptionE || ''}</td>`}
                <td style="font-weight:bold; color:#10b981;">${item.CorrectAnswer || ''}</td>
                <td>${item.ImgURL ? `<button class="action-btn" style="background:#0284c7; padding:2px 8px; font-size:11px;" onclick="previewImage('${item.ImgURL}')">👁️ Gör</button>` : '-'}</td>
                ${window.isCrudReadOnly ? '' : `
                <td style="white-space:nowrap;">
                    <button class="action-btn btn-edit" onclick="editRow(${index}, 'qpool')">✎ Düzenle</button>
                    <button class="action-btn btn-delete" onclick="deleteRow(${index})">X</button>
                </td>
                `}
            `;
        } else {
            tr.innerHTML = `
                <td style="font-weight:bold;">${item.Word || ''}</td>
                <td>${item.Clue || ''}</td>
                <td>${item.MeaningTR || '-'}</td>
                <td>${item.MeaningEN || '-'}</td>
                <td>${item.ImgURL ? `<button class="action-btn" style="background:#0284c7; padding:2px 8px; font-size:11px;" onclick="previewImage('${item.ImgURL}')">👁️ Gör</button>` : '-'}</td>
                ${window.isCrudReadOnly ? '' : `
                <td style="white-space:nowrap;">
                    <button class="action-btn btn-edit" onclick="editRow(${index}, 'wordspool')">✎ Düzenle</button>
                    <button class="action-btn btn-delete" onclick="deleteRow(${index})">X</button>
                </td>
                `}
            `;
        }
        crudTableBody.appendChild(tr);
    });
}

// --- SİLME (DELETE) İŞLEMİ ---
window.deleteRow = function (rowIndex) {
    if (!currentSetId || !currentSetData) return;

    // confirm('Bu öğeyi silmek istediğinize emin misiniz? (Geri alınamaz)')
    showOzelAlert('Bu öğeyi silmek istediğinize emin misiniz? (Geri alınamaz)', 'evethayir', (isConfirmed) => {
        if (isConfirmed) {
            database.ref('MasterPool/' + currentSetId + '/Data/' + rowIndex).set(null).then(() => {
                currentSetData.Data[rowIndex] = null;
                let newCount = currentSetData.Data.filter(x => x !== null).length;
                database.ref('MasterPool/' + currentSetId + '/ItemCount').set(newCount);

                const rowElem = document.getElementById('crudRow-' + rowIndex);
                if (rowElem) rowElem.remove();

                showMessage('Başarıyla silindi.', 'success');
                loadMySets();
            }).catch(err => {
                showMessage('Silinemedi: ' + err.message, 'error');
            });
        }
    });
};

// --- DÜZENLEME (UPDATE) FORMATI OLUŞTURMA ---
window.editRow = function (rowIndex, type) {
    if (!currentSetId || !currentSetData) return;
    const rowElem = document.getElementById('crudRow-' + rowIndex);
    const item = currentSetData.Data[rowIndex];
    if (!rowElem || !item) return;

    if (type === 'qpool') {
        let isAcikUclu = currentSetData.SubType === 'acik_uclu';
        rowElem.innerHTML = `
            <td><input type="text" id="e_Qn_${rowIndex}" value="${item.QNumber || ''}" style="width:40px;"></td>
            <td><input type="text" id="e_Qt_${rowIndex}" value="${item.QuestionText || ''}" style="width:100%;"></td>
            <td><input type="text" id="e_Clue_${rowIndex}" value="${item.Clue || ''}" placeholder="İpucu/URL"></td>
            ${isAcikUclu ? '' : `
            <td><input type="text" id="e_A_${rowIndex}" value="${item.OptionA || ''}"></td>
            <td><input type="text" id="e_B_${rowIndex}" value="${item.OptionB || ''}"></td>
            <td><input type="text" id="e_C2_${rowIndex}" value="${item.OptionC || ''}"></td>
            <td><input type="text" id="e_D_${rowIndex}" value="${item.OptionD || ''}"></td>
            <td><input type="text" id="e_E_${rowIndex}" value="${item.OptionE || ''}"></td>`}
            <td><input type="text" id="e_Ans_${rowIndex}" value="${item.CorrectAnswer || ''}" style="width:60px;"></td>
            <td><input type="text" id="e_I_Q_${rowIndex}" value="${item.ImgURL || ''}" style="width:100px;" placeholder="URL"></td>
            <td style="white-space:nowrap;">
                <button class="action-btn btn-save-inline" onclick="saveEditedRow(${rowIndex}, 'qpool')" style="background:#10b981; color:#fff; font-weight:bold; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">✔ Kaydet</button>
                <button class="action-btn btn-cancel-inline" onclick="cancelEdit(${rowIndex}, 'qpool')" style="background:#ef4444; color:#fff; font-weight:bold; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; margin-left:4px;">✖ İptal</button>
            </td>
        `;
    } else {
        rowElem.innerHTML = `
            <td><input type="text" id="e_W_${rowIndex}" value="${item.Word || ''}" style="width:100%;"></td>
            <td><input type="text" id="e_Clue_W_${rowIndex}" value="${item.Clue || ''}"></td>
            <td><input type="text" id="e_MTR_${rowIndex}" value="${item.MeaningTR || ''}"></td>
            <td><input type="text" id="e_MEN_${rowIndex}" value="${item.MeaningEN || ''}"></td>
            <td><input type="text" id="e_I_${rowIndex}" value="${item.ImgURL || ''}"></td>
            <td style="white-space:nowrap;">
                <button class="action-btn btn-save-inline" onclick="saveEditedRow(${rowIndex}, 'wordspool')" style="background:#10b981; color:#fff; font-weight:bold; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">✔ Kaydet</button>
                <button class="action-btn btn-cancel-inline" onclick="cancelEdit(${rowIndex}, 'wordspool')" style="background:#ef4444; color:#fff; font-weight:bold; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; margin-left:4px;">✖ İptal</button>
            </td>
        `;
    }
};

window.cancelEdit = function (rowIndex, type) {
    renderCrudTable(currentSetData.Data, type);
};

// --- DÜZENLEME (UPDATE) KAYDET ---
window.saveEditedRow = function (rowIndex, type) {
    if (!currentSetId || !currentSetData) return;

    let updatedObj = { ...currentSetData.Data[rowIndex] };
    if (type === 'qpool') {
        let isAcikUclu = currentSetData.SubType === 'acik_uclu';
        updatedObj = {
            ...updatedObj,
            QNumber: document.getElementById('e_Qn_' + rowIndex).value.trim(),
            QuestionText: document.getElementById('e_Qt_' + rowIndex).value.trim(),
            Clue: document.getElementById('e_Clue_' + rowIndex).value.trim(),
            CorrectAnswer: document.getElementById('e_Ans_' + rowIndex).value.trim(),
            ImgURL: document.getElementById('e_I_Q_' + rowIndex).value.trim()
        };
        if (!isAcikUclu) {
            updatedObj.OptionA = document.getElementById('e_A_' + rowIndex).value.trim();
            updatedObj.OptionB = document.getElementById('e_B_' + rowIndex).value.trim();
            updatedObj.OptionC = document.getElementById('e_C2_' + rowIndex).value.trim();
            updatedObj.OptionD = document.getElementById('e_D_' + rowIndex).value.trim();
            updatedObj.OptionE = document.getElementById('e_E_' + rowIndex).value.trim();
        } else {
            updatedObj.OptionA = "";
            updatedObj.OptionB = "";
            updatedObj.OptionC = "";
            updatedObj.OptionD = "";
            updatedObj.OptionE = "";
        }
    } else {
        updatedObj = {
            ...updatedObj,
            Word: document.getElementById('e_W_' + rowIndex).value.trim(),
            Clue: document.getElementById('e_Clue_W_' + rowIndex).value.trim(),
            MeaningTR: document.getElementById('e_MTR_' + rowIndex) ? document.getElementById('e_MTR_' + rowIndex).value.trim() : "",
            MeaningEN: document.getElementById('e_MEN_' + rowIndex) ? document.getElementById('e_MEN_' + rowIndex).value.trim() : "",
            ImgURL: document.getElementById('e_I_' + rowIndex).value.trim()
        };
    }

    database.ref('MasterPool/' + currentSetId + '/Data/' + rowIndex).update(updatedObj)
        .then(() => {
            currentSetData.Data[rowIndex] = Object.assign(currentSetData.Data[rowIndex], updatedObj);
            renderCrudTable(currentSetData.Data, type);
            showMessage('Düzenleme başarıyla kaydedildi!', 'success');
        })
        .catch(err => showMessage('Düzenleme hatası: ' + err.message, 'error'));
};
// ==========================================
// 8. TEKİL VERİ EKLEME (CREATE SINGLE) VE SET SİLME
// ==========================================

let newRowCounter = 0;

function renderSingleAddRow(type) {
    newRowCounter++;
    const rowDiv = document.createElement('div');
    rowDiv.className = 'add-row-item';
    rowDiv.style.display = 'grid';
    rowDiv.style.gap = '5px';
    rowDiv.style.alignItems = 'start';
    rowDiv.style.backgroundColor = '#f8fafc';
    rowDiv.style.padding = '5px 10px';
    rowDiv.style.border = '1px solid #e2e8f0';
    rowDiv.style.borderRadius = '5px';

    if (type === 'qpool') {
        let isAcikUclu = currentSetData && currentSetData.SubType === 'acik_uclu';
        if (isAcikUclu) {
            rowDiv.style.gridTemplateColumns = "30px 60px 2fr 1.5fr 100px 100px";
        } else {
            rowDiv.style.gridTemplateColumns = "30px 45px 1.5fr 1fr 50px 50px 50px 50px 50px 40px 70px";
        }
    } else {
        rowDiv.style.gridTemplateColumns = "30px 120px 1.5fr 1.5fr 1fr 1fr 150px";
    }

    // Silme Butonu (-)
    const delBtn = document.createElement('button');
    delBtn.innerHTML = '➖';
    delBtn.title = 'Satırı Sil';
    delBtn.style.background = '#ef4444';
    delBtn.style.color = 'white';
    delBtn.style.border = 'none';
    delBtn.style.borderRadius = '4px';
    delBtn.style.padding = '5px 0';
    delBtn.style.fontSize = '12px';
    delBtn.style.cursor = 'pointer';
    delBtn.style.height = '34px'; // input'larla aynı boyda olsun
    delBtn.onclick = () => rowDiv.remove();

    if (type === 'qpool') {
        let isAcikUclu = currentSetData && currentSetData.SubType === 'acik_uclu';
        rowDiv.innerHTML = `
            <input type="number" class="n_QNum" placeholder="1" style="width:100%; padding:5px; border:1px solid #ccc; border-radius:3px;">
            <textarea class="n_QText" rows="1" placeholder="Soru metni..." style="width:100%; padding:5px; border:1px solid #ccc; border-radius:3px; resize:vertical; min-height:34px;"></textarea>
            <input type="text" class="n_Clue" placeholder="İpucu veya Resim URL" style="width:100%; padding:5px; border:1px solid #ccc; border-radius:3px;">
            ${isAcikUclu ? '' : `
            <input type="text" class="n_A" placeholder="A" style="width:100%; padding:5px; border:1px solid #ccc; border-radius:3px;">
            <input type="text" class="n_B" placeholder="B" style="width:100%; padding:5px; border:1px solid #ccc; border-radius:3px;">
            <input type="text" class="n_C" placeholder="C" style="width:100%; padding:5px; border:1px solid #ccc; border-radius:3px;">
            <input type="text" class="n_D" placeholder="D" style="width:100%; padding:5px; border:1px solid #ccc; border-radius:3px;">
            <input type="text" class="n_E" placeholder="E" style="width:100%; padding:5px; border:1px solid #ccc; border-radius:3px;">`}
            <input type="text" class="n_Ans" ${isAcikUclu ? '' : 'maxlength="1"'} style="width:100%; padding:5px; font-weight:bold; color:#10b981; text-align:center; border:1px solid #ccc; border-radius:3px;" placeholder="${isAcikUclu ? 'Doğru Cevabı Yazın' : 'A'}">
            <input type="text" class="n_ImgURL" placeholder="URL" style="width:100%; padding:5px; border:1px solid #ccc; border-radius:3px;">
        `;
    } else {
        rowDiv.innerHTML = `
            <input type="text" class="n_Word" placeholder="Apple" style="font-weight:bold; width:100%; padding:5px; border:1px solid #ccc; border-radius:3px;">
            <input type="text" class="n_Clue" placeholder="Elma" style="width:100%; padding:5px; border:1px solid #ccc; border-radius:3px;">
            <input type="text" class="n_MeaningTR" placeholder="Elma" style="width:100%; padding:5px; border:1px solid #ccc; border-radius:3px;">
            <input type="text" class="n_MeaningEN" placeholder="Apple" style="width:100%; padding:5px; border:1px solid #ccc; border-radius:3px;">
            <input type="text" class="n_ImgURL" placeholder="URL" style="width:100%; padding:5px; border:1px solid #ccc; border-radius:3px;">
        `;
    }

    rowDiv.prepend(delBtn);

    dynamicInputsContainer.appendChild(rowDiv);
}

function renderCrudAddForm(type) {
    if (!dynamicInputsContainer || !dynamicInputsHeader) return;

    dynamicInputsContainer.innerHTML = '';

    // Add helper text for Clue (İpucu) Image URL capability
    const helperText = document.createElement('p');
    helperText.style.cssText = "font-size:12px; color:#9c27b0; margin-bottom:10px; font-weight:bold;";
    helperText.innerHTML = "💡 İpucu: 'İpucu' veya 'Resim URL' kutularına doğrudan görsel linki (http...jpg/png) yapıştırabilirsiniz. Oyun esnasında tıklanabilir görsel eklenecektir.";
    dynamicInputsContainer.appendChild(helperText);

    // Header (Sütun Başlıkları) Oluşturma
    if (type === 'qpool') {
        let isAcikUclu = currentSetData && currentSetData.SubType === 'acik_uclu';
        dynamicInputsHeader.innerHTML = `
            <div></div>
            <div>No <span style="color:red">*</span></div>
            <div>Soru Metni <span style="color:red">*</span></div>
            <div>İpucu</div>
            ${isAcikUclu ? '' : `
            <div>A Şıkkı <span style="color:red">*</span></div>
            <div>B Şıkkı <span style="color:red">*</span></div>
            <div>C Şıkkı <span style="color:red">*</span></div>
            <div>D Şıkkı <span style="color:red">*</span></div>
            <div>E (Lise)</div>`}
            <div>Cevap <span style="color:red">*</span></div>
            <div>Görsel URL</div>
        `;
        dynamicInputsHeader.style.display = "grid";
        if (isAcikUclu) {
            dynamicInputsHeader.style.gridTemplateColumns = "30px 60px 2fr 1.5fr 100px 100px";
        } else {
            dynamicInputsHeader.style.gridTemplateColumns = "30px 45px 1.5fr 1fr 50px 50px 50px 50px 50px 40px 70px";
        }
        dynamicInputsHeader.style.gap = "5px";
    } else {
        dynamicInputsHeader.innerHTML = `
            <div></div>
            <div>Kelime <span style="color:red">*</span></div>
            <div>İpucu</div>
            <div>Türkçe A.</div>
            <div>İngilizce A.</div>
            <div>Görsel URL</div>
        `;
        dynamicInputsHeader.style.display = "grid";
        dynamicInputsHeader.style.gridTemplateColumns = "30px 120px 1.5fr 1.5fr 1fr 1fr 150px";
        dynamicInputsHeader.style.gap = "5px";
    }

    newRowCounter = 0;
    renderSingleAddRow(type); // Varsayılan olarak 1 satırla başlat
}

if (addRowBtn) {
    addRowBtn.addEventListener('click', () => {
        if (currentSetData) renderSingleAddRow(currentSetData.Type);
    });
}

// YENİ ÖĞELERİ TOPLU KAYDET BUTONU TIKLANDIĞINDA
if (crudAddNewItemBtn) {
    crudAddNewItemBtn.addEventListener('click', () => {
        if (!currentSetData) return; // YENİ SET KAYDINDA setId henüz null'dur, engelleme!
        let type = currentSetData.Type;
        let rows = document.querySelectorAll('.add-row-item');
        if (rows.length === 0) return showOzelAlert("Lütfen en az bir satır ekleyin.", "hata");

        let newObjects = [];
        let hasError = false;

        rows.forEach((row, index) => {
            if (hasError) return;

            if (type === 'qpool') {
                let isAcikUclu = currentSetData && currentSetData.SubType === 'acik_uclu';
                const level = currentSetData.GlobalLevel || "Genel"; // Ekranda yok, Object'ten al
                const cg = currentSetData.GlobalClass || "Tümü";
                const ls = currentSetData.GlobalLesson || "Genel";
                const tp = currentSetData.GlobalTopic || "Genel";
                const qn = row.querySelector('.n_QNum').value.trim();
                const qt = row.querySelector('.n_QText').value.trim();
                const clue = row.querySelector('.n_Clue') ? row.querySelector('.n_Clue').value.trim() : "";
                const ansRaw = row.querySelector('.n_Ans').value.trim();
                const ans = isAcikUclu ? ansRaw : ansRaw.toUpperCase();

                if (!qn || (!qt && !row.querySelector('.n_ImgURL').value.trim()) || !ans) {
                    showOzelAlert(`Hata: Satır ${index + 1}'de '*' işaretli tüm alanları doldurun. (Soru Metni veya URL şart)`, "hata");
                    hasError = true; return;
                }
                if (!isAcikUclu && !['A', 'B', 'C', 'D', 'E'].includes(ans)) {
                    showOzelAlert(`Hata: Satır ${index + 1}'de Doğru cevap A, B, C, D veya E olmalıdır.`, "hata");
                    hasError = true; return;
                }

                newObjects.push({
                    Level: level, ClassGrade: cg, Lesson: ls, Topic: tp, QNumber: qn,
                    QuestionText: qt, Clue: clue, ImgURL: row.querySelector('.n_ImgURL').value.trim(),
                    OptionA: isAcikUclu ? "" : row.querySelector('.n_A').value.trim(),
                    OptionB: isAcikUclu ? "" : row.querySelector('.n_B').value.trim(),
                    OptionC: isAcikUclu ? "" : row.querySelector('.n_C').value.trim(),
                    OptionD: isAcikUclu ? "" : row.querySelector('.n_D').value.trim(),
                    OptionE: isAcikUclu ? "" : row.querySelector('.n_E').value.trim(),
                    CorrectAnswer: ans
                });
            } else {
                const level = currentSetData.GlobalLevel || "Genel";
                const cg = currentSetData.GlobalClass || "Tümü";
                const ls = currentSetData.GlobalLesson || "Genel";
                const un = currentSetData.GlobalTopic || "Genel";
                const word = row.querySelector('.n_Word').value.trim();

                if (!word) {
                    showOzelAlert(`Hata: Satır ${index + 1}'de '*' işaretli alanları doldurun. (Kelime şart)`, "hata");
                    hasError = true; return;
                }

                newObjects.push({
                    Level: level, ClassGrade: cg, Lesson: ls, Unit: un, Word: word,
                    Clue: row.querySelector('.n_Clue').value.trim(),
                    MeaningTR: row.querySelector('.n_MeaningTR').value.trim(),
                    MeaningEN: row.querySelector('.n_MeaningEN').value.trim(),
                    ImgURL: row.querySelector('.n_ImgURL').value.trim()
                });
            }
        });

        if (hasError) return;

        if (currentSetId === null) {
            // YENİ SET KAYIT MODU
            if (newObjects.length < 5) {
                return showOzelAlert("Yeni bir set oluştururken form üzerinden en az 5 adet kayıt girmelisiniz.", "hata");
            }

            const newSetRef = database.ref('MasterPool').push();
            const setData = {
                Author_ID: currentUser.uid,
                Author_Email: currentUser.email,
                Title: currentSetData.Title,
                Type: type,
                IsPublic: currentSetData.IsPublic,
                ItemCount: newObjects.length,
                CreatedAt: firebase.database.ServerValue.TIMESTAMP,
                Data: newObjects
            };

            newSetRef.set(setData).then(() => {
                showMessage(`Başarılı! '${setData.Title}' adlı setiniz oluşturuldu ve kaydedildi.`, "success");

                // Formu kapat ve ana ekrana dön
                if (crudModal) crudModal.classList.remove('active');
                currentSetData = null;

                // Akordiyonun güncellenmesi ve açık kalması için
                loadMySets();

            }).catch(error => {
                showMessage("Kayıt hatası: " + error.message, "error");
            });

        } else {
            // MEVCUT SETE EKLEME MODU
            if (!currentSetData.Data) currentSetData.Data = [];
            let startIndex = currentSetData.Data.length;

            // Multi-Update object hazırlama
            let updates = {};
            newObjects.forEach((obj, i) => {
                updates['MasterPool/' + currentSetId + '/Data/' + (startIndex + i)] = obj;
                currentSetData.Data[startIndex + i] = obj;
            });

            // ItemCount güncellemesi
            let newCount = currentSetData.Data.filter(x => x !== null).length;
            updates['MasterPool/' + currentSetId + '/ItemCount'] = newCount;

            database.ref().update(updates).then(() => {
                showMessage(`Başarılı! Setinize ${newObjects.length} adet yeni öge topluca eklendi.`, "success");
                renderCrudTable(currentSetData.Data, currentSetData.Type);
                renderCrudAddForm(currentSetData.Type); // Formu sıfırla
                loadMySets();
            }).catch(err => showMessage("Eklenirken hata oluştu: " + err.message, "error"));
        }
    });
}

// TÜM SETİ ÇÖPE ATMA
if (deleteEntireSetBtn) {
    deleteEntireSetBtn.addEventListener('click', () => {
        if (!currentSetId) return;
        showOzelAlert('DİKKAT! Bu seti KÖKTEN silmek üzeresiniz. Sette Bulunan Tüm Verileriniz Kaybolacak ve Lobiden Silinecektir. Onaylıyor musunuz?', 'evethayir', (isConfirmed) => {
            if (isConfirmed) {
                database.ref('MasterPool/' + currentSetId).remove().then(() => {
                    showMessage('Set veritabanından başarıyla uçuruldu.', 'success');
                    if (crudModal) crudModal.classList.remove('active');
                    loadMySets(); // Ekrandan kaldır
                }).catch(err => showMessage('Silinemedi: ' + err.message, 'error'));
            }
        });
    });
}


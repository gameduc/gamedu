// ==========================================
// 4. AUTHENTICATION (KAYIT & GİRİŞ) İŞLEMLERİ
// ==========================================
if (isFirebaseInitialized) {
    // Auth Durumu Dinleyicisi (Kullanıcı sekme kapatıp açsa da giriş yapmış sayılır)
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            updateUI();
        } else {
            currentUser = null;
            updateUI();
        }
    });

    // Kayıt Ol
    registerBtn.addEventListener('click', () => {
        const usernameInput = document.getElementById('usernameInput');
        const username = usernameInput ? usernameInput.value.trim() : "";
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password || !username) {
            if (typeof showOzelAlert === 'function') {
                showOzelAlert("Lütfen Kullanıcı Adı, E-posta ve şifre girin.", "tamam");
            } else {
                showMessage("Lütfen Kullanıcı Adı, E-posta ve şifre girin.", "error");
            }
            return;
        }

        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                return userCredential.user.updateProfile({
                    displayName: username
                }).then(() => {
                    if (typeof showOzelAlert === 'function') {
                        showOzelAlert("Kayıt başarılı! Öğretmen Paneline yönlendiriliyorsunuz.", "tamam", () => {
                            if (window.handleNavTeacherBtn) window.handleNavTeacherBtn();
                        });
                    } else {
                        showMessage("Kayıt başarılı! Öğretmen Paneline yönlendiriliyorsunuz.");
                        if (window.handleNavTeacherBtn) window.handleNavTeacherBtn();
                    }
                });
            })
            .catch((error) => {
                if (typeof showOzelAlert === 'function') {
                    showOzelAlert("Kayıt Hatası: " + error.message, "tamam");
                } else {
                    showMessage("Kayıt Hatası: " + error.message, "error");
                }
            });
    });

    // Giriş Yap
    loginBtn.addEventListener('click', () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        if (!email || !password) return showMessage("Lütfen E-posta ve şifre girin.", "error");

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                showMessage("Giriş başarılı!");
                if (window.handleNavTeacherBtn) window.handleNavTeacherBtn();
            })
            .catch((error) => {
                showMessage("Giriş Hatası: Bilgilerinizi kontrol ediniz.", "error");
            });
    });

    // Şifremi Unuttum
    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();
            if (!email) {
                if (typeof showOzelAlert === 'function') {
                    showOzelAlert("Lütfen şifre sıfırlama bağlantısı göndermek için E-posta adresinizi girin.", "tamam");
                } else {
                    showMessage("Lütfen şifre sıfırlama bağlantısı göndermek için E-posta adresinizi girin.", "error");
                }
                return;
            }

            auth.sendPasswordResetEmail(email)
                .then(() => {
                    if (typeof showOzelAlert === 'function') {
                        showOzelAlert("Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin.", "tamam");
                    } else {
                        showMessage("Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.", "success");
                    }
                })
                .catch((error) => {
                    if (typeof showOzelAlert === 'function') {
                        showOzelAlert("Hata: " + error.message, "tamam");
                    } else {
                        showMessage("Hata: " + error.message, "error");
                    }
                });
        });
    }

    // Çıkış Yap
    const performLogout = () => {
        auth.signOut().then(() => {
            showMessage("Güvenli bir şekilde çıkış yapıldı.");
            const profileModal = document.getElementById('profileModal');
            if (profileModal) profileModal.classList.remove('active');
        });
    };

    if (logoutBtn) logoutBtn.addEventListener('click', performLogout);
    
    // Modal içindeki Çıkış butonu
    const modalLogoutBtn = document.getElementById('modalLogoutBtn');
    if (modalLogoutBtn) modalLogoutBtn.addEventListener('click', performLogout);

    // Modal içindeki İsim Değiştirme butonu
    const saveNicknameBtn = document.getElementById('saveNicknameBtn');
    if (saveNicknameBtn) {
        saveNicknameBtn.addEventListener('click', () => {
            if (window.updateProfileNickname) window.updateProfileNickname();
        });
    }

    // Admin Migration İşlemleri
    const adminMigrateBtn = document.getElementById('adminMigrateBtn');
    const migrationModal = document.getElementById('migrationModal');
    const migStartBtn = document.getElementById('migStartBtn');

    if (adminMigrateBtn && migrationModal) {
        adminMigrateBtn.addEventListener('click', () => {
            migrationModal.style.display = 'flex';
            document.getElementById('migLog').innerHTML = '';
            document.getElementById('migData').value = '';
        });

        if (migStartBtn) {
            migStartBtn.addEventListener('click', () => {
                const migType = document.getElementById('migType').value;
                const migData = document.getElementById('migData').value.trim();
                const logEl = document.getElementById('migLog');

                if (!migData) {
                    if (typeof showOzelAlert === 'function') showOzelAlert("Veri alanı boş!", "tamam");
                    return;
                }

                logEl.innerHTML += `<br>> Aktarım işlemi başlatıldı (${migType})...`;

                let baseType = migType === 'wordspool' ? 'wordspool' : 'qpool';
                let subType = 'coktan_secmeli';
                if (migType === 'qpool_klasik') subType = 'acik_uclu';

                const parseResult = parseHibritData(migData, baseType, subType);

                if (parseResult.errors.length > 0) {
                    logEl.innerHTML += `<br>> <span style="color:#ef4444;">PARSE HATALARI BULUNDU (${parseResult.errors.length} adet). Hatalı satırlar atlanacak.</span>`;
                }

                const dataList = parseResult.data;
                if (dataList.length === 0) {
                    logEl.innerHTML += `<br>> <span style="color:#ef4444;">Elde edilen geçerli veri yok. İşlem iptal edildi.</span>`;
                    return;
                }

                logEl.innerHTML += `<br>> ${dataList.length} adet satır okundu. Gruplama yapılıyor...`;

                // Kademe - Ders gruplaması
                let groups = {};
                dataList.forEach(item => {
                    let groupLvl = item.Level ? item.Level.toUpperCase() : 'Diğer';
                    let groupLes = item.Lesson ? item.Lesson : 'Genel';
                    let key = `${groupLvl} - ${groupLes}`;
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(item);
                });

                logEl.innerHTML += `<br>> Toplam ${Object.keys(groups).length} farklı Kademe-Ders tespit edildi. Firebase'e yazılıyor...`;

                let promises = [];
                Object.keys(groups).forEach(groupKey => {
                    const setArray = groups[groupKey];
                    const title = `GamEdu: ${groupKey}`;

                    const newSetRef = database.ref('MasterPool').push();
                    const setData = {
                        Author_ID: currentUser.uid,
                        Author_Email: currentUser.email,
                        Author_DisplayName: 'GamEdu',
                        Title: title,
                        Type: baseType,
                        SubType: subType,
                        IsPublic: true,
                        ItemCount: setArray.length,
                        CreatedAt: firebase.database.ServerValue.TIMESTAMP,
                        Data: setArray
                    };

                    promises.push(newSetRef.set(setData));
                });

                Promise.all(promises).then(() => {
                    logEl.innerHTML += `<br>> <span style="color:#10b981;">Tüm gruplar GamEdu Global veritabanına aktarıldı!</span>`;
                    showMessage("Aktarım Başarılı!", "success");
                    if (typeof loadGlobalSets === 'function') loadGlobalSets();
                    if (typeof loadMySets === 'function') loadMySets();
                }).catch(err => {
                    logEl.innerHTML += `<br>> <span style="color:#ef4444;">HATA: ${err.message}</span>`;
                });
            });
        }
    }
}

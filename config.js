const AppConfig = {
    appName: "Eğitim Oyunları Portalı",
    version: "1.0.0",

    // Google Apps Script API Endpoint'imiz (Faz 1 - Step 3'te JSON döndürecek şekilde güncellenecek)
    // Şimdilik boş bırakıyoruz, Apps Script'te API mode kurgulandığında url buraya girecek.
    apiBaseUrl: "https://script.google.com/macros/s/AKfycbwbrcrVDl-VrS-dKW-ILkZUa-pu9o2a1wpD1bxwlMsqq07xVWB_HJFU2ZjoP7VuyzwPyA/exec",

    // Desteklenen Oyun Modülleri Kataloğu
    // İleride bu liste Apps Script'ten dinamik de çekilebilir veya burada sabit tutulabilir
    games: [
        {
            id: "bang",
            name: "Bang!",
            description: "Hızlı cevap veren puanı kapar. Rekabet dolu bilgi yarışması.",
            configSheet: "Bang_Config",
            themeColor: "#ef4444",
            imageUrl: "./game pics/bang.jpg",
            isExternal: false
        },
        {
            id: "lingo",
            name: "Lingo",
            description: "Kelimeleri zihninde döndür, en hızlı tahmini yap.",
            redirectUrl: "https://script.google.com/macros/s/AKfycbwYy_zM8K4-aLgHw0YdD3J3yA0w5A7G9M8T5Q0H1_yZ7aG8O_m4G4Q7QyV1_L3H0_w/exec",
            themeColor: "#f59e0b",
            imageUrl: "./game pics/lingo.jpg",
            isExternal: true
        },
        {
            id: "beecomb",
            name: "BeeComb",
            description: "Petekleri doldurarak alanını genişlet, sınıfın kazananı ol.",
            redirectUrl: "https://script.google.com/macros/s/AKfycbycydK8k7j_i7vT8n7j9tV7g4K0m5v8y1V8b7K9j9v7t1b7i9j8K4m5/exec",
            themeColor: "#10b981",
            imageUrl: "./game pics/beecomb.jpg",
            isExternal: true
        }
    ],

    // UI Ayarları
    ui: {
        theme: "dark", // dark / light
        primaryColor: "#3b82f6"
    }
};

// Eğer ES Module yapısı kullanılacaksa:
// export default AppConfig;

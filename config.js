const AppConfig = {
    appName: "GamEdu - Eğitim Oyunları",
    version: "2.0.0",

    // Google Apps Script API Endpoint'imiz (Faz 1 - Step 3'te JSON döndürecek şekilde güncellenecek)
    // Şimdilik boş bırakıyoruz, Apps Script'te API mode kurgulandığında url buraya girecek.
    apiBaseUrl: "https://script.google.com/macros/s/AKfycbwbrcrVDl-VrS-dKW-ILkZUa-pu9o2a1wpD1bxwlMsqq07xVWB_HJFU2ZjoP7VuyzwPyA/exec",

    // Desteklenen Oyun Modülleri Kataloğu
    // İleride bu liste Apps Script'ten dinamik de çekilebilir veya burada sabit tutulabilir
    games: [
        {
            id: "bang",
            name: "Bang!",
            description: "Belirlenen puana ulaşan takımın kelimenin türkçe karşılığı ile cevap verip puanı kaptığı, rekabet dolu bir oyun. Hedefe ulaşmak kolay değil. Bang! ve diğer tuzaklar seni bekliyor.",
            configSheet: "Bang_Config",
            themeColor: "#ef4444",
            imageUrl: "./game pics/bang.jpg",
            isExternal: false
        },
        {
            id: "lingo",
            name: "Lingo",
            description: "Gizli kelimeyi 6 hakta bul! 7'ye bırakırsan puanı rakip takım çalar.",
            configSheet: "Lingo_Config",
            themeColor: "#10b981",
            imageUrl: "./game pics/lingo.jpg",
            isExternal: false
        },
        {
            id: "beecomb",
            name: "BeeComb",
            description: "Sorulara en hızlı sen cevap ver, petekleri renklendir ve rakibinden önce yolu tamamla.",
            configSheet: "BeeComb_Config",
            themeColor: "#f59e0b",
            imageUrl: "./game pics/beecomb.jpg",
            isExternal: false
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

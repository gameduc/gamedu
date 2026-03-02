const AppConfig = {
    appName: "GamEdu - Eğitim Oyunları",
    version: "3.0.0",

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
            isExternal: false,
            howToPlay: "<b>BANG! Oyunu Nasıl Oynanır?</b><br><br>• <b>Tanım:</b> Belirlenen puana ulaşan takımın kelimenin türkçe karşılığı ile cevap verip puanı kaptığı, rekabet dolu bir oyun. Hedefe ulaşmak kolay değil. Bang! ve diğer tuzaklar seni bekliyor.<br>• <b>Nasıl Oynanır:</b><br>- İlk kelime A grubunun ilk oyuncusu içindir. Tek cevap verme hakkı vardır. Bilirse puan alır (+ tuşuna basılır).<br>- Bilemezse B grubuna söz hakkı geçer ve ilk oyuncusu tek cevap hakkını kullanır. O da bilemezse kelimenin anlamı bilen birinden alınır/söylenir ancak puan verilmez. Sonraki kelime butonu ile C grubunun ilk öğrencisine yeni kelime sorulur.<br>- Bilirse puan alır (+ tuşuna basılır). Bilemezse D grubuna söz hakkı geçer ve ilk oyuncusu tek cevap hakkını kullanır. O da bilemezse kelimenin anlamı bilen birinden alınır/söylenir ancak puan verilmez. Ve sıra A grubunun 2. oyuncusuna geçer. Bir grup bildikçe sıra o grupta devam eder.<br>- Bilememe durumunda üstteki açıklamaya göre bir sonraki gruba geçilir. Her kelime sadece 2 gruba sorulmuş olur. 3. de cevap söylenir ve diğer gruba yeni kelime getirilir.<br>- Sonraki kelime düğmesi bu mantıkla grup seçimini aktif grubun 2 fazlasına çeker. (A grubu aktif iken sonraki kelimeye basmak aktif grubu C yapar).<br>- Doğru bilen takım, sistemdeki [+] butonuna basılarak 1 puan kazanır (Böylece sıradaki kelimeye geçilir).<br>- Bir kelime 2. defa çıktığında Yanlış cevap verilirse veya pas geçilirse [-] butonuna basılır; hata yapan takımdan 1 puan düşülür. (Bir kelime 2. defa çıktığında Kırmızı renkli yazılarak gelir).<br>- Ekrana normal kelime yerine BANG! gibi özel aksiyon kartları gelirse [Aksiyon] butonuna basılarak oyunun sürprizi devreye sokulur.<br>  * <b>Bang!:</b> Çıkan grubun puanı sıfırlanır ve sıra bir sonraki gruba geçer.<br>  * <b>Give +1 left/right:</b> Grubun solundaki veya sağındaki gruba kendinden bir puan gider. Sıra mevcut grupta sonraki oyuncu ile devam eder.<br>  * <b>Take +1 left/right:</b> Aktif grubun solundaki veya sağındaki gruptan bir puan alınır. Sıra mevcut grupta sonraki oyuncu ile devam eder.<br><br>• <b>Kazanma Şartı:</b> Kurulumda belirlenen hedef puana ulaşan ilk takım oyunu kazanır."
        },
        {
            id: "lingo",
            name: "Lingo",
            description: "Gizli kelimeyi 6 hakta bul! 7'ye bırakırsan puanı rakip takım çalar.",
            configSheet: "Lingo_Config",
            themeColor: "#10b981",
            imageUrl: "./game pics/lingo.jpg",
            isExternal: false,
            howToPlay: "<b>LINGO Nasıl Oynanır?</b><br><br>• <b>Tanım:</b> Gizli kelimeyi 6 hakta bul! 7'ye bırakırsan puanı rakip takım çalar.<br>• <b>Nasıl Oynanır:</b><br>- Oyun başladığında harf sayısı kadar boş kutu belirir ve kelimenin ilk harfi yeşil renkli olarak ipucu verilir.<br>- Sırası gelen takım, süre bitmeden bir kelime tahmini yapar ve gönderir.<br>- Tahmin edilen harf kelimenin içinde var ve DEĞERİ yeri doğruysa <b>YEŞİL</b>, kelimenin içinde var fakat YANLIŞ yerde ise <b>SARI</b>, kelimede HİÇ YOKSA <b>KOYU GRİ</b> renk alır.<br>- Takımın toplam 6 tahminde bulunma hakkı vardır.<br>- Eğer 6 hakkında kelimeyi bulamazsa, kelime tahmin sırası yanar ve 7. hak (son kırmızı satır - stealing hakkı) olarak rakip takıma geçer. Rakip takım sadece 1 kez tahmin edip puanı çalma şansı yakalar."
        },
        {
            id: "beecomb",
            name: "BeeComb",
            description: "Sorulara en hızlı sen cevap ver, petekleri renklendir ve rakibinden önce yolu tamamla.",
            configSheet: "BeeComb_Config",
            themeColor: "#f59e0b",
            imageUrl: "./game pics/beecomb.jpg",
            isExternal: false,
            howToPlay: "<b>BEECOMB (Bal Peteği) Nasıl Oynanır?</b><br><br>• <b>Tanım:</b> Sorulara en hızlı sen cevap ver, petekleri renklendir ve rakibinden önce yolu tamamla.<br>• <b>Nasıl Oynanır:</b><br>- İki farklı takımın (Yeşil ve Mavi) bulunduğu, ortasında peteklerden oluşan bir savaş alanı vardır.<br>- Soru ekrana yansıtıldığında en hızlı olan (sesle/el ile) söz hakkı kazanır ve soruyu cevaplamaya çalışır.<br>- Cevap seçilen harfle başlar. ( \"A\" seçilmişse Hangi A Türkiye'nin başkentidir? sorusu gibi veya WordsPool'dan özel soru olarak).<br>- Eğer doğru yanıt verirse, oyun tahtasında istediği stratejik bir peteği (harfi) kendi rengine (Yeşil veya Mavi) boyatmayı hak eyler.<br>- <b>Amaç:</b> Petekleri yanyana bağlayarak tahtanın diğer ucuna kadar kesintisiz bir yol (algoritma bazlı bir köprü) kurmaktır.<br><br>• <b>Kazanma Şartı:</b> Yolu rakibine fırsat vermeden kuran takım, zafer animasyonu eşliğinde maçı kazanır."
        },
        {
            id: "quickreveal",
            name: "QuickReveal",
            description: "Saatler, Sayılar, İşlemler ve Resimler... Dev ekranda soruyu gör ve en hızlı sen cevapla!",
            configSheet: "QuickReveal_Config",
            themeColor: "#8b5cf6",
            imageUrl: "./game pics/quickreveal.jpg",
            isExternal: false,
            howToPlay: "<b>QUICK REVEAL Nasıl Oynanır?</b><br><br>• <b>Tanım:</b> Saatler, Sayılar, İşlemler, Düzensiz Fiiller ve Resimli Kelimeler... Dev ekranda soruyu gör ve ilk sen cevapla! Sınıfın hızını ve reflekslerini test eden oyun modu.<br>• <b>Nasıl Oynanır ve Ayarlar:</b><br>- Lobi ekranından \"QuickReveal\" seçildiğinde Ana Kategori (Meyveler, Vücut Bölümleri, Hastalıklar, Sayılar, İşlemler vb.) listeden seçilir.<br>- <b>Kendi Setini Oluştur:</b> Kurulum ekranındaki buton ile öğretmenin kendi oluşturduğu \"Kelime | Resim Linki\" listesini doğrudan oyuna aktarması sağlanır.<br>- Oyun başladığında dev ekranda şifreli bir cam/piksel tabaka belirir. Siz <b>Space (Boşluk)</b> tuşuna basılı tuttukça bu piksel camlar erir ve ardındaki resim/soru belirginleşmeye başlar.<br>- Takımlar kelimenin karşılığını veya tahtaya yazılışını öğretmenin belirlediği şekilde cevaplar. Kartın üzerine tıklanarak \"İngilizce Kelime/Cevap\" arkasını çevirme animasyonuyla ekranda belirir.<br>- <b>Puanlama:</b> Ekranda Bang oyunundaki gibi grup kutuları bulunur. Her kutunun yanında bir onay kutusu (Checkbox) vardır. Öğretmen doğru cevap veren grup(ların) yanındaki kutuları işaretleyip <b>[+]</b> butonuna bastığında, seçili tüm gruplara aynı anda 1 puan eklenir. Eksi puan yoktur. Puan eklendiğinde onay kutuları otomatik sıfırlanır ve \"Sıradaki Kelime\" ekrana gelir.<br><br>• <b>Kazanma Şartı:</b> Kurulum ekranında belirlenen hedef puana ulaşan grup oyunu kazanır."
        },
        {
            id: "baamboo",
            name: "BaamBoo",
            description: "24 şans kutusu, özel numaralar ve devasa soru ekranı! Magnet miknatısıyla puanları çal, Swap ile yarışmayı alt üst et.",
            configSheet: "Baamboo_Config",
            themeColor: "#06b6d4",
            imageUrl: "./game pics/baamboo.jpg",
            isExternal: false,
            howToPlay: "<b>BAAMBOO Nasıl Oynanır?</b><br><br>• <b>Tanım:</b> Tıpkı Bang! gibi öğretmenin başlattığı, arkasında özel puan ve aksiyon sürprizleri taşıyan 24 sayılık canlı bir kutu (petek) oyunu!<br>• <b>Nasıl Oynanır ve Ayarlar:</b><br>- Oyun A grubundan başlar. Ekranda 4x6 (24 adet) canlı turkuaz renkli, üstünde numaralar olan kutular vardır.<br>- Aktif grup bir sayı seçer ve o kutuya tıklanır. Kutunun içinden ya Soru (Klasik/Çoktan Seçmeli) ya da Aksiyon (GameInWords) çıkar.<br>- <b>Sorular (19 Adet):</b> Doğru yanıt veren gruba <b>[+]</b> butonu ile 15 Puan eklenir ve doğru cevap yeşil olarak gösterilir. Eğer süre biterse ya da yanlış cevap verilirse pas/eksi puan yoktur; öğretmen 'Cevap Göster'e basıp doğru yanıtı ekrana yansıtır ve sıra hiçbir puan değişikliği olmadan bir sonraki (Sağdaki) gruba geçer.<br>- <b>GameInWords (Aksiyonlar - 5 Adet):</b> (Aksiyon yönleri her zaman sağa doğrudur)<br>  1. <b>BAAM:</b> Tıklayan gruba anında +30 Puan verilir.<br>  2. <b>BOO:</b> Tıklayan gruptan anında -30 Puan düşülür.<br>  3. <b>MAGNET (Mıknatıs):</b> Aktif grup, sağındaki grubun tüm puanını alır. Sağdaki grubun puanı 0 (Sıfır) olur.<br>  4. <b>SWAP POINTS (Tahtravalli):</b> Aktif grup, sağındaki grupla puanlarını becayiş yapar (yer değiştirir).<br>  5. <b>+20:</b> Tıklayan gruba anında +20 Puan verilir.<br><br>• <b>Oyun Sonu / Kazanma Şartı:</b> Tüm kutular (1-24) açılıp kullanıldığında, en yüksek puanda olan grup oyunu kazanır."
        },
        {
            id: "dictionary",
            name: "DUEL OF DICTIONARIES",
            description: "Sözlükte kelimeyi ilk sen bul ve puanı kap! Süre yok, sadece hız ve bilgi yarışıyor.",
            configSheet: "Dictionary_Config",
            themeColor: "#ec4899", /* Pembe tonu */
            imageUrl: "./game pics/dictionary.jpg",
            isExternal: false,
            howToPlay: "<b>DUEL OF DICTIONARIES (Sözlük Bulmaca) Nasıl Oynanır?</b><br><br>• <b>Tanım:</b> Zaman limiti yoktur. Ekranda çok büyük puntolarla rastgele İngilizce kelimeler belirir. Öğrenciler kelimenin anlamını ilk bulan olmak için yarışırlar.<br>• <b>Nasıl Oynanır:</b><br>- Grupları ayar menüsünden A, B veya Özel İsimlerle isimlendirebilirsiniz.<br>- Öğretmen, ilk bulan grubun ekranındaki (3 Boyutlu) Skor Kutusuna doğrudan tıklayarak anında puan verir.<br>- Puan verildikten sonra sonraki kelimeye otomatik geçilir.<br><br>• <b>Kazanma Şartı:</b> Kurulum sırasında belirlediğiniz kazanma limitine ilk ulaşan grup olduğunda oyun durur; şampiyon ekrana yazdırılır."
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

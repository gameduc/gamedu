const QuickRevealEngine = (function () {
    let currentCategory = 'numbers';
    let currentSubcategory = 'cardinal';
    let mathOperations = ['Addition (+)'];
    let irregularOps = ['V2 (Past Form)', 'Meaning (Anlam)'];
    let minRange = 1;
    let maxRange = 100;
    let isFlipped = false;
    let numGroups = 4;
    let groupScores = {};

    // Saat Seçenekleri
    let timeType = 'digital'; // digital, analog, mixed

    // Düzensiz Fiiller Veritabanı
    const irregularVerbsData = [
        { v1: "be", v2: "was/were", v3: "been", mean: "olmak" },
        { v1: "bear", v2: "bore", v3: "borne/born", mean: "taşımak / dayanmak / doğurmak" },
        { v1: "beat", v2: "beat", v3: "beaten", mean: "vurmak / yenmek" },
        { v1: "become", v2: "became", v3: "become", mean: "olmak / haline gelmek" },
        { v1: "begin", v2: "began", v3: "begun", mean: "başlamak" },
        { v1: "bend", v2: "bent", v3: "bent", mean: "bükmek / eğmek" },
        { v1: "bet", v2: "bet", v3: "bet", mean: "bahse girmek" },
        { v1: "bite", v2: "bit", v3: "bitten", mean: "ısırmak" },
        { v1: "bleed", v2: "bled", v3: "bled", mean: "kanamak" },
        { v1: "blow", v2: "blew", v3: "blown", mean: "üflemek / esmek" },
        { v1: "break", v2: "broke", v3: "broken", mean: "kırmak" },
        { v1: "bring", v2: "brought", v3: "brought", mean: "getirmek" },
        { v1: "build", v2: "built", v3: "built", mean: "inşa etmek" },
        { v1: "burn", v2: "burnt/burned", v3: "burnt/burned", mean: "yanmak / yakmak" },
        { v1: "burst", v2: "burst", v3: "burst", mean: "patlamak" },
        { v1: "buy", v2: "bought", v3: "bought", mean: "satın almak" },
        { v1: "can", v2: "could", v3: "been able to", mean: "yapabilmek" },
        { v1: "catch", v2: "caught", v3: "caught", mean: "yakalamak" },
        { v1: "choose", v2: "chose", v3: "chosen", mean: "seçmek" },
        { v1: "come", v2: "came", v3: "come", mean: "gelmek" },
        { v1: "cost", v2: "cost", v3: "cost", mean: "mal olmak / değerinde olmak" },
        { v1: "cut", v2: "cut", v3: "cut", mean: "kesmek" },
        { v1: "deal", v2: "dealt", v3: "dealt", mean: "ilgilenmek / dağıtmak" },
        { v1: "dig", v2: "dug", v3: "dug", mean: "kazmak" },
        { v1: "do", v2: "did", v3: "done", mean: "yapmak" },
        { v1: "draw", v2: "drew", v3: "drawn", mean: "çizmek" },
        { v1: "dream", v2: "dreamt/dreamed", v3: "dreamt/dreamed", mean: "hayal kurmak / rüya görmek" },
        { v1: "drink", v2: "drank", v3: "drunk", mean: "içmek" },
        { v1: "drive", v2: "drove", v3: "driven", mean: "sürmek" },
        { v1: "eat", v2: "ate", v3: "eaten", mean: "yemek" },
        { v1: "fall", v2: "fell", v3: "fallen", mean: "düşmek" },
        { v1: "feed", v2: "fed", v3: "fed", mean: "beslemek" },
        { v1: "feel", v2: "felt", v3: "felt", mean: "hissetmek" },
        { v1: "fight", v2: "fought", v3: "fought", mean: "kavga etmek / savaşmak" },
        { v1: "find", v2: "found", v3: "found", mean: "bulmak" },
        { v1: "fly", v2: "flew", v3: "flown", mean: "uçmak" },
        { v1: "forbid", v2: "forbade", v3: "forbidden", mean: "yasaklamak" },
        { v1: "forget", v2: "forgot", v3: "forgotten", mean: "unutmak" },
        { v1: "forgive", v2: "forgave", v3: "forgiven", mean: "affetmek" },
        { v1: "freeze", v2: "froze", v3: "frozen", mean: "donmak / dondurmak" },
        { v1: "get", v2: "got", v3: "got/gotten", mean: "almak / elde etmek" },
        { v1: "give", v2: "gave", v3: "given", mean: "vermek" },
        { v1: "go", v2: "went", v3: "gone", mean: "gitmek" },
        { v1: "grow", v2: "grew", v3: "grown", mean: "büyümek / yetiştirmek" },
        { v1: "hang", v2: "hung", v3: "hung", mean: "asmak" },
        { v1: "have", v2: "had", v3: "had", mean: "sahip olmak" },
        { v1: "hear", v2: "heard", v3: "heard", mean: "duymak" },
        { v1: "hide", v2: "hid", v3: "hidden", mean: "saklamak" },
        { v1: "hit", v2: "hit", v3: "hit", mean: "vurmak" },
        { v1: "hold", v2: "held", v3: "held", mean: "tutmak" },
        { v1: "hurt", v2: "hurt", v3: "hurt", mean: "incitmek / acımak" },
        { v1: "keep", v2: "kept", v3: "kept", mean: "tutmak / saklamak" },
        { v1: "know", v2: "knew", v3: "known", mean: "bilmek" },
        { v1: "lay", v2: "laid", v3: "laid", mean: "sermek / yatırmak" },
        { v1: "lead", v2: "led", v3: "led", mean: "yönetmek / önderlik etmek" },
        { v1: "learn", v2: "learnt/learned", v3: "learnt/learned", mean: "öğrenmek" },
        { v1: "leave", v2: "left", v3: "left", mean: "ayrılmak / bırakmak" },
        { v1: "lend", v2: "lent", v3: "lent", mean: "ödünç vermek" },
        { v1: "let", v2: "let", v3: "let", mean: "izin vermek" },
        { v1: "lie", v2: "lay", v3: "lain", mean: "yalan söylemek / uzanmak" },
        { v1: "light", v2: "lit/lighted", v3: "lit/lighted", mean: "yakmak / aydınlatmak" },
        { v1: "lose", v2: "lost", v3: "lost", mean: "kaybetmek" },
        { v1: "make", v2: "made", v3: "made", mean: "yapmak" },
        { v1: "mean", v2: "meant", v3: "meant", mean: "anlamına gelmek" },
        { v1: "meet", v2: "met", v3: "met", mean: "tanışmak / buluşmak" },
        { v1: "pay", v2: "paid", v3: "paid", mean: "ödemek" },
        { v1: "put", v2: "put", v3: "put", mean: "koymak" },
        { v1: "read", v2: "read", v3: "read", mean: "okumak" },
        { v1: "ride", v2: "rode", v3: "ridden", mean: "binmek" },
        { v1: "ring", v2: "rang", v3: "rung", mean: "çalmak (zil/telefon)" },
        { v1: "rise", v2: "rose", v3: "risen", mean: "yükselmek" },
        { v1: "run", v2: "ran", v3: "run", mean: "koşmak" },
        { v1: "say", v2: "said", v3: "said", mean: "söylemek / demek" },
        { v1: "see", v2: "saw", v3: "seen", mean: "görmek" },
        { v1: "seek", v2: "sought", v3: "sought", mean: "aramak" },
        { v1: "sell", v2: "sold", v3: "sold", mean: "satmak" },
        { v1: "send", v2: "sent", v3: "sent", mean: "göndermek" },
        { v1: "set", v2: "set", v3: "set", mean: "kurmak / ayarlamak" },
        { v1: "shake", v2: "shook", v3: "shaken", mean: "sallamak" },
        { v1: "shine", v2: "shone", v3: "shone", mean: "parlamak" },
        { v1: "shoot", v2: "shot", v3: "shot", mean: "ateş etmek / şut çekmek" },
        { v1: "show", v2: "showed", v3: "shown/showed", mean: "göstermek" },
        { v1: "shut", v2: "shut", v3: "shut", mean: "kapatmak" },
        { v1: "sing", v2: "sang", v3: "sung", mean: "şarkı söylemek" },
        { v1: "sink", v2: "sank", v3: "sunk", mean: "batmak" },
        { v1: "sit", v2: "sat", v3: "sat", mean: "oturmak" },
        { v1: "sleep", v2: "slept", v3: "slept", mean: "uyumak" },
        { v1: "slide", v2: "slid", v3: "slid", mean: "kaymak" },
        { v1: "smell", v2: "smelt/smelled", v3: "smelt/smelled", mean: "koklamak / kokmak" },
        { v1: "speak", v2: "spoke", v3: "spoken", mean: "konuşmak" },
        { v1: "spell", v2: "spelt/spelled", v3: "spelt/spelled", mean: "hecelemek" },
        { v1: "spend", v2: "spent", v3: "spent", mean: "harcamak" },
        { v1: "spill", v2: "spilt/spilled", v3: "spilt/spilled", mean: "dökmek" },
        { v1: "split", v2: "split", v3: "split", mean: "bölmek" },
        { v1: "spoil", v2: "spoilt/spoiled", v3: "spoilt/spoiled", mean: "bozmak / şımartmak" },
        { v1: "spread", v2: "spread", v3: "spread", mean: "yaymak / yayılmak" },
        { v1: "stand", v2: "stood", v3: "stood", mean: "ayakta durmak" },
        { v1: "steal", v2: "stole", v3: "stolen", mean: "çalmak (hırsızlık)" },
        { v1: "stick", v2: "stuck", v3: "stuck", mean: "yapıştırmak / saplamak" },
        { v1: "sting", v2: "stung", v3: "stung", mean: "sokmak (arı vb.)" },
        { v1: "strike", v2: "struck", v3: "struck", mean: "vurmak / çarpmak" },
        { v1: "swear", v2: "swore", v3: "sworn", mean: "yemin etmek / küfretmek" },
        { v1: "sweep", v2: "swept", v3: "swept", mean: "süpürmek" },
        { v1: "swim", v2: "swam", v3: "swum", mean: "yüzmek" },
        { v1: "take", v2: "took", v3: "taken", mean: "almak / götürmek" },
        { v1: "teach", v2: "taught", v3: "taught", mean: "öğretmek" },
        { v1: "tear", v2: "tore", v3: "torn", mean: "yırtmak" },
        { v1: "tell", v2: "told", v3: "told", mean: "anlatmak / söylemek" },
        { v1: "think", v2: "thought", v3: "thought", mean: "düşünmek" },
        { v1: "throw", v2: "threw", v3: "thrown", mean: "fırlatmak" },
        { v1: "understand", v2: "understood", v3: "understood", mean: "anlamak" },
        { v1: "wake", v2: "woke", v3: "woken", mean: "uyanmak" },
        { v1: "wear", v2: "wore", v3: "worn", mean: "giymek" },
        { v1: "win", v2: "won", v3: "won", mean: "kazanmak" },
        { v1: "write", v2: "wrote", v3: "written", mean: "yazmak" }
    ];

    // Sabit Resimli (Emoji) Kategoriler Veritabanı
    const imageCategoriesData = {
        "Fruits": [
            { word: "Apple", img: "🍎" }, { word: "Banana", img: "🍌" }, { word: "Watermelon", img: "🍉" },
            { word: "Grapes", img: "🍇" }, { word: "Strawberry", img: "🍓" }, { word: "Melon", img: "🍈" },
            { word: "Cherry", img: "🍒" }, { word: "Peach", img: "🍑" }, { word: "Mango", img: "🥭" },
            { word: "Pineapple", img: "🍍" }, { word: "Kiwi", img: "🥝" }, { word: "Lemon", img: "🍋" },
            { word: "Orange", img: "🍊" }
        ],
        "Body Parts": [
            { word: "Eye", img: "👁️" }, { word: "Ear", img: "👂" }, { word: "Nose", img: "👃" },
            { word: "Mouth", img: "👄" }, { word: "Tooth", img: "🦷" }, { word: "Bone", img: "🦴" },
            { word: "Leg", img: "🦵" }, { word: "Foot", img: "🦶" }, { word: "Hand", img: "🤚" },
            { word: "Arm", img: "💪" }, { word: "Brain", img: "🧠" }, { word: "Heart", img: "❤️" },
            { word: "Finger", img: "☝️" },
            { word: "Toe", img: "https://cdn.pixabay.com/photo/2014/04/03/10/31/pedicure-310735_1280.png" },
            { word: "Knee", img: "https://cdn.pixabay.com/photo/2015/03/31/17/01/knee-701327_1280.jpg" },
            { word: "Elbow", img: "https://cdn.pixabay.com/photo/2017/09/01/08/28/body-2703412_1280.jpg" },
            { word: "Eyebrow", img: "https://cdn.pixabay.com/photo/2020/03/08/13/12/creativity-4912486_1280.jpg" },
            { word: "Moustache", img: "https://cdn.pixabay.com/photo/2016/04/04/22/27/bart-1308411_1280.png" },
            { word: "Beard", img: "https://cdn.pixabay.com/photo/2017/10/05/21/27/beard-2821057_1280.png" }
        ],
        "Public Buildings": [
            { word: "School", img: "🏫" }, { word: "Hospital", img: "🏥" }, { word: "Bank", img: "🏦" },
            { word: "Post Office", img: "🏤" }, { word: "Police Station", img: "🚓" }, { word: "Fire Station", img: "🚒" },
            { word: "Library", img: "📚" }, { word: "Mosque", img: "🕌" }, { word: "Church", img: "⛪" },
            { word: "Stadium", img: "🏟️" }, { word: "Factory", img: "🏭" }, { word: "Castle", img: "🏰" },
            { word: "Bus Stop", img: "🚏" }
        ],
        "Illnesses": [
            { word: "Headache", img: "🤕" }, { word: "Fever", img: "🤒" }, { word: "Cold", img: "🤧" },
            { word: "Vomit", img: "🤮" }, { word: "Toothache", img: "🦷" },
            { word: "Broken Arm", img: "https://cdn.pixabay.com/photo/2025/08/01/08/09/injury-9748241_1280.png" },
            { word: "Broken Leg", img: "https://cdn.pixabay.com/photo/2025/07/30/10/28/ai-generated-9744463_1280.png" },
            { word: "Stomachache", img: "https://cdn.pixabay.com/photo/2017/10/06/04/24/stomach-pain-2821941_1280.jpg" },
            { word: "Backache", img: "https://cdn.pixabay.com/photo/2020/06/17/10/32/back-pain-5308969_1280.jpg" },
            { word: "The Measles", img: "img/quickreveal/measles.png" }, // Kızamık
            { word: "Dizzy", img: "😵" }, { word: "Pill/Medicine", img: "💊" }, { word: "Injection", img: "💉" }
        ],
        "Countries & Nationalities": [
            { word: "Turkey - Turkish", img: "🇹🇷" }, { word: "USA - American", img: "🇺🇸" }, { word: "UK - British", img: "🇬🇧" },
            { word: "Germany - German", img: "🇩🇪" }, { word: "France - French", img: "🇫🇷" }, { word: "Italy - Italian", img: "🇮🇹" },
            { word: "Spain - Spanish", img: "🇪🇸" }, { word: "Japan - Japanese", img: "🇯🇵" }, { word: "China - Chinese", img: "🇨🇳" },
            { word: "Russia - Russian", img: "🇷🇺" }, { word: "Brazil - Brazilian", img: "🇧🇷" }, { word: "India - Indian", img: "🇮🇳" },
            { word: "Palestine - Palestinian", img: "🇵🇸" }, { word: "Saudi Arabia - Saudi Arabian", img: "🇸🇦" },
            { word: "Azerbaijan - Azerbaijani", img: "🇦🇿" }, { word: "Morocco - Moroccan", img: "🇲🇦" },
            { word: "Egypt - Egyptian", img: "🇪🇬" }, { word: "Pakistan - Pakistani", img: "🇵🇰" },
            { word: "Syria - Syrian", img: "🇸🇾" }, { word: "Poland - Polish", img: "🇵🇱" }, { word: "Portugal - Portuguese", img: "🇵🇹" }
        ]
    };

    // Custom Set (Kullanıcı Özel Veri)
    let customListData = [];
    let customListIndex = 0;

    // DOM Elements
    const elements = {
        card: null,
        frontContent: null,
        backContent: null,
        title: null,
        categoryBadge: null,
        canvasContainer: null
    };

    function init(config) {
        // Elements Bind
        elements.card = document.getElementById('qrFlashcard');
        elements.frontContent = document.getElementById('qrFrontContent');
        elements.backContent = document.getElementById('qrBackContent');
        elements.categoryBadge = document.getElementById('qrCurrentCategory');
        elements.canvasContainer = document.getElementById('qrFrontCanvasContainer');

        // Config'i parse et
        currentCategory = config.QrCategory || 'Numbers';
        currentSubcategory = config.QrSubCategory || 'Cardinal';
        let mathOpsRaw = config.QrMathOps || 'Addition (+)';
        mathOperations = mathOpsRaw.split(',').map(s => s.trim());

        let irrOpsRaw = config.QrIrregularOps || 'V2 (Past Form),Meaning (Anlam)';
        irregularOps = irrOpsRaw.split(',').map(s => s.trim());

        minRange = parseInt(config.QrMin) || 1;
        maxRange = parseInt(config.QrMax) || 100;
        timeType = config.QrTimeType || 'digital';

        numGroups = parseInt(config.NumGroups) || 4;
        const groupScoresContainer = document.getElementById('qrGroupScores');
        const qrChkContainer = document.getElementById('qrCheckboxContainer');
        groupScores = {};

        if (groupScoresContainer && qrChkContainer) {
            groupScoresContainer.innerHTML = '';
            qrChkContainer.innerHTML = '';
            qrChkContainer.style.display = 'flex';

            for (let i = 0; i < numGroups; i++) {
                const groupName = String.fromCharCode(65 + i);
                groupScores[groupName] = 0;

                // Group Score UI
                const box = document.createElement('div');
                box.className = 'group-score-box active';
                box.style.cssText = 'background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 10px 20px; min-width: 100px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); backdrop-filter: blur(10px); display: flex; flex-direction: column; align-items: center; transition: transform 0.2s ease;';
                box.innerHTML = `<span style="font-size:0.9rem; color:#cbd5e1; font-weight:bold; letter-spacing:1px; margin-bottom:5px; text-transform:uppercase;">GRUP ${groupName}</span><div class="score" id="qrScore_${groupName}" style="font-size:2.2rem; font-weight:900; color:#fff; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">0</div>`;
                groupScoresContainer.appendChild(box);

                // Group Checkbox UI
                const lbl = document.createElement('label');
                lbl.style.cssText = 'display:flex; align-items:center; gap:5px; color:#fff; font-size:1.1rem; cursor:pointer; background:rgba(255,255,255,0.1); padding:5px 10px; border-radius:5px;';
                lbl.innerHTML = `<input type="checkbox" class="qr-group-checkbox" value="${groupName}" style="width:20px;height:20px;accent-color:#10b981;"> ${groupName}`;
                qrChkContainer.appendChild(lbl);
            }
        }

        // Puan Ekleme Butonu (qrPlusBtn) - Zaten index.html'ye koyduk, sadece event veriyoruz
        const qrPlusBtn = document.getElementById('qrPlusBtn');
        if (qrPlusBtn) {
            // Birden fazla event dinleyici eklenmemesi için klonlama yöntemiyle resetleyelim
            const newQrPlusBtn = qrPlusBtn.cloneNode(true);
            qrPlusBtn.parentNode.replaceChild(newQrPlusBtn, qrPlusBtn);

            newQrPlusBtn.addEventListener('click', () => {
                const checkboxes = document.querySelectorAll('.qr-group-checkbox:checked');
                let awarded = false;
                checkboxes.forEach(cb => {
                    const gName = cb.value;
                    groupScores[gName] += 1;
                    const scoreEl = document.getElementById(`qrScore_${gName}`);
                    if (scoreEl) {
                        scoreEl.textContent = groupScores[gName];
                        scoreEl.style.transform = "scale(1.5)";
                        scoreEl.style.color = "#10b981";
                        setTimeout(() => {
                            scoreEl.style.transform = "scale(1)";
                            scoreEl.style.color = "#fff";
                        }, 300);
                    }
                    cb.checked = false; // Temizle
                    awarded = true;
                });

                if (awarded) {
                    generateQuestion(); // Puan verildiyse sıradakine tıkla.
                }
            });
        }

        // Custom Data Parse (Eğer varsa)
        if (currentCategory === 'Custom Image Set' && config.QrCustomData) {
            parseCustomData(config.QrCustomData);
        }

        if (currentCategory === 'Math Operations' || currentCategory === 'Irregular Verbs' || currentCategory === 'Custom Image Set') {
            elements.categoryBadge.textContent = `${currentCategory}`;
        } else if (currentCategory === 'Time') {
            elements.categoryBadge.textContent = `${currentCategory}`;
        } else {
            elements.categoryBadge.textContent = `${currentCategory} - ${currentSubcategory}`;
        }

        // Reset Card
        if (elements.card.classList.contains('flipped')) {
            elements.card.classList.remove('flipped');
        }
        isFlipped = false;

        generateQuestion();
    }

    function generateQuestion() {
        if (elements.card.classList.contains('flipped')) {
            elements.card.classList.remove('flipped');
            isFlipped = false;
            // Bekle ve yeni soruyu üret (Animasyon bitimi)
            setTimeout(() => {
                routeQuestion();
            }, 300);
        } else {
            routeQuestion();
        }
    }

    function routeQuestion() {
        elements.canvasContainer.style.display = 'none';
        elements.frontContent.style.display = 'block';

        if (currentCategory === 'Numbers') {
            generateNumbers();
        } else if (currentCategory === 'Math Operations') {
            generateMath();
        } else if (currentCategory === 'Time') {
            generateTime();
        } else if (currentCategory === 'Irregular Verbs') {
            generateIrregularVerbs();
        } else if (currentCategory === 'Custom Image Set') {
            generateCustomSet();
        } else if (['Fruits', 'Body Parts', 'Public Buildings', 'Illnesses', 'Countries & Nationalities'].includes(currentCategory)) {
            generateStaticEmojiSet(currentCategory);
        } else {
            // Şimdilik default bir şey
            elements.frontContent.innerHTML = "Çok Yakında!";
            elements.backContent.innerHTML = "Coming Soon!";
        }
    }

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // İngilizce Sayı Okunuşları (Basit versiyon - Aşama 1 için)
    function numberToWords(n) {
        const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
        const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

        if (n === 0) return 'zero';
        if (n < 20) return a[n].trim();
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + a[n % 10].trim() : '');
        if (n < 1000) return a[Math.floor(n / 100)].trim() + ' hundred' + (n % 100 !== 0 ? ' and ' + numberToWords(n % 100) : '');
        return n.toString(); // Şimdilik basitleştirildi
    }

    function numberToOrdinalWords(n) {
        const words = numberToWords(n);
        if (words.endsWith('y')) return words.slice(0, -1) + 'ieth';
        if (words.endsWith('one')) return words.slice(0, -3) + 'first';
        if (words.endsWith('two')) return words.slice(0, -3) + 'second';
        if (words.endsWith('three')) return words.slice(0, -5) + 'third';
        if (words.endsWith('five')) return words.slice(0, -4) + 'fifth';
        if (words.endsWith('eight')) return words.slice(0, -1) + 'h';
        if (words.endsWith('nine')) return words.slice(0, -1) + 'th';
        if (words.endsWith('twelve')) return words.slice(0, -2) + 'fth';
        return words + 'th';
    }

    function generateNumbers() {
        const num = getRandomInt(minRange, maxRange);
        let word = '';
        if (currentSubcategory === 'Ordinal') {
            let suffix = "th";
            if (num % 10 === 1 && num % 100 !== 11) suffix = "st";
            else if (num % 10 === 2 && num % 100 !== 12) suffix = "nd";
            else if (num % 10 === 3 && num % 100 !== 13) suffix = "rd";

            elements.frontContent.innerHTML = `${num}<sup>${suffix}</sup>`;
            word = numberToOrdinalWords(num);
        } else {
            elements.frontContent.innerHTML = num;
            word = numberToWords(num);
        }

        elements.backContent.innerHTML = `<span style="font-size:3rem;">${word.charAt(0).toUpperCase() + word.slice(1)}</span>`;
    }

    function generateMath() {
        let n1 = getRandomInt(minRange, maxRange);
        let n2 = getRandomInt(minRange, maxRange);

        // İşlem seçimi (Kullanıcının multiselect ile seçtiklerinden)
        if (!mathOperations || mathOperations.length === 0) {
            mathOperations = ['Addition (+)'];
        }
        let op = mathOperations[getRandomInt(0, mathOperations.length - 1)];

        let result = 0;
        let sign = '';
        if (op.includes('+')) {
            sign = '+'; result = n1 + n2;
        } else if (op.includes('-')) {
            // Eksi çıkmaması için
            if (n2 > n1) { let temp = n1; n1 = n2; n2 = temp; }
            sign = '-'; result = n1 - n2;
        } else if (op.includes('*')) {
            // Çarpma işlemleri aralığı küçültülmeli ki çok uçmasın
            n1 = getRandomInt(1, Math.min(20, maxRange));
            n2 = getRandomInt(1, Math.min(10, maxRange));
            sign = 'x'; result = n1 * n2;
        } else if (op.includes('/')) {
            // Tam bölünen sayılar üret (n2 bölen, result bölüm, n1 bölünen)
            n2 = getRandomInt(1, Math.min(12, maxRange));
            let res = getRandomInt(1, Math.min(12, maxRange));
            n1 = n2 * res;
            sign = '÷'; result = res;
        }

        elements.frontContent.innerHTML = `${n1} ${sign} ${n2} = ?`;

        const resWord = numberToWords(result);
        elements.backContent.innerHTML = `${result}<br><span style="font-size:2.5rem; color:#ddd;">(${resWord.charAt(0).toUpperCase() + resWord.slice(1)})</span>`;
    }

    function timeToWords(h, m) {
        const nums = ["twelve", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "quarter", "sixteen", "seventeen", "eighteen", "nineteen", "twenty", "twenty-one", "twenty-two", "twenty-three", "twenty-four", "twenty-five", "twenty-six", "twenty-seven", "twenty-eight", "twenty-nine", "half"];

        let hrStr = nums[h % 12 === 0 ? 12 : h % 12];
        let nextHrStr = nums[(h + 1) % 12 === 0 ? 12 : (h + 1) % 12];

        if (m === 0) return `It's ${hrStr} o'clock.`;
        if (m === 15) return `It's quarter past ${hrStr}.`;
        if (m === 30) return `It's half past ${hrStr}.`;
        if (m === 45) return `It's quarter to ${nextHrStr}.`;

        if (m < 30) {
            let mStr = m <= 30 ? nums[m] : "";
            if (m > 20 && m < 30) mStr = "twenty-" + nums[m - 20];
            return `It's ${mStr} past ${hrStr}.`;
        } else {
            let left = 60 - m;
            let mStr = left <= 30 ? nums[left] : "";
            if (left > 20 && left < 30) mStr = "twenty-" + nums[left - 20];
            return `It's ${mStr} to ${nextHrStr}.`;
        }
    }

    function drawAnalogClock(h, m) {
        elements.frontContent.style.display = 'none';
        elements.canvasContainer.style.display = 'flex';
        elements.canvasContainer.innerHTML = ''; // Clear old

        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;
        elements.canvasContainer.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        const radius = canvas.height / 2;
        ctx.translate(radius, radius);

        // Draw Face
        ctx.beginPath();
        ctx.arc(0, 0, radius - 10, 0, 2 * Math.PI);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 8;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, 2 * Math.PI);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();

        // Draw Numbers
        ctx.font = radius * 0.2 + "px Outfit";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillStyle = '#1e293b';
        for (let num = 1; num <= 12; num++) {
            let ang = num * Math.PI / 6;
            ctx.rotate(ang);
            ctx.translate(0, -radius * 0.7);
            ctx.rotate(-ang);
            ctx.fillText(num.toString(), 0, 0);
            ctx.rotate(ang);
            ctx.translate(0, radius * 0.7);
            ctx.rotate(-ang);
        }

        // Draw Time
        let hour = h % 12;
        let minute = m;
        let second = 0; // Static

        let hrAngle = (hour * Math.PI / 6) + (minute * Math.PI / (6 * 60));
        let minAngle = (minute * Math.PI / 30);

        // Hour Hand
        ctx.beginPath();
        ctx.lineWidth = 10;
        ctx.lineCap = "round";
        ctx.strokeStyle = '#0f172a';
        ctx.moveTo(0, 0);
        ctx.rotate(hrAngle);
        ctx.lineTo(0, -radius * 0.4);
        ctx.stroke();
        ctx.rotate(-hrAngle);

        // Minute Hand
        ctx.beginPath();
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#3b82f6';
        ctx.moveTo(0, 0);
        ctx.rotate(minAngle);
        ctx.lineTo(0, -radius * 0.65);
        ctx.stroke();
        ctx.rotate(-minAngle);

        // Reset transform
        ctx.translate(-radius, -radius);
    }

    function generateTime() {
        // Rastgele Saat ve Dakika (5'in katları daha iyi öğrenme sağlar)
        const h = getRandomInt(1, 12);
        const m = getRandomInt(0, 11) * 5;

        // Öğrenci Tipi format seçimi
        let displayType = timeType;

        const mm = m < 10 ? '0' + m : m;
        const hh = h < 10 ? '0' + h : h; // 12 saat formatında 0 yazmak şık durabilir

        if (displayType === 'Mixed' || displayType === 'mixed') {
            // Analog + Dijital (Eşzamanlı)
            drawAnalogClock(h, m);
            elements.frontContent.style.display = 'block';
            elements.frontContent.innerHTML = `<div style="font-size: 3rem; margin-top: 10px; color: #cbd5e1; background: rgba(0,0,0,0.3); padding: 5px 25px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 10px rgba(0,0,0,0.5);">${hh}:${mm}</div>`;
        } else if (displayType === 'analog' || displayType === 'Analog') {
            drawAnalogClock(h, m);
            elements.frontContent.innerHTML = ''; // Canvas var sadece
        } else {
            // Yalnızca Dijital Gösterim
            elements.canvasContainer.style.display = 'none';
            elements.frontContent.style.display = 'block';
            elements.frontContent.innerHTML = `${hh}:${mm}`;
        }

        elements.backContent.innerHTML = `<span style="font-size:3rem; line-height:1.2;">${timeToWords(h, m)}</span>`;
    }

    function generateIrregularVerbs() {
        const randomIndex = getRandomInt(0, irregularVerbsData.length - 1);
        const verb = irregularVerbsData[randomIndex];

        elements.canvasContainer.style.display = 'none';
        elements.frontContent.style.display = 'block';

        // Ön Yüz = Base Form (V1)
        elements.frontContent.innerHTML = `<span style="font-size: 5.5rem; color: #a78bfa;">${verb.v1}</span>`;

        let backHtml = '';

        // Kullanıcının Checkbox seçimlerine göre Arka Yüzü doldur
        if (irregularOps.includes('V2 (Past Form)')) {
            backHtml += `<div style="margin-bottom:15px;"><span style="color:#cbd5e1; font-size:1.5rem; display:block;">Past (V2)</span><span style="font-size:3.5rem; color:#fff;">${verb.v2}</span></div>`;
        }
        if (irregularOps.includes('V3 (Past Participle)')) {
            backHtml += `<div style="margin-bottom:15px;"><span style="color:#fcd34d; font-size:1.5rem; display:block;">Past Participle (V3)</span><span style="font-size:3.5rem; color:#fff;">${verb.v3}</span></div>`;
        }
        if (irregularOps.includes('Meaning (Anlam)')) {
            backHtml += `<div><span style="color:#6ee7b7; font-size:1.5rem; display:block;">Anlamı</span><span style="font-size:2.5rem; color:#fff;">${verb.mean}</span></div>`;
        }

        if (backHtml === '') {
            backHtml = `<span style="font-size:2rem; color:#ef4444;">Ayardan hiçbir şey seçilmedi!</span>`;
        }

        elements.backContent.innerHTML = `<div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100%;">${backHtml}</div>`;
    }

    // --- Custom Image Set Logic ---
    function parseCustomData(rawData) {
        customListData = [];
        customListIndex = 0;

        if (!rawData || rawData.trim() === '') return;

        // Eger URL ise (Google Sheets WebApp vb.) simdilik uyari ver ve text moduna don, 
        // Gercek appte fetch() atilacak. MVP icin direk metin parsalama yapiyoruz:
        if (rawData.startsWith('http')) {
            customListData.push({ word: "Hata", img: "Girdiğiniz veri bir İnternet Adresi (URL). Şu anki sürümde sadece 'Kelime | resim_linki.jpg' şeklindeki düz metinleri parse edebiliyoruz." });
        } else {
            // Satır satır parse
            const lines = rawData.split('\n');
            lines.forEach(line => {
                if (line.includes('|')) {
                    const parts = line.split('|');
                    const w = parts[0].trim();
                    const i = parts[1].trim();
                    if (w && i) {
                        customListData.push({ word: w, img: i });
                    }
                }
            });
        }
    }

    function generateCustomSet() {
        if (!customListData || customListData.length === 0) {
            elements.canvasContainer.style.display = 'none';
            elements.frontContent.style.display = 'block';
            elements.frontContent.innerHTML = `<span style="color:#ef4444; font-size:3rem;"><i class="fas fa-exclamation-triangle"></i> Veri Yok</span>`;

            let backHtml = `<span style="font-size:2rem; padding: 2rem; text-align:center;">Lütfen Ayarlardan 'Nasıl Yükleneceğine' göz atarak listenizi doldurup tekrar deneyin.</span>`;
            elements.backContent.innerHTML = `<div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100%;">${backHtml}</div>`;
            return;
        }

        // Sırayla veya Rastgele gösterilebilir, şu an rastgele
        const randomIndex = getRandomInt(0, customListData.length - 1);
        const item = customListData[randomIndex];

        elements.canvasContainer.style.display = 'none';
        elements.frontContent.style.display = 'block';

        // Ön Yüz: Resim veya Hata Metni
        if (item.img.startsWith('http') || item.img.startsWith('data:image')) {
            elements.frontContent.innerHTML = `<div style="width:100%; height:100%; display:flex; justify-content:center; align-items:center;"><img src="${item.img}" style="max-width:100%; max-height:450px; border-radius:15px; box-shadow:0 10px 25px rgba(0,0,0,0.5);" alt="${item.word}" onerror="this.onerror=null; this.parentElement.innerHTML='<span style=\\'color:#ef4444; font-size:2rem;\\'>Resim Yüklenemedi! Linki kontrol edin.</span>';"></div>`;
        } else {
            // Belki emoji vs girmistir
            elements.frontContent.innerHTML = `<span style="font-size:9rem;">${item.img}</span>`;
        }

        // Arka Yüz: Kelime
        let backHtml = `<span style="color:#6ee7b7; font-size:4.5rem; text-shadow: 0 4px 15px rgba(0,0,0,0.5);">${item.word}</span>`;
        elements.backContent.innerHTML = `<div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100%;">${backHtml}</div>`;
    }

    function generateStaticEmojiSet(categoryName) {
        const catData = imageCategoriesData[categoryName];
        if (!catData || catData.length === 0) return;

        const randomIndex = getRandomInt(0, catData.length - 1);
        const item = catData[randomIndex];
        elements.canvasContainer.style.display = 'none';
        elements.frontContent.style.display = 'block';

        // Ön Yüz = Emoji VEYA Gerçek Resim URL'si (Yerel Veya Dış)
        if (item.img.startsWith('http') || item.img.startsWith('img/')) {
            elements.frontContent.innerHTML = `<div style="width:100%; height:100%; display:flex; justify-content:center; align-items:center;"><img src="${item.img}" style="max-width:100%; max-height:450px; border-radius:15px; box-shadow:0 10px 25px rgba(0,0,0,0.5);" alt="${item.word}"></div>`;
        } else {
            // Emoji
            elements.frontContent.innerHTML = `<span style="font-size: 10rem; display:block; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.4));">${item.img}</span>`;
        }

        // Arka Yüz = Kelime
        let backHtml = `<span style="color:#fcd34d; font-size:5rem; font-weight:bold; letter-spacing:2px; text-shadow: 0 4px 10px rgba(0,0,0,0.8);">${item.word}</span>`;
        elements.backContent.innerHTML = `<div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100%;">${backHtml}</div>`;
    }

    function flipCard() {
        if (!isFlipped) {
            elements.card.classList.add('flipped');
            isFlipped = true;
        } else {
            // Tekrar basarsa soruyu değiştirmez, isterse geri kapatır
            elements.card.classList.remove('flipped');
            isFlipped = false;
        }
    }

    return {
        init: init,
        next: generateQuestion,
        flip: flipCard
    };
})();

// Global Space Bar and Click Listeners
function qrFlipCard() {
    QuickRevealEngine.flip();
}

function qrNextQuestion() {
    QuickRevealEngine.next();
}

// Boşluk tuşu ile Yönetim
document.addEventListener('keydown', function (event) {
    const qrSection = document.getElementById('quickRevealGameArea');
    if (qrSection && qrSection.style.display === 'block') {
        if (event.code === 'Space') {
            event.preventDefault(); // Sayfayı kaydırmayı engelle
            qrNextQuestion();
        }
    }
});

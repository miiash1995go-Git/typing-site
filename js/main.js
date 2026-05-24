/**
 * EduTyping Next - Professional Engine
 */

// --- 1. ローマ字辞書データ（抜粋・拡張可能） ---
const ROMAJI_MAP = {
    'あ':['a'], 'い':['i','yi'], 'う':['u','wu'], 'え':['e','ye'], 'お':['o'],
    'か':['ka'], 'き':['ki'], 'く':['ku'], 'け':['ke'], 'こ':['ko'],
    'さ':['sa'], 'し':['si','shi'], 'す':['su'], 'せ':['se'], 'そ':['so'],
    'た':['ta'], 'ち':['ti','chi'], 'つ':['tu','tsu'], 'て':['te'], 'と':['to'],
    'な':['na'], 'に':['ni'], 'ぬ':['nu'], 'ね':['ne'], 'の':['no'],
    'は':['ha'], 'ひ':['hi'], 'ふ':['fu','hu'], 'へ':['he'], 'ほ':['ho'],
    'ま':['ma'], 'み':['mi'], 'む':['mu'], 'め':['me'], 'も':['mo'],
    'や':['ya'], 'ゆ':['yu'], 'よ':['yo'],
    'ら':['ra'], 'り':['ri'], 'る':['ru'], 'れ':['re'], 'ろ':['ro'],
    'わ':['wa'], 'を':['wo'], 'ん':['nn','n','xn'],
    'が':['ga'], 'ぎ':['gi'], 'ぐ':['gu'], 'げ':['ge'], 'ご':['go'],
    'ざ':['za'], 'じ':['zi','ji'], 'ず':['zu'], 'ぜ':['ze'], 'ぞ':['zo'],
    'だ':['da'], 'ぢ':['di'], 'づ':['du'], 'で':['de'], 'ど':['do'],
    'ば':['ba'], 'び':['bi'], 'ぶ':['bu'], 'べ':['be'], 'ぼ':['bo'],
    'ぱ':['pa'], 'ぴ':['pi'], 'ぷ':['pu'], 'ぺ':['pe'], 'ぽ':['po'],
    'っ':['ltu','ltsu'], // 促音は単体と次の文字重ねの両方に対応が必要
    'ー':['-'], ' ':[' '], '、':[','], '。':['.']
};

// 拗音などはプログラムで動的に生成・合成するロジックを組むのが理想ですが、
// ここでは主要なものを定義
const SPECIAL_MAP = {
    'きゃ':['kya'], 'きゅ':['kyu'], 'きょ':['kyo'],
    'しゃ':['sya','sha'], 'しゅ':['syu','shu'], 'しょ':['syo','sho'],
    'ちゃ':['tya','cha'], 'ちゅ':['tyu','chu'], 'ちょ':['tyo','cho']
};

// --- 2. クラス定義 ---
class TypingApp {
    constructor() {
        this.data = null;
        this.currentCategory = 'business';
        this.currentQuestion = null;
        this.targetRomaji = ""; // 判定用の内部文字列
        this.userInput = "";   // 現在の文章に対する累計正解入力
        this.state = "START";  // START, PLAYING, RESULT
        
        this.timer = 60;
        this.misses = 0;
        this.totalTyped = 0;
        this.missMap = {};
        this.interval = null;

        this.init();
    }

    async init() {
        // データ読み込み
        try {
            const res = await fetch('./data/weekly.json');
            this.data = await res.json();
        } catch(e) {
            console.error("JSON読み込み失敗。ダミーデータを使用します。");
            this.data = { categories: { business: [{kanji:"テスト", kana:"てすと"}] } };
        }

        this.setupEventListeners();
        this.renderKeyboard();
    }

    setupEventListeners() {
        // カテゴリ選択
        document.querySelectorAll('.btn-category').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.btn-category').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentCategory = btn.dataset.cat;
            });
        });

        // 開始
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());

        // タイピング入力
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    startGame() {
        this.state = "PLAYING";
        this.timer = 60;
        this.misses = 0;
        this.totalTyped = 0;
        this.missMap = {};
        
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');

        this.nextQuestion();
        this.startTimer();
    }

    nextQuestion() {
        const questions = this.data.categories[this.currentCategory];
        this.currentQuestion = questions[Math.floor(Math.random() * questions.length)];
        
        // かなをデフォルトのローマ字に一旦変換（表示用）
        this.targetRomaji = this.generateDefaultRomaji(this.currentQuestion.kana);
        this.userInput = "";
        
        this.updateDisplay();
    }

    // 簡易的なローマ字生成（表示の初期値として使用）
    generateDefaultRomaji(kana) {
        let res = "";
        for(let i=0; i<kana.length; i++) {
            // 2文字マッチ（拗音）を優先
            let double = kana.substring(i, i+2);
            if(SPECIAL_MAP[double]) {
                res += SPECIAL_MAP[double][0];
                i++;
            } else if(ROMAJI_MAP[kana[i]]) {
                res += ROMAJI_MAP[kana[i]][0];
            }
        }
        return res;
    }

    handleKeyDown(e) {
        if(this.state !== "PLAYING") return;
        if(e.key.length !== 1) return; // Shiftなどは無視

        const target = this.targetRomaji[this.userInput.length];
        
        if(e.key === target) {
            // 正解
            this.userInput += e.key;
            this.totalTyped++;
            this.playSound(440, 0.05); // 正解音（高音）
            
            if(this.userInput === this.targetRomaji) {
                this.nextQuestion();
            }
        } else {
            // ミス
            this.misses++;
            this.logMiss(target);
            this.playSound(140, 0.1); // ミス音（低音）
            this.flashError();
        }
        
        this.updateDisplay();
        this.updateStats();
        this.highlightKey(this.targetRomaji[this.userInput.length]);
    }

    updateDisplay() {
        document.getElementById('display-kanji').innerText = this.currentQuestion.kanji;
        document.getElementById('display-kana').innerText = this.currentQuestion.kana;
        
        const typed = this.userInput;
        const current = this.targetRomaji[this.userInput.length] || "";
        const remain = this.targetRomaji.substring(this.userInput.length + 1);

        document.getElementById('display-romaji').innerHTML = `
            <span class="typed">${typed}</span>
            <span class="current">${current}</span>
            <span>${remain}</span>
        `;
    }

    updateStats() {
        const timeElapsed = (60 - this.timer) / 60;
        const wpm = timeElapsed > 0 ? Math.floor((this.totalTyped / 5) / timeElapsed) : 0;
        const acc = this.totalTyped > 0 ? Math.floor(((this.totalTyped - this.misses) / this.totalTyped) * 100) : 100;
        
        document.getElementById('wpm').innerText = wpm;
        document.getElementById('accuracy').innerText = acc;
    }

    startTimer() {
        this.interval = setInterval(() => {
            this.timer--;
            document.getElementById('timer').innerText = this.timer;
            if(this.timer <= 0) this.endGame();
        }, 1000);
    }

    endGame() {
        clearInterval(this.interval);
        this.state = "RESULT";
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('result-screen').classList.remove('hidden');

        const stats = this.calculateFinalStats();
        document.getElementById('res-score').innerText = stats.score;
        document.getElementById('res-wpm').innerText = stats.wpm;
        document.getElementById('res-acc').innerText = stats.acc;
        document.getElementById('res-miss').innerText = this.misses;
        document.getElementById('result-rank').innerText = this.getRank(stats.score);
        
        const weak = Object.entries(this.missMap).sort((a,b)=>b[1]-a[1]).slice(0,3);
        document.getElementById('res-weak').innerHTML = weak.map(w => `<span class="key-box">${w[0]}</span>`).join('');
    }

    calculateFinalStats() {
        const wpm = parseInt(document.getElementById('wpm').innerText);
        const acc = parseInt(document.getElementById('accuracy').innerText);
        const score = Math.floor(wpm * (acc/100)**3 * 2); // スコア計算式
        return { score, wpm, acc };
    }

    getRank(s) {
        if(s >= 400) return "SSS";
        if(s >= 350) return "SS";
        if(s >= 300) return "S";
        if(s >= 260) return "A+";
        if(s >= 220) return "A";
        if(s >= 180) return "A-";
        if(s >= 150) return "B+";
        if(s >= 120) return "B";
        if(s >= 90) return "B-";
        if(s >= 60) return "C";
        return "D";
    }

    // --- キーボードと演出 ---
    renderKeyboard() {
        const keys = "1234567890-^qwertyuiopasdfghjkl;zxcvbnm,./";
        const container = document.getElementById('keyboard');
        keys.split('').forEach(k => {
            const el = document.createElement('div');
            el.className = 'key';
            el.id = `key-${k}`;
            el.innerText = k.toUpperCase();
            container.appendChild(el);
        });
    }

    highlightKey(char) {
        document.querySelectorAll('.key').forEach(k => k.classList.remove('highlight'));
        const el = document.getElementById(`key-${char}`);
        if(el) el.classList.add('highlight');
    }

    logMiss(char) {
        if(!char) return;
        this.missMap[char] = (this.missMap[char] || 0) + 1;
    }

    flashError() {
        const area = document.getElementById('display-romaji');
        area.style.backgroundColor = '#fed7d7';
        setTimeout(() => area.style.backgroundColor = 'transparent', 100);
    }

    // Web Audio API で音を生成（外部ファイル不要）
    playSound(freq, duration) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    }
}

// 実行
const app = new TypingApp();
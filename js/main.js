/**
 * EduTyping Next - Professional Logic v3
 * イータイピング準拠判定エンジン + 350文字終了ロジック
 */

const ROMAJI_DICT = {
    'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
    'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
    'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
    'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
    'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
    'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
    'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
    'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
    'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
    'わ': 'wa', 'を': 'wo', 'ん': 'nn',
    'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
    'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
    'だ': 'da', 'ぢ': 'di', 'づ': 'du', 'で': 'de', 'ど': 'do',
    'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
    'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
    'ー': '-', ' ': ' '
};

const YOON_DICT = {
    'きゃ': 'kya', 'きゅ': 'kyu', 'きょ': 'kyo',
    'しゃ': 'sha', 'しゅ': 'shu', 'しょ': 'sho',
    'ちゃ': 'cha', 'ちゅ': 'chu', 'ちょ': 'cho',
    'にゃ': 'nya', 'にゅ': 'nyu', 'にょ': 'nyo',
    'ひゃ': 'hya', 'ひゅ': 'hyu', 'ひょ': 'hyo',
    'みゃ': 'mya', 'みゅ': 'myu', 'みょ': 'myo',
    'りゃ': 'rya', 'りゅ': 'ryu', 'りょ': 'ryo',
    'ぎゃ': 'gya', 'ぎゅ': 'gyu', 'ぎょ': 'gyo',
    'じゃ': 'ja', 'じゅ': 'ju', 'じょ': 'jo',
    'びゃ': 'bya', 'びゅ': 'byu', 'びょ': 'byo',
    'ぴゃ': 'pya', 'ぴゅ': 'pyu', 'ぴょ': 'pyo',
    'ふぁ': 'fa', 'ふぃ': 'fi', 'ふぇ': 'fe', 'ふぉ': 'fo',
    'うぃ': 'wi', 'うぇ': 'we', 'うぉ': 'wo', 'てぃ': 'ti', 'でぃ': 'di'
};

class TypingApp {
    constructor() {
        this.data = null;
        this.currentCategory = 'business';
        this.targetRomaji = "";
        this.userInput = "";
        this.state = "START";
        
        this.startTime = 0;
        this.totalTimeMs = 0;
        this.misses = 0;
        this.totalTyped = 0;
        this.cumTypedCount = 0; // 累計タイプ数（終了判定用）
        this.targetLimit = 350; // 350文字目安
        this.maxTimeLimit = 240000; // 4分
        
        this.missMap = {};
        this.audioCtx = null;
        this.timerInterval = null;

        this.init();
    }

    async init() {
        try {
            const res = await fetch('./data/weekly.json');
            this.data = await res.json();
        } catch (e) { console.error(e); }
        this.setupEventListeners();
        this.renderKeyboard();
    }

    setupEventListeners() {
        document.querySelectorAll('.btn-category').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.btn-category').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentCategory = btn.dataset.cat;
            });
        });
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    // ローマ字変換エンジンの改良
    convertToRomaji(kana) {
        let romaji = "";
        for (let i = 0; i < kana.length; i++) {
            let char = kana[i];
            let next = kana[i + 1];

            // 1. 促音（っ）
            if (char === 'っ' && next) {
                let yoonNext = YOON_DICT[kana.substring(i + 1, i + 3)];
                let normalNext = ROMAJI_DICT[next];
                if (yoonNext) {
                    romaji += yoonNext[0] + yoonNext;
                    i += 2; continue;
                } else if (normalNext) {
                    romaji += normalNext[0] + normalNext;
                    i++; continue;
                }
            }
            // 2. 拗音
            let yoon = YOON_DICT[kana.substring(i, i + 2)];
            if (yoon) {
                romaji += yoon;
                i++; continue;
            }
            // 3. 通常
            romaji += ROMAJI_DICT[char] || char;
        }
        return romaji;
    }

    startGame() {
        this.state = "PLAYING";
        this.startTime = performance.now();
        this.misses = 0;
        this.totalTyped = 0;
        this.cumTypedCount = 0;
        this.missMap = {};
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');

        this.nextQuestion();
        this.updateTimer();
    }

    nextQuestion() {
        // 終了判定：350文字以上 or 4分経過
        const now = performance.now();
        if (this.cumTypedCount >= this.targetLimit || (now - this.startTime) >= this.maxTimeLimit) {
            this.endGame();
            return;
        }

        const questions = this.data.categories[this.currentCategory];
        this.currentQuestion = questions[Math.floor(Math.random() * questions.length)];
        this.targetRomaji = this.convertToRomaji(this.currentQuestion.kana);
        this.userInput = "";
        this.updateDisplay();
    }

    handleKeyDown(e) {
        if (this.state !== "PLAYING") return;
        if (e.key === "Process" || e.key === "Shift") return;
        if (e.key.length !== 1) return;

        const key = e.key.toLowerCase();
        const target = this.targetRomaji[this.userInput.length];

        if (key === target) {
            this.userInput += key;
            this.totalTyped++;
            this.cumTypedCount++;
            this.playSound(600, 0.05);
            if (this.userInput === this.targetRomaji) {
                this.nextQuestion();
            }
        } else {
            this.misses++;
            this.logMiss(target);
            this.playSound(200, 0.1);
            this.flashError();
        }
        this.updateDisplay();
        this.updateStats();
        this.highlightKey(this.targetRomaji[this.userInput.length]);
    }

    updateTimer() {
        if (this.state !== "PLAYING") return;
        const now = performance.now();
        const diff = now - this.startTime;
        document.getElementById('timer').innerText = this.formatTime(diff);
        this.timerInterval = requestAnimationFrame(() => this.updateTimer());
    }

    formatTime(ms) {
        const m = Math.floor(ms / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        const msPart = Math.floor((ms % 1000) / 10);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(msPart).padStart(2, '0')}`;
    }

    updateDisplay() {
        document.getElementById('display-kanji').innerText = this.currentQuestion.kanji;
        document.getElementById('display-kana').innerText = this.currentQuestion.kana;
        const typed = this.userInput;
        const current = this.targetRomaji[this.userInput.length] || "";
        const remain = this.targetRomaji.substring(this.userInput.length + 1);
        document.getElementById('display-romaji').innerHTML = 
            `<span class="typed">${typed}</span><span class="current">${current}</span><span>${remain}</span>`;
    }

    updateStats() {
        const elapsedSec = (performance.now() - this.startTime) / 1000;
        const wpm = elapsedSec > 0 ? Math.floor((this.totalTyped / 5) / (elapsedSec / 60)) : 0;
        const acc = this.totalTyped > 0 ? Math.floor(((this.totalTyped - this.misses) / this.totalTyped) * 100) : 100;
        document.getElementById('wpm').innerText = wpm;
        document.getElementById('accuracy').innerText = acc;
    }

    endGame() {
        this.state = "RESULT";
        cancelAnimationFrame(this.timerInterval);
        this.totalTimeMs = performance.now() - this.startTime;

        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('result-screen').classList.remove('hidden');

        const wpm = parseInt(document.getElementById('wpm').innerText);
        const acc = parseInt(document.getElementById('accuracy').innerText);
        const score = Math.floor(wpm * (acc/100)**2);

        document.getElementById('res-score').innerText = score;
        document.getElementById('res-time').innerText = this.formatTimeResult(this.totalTimeMs);
        document.getElementById('res-wpm').innerText = wpm;
        document.getElementById('res-acc').innerText = acc;
        document.getElementById('res-miss').innerText = this.misses;
        document.getElementById('result-rank').innerText = this.getRank(score);

        const weak = Object.entries(this.missMap).sort((a,b)=>b[1]-a[1]).slice(0,3);
        document.getElementById('res-weak').innerHTML = weak.map(w => `<span class="key-box">${w[0].toUpperCase()}</span>`).join('');
    }

    formatTimeResult(ms) {
        const m = Math.floor(ms / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        const msPart = Math.floor((ms % 1000) / 10);
        return `${m}分${s}秒${msPart}`;
    }

    getRank(s) {
        // SSS, SS, S, A+, A, A-, ..., E+, E, E-
        if(s >= 400) return "SSS"; if(s >= 370) return "SS"; if(s >= 340) return "S";
        if(s >= 310) return "A+"; if(s >= 280) return "A"; if(s >= 250) return "A-";
        if(s >= 220) return "B+"; if(s >= 190) return "B"; if(s >= 160) return "B-";
        if(s >= 130) return "C+"; if(s >= 100) return "C"; if(s >= 80) return "C-";
        if(s >= 60) return "D+";  if(s >= 40) return "D";  if(s >= 20) return "D-";
        if(s >= 15) return "E+";  if(s >= 10) return "E";  return "E-";
    }

    renderKeyboard() {
        const keys = "1234567890-^qwertyuiopasdfghjkl;zxcvbnm,./";
        const container = document.getElementById('keyboard');
        keys.split('').forEach(k => {
            const el = document.createElement('div');
            el.className = 'key'; el.id = `key-${k}`;
            el.innerText = k.toUpperCase();
            container.appendChild(el);
        });
    }

    highlightKey(char) {
        document.querySelectorAll('.key').forEach(k => k.classList.remove('highlight'));
        if (!char) return;
        const el = document.getElementById(`key-${char.toLowerCase()}`);
        if (el) el.classList.add('highlight');
    }

    logMiss(char) {
        if (!char) return;
        this.missMap[char] = (this.missMap[char] || 0) + 1;
    }

    flashError() {
        const area = document.getElementById('game-screen');
        area.style.backgroundColor = '#fff5f5';
        setTimeout(() => area.style.backgroundColor = 'transparent', 100);
    }

    playSound(freq, duration) {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain); gain.connect(this.audioCtx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);
        osc.start(); osc.stop(this.audioCtx.currentTime + duration);
    }
}
const app = new TypingApp();
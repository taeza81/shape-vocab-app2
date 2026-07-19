// --- Data Configuration ---
const vocabList = [
    { word: "둥글어요", icon: "<img src='clock.jpg' alt='시계' class='vocab-img' />", name: "시계" },
    { word: "납작해요", icon: "<img src='puzzle.jpg' alt='퍼즐 조각' class='vocab-img' />", name: "퍼즐 조각" },
    { word: "길쭉해요", icon: "<img src='straw.jpg' alt='빨대' class='vocab-img' />", name: "빨대" },
    { word: "뾰족해요", icon: "<img src='umbrella.jpg' alt='우산' class='vocab-img' />", name: "우산" },
    { word: "울퉁불퉁해요", icon: "<img src='stone.jpg' alt='돌멩이' class='vocab-img' />", name: "돌멩이" }
];

// Initialize Audio Context for sound effects
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// --- Tab Navigation Logic ---
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');

        if (targetId === 'tracing') resizeCanvas();
        if (targetId === 'matching') initMatching();
    });
});

// ==========================================
// Feature 1: Word Tracing (글자 따라 쓰기)
// ==========================================
const canvas = document.getElementById('tracingCanvas');
const wrapper = document.getElementById('tracingWrapper');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
let isDrawing = false;
let currentWordIndex = 0;

function resizeCanvas() {
    canvas.width = wrapper.clientWidth;
    canvas.height = wrapper.clientHeight;
    drawBackgroundWord();
}

window.addEventListener('resize', () => {
    if (document.getElementById('tracing').classList.contains('active')) {
        resizeCanvas();
    }
});

function drawBackgroundWord() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const word = vocabList[currentWordIndex].word;
    
    // Scale font size up, taking up to 90% of width or 75% of height
    const fontSize = Math.min((canvas.width * 0.95) / word.length, canvas.height * 0.75);
    
    ctx.font = `bold ${fontSize}px 'Malgun Gothic', sans-serif`;
    ctx.fillStyle = "#e9ecef"; 
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(word, canvas.width / 2, canvas.height / 2 + (fontSize*0.05));
}

function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (e.type.includes('mouse')) {
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    } else {
        return {
            x: (e.touches[0].clientX - rect.left) * scaleX,
            y: (e.touches[0].clientY - rect.top) * scaleY
        };
    }
}

function startDrawing(e) {
    isDrawing = true;
    draw(e);
}

function stopDrawing() {
    isDrawing = false;
    ctx.beginPath();
}

function draw(e) {
    if (!isDrawing) return;
    e.preventDefault(); 

    const { x, y } = getCoordinates(e);

    ctx.lineWidth = 15; 
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#4a90e2";

    ctx.lineTo(x, y);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(x, y);
}

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);
canvas.addEventListener('touchstart', startDrawing, { passive: false });
canvas.addEventListener('touchmove', draw, { passive: false });
canvas.addEventListener('touchend', stopDrawing);
canvas.addEventListener('touchcancel', stopDrawing);

document.getElementById('btnClear').addEventListener('click', drawBackgroundWord);
document.getElementById('btnNextWord').addEventListener('click', () => {
    currentWordIndex = (currentWordIndex + 1) % vocabList.length;
    drawBackgroundWord();
});

setTimeout(resizeCanvas, 100);


// ==========================================
// Feature 2: Matching (그림과 낱말 매칭 - 슬롯 시스템)
// ==========================================
const picturesRow = document.getElementById('picturesRow');
const wordsRow = document.getElementById('wordsRow');

let selectedPictureEl = null;
let selectedWordEl = null;
let matchedCount = 0;
let isTutorialMode = true;
let tutorialTargetWord = null;

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function speakTTS(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = 0.85; 
        utterance.pitch = 1.2; 
        utterance.volume = 1.0;
        window.speechSynthesis.speak(utterance);
    }
}

function initMatching(startAsTutorial = true) {
    isTutorialMode = startAsTutorial;
    
    // Update Header UI
    const badge = document.getElementById('tutorialBadge');
    const skipBtn = document.getElementById('btnSkipTutorial');
    if (badge && skipBtn) {
        if (isTutorialMode) {
            badge.textContent = '🌱 연습 모드';
            badge.classList.remove('real-mode');
            skipBtn.style.display = 'block';
        } else {
            badge.textContent = '🔥 실전 모드';
            badge.classList.add('real-mode');
            skipBtn.style.display = 'none';
        }
    }

    picturesRow.innerHTML = '';
    wordsRow.innerHTML = '';
    matchedCount = 0;
    selectedPictureEl = null;
    selectedWordEl = null;
    tutorialTargetWord = null;

    const shuffledPics = shuffleArray(vocabList);
    const shuffledWords = shuffleArray(vocabList);

    // Top Row: Pictures + Slots
    shuffledPics.forEach(item => {
        const container = document.createElement('div');
        container.className = 'picture-container';

        const picDiv = document.createElement('div');
        picDiv.className = 'match-item picture-item';
        picDiv.innerHTML = item.icon;
        picDiv.dataset.word = item.word;
        
        const slotDiv = document.createElement('div');
        slotDiv.className = 'word-slot';
        slotDiv.dataset.word = item.word;

        container.appendChild(picDiv);
        container.appendChild(slotDiv);
        picturesRow.appendChild(container);

        // Allow dropping word onto picture or slot
        [picDiv, slotDiv].forEach(target => {
            target.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (!picDiv.classList.contains('matched')) {
                    picDiv.classList.add('drag-over');
                    slotDiv.style.borderColor = 'var(--primary-color)';
                }
            });
            target.addEventListener('dragleave', () => {
                picDiv.classList.remove('drag-over');
                slotDiv.style.borderColor = '';
            });
            target.addEventListener('drop', (e) => {
                e.preventDefault();
                picDiv.classList.remove('drag-over');
                slotDiv.style.borderColor = '';
                
                if(picDiv.classList.contains('matched')) return;
                
                const draggedType = e.dataTransfer.getData('type');
                const draggedWord = e.dataTransfer.getData('word');
                
                if (draggedType === 'word') {
                    const sourceEl = document.querySelector(`.word-item[data-word="${draggedWord}"]`);
                    checkMatchLogic(picDiv, sourceEl, item.word, draggedWord);
                }
            });
        });

        // Picture Drag (Source)
        picDiv.draggable = true;
        picDiv.addEventListener('dragstart', (e) => {
            if(picDiv.classList.contains('matched')) { e.preventDefault(); return; }
            e.dataTransfer.setData('type', 'picture');
            e.dataTransfer.setData('word', item.word);
            setTimeout(() => picDiv.classList.add('selected'), 0); 
            speakTTS(item.name); // Say "시계", "돌멩이" instead of "둥글어요"
        });
        picDiv.addEventListener('dragend', () => picDiv.classList.remove('selected'));

        // Sequential Click
        picDiv.addEventListener('click', () => {
            speakTTS(item.name); // Say "시계", "돌멩이"
            if (picDiv.classList.contains('matched')) return;
            document.querySelectorAll('.picture-item').forEach(el => el.classList.remove('selected'));
            picDiv.classList.add('selected');
            selectedPictureEl = picDiv;
            checkSequentialMatch();
        });
    });

    // Bottom Row: Words
    shuffledWords.forEach(item => {
        const div = document.createElement('div');
        div.className = 'match-item word-item';
        div.textContent = item.word;
        div.dataset.word = item.word;

        // Word Drag (Source)
        div.draggable = true;
        div.addEventListener('dragstart', (e) => {
            if (div.classList.contains('matched')) { e.preventDefault(); return; }
            e.dataTransfer.setData('type', 'word');
            e.dataTransfer.setData('word', item.word);
            setTimeout(() => div.classList.add('selected'), 0);
            speakTTS(item.word);
        });
        div.addEventListener('dragend', () => div.classList.remove('selected'));

        // Allow dropping picture onto word
        div.addEventListener('dragover', (e) => {
            e.preventDefault(); 
            if(!div.classList.contains('matched')) div.classList.add('drag-over');
        });
        div.addEventListener('dragleave', () => div.classList.remove('drag-over'));
        div.addEventListener('drop', (e) => {
            e.preventDefault();
            div.classList.remove('drag-over');
            if(div.classList.contains('matched')) return;
            
            const draggedType = e.dataTransfer.getData('type');
            const draggedWord = e.dataTransfer.getData('word');
            if (draggedType === 'picture') {
                const sourceEl = document.querySelector(`.picture-item[data-word="${draggedWord}"]`);
                checkMatchLogic(sourceEl, div, draggedWord, item.word);
            }
        });

        // Sequential Click
        div.addEventListener('click', () => {
            speakTTS(item.word);
            if (div.classList.contains('matched')) return;
            document.querySelectorAll('.word-item').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            selectedWordEl = div;
            checkSequentialMatch();
        });

        wordsRow.appendChild(div);
    });

    if (isTutorialMode) {
        startTutorialStep();
    }
}

function startTutorialStep() {
    if (!isTutorialMode) return;
    
    const remainingPics = Array.from(document.querySelectorAll('.picture-item:not(.matched)'));
    if (remainingPics.length === 0) return;
    
    tutorialTargetWord = remainingPics[0].dataset.word;
    
    document.querySelectorAll('.match-item').forEach(el => {
        if (el.classList.contains('matched')) return;
        
        // Remove existing hands
        const hand = el.querySelector('.pointer-hand');
        if (hand) hand.remove();
        
        if (el.dataset.word === tutorialTargetWord) {
            el.classList.remove('tutorial-inactive');
            el.classList.add('tutorial-active');
            
            const newHand = document.createElement('div');
            newHand.className = 'pointer-hand';
            if (el.classList.contains('word-item')) {
                newHand.textContent = '👇';
                newHand.classList.add('hand-top');
            } else {
                newHand.textContent = '👆';
            }
            el.appendChild(newHand);
        } else {
            el.classList.remove('tutorial-active');
            el.classList.add('tutorial-inactive');
        }
    });
}

function checkSequentialMatch() {
    if (selectedPictureEl && selectedWordEl) {
        checkMatchLogic(selectedPictureEl, selectedWordEl, selectedPictureEl.dataset.word, selectedWordEl.dataset.word);
    }
}

function checkMatchLogic(picEl, wordEl, picWord, textWord) {
    if (picWord === textWord) {
        handleMatchSuccess(picEl, wordEl, picWord);
    } else {
        handleMatchFail(picEl, wordEl);
    }
}

function handleMatchSuccess(picEl, wordEl, word) {
    picEl.classList.remove('selected');
    wordEl.classList.remove('selected');
    
    if (selectedPictureEl === picEl) selectedPictureEl = null;
    if (selectedWordEl === wordEl) selectedWordEl = null;
    
    picEl.classList.add('matched');
    wordEl.classList.add('matched');

    // Clean up tutorial artifacts
    const hand1 = picEl.querySelector('.pointer-hand');
    if (hand1) hand1.remove();
    const hand2 = wordEl.querySelector('.pointer-hand');
    if (hand2) hand2.remove();
    picEl.classList.remove('tutorial-active');
    wordEl.classList.remove('tutorial-active');
    
    // Move the word into the slot
    const slot = document.querySelector(`.word-slot[data-word="${word}"]`);
    slot.innerHTML = '';
    
    // Customize word item to fit inside the slot perfectly
    wordEl.style.width = '100%';
    wordEl.style.height = '100%';
    wordEl.style.fontSize = '2.2rem';
    wordEl.style.margin = '0';
    wordEl.style.boxShadow = 'none';
    wordEl.style.border = 'none';
    
    slot.style.border = 'none';
    slot.appendChild(wordEl);
    
    matchedCount++;
    playDingDong();

    if (matchedCount === vocabList.length) {
        setTimeout(() => {
            celebrate();
            if (isTutorialMode) {
                document.getElementById('successModal').querySelector('h2').textContent = "연습 끝! 실전 시작!";
                document.getElementById('btnRestartMatching').textContent = "🔥 실전 시작하기";
                speakTTS("연습이 끝났어요. 실전 게임을 시작해볼까요?");
            } else {
                document.getElementById('successModal').querySelector('h2').textContent = "참 잘했어요!";
                document.getElementById('btnRestartMatching').textContent = "🔄 다시 하기";
                speakTTS("참 잘했어요!");
            }
            document.getElementById('successModal').classList.add('show');
        }, 600);
    } else {
        if (isTutorialMode) {
            setTimeout(startTutorialStep, 800);
        }
    }
}

function handleMatchFail(picEl, wordEl) {
    if (picEl) picEl.classList.add('shake-error');
    if (wordEl) wordEl.classList.add('shake-error');
    
    playBuzzer();

    setTimeout(() => {
        if (picEl) {
            picEl.classList.remove('shake-error');
            picEl.classList.remove('selected');
            if (selectedPictureEl === picEl) selectedPictureEl = null;
        }
        if (wordEl) {
            wordEl.classList.remove('shake-error');
            wordEl.classList.remove('selected');
            if (selectedWordEl === wordEl) selectedWordEl = null;
        }
    }, 400);
}

initMatching();

document.getElementById('btnSkipTutorial').addEventListener('click', () => {
    initMatching(false); // start real mode
});

document.getElementById('btnRestartMatching').addEventListener('click', () => {
    document.getElementById('successModal').classList.remove('show');
    if (isTutorialMode && matchedCount === vocabList.length) {
        // Finished tutorial, switch to real mode
        initMatching(false);
    } else {
        // Restarting current mode
        initMatching(isTutorialMode);
    }
});

// ==========================================
// Utility: Sound and Celebration
// ==========================================
function playDingDong() {
    if(audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';
    
    osc1.frequency.setValueAtTime(880, audioCtx.currentTime); 
    osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.3); 
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc1.start(audioCtx.currentTime);
    osc1.stop(audioCtx.currentTime + 0.3);
    osc2.start(audioCtx.currentTime + 0.3);
    osc2.stop(audioCtx.currentTime + 1.2);
}

function playBuzzer() {
    if(audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime); 
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.3);
}

function celebrate() {
    if (window.confetti) {
        confetti({
            particleCount: 200,
            spread: 120,
            origin: { y: 0.5 },
            zIndex: 9999, // Ensure it shows above the modal overlay!
            colors: ['#ffc9c9', '#b197fc', '#a5d8ff', '#69db7c', '#ffd43b']
        });
    }
    setTimeout(playDingDong, 100);
    setTimeout(playDingDong, 400);
}


// ==========================================
// Feature 3: AAC (음성으로 표현하기)
// ==========================================
const aacGallery = document.getElementById('aacGallery');

function initAAC() {
    aacGallery.innerHTML = '';
    vocabList.forEach(item => {
        const card = document.createElement('div');
        card.className = 'aac-card';
        card.tabIndex = 0;
        
        card.innerHTML = `
            <div class="aac-pic">${item.icon}</div>
            <div class="aac-label">${item.word}</div>
        `;

        const speakWord = () => {
            card.style.transform = 'scale(0.92)';
            card.style.borderColor = 'var(--primary-color)';
            
            setTimeout(() => {
                card.style.transform = '';
                card.style.borderColor = '';
            }, 200);

            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(item.word);
                utterance.lang = 'ko-KR';
                utterance.rate = 0.85; 
                utterance.pitch = 1.2; 
                utterance.volume = 1.0;
                window.speechSynthesis.speak(utterance);
            }
        };

        card.addEventListener('click', speakWord);
        card.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                speakWord();
            }
        });

        aacGallery.appendChild(card);
    });
}

initAAC();

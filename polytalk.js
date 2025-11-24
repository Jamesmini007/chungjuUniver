// PolyTalk 번역 시스템

// 상태 관리
const state = {
    selectedSubject: null,
    isTranslating: false,
    startTime: null,
    timerInterval: null,
    translations: [],
    currentSTT: '',
    currentHistoryItem: null,
    inputLanguage: 'ko',
    outputLanguages: ['LANGUAGE::ENGLISH']
};

// 샘플 과목 데이터
const subjects = [
    { id: 1, name: '웹 프로그래밍', code: 'CS101', color: '#4682B4' },
    { id: 2, name: '데이터베이스 시스템', code: 'CS201', color: '#10b981' },
    { id: 3, name: '인공지능 기초', code: 'CS301', color: '#f59e0b' },
    { id: 4, name: '소프트웨어 공학', code: 'CS401', color: '#ef4444' },
    { id: 5, name: '컴퓨터 네트워크', code: 'CS501', color: '#8b5cf6' }
];

// 과목 ID로 색상 가져오기
function getSubjectColor(subjectId) {
    const subject = subjects.find(s => s.id == subjectId);
    return subject ? subject.color : '#4682B4';
}

// DOM 요소
const elements = {
    subjectModal: document.getElementById('subjectModal'),
    closeModal: document.getElementById('closeModal'),
    subjectList: document.getElementById('subjectList'),
    subjectSelectBtn: document.getElementById('subjectSelectBtn'),
    subjectSelectText: document.getElementById('subjectSelectText'),
    startBtn: document.getElementById('startBtn'),
    stopBtn: document.getElementById('stopBtn'),
    timer: document.getElementById('timer'),
    realtimeCaption: document.getElementById('cp_cols_content_1'),
    translatedCaption: document.querySelector('#cp_cols_en .cp_cols_content'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage')
};

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    // localStorage에서 저장된 설정 불러오기
    const savedInputLanguage = localStorage.getItem('inputLanguage');
    if (savedInputLanguage) {
        state.inputLanguage = savedInputLanguage;
    }
    
    const savedOutputLanguages = localStorage.getItem('outputLanguages');
    if (savedOutputLanguages) {
        try {
            state.outputLanguages = JSON.parse(savedOutputLanguages);
        } catch (e) {
            console.error('Failed to parse outputLanguages from localStorage', e);
        }
    }
    
    // 페이지 로드 시 과목 선택 모달 표시
    showSubjectModal();
    
    // Room Code 생성 및 표시
    displayRoomCode();
    
    // 이벤트 리스너 등록
    elements.subjectSelectBtn.addEventListener('click', showSubjectModal);
    elements.closeModal.addEventListener('click', hideSubjectModal);
    elements.startBtn.addEventListener('click', startTranslation);
    elements.stopBtn.addEventListener('click', stopTranslation);
    
    // 모달 외부 클릭 시 닫기
    elements.subjectModal.addEventListener('click', (e) => {
        if (e.target === elements.subjectModal) {
            hideSubjectModal();
        }
    });
    
    // Room Code 모달 외부 클릭 시 닫기
    const roomCodeModal = document.getElementById('roomCodeModal');
    if (roomCodeModal) {
        roomCodeModal.addEventListener('click', (e) => {
            if (e.target === roomCodeModal) {
                closeRoomCodeModal();
            }
        });
    }
    
    // 과목 목록 렌더링
    renderSubjectList();
    
    // Output Languages 체크박스 최대 3개 선택 제한
    setupLanguageCheckboxLimits();
    
    // Translated 박스 구분 영역 초기화
    updateTranslatedLayout();
}

// Output Languages 체크박스 최대 3개 선택 제한 설정
function setupLanguageCheckboxLimits() {
    // 과목 선택 모달의 체크박스
    const subjectModalCheckboxes = document.querySelectorAll('input[name="subjectModal_speakerLanguageCd"]');
    subjectModalCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const checkedCount = document.querySelectorAll('input[name="subjectModal_speakerLanguageCd"]:checked').length;
            if (checkedCount > 3) {
                this.checked = false;
                showToast('최대 3개까지 선택할 수 있습니다.');
            }
            // 레이아웃은 저장 시에만 업데이트
        });
    });
    
    // Language Settings 모달의 체크박스
    const popupCheckboxes = document.querySelectorAll('input[name="popup_speakerLanguageCd"]');
    popupCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const checkedCount = document.querySelectorAll('input[name="popup_speakerLanguageCd"]:checked').length;
            if (checkedCount > 3) {
                this.checked = false;
                showToast('최대 3개까지 선택할 수 있습니다.');
            }
            // 레이아웃은 저장 시에만 업데이트
        });
    });
}

// Translated 박스를 선택된 언어 수에 맞게 구분 영역 생성
function updateTranslatedLayout() {
    const container = document.getElementById('translatedContentContainer');
    if (!container) return;
    
    // 현재 선택된 언어 가져오기
    const selectedLanguages = [];
    
    // state에 저장된 언어를 우선적으로 사용
    if (state.outputLanguages.length > 0) {
        selectedLanguages.push(...state.outputLanguages);
    } else {
        // state가 없으면 체크박스에서 가져오기
        const subjectModalCheckboxes = document.querySelectorAll('input[name="subjectModal_speakerLanguageCd"]:checked');
        const popupCheckboxes = document.querySelectorAll('input[name="popup_speakerLanguageCd"]:checked');
        
        const checkboxes = subjectModalCheckboxes.length > 0 ? subjectModalCheckboxes : popupCheckboxes;
        checkboxes.forEach(cb => {
            selectedLanguages.push(cb.value);
        });
    }
    
    // 기본값: 영어
    if (selectedLanguages.length === 0) {
        selectedLanguages.push('LANGUAGE::ENGLISH');
    }
    
    // 언어 이름 매핑
    const languageNames = {
        'LANGUAGE::ENGLISH': 'English',
        'LANGUAGE::CHINESE': '中文',
        'LANGUAGE::JAPANESE': '日本語',
        'LANGUAGE::VIETNAMESE': 'Tiếng Việt'
    };
    
    // 기존 번역 내용 백업 (각 언어별로)
    const existingContent = {};
    const existingSections = container.querySelectorAll('.translated-lang-section');
    existingSections.forEach(section => {
        const lang = section.getAttribute('data-language');
        const langContent = section.querySelector('.translated-lang-content');
        if (langContent) {
            const textContainer = langContent.querySelector('.translated-text-container');
            if (textContainer) {
                existingContent[lang] = textContainer.innerHTML;
            }
        }
    });
    
    // 기존 내용 제거
    container.innerHTML = '';
    
    // 선택된 언어 수에 맞게 구분 영역 생성
    selectedLanguages.forEach((lang, index) => {
        const langSection = document.createElement('div');
        langSection.className = 'translated-lang-section';
        langSection.id = `translated-lang-${index}`;
        langSection.setAttribute('data-language', lang);
        
        const langName = languageNames[lang] || lang;
        langSection.innerHTML = `
            <div class="translated-lang-header">
                <span class="translated-lang-title">${langName}</span>
                <button class="lang-close-btn" onclick="closeLanguageBox('${lang}', ${index})" title="닫기">
                    <span class="lang-close-icon">×</span>
                </button>
            </div>
            <div class="translated-lang-content" id="translated-lang-content-${index}">
                <!-- 번역 내용이 여기에 표시됩니다 -->
            </div>
        `;
        
        container.appendChild(langSection);
        
        // 기존 번역 내용 복원
        if (existingContent[lang]) {
            const langContent = langSection.querySelector('.translated-lang-content');
            if (langContent) {
                const textContainer = document.createElement('div');
                textContainer.className = 'translated-text-container';
                textContainer.innerHTML = existingContent[lang];
                langContent.appendChild(textContainer);
                
                // 스크롤을 맨 아래로
                langContent.scrollTop = langContent.scrollHeight;
            }
        }
    });
    
    // 닫기 버튼 상태 업데이트
    updateCloseButtonsState();
}

// 닫기 버튼 상태 업데이트 함수 (마지막 하나일 때 비활성화)
function updateCloseButtonsState() {
    const container = document.getElementById('translatedContentContainer');
    if (!container) return;
    
    const visibleSections = container.querySelectorAll('.translated-lang-section:not(.hidden)');
    const isLastOne = visibleSections.length <= 1;
    
    // 모든 닫기 버튼 상태 업데이트
    visibleSections.forEach(section => {
        const closeBtn = section.querySelector('.lang-close-btn');
        if (closeBtn) {
            if (isLastOne) {
                closeBtn.disabled = true;
                closeBtn.style.opacity = '0.5';
                closeBtn.style.cursor = 'not-allowed';
            } else {
                closeBtn.disabled = false;
                closeBtn.style.opacity = '1';
                closeBtn.style.cursor = 'pointer';
            }
        }
    });
}

// 과목 선택 모달 표시
function showSubjectModal() {
    elements.subjectModal.classList.add('active');
    // 과목 선택 화면으로 초기화
    showSubjectStep();
}

// 과목 선택 모달 숨기기
function hideSubjectModal() {
    elements.subjectModal.classList.remove('active');
    // 과목 선택 화면으로 리셋
    showSubjectStep();
    updateButtonStates();
}

// 과목 선택 화면 표시
function showSubjectStep() {
    const subjectStep = document.getElementById('subjectStep');
    const languageStep = document.getElementById('languageStep');
    const modalTitle = document.getElementById('modalTitle');
    
    if (subjectStep) subjectStep.style.display = 'block';
    if (languageStep) languageStep.style.display = 'none';
    if (modalTitle) modalTitle.textContent = '과목 선택';
}

// 언어 설정 화면 표시
function showLanguageStep() {
    const subjectStep = document.getElementById('subjectStep');
    const languageStep = document.getElementById('languageStep');
    const modalTitle = document.getElementById('modalTitle');
    
    if (subjectStep) subjectStep.style.display = 'none';
    if (languageStep) languageStep.style.display = 'block';
    if (modalTitle) modalTitle.textContent = '언어 설정';
    
    // 현재 설정된 언어 값 불러오기 (localStorage 우선, 그 다음 state, 마지막 기본값)
    const inputSelect = document.getElementById('subjectModal_inputLanguageCd');
    const speakerSelect = document.getElementById('speakerLanguageCd');
    if (inputSelect) {
        const savedInputLanguage = localStorage.getItem('inputLanguage');
        inputSelect.value = savedInputLanguage || state.inputLanguage || (speakerSelect ? speakerSelect.value : 'ko');
        // state에도 반영
        if (savedInputLanguage) {
            state.inputLanguage = savedInputLanguage;
        }
    }
    
    // Output Languages 체크박스 상태 불러오기
    const outputCheckboxes = document.querySelectorAll('input[name="subjectModal_speakerLanguageCd"]');
    if (state.outputLanguages.length > 0) {
        outputCheckboxes.forEach(cb => {
            cb.checked = state.outputLanguages.includes(cb.value);
        });
    } else {
        // 기본값: 영어만 체크
        outputCheckboxes.forEach(cb => {
            cb.checked = cb.value === 'LANGUAGE::ENGLISH';
        });
    }
}

// 과목 선택 화면으로 돌아가기
function goBackToSubjectStep() {
    showSubjectStep();
}

// 과목 목록 렌더링
function renderSubjectList() {
    elements.subjectList.innerHTML = '';
    
    subjects.forEach(subject => {
        const item = document.createElement('div');
        item.className = 'subject-item';
        item.innerHTML = `
            <div class="subject-name">${subject.name}</div>
            <div class="subject-code">${subject.code}</div>
        `;
        item.addEventListener('click', () => selectSubject(subject, item));
        elements.subjectList.appendChild(item);
    });
}

// 과목 선택
function selectSubject(subject, element) {
    state.selectedSubject = subject;
    
    // 선택된 과목 표시
    document.querySelectorAll('.subject-item').forEach(item => {
        item.classList.remove('selected');
    });
    element.classList.add('selected');
    
    // 버튼 텍스트 업데이트
    elements.subjectSelectText.textContent = subject.name;
    
    // 언어 설정 화면으로 전환
    setTimeout(() => {
        showLanguageStep();
    }, 300);
}

// 버튼 상태 업데이트
function updateButtonStates() {
    if (state.selectedSubject && !state.isTranslating) {
        elements.startBtn.disabled = false;
        elements.stopBtn.disabled = true;
    } else if (state.isTranslating) {
        elements.startBtn.disabled = true;
        elements.stopBtn.disabled = false;
    } else {
        elements.startBtn.disabled = true;
        elements.stopBtn.disabled = true;
    }
}

// 번역 시작
function startTranslation() {
    if (!state.selectedSubject) {
        showToast('과목을 선택해주세요.');
        showSubjectModal();
        return;
    }
    
    state.isTranslating = true;
    state.startTime = new Date();
    state.translations = [];
    state.currentSTT = '';
    state.currentHistoryItem = null;
    
    // 타이머 시작
    startTimer();
    
    // 번역 기록 섹션 표시 및 초기화
    showHistorySection();
    createCurrentHistoryItem();
    
    // 실시간 STT 및 번역 시뮬레이션 시작
    startSTTSimulation();
    
    // UI 업데이트
    updateButtonStates();
    clearCaptions();
    
    showToast(`${state.selectedSubject.name} 번역이 시작되었습니다.`);
}

// 번역 종료
function stopTranslation() {
    if (!state.isTranslating) {
        return;
    }
    
    state.isTranslating = false;
    
    // 타이머 정지
    stopTimer();
    
    // STT 시뮬레이션 정지
    stopSTTSimulation();
    
    // 저장 중 모달 표시
    showSavingModal();
    
    // 번역 데이터 저장 (비동기 처리)
    setTimeout(() => {
        // 마지막 문장을 번역 기록에 추가
        if (state.translations.length > 0) {
            const lastTranslation = state.translations[state.translations.length - 1];
            if (!lastTranslation.addedToHistory) {
                addTranslationToHistory(lastTranslation);
                lastTranslation.addedToHistory = true;
            }
        }
        
        // 현재 번역 기록 업데이트
        if (state.currentHistoryItem) {
            updateCurrentHistoryItem();
        }
        
        // 번역 데이터 저장
        saveTranslationData();
        
        // 저장 완료 후 모달 닫기
        setTimeout(() => {
            hideSavingModal();
        }, 500);
    }, 500);
    
    // UI 업데이트
    updateButtonStates();
}

// 타이머 시작
function startTimer() {
    updateTimer();
    state.timerInterval = setInterval(updateTimer, 1000); // 1초마다 업데이트
}

// 타이머 업데이트
function updateTimer() {
    if (!state.startTime) return;
    
    const now = new Date();
    const diff = now - state.startTime;
    
    const hours = Math.floor(diff / 3600000).toString().padStart(2, '0');
    const minutes = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
    const seconds = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
    
    elements.timer.textContent = `${hours}:${minutes}:${seconds}`;
}

// 타이머 정지
function stopTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
}

// STT 시뮬레이션 시작
let sttSimulationInterval = null;

function startSTTSimulation() {
    const sampleSentences = [
        '안녕하세요. 오늘은 웹 프로그래밍에 대해 배워보겠습니다.',
        '먼저 HTML과 CSS의 기본 개념을 설명하겠습니다.',
        'HTML은 웹 페이지의 구조를 정의하는 마크업 언어입니다.',
        'CSS는 웹 페이지의 스타일을 정의하는 스타일시트 언어입니다.',
        'JavaScript는 웹 페이지에 동적인 기능을 추가하는 프로그래밍 언어입니다.',
        '오늘 수업은 여기까지입니다. 다음 시간에 뵙겠습니다.'
    ];
    
    let sentenceIndex = 0;
    
    sttSimulationInterval = setInterval(() => {
        if (!state.isTranslating) return;
        
        if (sentenceIndex < sampleSentences.length) {
            const sentence = sampleSentences[sentenceIndex];
            const translated = translateSentence(sentence);
            state.currentSTT = sentence;
            
            // 이전 문장을 번역 기록에 추가 (첫 문장이 아닐 때)
            if (sentenceIndex > 0 && state.translations.length > 0) {
                const previousTranslation = state.translations[state.translations.length - 1];
                if (!previousTranslation.addedToHistory) {
                    addTranslationToHistory(previousTranslation);
                    previousTranslation.addedToHistory = true;
                }
            }
            
            // 실시간 자막에 추가 (한 문장만 표시)
            addRealtimeCaption(sentence);
            
            // 번역된 텍스트 추가 (시뮬레이션, 한 문장만 표시)
            setTimeout(() => {
                addTranslatedCaption(translated);
            }, 500);
            
            // 번역 데이터 저장 (여러 언어를 하나의 문자열로 결합하여 저장)
            const translation = {
                original: sentence,
                translated: translated.map(t => t.text).join(' | '), // 여러 언어를 구분자로 결합
                translations: translated, // 각 언어별 번역도 별도로 저장
                timestamp: new Date(),
                addedToHistory: false
            };
            state.translations.push(translation);
            
            sentenceIndex++;
        } else {
            // 모든 문장을 표시한 후 반복
            sentenceIndex = 0;
        }
    }, 3000); // 3초마다 새 문장 추가
}

// STT 시뮬레이션 정지
function stopSTTSimulation() {
    if (sttSimulationInterval) {
        clearInterval(sttSimulationInterval);
        sttSimulationInterval = null;
    }
}

// 번역 함수 (시뮬레이션)
function translateSentence(sentence) {
    // 실제로는 API를 호출하여 번역하지만, 여기서는 시뮬레이션
    // 설정된 Output Languages에 따라 번역 생성
    const translations = {
        '안녕하세요. 오늘은 웹 프로그래밍에 대해 배워보겠습니다.': {
            'LANGUAGE::ENGLISH': 'Hello. Today we will learn about web programming.',
            'LANGUAGE::CHINESE': '你好。今天我们将学习网络编程。',
            'LANGUAGE::JAPANESE': 'こんにちは。今日はウェブプログラミングについて学びます。',
            'LANGUAGE::VIETNAMESE': 'Xin chào. Hôm nay chúng ta sẽ học về lập trình web.',
            'default': 'Hello. Today we will learn about web programming.'
        },
        '먼저 HTML과 CSS의 기본 개념을 설명하겠습니다.': {
            'LANGUAGE::ENGLISH': 'First, I will explain the basic concepts of HTML and CSS.',
            'LANGUAGE::CHINESE': '首先，我将解释HTML和CSS的基本概念。',
            'LANGUAGE::JAPANESE': 'まず、HTMLとCSSの基本概念を説明します。',
            'LANGUAGE::VIETNAMESE': 'Đầu tiên, tôi sẽ giải thích các khái niệm cơ bản của HTML và CSS.',
            'default': 'First, I will explain the basic concepts of HTML and CSS.'
        },
        'HTML은 웹 페이지의 구조를 정의하는 마크업 언어입니다.': {
            'LANGUAGE::ENGLISH': 'HTML is a markup language that defines the structure of web pages.',
            'LANGUAGE::CHINESE': 'HTML是定义网页结构的标记语言。',
            'LANGUAGE::JAPANESE': 'HTMLは、ウェブページの構造を定義するマークアップ言語です。',
            'LANGUAGE::VIETNAMESE': 'HTML là ngôn ngữ đánh dấu định nghĩa cấu trúc của các trang web.',
            'default': 'HTML is a markup language that defines the structure of web pages.'
        },
        'CSS는 웹 페이지의 스타일을 정의하는 스타일시트 언어입니다.': {
            'LANGUAGE::ENGLISH': 'CSS is a stylesheet language that defines the style of web pages.',
            'LANGUAGE::CHINESE': 'CSS是定义网页样式的样式表语言。',
            'LANGUAGE::JAPANESE': 'CSSは、ウェブページのスタイルを定義するスタイルシート言語です。',
            'LANGUAGE::VIETNAMESE': 'CSS là ngôn ngữ bảng định kiểu định nghĩa phong cách của các trang web.',
            'default': 'CSS is a stylesheet language that defines the style of web pages.'
        },
        'JavaScript는 웹 페이지에 동적인 기능을 추가하는 프로그래밍 언어입니다.': {
            'LANGUAGE::ENGLISH': 'JavaScript is a programming language that adds dynamic functionality to web pages.',
            'LANGUAGE::CHINESE': 'JavaScript是一种为网页添加动态功能的编程语言。',
            'LANGUAGE::JAPANESE': 'JavaScriptは、ウェブページに動的な機能を追加するプログラミング言語です。',
            'LANGUAGE::VIETNAMESE': 'JavaScript là ngôn ngữ lập trình thêm chức năng động vào các trang web.',
            'default': 'JavaScript is a programming language that adds dynamic functionality to web pages.'
        },
        '오늘 수업은 여기까지입니다. 다음 시간에 뵙겠습니다.': {
            'LANGUAGE::ENGLISH': 'That\'s all for today\'s class. See you next time.',
            'LANGUAGE::CHINESE': '今天的课程到此结束。下次见。',
            'LANGUAGE::JAPANESE': '今日の授業はここまでです。次回お会いしましょう。',
            'LANGUAGE::VIETNAMESE': 'Đó là tất cả cho lớp học hôm nay. Hẹn gặp lại lần sau.',
            'default': 'That\'s all for today\'s class. See you next time.'
        }
    };
    
    const sentenceTranslations = translations[sentence];
    if (!sentenceTranslations) {
        // 선택된 언어가 없으면 기본값 반환
        if (state.outputLanguages.length > 0) {
            return state.outputLanguages.map(lang => ({
                language: lang,
                text: `[Translated: ${sentence}]`
            }));
        }
        return [{ language: 'default', text: `[Translated: ${sentence}]` }];
    }
    
    // 설정된 모든 Output Languages에 대한 번역 반환
    const result = [];
    if (state.outputLanguages.length > 0) {
        state.outputLanguages.forEach(lang => {
            const translatedText = sentenceTranslations[lang] || sentenceTranslations['default'];
            result.push({
                language: lang,
                text: translatedText
            });
        });
    } else {
        // 선택된 언어가 없으면 기본값 반환
        result.push({
            language: 'default',
            text: sentenceTranslations['default'] || `[Translated: ${sentence}]`
        });
    }
    
    return result;
}

// 실시간 자막 추가 (계속 추가)
function addRealtimeCaption(text) {
    // 기존 텍스트 요소가 없으면 생성
    let textContainer = elements.realtimeCaption.querySelector('.realtime-text-container');
    if (!textContainer) {
        textContainer = document.createElement('div');
        textContainer.className = 'realtime-text-container';
        elements.realtimeCaption.appendChild(textContainer);
    }
    
    // 기존 텍스트에 공백을 추가하여 이어서 표시
    if (textContainer.textContent) {
        textContainer.textContent += ' ' + text;
    } else {
        textContainer.textContent = text;
    }
    
    // 스크롤을 맨 아래로
    elements.realtimeCaption.scrollTop = elements.realtimeCaption.scrollHeight;
}

// 번역된 자막 추가 (계속 추가) - 언어별 구분 영역에 표시
function addTranslatedCaption(translations) {
    // 언어별 구분 영역에 번역 추가
    if (Array.isArray(translations)) {
        translations.forEach((trans) => {
            const langSection = document.querySelector(`[data-language="${trans.language}"]`);
            if (langSection) {
                const langContent = langSection.querySelector('.translated-lang-content');
                if (langContent) {
                    // 기존 텍스트 요소가 없으면 생성
                    let textContainer = langContent.querySelector('.translated-text-container');
                    if (!textContainer) {
                        textContainer = document.createElement('div');
                        textContainer.className = 'translated-text-container';
                        langContent.appendChild(textContainer);
                    }
                    
                    // 기존 텍스트에 공백을 추가하여 이어서 표시
                    if (textContainer.textContent) {
                        textContainer.textContent += ' ' + trans.text;
                    } else {
                        textContainer.textContent = trans.text;
                    }
                    
                    // 스크롤을 맨 아래로
                    langContent.scrollTop = langContent.scrollHeight;
                }
            }
        });
    } else {
        // 기존 호환성을 위해 문자열인 경우도 처리
        const firstLangSection = document.querySelector('.translated-lang-section');
        if (firstLangSection) {
            const langContent = firstLangSection.querySelector('.translated-lang-content');
            if (langContent) {
                // 기존 텍스트 요소가 없으면 생성
                let textContainer = langContent.querySelector('.translated-text-container');
                if (!textContainer) {
                    textContainer = document.createElement('div');
                    textContainer.className = 'translated-text-container';
                    langContent.appendChild(textContainer);
                }
                
                // 기존 텍스트에 공백을 추가하여 이어서 표시
                if (textContainer.textContent) {
                    textContainer.textContent += ' ' + translations;
                } else {
                    textContainer.textContent = translations;
                }
                
                // 스크롤을 맨 아래로
                langContent.scrollTop = langContent.scrollHeight;
            }
        }
    }
}

// 자막 영역 초기화
function clearCaptions() {
    // 제목을 제외한 모든 내용 제거
    const realtimeItems = elements.realtimeCaption.querySelectorAll('.translation-item, .realtime-text-line, .realtime-text-container');
    const translatedItems = elements.translatedCaption.querySelectorAll('.translation-item');
    
    realtimeItems.forEach(item => item.remove());
    translatedItems.forEach(item => item.remove());
    
    // 번역 언어별 컨테이너도 제거
    const translatedContainers = document.querySelectorAll('.translated-text-container, .translated-text-line');
    translatedContainers.forEach(item => item.remove());
}

// 번역 데이터 저장
function saveTranslationData() {
    const translationData = {
        subjectId: state.selectedSubject.id,
        subjectName: state.selectedSubject.name,
        subjectCode: state.selectedSubject.code,
        startTime: state.startTime,
        endTime: new Date(),
        duration: new Date() - state.startTime,
        translations: state.translations
    };
    
    // localStorage에 저장 (실제로는 서버에 전송)
    const history = JSON.parse(localStorage.getItem('translationHistory') || '[]');
    history.push(translationData);
    localStorage.setItem('translationHistory', JSON.stringify(history));
    
    console.log('번역 데이터 저장됨:', translationData);
    
    // 번역 기록 다시 렌더링
    renderHistory();
}

// 저장 중 모달 표시
function showSavingModal() {
    const savingModal = document.getElementById('savingModal');
    if (savingModal) {
        savingModal.style.display = 'flex';
    }
}

// 저장 중 모달 숨기기
function hideSavingModal() {
    const savingModal = document.getElementById('savingModal');
    if (savingModal) {
        savingModal.style.display = 'none';
    }
}

// Toast 알림 표시
function showToast(message) {
    elements.toastMessage.textContent = message;
    elements.toast.classList.add('show');
    
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

// 랜덤 Room Code 생성 (4자리 숫자)
function generateRoomCode() {
    const numbers = '0123456789';
    const codeLength = 4;
    let code = '';
    
    // 4자리 숫자 생성
    for (let i = 0; i < codeLength; i++) {
        code += numbers[Math.floor(Math.random() * numbers.length)];
    }
    
    return code;
}

// Room Code를 화면에 표시
function displayRoomCode() {
    // localStorage에서 기존 Room Code 확인, 없으면 새로 생성
    let roomCode = localStorage.getItem('currentRoomCode');
    if (!roomCode) {
        roomCode = generateRoomCode();
    }
    
    // 띄어쓰기 제거 (기존 코드에 띄어쓰기가 있을 수 있음)
    roomCode = roomCode.replace(/\s/g, '');
    
    // 띄어쓰기 제거된 코드를 다시 저장
    localStorage.setItem('currentRoomCode', roomCode);
    
    // 상단 헤더의 Room Code 표시
    const roomCodeDisplayHeader = document.getElementById('roomCodeDisplayHeader');
    if (roomCodeDisplayHeader) {
        roomCodeDisplayHeader.textContent = roomCode;
    }
}

// Room Code 모달 표시
function showRoomCodeModal() {
    const modal = document.getElementById('roomCodeModal');
    const codeDisplay = document.getElementById('roomCodeDisplay');
    
    if (modal && codeDisplay) {
        // 새로고침 시마다 새로운 코드 생성
        const roomCode = generateRoomCode();
        codeDisplay.innerHTML = `<p class="code-text">${roomCode}</p>`;
        modal.classList.add('active');
    }
}

// Room Code 모달 닫기
function closeRoomCodeModal() {
    const modal = document.getElementById('roomCodeModal');
    if (modal) {
        modal.classList.remove('active');
    }
}


// Language Settings 모달 관련 함수
function showLanguagePopup() {
    const languageModal = document.getElementById('languageModal');
    if (languageModal) {
        languageModal.classList.add('active');
        
        // 현재 설정된 값 불러오기 (localStorage 우선, 그 다음 state, 마지막 기본값)
        const speakerSelect = document.getElementById('speakerLanguageCd');
        const inputSelect = document.getElementById('popup_inputLanguageCd');
        if (inputSelect) {
            const savedInputLanguage = localStorage.getItem('inputLanguage');
            inputSelect.value = savedInputLanguage || state.inputLanguage || (speakerSelect ? speakerSelect.value : 'ko');
            // state에도 반영
            if (savedInputLanguage) {
                state.inputLanguage = savedInputLanguage;
            }
        }
        
        // Output Languages 체크박스 상태 불러오기 (state에 저장된 설정 우선)
        const outputCheckboxes = document.querySelectorAll('input[name="popup_speakerLanguageCd"]');
        if (state.outputLanguages.length > 0) {
            // state에 저장된 설정 사용
            outputCheckboxes.forEach(cb => {
                cb.checked = state.outputLanguages.includes(cb.value);
            });
        } else {
            // form에서 불러오기 (기존 로직)
            const form = document.getElementById('form-language-update');
            if (form) {
                const checkboxes = form.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(checkbox => {
                    const value = checkbox.value;
                    let outputCheckbox = null;
                    
                    if (value === 'LANGUAGE::ENGLISH') {
                        outputCheckbox = document.getElementById('popup_speakerLanguageCd_1');
                    } else if (value === 'LANGUAGE::CHINESE') {
                        outputCheckbox = document.getElementById('popup_speakerLanguageCd_2');
                    } else if (value === 'LANGUAGE::JAPANESE') {
                        outputCheckbox = document.getElementById('popup_speakerLanguageCd_3');
                    }
                    
                    if (outputCheckbox) {
                        outputCheckbox.checked = checkbox.checked;
                    }
                });
            }
        }
    }
}

// 과목 및 언어 설정 저장 (과목 선택 모달에서)
function saveSubjectAndLanguageSettings() {
    // 과목 선택 확인
    if (!state.selectedSubject) {
        showToast('과목을 선택해주세요.');
        showSubjectStep();
        return;
    }
    
    // Input Language 저장
    const inputSelect = document.getElementById('subjectModal_inputLanguageCd');
    const speakerSelect = document.getElementById('speakerLanguageCd');
    if (inputSelect && speakerSelect) {
        speakerSelect.value = inputSelect.value;
        // 상태에 저장
        state.inputLanguage = inputSelect.value;
        // localStorage에 저장
        localStorage.setItem('inputLanguage', inputSelect.value);
    }
    
    // Output Languages 저장
    const outputCheckboxes = document.querySelectorAll('input[name="subjectModal_speakerLanguageCd"]:checked');
    const form = document.getElementById('form-language-update');
    
    // 최소 하나의 언어는 선택되어야 함
    if (outputCheckboxes.length === 0) {
        showToast('최소 하나의 출력 언어를 선택해주세요.');
        return;
    }
    
    // 상태에 저장
    state.outputLanguages = [];
    outputCheckboxes.forEach(cb => {
        state.outputLanguages.push(cb.value);
    });
    // localStorage에 저장
    localStorage.setItem('outputLanguages', JSON.stringify(state.outputLanguages));
    
    if (form) {
        // 모든 체크박스 해제
        const formCheckboxes = form.querySelectorAll('input[type="checkbox"]');
        formCheckboxes.forEach(cb => cb.checked = false);
        
        // 선택된 언어에 따라 체크
        outputCheckboxes.forEach(outputCb => {
            const value = outputCb.value;
            let formCheckbox = null;
            
            if (value === 'LANGUAGE::ENGLISH') {
                formCheckbox = document.getElementById('languageCd_1');
            } else if (value === 'LANGUAGE::CHINESE') {
                formCheckbox = document.getElementById('languageCd_2');
            } else if (value === 'LANGUAGE::JAPANESE') {
                formCheckbox = document.getElementById('languageCd_3');
            } else if (value === 'LANGUAGE::VIETNAMESE') {
                formCheckbox = document.getElementById('languageCd_4');
            }
            
            if (formCheckbox) {
                formCheckbox.checked = true;
            }
        });
    }
    
    // 강의 내용 백업 (언어 설정 변경 시 유지)
    const realtimeContent = elements.realtimeCaption ? elements.realtimeCaption.innerHTML : '';
    
    // Translated 박스 구분 영역 업데이트
    updateTranslatedLayout();
    
    // 강의 내용 복원 (언어 설정 변경 시 유지)
    if (realtimeContent && elements.realtimeCaption) {
        elements.realtimeCaption.innerHTML = realtimeContent;
    }
    
    showToast('과목 및 언어 설정이 저장되었습니다.');
    hideSubjectModal();
    
    // 설정이 변경되었으므로 번역 중이면 재시작 알림
    if (state.isTranslating) {
        showToast('설정이 변경되었습니다. 번역을 재시작해주세요.');
    }
}

function closeLanguageModal() {
    const languageModal = document.getElementById('languageModal');
    if (languageModal) {
        languageModal.classList.remove('active');
    }
}

function saveLanguageSettings() {
    // Input Language 저장
    const inputSelect = document.getElementById('popup_inputLanguageCd');
    const speakerSelect = document.getElementById('speakerLanguageCd');
    if (inputSelect && speakerSelect) {
        speakerSelect.value = inputSelect.value;
        // 상태에 저장
        state.inputLanguage = inputSelect.value;
        // localStorage에 저장
        localStorage.setItem('inputLanguage', inputSelect.value);
    }
    
    // Output Languages 저장
    const outputCheckboxes = document.querySelectorAll('input[name="popup_speakerLanguageCd"]:checked');
    const form = document.getElementById('form-language-update');
    
    // 상태에 저장
    state.outputLanguages = [];
    outputCheckboxes.forEach(cb => {
        state.outputLanguages.push(cb.value);
    });
    // localStorage에 저장
    localStorage.setItem('outputLanguages', JSON.stringify(state.outputLanguages));
    
    if (form) {
        // 모든 체크박스 해제
        const formCheckboxes = form.querySelectorAll('input[type="checkbox"]');
        formCheckboxes.forEach(cb => cb.checked = false);
        
        // 선택된 언어에 따라 체크
        outputCheckboxes.forEach(outputCb => {
            const value = outputCb.value;
            let formCheckbox = null;
            
            if (value === 'LANGUAGE::ENGLISH') {
                formCheckbox = document.getElementById('languageCd_1');
            } else if (value === 'LANGUAGE::CHINESE') {
                formCheckbox = document.getElementById('languageCd_2');
            } else if (value === 'LANGUAGE::JAPANESE') {
                formCheckbox = document.getElementById('languageCd_3');
            } else if (value === 'LANGUAGE::VIETNAMESE') {
                formCheckbox = document.getElementById('languageCd_4');
            }
            
            if (formCheckbox) {
                formCheckbox.checked = true;
            }
        });
    }
    
    // 강의 내용 백업 (언어 설정 변경 시 유지)
    const realtimeContent = elements.realtimeCaption ? elements.realtimeCaption.innerHTML : '';
    
    // Translated 박스 구분 영역 업데이트
    updateTranslatedLayout();
    
    // 강의 내용 복원 (언어 설정 변경 시 유지)
    if (realtimeContent && elements.realtimeCaption) {
        elements.realtimeCaption.innerHTML = realtimeContent;
    }
    
    showToast('언어 설정이 저장되었습니다.');
    closeLanguageModal();
    
    // 설정이 변경되었으므로 번역 중이면 재시작 알림
    if (state.isTranslating) {
        showToast('언어 설정이 변경되었습니다. 번역을 재시작해주세요.');
    }
}

// 모달 외부 클릭 시 닫기
document.addEventListener('DOMContentLoaded', () => {
    const languageModal = document.getElementById('languageModal');
    if (languageModal) {
        languageModal.addEventListener('click', (e) => {
            if (e.target === languageModal) {
                closeLanguageModal();
            }
        });
    }
    
    // 번역 기록 초기화
    initHistorySection();
});

// 번역 기록 섹션 관련 함수
function initHistorySection() {
    const subjectFilter = document.getElementById('subjectFilter');
    if (subjectFilter) {
        // 과목 필터 옵션 추가
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject.id;
            option.textContent = `${subject.name} (${subject.code})`;
            subjectFilter.appendChild(option);
        });
        
        // 필터 변경 이벤트
        subjectFilter.addEventListener('change', renderHistory);
        
        // 초기 렌더링
        renderHistory();
    }
}

function showHistorySection() {
    const historySection = document.getElementById('translationHistorySection');
    if (historySection) {
        historySection.style.display = 'block';
        renderHistory();
        // 스크롤을 기록 섹션으로 이동
        setTimeout(() => {
            historySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

// 현재 번역 기록 항목 생성
function createCurrentHistoryItem() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    // 기존 기록들을 먼저 렌더링
    renderHistory();
    
    // 현재 번역 항목 생성
    const currentItem = document.createElement('div');
    currentItem.className = 'history-item current-translation';
    currentItem.id = 'currentHistoryItem';
    
    const startTime = new Date(state.startTime).toLocaleString('ko-KR');
    
    currentItem.innerHTML = `
        <div class="history-item-header">
            <div class="history-item-title">${state.selectedSubject.name} (${state.selectedSubject.code}) - 진행 중</div>
            <div class="history-item-meta">
                시작: ${startTime}
            </div>
        </div>
        <div class="history-item-content" id="currentHistoryContent">
            <!-- 실시간 번역이 여기에 추가됩니다 -->
        </div>
    `;
    
    // 기록 목록 맨 위에 추가
    historyList.insertBefore(currentItem, historyList.firstChild);
    state.currentHistoryItem = currentItem;
}

// 번역 기록에 실시간으로 추가
function addTranslationToHistory(translation) {
    if (!state.currentHistoryItem) {
        // 현재 번역 항목이 없으면 생성
        createCurrentHistoryItem();
    }
    
    const contentArea = document.getElementById('currentHistoryContent');
    if (!contentArea) return;
    
    const translationPair = document.createElement('div');
    translationPair.className = 'translation-pair';
    
    // 여러 언어 번역 표시 (이미지처럼 한 줄씩)
    let translatedHTML = '';
    if (translation.translations && Array.isArray(translation.translations)) {
        const languageNames = {
            'LANGUAGE::ENGLISH': 'English',
            'LANGUAGE::CHINESE': '中文',
            'LANGUAGE::SPANISH': 'Español',
            'LANGUAGE::JAPANESE': '日本語',
            'default': 'Default'
        };
        
        translatedHTML = translation.translations.map(trans => {
            const langName = languageNames[trans.language] || trans.language;
            return `<div class="translation-lang-line"><span class="translation-lang-label">${langName}:</span> <span class="translation-lang-text">${trans.text}</span></div>`;
        }).join('');
    } else {
        // 기존 호환성: 문자열을 파싱하여 표시
        if (translation.translated && translation.translated.includes(' | ')) {
            const parts = translation.translated.split(' | ');
            const langNames = ['English', '中文', 'Español', '日本語'];
            translatedHTML = parts.map((text, idx) => {
                const langName = langNames[idx] || `Language ${idx + 1}`;
                return `<div class="translation-lang-line"><span class="translation-lang-label">${langName}:</span> <span class="translation-lang-text">${text}</span></div>`;
            }).join('');
        } else {
            translatedHTML = `<div class="translation-lang-line"><span class="translation-lang-text">${translation.translated || ''}</span></div>`;
        }
    }
    
    translationPair.innerHTML = `
        <div class="original">${translation.original}</div>
        <div class="translated">${translatedHTML}</div>
    `;
    
    contentArea.appendChild(translationPair);
    
    // 스크롤을 최신 항목으로 이동
    contentArea.scrollTop = contentArea.scrollHeight;
}

// 현재 번역 기록 항목 업데이트
function updateCurrentHistoryItem() {
    if (!state.currentHistoryItem) return;
    
    const endTime = new Date().toLocaleString('ko-KR');
    const duration = formatDuration(new Date() - state.startTime);
    
    const header = state.currentHistoryItem.querySelector('.history-item-header');
    if (header) {
        header.innerHTML = `
            <div class="history-item-title">${state.selectedSubject.name} (${state.selectedSubject.code})</div>
            <div class="history-item-meta">
                ${new Date(state.startTime).toLocaleString('ko-KR')} ~ ${endTime} (${duration})
            </div>
        `;
    }
    
    // 진행 중 클래스 제거
    state.currentHistoryItem.classList.remove('current-translation');
}

function closeHistorySection() {
    const historySection = document.getElementById('translationHistorySection');
    if (historySection) {
        historySection.style.display = 'none';
    }
}

function toggleHistorySection() {
    const historySection = document.getElementById('translationHistorySection');
    if (historySection) {
        if (historySection.style.display === 'none' || historySection.style.display === '') {
            showHistorySection();
        } else {
            closeHistorySection();
        }
    }
}

// Real-time Caption 토글 함수 (박스 전체 숨기기/보이기)
function toggleRealtimeCaption() {
    const captionContainer = document.querySelector('.cp_cols_container:first-child');
    const cpTrans = document.querySelector('.cp_trans');
    const closeBtn = document.getElementById('captionCloseBtn');
    const openBtn = document.getElementById('captionOpenBtn');
    
    if (captionContainer && cpTrans) {
        const isHidden = captionContainer.classList.contains('hidden');
        
        if (isHidden) {
            // 보이기
            captionContainer.classList.remove('hidden');
            cpTrans.classList.remove('hide-caption');
            if (closeBtn) closeBtn.style.display = 'flex';
            if (openBtn) openBtn.style.display = 'none';
        } else {
            // 숨기기
            captionContainer.classList.add('hidden');
            cpTrans.classList.add('hide-caption');
            if (closeBtn) closeBtn.style.display = 'none';
            if (openBtn) openBtn.style.display = 'flex';
        }
    }
}


function goToTranslationHistory() {
    window.location.href = 'translation-history.html';
}

function renderHistory() {
    const historyList = document.getElementById('historyList');
    const subjectFilter = document.getElementById('subjectFilter');
    
    if (!historyList || !subjectFilter) return;
    
    // 현재 번역 중인 항목 보존
    const currentItem = document.getElementById('currentHistoryItem');
    const currentItemElement = currentItem ? currentItem.cloneNode(true) : null;
    
    const selectedSubjectId = subjectFilter.value;
    const history = JSON.parse(localStorage.getItem('translationHistory') || '[]');
    
    // 필터링
    let filteredHistory = history;
    if (selectedSubjectId !== 'all') {
        filteredHistory = history.filter(item => item.subjectId == selectedSubjectId);
    }
    
    // 최신순 정렬
    filteredHistory.sort((a, b) => new Date(b.endTime) - new Date(a.endTime));
    
    // 렌더링
    historyList.innerHTML = '';
    
    // 현재 번역 중인 항목이 있으면 맨 위에 표시
    if (currentItemElement && state.isTranslating) {
        historyList.appendChild(currentItemElement);
        state.currentHistoryItem = document.getElementById('currentHistoryItem');
    }
    
    // 기존 기록이 없고 현재 번역도 없으면 빈 상태 표시
    if (filteredHistory.length === 0 && !currentItemElement) {
        historyList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <div class="empty-state-text">번역 기록이 없습니다.</div>
            </div>
        `;
        return;
    }
    
    // 기존 기록 렌더링
    filteredHistory.forEach((item, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        const startTime = new Date(item.startTime).toLocaleString('ko-KR');
        const endTime = new Date(item.endTime).toLocaleString('ko-KR');
        const duration = formatDuration(item.duration);
        const borderColor = getSubjectColor(item.subjectId);
        
        historyItem.style.borderLeftColor = borderColor;
        
        // 번역 내용 HTML 생성 (이미지처럼 한 줄씩)
        const translationsHTML = item.translations.map(trans => {
            // 여러 언어 번역 표시
            let translatedHTML = '';
            if (trans.translations && Array.isArray(trans.translations)) {
                const languageNames = {
                    'LANGUAGE::ENGLISH': 'English',
                    'LANGUAGE::CHINESE': '中文',
                    'LANGUAGE::SPANISH': 'Español',
                    'LANGUAGE::JAPANESE': '日本語',
                    'default': 'Default'
                };
                
                translatedHTML = trans.translations.map(t => {
                    const langName = languageNames[t.language] || t.language;
                    return `<div class="translation-lang-line"><span class="translation-lang-label">${langName}:</span> <span class="translation-lang-text">${t.text}</span></div>`;
                }).join('');
            } else {
                // 기존 호환성: 문자열을 파싱하여 표시
                if (trans.translated && trans.translated.includes(' | ')) {
                    const parts = trans.translated.split(' | ');
                    const langNames = ['English', '中文', 'Español', '日本語'];
                    translatedHTML = parts.map((text, idx) => {
                        const langName = langNames[idx] || `Language ${idx + 1}`;
                        return `<div class="translation-lang-line"><span class="translation-lang-label">${langName}:</span> <span class="translation-lang-text">${text}</span></div>`;
                    }).join('');
                } else {
                    translatedHTML = `<div class="translation-lang-line"><span class="translation-lang-text">${trans.translated || ''}</span></div>`;
                }
            }
            
            return `
                <div class="translation-pair">
                    <div class="original">${trans.original}</div>
                    <div class="translated">${translatedHTML}</div>
                </div>
            `;
        }).join('');
        
        historyItem.innerHTML = `
            <div class="history-item-header">
                <div class="history-item-title">${item.subjectName} (${item.subjectCode})</div>
                <div class="history-item-meta">
                    ${startTime} ~ ${endTime} (${duration})
                </div>
            </div>
            <div class="history-item-content">
                ${translationsHTML}
            </div>
        `;
        
        historyList.appendChild(historyItem);
    });
}

// 시간 포맷팅
function formatDuration(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    if (hours > 0) {
        return `${hours}시간 ${minutes}분 ${seconds}초`;
    } else if (minutes > 0) {
        return `${minutes}분 ${seconds}초`;
    } else {
        return `${seconds}초`;
    }
}

// 언어 박스 닫기 함수
function closeLanguageBox(lang, index) {
    const langSection = document.querySelector(`#translated-lang-${index}`);
    if (!langSection) return;
    
    // 현재 보이는(닫히지 않은) 언어 박스 개수 확인
    const translatedContainer = document.getElementById('translatedContentContainer');
    if (translatedContainer) {
        const visibleSections = translatedContainer.querySelectorAll('.translated-lang-section:not(.hidden)');
        // 마지막 하나만 남았으면 닫기 방지
        if (visibleSections.length <= 1) {
            showToast('최소 하나의 언어 박스는 열려있어야 합니다.');
            return;
        }
    }
    
    // 언어 코드 가져오기
    const languageCodes = {
        'LANGUAGE::ENGLISH': 'EN',
        'LANGUAGE::CHINESE': 'ZH',
        'LANGUAGE::JAPANESE': 'JA',
        'LANGUAGE::VIETNAMESE': 'VI'
    };
    const langCode = languageCodes[lang] || lang;
    
    // 박스 숨기기
    langSection.classList.add('hidden');
    
    // 닫힌 언어 박스 표시 생성 (app_header 맨 왼쪽)
    const appHeader = document.querySelector('.app_header');
    if (!appHeader) return;
    
    // 인디케이터 컨테이너 찾기 또는 생성
    let indicatorContainer = appHeader.querySelector('.closed-lang-indicators-container');
    if (!indicatorContainer) {
        indicatorContainer = document.createElement('div');
        indicatorContainer.className = 'closed-lang-indicators-container';
        appHeader.insertBefore(indicatorContainer, appHeader.firstChild);
    }
    
    // 기존 인디케이터가 있으면 제거
    const existingIndicator = indicatorContainer.querySelector(`.closed-lang-indicator[data-lang-index="${index}"]`);
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    // 새로운 인디케이터 생성
    const indicator = document.createElement('div');
    indicator.className = 'closed-lang-indicator';
    indicator.setAttribute('data-lang-index', index);
    indicator.setAttribute('data-language', lang);
    indicator.innerHTML = `
        <div class="closed-lang-indicator-title">${langCode}</div>
    `;
    
    // 클릭 이벤트: 박스 다시 열기
    indicator.addEventListener('click', () => {
        openLanguageBox(lang, index);
    });
    
    // 컨테이너에 추가
    indicatorContainer.appendChild(indicator);
    
    // 닫기 버튼 상태 업데이트
    updateCloseButtonsState();
}

// 언어 박스 열기 함수
function openLanguageBox(lang, index) {
    const langSection = document.querySelector(`#translated-lang-${index}`);
    if (!langSection) return;
    
    // 박스 보이기
    langSection.classList.remove('hidden');
    
    // 인디케이터 제거
    const appHeader = document.querySelector('.app_header');
    if (appHeader) {
        const container = appHeader.querySelector('.closed-lang-indicators-container');
        if (container) {
            const indicator = container.querySelector(`.closed-lang-indicator[data-lang-index="${index}"]`);
            if (indicator) {
                indicator.remove();
            }
            
            // 컨테이너가 비어있으면 제거
            if (container.children.length === 0) {
                container.remove();
            }
        }
    }
    
    // 닫기 버튼 상태 업데이트
    updateCloseButtonsState();
}


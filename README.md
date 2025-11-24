# chungjuUniver

청주대학교 EDELWEIS 교수 대시보드 및 AI 번역 강의 시스템

## 📁 프로젝트 구조

```
chungjuUniver/
├── index.html              # 메인 HTML 파일
├── poly_talk.html          # AI Translator 강의 페이지
├── qa-professor.html       # 교수 Q&A 페이지
├── qa-student.html         # 학생 Q&A 페이지
├── translation-history.html # 번역 기록 페이지
├── style.css               # 메인 스타일시트
├── polytalk.css            # PolyTalk 스타일시트
├── polytalk.js             # PolyTalk JavaScript
├── script.js               # 메인 JavaScript
├── translation-history.js   # 번역 기록 JavaScript
└── README.md               # 프로젝트 설명서
```

## 🎨 주요 기능

### 1. AI Translator 강의 (poly_talk.html)
- 실시간 자막 및 번역 기능
- 다국어 번역 지원 (한국어, 영어, 중국어, 일본어, 베트남어)
- 언어별 번역 박스 관리
- 번역 기록 저장 및 조회
- Room Code 생성 및 공유

### 2. 교수 대시보드 (index.html)
- 교수 프로필 카드
- 상담·지도 관리현황
- 공지사항
- 달력 및 일정
- 교수역량진단 & 강의스타일

### 3. Q&A 시스템
- 교수 Q&A 페이지 (qa-professor.html)
- 학생 Q&A 페이지 (qa-student.html)

## 🚀 실행 방법

### 방법 1: 직접 열기
1. 원하는 HTML 파일을 더블클릭하여 브라우저에서 엽니다.

### 방법 2: 로컬 서버 사용 (권장)
```bash
# Python 3가 설치되어 있는 경우
cd /Volumes/4csoft/chungjuUniver
python3 -m http.server 8000

# 브라우저에서 http://localhost:8000 접속
```

```bash
# Node.js가 설치되어 있는 경우
npx http-server -p 8000

# 브라우저에서 http://localhost:8000 접속
```

## 💻 기술 스택

- **HTML5**: 시맨틱 마크업
- **CSS3**: 
  - Grid Layout
  - Flexbox
  - CSS Variables
  - 반응형 디자인
  - 애니메이션 & 트랜지션
- **JavaScript (Vanilla)**:
  - DOM 조작
  - 이벤트 처리
  - LocalStorage 활용
  - 동적 콘텐츠 업데이트

## 📱 반응형 디자인

이 페이지는 다양한 화면 크기에 대응합니다:
- **데스크톱**: 1200px 이상
- **태블릿**: 768px ~ 1200px
- **모바일**: 768px 이하

## 🔍 주의사항

- 이 페이지는 **정적(static)** 페이지입니다.
- 실제 서버 연동 기능은 포함되어 있지 않습니다.
- 모든 데이터는 샘플 데이터입니다.
- 실제 시스템과 연동하려면 백엔드 API 연동이 필요합니다.

## 📞 문의

궁금한 점이 있으시면 이슈를 등록해주세요.

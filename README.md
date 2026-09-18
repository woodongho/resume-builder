# 🪄 AI Resume & Portfolio Builder (Edu Edition)

> **Google Gemini 3.5 Flash Lite**와 **Flask** 백엔드를 결합하여, 핵심 이력 정보만으로 합격률 높은 맞춤형 **이력서(Resume)** 와 **포트폴리오(Portfolio)** 초안을 실시간 마크다운 및 서식 뷰로 자동 생성하는 교육·실무용 웹 애플리케이션입니다.

---

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Framework-Flask-000000?style=flat-square&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Gemini](https://img.shields.io/badge/AI-Google_Gemini_3.5_Flash_Lite-4285F4?style=flat-square&logo=google)](https://aistudio.google.com/)
[![Markdown](https://img.shields.io/badge/Renderer-Marked.js-000000?style=flat-square&logo=markdown&logoColor=white)](https://marked.js.org/)
[![Design](https://img.shields.io/badge/Design-Mobile_Responsive-success?style=flat-square)](#-모바일-완전-반응형-최적화-mobile-first)
[![Deployment](https://img.shields.io/badge/Deploy-Vercel_Ready-black?style=flat-square&logo=vercel)](https://vercel.com/)

---

## 📌 주요 기능 (Key Features)

### 1. 🎯 프롬프트 엔지니어링 3.0 (3종 특화 모드)
- **모드 A (스탠다드 표준형)**:
  - 채용 담당자가 한눈에 읽기 쉬운 깔끔하고 균형 잡힌 표준 이력서 & 포트폴리오.
  - 프로필 요약, 핵심 역량, 경력 기술, 프로젝트, 학력의 정석 구조.
- **모드 B (STAR & ATS 전문가형 - 추천)**:
  - **STAR 기법(Situation, Task, Action, Result)** 을 기반으로 수치화된 성과(KPI, %, 개선 수치)를 강조.
  - 채용 관리 시스템(ATS) 서류 자동 필터링을 통과하도록 직무 핵심 키워드 밀도 최적화.
- **모드 C (스토리텔링 & 면접 대비형 - 신규)**:
  - 직무 전환 및 이직에 특화된 문제 해결 과정(Troubleshooting)과 배운 점(Lessons Learned) 서사 구성.
  - **면접관 예상 심층 질문 3가지와 핵심 모범 답변 전략(Interview Preparation Kit)** 자동 포함.

### 2. 📑 Marked.js 기반 듀얼 뷰어 (HTML 렌더링 & Raw 탭 전환)
- 기존 생텍스트(`<pre>`) 출력을 탈피하고 **Marked.js**를 도입하여 제목, 볼드, 불릿, 인용구, 코드 블록이 입혀진 **GitHub 스타일 서식 미리보기** 지원.
- `[📄 서식 미리보기]` ↔ `[📝 마크다운 원본]` 탭 버튼으로 자유롭게 전환 가능.
- 클립보드 원클릭 **복사하기 (Copy)** 및 커스텀 파일명 **`.md` 다운로드** 지원.

### 3. 💡 빠른 예시 입력 칩 (One-Click Quick Presets)
- 사용자가 일일이 긴 경력을 타이핑하지 않고도 즉시 테스트할 수 있는 프리셋 제공:
  - `[💻 백엔드 개발자]`, `[📊 데이터/AI 엔지니어]`, `[📱 프로덕트 매니저(PM)]`
- 한 번의 클릭으로 폼 전체를 초기화하는 `[🔄 초기화]` 버튼 제공.

### 4. 📱 모바일 완전 반응형 최적화 (Mobile First)
- 스마트폰 및 태블릿 뷰포트에 맞춘 1열 유동 그리드 레이아웃.
- 생성 버튼 클릭 시 결과 카드 위치로 **부드러운 자동 스크롤(`scrollIntoView`)**.
- 모든 버튼 및 탭을 모바일 터치에 최적화된 중앙 정렬 풀-위드(Full-width)로 구성.

### 5. 🔐 수업용 4자리 PIN 게이트키퍼 & Vercel 배포 완벽 지원
- **4자리 PIN 인증 (`SITE_PASSWORD`)**: 무단 Gemini API 토큰 남용을 방지하는 HMAC-SHA256 기반 24시간 브라우저 쿠키 인증.
- **Vercel 호환성**: `requirements.txt`에 `gunicorn` 포함, BASE_DIR 기반 절대 경로, Zero-config Vercel 배포 완벽 지원.

---

## 🛠️ 기술 스택 (Tech Stack)

| 영역 | 기술 스택 |
| :--- | :--- |
| **Backend** | Python 3.10+, Flask 3.x, Gunicorn, `google-genai` (Gemini SDK), `python-dotenv` |
| **AI Model** | **Google Gemini 3.5 Flash Lite** (`gemini-3.5-flash-lite`) |
| **Frontend** | Vanilla JS (ES6+), Modern HTML5/CSS3 (CSS Variables, Flexbox, Grid), Marked.js |
| **Icons & Fonts** | Font Awesome 6.4, Google Fonts (Inter, Noto Sans KR) |
| **Security** | 4-Digit PIN Gatekeeper, HMAC-SHA256 Cookie Authentication |
| **Deployment** | Vercel Serverless Ready |

---

## 📁 프로젝트 파일 구조 (Project Structure)

```text
resume-builder/
├── app.py                  # Flask 백엔드 서버, PIN 인증 미들웨어, Gemini 3.5 API 연동
├── requirements.txt        # 파이썬 의존성 패키지 (Flask, google-genai, gunicorn 등)
├── .env.example            # 환경변수 설정 안내 템플릿
├── .env                    # (Git 제외) 실제 비밀키 및 API Key 보관
├── .gitignore              # Git 트래킹 제외 설정 (.env, venv 등)
├── README.md               # 프로젝트 종합 안내 문서
├── templates/
│   └── index.html          # 메인 UI 웹 페이지 템플릿 (PIN 게이트, Marked.js, 탭 뷰)
└── static/
    ├── css/
    │   └── style.css       # 반응형 디자인, GitHub 마크다운 본문 스타일, 모바일 최적화
    └── js/
        └── app.js          # PIN 게이트 인증, 프리셋 채우기, API 호출, 렌더링 및 다운로드
```

---

## 🚀 로컬 실행 방법 (Getting Started)

### 1. 가상환경 생성 및 활성화
```powershell
# Windows PowerShell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 2. 패키지 설치
```powershell
pip install -r requirements.txt
```

### 3. 환경변수(.env) 설정
프로젝트 루트의 `.env` 파일에 아래 내용을 설정합니다:
```ini
# Google AI Studio에서 무료 발급: https://aistudio.google.com
GEMINI_API_KEY=your_gemini_api_key_here

# 수업용 입장 비밀번호 (원하는 4자리 숫자로 설정)
SITE_PASSWORD=1234

# 세션 서명용 임의 비밀키
SECRET_KEY=change-this-to-a-secure-random-key

# 사용할 모델 (기본값: gemini-3.5-flash-lite)
GEMINI_MODEL=gemini-3.5-flash-lite
```

### 4. Flask 서버 실행
```powershell
python app.py
```
브라우저에서 **http://127.0.0.1:5000** 에 접속하여 `.env`에 설정한 4자리 비밀번호를 입력하고 사용합니다.

---

## ☁️ Vercel 원클릭 배포 가이드

1. **GitHub 푸시**: 본 저장소를 본인의 GitHub 계정으로 푸시합니다.
2. **Vercel 프로젝트 임포트**: [Vercel 대시보드](https://vercel.com)에서 `Import Project`를 선택합니다.
3. **환경 변수(Environment Variables) 등록**:
   - `GEMINI_API_KEY`: 발급받은 Gemini API 키
   - `SITE_PASSWORD`: 학생들에게 공유할 4자리 비밀번호 (예: `1234`)
   - `SECRET_KEY`: 무작위 영문/숫자 문자열
   - `GEMINI_MODEL`: `gemini-3.5-flash-lite`
4. **Deploy 클릭**: 빌드가 완료되면 전 세계 어디서나 접속 가능한 HTTPS URL이 발급됩니다.

---

## 📝 라이선스 (License)

This project is licensed under the MIT License.
저작자: 우동호 · 교육 실습용 웹 애플리케이션

/**
 * AI Resume & Portfolio Builder - Frontend Application Logic
 * Powered by Gemini 3.5 Flash Lite & Marked.js
 */

document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------------------------------------
    // 1. DOM 요소 획득
    // ---------------------------------------------------------
    const pinGate = document.getElementById('pinGate');
    const pinGateForm = document.getElementById('pinGateForm');
    const pinGateError = document.getElementById('pinGateError');
    const pinDigits = Array.from(document.querySelectorAll('.pin-digit'));

    const resumeForm = document.getElementById('resumeForm');
    const submitBtn = document.getElementById('submitBtn');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');

    const loadingSpinner = document.getElementById('loadingSpinner');
    const emptyState = document.getElementById('emptyState');
    const resultContainer = document.getElementById('resultContainer');
    const markdownRendered = document.getElementById('markdownRendered');
    const resultOutput = document.getElementById('resultOutput');
    const resultCardSection = document.getElementById('resultCardSection');

    const tabRendered = document.getElementById('tabRendered');
    const tabRaw = document.getElementById('tabRaw');

    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const btnResetForm = document.getElementById('btnResetForm');

    let currentResultText = '';
    let currentViewMode = 'rendered'; // 'rendered' | 'raw'

    // ---------------------------------------------------------
    // 2. 수업용 4자리 PIN 게이트키퍼 로직
    // ---------------------------------------------------------
    function initPinGate() {
        if (!pinGate) return;

        // 초기 인증 상태 확인
        fetch('/api/auth/status')
            .then(res => res.json())
            .then(data => {
                if (data.authenticated) {
                    unlockApp();
                } else {
                    lockApp();
                }
            })
            .catch(() => lockApp());

        // 숫자 자동 포커스 이동 & 키 이벤트
        pinDigits.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                e.target.value = val.slice(0, 1);

                if (e.target.value && index < pinDigits.length - 1) {
                    pinDigits[index + 1].focus();
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    pinDigits[index - 1].focus();
                }
            });

            // 붙여넣기 지원 (4자리 일괄 입력)
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
                const digits = pasteData.replace(/[^0-9]/g, '').slice(0, 4);
                digits.split('').forEach((d, i) => {
                    if (pinDigits[i]) pinDigits[i].value = d;
                });
                if (digits.length === 4) {
                    pinDigits[3].focus();
                    submitPinGate();
                }
            });
        });

        pinGateForm.addEventListener('submit', (e) => {
            e.preventDefault();
            submitPinGate();
        });
    }

    async function submitPinGate() {
        const pin = pinDigits.map(i => i.value).join('');
        if (pin.length !== 4) {
            showPinError('비밀번호 4자리를 모두 입력하세요.');
            return;
        }

        pinGateError.textContent = '';
        const submitBtn = pinGateForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = '확인 중...';

        try {
            const res = await fetch('/api/unlock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pin })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                unlockApp();
            } else {
                showPinError(data.error || '비밀번호가 올바르지 않습니다.');
                pinDigits.forEach(i => i.value = '');
                pinDigits[0].focus();
            }
        } catch (err) {
            showPinError('서버 통신 오류가 발생했습니다.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '입장하기';
        }
    }

    function lockApp() {
        document.body.classList.add('is-locked');
        if (pinGate) {
            pinGate.removeAttribute('hidden');
            setTimeout(() => pinDigits[0]?.focus(), 100);
        }
    }

    function unlockApp() {
        document.body.classList.remove('is-locked');
        if (pinGate) pinGate.setAttribute('hidden', '');
    }

    function showPinError(msg) {
        if (pinGateError) pinGateError.textContent = msg;
    }

    // 401 인증 만료 시 자동 게이트 팝업 인터셉터
    async function apiFetch(url, options = {}) {
        const response = await fetch(url, options);
        if (response.status === 401) {
            lockApp();
            showPinError('접속이 만료되었습니다. 비밀번호 4자리를 다시 입력하세요.');
            throw new Error('인증이 필요합니다.');
        }
        return response;
    }

    // ---------------------------------------------------------
    // 3. 샘플 데이터 원클릭 프리셋
    // ---------------------------------------------------------
    const SAMPLE_PRESETS = {
        backend: {
            name: '김민준',
            job_title: '시니어 백엔드 엔지니어 (Python/FastAPI & Cloud)',
            experience: '테크스타트업 백엔드 파트 리드 3년 근무\n- 대용량 트래픽 처리를 위한 마이크로서비스(MSA) 설계 및 운영\n- Redis 기반 분산 캐싱 및 비동기 Celery 태스크 파이프라인 구축\n- PostgreSQL 인덱싱 및 슬로우 쿼리 튜닝으로 DB 응답 속도 최적화',
            projects: '1. 글로벌 결제 연동 게이트웨이 구축\n- 분산 락(Redlock)을 활용한 결제 동시성 제어로 이중 출금 0건 달성\n- 일간 500만 건 트랜잭션 무중단 처리 (가용성 99.99%)\n\n2. AI 실시간 추천 백엔드 파이프라인 개발\n- 벡터 검색(Vector Search) 캐싱 레이어 도입으로 검색 레이턴시 250ms -> 45ms 단축',
            tone: '전문적이고 신뢰감을 주는 비즈니스 어조'
        },
        data_ai: {
            name: '이지은',
            job_title: '데이터 & 머신러닝 엔지니어 (MLOps & LLM)',
            experience: '금융 핀테크 AI 연구소 데이터 엔지니어 2년 6개월\n- 실시간 이상 거래 탐지(FDS) 스트리밍 파이프라인 구축\n- Airflow 기반 데이터 배치 ETL 자동화 파이프라인 유지보수\n- LangChain 및 LLM 프롬프트 엔지니어링 기반 사내 지식검색 챗봇 상용화',
            projects: '1. RAG 기반 금융 규정 질의응답 AI 시스템 구축\n- 하이브리드 검색(BM25 + Dense Retrieval) 도입으로 답변 정확도 94% 달성\n- 사내 문서 검색 소요 시간 주당 평균 8시간 단축\n\n2. 실시간 FDS(이상거래탐지) 모델 서빙 파이프라인\n- Kafka + FastAPI 스트리밍 처리로 초당 3,000건 결제 실시간 추론 달성',
            tone: '성과와 숫자를 명확히 강조하는 자신감 넘치는 어조'
        },
        pm: {
            name: '박서연',
            job_title: '프로덕트 매니저 (Tech PM / Data-Driven)',
            experience: '커머스 플랫폼 그로스 프로덕트 매니저 3년\n- 사용자 유입부터 구매 전환까지의 펀넬 데이터 분석 및 A/B 테스트 주도\n- 기획, 디자인, 개발팀 간 스프린트 애자일 스크럼 리딩\n- 고객 이탈률 분석을 통한 개인화 온보딩 경험 개선',
            projects: '1. 결제 체크아웃 UX 전면 개편 프로젝트\n- 3단계 결제 프로세스를 원클릭 간편결제로 통합하여 결제 이탈률 18% 감소\n- 분기 매출 전년 대비 35% 증대 기여\n\n2. 신규 유저 리텐션 챌린지 프로그램 런칭\n- 행동 트리거 기반 개인화 푸시 도입으로 D+7 리텐션 22% -> 38% 개선',
            tone: '문제 해결 과정과 통찰을 보여주는 논리적인 어조'
        }
    };

    function initPresets() {
        document.querySelectorAll('.chip-btn[data-preset]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const key = e.currentTarget.getAttribute('data-preset');
                const preset = SAMPLE_PRESETS[key];
                if (!preset) return;

                document.getElementById('name').value = preset.name;
                document.getElementById('job_title').value = preset.job_title;
                document.getElementById('experience').value = preset.experience;
                document.getElementById('projects').value = preset.projects;
                document.getElementById('tone').value = preset.tone;

                hideError();

                // 입력 필드 포커스 시각 효과
                document.getElementById('name').focus();
            });
        });

        if (btnResetForm) {
            btnResetForm.addEventListener('click', () => {
                resumeForm.reset();
                hideError();
                document.getElementById('name').focus();
            });
        }
    }

    // ---------------------------------------------------------
    // 4. 폼 제출 및 AI 생성 요청
    // ---------------------------------------------------------
    resumeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();

        const name = document.getElementById('name').value.trim();
        const jobTitle = document.getElementById('job_title').value.trim();
        const experience = document.getElementById('experience').value.trim();
        const projects = document.getElementById('projects').value.trim();
        const tone = document.getElementById('tone').value;
        const promptTypeElement = document.querySelector('input[name="prompt_type"]:checked');
        const promptType = promptTypeElement ? promptTypeElement.value : 'A';

        // 입력 검증
        if (!name || !jobTitle || !experience || !projects || !tone) {
            showError('모든 필수 항목(*)을 입력해 주세요.');
            return;
        }

        showLoadingState();

        // 모바일 화면일 경우 로딩 시작 시 결과 카드로 자동 스크롤
        scrollToResultOnMobile();

        try {
            const response = await apiFetch('/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    job_title: jobTitle,
                    experience: experience,
                    projects: projects,
                    tone: tone,
                    prompt_type: promptType
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'AI 이력서 생성 중 오류가 발생했습니다.');
            }

            currentResultText = data.result || '';
            showResultState(currentResultText);

            // 생성 완료 시에도 결과 영역으로 스크롤 이동
            scrollToResultOnMobile();

        } catch (error) {
            console.error('Error during generation:', error);
            showError(error.message || '서버와의 통신에 실패했습니다. 다시 시도해 주세요.');
            showEmptyState();
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-bolt"></i> AI 이력서 & 포트폴리오 생성하기';
        }
    });

    // ---------------------------------------------------------
    // 5. 마크다운 렌더링 & 뷰 모드 탭 전환
    // ---------------------------------------------------------
    function renderResult(markdownText) {
        // 1) Marked.js HTML 렌더링
        if (window.marked && typeof window.marked.parse === 'function') {
            markdownRendered.innerHTML = window.marked.parse(markdownText);
        } else {
            markdownRendered.innerHTML = `<pre>${escapeHtml(markdownText)}</pre>`;
        }

        // 2) Raw 텍스트 저장
        resultOutput.textContent = markdownText;

        // 3) 탭 뷰 반영
        updateViewMode();
    }

    function updateViewMode() {
        if (currentViewMode === 'rendered') {
            markdownRendered.classList.remove('hidden');
            resultOutput.classList.add('hidden');
            tabRendered?.classList.add('active');
            tabRaw?.classList.remove('active');
        } else {
            markdownRendered.classList.add('hidden');
            resultOutput.classList.remove('hidden');
            tabRendered?.classList.remove('active');
            tabRaw?.classList.add('active');
        }
    }

    if (tabRendered) {
        tabRendered.addEventListener('click', () => {
            currentViewMode = 'rendered';
            updateViewMode();
        });
    }

    if (tabRaw) {
        tabRaw.addEventListener('click', () => {
            currentViewMode = 'raw';
            updateViewMode();
        });
    }

    // ---------------------------------------------------------
    // 6. 결과 복사 & 다운로드 기능
    // ---------------------------------------------------------
    copyBtn.addEventListener('click', async () => {
        if (!currentResultText) return;

        try {
            await navigator.clipboard.writeText(currentResultText);
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> 복사 완료!';
            copyBtn.classList.remove('btn-secondary');
            copyBtn.classList.add('btn-primary');

            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
                copyBtn.classList.remove('btn-primary');
                copyBtn.classList.add('btn-secondary');
            }, 2000);
        } catch (err) {
            console.error('클립보드 복사 실패:', err);
            alert('클립보드 복사에 실패했습니다. [마크다운 원본] 탭에서 직접 복사해 주세요.');
        }
    });

    downloadBtn.addEventListener('click', () => {
        if (!currentResultText) return;

        const blob = new Blob([currentResultText], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        const nameInput = (document.getElementById('name').value.trim() || '이력서').replace(/\s+/g, '_');
        const jobInput = (document.getElementById('job_title').value.trim() || '포트폴리오').replace(/\s+/g, '_').slice(0, 15);
        a.href = url;
        a.download = `${nameInput}_${jobInput}_이력서_포트폴리오.md`;
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // ---------------------------------------------------------
    // 7. 유틸리티 & 상태 도우미
    // ---------------------------------------------------------
    function showError(message) {
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }

    function showLoadingState() {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gemini 3.5 작성 중...';
        
        emptyState.classList.add('hidden');
        resultContainer.classList.add('hidden');
        loadingSpinner.classList.remove('hidden');

        copyBtn.disabled = true;
        downloadBtn.disabled = true;
    }

    function showEmptyState() {
        loadingSpinner.classList.add('hidden');
        resultContainer.classList.add('hidden');
        emptyState.classList.remove('hidden');

        copyBtn.disabled = true;
        downloadBtn.disabled = true;
    }

    function showResultState(text) {
        loadingSpinner.classList.add('hidden');
        emptyState.classList.add('hidden');
        resultContainer.classList.remove('hidden');

        renderResult(text);

        copyBtn.disabled = false;
        downloadBtn.disabled = false;
    }

    function scrollToResultOnMobile() {
        if (window.innerWidth <= 768 && resultCardSection) {
            resultCardSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ---------------------------------------------------------
    // 8. 초기 실행
    // ---------------------------------------------------------
    initPinGate();
    initPresets();
});

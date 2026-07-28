/**
 * AI Resume & Portfolio Builder - Frontend Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. DOM 요소 획득
    const resumeForm = document.getElementById('resumeForm');
    const submitBtn = document.getElementById('submitBtn');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const emptyState = document.getElementById('emptyState');
    const resultContainer = document.getElementById('resultContainer');
    const resultOutput = document.getElementById('resultOutput');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');

    let currentResultText = ''; // 생성된 마크다운 결과 임시 보관

    // 2. 폼 제출 이벤트 처리
    resumeForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // 기본 폼 제출(페이지 리로드) 방지

        // 에러 메시지 초기화
        hideError();

        // 입력 데이터 추출 및 공백 제거
        const name = document.getElementById('name').value.trim();
        const jobTitle = document.getElementById('job_title').value.trim();
        const experience = document.getElementById('experience').value.trim();
        const projects = document.getElementById('projects').value.trim();
        const tone = document.getElementById('tone').value;
        const promptTypeElement = document.querySelector('input[name="prompt_type"]:checked');
        const promptType = promptTypeElement ? promptTypeElement.value : 'A';

        // 3. 프론트엔드 입력 검증 (Validation)
        if (!name || !jobTitle || !experience || !projects || !tone) {
            showError('모든 필수 항목(*)을 입력해 주세요.');
            return;
        }

        // 4. UI 상태 변경 (로딩 시작)
        showLoadingState();

        try {
            // 5. 백엔드 /generate API 호출
            const response = await fetch('/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
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

            // 6. 생성 성공 시 결과 표시
            currentResultText = data.result;
            showResultState(currentResultText);

        } catch (error) {
            console.error('Error during generation:', error);
            showError(error.message || '서버와의 통신에 실패했습니다. 다시 시도해 주세요.');
            showEmptyState();
        } finally {
            // 버튼 상태 원복
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-bolt"></i> AI 이력서 & 포트폴리오 생성하기';
        }
    });

    // 7. 결과 복사 기능 (Clipboard API)
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
            alert('복사에 실패했습니다. 텍스트를 직접 드래그하여 복사해 주세요.');
        }
    });

    // 8. Markdown 파일 다운로드 기능
    downloadBtn.addEventListener('click', () => {
        if (!currentResultText) return;

        const blob = new Blob([currentResultText], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        const nameInput = document.getElementById('name').value.trim() || 'resume';
        a.href = url;
        a.download = `${nameInput}_이력서_포트폴리오.md`;
        document.body.appendChild(a);
        a.click();
        
        // 사용 완료 후 메로리 해제
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // --- HELPER FUNCTIONS --- //

    function showError(message) {
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }

    function showLoadingState() {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 생성 중...';
        
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

        resultOutput.textContent = text;

        copyBtn.disabled = false;
        downloadBtn.disabled = false;
    }
});

import os
import logging
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from google import genai

# 로깅 설정 (요청, 응답, 오류를 백엔드 콘솔에 명확하게 출력)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)

# .env 파일 환경변수 로드
load_dotenv()

# Flask 애플리케이션 생성
app = Flask(__name__)

# API Key 확인 및 Gemini Client 생성
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    logging.warning("GEMINI_API_KEY가 .env 파일에 설정되어 있지 않습니다. .env 파일을 확인해 주세요.")

# Gemini Client 초기화
client = genai.Client(api_key=api_key) if api_key else None


@app.route("/")
def index():
    """메인 대시보드 페이지 렌더링"""
    logging.info("메인 페이지(/) 요청 수신")
    return render_template("index.html")


@app.route("/generate", methods=["POST"])
def generate():
    """
    Resume 및 Portfolio 초안 생성 API
    요청 데이터 검증, Gemini API 호출, 예외 처리 수행
    """
    try:
        # JSON 요청 데이터 수신
        data = request.get_json()
        if not data:
            logging.error("요청 본문(JSON)이 비어있거나 올바르지 않습니다.")
            return jsonify({"success": False, "error": "요청 데이터가 올바르지 않습니다."}), 400

        # 백엔드 입력값 검증 (Validation)
        name = data.get("name", "").strip()
        job_title = data.get("job_title", "").strip()
        experience = data.get("experience", "").strip()
        projects = data.get("projects", "").strip()
        tone = data.get("tone", "").strip()
        prompt_type = data.get("prompt_type", "A").strip().upper()

        logging.info(f"[/generate] 요청 수신 - 이름: {name}, 지원직무: {job_title}, Prompt타입: {prompt_type}")

        # 필수 입력값 체크
        if not name or not job_title or not experience or not projects or not tone:
            missing_fields = []
            if not name: missing_fields.append("이름")
            if not job_title: missing_fields.append("지원 직무")
            if not experience: missing_fields.append("경력")
            if not projects: missing_fields.append("프로젝트")
            if not tone: missing_fields.append("Tone(어조)")
            
            error_msg = f"다음 필수 항목이 누락되었습니다: {', '.join(missing_fields)}"
            logging.warning(f"[/generate] 입력값 누락: {error_msg}")
            return jsonify({"success": False, "error": error_msg}), 400

        # API Key 유효성 확인
        if not client:
            error_msg = "Gemini API Key가 설정되지 않았습니다. .env 파일에 GEMINI_API_KEY를 올바르게 입력해 주세요."
            logging.error(f"[/generate] API Key 미설치 오류: {error_msg}")
            return jsonify({"success": False, "error": error_msg}), 500

        # 프롬프트 설계 (Prompt Engineering)
        if prompt_type == "B":
            # Prompt B: 전문가 어조 (STAR 기법 및 구체적 성과 중심)
            prompt = f"""
당신은 최고의 채용 컨설턴트이자 이력서/포트폴리오 작성 전문가입니다.
아래 입력된 정보를 바탕으로 채용 담당자의 눈길을 사로잡을 수 있는 '전문가 수준의 이력서(Resume)'와 '포트폴리오(Portfolio)' 초안을 마크다운(Markdown) 형식으로 작성해 주세요.

[사용자 입력 정보]
- 이름: {name}
- 지원 직무: {job_title}
- 주요 경력: {experience}
- 수행 프로젝트: {projects}
- 원하시는 Tone: {tone}

[작성 지침]
1. 전문가적 어조({tone})를 유지하면서 수치화된 성과와 STAR 기법(Situation, Task, Action, Result)을 적극 활용해 작성하세요.
2. 이력서(Resume) 섹션과 포트폴리오(Portfolio) 섹션을 명확히 구별하여 목차를 구성하세요.
3. 지원 직무({job_title})에 핵심적인 가치를 증명할 수 있는 전문 기술 키워드와 액션 버브(Action Verb)를 사용해 문장을 다듬어 주세요.
4. 결과물은 깔끔한 Markdown 형식으로 출력하세요.
"""
        else:
            # Prompt A: 일반 어조 (기본 이력서 및 포트폴리오 구조)
            prompt = f"""
당신은 친절하고 역량 있는 이력서 작성 도우미입니다.
아래 입력된 정보를 바탕으로 완성도 높고 깔끔한 '이력서(Resume)'와 '포트폴리오(Portfolio)' 초안을 마크다운(Markdown) 형식으로 작성해 주세요.

[사용자 입력 정보]
- 이름: {name}
- 지원 직무: {job_title}
- 주요 경력: {experience}
- 수행 프로젝트: {projects}
- 원하시는 Tone: {tone}

[작성 지침]
1. 입력된 정보의 핵심 내용을 바탕으로 매끄럽고 명확하게 문장을 정돈하세요 ({tone} 어조 반영).
2. 이력서(Resume) 및 포트폴리오(Portfolio) 항목을 보기 쉽게 마크다운 구조로 작성하세요.
3. 읽기 쉬운 항목별 가렛(Bullet points) 및 핵심 요약을 포함하세요.
"""

        logging.info("Gemini API 호출 시작...")

        # Gemini API 호출 (gemini-3.1-flash-lite 모델 사용)
        response = client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=prompt
        )

        generated_text = response.text
        logging.info(f"Gemini API 응답 생성 완료 (글자 수: {len(generated_text)}자)")

        return jsonify({
            "success": True,
            "result": generated_text
        }), 200

    except Exception as e:
        logging.error(f"[/generate] 내부 처리 중 예외 발생: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "error": f"AI 초안 생성 중 오류가 발생했습니다: {str(e)}"
        }), 500


if __name__ == "__main__":
    logging.info("Flask 개발 서버 실행 (http://127.0.0.1:5000)")
    app.run(debug=True, host="127.0.0.1", port=5000)

import os
import time
import hmac
import hashlib
import logging
from flask import Flask, render_template, request, jsonify, make_response
from dotenv import load_dotenv
from google import genai

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

# .env 파일 환경변수 로드
load_dotenv()

# 경로 절대화 (Vercel 서버리스 호환)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, 'templates'),
    static_folder=os.path.join(BASE_DIR, 'static')
)

# ---------------------------------------------------------
# 보안 및 수업용 PIN 게이트 설정 (24시간 쿠키 인증)
# ---------------------------------------------------------
SITE_PASSWORD = os.getenv("SITE_PASSWORD", "").strip()
if not SITE_PASSWORD:
    logger.warning("SITE_PASSWORD가 설정되어 있지 않습니다. .env 파일에 4자리 비밀번호를 설정하세요.")

SECRET_KEY = os.getenv("SECRET_KEY", "resume-builder-secret-key-prod")
COOKIE_NAME = "class_access"
COOKIE_MAX_AGE = 86400  # 24시간


def sign_cookie(data: str) -> str:
    """HMAC-SHA256 기반 쿠키 서명 생성"""
    sig = hmac.new(SECRET_KEY.encode('utf-8'), data.encode('utf-8'), hashlib.sha256).hexdigest()
    return f"{data}.{sig}"


def verify_cookie(cookie_val: str) -> bool:
    """쿠키 서명 검증 및 만료 시간 확인"""
    if not cookie_val or '.' not in cookie_val:
        return False
    try:
        data, sig = cookie_val.rsplit('.', 1)
        expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), data.encode('utf-8'), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return False
        timestamp = int(data)
        if time.time() - timestamp > COOKIE_MAX_AGE:
            return False
        return True
    except Exception:
        return False


def is_authenticated() -> bool:
    """현재 요청의 쿠키 인증 여부 확인"""
    cookie_val = request.cookies.get(COOKIE_NAME)
    return verify_cookie(cookie_val)


@app.before_request
def check_auth():
    """모든 비인가 API 요청 차단 미들웨어"""
    path = request.path

    # 정적 파일, 메인 페이지, 인증 엔드포인트는 통과
    if path == "/" or path.startswith("/static/") or path in {"/api/unlock", "/api/auth/status", "/app.py"}:
        return None

    # 이력서 생성 API 요청 시 인증 필수
    if path == "/generate":
        if not is_authenticated():
            logger.warning(f"[AUTH] 비인가 요청 차단: {path}")
            return jsonify({
                "success": False,
                "error": "접속이 만료되었거나 올바르지 않습니다. 수업용 비밀번호를 다시 입력해 주세요."
            }), 401

    return None


@app.route("/api/unlock", methods=["POST"])
def unlock():
    """수업용 4자리 PIN 번호 검증 및 인증 쿠키 발급"""
    try:
        data = request.get_json(silent=True) or {}
        password = str(data.get("password", "")).strip()

        if not SITE_PASSWORD:
            logger.error("[AUTH] SITE_PASSWORD 미설정 상태")
            return jsonify({"success": False, "error": "서버에 비밀번호가 설정되어 있지 않습니다. .env를 확인하세요."}), 500

        if hmac.compare_digest(password, SITE_PASSWORD):
            logger.info("[AUTH] 비밀번호 인증 성공")
            now_ts = str(int(time.time()))
            cookie_val = sign_cookie(now_ts)

            resp = make_response(jsonify({"success": True, "message": "인증 성공"}))
            resp.set_cookie(
                COOKIE_NAME,
                cookie_val,
                max_age=COOKIE_MAX_AGE,
                httponly=True,
                samesite="Lax",
                secure=False  # 로컬 및 HTTPS 모두 호환
            )
            return resp
        else:
            logger.warning("[AUTH] 비밀번호 불일치")
            return jsonify({"success": False, "error": "비밀번호가 올바르지 않습니다."}), 403

    except Exception as e:
        logger.error(f"[AUTH] unlock 처리 중 오류: {e}")
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


@app.route("/api/auth/status", methods=["GET"])
def auth_status():
    """현재 브라우저의 인증 유효성 확인"""
    return jsonify({"authenticated": is_authenticated()})


# ---------------------------------------------------------
# Gemini 클라이언트 및 모델 설정
# ---------------------------------------------------------
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    logger.warning("GEMINI_API_KEY가 .env 파일에 설정되어 있지 않습니다.")

client = genai.Client(api_key=api_key) if api_key else None
DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")


@app.route("/")
def index():
    """메인 대시보드 페이지 렌더링"""
    logger.info("메인 페이지(/) 요청 수신")
    return render_template("index.html")


@app.route("/app.py", methods=["GET", "POST"])
def app_fallback():
    """Vercel 서버리스 라우팅 별칭 대응"""
    if request.method == "POST":
        return generate()
    return index()


@app.route("/generate", methods=["POST"])
def generate():
    """
    Resume 및 Portfolio 초안 생성 API
    고도화된 프롬프트 엔지니어링 (모드 A, B, C) 지원
    """
    try:
        data = request.get_json()
        if not data:
            logger.error("요청 본문(JSON)이 비어있거나 올바르지 않습니다.")
            return jsonify({"success": False, "error": "요청 데이터가 올바르지 않습니다."}), 400

        name = data.get("name", "").strip()
        job_title = data.get("job_title", "").strip()
        experience = data.get("experience", "").strip()
        projects = data.get("projects", "").strip()
        tone = data.get("tone", "").strip()
        prompt_type = data.get("prompt_type", "A").strip().upper()

        logger.info(f"[/generate] 요청 수신 - 이름: {name}, 직무: {job_title}, 모드: {prompt_type}")

        # 필수 입력값 체크
        if not name or not job_title or not experience or not projects or not tone:
            missing_fields = []
            if not name: missing_fields.append("이름")
            if not job_title: missing_fields.append("지원 직무")
            if not experience: missing_fields.append("주요 경력 요약")
            if not projects: missing_fields.append("수행 프로젝트")
            if not tone: missing_fields.append("원하는 어조(Tone)")
            
            error_msg = f"다음 필수 항목이 누락되었습니다: {', '.join(missing_fields)}"
            return jsonify({"success": False, "error": error_msg}), 400

        if not client:
            return jsonify({
                "success": False,
                "error": "Gemini API Key가 설정되지 않았습니다. .env 파일에 올바른 GEMINI_API_KEY를 입력해 주세요."
            }), 500

        # ---------------------------------------------------------
        # 프롬프트 엔지니어링 3.0 (모드 A / B / C)
        # ---------------------------------------------------------
        if prompt_type == "B":
            # Prompt B: 성과 중심 전문가형 (STAR 기법 & ATS 최적화)
            prompt = f"""당신은 국내외 유수 기업의 채용을 총괄하는 시니어 테크 리크루터이자 이력서 컨설턴트입니다.
아래 사용자가 입력한 정보를 바탕으로 채용 담당자의 시선을 사로잡고 서류 합격률을 극대화하는 '성과 중심 전문가형 이력서(Resume)'와 '포트폴리오(Portfolio)'를 작성해 주세요.

[사용자 입력 정보]
- 지원자 이름: {name}
- 지원 직무: {job_title}
- 주요 경력 요약: {experience}
- 수행 프로젝트 상세: {projects}
- 희망 어조: {tone}

[작성 지침 및 원칙]
1. 어조: {tone}를 완벽히 유지하며, 단호하고 자신감 있는 전문 비즈니스 어휘와 능동적 행동 동사(Action Verb)를 사용하세요.
2. 성과 수치화: 주요 성과마다 구체적인 지표(예: 처리량 OO% 개선, 로딩 속도 OO초 단축, 비용 OO% 절감, 사용자 수 OO만 명 달성 등)를 합리적인 선에서 명시하여 임팩트를 극대화하세요.
3. STAR 프레임워크 적용:
   - 각 프로젝트 및 주요 업무를 **Situation(상황)**, **Task(과제)**, **Action(수행 행동 & 기술적 솔루션)**, **Result(성과 & 기여도)** 4단계로 일목요연하게 구조화하세요.
4. ATS(채용 관리 시스템) 최적화: {job_title} 직무에서 가장 핵심이 되는 산업 표준 기술 키워드를 자연스럽게 본문에 배치하세요.
5. 문서 구성 (마크다운 규격):
   # {name} | {job_title} 전문가 이력서 & 포트폴리오
   ## 1. Professional Summary (핵심 역량 요약 3~4줄)
   ## 2. Core Competencies & Tech Stack (기술 스택 및 역량 분류)
   ## 3. Professional Experience (경력 사항 - 역할, 주요 업무, 성과 지표)
   ## 4. Featured Projects (STAR 기법 기반 상세 프로젝트 분석)
   ## 5. Education & Additional Information (학력 및 기타 사항 템플릿)

인사말이나 사족 없이 바로 위 마크다운 본문만 완성도 높게 출력하세요."""

        elif prompt_type == "C":
            # Prompt C: 스토리텔링 & 면접 대비형 (신입/이직/커리어 전환 맞춤)
            prompt = f"""당신은 지원자의 고유한 잠재력과 문제 해결력을 발굴하는 커리어 코치이자 면접관입니다.
아래 사용자 정보를 바탕으로 단순한 나열을 넘어 매력적인 서사와 문제 극복 스토리가 담긴 '스토리텔링형 이력서/포트폴리오'와 '실전 면접 대비 질의응답 가이드'를 함께 작성해 주세요.

[사용자 입력 정보]
- 지원자 이름: {name}
- 지원 직무: {job_title}
- 주요 경력 요약: {experience}
- 수행 프로젝트 상세: {projects}
- 희망 어조: {tone}

[작성 지침 및 원칙]
1. 어조: {tone}를 바탕으로 진정성 있고 설득력 있는 스토리텔링을 전개하세요.
2. 문제 해결 과정(Troubleshooting) 집중:
   - 프로젝트 진행 중 직면했던 기술적 한계나 갈등 상황, 그리고 이를 주도적으로 분석하고 돌파한 과정과 **Lessons Learned(배운 점 & 인사이트)**를 상세히 기술하세요.
3. 지원 동기 및 성장 가능성: 과거의 경험이 어떻게 현재 지원 직무({job_title})의 강점으로 연결되는지 연결 고리를 강조하세요.
4. 실전 면접 대비 섹션 추가:
   - 본 이력서/포트폴리오를 본 면접관이 반드시 던질 **예상 압박/심층 질문 3가지**와 **핵심 모범 답변 가이드(답변 포인트)**를 마지막에 포함하세요.
5. 문서 구성 (마크다운 규격):
   # {name} | {job_title} 스토리텔링 이력서 & 포트폴리오
   ## 1. Career Philosophy & Executive Summary (커리어 비전 및 요약)
   ## 2. Core Skills & Growth Journey (핵심 역량 및 성장 궤적)
   ## 3. Professional Experience & Impact (경력 사항 및 기여도)
   ## 4. Deep-Dive Projects & Troubleshooting (트러블슈팅과 문제 해결 중심 프로젝트)
   ## 5. Interview Preparation Kit (면접관 예상 심층 질문 3가지 & 모범 답변 전략)

인사말이나 불필요한 서두 없이 바로 위 마크다운 본문만 출력하세요."""

        else:
            # Prompt A: 스탠다드 표준형 (균형 잡힌 이력서 & 포트폴리오)
            prompt = f"""당신은 깔끔하고 완성도 높은 문서를 제작하는 이력서 전문 컨설턴트입니다.
아래 입력된 정보를 바탕으로 채용 담당자가 한눈에 읽기 편한 표준적이고 균형 잡힌 '이력서(Resume)'와 '포트폴리오(Portfolio)' 초안을 마크다운(Markdown)으로 작성해 주세요.

[사용자 입력 정보]
- 지원자 이름: {name}
- 지원 직무: {job_title}
- 주요 경력 요약: {experience}
- 수행 프로젝트 상세: {projects}
- 희망 어조: {tone}

[작성 지침 및 원칙]
1. 어조: {tone}를 명확히 반영하여 매끄럽고 신뢰감 있는 문장으로 정돈하세요.
2. 명확한 불릿 포인트: 긴 줄글을 지양하고 가독성 높은 불릿 리스트(-)와 볼드(**) 강조를 적극 활용하세요.
3. 핵심 요약과 직무 적합도: {job_title}에 필요한 핵심 기술과 강점을 두드러지게 표현하세요.
4. 문서 구성 (마크다운 규격):
   # {name} | {job_title} 이력서 & 포트폴리오
   ## 1. 프로필 요약 (Profile Summary)
   ## 2. 핵심 보유 역량 (Key Skills)
   ## 3. 주요 경력 사항 (Work Experience)
   ## 4. 주요 프로젝트 (Featured Projects)
   ## 5. 학력 및 교육 이수 (Education & Training)

인사말 없이 완성된 마크다운 본문만 출력하세요."""

        logger.info(f"Gemini API 호출 시작 (모델: {DEFAULT_MODEL})...")

        # Gemini API 호출 (최신 3.5 모델)
        response = client.models.generate_content(
            model=DEFAULT_MODEL,
            contents=prompt
        )

        generated_text = response.text or ""
        logger.info(f"Gemini API 응답 완료 (글자 수: {len(generated_text)}자)")

        return jsonify({
            "success": True,
            "result": generated_text,
            "model": DEFAULT_MODEL,
            "prompt_type": prompt_type
        }), 200

    except Exception as e:
        logger.error(f"[/generate] 처리 중 예외 발생: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "error": f"AI 초안 생성 중 오류가 발생했습니다: {str(e)}"
        }), 500


if __name__ == "__main__":
    logger.info("Flask 개발 서버 실행 (http://127.0.0.1:5000)")
    app.run(debug=True, host="127.0.0.1", port=5000)

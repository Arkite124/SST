"""
허깅페이스에 SentenceTransformer 모델 업로드하기
"""
import os
from sentence_transformers import SentenceTransformer
from huggingface_hub import HfApi, login, whoami

# =============================================
# 설정
# =============================================
LOCAL_MODEL_PATH = os.path.join(os.path.dirname(__file__), "../data/output_kids_words")
HF_REPO_ID = "cath1616/similar_word_corse_fine_tunig_model"
HF_TOKEN = os.getenv("HUGGINGFACE_TOKEN")  # 환경변수에서 가져오기

# =============================================
# 1. 허깅페이스 로그인
# =============================================
print("=" * 60)
print("허깅페이스 모델 업로드")
print("=" * 60)

# 토큰 확인
if not HF_TOKEN:
    print("⚠️  환경변수 HUGGINGFACE_TOKEN이 설정되지 않았습니다.")
    print("💡 다음 방법 중 하나를 선택하세요:\n")
    print("방법 1) 환경변수 설정")
    print("  Windows: set HUGGINGFACE_TOKEN=your_token_here")
    print("  Linux/Mac: export HUGGINGFACE_TOKEN=your_token_here\n")
    print("방법 2) .env 파일에 추가")
    print("  HUGGINGFACE_TOKEN=your_token_here\n")
    print("방법 3) 터미널에서 로그인")
    print("  huggingface-cli login\n")

    # 이미 로그인되어 있는지 확인
    try:
        user_info = whoami()
        print(f"✅ 이미 로그인되어 있습니다: {user_info['name']}")
    except Exception:
        print("❌ 로그인이 필요합니다.")
        print("   터미널에서 'huggingface-cli login' 실행 후 다시 시도하세요.")
        exit(1)
else:
    # 토큰으로 로그인
    try:
        login(token=HF_TOKEN, add_to_git_credential=True)
        user_info = whoami()
        print(f"✅ 허깅페이스 로그인 성공: {user_info['name']}")
    except Exception as e:
        print(f"❌ 로그인 실패: {e}")
        print("\n💡 해결 방법:")
        print("1. https://huggingface.co/settings/tokens 에서 토큰 재발급")
        print("2. 토큰 권한이 'Write'인지 확인")
        print("3. 터미널에서 `huggingface-cli login` 실행")
        exit(1)

# =============================================
# 2. 로컬 모델 로드 및 확인
# =============================================
print("\n" + "=" * 60)
print("로컬 모델 확인")
print("=" * 60)

# 경로 정규화
LOCAL_MODEL_PATH = os.path.abspath(LOCAL_MODEL_PATH)
print(f"모델 경로: {LOCAL_MODEL_PATH}")

if not os.path.exists(LOCAL_MODEL_PATH):
    print(f"❌ 로컬 모델 경로를 찾을 수 없습니다.")
    print("\n💡 다음을 확인하세요:")
    print(f"  1. 경로가 올바른지: {LOCAL_MODEL_PATH}")
    print(f"  2. output_kids_words 폴더가 존재하는지")
    exit(1)

# 필수 파일 확인
required_files = ["config.json", "pytorch_model.bin", "tokenizer_config.json"]
existing_files = []
missing_files = []

for f in required_files:
    file_path = os.path.join(LOCAL_MODEL_PATH, f)
    if os.path.exists(file_path):
        existing_files.append(f)
    else:
        missing_files.append(f)

if existing_files:
    print(f"✅ 발견된 파일: {existing_files}")

if missing_files:
    print(f"⚠️  누락된 파일: {missing_files}")
    print("\n💡 누락된 파일이 있어도 업로드를 시도합니다.")
    print("   (일부 파일은 다른 이름일 수 있습니다)")

# 모델 로드 및 테스트
try:
    print("\n모델 로드 중...")
    model = SentenceTransformer(LOCAL_MODEL_PATH)
    print(f"✅ 모델 로드 성공")

    # 모델 테스트
    print("모델 테스트 중...")
    test_embedding = model.encode(["테스트", "학교", "공부"])
    print(f"✅ 모델 테스트 성공")
    print(f"   임베딩 차원: {test_embedding.shape[1]}")
    print(f"   테스트 샘플 수: {test_embedding.shape[0]}")

except Exception as e:
    print(f"❌ 모델 로드 실패: {e}")
    print("\n💡 가능한 원인:")
    print("  1. 모델이 제대로 저장되지 않음")
    print("  2. SentenceTransformer 버전 불일치")
    print("  3. PyTorch 버전 문제")
    exit(1)

# =============================================
# 3. 허깅페이스에 업로드
# =============================================
print("\n" + "=" * 60)
print("허깅페이스 업로드 시작")
print("=" * 60)
print(f"목적지: {HF_REPO_ID}")
print("\n⚠️  업로드에 시간이 걸릴 수 있습니다...\n")

try:
    # SentenceTransformer의 push_to_hub 메서드 사용
    model.push_to_hub(
        repo_id=HF_REPO_ID,
        private=False,  # True로 설정하면 비공개 저장소
        commit_message="Upload fine-tuned Korean word similarity model",
        exist_ok=True  # 저장소가 이미 있으면 덮어쓰기
    )
    print(f"\n✅ 업로드 성공!")
    print(f"🔗 모델 링크: https://huggingface.co/{HF_REPO_ID}")

except Exception as e:
    print(f"\n❌ 업로드 실패: {e}")
    print("\n💡 해결 방법:")
    print("1. 허깅페이스 토큰 권한 확인 (Write 권한 필요)")
    print("2. 네트워크 연결 확인")
    print("3. 저장소 이름 확인 (username/model-name 형식)")
    print(f"4. 현재 저장소: {HF_REPO_ID}")
    exit(1)

# =============================================
# 4. 업로드 확인
# =============================================
print("\n" + "=" * 60)
print("업로드 확인")
print("=" * 60)

try:
    api = HfApi()
    files = api.list_repo_files(repo_id=HF_REPO_ID)

    print(f"📦 업로드된 파일 목록 (총 {len(files)}개):")
    for file in sorted(files):
        print(f"  - {file}")

    # 필수 파일 확인
    required_hf_files = ["config.json", "modules.json", "sentence_bert_config.json"]
    uploaded_required = [f for f in required_hf_files if f in files]

    print(f"\n필수 파일 확인:")
    for f in required_hf_files:
        status = "✅" if f in files else "❌"
        print(f"  {status} {f}")

    if len(uploaded_required) >= 2:  # 최소 2개만 있어도 OK
        print("\n✅ 필수 파일이 업로드되었습니다!")
    else:
        missing = set(required_hf_files) - set(uploaded_required)
        print(f"\n⚠️  일부 파일이 누락되었을 수 있습니다: {missing}")
        print("   하지만 모델은 작동할 가능성이 있습니다.")

except Exception as e:
    print(f"⚠️  확인 중 오류: {e}")
    print("   업로드는 성공했을 수 있습니다. 웹에서 확인하세요.")

# =============================================
# 5. 사용 안내
# =============================================
print("\n" + "=" * 60)
print("완료!")
print("=" * 60)
print("\n📖 모델 사용 방법:")
print("```python")
print("from sentence_transformers import SentenceTransformer")
print(f"model = SentenceTransformer('{HF_REPO_ID}')")
print("embeddings = model.encode(['테스트', '학교'])")
print("```")
print("\n🔗 웹에서 확인:")
print(f"   https://huggingface.co/{HF_REPO_ID}")
print("=" * 60)
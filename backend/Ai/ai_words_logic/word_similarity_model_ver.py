import os
import sys
import time

from ai_common.gpu_start import get_device_cuda
from db.pg_connect import extract_similar_words

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import ast
import random
import torch
from itertools import combinations
import pandas as pd
from torch.utils.data import DataLoader
from tqdm import tqdm  # 진행바
from sentence_transformers import SentenceTransformer, losses, InputExample, util
from sentence_transformers.evaluation import InformationRetrievalEvaluator
from sentence_transformers.util import batch_to_device
from torch.cuda.amp import autocast, GradScaler



# -----------------------------
# 전역 변수 설정
# -----------------------------
EMB_PATH = "../data/output_kids_words/corpus_embeddings.pt"
# HUGGINGFACE_MODEL_ID = "cath1616/similar_word_corse_fine_tunig_model"
LOCAL_MODEL_DIR = "../data/output_kids_words"  # 로컬 캐시용
model_dir = "data/output_kids_words"
model_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), model_dir)
CKPT_DIR = "../data/output_kids_words/checkpoints"
SAVE_DIR = "../data/output_kids_words"

# 모델은 전역 변수로 선언만 (나중에 로드)
model = None
device = None


def ensure_model_loaded(force_huggingface=False):
    """모델이 로드되지 않았다면 로드 (로컬 우선, 없으면 학습)"""

    global model, device
    if model is None:
        device = get_device_cuda()

        # 로컬에 모델이 있으면 로컬에서 로드
        if os.path.exists(LOCAL_MODEL_DIR) and os.path.exists(os.path.join(LOCAL_MODEL_DIR, "config.json")):
            print(f"[Info] 로컬 모델 로드 중... ({LOCAL_MODEL_DIR})")
            model = SentenceTransformer(LOCAL_MODEL_DIR, device=device)
            print(f"[Info] 로컬 모델 로드 완료 ({device})")

        # 로컬에 모델이 없으면 새로 학습
        else:
            print(f"[Warning] 로컬 모델이 존재하지 않습니다. 새로 학습을 시작합니다...")
            print(f"[Info] 학습 시작 - 이 작업은 시간이 걸릴 수 있습니다.")

            # run_training 함수 호출하여 모델 학습
            # 기본 5 epoch 학습 (필요시 조정 가능)
            run_training(epochs=7, checkpoint_every=1, snapshot_every=None)

            # 학습 완료 후 모델 로드
            if os.path.exists(LOCAL_MODEL_DIR):
                model = SentenceTransformer(LOCAL_MODEL_DIR, device=device)
                print(f"[Info] 학습 완료 및 모델 로드 완료 ({device})")
            else:
                raise FileNotFoundError(
                    f"학습 후에도 모델 디렉토리 '{LOCAL_MODEL_DIR}'가 생성되지 않았습니다."
                )

    return model, device

# -----------------------------
# 임베딩 값 생성 후 저장
# -----------------------------
def save_corpus_embeddings(corpus_words, device_param, path=EMB_PATH):
    """
    corpus_words: 단어 리스트
    device_param: 디바이스 (cuda/cpu)
    path: 저장 경로
    """
    m, d = ensure_model_loaded()
    with torch.inference_mode():
        corpus_emb = m.encode(
            corpus_words,
            convert_to_tensor=True,
            normalize_embeddings=True,
            batch_size=256,
            show_progress_bar=True,
            device=device_param
        ).cpu()
    torch.save({
        "corpus_words": corpus_words,
        "corpus_emb": corpus_emb
    }, path)
    print(f"[Info] 임베딩 저장 완료: {path}")
    return corpus_emb


# -----------------------------
# 저장된 임베딩값 로드
# -----------------------------
def load_corpus_embeddings(path=EMB_PATH):
    if not os.path.exists(path):
        raise FileNotFoundError(f"임베딩 파일 '{path}'가 존재하지 않습니다.")
    data = torch.load(path)
    corpus_words = data["corpus_words"]
    corpus_emb = data["corpus_emb"]
    print(f"[Info] 임베딩 불러오기 완료: {path} (단어 수: {len(corpus_words)})")
    return corpus_words, corpus_emb


# -----------------------------
# 모든 단어쌍 생성 함수: (base, sim) and (sim1,sim2)... 형태
# -----------------------------
def build_word_pairs(df):
    word_pairs = []
    for base, sims in zip(df["base_word"], df["similar_words"]):
        for s in sims:
            word_pairs.append((base, s))
    for sims in df["similar_words"]:
        sims = list(set(sims))
        for a, b in combinations(sims, 2):
            word_pairs.append((a, b))
    return word_pairs


# -----------------------------
# IR 평가기 생성 함수
# -----------------------------
def build_ir_evaluator(df):
    queries = {}  # 입력 단어
    corpus = set()  # 모든 후보 단어들 (리스트화)
    relevant_docs = {}  # 각 단어에 대한 정답 단어들

    for base, sims in zip(df["base_word"], df["similar_words"]):
        queries[base] = base
        relevant_docs[base] = set(sims)
        corpus.add(base)  # 전체 후보 단어에 base 단어 추가.
        for s in sims:
            corpus.add(s)  # 정답 단어들도 전체 후보 단어들 사이에 추가.

    corpus = sorted(corpus)  # 정렬+리스트화

    # 라벨링
    corpus_ids = {w: str(i) for i, w in enumerate(corpus)}  # 전체 후보 단어 라벨링
    query_ids = {q: str(i) for i, q in enumerate(queries.keys())}  # 기준 단어 라벨링

    ir_queries = {query_ids[q]: q for q in queries.keys()}
    ir_corpus = {corpus_ids[w]: w for w in corpus}
    ir_relevant = {query_ids[q]: set(corpus_ids[w] for w in relevant_docs[q])
                   for q in queries.keys()}

    evaluator = InformationRetrievalEvaluator(
        queries=ir_queries,
        corpus=ir_corpus,
        relevant_docs=ir_relevant,
        name="word-syn-ir",
        show_progress_bar=True
    )
    return evaluator, corpus


# -----------------------------
# 학습 준비 (Dataloader + 모델)
# -----------------------------
def prepare_training_data(df, model_instance, batch_size=16, device="cpu"):
    word_pair = build_word_pairs(df)
    examples = [InputExample(texts=[a, b]) for (a, b) in word_pair]
    random.shuffle(examples)
    split = int(len(examples) * 0.9)
    train_examples = examples[:split]

    pin = (device == "cuda")
    num_workers = 0 if os.name == "nt" else 2  # Windows는 0~2 권장

    train_dataloader = DataLoader(
        train_examples,
        batch_size=batch_size,
        shuffle=True,
        drop_last=True,
        collate_fn=model_instance.smart_batching_collate,
        pin_memory=pin,
        num_workers=num_workers,
    )
    return train_dataloader


# -----------------------------
# Optimizer, Scheduler, Scaler 준비
# -----------------------------
def setup_optimizer(model_instance, train_dataloader, lr, epochs, device):
    optimizer = torch.optim.AdamW(model_instance.parameters(), lr=lr)
    total_steps = epochs * max(1, len(train_dataloader))
    warmup_steps = max(10, int(total_steps * 0.1))

    def lr_lambda(step):
        if step < warmup_steps:
            return float(step + 1) / float(max(1, warmup_steps))
        return 1.0

    scheduler = torch.optim.lr_scheduler.LambdaLR(optimizer, lr_lambda)
    scaler = GradScaler(enabled=(device == "cuda"))
    return optimizer, scheduler, scaler


# -----------------------------
# 1 Epoch 학습
# -----------------------------
def train_one_epoch(model_instance, train_dataloader, train_loss, optimizer, scheduler, scaler, device, epoch, epochs,
                    use_amp=True):
    model_instance.train()
    amp_enabled = use_amp and (device == "cuda")
    epoch_bar = tqdm(train_dataloader, desc=f"Epoch {epoch}/{epochs}", leave=True)

    for step, batch in enumerate(epoch_bar):
        optimizer.zero_grad(set_to_none=True)

        # 1) 배치 언패킹 (버전 호환)
        sentence_features, labels = None, None
        if isinstance(batch, dict):
            sentence_features = batch.get('sentence_features') or batch.get('features') or batch
            labels = batch.get('labels', None)
        elif isinstance(batch, (list, tuple)):
            if len(batch) == 2:
                sentence_features, labels = batch
            else:
                sentence_features = batch
        else:
            sentence_features = batch

        # 2) 텐서들을 전부 model/device로 이동
        if isinstance(sentence_features, (list, tuple)):
            sentence_features = [batch_to_device(feat, device) for feat in sentence_features]
        else:
            sentence_features = batch_to_device(sentence_features, device)

        if isinstance(labels, torch.Tensor):
            labels = labels.to(device, non_blocking=True)

        # 3) Loss 계산 + step
        if amp_enabled:
            with autocast(dtype=torch.float16):
                loss = train_loss(sentence_features, labels)
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
        else:
            loss = train_loss(sentence_features, labels)
            loss.backward()
            optimizer.step()

        if scheduler is not None:
            scheduler.step()

        epoch_bar.set_postfix({"loss": f"{loss.item():.4f}",
                               "lr": f"{optimizer.param_groups[0]['lr']:.2e}"})


# -----------------------------
# 학습 종료 후 IR 평가
# -----------------------------
def evaluate_model(model_instance, evaluator):
    model_instance.eval()
    print("\n[Evaluation] Information Retrieval (IR) ...")
    evaluator(model_instance)
    print()


# -----------------------------
# 모델 저장 + 유사 단어 검색 함수 생성
# -----------------------------
def build_search_function(corpus_words=None, corpus_emb=None, device_param='cpu'):
    m, d = ensure_model_loaded()

    if corpus_words is None or corpus_emb is None:
        # pt 파일에서 읽어오기
        corpus_words, corpus_emb = load_corpus_embeddings()

    def similar_words(query_word: str, topk: int = 10, exclude_self: bool = True):
        with torch.inference_mode():
            q_emb = m.encode(
                [query_word],
                convert_to_tensor=True,
                normalize_embeddings=True,
                device=device_param
            ).cpu()
            sims = util.cos_sim(q_emb, corpus_emb)[0]
            if exclude_self and query_word in corpus_words:
                sims[corpus_words.index(query_word)] = -1e9
            k = min(topk, len(corpus_words))
            vals, idxs = torch.topk(sims, k)
            return [(corpus_words[i], float(vals[j])) for j, i in enumerate(idxs)]

    return similar_words


# -----------------------------
# 체크포인트 저장/로드 함수
# -----------------------------
def _save_training_state(model_instance, path, optimizer, scheduler, scaler, epoch, global_step, device):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    # RNG 상태는 텐서 그대로 저장 (리스트 변환x)
    cpu_rng = torch.get_rng_state()  # ByteTensor
    if torch.cuda.is_available():
        cuda_rng = [s.clone().cpu() for s in torch.cuda.get_rng_state_all()]  # list[ByteTensor]
    else:
        cuda_rng = None

    payload = {
        "model": model_instance.state_dict(),
        "optimizer": optimizer.state_dict() if optimizer is not None else None,
        "scheduler": scheduler.state_dict() if scheduler is not None else None,
        "scaler": scaler.state_dict() if scaler is not None else None,
        "state": {
            "epoch": int(epoch),
            "global_step": int(global_step),
            "rng_state": {
                "torch": cpu_rng,  # ByteTensor
                "cuda": cuda_rng  # list of ByteTensor or None
            },
        },
    }
    torch.save(payload, path)


def load_training_state(model_instance, path, optimizer, scheduler, scaler, device):
    # 보안 경고 해소: weights_only=True (자체 생성 파일이면 안전)
    ckpt = torch.load(path, map_location=device, weights_only=True)

    # 가중치 및 옵티마이저/스케줄러/스케일러
    model_instance.load_state_dict(ckpt["model"], strict=True)
    if optimizer is not None and ckpt.get("optimizer") is not None:
        optimizer.load_state_dict(ckpt["optimizer"])
    if scheduler is not None and ckpt.get("scheduler") is not None:
        scheduler.load_state_dict(ckpt["scheduler"])
    if scaler is not None and ckpt.get("scaler") is not None:
        scaler.load_state_dict(ckpt["scaler"])

    st = ckpt.get("state", {})
    rng = st.get("rng_state", {})

    # CPU RNG
    cpu_state = rng.get("torch")
    if cpu_state is not None:
        if isinstance(cpu_state, torch.ByteTensor):
            torch.set_rng_state(cpu_state)
        else:
            # 구버전 호환: 리스트 등으로 저장된 경우
            torch.set_rng_state(torch.tensor(cpu_state, dtype=torch.uint8))

    # CUDA RNG
    if torch.cuda.is_available():
        cuda_states = rng.get("cuda")
        if cuda_states:
            # list[Tensor] 또는 list[list[int]] 모두 지원
            for i, s in enumerate(cuda_states):
                if isinstance(s, torch.ByteTensor):
                    torch.cuda.set_rng_state(s, i)
                elif isinstance(s, torch.Tensor):
                    torch.cuda.set_rng_state(s.to(dtype=torch.uint8, device='cpu'), i)
                else:
                    torch.cuda.set_rng_state(torch.tensor(s, dtype=torch.uint8), i)

    last_epoch = int(st.get("epoch", 0))
    global_step = int(st.get("global_step", 0))
    return last_epoch, global_step


# -----------------------------
# 학습용 함수: 모델 생성, 학습, 저장
# -----------------------------
def run_training(epochs, checkpoint_every=1, snapshot_every=None):
    """
    epochs: 이번 실행에서 추가로 더 학습할 epoch 수 (누적)
    checkpoint_every: 매 몇 epoch마다 last.ckpt 갱신 (기본 1)
    snapshot_every: None 아니면 매 N epoch마다 snapshot 저장 (ex. 5)
    """
    global model, device

    # ----- 데이터 로드 -----
    df = extract_similar_words()  # db에서 content 가져옴
    df["similar_words"] = df["similar_words"].apply(lambda s: ast.literal_eval(s) if isinstance(s, str) else s)

    # ----- 디바이스 -----
    device = get_device_cuda()

    # ----- 모델 로드 (기존이 있으면 이어서) -----
    if os.path.exists(SAVE_DIR) and os.path.exists(os.path.join(SAVE_DIR, "config.json")):
        # 이전에 저장한 SentenceTransformer를 로드 (가중치 포함)
        model = SentenceTransformer(SAVE_DIR, device=device)
        print("[Info] 기존 저장 모델을 불러와서 이어서 학습합니다.")
        is_resume = True
    else:
        # 처음 학습
        model_name = "snunlp/KR-SBERT-V40K-klueNLI-augSTS"
        # model_name = "paraphrase-multilingual-MiniLM-L12-v2"
        model = SentenceTransformer(model_name, device=device)
        print("[Info] 새 모델로 처음부터 학습을 시작합니다.")
        is_resume = False

    # ----- DataLoader / Loss / Evaluator -----
    train_dataloader = prepare_training_data(df, model, batch_size=64, device=device)
    train_loss = losses.MultipleNegativesRankingLoss(model)
    evaluator, corpus_words = build_ir_evaluator(df)

    # ----- Optimizer / Scheduler / Scaler -----
    lr = 2e-5
    optimizer, scheduler, scaler = setup_optimizer(model, train_dataloader, lr, epochs, device)
    use_amp = (device == "cuda")

    # ----- 체크포인트 로드 (있다면) -----
    os.makedirs(CKPT_DIR, exist_ok=True)
    last_ckpt_path = os.path.join(CKPT_DIR, "last.ckpt")
    start_epoch_offset = 0
    global_step = 0
    if is_resume and os.path.exists(last_ckpt_path):
        try:
            last_epoch, global_step = load_training_state(
                model, last_ckpt_path, optimizer, scheduler, scaler, device
            )
            # 다음 epoch부터 이어서
            start_epoch_offset = last_epoch
            print(f"[Resume] last_epoch={last_epoch}, global_step={global_step}")
        except Exception as e:
            print(f"[Warn] 체크포인트 로드 실패(새로 시작): {e}")

    # ----- 학습 루프 (누적) -----
    # 총 학습 epoch = (이전에 학습한 epoch) + (이번에 추가 epochs)
    for i in range(1, epochs + 1):
        current_epoch = start_epoch_offset + i
        train_one_epoch(
            model, train_dataloader, train_loss,
            optimizer, scheduler, scaler,
            device, current_epoch, start_epoch_offset + epochs, use_amp=use_amp
        )
        global_step += len(train_dataloader)

        # 평가(선택)
        evaluate_model(model, evaluator)

        # 매 epoch 저장: SentenceTransformer(save_dir) + last.ckpt(상태)
        model.save(SAVE_DIR)
        if (checkpoint_every is None) or (current_epoch % checkpoint_every == 0):
            _save_training_state(model, last_ckpt_path, optimizer, scheduler, scaler,
                                 epoch=current_epoch, global_step=global_step, device=device)

        # 스냅샷 저장(선택)
        if snapshot_every and current_epoch % snapshot_every == 0:
            snap_path = os.path.join(CKPT_DIR, f"snapshot_epoch_{current_epoch}.ckpt")
            _save_training_state(model, snap_path, optimizer, scheduler, scaler,
                                 epoch=current_epoch, global_step=global_step, device=device)
            # 모델 스냅샷 폴더도 함께
            snap_model_dir = os.path.join(SAVE_DIR, f"snapshot_epoch_{current_epoch}")
            model.save(snap_model_dir)

    # ----- 최종 저장 -----
    model.save(SAVE_DIR)
    _save_training_state(model, last_ckpt_path, optimizer, scheduler, scaler,
                         epoch=start_epoch_offset + epochs, global_step=global_step, device=device)

    # ----- 검색 함수 -----
    corpus_emb = save_corpus_embeddings(corpus_words, device)
    similar_fn = build_search_function(corpus_words, corpus_emb, device)
    return similar_fn


# -----------------------------
# 저장된 모델 불러오기 + 검색 전용
# -----------------------------
def load_model_and_corpus(emb_path=None, force_download=False):
    """학습된 모델과 임베딩을 불러와서 검색 함수 반환"""
    # m, d = ensure_model_loaded()
    #
    # # 검색 함수 생성
    # corpus_words, corpus_emb = load_corpus_embeddings(path=emb_path)
    # similar_fn = build_search_function(corpus_words, corpus_emb, d)
    # return similar_fn

    if emb_path is None:
        emb_path = EMB_PATH

    m, d = ensure_model_loaded(force_huggingface=force_download)

    # 임베딩 파일이 없으면 생성
    if not os.path.exists(emb_path):
        print(f"[Warning] 임베딩 파일이 없습니다. DB에서 단어 목록을 가져와 생성합니다...")
        df = extract_similar_words()

        # 모든 단어 추출
        all_words = set()
        for base_word, similar_words in zip(df["base_word"], df["similar_words"]):
            all_words.add(base_word)
            if isinstance(similar_words, str):
                similar_words = ast.literal_eval(similar_words)
            all_words.update(similar_words)

        corpus_words = sorted(list(all_words))
        print(f"[Info] 총 {len(corpus_words)}개 단어의 임베딩 생성 중...")
        corpus_emb = save_corpus_embeddings(corpus_words, d, emb_path)
    else:
        corpus_words, corpus_emb = load_corpus_embeddings(path=emb_path)

    similar_fn = build_search_function(corpus_words, corpus_emb, d)
    return similar_fn


if __name__ == "__main__":
    similar_fn=load_model_and_corpus()
    word_base="사과"

    start_time = time.time()
    candidates = similar_fn(word_base, topk=2)
    end_time = time.time()
    print(candidates)
    print(f"\n>>계산 시간: {end_time - start_time:.4f}초")
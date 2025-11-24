-- users
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY, --다른 DB와의 호환성 고려
    password VARCHAR(255),
    name VARCHAR(20),
    nickname VARCHAR(20),
    vocabulary_age int default 4,
    age INT,
    exp bigint default 0,  --경험치, 레벨 계산?
    gender VARCHAR(10),
    phone VARCHAR(20) unique, -- String 형식이 안전, 010-1234-5678 형식으로 들어가서
    OAuth VARCHAR(20) CHECK (OAuth IN ('google','naver','kakao')),
    role VARCHAR(20) CHECK (role IN ('customer','admin')) default 'customer',
    email VARCHAR(255) UNIQUE not null,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    profile_img_url VARCHAR(255) default null,
    key_parent VARCHAR(255) default null  --부모인증키
    --is_active BOOLEAN DEFAULT TRUE --옅은 삭제에 대해 말씀하심,
);

CREATE TABLE IF NOT EXISTS user_bans (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    start_date TIMESTAMP NOT NULL DEFAULT NOW(),
    end_date TIMESTAMP,
    banned_by INT,
    is_auto BOOLEAN DEFAULT FALSE,
    status VARCHAR(20)
        CHECK (status IN ('active', 'expired', 'lifted')) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_banned_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_banned_by FOREIGN KEY (banned_by) REFERENCES users(id) ON DELETE SET NULL
);
-- 같은 유저가 동시에 여러 active 밴을 가질 수 없도록
DROP INDEX IF EXISTS uniq_active_ban_per_user;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_ban_per_user
    ON user_bans(user_id)
    WHERE status = 'active';

-- create table if not exists child(
--     id serial primary key,
--     user_id int references users(id) on delete cascade,
--     vocabulary_age int default 4,
--     name varchar(20),
--     age int,
--     exp bigint default 0,
--     gender varchar(10),
--     created_at TIMESTAMP default now()
-- );

-- 독후감 (JOIN 가능: users)
CREATE TABLE IF NOT EXISTS reading_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP, -- 수정 날짜, null 가능
    book_title VARCHAR(255) NOT NULL,
    sentiment varchar(20),
    author VARCHAR(255),
    publisher VARCHAR(255),
    content TEXT, -- 독서록 내용
    cleaned_content TEXT, --null -> update -> 교정된내용
    unknown_sentence TEXT -- 모르는 문장 인용
);

-- 생활글쓰기(일기) (JOIN 가능: users)
CREATE TABLE IF NOT EXISTS daily_writings (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    mood INTEGER NOT NULL,
    title VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    content TEXT NOT NULL, -- 작성한 생활글
    cleaned_content TEXT, -- 정제된 글 (전처리 완료 후 update)
    attachment_url VARCHAR(255) -- 첨부파일 경로
);

-- 독서토론 (JOIN 가능: users)
CREATE TABLE IF NOT EXISTS reading_forum_posts (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    parent_id int references reading_forum_posts(id) on delete cascade default null,
    title VARCHAR(255),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    book_title VARCHAR(255),     -- 관련 도서
    discussion_tags VARCHAR(100) -- 토론 주제 태그
);

-- 부모 커뮤니티 (JOIN 가능: users)
CREATE TABLE IF NOT EXISTS parent_forum_posts (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    parent_id int references parent_forum_posts(id) on delete cascade default null,
    title VARCHAR(255),   -- 댓글일시 제목이 없음
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    category VARCHAR(50), -- 예: 교육, 육아, 상담
    is_important BOOLEAN DEFAULT FALSE -- 공지 여부
);

-- 테스트 (JOIN 가능: users)
CREATE TABLE IF NOT EXISTS user_tests (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    test_type VARCHAR(50) CHECK (test_type IN ('reading', 'vocabulary')), -- 문해력, 어휘력
    taken_at TIMESTAMP DEFAULT NOW(),        -- 시험 응시 날짜
    questions JSONB NOT NULL,                -- 문제와 답을 JSON으로 저장
    user_answers JSONB,                      -- 사용자가 선택한 답을 JSON으로 저장
    total_score INT                          -- 총 점수
);

-- 게임 (JOIN 가능: users)
CREATE TABLE IF NOT EXISTS user_games (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    game_type VARCHAR(50) NOT NULL,
    difficulty VARCHAR(50), -- 난이도/나이대 자유 입력
    played_at TIMESTAMP DEFAULT now(),
    score INT NOT NULL,
    word_history JSONB, -- 끝말잇기 전용
    CONSTRAINT user_games_game_type_check
        CHECK (
            game_type::text = ANY (
                ARRAY[
                    'word_chain'::character varying,
                    'word_spell'::character varying,
                    'sentence_completion'::character varying
                ]::text[]
            )
        ),
    CONSTRAINT user_games_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- 구독권 (JOIN 가능: users)
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,                         -- 구독자 (users 테이블 FK)
    plan_name VARCHAR(50) NOT NULL,               -- 현재 구독 플랜
    amount INT NOT NULL,                          -- 현재 결제 금액
    billing_key VARCHAR(100) NOT NULL,            -- 토스 billingKey
    order_id VARCHAR(100),                        -- 결제 건별 orderId
    method VARCHAR(20),                           -- 결제 수단 (카드 등)
    status VARCHAR(20) DEFAULT 'authorized',      -- authorized / paid / canceled
    start_date TIMESTAMP NOT NULL,                -- 구독 시작일
    end_date TIMESTAMP NOT NULL,                  -- 구독 종료일
    paid_at TIMESTAMP NOT NULL,                   -- 마지막 결제 시각
    next_plan_name VARCHAR(50),                   -- ✅ 다음 결제부터 적용할 플랜
    next_amount INT,                              -- ✅ 다음 결제부터 적용할 금액
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 고객센터 게시판 (질문+답변 쓰레드 구조) (JOIN 가능: users, 자기참조 가능: parent_id)
CREATE TABLE IF NOT EXISTS customer_support (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    parent_id INT REFERENCES customer_support(id) ON DELETE CASCADE, -- null이면 질문, 값이 있으면 답변/댓글
    category VARCHAR(50),
    title VARCHAR(255),
    content TEXT,
    status VARCHAR(20) CHECK (status IN ('open','in_progress','resolved','closed')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- outputs 분석 결과 저장 - 분석결과 반환용 (JOIN 가능: users)
CREATE TABLE IF NOT EXISTS outputs (
    outputs_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    content_id INT REFERENCES daily_writings(id),
    timestamp TIMESTAMPTZ DEFAULT NOW(),--날짜
    analysis_result JSONB --분석 결과 (예: TTR, 평균 문장 길이 등)
);

-- 사용한 단어 분석 결과-한 content 기준 (JOIN 가능: outputs, words)
CREATE TABLE IF NOT EXISTS user_word_usage (
    usage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outputs_id UUID REFERENCES outputs(outputs_id) ON DELETE CASCADE,
    user_id int references users(id) on DELETE cascade,
    content_id INT REFERENCES daily_writings(id) ON DELETE CASCADE,
    word VARCHAR(50), -- 사용한 단어(content 분석 추출)
    category VARCHAR(10) check (category in ('daily','reading')),    -- word_id 별 빈도(한 content 기준)
    created_at Date
);

--모델 학습용 기준단어와 유사 단어 리스트 Db
CREATE TABLE IF NOT EXISTS similar_words (
    id SERIAL PRIMARY KEY,
    base_word VARCHAR(50) NOT NULL,
    similar_words JSONB
);
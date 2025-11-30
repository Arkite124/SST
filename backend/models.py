from typing import List, Optional

from sqlalchemy import BigInteger, Boolean, CheckConstraint, Column, Date, DateTime, ForeignKeyConstraint, Identity, Index, Integer, PrimaryKeyConstraint, String, Text, UniqueConstraint, Uuid, text, Float
from sqlalchemy.dialects.postgresql import JSONB
from pgvector.sqlalchemy import Vector
from sqlalchemy.orm import Mapped, declarative_base, mapped_column, relationship
from sqlalchemy.orm.base import Mapped

Base = declarative_base()

class SimilarWords(Base):
    __tablename__ = 'similar_words'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='similar_words_pkey'),
        UniqueConstraint('base_word', name='similar_words_base_word_key')
    )

    id = mapped_column(Integer)
    base_word = mapped_column(String(100), nullable=False)
    similar_word_list = mapped_column(JSONB)

class Users(Base):
    __tablename__ = 'users'
    __table_args__ = (
        CheckConstraint("oauth::text = ANY (ARRAY['google'::character varying, 'naver'::character varying, 'kakao'::character varying]::text[])", name='users_oauth_check'),
        CheckConstraint("role::text = ANY (ARRAY['customer'::character varying, 'admin'::character varying]::text[])", name='users_role_check'),
        PrimaryKeyConstraint('id', name='users_pkey'),
        UniqueConstraint('email', name='users_email_key'),
        UniqueConstraint('phone', name='users_phone_key')
    )

    id = mapped_column(Integer, Identity(always=True, start=1, increment=1, minvalue=1, maxvalue=2147483647, cycle=False, cache=1))
    email = mapped_column(String(255), nullable=False)
    password = mapped_column(String(255))
    name = mapped_column(String(20))
    nickname = mapped_column(String(20))
    vocabulary_age = mapped_column(Integer, server_default=text('4'))
    age = mapped_column(Integer)
    exp = mapped_column(BigInteger, server_default=text('0'))
    gender = mapped_column(String(10))
    phone = mapped_column(String(20))
    oauth = mapped_column(String(20))
    role = mapped_column(String(20), server_default=text("'customer'::character varying"))
    created_at = mapped_column(DateTime, server_default=text('now()'))
    updated_at = mapped_column(DateTime, server_default=text('now()'))
    profile_img_url = mapped_column(String(255), server_default=text('NULL::character varying'))
    key_parent = mapped_column(String(100), server_default=text('NULL::character varying'))

    customer_support_posts: Mapped[List['CustomerSupportPosts']] = relationship('CustomerSupportPosts', uselist=True, back_populates='user')
    customer_support_comments: Mapped[List['CustomerSupportComments']] = relationship('CustomerSupportComments', uselist=True, back_populates='user')
    daily_writings: Mapped[List['DailyWritings']] = relationship('DailyWritings', uselist=True, back_populates='user')
    parent_forum_posts: Mapped[List['ParentForumPosts']] = relationship('ParentForumPosts', uselist=True, back_populates='user')
    reading_forum_posts: Mapped[List['ReadingForumPosts']] = relationship('ReadingForumPosts', uselist=True, back_populates='user')
    reading_logs: Mapped[List['ReadingLogs']] = relationship('ReadingLogs', uselist=True, back_populates='user')
    subscriptions: Mapped[List['Subscriptions']] = relationship('Subscriptions', uselist=True, back_populates='user')
    user_bans: Mapped[List['UserBans']] = relationship('UserBans', uselist=True, foreign_keys='[UserBans.banned_by]', back_populates='users')
    user_bans_: Mapped[List['UserBans']] = relationship('UserBans', uselist=True, foreign_keys='[UserBans.user_id]', back_populates='user')
    user_games: Mapped[List['UserGames']] = relationship('UserGames', uselist=True, back_populates='user')
    user_tests: Mapped[List['UserTests']] = relationship('UserTests', uselist=True, back_populates='user')
    outputs: Mapped[List['Outputs']] = relationship('Outputs', uselist=True, back_populates='user')
    user_word_usage: Mapped[List['UserWordUsage']] = relationship('UserWordUsage', uselist=True, back_populates='user')
    reading_forum_comments: Mapped[List["ReadingForumComments"]] = relationship(
        "ReadingForumComments", back_populates="user"
    )
    parent_forum_comments: Mapped[List["ParentForumComments"]] = relationship(
        "ParentForumComments", back_populates="user"
    )

class CustomerSupportPosts(Base):
    __tablename__ = 'customer_support_posts'
    __table_args__ = (
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        CheckConstraint("status IN ('open','in_progress','resolved','closed')"),
        PrimaryKeyConstraint('id'),
    )

    id = mapped_column(Integer)
    user_id = mapped_column(Integer)
    category = mapped_column(String(50))
    title = mapped_column(String(255))
    content = mapped_column(Text, nullable=False)
    status = mapped_column(String(20), server_default=text("'open'"))
    created_at = mapped_column(DateTime, server_default=text('now()'))
    updated_at = mapped_column(DateTime, server_default=text('now()'))

    user: Mapped["Users"] = relationship("Users", back_populates="customer_support_posts")

    comments: Mapped[List["CustomerSupportComments"]] = relationship(
        "CustomerSupportComments", back_populates="post", cascade="all, delete-orphan"
    )

class CustomerSupportComments(Base):
    __tablename__ = "customer_support_comments"
    __table_args__ = (
        ForeignKeyConstraint(['post_id'], ['customer_support_posts.id'], ondelete='CASCADE'),
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        ForeignKeyConstraint(['reply_id'], ['customer_support_comments.id'], ondelete='CASCADE'),
        PrimaryKeyConstraint('id'),
    )
    id = mapped_column(Integer)
    post_id = mapped_column(Integer, nullable=False)
    user_id = mapped_column(Integer, nullable=False)
    reply_id = mapped_column(Integer)
    content = mapped_column(Text, nullable=False)
    created_at = mapped_column(DateTime, server_default=text('now()'))
    updated_at = mapped_column(DateTime, server_default=text('now()'))
    post = relationship("CustomerSupportPosts", back_populates="comments")
    user = relationship("Users", back_populates="customer_support_comments")
    parent = relationship(
        "CustomerSupportComments",
        remote_side="CustomerSupportComments.id",
        back_populates="replies",
        foreign_keys="CustomerSupportComments.reply_id"
    )
    replies = relationship(
        "CustomerSupportComments",
        back_populates="parent",
        foreign_keys="CustomerSupportComments.reply_id"
    )

class DailyWritings(Base):
    __tablename__ = 'daily_writings'
    __table_args__ = (
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE', name='daily_writings_user_id_fkey'),
        PrimaryKeyConstraint('id', name='daily_writings_pkey')
    )

    id = mapped_column(Integer)
    mood = mapped_column(Integer, nullable=False)
    created_at = mapped_column(DateTime, nullable=False, server_default=text('now()'))
    content = mapped_column(Text, nullable=False)
    user_id = mapped_column(Integer)
    title = mapped_column(String(255))
    cleaned_content = mapped_column(Text)
    attachment_url = mapped_column(String(255))

    user: Mapped[Optional['Users']] = relationship('Users', back_populates='daily_writings')

class ParentForumPosts(Base):
    __tablename__ = 'parent_forum_posts'
    __table_args__ = (
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        PrimaryKeyConstraint('id'),
    )

    id = mapped_column(Integer)
    user_id = mapped_column(Integer, nullable=False)
    title = mapped_column(String(255))
    content = mapped_column(Text, nullable=False)
    category = mapped_column(String(50))
    is_important = mapped_column(Boolean, server_default=text('false'))
    created_at = mapped_column(DateTime, server_default=text('now()'))
    updated_at = mapped_column(DateTime, server_default=text('now()'))

    user: Mapped["Users"] = relationship("Users", back_populates="parent_forum_posts")

    # 🔥 게시글 ↔ 댓글 (1:N)
    comments: Mapped[List["ParentForumComments"]] = relationship(
        "ParentForumComments", back_populates="post", cascade="all, delete-orphan"
    )

class ParentForumComments(Base):
    __tablename__ = "parent_forum_comments"
    __table_args__ = (
        ForeignKeyConstraint(['post_id'], ['parent_forum_posts.id'], ondelete="CASCADE"),
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete="CASCADE"),
        ForeignKeyConstraint(['reply_id'], ['parent_forum_comments.id'], ondelete="CASCADE"),
        PrimaryKeyConstraint('id'),
    )

    id = mapped_column(Integer)
    post_id = mapped_column(Integer, nullable=False)
    user_id = mapped_column(Integer, nullable=False)
    reply_id = mapped_column(Integer)
    content = mapped_column(Text, nullable=False)
    created_at = mapped_column(DateTime, server_default=text("now()"))
    updated_at = mapped_column(DateTime, server_default=text("now()"))

    post = relationship("ParentForumPosts", back_populates="comments")
    user = relationship("Users", back_populates="parent_forum_comments")
    parent = relationship(
        "ParentForumComments",
        remote_side="ParentForumComments.id",
        back_populates="replies",
        foreign_keys="ParentForumComments.reply_id"
    )
    replies = relationship(
        "ParentForumComments",
        back_populates="parent",
        foreign_keys="ParentForumComments.reply_id"
    )

class ReadingForumPosts(Base):
    __tablename__ = 'reading_forum_posts'
    __table_args__ = (
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        PrimaryKeyConstraint('id'),
    )

    id = mapped_column(Integer)
    user_id = mapped_column(Integer, nullable=False)
    title = mapped_column(String(255))
    content = mapped_column(Text, nullable=False)
    book_title = mapped_column(String(255))
    discussion_tags = mapped_column(String(100))
    created_at = mapped_column(DateTime, server_default=text('now()'))
    updated_at = mapped_column(DateTime, server_default=text('now()'))

    user: Mapped["Users"] = relationship("Users", back_populates="reading_forum_posts")

    # 🔥 게시글 ↔ 댓글 (1:N)
    comments: Mapped[List["ReadingForumComments"]] = relationship(
        "ReadingForumComments", back_populates="post", cascade="all, delete-orphan"
    )

class ReadingForumComments(Base):
    __tablename__ = "reading_forum_comments"
    __table_args__ = (
        ForeignKeyConstraint(['post_id'], ['reading_forum_posts.id'], ondelete="CASCADE"),
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete="CASCADE"),
        ForeignKeyConstraint(['reply_id'], ['reading_forum_comments.id'], ondelete="CASCADE"),
        PrimaryKeyConstraint('id'),
    )

    id = mapped_column(Integer)
    post_id = mapped_column(Integer, nullable=False)
    user_id = mapped_column(Integer, nullable=False)
    reply_id = mapped_column(Integer)  # 🔥 parent_id → reply_id
    content = mapped_column(Text, nullable=False)
    created_at = mapped_column(DateTime, server_default=text("now()"))
    updated_at = mapped_column(DateTime, server_default=text("now()"))

    post = relationship("ReadingForumPosts", back_populates="comments")
    user = relationship("Users", back_populates="reading_forum_comments")
    # self-referencing relationships
    parent = relationship(
        "ReadingForumComments",
        remote_side="ReadingForumComments.id",
        back_populates="replies",
        foreign_keys="ReadingForumComments.reply_id"
    )
    replies = relationship(
        "ReadingForumComments",
        back_populates="parent",
        foreign_keys="ReadingForumComments.reply_id"
    )


class ReadingLogs(Base):
    __tablename__ = 'reading_logs'
    __table_args__ = (
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE', name='reading_logs_user_id_fkey'),
        PrimaryKeyConstraint('id', name='reading_logs_pkey')
    )

    id = mapped_column(Integer)
    created_at = mapped_column(DateTime, nullable=False, server_default=text('now()'))
    book_title = mapped_column(String(255), nullable=False)
    user_id = mapped_column(Integer)
    updated_at = mapped_column(DateTime)
    sentiment = mapped_column(String(20))
    author = mapped_column(String(255))
    publisher = mapped_column(String(255))
    content = mapped_column(Text)
    cleaned_content = mapped_column(Text)
    unknown_sentence = mapped_column(Text)

    user: Mapped[Optional['Users']] = relationship('Users', back_populates='reading_logs')


class Subscriptions(Base):
    __tablename__ = 'subscriptions'
    __table_args__ = (
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE', name='fk_user'),
        PrimaryKeyConstraint('id', name='subscriptions_pkey')
    )

    id = mapped_column(Integer)
    user_id = mapped_column(Integer, nullable=False)
    plan_name = mapped_column(String(50), nullable=False)
    amount = mapped_column(Integer, nullable=False)
    start_date = mapped_column(DateTime, nullable=False)
    end_date = mapped_column(DateTime, nullable=False)
    paid_at = mapped_column(DateTime, nullable=False)
    billing_key = mapped_column(String(100))
    order_id = mapped_column(String(100))
    method = mapped_column(String(20))
    status = mapped_column(String(20), server_default=text("'authorized'::character varying"))
    created_at = mapped_column(DateTime, server_default=text('now()'))
    updated_at = mapped_column(DateTime, server_default=text('now()'))
    next_plan_name = mapped_column(String(50))
    next_amount = mapped_column(Integer)

    user: Mapped['Users'] = relationship('Users', back_populates='subscriptions')


class UserBans(Base):
    __tablename__ = 'user_bans'
    __table_args__ = (
        CheckConstraint("status::text = ANY (ARRAY['active'::character varying, 'expired'::character varying, 'lifted'::character varying]::text[])", name='user_bans_status_check'),
        ForeignKeyConstraint(['banned_by'], ['users.id'], ondelete='SET NULL', name='fk_banned_by'),
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE', name='fk_banned_user'),
        PrimaryKeyConstraint('id', name='user_bans_pkey'),
        Index('uniq_active_ban_per_user', 'user_id', unique=True)
    )

    id = mapped_column(Integer)
    user_id = mapped_column(Integer, nullable=False)
    reason = mapped_column(String(255), nullable=False)
    start_date = mapped_column(DateTime, nullable=False, server_default=text('now()'))
    end_date = mapped_column(DateTime)
    banned_by = mapped_column(Integer)
    is_auto = mapped_column(Boolean, server_default=text('false'))
    status = mapped_column(String(20), server_default=text("'active'::character varying"))
    notes = mapped_column(Text)
    created_at = mapped_column(DateTime, server_default=text('now()'))
    updated_at = mapped_column(DateTime, server_default=text('now()'))

    users: Mapped[Optional['Users']] = relationship('Users', foreign_keys=[banned_by], back_populates='user_bans')
    user: Mapped['Users'] = relationship('Users', foreign_keys=[user_id], back_populates='user_bans_')


class UserGames(Base):
    __tablename__ = 'user_games'
    __table_args__ = (
        CheckConstraint("game_type::text = ANY (ARRAY['word_chain'::character varying::text, 'word_spell'::character varying::text, 'sentence_completion'::character varying::text])", name='user_games_game_type_check'),
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE', name='user_games_user_id_fkey'),
        PrimaryKeyConstraint('id', name='user_games_pkey')
    )

    id = mapped_column(Integer)
    user_id = mapped_column(Integer, nullable=False)
    game_type = mapped_column(String(50), nullable=False)
    score = mapped_column(Integer, nullable=False)
    difficulty = mapped_column(String(50))
    played_at = mapped_column(DateTime, server_default=text('now()'))
    word_history = mapped_column(JSONB)

    user: Mapped['Users'] = relationship('Users', back_populates='user_games')

class VocaLabels(Base):
    __tablename__ = "voca_labels"

    id = Column(Integer, primary_key=True, autoincrement=True)
    word = Column(String(50), nullable=False)
    pos = Column(String(20))
    meaning = Column(Text)
    field = Column(String(50))
    difficulty = Column(Float)
    assigned_age = Column(Integer)
    embedding = Column(Vector(768))

class UserTests(Base):
    __tablename__ = 'user_tests'
    __table_args__ = (
        CheckConstraint("test_type::text = ANY (ARRAY['reading'::character varying, 'vocabulary'::character varying]::text[])", name='user_tests_test_type_check'),
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE', name='user_tests_user_id_fkey'),
        PrimaryKeyConstraint('id', name='user_tests_pkey')
    )

    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    questions = mapped_column(JSONB, nullable=False)
    user_id = mapped_column(Integer)
    test_type = mapped_column(String(50))
    taken_at = mapped_column(DateTime, server_default=text('now()'))
    user_answers = mapped_column(JSONB)
    total_score = mapped_column(Integer)

    user: Mapped[Optional['Users']] = relationship('Users', back_populates='user_tests')

class UserWordTotal(Users):
    __tablename__ = 'user_word_total'
    __table_args__ = (
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE', name='user_word_total_user_id_fkey'),
        PrimaryKeyConstraint('user_id', name='user_word_total_pkey')
    )

    user_id = mapped_column(Integer)
    total_frequency = mapped_column(Integer, nullable=False, server_default=text('0'))
    word = mapped_column(String(50))


class Outputs(Base):
    __tablename__ = 'outputs'
    __table_args__ = (
        ForeignKeyConstraint(
            ['user_id'], ['users.id'],
            ondelete='CASCADE',
            name='outputs_user_id_fkey'
        ),
        PrimaryKeyConstraint('outputs_id', name='outputs_pkey'),
    )
    outputs_id = mapped_column(Uuid, server_default=text('gen_random_uuid()'), primary_key=True)
    user_id = mapped_column(Integer, nullable=False)
    # daily / reading / future 확장 가능
    category = mapped_column(String(20), nullable=False)  # 'daily', 'reading'
    # daily or reading table ID
    content_id = mapped_column(Integer, nullable=False)
    timestamp = mapped_column(
        DateTime(timezone=True),
        server_default=text('now()')
    )
    # 여기에 모든 분석 결과 저장
    analysis_result = mapped_column(JSONB, nullable=False)
    # 관계 (선택적, viewonly)
    daily = relationship(
        'DailyWritings',
        primaryjoin="and_(Outputs.content_id == foreign(DailyWritings.id), Outputs.category=='daily')",
        viewonly=True
    )
    reading = relationship(
        'ReadingLogs',
        primaryjoin="and_(Outputs.content_id == foreign(ReadingLogs.id), Outputs.category=='reading')",
        viewonly=True
    )
    user = relationship('Users', back_populates='outputs')

class UserWordUsage(Base):
    __tablename__ = 'user_word_usage'
    __table_args__ = (
        CheckConstraint(
            "category IN ('daily','reading')",
            name="user_word_usage_category_check"
        ),
        ForeignKeyConstraint(
            ['user_id'], ['users.id'],
            ondelete='CASCADE'
        ),
        PrimaryKeyConstraint('usage_id'),
    )
    usage_id = mapped_column(Uuid, server_default=text('gen_random_uuid()'))
    user_id = mapped_column(Integer, nullable=False)
    content_id = mapped_column(Integer, nullable=False)
    # analysis_result -> word_list를 받아서 저장
    analysis_result = mapped_column(JSONB, nullable=False)
    # 카테고리(daily / reading)
    category = mapped_column(String(10), nullable=False)
    created_at = mapped_column(Date, server_default=text('CURRENT_DATE'))

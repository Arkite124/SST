from typing import List, Optional

from sqlalchemy import BigInteger, Boolean, CheckConstraint, Column, Date, DateTime, ForeignKeyConstraint, Identity, Index, Integer, PrimaryKeyConstraint, String, Text, UniqueConstraint, Uuid, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, declarative_base, mapped_column, relationship
from sqlalchemy.orm.base import Mapped

Base = declarative_base()


class SimilarWords(Base):
    __tablename__ = 'similar_words'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='similar_words_pkey'),
    )

    id = mapped_column(Integer)
    base_word = mapped_column(String(50), nullable=False)
    similar_words = mapped_column(JSONB)


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

    customer_support: Mapped[List['CustomerSupport']] = relationship('CustomerSupport', uselist=True, back_populates='user')
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


class CustomerSupport(Base):
    __tablename__ = 'customer_support'
    __table_args__ = (
        CheckConstraint("status::text = ANY (ARRAY['open'::character varying, 'in_progress'::character varying, 'resolved'::character varying, 'closed'::character varying]::text[])", name='customer_support_status_check'),
        ForeignKeyConstraint(['parent_id'], ['customer_support.id'], ondelete='CASCADE', name='customer_support_parent_id_fkey'),
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE', name='customer_support_user_id_fkey'),
        PrimaryKeyConstraint('id', name='customer_support_pkey')
    )

    id = mapped_column(Integer)
    user_id = mapped_column(Integer)
    parent_id = mapped_column(Integer)
    category = mapped_column(String(50))
    title = mapped_column(String(255))
    content = mapped_column(Text)
    status = mapped_column(String(20))
    created_at = mapped_column(DateTime, server_default=text('now()'))
    updated_at = mapped_column(DateTime, server_default=text('now()'))

    parent: Mapped[Optional['CustomerSupport']] = relationship('CustomerSupport', remote_side=[id], back_populates='parent_reverse')
    parent_reverse: Mapped[List['CustomerSupport']] = relationship('CustomerSupport', uselist=True, remote_side=[parent_id], back_populates='parent')
    user: Mapped[Optional['Users']] = relationship('Users', back_populates='customer_support')


class DailyWritings(Base):
    __tablename__ = 'daily_writings'
    __table_args__ = (
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE', name='daily_writings_user_id_fkey'),
        PrimaryKeyConstraint('id', name='daily_writings_pkey')
    )

    id = mapped_column(Integer)
    created_at = mapped_column(DateTime, nullable=False, server_default=text('now()'))
    content = mapped_column(Text, nullable=False)
    user_id = mapped_column(Integer)
    title = mapped_column(String(255))
    cleaned_content = mapped_column(Text)
    mood = mapped_column(Integer, nullable=False)
    attachment_url = mapped_column(String(255))

    user: Mapped[Optional['Users']] = relationship('Users', back_populates='daily_writings')
    outputs: Mapped[List['Outputs']] = relationship('Outputs', uselist=True, back_populates='content')
    user_word_usage: Mapped[List['UserWordUsage']] = relationship('UserWordUsage', uselist=True, back_populates='content')


class ParentForumPosts(Base):
    __tablename__ = 'parent_forum_posts'
    __table_args__ = (
        ForeignKeyConstraint(['parent_id'], ['parent_forum_posts.id'], ondelete='CASCADE', name='parent_forum_posts_parent_id_fkey'),
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE', name='parent_forum_posts_user_id_fkey'),
        PrimaryKeyConstraint('id', name='parent_forum_posts_pkey')
    )

    id = mapped_column(Integer)
    content = mapped_column(Text, nullable=False)
    user_id = mapped_column(Integer)
    parent_id = mapped_column(Integer)
    title = mapped_column(String(255))
    created_at = mapped_column(DateTime, server_default=text('now()'))
    updated_at = mapped_column(DateTime, server_default=text('now()'))
    category = mapped_column(String(50))
    is_important = mapped_column(Boolean, server_default=text('false'))

    parent: Mapped[Optional['ParentForumPosts']] = relationship('ParentForumPosts', remote_side=[id], back_populates='parent_reverse')
    parent_reverse: Mapped[List['ParentForumPosts']] = relationship('ParentForumPosts', uselist=True, remote_side=[parent_id], back_populates='parent')
    user: Mapped[Optional['Users']] = relationship('Users', back_populates='parent_forum_posts')


class ReadingForumPosts(Base):
    __tablename__ = 'reading_forum_posts'
    __table_args__ = (
        ForeignKeyConstraint(['parent_id'], ['reading_forum_posts.id'], ondelete='CASCADE', name='reading_forum_posts_parent_id_fkey'),
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE', name='reading_forum_posts_user_id_fkey'),
        PrimaryKeyConstraint('id', name='reading_forum_posts_pkey')
    )

    id = mapped_column(Integer)
    content = mapped_column(Text, nullable=False)
    user_id = mapped_column(Integer)
    parent_id = mapped_column(Integer)
    title = mapped_column(String(255))
    created_at = mapped_column(DateTime, server_default=text('now()'))
    updated_at = mapped_column(DateTime, server_default=text('now()'))
    book_title = mapped_column(String(255))
    discussion_tags = mapped_column(String(100))

    parent: Mapped[Optional['ReadingForumPosts']] = relationship('ReadingForumPosts', remote_side=[id], back_populates='parent_reverse')
    parent_reverse: Mapped[List['ReadingForumPosts']] = relationship('ReadingForumPosts', uselist=True, remote_side=[parent_id], back_populates='parent')
    user: Mapped[Optional['Users']] = relationship('Users', back_populates='reading_forum_posts')


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
    billing_key = mapped_column(String(100), nullable=False)
    start_date = mapped_column(DateTime, nullable=False)
    end_date = mapped_column(DateTime, nullable=False)
    paid_at = mapped_column(DateTime, nullable=False)
    order_id = mapped_column(String(100))
    method = mapped_column(String(20))
    status = mapped_column(String(20), server_default=text("'authorized'::character varying"))
    next_plan_name = mapped_column(String(50))
    next_amount = mapped_column(Integer)
    created_at = mapped_column(DateTime, server_default=text('now()'))
    updated_at = mapped_column(DateTime, server_default=text('now()'))

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


class UserTests(Base):
    __tablename__ = 'user_tests'
    __table_args__ = (
        CheckConstraint("test_type::text = ANY (ARRAY['reading'::character varying, 'vocabulary'::character varying]::text[])", name='user_tests_test_type_check'),
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE', name='user_tests_user_id_fkey'),
        PrimaryKeyConstraint('id', name='user_tests_pkey')
    )

    id = mapped_column(Integer)
    questions = mapped_column(JSONB, nullable=False)
    user_id = mapped_column(Integer)
    test_type = mapped_column(String(50))
    taken_at = mapped_column(DateTime, server_default=text('now()'))
    user_answers = mapped_column(JSONB)
    total_score = mapped_column(Integer)

    user: Mapped[Optional['Users']] = relationship('Users', back_populates='user_tests')


class Outputs(Base):
    __tablename__ = 'outputs'
    __table_args__ = (
        ForeignKeyConstraint(['content_id'], ['daily_writings.id'], name='outputs_content_id_fkey'),
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE', name='outputs_user_id_fkey'),
        PrimaryKeyConstraint('outputs_id', name='outputs_pkey')
    )

    outputs_id = mapped_column(Uuid, server_default=text('gen_random_uuid()'))
    user_id = mapped_column(Integer)
    content_id = mapped_column(Integer)
    timestamp = mapped_column(DateTime(True), server_default=text('now()'))
    analysis_result = mapped_column(JSONB)

    content: Mapped[Optional['DailyWritings']] = relationship('DailyWritings', back_populates='outputs')
    user: Mapped[Optional['Users']] = relationship('Users', back_populates='outputs')
    user_word_usage: Mapped[List['UserWordUsage']] = relationship('UserWordUsage', uselist=True, back_populates='record')


class UserWordUsage(Base):
    __tablename__ = 'user_word_usage'
    __table_args__ = (
        CheckConstraint("category::text = ANY (ARRAY['daily'::character varying, 'reading'::character varying]::text[])", name='user_word_usage_category_check'),
        ForeignKeyConstraint(['content_id'], ['daily_writings.id'], ondelete='CASCADE', name='user_word_usage_content_id_fkey'),
        ForeignKeyConstraint(['outputs_id'], ['outputs.outputs_id'], ondelete='CASCADE', name='user_word_usage_outputs_id_fkey'),
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE', name='user_word_usage_user_id_fkey'),
        PrimaryKeyConstraint('usage_id', name='user_word_usage_pkey')
    )

    usage_id = mapped_column(Uuid, server_default=text('gen_random_uuid()'))
    outputs_id = mapped_column(Uuid)
    user_id = mapped_column(Integer)
    content_id = mapped_column(Integer)
    word = mapped_column(String(50))
    category = mapped_column(String(10))
    created_at = mapped_column(Date)

    content: Mapped[Optional['DailyWritings']] = relationship('DailyWritings', back_populates='user_word_usage')
    record: Mapped[Optional['Outputs']] = relationship('Outputs', back_populates='user_word_usage')
    user: Mapped[Optional['Users']] = relationship('Users', back_populates='user_word_usage')

-- IntelliRev Supabase Schema
-- Run this in your Supabase SQL editor

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ─── Topics ───────────────────────────────────────────────────────────────
create table if not exists topics (
  id          uuid primary key default uuid_generate_v4(),
  user_id     text not null,
  plan_id     text,
  name        text not null,
  day         integer not null default 1,
  created_at  timestamptz default now()
);

-- ─── Study Plans ─────────────────────────────────────────────────────────
create table if not exists plans (
  id          uuid primary key default uuid_generate_v4(),
  user_id     text not null,
  schedule    jsonb not null,
  created_at  timestamptz default now()
);

-- ─── Videos ──────────────────────────────────────────────────────────────
create table if not exists videos (
  id          uuid primary key default uuid_generate_v4(),
  topic_id    uuid references topics(id),
  video_id    text not null,
  title       text,
  url         text,
  embed_url   text,
  duration    integer,
  views       bigint,
  created_at  timestamptz default now()
);

-- ─── Web Resources ────────────────────────────────────────────────────────
create table if not exists resources (
  id          uuid primary key default uuid_generate_v4(),
  topic_id    uuid references topics(id),
  title       text,
  url         text,
  snippet     text,
  created_at  timestamptz default now()
);

-- ─── Notes ────────────────────────────────────────────────────────────────
create table if not exists notes (
  id          uuid primary key default uuid_generate_v4(),
  topic_id    uuid references topics(id),
  topic_name  text,
  summary     jsonb,   -- list of bullet sentences
  keywords    jsonb,   -- list of keyword strings
  raw_text    text,    -- truncated transcript for search
  created_at  timestamptz default now()
);

-- ─── Questions ────────────────────────────────────────────────────────────
create table if not exists questions (
  id              uuid primary key default uuid_generate_v4(),
  topic_id        uuid references topics(id),
  question_text   text not null,
  question_type   text not null, -- 'fill_blank' | 'mcq'
  options         jsonb,         -- null for fill_blank
  answer          text not null,
  created_at      timestamptz default now()
);

-- ─── Attempts ─────────────────────────────────────────────────────────────
create table if not exists attempts (
  id          uuid primary key default uuid_generate_v4(),
  user_id     text not null,
  topic_id    uuid references topics(id),
  score       integer not null default 0,
  total       integer not null default 0,
  percentage  float not null default 0,
  created_at  timestamptz default now()
);

-- ─── Weak Topics ──────────────────────────────────────────────────────────
create table if not exists weak_topics (
  id                uuid primary key default uuid_generate_v4(),
  user_id           text not null,
  topic_id          uuid references topics(id),
  weakness_score    integer not null default 0,
  confidence_score  float not null default 50.0,
  classification    text not null default 'medium', -- strong | medium | weak
  created_at        timestamptz default now(),
  unique (user_id, topic_id)
);

-- ─── Revision Schedule ────────────────────────────────────────────────────
create table if not exists revision_schedule (
  id              uuid primary key default uuid_generate_v4(),
  user_id         text not null,
  topic_id        uuid references topics(id),
  next_revision   date not null,
  classification  text not null default 'medium',
  created_at      timestamptz default now(),
  unique (user_id, topic_id)
);

-- ─── Scores (Gamification) ────────────────────────────────────────────────
create table if not exists scores (
  id            uuid primary key default uuid_generate_v4(),
  user_id       text not null unique,
  total_score   integer not null default 0,
  streak        integer not null default 0,
  last_active   timestamptz default now(),
  created_at    timestamptz default now()
);

-- ─── Row Level Security (enable for production) ───────────────────────────
-- alter table topics enable row level security;
-- alter table plans enable row level security;
-- ... (add policies as needed once auth is implemented)

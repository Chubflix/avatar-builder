-- Migration: 001_initial_schema
-- Created: 2024-01-01
-- Description: Initial database schema

CREATE TABLE IF NOT EXISTS generations (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    positive_prompt TEXT,
    negative_prompt TEXT,
    model TEXT,
    orientation TEXT,
    width INTEGER,
    height INTEGER,
    batch_size INTEGER,
    sampler_name TEXT,
    scheduler TEXT,
    steps INTEGER,
    cfg_scale REAL,
    seed INTEGER,
    adetailer_enabled INTEGER,
    adetailer_model TEXT,
    info_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

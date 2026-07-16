-- Project Mahiru/Amane Database Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    username VARCHAR(255) UNIQUE NOT NULL,
    current_difficulty VARCHAR(50) DEFAULT 'neutral', -- e.g., neutral, distracted, hostile
    homework_completed BOOLEAN DEFAULT false,
    -- Tracks whether they've unlocked advanced features
    lock_out_status VARCHAR(50) DEFAULT 'locked' -- 'locked' or 'unlocked'
);

-- 2. Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    session_title VARCHAR(255)
);

-- 3. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    role VARCHAR(50) NOT NULL, -- 'user', 'coach', or 'analyst_feedback'
    content TEXT NOT NULL,
    
    -- Analyst metrics for user messages
    passiveness_score INTEGER DEFAULT 0,
    apology_count INTEGER DEFAULT 0,
    hesitation_count INTEGER DEFAULT 0,
    feedback_notes TEXT
);

-- 4. Progression State (Long-term tracking)
CREATE TABLE IF NOT EXISTS progression_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    skill_category VARCHAR(100) NOT NULL, -- e.g., 'boundary_setting', 'cold_email'
    mastery_level INTEGER DEFAULT 0,
    last_practiced TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

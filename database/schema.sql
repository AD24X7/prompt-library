-- Prompt Library Database Schema for Supabase (PostgreSQL)
-- This schema supports the full prompt library application with proper normalization

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For better text search performance

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories table
CREATE TABLE public.categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prompts table (main entity)
CREATE TABLE public.prompts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    prompt TEXT NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    category_name TEXT, -- Denormalized for easier queries
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
    estimated_time TEXT DEFAULT '5-10 minutes',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usage_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0, -- Calculated average rating
    last_used TIMESTAMP WITH TIME ZONE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Creator
    
    -- JSON arrays for flexible data
    tags JSONB DEFAULT '[]'::jsonb,
    placeholders JSONB DEFAULT '[]'::jsonb,
    apps JSONB DEFAULT '[]'::jsonb, -- Recommended apps/tools
    urls JSONB DEFAULT '[]'::jsonb  -- Related resources
);

-- Reviews table
CREATE TABLE public.reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    tool_used TEXT NOT NULL,
    prompt_edits TEXT,
    what_worked TEXT,
    what_didnt_work TEXT,
    improvement_suggestions TEXT,
    test_run_graphics_link TEXT,
    parent_review_id UUID REFERENCES reviews(id) ON DELETE CASCADE, -- For threading
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- JSON arrays for media files
    media_files JSONB DEFAULT '[]'::jsonb,
    screenshots JSONB DEFAULT '[]'::jsonb
);

-- Comments table (separate from reviews for cleaner structure)
CREATE TABLE public.comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- For threading
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage tracking table (for analytics)
CREATE TABLE public.prompt_usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Tags table (normalized for better tag management)
CREATE TABLE public.tags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table for prompt-tags many-to-many relationship
CREATE TABLE public.prompt_tags (
    prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (prompt_id, tag_id)
);

-- Favorites table (users can favorite prompts)
CREATE TABLE public.favorites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, prompt_id)
);

-- User sessions table (optional, for tracking active users)
CREATE TABLE public.user_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_prompts_category ON prompts(category_id);
CREATE INDEX idx_prompts_user ON prompts(user_id);
CREATE INDEX idx_prompts_created_at ON prompts(created_at DESC);
CREATE INDEX idx_prompts_rating ON prompts(rating DESC);
CREATE INDEX idx_prompts_usage_count ON prompts(usage_count DESC);
CREATE INDEX idx_prompts_title_search ON prompts USING gin(to_tsvector('english', title));
CREATE INDEX idx_prompts_content_search ON prompts USING gin(to_tsvector('english', prompt));
CREATE INDEX idx_prompts_tags ON prompts USING gin(tags);

CREATE INDEX idx_reviews_prompt ON reviews(prompt_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX idx_reviews_parent ON reviews(parent_review_id);

CREATE INDEX idx_comments_prompt ON comments(prompt_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);

CREATE INDEX idx_usage_prompt ON prompt_usage(prompt_id);
CREATE INDEX idx_usage_user ON prompt_usage(user_id);
CREATE INDEX idx_usage_date ON prompt_usage(used_at DESC);

CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_prompt ON favorites(prompt_id);

-- Triggers for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompts_updated_at BEFORE UPDATE ON prompts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update prompt rating when reviews are added/updated/deleted
CREATE OR REPLACE FUNCTION update_prompt_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE prompts 
    SET rating = (
        SELECT COALESCE(AVG(rating::DECIMAL), 0)
        FROM reviews 
        WHERE prompt_id = COALESCE(NEW.prompt_id, OLD.prompt_id)
        AND parent_review_id IS NULL -- Only count top-level reviews
    )
    WHERE id = COALESCE(NEW.prompt_id, OLD.prompt_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rating_after_review_insert
    AFTER INSERT ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_prompt_rating();

CREATE TRIGGER update_rating_after_review_update
    AFTER UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_prompt_rating();

CREATE TRIGGER update_rating_after_review_delete
    AFTER DELETE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_prompt_rating();

-- Function to update usage count
CREATE OR REPLACE FUNCTION increment_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE prompts 
    SET usage_count = usage_count + 1,
        last_used = NEW.used_at
    WHERE id = NEW.prompt_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER increment_usage_after_tracking
    AFTER INSERT ON prompt_usage
    FOR EACH ROW EXECUTE FUNCTION increment_usage_count();

-- RLS (Row Level Security) Policies for Supabase
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_usage ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Categories are public read, admin write
CREATE POLICY "Categories are publicly readable" ON categories
    FOR SELECT USING (true);

-- Prompts are publicly readable
CREATE POLICY "Prompts are publicly readable" ON prompts
    FOR SELECT USING (true);

CREATE POLICY "Users can create prompts" ON prompts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prompts" ON prompts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prompts" ON prompts
    FOR DELETE USING (auth.uid() = user_id);

-- Reviews are publicly readable, authenticated users can write
CREATE POLICY "Reviews are publicly readable" ON reviews
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create reviews" ON reviews
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own reviews" ON reviews
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" ON reviews
    FOR DELETE USING (auth.uid() = user_id);

-- Comments are publicly readable, authenticated users can write
CREATE POLICY "Comments are publicly readable" ON comments
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" ON comments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own comments" ON comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON comments
    FOR DELETE USING (auth.uid() = user_id);

-- Favorites are user-specific
CREATE POLICY "Users can manage their own favorites" ON favorites
    FOR ALL USING (auth.uid() = user_id);

-- Usage tracking (public write for analytics)
CREATE POLICY "Usage tracking is publicly writable" ON prompt_usage
    FOR INSERT WITH CHECK (true);

-- Insert default categories
INSERT INTO categories (name, description) VALUES 
    ('Strategy & Vision', 'Prompts for strategic planning and visionary thinking'),
    ('Analysis & Research', 'Prompts for data analysis and research tasks'),
    ('Content Creation', 'Prompts for writing and content generation'),
    ('Problem Solving', 'Prompts for systematic problem solving'),
    ('Communication', 'Prompts for effective communication and messaging'),
    ('Learning & Education', 'Prompts for learning and educational content'),
    ('Creative & Design', 'Prompts for creative and design work'),
    ('Technical & Development', 'Prompts for technical and development tasks');
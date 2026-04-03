

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_user_streak(UUID);

DROP TABLE IF EXISTS public.responses CASCADE;
DROP TABLE IF EXISTS public.quiz_sessions CASCADE;
DROP TABLE IF EXISTS public.mastery CASCADE;
DROP TABLE IF EXISTS public.activity_log CASCADE;
DROP TABLE IF EXISTS public.topics CASCADE;
DROP TABLE IF EXISTS public.plans CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    total_score INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    highest_streak INTEGER DEFAULT 0,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    schedule JSONB NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    plan_id UUID REFERENCES public.plans ON DELETE CASCADE,
    name TEXT NOT NULL,
    day_number INTEGER DEFAULT 1,
    mastery_percentage FLOAT DEFAULT 0,
    status TEXT DEFAULT 'pending', 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.quiz_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    topic_id UUID REFERENCES public.topics ON DELETE SET NULL,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    time_taken_seconds INTEGER,
    classification TEXT, 
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    session_id UUID REFERENCES public.quiz_sessions ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    concept_id TEXT,
    is_correct BOOLEAN NOT NULL,
    confidence FLOAT,
    time_taken_ms INTEGER,
    error_type TEXT, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.mastery (
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    concept_id TEXT NOT NULL,
    mastery_probability FLOAT DEFAULT 0,
    brier_score FLOAT DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, concept_id)
);

ALTER TABLE public.mastery ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    activity_type TEXT NOT NULL, 
    date DATE DEFAULT CURRENT_DATE,
    UNIQUE(user_id, date)
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage own plans." ON public.plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own topics." ON public.topics FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own sessions." ON public.quiz_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own responses." ON public.responses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own mastery." ON public.mastery FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own activity." ON public.activity_log FOR ALL USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_user_streak(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
    today DATE := CURRENT_DATE;
    yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
    last_act DATE;
BEGIN
    SELECT last_active_at::DATE INTO last_act FROM public.profiles WHERE id = user_uuid;

    IF last_act = today THEN
        RETURN;
    ELSIF last_act = yesterday THEN
        UPDATE public.profiles 
        SET current_streak = current_streak + 1,
            last_active_at = NOW(),
            highest_streak = GREATEST(highest_streak, current_streak + 1)
        WHERE id = user_uuid;
    ELSE
        UPDATE public.profiles 
        SET current_streak = 1,
            last_active_at = NOW()
        WHERE id = user_uuid;
    END IF;
END;
$$ LANGUAGE plpgsql;

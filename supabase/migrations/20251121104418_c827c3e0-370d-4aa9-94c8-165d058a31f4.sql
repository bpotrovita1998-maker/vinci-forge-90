-- Create user_preferences table for storing user settings and style preferences
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  preference_type TEXT NOT NULL, -- 'default_settings', 'style_preference', 'ui_preference'
  preference_key TEXT NOT NULL,
  preference_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, preference_type, preference_key)
);

-- Create conversation_memory table for storing AI conversation context
CREATE TABLE public.conversation_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conversation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  role TEXT NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create custom_instructions table for user-defined AI rules
CREATE TABLE public.custom_instructions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  instruction_type TEXT NOT NULL, -- 'generation_rule', 'style_rule', 'behavior_rule'
  title TEXT NOT NULL,
  instruction TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create generation_patterns table for learning from user behavior
CREATE TABLE public.generation_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pattern_type TEXT NOT NULL, -- 'frequent_prompt', 'style_choice', 'parameter_preference'
  pattern_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  usage_count INTEGER NOT NULL DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_preferences
CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences"
  ON public.user_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for conversation_memory
CREATE POLICY "Users can view their own conversations"
  ON public.conversation_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
  ON public.conversation_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
  ON public.conversation_memory FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for custom_instructions
CREATE POLICY "Users can view their own instructions"
  ON public.custom_instructions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own instructions"
  ON public.custom_instructions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own instructions"
  ON public.custom_instructions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own instructions"
  ON public.custom_instructions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for generation_patterns
CREATE POLICY "Users can view their own patterns"
  ON public.generation_patterns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own patterns"
  ON public.generation_patterns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patterns"
  ON public.generation_patterns FOR UPDATE
  USING (auth.uid() = user_id);

-- Create trigger for updating updated_at timestamps
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_custom_instructions_updated_at
  BEFORE UPDATE ON public.custom_instructions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create indexes for better query performance
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX idx_conversation_memory_user_id ON public.conversation_memory(user_id);
CREATE INDEX idx_conversation_memory_conversation_id ON public.conversation_memory(conversation_id);
CREATE INDEX idx_custom_instructions_user_id ON public.custom_instructions(user_id);
CREATE INDEX idx_generation_patterns_user_id ON public.generation_patterns(user_id);
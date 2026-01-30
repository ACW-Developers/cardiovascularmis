-- Add researcher to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'researcher';

-- Create downloads tracking table
CREATE TABLE public.downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  file_format TEXT NOT NULL DEFAULT 'pdf',
  file_size_bytes INTEGER,
  metadata JSONB DEFAULT '{}',
  downloaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for downloads
CREATE POLICY "Users can view their own downloads"
ON public.downloads
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own downloads"
ON public.downloads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own downloads"
ON public.downloads
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_downloads_user_id ON public.downloads(user_id);
CREATE INDEX idx_downloads_downloaded_at ON public.downloads(downloaded_at DESC);

-- Update has_role function to include researcher
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;
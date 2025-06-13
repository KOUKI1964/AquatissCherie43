/*
  # Media Library Setup

  1. New Tables
    - `media_files`
      - Stores all media file information
      - Supports images, videos, and documents
      - Includes metadata and organization info
    
    - `media_folders`
      - Organizes media into hierarchical folders
      - Supports nested folder structure

  2. Security
    - Enable RLS on all tables
    - Admin-only access for management
    - Public read access for published media

  3. Features
    - Automatic metadata extraction
    - File type validation
    - Size limits enforcement
    - Folder organization
*/

-- Create media folders table
CREATE TABLE IF NOT EXISTS public.media_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  parent_id uuid REFERENCES public.media_folders(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Create media files table
CREATE TABLE IF NOT EXISTS public.media_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  folder_id uuid REFERENCES public.media_folders(id),
  file_type text NOT NULL CHECK (file_type IN ('image', 'video', 'document')),
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  width integer, -- For images and videos
  height integer, -- For images and videos
  duration integer, -- For videos (in seconds)
  url text NOT NULL,
  thumbnail_url text, -- For videos and documents
  metadata jsonb DEFAULT '{}'::jsonb,
  tags text[] DEFAULT ARRAY[]::text[],
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Create product media relation table
CREATE TABLE IF NOT EXISTS public.product_media (
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  media_id uuid REFERENCES public.media_files(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (product_id, media_id)
);

-- Enable RLS
ALTER TABLE public.media_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_media_files_folder ON public.media_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_media_files_type ON public.media_files(file_type);
CREATE INDEX IF NOT EXISTS idx_media_files_tags ON public.media_files USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_media_folders_parent ON public.media_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_product_media_product ON public.product_media(product_id);
CREATE INDEX IF NOT EXISTS idx_product_media_sort ON public.product_media(sort_order);

-- Create policies
CREATE POLICY "Admins can manage media folders"
  ON public.media_folders
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid()));

CREATE POLICY "Admins can manage media files"
  ON public.media_files
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid()));

CREATE POLICY "Anyone can view public media"
  ON public.media_files
  FOR SELECT
  TO public
  USING (is_public = true);

CREATE POLICY "Admins can manage product media"
  ON public.product_media
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid()));

-- Create default folders
INSERT INTO public.media_folders (name, slug, description)
VALUES 
  ('Produits', 'produits', 'Images des produits'),
  ('Bannières', 'bannieres', 'Bannières du site'),
  ('Documents', 'documents', 'Documents techniques et notices')
ON CONFLICT (slug) DO NOTHING;

-- Function to validate media files
CREATE OR REPLACE FUNCTION validate_media_file()
RETURNS trigger AS $$
BEGIN
  -- Validate file size
  IF NEW.file_type = 'image' AND NEW.size_bytes > 10485760 THEN -- 10MB
    RAISE EXCEPTION 'Image size exceeds 10MB limit';
  ELSIF NEW.file_type = 'video' AND NEW.size_bytes > 52428800 THEN -- 50MB
    RAISE EXCEPTION 'Video size exceeds 50MB limit';
  END IF;

  -- Validate mime types
  IF NEW.file_type = 'image' AND NEW.mime_type NOT IN (
    'image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'
  ) THEN
    RAISE EXCEPTION 'Invalid image format. Supported formats: JPEG, PNG, WebP, SVG';
  ELSIF NEW.file_type = 'video' AND NEW.mime_type NOT IN (
    'video/mp4', 'video/webm'
  ) THEN
    RAISE EXCEPTION 'Invalid video format. Supported formats: MP4, WebM';
  ELSIF NEW.file_type = 'document' AND NEW.mime_type != 'application/pdf' THEN
    RAISE EXCEPTION 'Invalid document format. Only PDF is supported';
  END IF;

  -- Update timestamp
  NEW.updated_at := now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for media validation
CREATE TRIGGER validate_media_file_trigger
  BEFORE INSERT OR UPDATE ON public.media_files
  FOR EACH ROW
  EXECUTE FUNCTION validate_media_file();

-- Function to handle primary media
CREATE OR REPLACE FUNCTION handle_primary_media()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_primary THEN
    UPDATE public.product_media
    SET is_primary = false
    WHERE product_id = NEW.product_id
    AND media_id != NEW.media_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for primary media handling
CREATE TRIGGER handle_primary_media_trigger
  BEFORE INSERT OR UPDATE ON public.product_media
  FOR EACH ROW
  EXECUTE FUNCTION handle_primary_media();
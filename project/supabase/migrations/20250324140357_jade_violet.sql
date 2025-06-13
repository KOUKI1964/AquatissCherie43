/*
  # Fix Media Library Configuration

  1. Changes
    - Create media-library bucket
    - Fix parent_id handling in queries
    - Update storage policies

  2. Security
    - Enable RLS
    - Set proper permissions
    - Configure file size limits
*/

-- Create media-library bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media-library',
  'media-library',
  true,
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'application/pdf'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS for the bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for the media-library bucket
CREATE POLICY "Admins can manage media library"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'media-library' 
  AND EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'media-library'
  AND EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.id = auth.uid()
  )
);

CREATE POLICY "Anyone can view media library"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'media-library');

-- Update media folders query function
CREATE OR REPLACE FUNCTION get_media_folders(p_parent_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  parent_id uuid,
  created_at timestamptz,
  updated_at timestamptz
) 
LANGUAGE sql
STABLE
AS $$
  SELECT 
    id, name, description, parent_id, created_at, updated_at
  FROM media_folders
  WHERE 
    CASE 
      WHEN p_parent_id IS NULL THEN parent_id IS NULL
      ELSE parent_id = p_parent_id
    END
  ORDER BY name;
$$;
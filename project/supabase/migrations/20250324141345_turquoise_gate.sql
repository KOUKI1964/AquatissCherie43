/*
  # Media Library Configuration

  1. Storage Configuration
    - Update bucket configuration for media library
    - Set file size limits and MIME types
    - Configure public access and security policies

  2. Functions
    - Add functions for file validation and processing
    - Update media file handling
*/

-- Update media-library bucket configuration
DO $$
BEGIN
  -- Update bucket configuration with new limits and MIME types
  UPDATE storage.buckets
  SET 
    file_size_limit = 52428800, -- 50MB
    allowed_mime_types = ARRAY[
      -- Images
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/svg+xml',
      'image/gif',
      -- Videos
      'video/mp4',
      'video/webm',
      -- Documents
      'application/pdf'
    ]
  WHERE id = 'media-library';
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- Function to validate and process media files
CREATE OR REPLACE FUNCTION process_media_file()
RETURNS trigger AS $$
DECLARE
  file_extension text;
  max_size bigint;
BEGIN
  -- Extract file extension from mime_type
  file_extension := CASE NEW.mime_type
    WHEN 'image/jpeg' THEN '.jpg'
    WHEN 'image/png' THEN '.png'
    WHEN 'image/webp' THEN '.webp'
    WHEN 'image/svg+xml' THEN '.svg'
    WHEN 'image/gif' THEN '.gif'
    WHEN 'video/mp4' THEN '.mp4'
    WHEN 'video/webm' THEN '.webm'
    WHEN 'application/pdf' THEN '.pdf'
    ELSE NULL
  END;

  -- Validate file extension
  IF file_extension IS NULL THEN
    RAISE EXCEPTION 'Format de fichier non supporté: %', NEW.mime_type;
  END IF;

  -- Set size limits based on file type
  max_size := CASE NEW.file_type
    WHEN 'image' THEN 10485760  -- 10MB for images
    WHEN 'video' THEN 52428800  -- 50MB for videos
    WHEN 'document' THEN 10485760  -- 10MB for documents
    ELSE 5242880  -- 5MB default
  END;

  -- Validate file size
  IF NEW.size_bytes > max_size THEN
    RAISE EXCEPTION 'Taille de fichier trop importante. Maximum: % bytes', max_size;
  END IF;

  -- Set default values for metadata if null
  IF NEW.metadata IS NULL THEN
    NEW.metadata := '{}'::jsonb;
  END IF;

  -- Add file information to metadata
  NEW.metadata := NEW.metadata || jsonb_build_object(
    'extension', file_extension,
    'originalName', NEW.name,
    'uploadedAt', EXTRACT(EPOCH FROM NOW())
  );

  -- Generate thumbnail URL for videos and documents
  IF NEW.file_type IN ('video', 'document') AND NEW.thumbnail_url IS NULL THEN
    -- Use a default thumbnail based on file type
    NEW.thumbnail_url := CASE NEW.file_type
      WHEN 'video' THEN '/thumbnails/video-default.png'
      WHEN 'document' THEN '/thumbnails/document-default.png'
      ELSE NULL
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for media file processing
DROP TRIGGER IF EXISTS process_media_file_trigger ON media_files;
CREATE TRIGGER process_media_file_trigger
  BEFORE INSERT OR UPDATE ON media_files
  FOR EACH ROW
  EXECUTE FUNCTION process_media_file();

-- Function to manage media folders
CREATE OR REPLACE FUNCTION manage_media_folder()
RETURNS trigger AS $$
BEGIN
  -- Generate slug if not provided
  IF NEW.slug IS NULL THEN
    NEW.slug := slugify(NEW.name);
  END IF;

  -- Prevent circular references in folder hierarchy
  IF NEW.parent_id IS NOT NULL THEN
    IF NEW.id = NEW.parent_id THEN
      RAISE EXCEPTION 'Un dossier ne peut pas être son propre parent';
    END IF;

    -- Check for deeper circular references
    WITH RECURSIVE folder_tree AS (
      -- Base case: start with the parent folder
      SELECT id, parent_id, 1 AS level
      FROM media_folders
      WHERE id = NEW.parent_id
      
      UNION ALL
      
      -- Recursive case: add parent folders
      SELECT f.id, f.parent_id, ft.level + 1
      FROM media_folders f
      JOIN folder_tree ft ON f.id = ft.parent_id
      WHERE ft.level < 100  -- Prevent infinite recursion
    )
    SELECT 1 FROM folder_tree WHERE id = NEW.id;
    
    IF FOUND THEN
      RAISE EXCEPTION 'Référence circulaire détectée dans la hiérarchie des dossiers';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for media folder management
DROP TRIGGER IF EXISTS manage_media_folder_trigger ON media_folders;
CREATE TRIGGER manage_media_folder_trigger
  BEFORE INSERT OR UPDATE ON media_folders
  FOR EACH ROW
  EXECUTE FUNCTION manage_media_folder();

-- Function to get full folder path
CREATE OR REPLACE FUNCTION get_folder_path(p_folder_id uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  path text[];
  current_folder record;
BEGIN
  -- Start with the current folder
  SELECT name, parent_id INTO current_folder
  FROM media_folders
  WHERE id = p_folder_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Build path array from bottom up
  path := ARRAY[current_folder.name];

  -- Traverse up the folder hierarchy
  WHILE current_folder.parent_id IS NOT NULL LOOP
    SELECT name, parent_id INTO current_folder
    FROM media_folders
    WHERE id = current_folder.parent_id;
    
    IF NOT FOUND THEN
      EXIT;
    END IF;

    path := array_prepend(current_folder.name, path);
  END LOOP;

  RETURN path;
END;
$$;
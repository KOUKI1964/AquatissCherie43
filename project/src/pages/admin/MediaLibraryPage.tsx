import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Home,
  Upload,
  FolderPlus,
  Folder,
  File,
  Image,
  Video,
  FileText,
  Grid,
  List,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Edit,
  Download,
  Copy,
  AlertCircle,
  X,
  Save,
  Check,
  Archive,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface MediaFile {
  id: string;
  name: string;
  description: string | null;
  folder_id: string | null;
  file_type: 'image' | 'video' | 'document';
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  url: string;
  thumbnail_url: string | null;
  metadata: Record<string, any>;
  tags: string[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface MediaFolder {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  created_at: string;
}

interface DeleteConfirmation {
  fileIds: string[];
  type: 'delete' | 'archive';
}

export function MediaLibraryPage() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showFileDetails, setShowFileDetails] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
    loadMediaContent();
  }, [currentFolder]);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/admin/login');
      return;
    }

    const { data: adminData } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!adminData) {
      navigate('/admin/login');
    }
  };

  const loadMediaContent = async () => {
    try {
      setIsLoading(true);
      
      // Fetch folders
      let foldersQuery = supabase
        .from('media_folders')
        .select('*')
        .order('name');

      if (currentFolder === null) {
        foldersQuery = foldersQuery.is('parent_id', null);
      } else {
        foldersQuery = foldersQuery.eq('parent_id', currentFolder);
      }

      const { data: foldersData, error: foldersError } = await foldersQuery;

      if (foldersError) throw foldersError;
      setFolders(foldersData || []);

      // Fetch files without table prefix
      let filesQuery = supabase
        .from('media_files')
        .select(`
          id,
          name,
          description,
          folder_id,
          file_type,
          mime_type,
          size_bytes,
          width,
          height,
          duration,
          url,
          thumbnail_url,
          metadata,
          tags,
          is_public,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (currentFolder === null) {
        filesQuery = filesQuery.is('folder_id', null);
      } else {
        filesQuery = filesQuery.eq('folder_id', currentFolder);
      }

      const { data: filesData, error: filesError } = await filesQuery;

      if (filesError) throw filesError;
      setFiles(filesData || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const files = Array.from(event.target.files);
      const totalFiles = files.length;
      let completedFiles = 0;

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = currentFolder ? `${currentFolder}/${fileName}` : fileName;

        const { error: uploadError } = await supabase.storage
          .from('media-library')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('media-library')
          .getPublicUrl(filePath);

        const { error: dbError } = await supabase
          .from('media_files')
          .insert({
            name: file.name,
            folder_id: currentFolder,
            file_type: file.type.startsWith('image/') ? 'image' : 
                      file.type.startsWith('video/') ? 'video' : 'document',
            mime_type: file.type,
            size_bytes: file.size,
            url: publicUrl,
            folder_id: currentFolder
          });

        if (dbError) throw dbError;

        completedFiles++;
        setUploadProgress((completedFiles / totalFiles) * 100);
      }

      await loadMediaContent();
      showSuccessMessage('Fichiers téléversés avec succès');
    } catch (error: any) {
      setError('Erreur lors du téléversement : ' + error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const { error } = await supabase
        .from('media_folders')
        .insert({
          name: newFolderName.trim(),
          parent_id: currentFolder
        });

      if (error) throw error;

      setNewFolderName('');
      setShowNewFolderModal(false);
      await loadMediaContent();
      showSuccessMessage('Dossier créé avec succès');
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleDeleteFiles = async () => {
    if (!deleteConfirmation || !deleteConfirmation.fileIds.length) return;

    try {
      setIsLoading(true);

      // Get file URLs to delete from storage
      const filesToDelete = files.filter(file => deleteConfirmation.fileIds.includes(file.id));
      
      // Delete files from storage
      for (const file of filesToDelete) {
        const fileUrl = new URL(file.url);
        const filePath = fileUrl.pathname.split('/').pop();
        if (filePath) {
          await supabase.storage
            .from('media-library')
            .remove([filePath]);
        }
      }

      // Delete files from database
      const { error } = await supabase
        .from('media_files')
        .delete()
        .in('id', deleteConfirmation.fileIds);

      if (error) throw error;

      setSelectedFiles(new Set());
      setDeleteConfirmation(null);
      await loadMediaContent();
      showSuccessMessage(
        deleteConfirmation.type === 'delete' 
          ? 'Fichiers supprimés avec succès' 
          : 'Fichiers archivés avec succès'
      );
    } catch (error: any) {
      setError('Erreur lors de la suppression : ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const showSuccessMessage = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getFileIcon = (fileType: string, mimeType: string) => {
    switch (fileType) {
      case 'image':
        return <Image className="h-6 w-6" />;
      case 'video':
        return <Video className="h-6 w-6" />;
      case 'document':
        return <FileText className="h-6 w-6" />;
      default:
        return <File className="h-6 w-6" />;
    }
  };

  const renderBreadcrumb = () => {
    if (!currentFolder) {
      return (
        <div className="flex items-center space-x-2 text-sm">
          <Folder className="h-4 w-4 text-gray-500" />
          <span className="text-gray-900 font-medium">Racine</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2 text-sm">
        <button
          onClick={() => setCurrentFolder(null)}
          className="text-gray-500 hover:text-gray-900"
        >
          <Folder className="h-4 w-4" />
        </button>
        <span className="text-gray-500">/</span>
        <span className="text-gray-900 font-medium">Dossier actuel</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      {error && (
        <div className="mb-4 bg-red-50 p-4 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 p-4 rounded-lg">
          <div className="flex items-center">
            <Check className="h-5 w-5 text-green-400 mr-2" />
            <span className="text-green-800">{success}</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div>
              <div className="flex items-center space-x-4">
                <Link
                  to="/admin/dashboard"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
                >
                  <Home className="h-5 w-5 mr-2" />
                  Tableau de bord
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Médiathèque</h1>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Gérez vos fichiers médias
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowNewFolderModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <FolderPlus className="h-5 w-5 mr-2" />
                Nouveau dossier
              </button>
              <label className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31] cursor-pointer">
                <Upload className="h-5 w-5 mr-2" />
                Téléverser
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={handleFileUpload}
                  accept="image/*,video/*,application/pdf"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              {renderBreadcrumb()}
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                />
              </div>
              <div className="flex items-center space-x-2 border-l border-gray-300 pl-4">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md ${
                    viewMode === 'grid'
                      ? 'bg-gray-200 text-gray-900'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Grid className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md ${
                    viewMode === 'list'
                      ? 'bg-gray-200 text-gray-900'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {uploading && (
            <div className="mb-4">
              <div className="bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-[#8B1F38] h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Téléversement en cours... {Math.round(uploadProgress)}%
              </p>
            </div>
          )}

          {folders.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Dossiers
              </h2>
              <div className={`grid ${
                viewMode === 'grid' 
                  ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' 
                  : 'grid-cols-1'
              } gap-4`}>
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    onClick={() => setCurrentFolder(folder.id)}
                    className={`${
                      viewMode === 'grid'
                        ? 'p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer'
                        : 'flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer'
                    }`}
                  >
                    <Folder className={`${
                      viewMode === 'grid' 
                        ? 'h-12 w-12 mx-auto mb-2 text-gray-400'
                        : 'h-6 w-6 text-gray-400 mr-4'
                    }`} />
                    <div className={viewMode === 'grid' ? 'text-center' : ''}>
                      <h3 className="text-sm font-medium text-gray-900">
                        {folder.name}
                      </h3>
                      {viewMode === 'list' && folder.description && (
                        <p className="text-sm text-gray-500 mt-1">
                          {folder.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Fichiers
            </h2>
            {files.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <File className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Aucun fichier
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Commencez par téléverser des fichiers dans ce dossier.
                </p>
              </div>
            ) : (
              <div className={`grid ${
                viewMode === 'grid' 
                  ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' 
                  : 'grid-cols-1'
              } gap-4`}>
                {files.map((file) => (
                  <div
                    key={file.id}
                    className={`group relative ${
                      viewMode === 'grid'
                        ? 'p-4 border border-gray-200 rounded-lg hover:bg-gray-50'
                        : 'flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50'
                    } ${
                      selectedFiles.has(file.id) ? 'ring-2 ring-[#8B1F38]' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedFiles);
                        if (e.target.checked) {
                          newSelected.add(file.id);
                        } else {
                          newSelected.delete(file.id);
                        }
                        setSelectedFiles(newSelected);
                      }}
                      className="absolute top-2 left-2 z-10"
                    />
                    
                    {file.file_type === 'image' ? (
                      <div className={viewMode === 'grid' ? 'aspect-w-1 aspect-h-1' : 'h-16 w-16 flex-shrink-0'}>
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                    ) : (
                      <div className={`flex items-center justify-center ${
                        viewMode === 'grid' 
                          ? 'h-32 bg-gray-100 rounded mb-2'
                          : 'h-16 w-16 bg-gray-100 rounded flex-shrink-0'
                      }`}>
                        {getFileIcon(file.file_type, file.mime_type)}
                      </div>
                    )}

                    <div className={viewMode === 'grid' ? 'mt-2' : 'ml-4 flex-1'}>
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(file.size_bytes)}
                      </p>
                      
                      <div className="mt-2 flex items-center space-x-2">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={file.url}
                            readOnly
                            className="w-full text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1"
                          />
                        </div>
                        <button
                          onClick={() => handleCopyUrl(file.url)}
                          className="p-1 text-gray-500 hover:text-gray-900 bg-gray-100 rounded"
                          title="Copier l'URL"
                        >
                          {copiedUrl === file.url ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className={`absolute top-2 right-2 ${
                      selectedFiles.has(file.id) ? 'flex' : 'hidden group-hover:flex'
                    } items-center space-x-1`}>
                      <button
                        onClick={() => setShowFileDetails(file.id)}
                        className="p-1 text-gray-500 hover:text-gray-900 bg-white rounded-full shadow-sm"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          const newSelected = new Set(selectedFiles);
                          newSelected.add(file.id);
                          setSelectedFiles(newSelected);
                        }}
                        className="p-1 text-gray-500 hover:text-gray-900 bg-white rounded-full shadow-sm"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Nouveau dossier
              </h3>
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nom du dossier"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
            />
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
              >
                Annuler
              </button>
              <button
                onClick={createFolder}
                className="px-4 py-2 text-sm font-medium text-white bg-[#8B1F38] rounded-md hover:bg-[#7A1B31]"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">
                Confirmation de suppression
              </h3>
            </div>
            <p className="text-gray-500 mb-4">
              {deleteConfirmation.type === 'delete' 
                ? 'Êtes-vous sûr de vouloir supprimer définitivement ces fichiers ? Cette action est irréversible.'
                : 'Êtes-vous sûr de vouloir archiver ces fichiers ?'}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteFiles}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                {deleteConfirmation.type === 'delete' ? 'Supprimer' : 'Archiver'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedFiles.size > 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg px-4 py-3 flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            {selectedFiles.size} élément{selectedFiles.size > 1 ? 's' : ''} sélectionné{selectedFiles.size > 1 ? 's' : ''}
          </span>
          <div className="h-4 border-l border-gray-300"></div>
          <button
            onClick={() => setSelectedFiles(new Set())}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Désélectionner
          </button>
          <button
            onClick={() => setDeleteConfirmation({
              fileIds: Array.from(selectedFiles),
              type: 'archive'
            })}
            className="text-sm text-orange-600 hover:text-orange-700 flex items-center"
          >
            <Archive className="h-4 w-4 mr-1" />
            Archiver
          </button>
          <button
            onClick={() => setDeleteConfirmation({
              fileIds: Array.from(selectedFiles),
              type: 'delete'
            })}
            className="text-sm text-red-600 hover:text-red-700 flex items-center"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}
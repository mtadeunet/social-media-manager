import React, { useEffect, useState } from 'react';
import { contentTypeService, ContentTypeTag } from '../services/contentTypeService';
import { mediaVaultService } from '../services/mediaVaultService';
import { EnhancementTag, PlatformTag } from '../types/mediaVault';

interface TagsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTagsUpdated?: () => void;
}

type TabType = 'enhancement' | 'contentType' | 'platform';

const TagsManagementModal: React.FC<TagsManagementModalProps> = ({ isOpen, onClose, onTagsUpdated }) => {
  const [activeTab, setActiveTab] = useState<TabType>('enhancement');

  // Enhancement Tags State
  const [enhancementTags, setEnhancementTags] = useState<EnhancementTag[]>([]);
  const [loadingEnhancement, setLoadingEnhancement] = useState(false);
  const [editingEnhancementId, setEditingEnhancementId] = useState<number | null>(null);
  const [showAddEnhancementForm, setShowAddEnhancementForm] = useState(false);
  const [enhancementFormData, setEnhancementFormData] = useState({
    name: '',
    description: '',
    color: '#6b7280'
  });

  // Content Type Tags State
  const [contentTypes, setContentTypes] = useState<ContentTypeTag[]>([]);
  const [loadingContentType, setLoadingContentType] = useState(false);
  const [editingContentTypeId, setEditingContentTypeId] = useState<number | null>(null);
  const [showAddContentTypeForm, setShowAddContentTypeForm] = useState(false);
  const [contentTypeFormData, setContentTypeFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    has_phases: false,
    phase_count: 3
  });

  // Platform Tags State
  const [platformTags, setPlatformTags] = useState<PlatformTag[]>([]);
  const [loadingPlatform, setLoadingPlatform] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadEnhancementTags();
      loadContentTypes();
      loadPlatformTags();
    }
  }, [isOpen]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const loadEnhancementTags = async () => {
    try {
      setLoadingEnhancement(true);
      const tags = await mediaVaultService.listEnhancementTags();
      setEnhancementTags(tags);
      onTagsUpdated?.();
    } catch (error) {
      console.error('Failed to load enhancement tags:', error);
    } finally {
      setLoadingEnhancement(false);
    }
  };

  const loadContentTypes = async () => {
    try {
      setLoadingContentType(true);
      const types = await contentTypeService.listContentTypes();
      setContentTypes(types);
      onTagsUpdated?.();
    } catch (error) {
      console.error('Failed to load content types:', error);
    } finally {
      setLoadingContentType(false);
    }
  };

  const loadPlatformTags = async () => {
    try {
      setLoadingPlatform(true);
      const tags = await mediaVaultService.listPlatformTags();
      setPlatformTags(tags);
      onTagsUpdated?.();
    } catch (error) {
      console.error('Failed to load platform tags:', error);
    } finally {
      setLoadingPlatform(false);
    }
  };

  // Enhancement Tags Handlers
  const handleCreateEnhancementTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enhancementFormData.name.trim()) {
      alert('Tag name is required');
      return;
    }

    try {
      await mediaVaultService.createEnhancementTag(
        enhancementFormData.name,
        enhancementFormData.description,
        enhancementFormData.color
      );
      await loadEnhancementTags();
      resetEnhancementForm();
      setShowAddEnhancementForm(false);
    } catch (error) {
      console.error('Failed to create enhancement tag:', error);
      alert((error as Error).message || 'Failed to create tag');
    }
  };

  const handleUpdateEnhancementTag = async (tagId: number) => {
    try {
      await mediaVaultService.updateEnhancementTag(tagId, enhancementFormData);
      await loadEnhancementTags();
      resetEnhancementForm();
      setShowAddEnhancementForm(false);
      setEditingEnhancementId(null);
    } catch (error) {
      console.error('Failed to update enhancement tag:', error);
      alert((error as Error).message || 'Failed to update tag');
    }
  };

  const handleDeleteEnhancementTag = async (id: number) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;

    try {
      await mediaVaultService.deleteEnhancementTag(id);
      await loadEnhancementTags();
    } catch (error) {
      console.error('Failed to delete enhancement tag:', error);
      alert((error as Error).message || 'Failed to delete tag');
    }
  };

  const resetEnhancementForm = () => {
    setEnhancementFormData({ name: '', description: '', color: '#6b7280' });
    setEditingEnhancementId(null);
  };

  // Content Type Tags Handlers
  const handleCreateContentTypeTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentTypeFormData.name.trim()) {
      alert('Content type name is required');
      return;
    }

    try {
      await contentTypeService.createContentType(contentTypeFormData);
      await loadContentTypes();
      resetContentTypeForm();
      setShowAddContentTypeForm(false);
    } catch (error) {
      console.error('Failed to create content type:', error);
      alert((error as Error).message || 'Failed to create content type');
    }
  };

  const handleUpdateContentTypeTag = async (tagId: number) => {
    try {
      await contentTypeService.updateContentType(tagId, contentTypeFormData);
      await loadContentTypes();
      resetContentTypeForm();
      setShowAddContentTypeForm(false);
      setEditingContentTypeId(null);
    } catch (error) {
      console.error('Failed to update content type:', error);
      alert((error as Error).message || 'Failed to update content type');
    }
  };

  const handleDeleteContentTypeTag = async (id: number) => {
    if (!confirm('Are you sure you want to delete this content type and all its phases?')) return;

    try {
      await contentTypeService.deleteContentType(id);
      await loadContentTypes();
    } catch (error) {
      console.error('Failed to delete content type:', error);
      alert((error as Error).message || 'Failed to delete content type');
    }
  };

  const resetContentTypeForm = () => {
    setContentTypeFormData({ name: '', description: '', color: '#3b82f6', has_phases: false, phase_count: 3 });
    setEditingContentTypeId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Tags Management</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab('enhancement')}
            className={`px-4 py-2 font-medium text-sm ${activeTab === 'enhancement'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-white'
              }`}
          >
            Enhancement Tags
          </button>
          <button
            onClick={() => setActiveTab('contentType')}
            className={`px-4 py-2 font-medium text-sm ml-8 ${activeTab === 'contentType'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-white'
              }`}
          >
            Content Types
          </button>
          <button
            onClick={() => setActiveTab('platform')}
            className={`px-4 py-2 font-medium text-sm ml-8 ${activeTab === 'platform'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-white'
              }`}
          >
            Platform Tags (Read-only)
          </button>
        </div>

        {/* Enhancement Tags Tab */}
        {activeTab === 'enhancement' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Enhancement Tags</h3>
              {!showAddEnhancementForm && (
                <button
                  onClick={() => setShowAddEnhancementForm(true)}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                >
                  + Add Tag
                </button>
              )}
            </div>

            {showAddEnhancementForm && (
              <div className="mb-6 bg-gray-700 rounded-lg p-4">
                <h4 className="text-md font-medium text-white mb-4">
                  {editingEnhancementId ? 'Edit Tag' : 'Add New Tag'}
                </h4>
                <form onSubmit={editingEnhancementId ? (e) => { e.preventDefault(); handleUpdateEnhancementTag(editingEnhancementId); } : handleCreateEnhancementTag}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
                      <input
                        type="text"
                        value={enhancementFormData.name}
                        onChange={(e) => setEnhancementFormData({ ...enhancementFormData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Color</label>
                      <input
                        type="color"
                        value={enhancementFormData.color}
                        onChange={(e) => setEnhancementFormData({ ...enhancementFormData, color: e.target.value })}
                        className="w-full h-10 bg-gray-600 border border-gray-500 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                    <textarea
                      value={enhancementFormData.description}
                      onChange={(e) => setEnhancementFormData({ ...enhancementFormData, description: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={loadingEnhancement}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {loadingEnhancement ? 'Saving...' : (editingEnhancementId ? 'Update' : 'Create')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { resetEnhancementForm(); setShowAddEnhancementForm(false); }}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loadingEnhancement ? (
              <div className="text-white text-center py-4">Loading...</div>
            ) : enhancementTags.length === 0 ? (
              <div className="text-gray-400 text-center py-8">No enhancement tags found</div>
            ) : (
              <div className="space-y-2">
                {enhancementTags.map((tag) => (
                  <div key={tag.id} className="bg-gray-700 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <div>
                        <div className="text-white font-medium">{tag.name}</div>
                        {tag.description && (
                          <div className="text-gray-400 text-sm">{tag.description}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingEnhancementId(tag.id);
                          setEnhancementFormData({
                            name: tag.name,
                            description: tag.description || '',
                            color: tag.color
                          });
                          setShowAddEnhancementForm(true);
                        }}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteEnhancementTag(tag.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content Types Tab */}
        {activeTab === 'contentType' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Content Types</h3>
              {!showAddContentTypeForm && (
                <button
                  onClick={() => setShowAddContentTypeForm(true)}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                >
                  + Add Content Type
                </button>
              )}
            </div>

            {showAddContentTypeForm && (
              <div className="mb-6 bg-gray-700 rounded-lg p-4">
                <h4 className="text-md font-medium text-white mb-4">
                  {editingContentTypeId ? 'Edit Content Type' : 'Add New Content Type'}
                </h4>
                <form onSubmit={editingContentTypeId ? (e) => { e.preventDefault(); handleUpdateContentTypeTag(editingContentTypeId); } : handleCreateContentTypeTag}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
                      <input
                        type="text"
                        value={contentTypeFormData.name}
                        onChange={(e) => setContentTypeFormData({ ...contentTypeFormData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Color</label>
                      <input
                        type="color"
                        value={contentTypeFormData.color}
                        onChange={(e) => setContentTypeFormData({ ...contentTypeFormData, color: e.target.value })}
                        className="w-full h-10 bg-gray-600 border border-gray-500 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                    <textarea
                      value={contentTypeFormData.description}
                      onChange={(e) => setContentTypeFormData({ ...contentTypeFormData, description: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="has_phases"
                        checked={contentTypeFormData.has_phases}
                        onChange={(e) => setContentTypeFormData({ ...contentTypeFormData, has_phases: e.target.checked })}
                        className="mr-2 h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="has_phases" className="text-sm font-medium text-gray-300">
                        Enable progression phases
                      </label>
                    </div>
                    {contentTypeFormData.has_phases && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Number of phases</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={contentTypeFormData.phase_count}
                          onChange={(e) => setContentTypeFormData({ ...contentTypeFormData, phase_count: parseInt(e.target.value) || 1 })}
                          className="w-32 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={loadingContentType}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {loadingContentType ? 'Saving...' : (editingContentTypeId ? 'Update' : 'Create')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { resetContentTypeForm(); setShowAddContentTypeForm(false); }}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loadingContentType ? (
              <div className="text-white text-center py-4">Loading...</div>
            ) : contentTypes.length === 0 ? (
              <div className="text-gray-400 text-center py-8">No content types found</div>
            ) : (
              <div className="space-y-2">
                {contentTypes.map((type) => (
                  <div key={type.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: type.color }}
                        />
                        <div>
                          <div className="text-white font-medium">{type.name}</div>
                          {type.description && (
                            <div className="text-gray-400 text-sm">{type.description}</div>
                          )}
                          {type.has_phases && (
                            <div className="text-gray-400 text-sm">Phases: {type.phase_count}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingContentTypeId(type.id);
                            setContentTypeFormData({
                              name: type.name,
                              description: type.description || '',
                              color: type.color,
                              has_phases: type.has_phases,
                              phase_count: type.phase_count || 3
                            });
                            setShowAddContentTypeForm(true);
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteContentTypeTag(type.id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Platform Tags Tab (Read-only) */}
        {activeTab === 'platform' && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold text-white">Platform Tags</h3>
              <span className="px-2 py-1 bg-gray-600 text-gray-300 text-xs rounded">Read-only</span>
            </div>

            {loadingPlatform ? (
              <div className="text-white text-center py-4">Loading...</div>
            ) : platformTags.length === 0 ? (
              <div className="text-gray-400 text-center py-8">No platform tags found</div>
            ) : (
              <div className="space-y-2">
                {platformTags.map((tag) => (
                  <div key={tag.id} className="bg-gray-700 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <div>
                        <div className="text-white font-medium">{tag.name}</div>
                        {tag.icon && (
                          <span className="text-lg ml-2">{tag.icon}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-gray-400 text-sm">System managed</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TagsManagementModal;

import React, { useState, useEffect } from 'react';
import { tagService, EnhancementTag } from '../services/tagService';

interface EnhancementTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTagsUpdated: () => void;
}

const EnhancementTagModal: React.FC<EnhancementTagModalProps> = ({ isOpen, onClose, onTagsUpdated }) => {
  const [tags, setTags] = useState<EnhancementTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6b7280'
  });

  useEffect(() => {
    if (isOpen) {
      loadTags();
    }
  }, [isOpen]);

  const loadTags = async () => {
    setLoading(true);
    try {
      const data = await tagService.listEnhancementTags();
      setTags(data);
    } catch (error) {
      console.error('Failed to load tags:', error);
      alert('Failed to load enhancement tags');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Tag name is required');
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await tagService.updateEnhancementTag(editingId, formData);
      } else {
        await tagService.createEnhancementTag(formData);
      }
      
      await loadTags();
      onTagsUpdated();
      resetForm();
    } catch (error: any) {
      console.error('Failed to save tag:', error);
      alert(error.response?.data?.detail || 'Failed to save tag');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tag: EnhancementTag) => {
    setEditingId(tag.id);
    setFormData({
      name: tag.name,
      description: tag.description || '',
      color: tag.color
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;

    setLoading(true);
    try {
      await tagService.deleteEnhancementTag(id);
      await loadTags();
      onTagsUpdated();
    } catch (error) {
      console.error('Failed to delete tag:', error);
      alert('Failed to delete tag');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', color: '#6b7280' });
    setEditingId(null);
    setShowAddForm(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Enhancement Tags</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Add/Edit Form */}
        {showAddForm ? (
          <form onSubmit={handleSubmit} className="mb-6 bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingId ? 'Edit Tag' : 'Add New Tag'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., upscale, enhance, filter"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-16 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="#6b7280"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="mb-6 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            + Add New Tag
          </button>
        )}

        {/* Tags List */}
        {loading && tags.length === 0 ? (
          <div className="text-center py-8 text-gray-400">Loading tags...</div>
        ) : tags.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No tags yet. Create your first tag!</div>
        ) : (
          <div className="space-y-2">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-4 p-4 bg-gray-700 rounded-lg hover:bg-gray-650 transition-colors"
              >
                {/* Color Swatch */}
                <div
                  className="w-8 h-8 rounded"
                  style={{ backgroundColor: tag.color }}
                />

                {/* Tag Info */}
                <div className="flex-1">
                  <div className="font-semibold text-white">{tag.name}</div>
                  {tag.description && (
                    <div className="text-sm text-gray-400">{tag.description}</div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(tag)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(tag.id)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                    disabled={tag.name === 'original'}
                    title={tag.name === 'original' ? 'Cannot delete original tag' : ''}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancementTagModal;

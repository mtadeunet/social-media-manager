import React, { useEffect, useState } from 'react';

interface ContentTypeTag {
  id: number;
  name: string;
  description: string | null;
  color: string;
  has_phases: boolean;
  phase_count: number | null;
  created_at: string;
  phases: Phase[];
}

interface Phase {
  id: number;
  name: string;
  description: string | null;
  color: string;
  phase_number: number;
  created_at: string;
}

interface ContentTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContentTypesUpdated: () => void;
}

const ContentTypeModal: React.FC<ContentTypeModalProps> = ({ isOpen, onClose, onContentTypesUpdated }) => {
  const [contentTypes, setContentTypes] = useState<ContentTypeTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [defaultPhaseCount, setDefaultPhaseCount] = useState(3);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    has_phases: false,
    phase_count: 3
  });

  useEffect(() => {
    if (isOpen) {
      loadContentTypes();
      loadDefaultPhaseCount();
    }
  }, [isOpen]);

  const loadContentTypes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tags/content-type');
      const data = await response.json();
      setContentTypes(data);
    } catch (error) {
      console.error('Failed to load content types:', error);
      alert('Failed to load content types');
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultPhaseCount = async () => {
    try {
      const response = await fetch('/api/tags/settings/default-phase-count');
      const data = await response.json();
      setDefaultPhaseCount(parseInt(data.value));
      setFormData(prev => ({ ...prev, phase_count: parseInt(data.value) }));
    } catch (error) {
      console.error('Failed to load default phase count:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Content type name is required');
      return;
    }

    if (formData.has_phases && (!formData.phase_count || formData.phase_count < 1)) {
      alert('Phase count must be at least 1 when phases are enabled');
      return;
    }

    setLoading(true);
    try {
      const url = editingId ? `/api/tags/content-type/${editingId}` : '/api/tags/content-type';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to save content type');
      }

      await loadContentTypes();
      resetForm();
      setShowAddForm(false);
      onContentTypesUpdated();
    } catch (error) {
      console.error('Failed to save content type:', error);
      alert((error as Error).message || 'Failed to save content type');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (contentType: ContentTypeTag) => {
    setEditingId(contentType.id);
    setFormData({
      name: contentType.name,
      description: contentType.description || '',
      color: contentType.color,
      has_phases: contentType.has_phases,
      phase_count: contentType.phase_count || defaultPhaseCount
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this content type and all its phases?')) {
      return;
    }

    try {
      const response = await fetch(`/api/tags/content-type/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete content type');
      }

      await loadContentTypes();
      onContentTypesUpdated();
    } catch (error) {
      console.error('Failed to delete content type:', error);
      alert((error as Error).message || 'Failed to delete content type');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3b82f6',
      has_phases: false,
      phase_count: defaultPhaseCount
    });
    setEditingId(null);
  };

  const handleCancel = () => {
    resetForm();
    setShowAddForm(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Content Type Management</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="mb-6 bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingId ? 'Edit Content Type' : 'Add New Content Type'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Color
                  </label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full h-10 bg-gray-600 border border-gray-500 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="has_phases"
                    checked={formData.has_phases}
                    onChange={(e) => setFormData({ ...formData, has_phases: e.target.checked })}
                    className="mr-2 h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="has_phases" className="text-sm font-medium text-gray-300">
                    Enable progression phases
                  </label>
                </div>

                {formData.has_phases && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Number of phases
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.phase_count}
                      onChange={(e) => setFormData({ ...formData, phase_count: parseInt(e.target.value) || 1 })}
                      className="w-32 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingId ? 'Update' : 'Create')}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Content Types List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Content Types</h3>
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
              >
                + Add Content Type
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : contentTypes.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No content types found</div>
          ) : (
            contentTypes.map((contentType) => (
              <div key={contentType.id} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: contentType.color }}
                    />
                    <div>
                      <h4 className="font-semibold text-white">{contentType.name}</h4>
                      {contentType.description && (
                        <p className="text-sm text-gray-400">{contentType.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-gray-500">
                          {contentType.has_phases ? `${contentType.phase_count} phases` : 'No phases'}
                        </span>
                        <span className="text-xs text-gray-500">
                          Created: {new Date(contentType.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(contentType)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(contentType.id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Phases */}
                {contentType.has_phases && contentType.phases.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <h5 className="text-sm font-medium text-gray-300 mb-2">Phases:</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {contentType.phases.map((phase) => (
                        <div key={phase.id} className="flex items-center gap-2 text-sm">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: phase.color }}
                          />
                          <span className="text-gray-300">
                            {phase.name}
                          </span>
                          <span className="text-gray-500">
                            (Phase {phase.phase_number})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentTypeModal;

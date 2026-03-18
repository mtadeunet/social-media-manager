import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { ContentType } from '../types/mediaVault';
import ContentTypeTag from './ContentTypeTag';

interface ContentTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType?: ContentType;
  onSave: (contentType: Partial<ContentType>) => void;
}

interface PhaseConfig {
  name: string;
  color: string;
}

const DEFAULT_PHASE_COLORS = [
  '#86efac', // Light green
  '#22c55e', // Green
  '#16a34a', // Dark green
  '#fca5a5', // Light red
  '#ef4444', // Red
  '#dc2626', // Dark red
  '#93c5fd', // Light blue
  '#3b82f6', // Blue
  '#2563eb', // Dark blue
  '#fbbf24', // Yellow
];

const ContentTypeModal: React.FC<ContentTypeModalProps> = ({
  isOpen,
  onClose,
  contentType,
  onSave
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [icon, setIcon] = useState('');
  const [hasPhases, setHasPhases] = useState(false);
  const [phases, setPhases] = useState<PhaseConfig[]>([
    { name: 'Stage 1', color: '#86efac' },
    { name: 'Stage 2', color: '#22c55e' },
    { name: 'Stage 3', color: '#16a34a' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (contentType) {
      setName(contentType.name);
      setDescription(contentType.description || '');
      setColor(contentType.color);
      setIcon(contentType.icon || '');
      setHasPhases(contentType.has_phases);
      
      if (contentType.has_phases && contentType.phases) {
        setPhases(contentType.phases.map(p => ({
          name: p.phase_name || `Stage ${p.phase_number}`,
          color: p.phase_color || p.color
        })));
      }
    } else {
      // Reset form for new content type
      setName('');
      setDescription('');
      setColor('#3b82f6');
      setIcon('');
      setHasPhases(false);
      setPhases([
        { name: 'Stage 1', color: '#86efac' },
        { name: 'Stage 2', color: '#22c55e' },
        { name: 'Stage 3', color: '#16a34a' }
      ]);
    }
  }, [contentType, isOpen]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Content type name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data: Partial<ContentType> = {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        icon: icon.trim() || undefined,
        has_phases: hasPhases
      };

      if (hasPhases) {
        (data as any).phases = phases;
      }

      await onSave(data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save content type');
    } finally {
      setLoading(false);
    }
  };

  const addPhase = () => {
    const nextPhaseNumber = phases.length + 1;
    const nextColor = DEFAULT_PHASE_COLORS[phases.length % DEFAULT_PHASE_COLORS.length];
    
    setPhases([...phases, {
      name: `Stage ${nextPhaseNumber}`,
      color: nextColor
    }]);
  };

  const updatePhase = (index: number, field: keyof PhaseConfig, value: string) => {
    const newPhases = [...phases];
    newPhases[index] = { ...newPhases[index], [field]: value };
    setPhases(newPhases);
  };

  const removePhase = (index: number) => {
    if (phases.length > 1) {
      setPhases(phases.filter((_, i) => i !== index));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold">
            {contentType ? 'Edit Content Type' : 'Create Content Type'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Preview */}
          {name && (
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Preview:</p>
              <ContentTypeTag
                contentType={{
                  id: 0,
                  name,
                  color,
                  has_phases: false,
                  is_phase: false,
                  is_parent: false,
                  display_name: name,
                  effective_color: color,
                  created_at: new Date().toISOString()
                }}
                size="lg"
              />
              {hasPhases && (
                <div className="mt-2 space-y-1">
                  {phases.map((phase, index) => (
                    <ContentTypeTag
                      key={index}
                      contentType={{
                        id: 0,
                        name,
                        color,
                        phase_number: index + 1,
                        phase_name: phase.name,
                        phase_color: phase.color,
                        has_phases: false,
                        is_phase: true,
                        is_parent: false,
                        display_name: `${name} > ${phase.name}`,
                        effective_color: phase.color,
                        created_at: new Date().toISOString()
                      }}
                      size="md"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Basic Fields */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Food, Travel, Fashion"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-20 border rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#3b82f6"
                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Icon</label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="📷 or emoji"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>

          {/* Phases */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center text-sm font-medium">
                <input
                  type="checkbox"
                  checked={hasPhases}
                  onChange={(e) => setHasPhases(e.target.checked)}
                  className="mr-2"
                />
                Enable Progression Phases
              </label>
            </div>

            {hasPhases && (
              <div className="space-y-2">
                {phases.map((phase, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <span className="text-sm font-medium w-20">
                      Stage {index + 1}:
                    </span>
                    <input
                      type="text"
                      value={phase.name}
                      onChange={(e) => updatePhase(index, 'name', e.target.value)}
                      placeholder="Phase name"
                      className="flex-1 px-3 py-1 border rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <input
                      type="color"
                      value={phase.color}
                      onChange={(e) => updatePhase(index, 'color', e.target.value)}
                      className="h-8 w-16 border rounded cursor-pointer"
                    />
                    {phases.length > 1 && (
                      <button
                        onClick={() => removePhase(index)}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                
                <button
                  onClick={addPhase}
                  className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Add Phase
                </button>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-6 border-t dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : (contentType ? 'Update' : 'Create')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentTypeModal;

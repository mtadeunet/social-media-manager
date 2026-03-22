import React, { useState } from 'react';

interface FilenameEditorProps {
  filename: string;
  onSave: (newFilename: string) => Promise<void>;
}

const FilenameEditor: React.FC<FilenameEditorProps> = ({ filename, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(filename);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (editValue.trim() === filename) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update filename:', error);
      // Revert on error
      setEditValue(filename);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(filename);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-gray-700 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
          disabled={isSaving}
        />
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="text-green-400 hover:text-green-300 disabled:opacity-50"
          title="Save"
        >
          ✓
        </button>
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="text-red-400 hover:text-red-300 disabled:opacity-50"
          title="Cancel"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="text-gray-400 text-sm cursor-pointer hover:text-gray-300 inline-flex items-center gap-1"
      title="Click to edit filename"
    >
      {filename}
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    </div>
  );
};

export default FilenameEditor;

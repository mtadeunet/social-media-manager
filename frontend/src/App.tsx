import React, { useState } from 'react';
import './App.css';
import EnhancementTagModal from './components/EnhancementTagModal';
import MediaVaultGallery from './components/MediaVaultGallery';
import PostsPage from './pages/Posts';

type View = 'posts' | 'media-vault';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('media-vault');
  const [showTagModal, setShowTagModal] = useState(false);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#111827' }}>
      {/* Force dark theme override */}
      <style>{`
        * {
          background-color: #111827 !important;
          color: #f3f4f6 !important;
        }
        body {
          background-color: #111827 !important;
          color: #f3f4f6 !important;
        }
        .bg-white {
          background-color: #1f2937 !important;
        }
        .text-gray-900 {
          color: #f3f4f6 !important;
        }
        .text-gray-500 {
          color: #9ca3af !important;
        }
        .text-gray-700 {
          color: #d1d5db !important;
        }
        .border-gray-200 {
          border-color: #374151 !important;
        }
        .border-white {
          border-color: #4b5563 !important;
        }
        input, select, textarea {
          background-color: #374151 !important;
          color: #f3f4f6 !important;
          border-color: #4b5563 !important;
        }
      `}</style>
      {/* Navigation */}
      <nav className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              <button
                onClick={() => setCurrentView('media-vault')}
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${currentView === 'media-vault'
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                  }`}
              >
                📁 Media Vault
              </button>
              <button
                onClick={() => setCurrentView('posts')}
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${currentView === 'posts'
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                  }`}
              >
                📝 Posts
              </button>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => setShowTagModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-600 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
              >
                🏷️ Manage Tags
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      {currentView === 'media-vault' ? <MediaVaultGallery /> : <PostsPage />}

      {/* Enhancement Tag Modal */}
      <EnhancementTagModal
        isOpen={showTagModal}
        onClose={() => setShowTagModal(false)}
        onTagsUpdated={() => {
          // Refresh will be handled by MediaVaultGallery
        }}
      />
    </div>
  );
};

export default App;

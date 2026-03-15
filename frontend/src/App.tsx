import React, { useState } from 'react';
import './App.css';
import MediaVaultGallery from './components/MediaVaultGallery';
import PostsPage from './pages/Posts';

type View = 'posts' | 'media-vault';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('media-vault');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              <button
                onClick={() => setCurrentView('media-vault')}
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${currentView === 'media-vault'
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                📁 Media Vault
              </button>
              <button
                onClick={() => setCurrentView('posts')}
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${currentView === 'posts'
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                📝 Posts
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      {currentView === 'media-vault' ? <MediaVaultGallery /> : <PostsPage />}
    </div>
  );
};

export default App;

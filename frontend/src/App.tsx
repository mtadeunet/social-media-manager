import React from 'react';
import PostsPage from './pages/Posts';
import './App.css';

const App: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <PostsPage />
    </div>
  );
};

export default App;

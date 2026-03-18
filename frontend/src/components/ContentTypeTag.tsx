import React from 'react';
import { ContentType } from '../types/mediaVault';

interface ContentTypeTagProps {
  contentType: ContentType;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

const ContentTypeTag: React.FC<ContentTypeTagProps> = ({ 
  contentType, 
  size = 'md',
  onClick,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  };
  
  const baseClasses = `
    inline-flex items-center font-medium
    cursor-pointer
    transition-all
    duration-200
    hover:opacity-90
    ${sizeClasses[size]}
    ${className}
  `;
  
  // If it's not a phase, show simple rounded tag
  if (!contentType.is_phase) {
    return (
      <span
        onClick={onClick}
        className={`${baseClasses} rounded-full`}
        style={{ 
          backgroundColor: contentType.color,
          color: 'white'
        }}
        title={contentType.description || contentType.name}
      >
        {contentType.icon && <span className="mr-1">{contentType.icon}</span>}
        {contentType.name}
      </span>
    );
  }
  
  // If it's a phase, show zshell-prompt style
  return (
    <span
      onClick={onClick}
      className={`${baseClasses}`}
      title={contentType.display_name}
    >
      {/* Left part - Content type with its color */}
      <span
        className="rounded-l pl-3 pr-1 py-1 flex items-center"
        style={{ 
          backgroundColor: contentType.color,
          color: 'white'
        }}
      >
        {(contentType.parent?.icon || contentType.icon) && <span className="mr-1">{contentType.parent?.icon || contentType.icon}</span>}
        {contentType.parent?.name || contentType.name} &gt;
      </span>
      
      {/* Right part - Phase with phase color */}
      <span
        className="rounded-r pr-3 py-1"
        style={{ 
          backgroundColor: contentType.phase_color || contentType.color,
          color: 'white'
        }}
      >
        {contentType.phase_name}
      </span>
    </span>
  );
};

export default ContentTypeTag;

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, onClick }) => {
  return (
    <div
      className={`bg-surface/80 backdrop-blur-md border border-border rounded-lg p-6 ${className}`}
      onClick={onClick}
    >
      {title && <h3 className="text-lg font-display font-semibold mb-4 text-text-primary">{title}</h3>}
      {children}
    </div>
  );
};

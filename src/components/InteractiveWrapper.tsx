import React, { ReactNode } from 'react';

interface InteractiveWrapperProps {
  children: ReactNode;
  className?: string;
}

/**
 * InteractiveWrapper re-enables mouse interactions for its children
 * inside a parent with pointer-events: none.
 */
const InteractiveWrapper: React.FC<InteractiveWrapperProps> = ({ children, className }) => {
  return (
    <div
      className={className}
      style={{ pointerEvents: 'auto' }}
    >
      {children}
    </div>
  );
};

export default InteractiveWrapper;

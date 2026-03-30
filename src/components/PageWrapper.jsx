import React from 'react';

// CSS-based page transition — no external dependency needed
const PageWrapper = ({ children }) => (
  <div className="route-fade-in" style={{ minHeight: '100%' }}>
    {children}
  </div>
);

export default PageWrapper;

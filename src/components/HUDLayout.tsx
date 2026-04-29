import React from 'react';

const HUDLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'grid',
        gridTemplateColumns: '300px 1fr 300px',
        gridTemplateRows: 'auto 1fr auto',
        position: 'fixed',
        top: 0,
        left: 0,
        gridTemplateAreas: `
          "Breadcrumbs . RightSidebar"
          ".         . RightSidebar"
          ".         MapControls ."
        `,
        pointerEvents: 'none',
        padding: '20px',
        gap: '20px',
        boxSizing: 'border-box',
        alignItems: 'stretch',
        justifyItems: 'stretch',
      }}
    >
      {/* Top-Left: Breadcrumbs */}
      <div
        style={{
          gridArea: 'Breadcrumbs',
          pointerEvents: 'auto',
          background: 'rgba(255,255,255,0.8)',
          borderRadius: '8px',
          padding: '1rem',
          alignSelf: 'start',
          justifySelf: 'start',
        }}
      >
        {/* Breadcrumbs (Campus > Building > Floor) */}
        <span>Campus &gt; Building &gt; Floor</span>
      </div>

      {/* Bottom-Right: Map Controls */}
      <div
        style={{
          gridArea: 'MapControls',
          pointerEvents: 'auto',
          background: 'rgba(255,255,255,0.8)',
          borderRadius: '8px',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          alignSelf: 'end',
          justifySelf: 'end',
        }}
      >
        {/* Map Controls (Zoom, Rotate, Reset) */}
        <button>Zoom</button>
        <button>Rotate</button>
        <button>Reset</button>
      </div>

      {/* Right-Sidebar: Info Panel */}
      <div
        style={{
          gridArea: 'RightSidebar',
          pointerEvents: 'auto',
          background: 'rgba(255,255,255,0.8)',
          borderRadius: '8px',
          padding: '1rem',
          height: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Info Panel (Room details, occupancy) */}
        <h3>Info Panel</h3>
        <p>Room details and occupancy info here.</p>
      </div>

      {children}
    </div>
  );
};

export default HUDLayout;

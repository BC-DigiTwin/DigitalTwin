
import './OverlayContainer.css';

interface OverlayContainerProps {
  children?: React.ReactNode;
}

/**
 * OverlayContainer is a root wrapper for all 2D UI elements that sit on top of the 3D canvas.
 */
const OverlayContainer: React.FC<OverlayContainerProps> = ({ children }) => {
  return (
    <div className="overlay-container">
      <div className="overlay-content-wrapper">
        {children}
      </div>
    </div>
  );
};

export default OverlayContainer;

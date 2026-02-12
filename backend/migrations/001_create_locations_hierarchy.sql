-- Digital Twin - Locations Schema 
-- Focus: Indoor 3D visualization 
-- Created: 02/05/2026

CREATE TABLE locations (
  -- Primary identifier
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  
  -- ========== HIERARCHY MANAGEMENT ==========
  parent_id INT UNSIGNED NULL,
  type ENUM('Campus', 'Building', 'Floor', 'Room') NOT NULL,  
  depth TINYINT UNSIGNED DEFAULT 0 COMMENT 'ex: 0=Campus, 1=Building, 2=Floor, 3=Room',
  
  -- ========== BASIC INFORMATION ==========
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- ========== 3D TRANSFORM ==========
  -- Position: Feets offset from parent's origin
  position_x DECIMAL(10, 2) DEFAULT 0.0 COMMENT 'X position',
  position_y DECIMAL(10, 2) DEFAULT 0.0 COMMENT 'Y position(height)',
  position_z DECIMAL(10, 2) DEFAULT 0.0 COMMENT 'Z position',
  
  -- Rotation: Degrees around each axis
  rotation_x DECIMAL(5, 2) DEFAULT 0.0 COMMENT 'Rotation around X-axis (degrees)',
  rotation_y DECIMAL(5, 2) DEFAULT 0.0 COMMENT 'Rotation around Y-axis (degrees)',
  rotation_z DECIMAL(5, 2) DEFAULT 0.0 COMMENT 'Rotation around Z-axis (degrees)',
  
  -- Scale: Multiplier for model size
  scale_x DECIMAL(5, 2) DEFAULT 1.0 COMMENT 'Scale factor X-axis',
  scale_y DECIMAL(5, 2) DEFAULT 1.0 COMMENT 'Scale factor Y-axis',
  scale_z DECIMAL(5, 2) DEFAULT 1.0 COMMENT 'Scale factor Z-axis',
  
  -- ========== FLOOR-SPECIFIC DATA ==========
  floor_number INT NULL COMMENT 'Floor number (ex: 0=ground, -1=basement, 1=first floor)',
  room_number VARCHAR(20) COMMENT 'Room number (A110, A109)',
  area_sqft DECIMAL(10, 2) COMMENT 'Area in square feet',
  
  -- ========== 3D MODEL ASSETS ==========
  model_url VARCHAR(500) COMMENT 'S3 path to 3D model (GLTF/GLB format)',
  texture_url VARCHAR(500) COMMENT 'S3 path to texture files',
  thumbnail_url VARCHAR(500) COMMENT 'S3 path to preview thumbnail',
  model_format ENUM('gltf', 'glb', 'obj', 'fbx') DEFAULT 'glb',
  
  -- ========== NAVIGATION & VISIBILITY ==========
  is_navigable BOOLEAN DEFAULT TRUE COMMENT 'Can users walk to this location?',
  is_visible BOOLEAN DEFAULT TRUE COMMENT 'Should this be shown in 3D view?',
  is_interactive BOOLEAN DEFAULT FALSE COMMENT 'Can users interact with this?',
  display_order INT DEFAULT 0 COMMENT 'Sorting order in lists/UI',
  
  
  -- ========== CONSTRAINTS ==========
  -- Foreign key for hierarchy
  CONSTRAINT fk_locations_parent
    FOREIGN KEY (parent_id) 
    REFERENCES locations(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  
  -- Hierarchy validation (UPDATED - No Desk level)
  CONSTRAINT chk_valid_hierarchy CHECK (
    -- Valid parent-child relationships
    (type = 'Campus' AND parent_id IS NULL) OR
    (type = 'Building' AND parent_id IS NOT NULL) OR
    (type = 'Floor' AND parent_id IS NOT NULL) OR
    (type = 'Room' AND parent_id IS NOT NULL)
  ),
  
  -- Depth validation (UPDATED - Max depth 3)
  CONSTRAINT chk_depth CHECK (
    depth BETWEEN 0 AND 3
  ),
  
  -- Scale must be positive number and it should't be 0
  CONSTRAINT chk_positive_scale CHECK (
    scale_x > 0 AND scale_y > 0 AND scale_z > 0
  ),
  
  -- Valid floor numbers
  CONSTRAINT chk_floor_number CHECK (
    floor_number IS NULL OR floor_number BETWEEN -5 AND 20
  ),
  
  -- Room number format
  CONSTRAINT chk_room_number CHECK (
  room_number IS NULL OR room_number REGEXP '^[A-Z][0-9]{3}$'
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
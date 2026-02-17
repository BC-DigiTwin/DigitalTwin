-- Digital Twin : Location Hierarchy CTE Query
-- Fetch entire location tree from Campus down to Room

WITH RECURSIVE location_tree AS (
    SELECT
        id, 
        parent_id,
        type,
        name, 
        depth,
        description, 
        position_x, position_y, position_z,
        rotation_x, rotation_y, rotation_z,
        scale_x, scale_y, scale_z,
        floor_number,
        room_number,
        area_sqft,
        model_url,
        texture_url,
        thumbnail_url,
        model_format,
        is_navigable,
        is_visible,
        is_interactive,
        display_order,

        0 AS level,
        CAST(id AS CHAR(500)) AS path,
        CAST(name AS CHAR(500)) AS path_names

    FROM locations
    WHERE parent_id IS NULL 

    UNION ALL

    SELECT 
        l.id,
        l.parent_id,
        l.type,
        l.name,
        l.depth,
        l.description,
        l.position_x, l.position_y, l.position_z,
        l.rotation_x, l.rotation_y, l.rotation_z,
        l.scale_x, l.scale_y, l.scale_z,
        l.floor_number,
        l.room_number,
        l.area_sqft,
        l.model_url,
        l.texture_url,
        l.thumbnail_url,
        l.model_format,
        l.is_navigable,
        l.is_visible,
        l.is_interactive,
        l.display_order,
        parent.level + 1,
        CONCAT(parent.path, '.', l.id),
        CONCAT(parent.path_names, ' > ', l.name)   
    FROM locations l
    INNER JOIN location_tree parent ON l.parent_id = parent.id
)

SELECT 
    *,
    CASE 
        WHEN type = 'Campus' THEN 'root'
        WHEN type = 'Room' THEN 'leaf'
        ELSE 'branch'
    END AS node_type,
    LENGTH(path) - LENGTH(REPLACE(path, '.', '')) AS depth_calculated
FROM location_tree
ORDER BY path;
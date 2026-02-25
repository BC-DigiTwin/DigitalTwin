import database from '../db/connection.js';

/**
 * GET /api/hierarchy
 * Returns the entire location hierarchy as a nested JSON tree
 */
export async function getHierarchy(req, res) {
    try {
        // Execute the CTE query 
        const query = `
            WITH RECURSIVE location_tree AS (
                SELECT
                    id, parent_id, type, name, description,
                    position_x, position_y, position_z,
                    rotation_x, rotation_y, rotation_z,
                    scale_x, scale_y, scale_z,
                    floor_number, room_number, area_sqft,
                    model_url, texture_url, thumbnail_url,
                    model_format, is_navigable, is_visible,
                    is_interactive, display_order,
                    0 AS level
                FROM locations
                WHERE parent_id IS NULL
                
                UNION ALL
                
                SELECT
                    l.id, l.parent_id, l.type, l.name, l.description,
                    l.position_x, l.position_y, l.position_z,
                    l.rotation_x, l.rotation_y, l.rotation_z,
                    l.scale_x, l.scale_y, l.scale_z,
                    l.floor_number, l.room_number, l.area_sqft,
                    l.model_url, l.texture_url, l.thumbnail_url,
                    l.model_format, l.is_navigable, l.is_visible,
                    l.is_interactive, l.display_order,
                    parent.level + 1
                FROM locations l
                INNER JOIN location_tree parent ON l.parent_id = parent.id
            )
            SELECT * FROM location_tree
            ORDER BY parent_id, display_order, name
        `;

        const results = await database.query(query);
        
        const tree = buildTree(results);
        
        // JSON response
        res.json({
            success: true,
            data: tree
        });

    } catch (error) {
        console.error('Error fetching hierarchy:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch hierarchy',
            message: error.message
        });
    }
}

/**
 * GET /api/hierarchy/:id
 * Returns a specific location and its children
 */
export async function getLocationById(req, res) {
    try {
        const { id } = req.params;
        
        const query = `
            WITH RECURSIVE location_subtree AS (
                SELECT * FROM locations WHERE id = ?
                
                UNION ALL
                
                SELECT l.* FROM locations l
                INNER JOIN location_subtree ls ON l.parent_id = ls.id
            )
            SELECT * FROM location_subtree
            ORDER BY parent_id, display_order, name
        `;

        const results = await database.query(query, [id]);
        
        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Location not found'
            });
        }
        
        const tree = buildTree(results, id);
        
        res.json({
            success: true,
            data: tree[0] || null
        });

    } catch (error) {
        console.error('Error fetching location:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch location',
            message: error.message
        });
    }
}

/**
 * Convert flat array to nested tree structure
 */
function buildTree(nodes, parentId = null) {
    const tree = [];
    
    for (const node of nodes) {
        if (node.parent_id == parentId) {
            const children = buildTree(nodes, node.id);
            if (children.length > 0) {
                node.children = children;
            }
            tree.push(node);
        }
    }
    
    return tree;
}

/**
 * GET /api/hierarchy/flat
 * Returns flat hierarchy (alternative endpoint)
 */
export async function getFlatHierarchy(req, res) {
    try {
        const query = `
            WITH RECURSIVE location_tree AS (
                SELECT
                    id, parent_id, type, name, depth,
                    CAST(id AS CHAR(500)) AS path,
                    CAST(name AS CHAR(500)) AS path_names,
                    0 AS level
                FROM locations
                WHERE parent_id IS NULL
                
                UNION ALL
                
                SELECT
                    l.id, l.parent_id, l.type, l.name, l.depth,
                    CONCAT(parent.path, '.', l.id),
                    CONCAT(parent.path_names, ' > ', l.name),
                    parent.level + 1
                FROM locations l
                INNER JOIN location_tree parent ON l.parent_id = parent.id
            )
            SELECT 
                *,
                CASE 
                    WHEN type = 'Campus' THEN 'root'
                    WHEN type = 'Room' THEN 'leaf'
                    ELSE 'branch'
                END AS node_type
            FROM location_tree
            ORDER BY path
        `;

        const results = await database.query(query);
        
        res.json({
            success: true,
            data: results,
            metadata: {
                total_count: results.length,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error fetching flat hierarchy:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch hierarchy',
            message: error.message
        });
    }
}
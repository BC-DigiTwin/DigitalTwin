-- Digital Twin: Verify parent_id Index Usage in CTE


-- Check if the index exists
SHOW INDEX FROM locations WHERE Column_name = 'parent_id';

-- If index doesn't exist, create it
-- CREATE INDEX idx_locations_parent_id ON locations(parent_id);

-- Run EXPLAIN ANALYZE on CTE to verify index usage
EXPLAIN ANALYZE
WITH RECURSIVE location_tree AS (
    SELECT
        id, parent_id, type, name, depth,
        0 AS level
    FROM locations
    WHERE parent_id IS NULL
    
    UNION ALL
    
    SELECT 
        l.id, l.parent_id, l.type, l.name, l.depth,
        parent.level + 1
    FROM locations l
    INNER JOIN location_tree parent ON l.parent_id = parent.id
)
SELECT * FROM location_tree;

-- Simplified version to focus on the recursive join
EXPLAIN ANALYZE
SELECT l.id, l.parent_id, l.type, l.name
FROM locations l
INNER JOIN locations parent ON l.parent_id = parent.id
WHERE parent.parent_id IS NULL;
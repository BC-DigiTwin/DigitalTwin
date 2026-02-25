export class LocationService {
    constructor(private db: any) {} 
  
    async create(data: any): Promise<any> {
      const connection = await this.db.getConnection();
      try {
        const [result] = await connection.execute(
          'INSERT INTO locations SET ?',
          [data]
        );
        
        const [rows] = await connection.execute(
          'SELECT * FROM locations WHERE id = ?',
          [(result as any).insertId]
        );
        
        return rows[0];
      } finally {
        connection.release();
      }
    }
  
    async findById(id: number): Promise<any> {
      const connection = await this.db.getConnection();
      try {
        const [rows] = await connection.execute(
          'SELECT * FROM locations WHERE id = ?',
          [id]
        );
        return rows[0] || null;
      } finally {
        connection.release();
      }
    }
  
    // Get hierarchy using CTE
    async getHierarchy(id: number): Promise<any[]> {
      const connection = await this.db.getConnection();
      try {
        const [rows] = await connection.execute(`
          WITH RECURSIVE location_tree AS (
            SELECT * FROM locations WHERE id = ?
            UNION ALL
            SELECT l.* FROM locations l
            INNER JOIN location_tree lt ON l.parent_id = lt.id
          )
          SELECT * FROM location_tree ORDER BY depth, display_order
        `, [id]);
        
        return rows as any[];
      } finally {
        connection.release();
      }
    }
  
    async getChildren(parentId: number): Promise<any[]> {
      const connection = await this.db.getConnection();
      try {
        const [rows] = await connection.execute(
          'SELECT * FROM locations WHERE parent_id = ? ORDER BY display_order, name',
          [parentId]
        );
        return rows as any[];
      } finally {
        connection.release();
      }
    }
  }
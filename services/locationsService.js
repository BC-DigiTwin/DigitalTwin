// LocationService class
// Uses an injected DB client (recommended) or will attempt to instantiate
// a PrismaClient from `@prisma/client` if available.

let PrismaClient;
try {
  // eslint-disable-next-line global-require
  ({ PrismaClient } = require('@prisma/client'));
} catch (e) {
  PrismaClient = null;
}

class LocationService {
  constructor(client) {
    if (client) {
      this.client = client;
    } else if (PrismaClient) {
      this.client = new PrismaClient();
    } else {
      throw new Error('No DB client provided. Pass a PrismaClient instance to LocationService or install @prisma/client');
    }
  }

  // Return all locations from the DB. For Prisma this expects a model named
  // `location` (lowercase) or `locations`. If neither exists, attempts a raw
  // query using `$queryRaw` against a `locations` table.
  async getAllLocations() {
    if (!this.client) throw new Error('DB client not initialized');

    if (this.client.location && typeof this.client.location.findMany === 'function') {
      return this.client.location.findMany();
    }

    if (this.client.locations && typeof this.client.locations.findMany === 'function') {
      return this.client.locations.findMany();
    }

    if (this.client.$queryRaw) {
      return this.client.$queryRaw`SELECT * FROM locations`;
    }

    throw new Error('Unsupported DB client: cannot read locations');
  }

  // Retrieve a single location by id and include children recursively.
  async getLocationById(id) {
    if (!id) {
      const err = new Error('Missing required parameter: id');
      err.statusCode = 400;
      throw err;
    }

    if (!this.client) throw new Error('DB client not initialized');

    // Determine model accessor on the client
    const model = this.client.location || this.client.locations;
    const hasModel = !!model;

    // Helper to fetch node and its descendants recursively
    const fetchNode = async (nodeId) => {
      let node = null;

      if (hasModel && typeof model.findUnique === 'function') {
        node = await model.findUnique({ where: { id: nodeId } });
      } else if (hasModel && typeof model.findFirst === 'function') {
        node = await model.findFirst({ where: { id: nodeId } });
      } else if (this.client.$queryRaw) {
        const rows = await this.client.$queryRaw`SELECT * FROM locations WHERE id = ${nodeId} LIMIT 1`;
        node = Array.isArray(rows) ? rows[0] : rows;
      } else {
        throw new Error('Unsupported DB client: cannot read location by id');
      }

      if (!node) return null;

      // Attempt to find children by common parent column names
      let children = [];

      if (hasModel && typeof model.findMany === 'function') {
        // Try camelCase parentId first
        try {
          children = await model.findMany({ where: { parentId: node.id } });
        } catch (e) {
          // Try snake_case parent_id
          try {
            children = await model.findMany({ where: { parent_id: node.id } });
          } catch (e2) {
            children = [];
          }
        }
      } else if (this.client.$queryRaw) {
        children = await this.client.$queryRaw`SELECT * FROM locations WHERE parent_id = ${node.id}`;
      }

      // Recurse for each child to assemble full subtree
      if (Array.isArray(children) && children.length) {
        const nested = await Promise.all(children.map(c => fetchNode(c.id)));
        node.children = nested.filter(Boolean);
      } else {
        node.children = [];
      }

      return node;
    };

    return fetchNode(id);
  }

  // Create a new location record and return the created row/object.
  // Accepts a plain object with fields matching your DB schema.
  async createLocation(data) {
    if (!data || !data.name) {
      const err = new Error('Missing required field: name');
      err.statusCode = 400;
      throw err;
    }

    if (this.client.location && typeof this.client.location.create === 'function') {
      return this.client.location.create({ data });
    }

    if (this.client.locations && typeof this.client.locations.create === 'function') {
      return this.client.locations.create({ data });
    }

    if (this.client.$executeRaw) {
      // Fallback: attempt a simple INSERT for common SQL DBs. This is best-effort
      // and assumes a `locations` table with columns matching `data` keys.
      const keys = Object.keys(data);
      const cols = keys.map(k => `\"${k}\"`).join(', ');
      const params = keys.map((_, i) => `$${i + 1}`).join(', ');
      const values = keys.map(k => data[k]);
      // Note: $executeRaw is driver-specific; using $queryRawUnsafe would be required
      // for dynamic SQL in Prisma but it's unsafe. Prefer injecting a proper client.
      throw new Error('Raw SQL create path not implemented - please provide a DB client that supports create()');
    }

    throw new Error('Unsupported DB client: cannot create location');
  }

  async disconnect() {
    if (this.client && typeof this.client.$disconnect === 'function') {
      await this.client.$disconnect();
    }
  }
}

module.exports = LocationService;


import request from 'supertest';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import app from '../app';

async function clearLocations() {
  await prisma.location.deleteMany();
}

describe('GET /api/hierarchy/:id', () => {
    let rootId: number;
    let level2: { id: number };
    let level3: { id: number };
    let level4: { id: number };

  beforeAll(async () => {
    await clearLocations();
    // Seed 4-level hierarchy
    const level1 = await prisma.location.create({ data: { name: 'Level 1', depth: 1 } });
    level2 = await prisma.location.create({ data: { name: 'Level 2', parent_id: level1.id, depth: 2 } });
    level3 = await prisma.location.create({ data: { name: 'Level 3', parent_id: level2.id, depth: 3 } });
    level4 = await prisma.location.create({ data: { name: 'Level 4', parent_id: level3.id, depth: 4 } });
    rootId = level1.id;
  });

  afterAll(async () => {
    await clearLocations();
    await prisma.$disconnect();
  });

  it('returns the full nested hierarchy with correct children', async () => {
    const res = await request(app).get(`/api/hierarchy/${rootId}`);
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    // Uncomment for debugging:
    // console.log(JSON.stringify(res.body, null, 2));

    // Level 1
    const l1 = res.body.data;
    expect(l1.name).toBe('Level 1');
    expect(Array.isArray(l1.children)).toBe(true);
    expect(l1.children.length).toBe(1);
    expect(l1.children[0].name).toBe('Level 2');
    expect(l1.children[0].parent_id).toBe(l1.id);

    // Level 2
    const l2 = l1.children[0];
    expect(Array.isArray(l2.children)).toBe(true);
    expect(l2.children.length).toBe(1);
    expect(l2.children[0].name).toBe('Level 3');
    expect(l2.children[0].parent_id).toBe(l2.id);

    // Level 3
    const l3 = l2.children[0];
    expect(Array.isArray(l3.children)).toBe(true);
    expect(l3.children.length).toBe(1);
    expect(l3.children[0].name).toBe('Level 4');
    expect(l3.children[0].parent_id).toBe(l3.id);

    // Level 4
    const l4 = l3.children[0];
    expect(Array.isArray(l4.children)).toBe(true);
    expect(l4.children.length).toBe(0);
  });
});

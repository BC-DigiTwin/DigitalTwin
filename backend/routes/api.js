import { Router } from 'express';
import { 
    getHierarchy, 
    getLocationById,
    getFlatHierarchy 
} from '../src/controllers/locationController.js';

const router = Router();

// GET /api/hierarchy - Get full nested hierarchy
router.get('/hierarchy', getHierarchy);

// GET /api/hierarchy/flat - Get flat hierarchy with paths
router.get('/hierarchy/flat', getFlatHierarchy);

// GET /api/hierarchy/:id - Get specific location with its children
router.get('/hierarchy/:id', getLocationById);

export default router;
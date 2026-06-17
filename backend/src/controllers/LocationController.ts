// backend/controllers/LocationController.ts
import { Request, Response } from 'express';
import { LocationService } from '../services/LocationService';

export class LocationController {
    constructor(private locationService: LocationService) {}

    // Helper method to parse ID 
    private parseId(id: string | string[]): number {
        if (Array.isArray(id)) {
            return parseInt(id[0], 10);
        }
        return parseInt(id, 10);
    }

    // get /locations/:id/hierarchy
    async getHierarchy(req: Request, res: Response) {
        try {
            const id = this.parseId(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ error: 'Invalid ID format' });
            }
            
            const hierarchy = await this.locationService.getHierarchy(id);
            res.json(hierarchy);
        } catch (error) {
            console.error('Error fetching hierarchy:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // get /locations/:id
    async findById(req: Request, res: Response) {
        try {
            const id = this.parseId(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ error: 'Invalid ID format' });
            }
            
            const location = await this.locationService.findById(id);
            
            if (!location) {
                return res.status(404).json({ error: 'Location not found' });
            }
            
            res.json(location);
        } catch (error) {
            console.error('Error fetching location:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // POST /locations
    async create(req: Request, res: Response) {
        try {
            // validation
            if (!req.body.name || !req.body.type) {
                return res.status(400).json({ 
                    error: 'Name and type are required' 
                });
            }
            
            const location = await this.locationService.create(req.body);
            res.status(201).json(location);
        } catch (error: any) {
            console.error('Error creating location:', error);
            
            if (error.message.includes('Parent location not found') || 
                error.message.includes('Invalid hierarchy')) {
                return res.status(400).json({ error: error.message });
            }
            
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // get /locations/:id/children
    async getChildren(req: Request, res: Response) {
        try {
            const id = this.parseId(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ error: 'Invalid ID format' });
            }
            
            const children = await this.locationService.getChildren(id);
            res.json(children);
        } catch (error) {
            console.error('Error fetching children:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
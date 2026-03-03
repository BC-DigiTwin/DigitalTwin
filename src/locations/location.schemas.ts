<<<<<<< HEAD
export {
  BaseLocationSchema,
  LocationResponseSchema,
  CreateLocationDTOSchema,
  CreateLocationSchema,
  UpdateLocationSchema,
  LocationIdParamSchema,
  type BaseLocation,
  type LocationResponse,
  type CreateLocationDTO,
  type CreateLocation,
  type UpdateLocation,
  type LocationIdParam,
} from "../../shared/schemas/location.schemas";
=======
import { z } from "zod";

/**
 * Base Location Schema
 * Used internally for shared validation fields
 */
export const BaseLocationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1),
  state: z.string().min(2).max(2), // US state code example
  zipCode: z.string().regex(/^\d{5}$/, "Invalid ZIP code"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Location Response DTO Schema
 * Used for validating API responses for locations
 * Alias for BaseLocationSchema for maintainability
 */
export const LocationResponseSchema = BaseLocationSchema;

/**
 * Create Location DTO Schema (Explicit)
 * Used for validating location creation requests (API input)
 */
export const CreateLocationDTOSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1),
  state: z.string().length(2, "State must be 2 characters"),
  zipCode: z.string().regex(/^\d{5}$/, "Invalid ZIP code"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

/**
 * Create Location DTO Schema
 * Used for validating location creation requests
 * Omits id, createdAt, updatedAt (auto-generated fields)
 */
export const CreateLocationSchema = BaseLocationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * Update Location DTO Schema
 * Used for validating location update requests
 * All fields optional (partial DTO)
 */
export const UpdateLocationSchema = CreateLocationDTOSchema.partial();

/**
 * Location Params Schema (e.g., for route params)
 */
export const LocationIdParamSchema = z.object({
  locationId: z.string().uuid("Invalid location ID"),
});

/**
 * Recursive tree node used for the location hierarchy (frontend + backend).
 * Built from the locations table and enriched with a `children` array.
 */
export interface LocationNode {
  id: string | number;
  parent_id: string | number | null;
  type: string;
  name: string;
  description?: string | null;

  position_x?: number | null;
  position_y?: number | null;
  position_z?: number | null;

  rotation_x?: number | null;
  rotation_y?: number | null;
  rotation_z?: number | null;

  scale_x?: number | null;
  scale_y?: number | null;
  scale_z?: number | null;

  floor_number?: number | null;
  room_number?: string | null;
  area_sqft?: number | null;

  model_url?: string | null;
  texture_url?: string | null;
  thumbnail_url?: string | null;
  model_format?: string | null;

  is_navigable?: boolean | null;
  is_visible?: boolean | null;
  is_interactive?: boolean | null;

  display_order?: number | null;
  level?: number | null;

  children?: LocationNode[];
}

export const LocationNodeSchema: z.ZodType<LocationNode> = z.lazy(() =>
  z.object({
    id: z.union([z.string(), z.number()]),
    parent_id: z.union([z.string(), z.number(), z.null()]),
    type: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),

    position_x: z.number().nullable().optional(),
    position_y: z.number().nullable().optional(),
    position_z: z.number().nullable().optional(),

    rotation_x: z.number().nullable().optional(),
    rotation_y: z.number().nullable().optional(),
    rotation_z: z.number().nullable().optional(),

    scale_x: z.number().nullable().optional(),
    scale_y: z.number().nullable().optional(),
    scale_z: z.number().nullable().optional(),

    floor_number: z.number().nullable().optional(),
    room_number: z.string().nullable().optional(),
    area_sqft: z.number().nullable().optional(),

    model_url: z.string().nullable().optional(),
    texture_url: z.string().nullable().optional(),
    thumbnail_url: z.string().nullable().optional(),
    model_format: z.string().nullable().optional(),

    is_navigable: z.boolean().nullable().optional(),
    is_visible: z.boolean().nullable().optional(),
    is_interactive: z.boolean().nullable().optional(),

    display_order: z.number().nullable().optional(),
    level: z.number().int().nonnegative().nullable().optional(),

    children: z.array(z.lazy(() => LocationNodeSchema)).optional(),
  })
);

/**
 * Response DTO for GET /api/hierarchy.
 */
export const LocationHierarchyResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(LocationNodeSchema),
});

// --- Type Inference Exports ---
export type CreateLocationDto = z.infer<typeof CreateLocationDTOSchema>;
export type LocationResponseDto = z.infer<typeof LocationResponseSchema>;
export type UpdateLocationDto = z.infer<typeof UpdateLocationSchema>;
export type LocationHierarchyResponseDto = z.infer<typeof LocationHierarchyResponseSchema>;
>>>>>>> origin/develop

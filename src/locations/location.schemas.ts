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

// --- Type Inference Exports ---
export type CreateLocationDto = z.infer<typeof CreateLocationDTOSchema>;
export type LocationResponseDto = z.infer<typeof LocationResponseSchema>;
export type UpdateLocationDto = z.infer<typeof UpdateLocationSchema>;

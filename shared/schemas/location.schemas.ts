import { z } from "zod";

// Base Location Schema
export const BaseLocationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1),
  state: z.string().min(2).max(2),
  zipCode: z.string().regex(/^\d{5}$/, "Invalid ZIP code"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type BaseLocation = z.infer<typeof BaseLocationSchema>;

// Location Response DTO Schema
export const LocationResponseSchema = BaseLocationSchema;
export type LocationResponse = z.infer<typeof LocationResponseSchema>;

// Create Location DTO Schema (Explicit)
export const CreateLocationDTOSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1),
  state: z.string().length(2, "State must be 2 characters"),
  zipCode: z.string().regex(/^\d{5}$/, "Invalid ZIP code"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type CreateLocationDTO = z.infer<typeof CreateLocationDTOSchema>;

// Create Location Schema (Omits id, createdAt, updatedAt)
export const CreateLocationSchema = BaseLocationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateLocation = z.infer<typeof CreateLocationSchema>;

// Update Location DTO Schema (Partial DTO)
export const UpdateLocationSchema = CreateLocationDTOSchema.partial();
export type UpdateLocation = z.infer<typeof UpdateLocationSchema>;

// Location Params Schema (e.g., for route params)
export const LocationIdParamSchema = z.object({
  locationId: z.string().uuid("Invalid location ID"),
});
export type LocationIdParam = z.infer<typeof LocationIdParamSchema>;

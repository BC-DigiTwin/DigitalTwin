/**
 * Shape of one row in the `buildings` table, mirroring what the Next.js route
 * handler at `app/api/buildings/[id]/route.ts` returns to the client.
 *
 * `menu_tabs` is a JSON column: keys become tab labels, values are either a
 * paragraph (`string`) or a bullet list (`string[]`).
 */
export interface BuildingApiData {
  id: string
  name: string | null
  image_url: string | null
  primary_purpose: string | null
  operating_hours: string | null
  menu_tabs: Record<string, string | string[]> | null
}

/** Back-compat alias for older imports. */
export type Building = BuildingApiData

/**
 * Offline fallback rows used when the Next.js API returns 404 (no DB row yet)
 * or when the API is unreachable. The id strings MUST match the Blender mesh
 * slugs produced by `canonicalBuildingMeshName` so click → lookup lines up.
 *
 * As real rows are inserted in RDS, the matching mock entry simply stops being
 * used — no code changes required.
 */
export const mockBuildings: BuildingApiData[] = [
  {
    id: 'building_a',
    name: 'Building A',
    image_url: 'https://picsum.photos/seed/digital-twin-building-a/1200/800',
    primary_purpose: 'Science and laboratory programs',
    operating_hours: 'Mon–Fri 7:00 AM – 10:00 PM',
    menu_tabs: {
      Academics: ['Biology', 'Chemistry', 'Physics'],
      About:
        'Greybox campus building A — science and lab programs. The GLB mesh `building_a` maps to this row.',
    },
  },
  {
    id: 'building_b',
    name: 'Building B',
    image_url: 'https://picsum.photos/seed/digital-twin-building-b/1200/800',
    primary_purpose: 'Library and academic support',
    operating_hours: 'Mon–Sun 8:00 AM – 11:00 PM',
    menu_tabs: {
      Services: ['Library Services', 'Study commons', 'Academic support'],
      About:
        'Greybox campus building B — library and learning-adjacent use. GLB mesh `building_b` maps here.',
    },
  },
  {
    id: 'building_c',
    name: 'Building C',
    image_url: 'https://picsum.photos/seed/digital-twin-building-c/1200/800',
    primary_purpose: 'Health sciences',
    operating_hours: 'Mon–Fri 7:00 AM – 9:00 PM',
    menu_tabs: {
      Programs: ['Nursing', 'Allied health', 'Simulation labs'],
      About:
        'Greybox campus building C — health sciences footprint. GLB mesh `building_c` maps here.',
    },
  },
  {
    id: 'building_d',
    name: 'Building D',
    image_url: 'https://picsum.photos/seed/digital-twin-building-d/1200/800',
    primary_purpose: 'General classrooms and faculty offices',
    operating_hours: 'Mon–Fri 7:30 AM – 9:30 PM',
    menu_tabs: {
      Spaces: ['General studies', 'Classrooms', 'Faculty offices'],
      About: 'Greybox campus building D. GLB mesh `building_d` maps here.',
    },
  },
  {
    id: 'building_e',
    name: 'Building E',
    image_url: 'https://picsum.photos/seed/digital-twin-building-e/1200/800',
    primary_purpose: 'Student services and meeting rooms',
    operating_hours: 'Mon–Fri 8:00 AM – 8:00 PM',
    menu_tabs: {
      Spaces: ['Student services', 'Meeting rooms'],
      About: 'Greybox campus building E. GLB mesh `building_e` maps here.',
    },
  },
]

export interface Court {
  id: string;
  name: string;
  slug: string;
  min_people: number;
}

export interface TimeSlot {
  id: string;  // UUID from Supabase (or synthetic string for sample data)
  name: string;
  userId: string; // stable per-device UUID of the creator
  startMin: number; // minutes from midnight
  endMin: number;
}

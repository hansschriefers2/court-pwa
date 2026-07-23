export interface Court {
  id: string;
  name: string;
  slug: string;
  min_people: number;
  description?: string;
  maps_url?: string;
}

export interface PinboardMessage {
  id: string;
  courtId: string;
  userId: string;
  username: string;
  message: string;
  createdAt: string;
}

export interface TimeSlot {
  id: string;  // UUID from Supabase (or synthetic string for sample data)
  name: string;
  userId: string; // stable per-device UUID of the creator
  startMin: number; // minutes from midnight
  endMin: number;
}

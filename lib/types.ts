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

export type SlotStatus = 'accepted' | 'tentative' | 'declined';

export interface TimeSlot {
  id: string;  // UUID from Supabase (or synthetic string for sample data)
  name: string;
  userId: string; // stable per-device UUID of the creator
  startMin: number; // minutes from midnight
  endMin: number;
  status: SlotStatus;
  trainingId?: string; // set when this slot is a response to a recurring training
}

export interface RecurringTraining {
  id: string;
  courtId: string;
  createdByUserId: string;
  createdByUsername: string;
  label: string;
  dayOfWeek: number; // JS convention: 0 = Sunday … 6 = Saturday
  startMin: number;
  endMin: number;
}

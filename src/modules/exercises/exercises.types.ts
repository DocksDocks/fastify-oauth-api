import type { Exercise, NewExercise } from '@/db/schema/exercises';

// Query params for listing exercises
export interface ListExercisesQuery {
  category?: 'strength' | 'cardio' | 'flexibility' | 'other';
  muscleGroup?: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'full_body';
  search?: string; // Search by name or description
  page?: number;
  limit?: number;
  onlyPublic?: boolean; // For admins to filter
}

// Create custom exercise body
export interface CreateExerciseBody {
  code: string;
  name: string;
  description?: string;
  category: 'strength' | 'cardio' | 'flexibility' | 'other';
  muscleGroup: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'full_body';
  equipment?: string;
  videoUrl?: string;
  instructions?: string;
  isPublic?: boolean; // Only for admins
}

// Update exercise body
export interface UpdateExerciseBody {
  name?: string;
  description?: string;
  category?: 'strength' | 'cardio' | 'flexibility' | 'other';
  muscleGroup?: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'full_body';
  equipment?: string;
  videoUrl?: string;
  instructions?: string;
  isPublic?: boolean; // Only for admins
}

// Paginated response
export interface PaginatedExercises {
  exercises: Exercise[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type { Exercise, NewExercise };

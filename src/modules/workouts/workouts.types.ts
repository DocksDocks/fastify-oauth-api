/**
 * Workout Module Type Definitions
 */

import type { Workout, NewWorkout } from '@/db/schema/workouts';
import type { WorkoutExercise, NewWorkoutExercise } from '@/db/schema/workout-exercises';
import type { WorkoutShare, NewWorkoutShare } from '@/db/schema/workout-shares';

// ============================================================================
// Query Types
// ============================================================================

export interface ListWorkoutsQuery {
  isTemplate?: boolean;
  isPublic?: boolean;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  search?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Request Body Types
// ============================================================================

export interface CreateWorkoutBody {
  name: string;
  description?: string;
  isTemplate?: boolean;
  isPublic?: boolean;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  duration?: number;
  tags?: string[];
  exercises?: CreateWorkoutExerciseBody[];
}

export interface UpdateWorkoutBody {
  name?: string;
  description?: string;
  isTemplate?: boolean;
  isPublic?: boolean;
  isLocked?: boolean;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  duration?: number;
  tags?: string[];
}

export interface CreateWorkoutExerciseBody {
  exerciseId: number;
  orderIndex: number;
  sets?: number;
  reps?: number;
  weight?: string; // Decimal as string
  restSeconds?: number;
  notes?: string;
}

export interface UpdateWorkoutExerciseBody {
  sets?: number;
  reps?: number;
  weight?: string;
  restSeconds?: number;
  notes?: string;
  orderIndex?: number;
}

export interface ShareWorkoutBody {
  sharedWithId: number;
  permission?: 'view' | 'copy';
}

// ============================================================================
// Response Types
// ============================================================================

export interface WorkoutWithDetails extends Workout {
  exercises: WorkoutExerciseWithDetails[];
  owner: {
    id: number;
    name: string | null;
    email: string;
  };
  isSharedWithMe?: boolean;
  sharePermission?: 'view' | 'copy';
}

export interface WorkoutExerciseWithDetails extends WorkoutExercise {
  exercise: {
    id: number;
    code: string;
    name: string;
    description: string | null;
    category: string;
    muscleGroup: string;
    equipment: string | null;
    videoUrl: string | null;
    isPublic: boolean;
    createdBy: number | null;
  };
}

export interface PaginatedWorkouts {
  workouts: WorkoutWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface WorkoutShareWithDetails extends WorkoutShare {
  workout: {
    id: number;
    name: string;
    description: string | null;
  };
  sharedBy: {
    id: number;
    name: string | null;
    email: string;
  };
  sharedWith: {
    id: number;
    name: string | null;
    email: string;
  };
}

// Re-export schema types
export type { Workout, NewWorkout, WorkoutExercise, NewWorkoutExercise, WorkoutShare, NewWorkoutShare };

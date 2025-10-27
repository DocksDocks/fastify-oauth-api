/**
 * Workout Sessions Module Type Definitions
 */

import type { WorkoutLog, NewWorkoutLog } from '@/db/schema/workout-logs';
import type { SetLog, NewSetLog } from '@/db/schema/set-logs';
import type { Workout } from '@/db/schema/workouts';
import type { Exercise } from '@/db/schema/exercises';
import type { WorkoutExercise } from '@/db/schema/workout-exercises';

// ============================================================================
// Set Type Enum
// ============================================================================

export type SetType = 'warmup' | 'prep' | 'working';
export type SessionStatus = 'in_progress' | 'completed' | 'abandoned';
export type SessionType = 'live' | 'manual';

// ============================================================================
// Query Types
// ============================================================================

export interface ListSessionsQuery {
  status?: SessionStatus;
  sessionType?: SessionType;
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  page?: number;
  limit?: number;
}

// ============================================================================
// Request Body Types
// ============================================================================

export interface StartSessionBody {
  workoutId: number;
  startedAt?: string; // ISO date string, defaults to now
  bodyweight?: string; // Decimal as string
}

export interface LogSetBody {
  exerciseId: number;
  setType: SetType;
  setNumberWithinType: number; // 1st warmup, 2nd warmup, etc.
  reps: number;
  weight?: string; // Decimal as string, NULL for bodyweight exercises
  rpe?: number; // Rate of Perceived Exertion (1-10)
  restSeconds?: number; // Actual rest taken
  notes?: string;
  isFailure?: boolean; // Did set go to failure?
}

export interface CompleteSessionBody {
  completedAt?: string; // ISO date string, defaults to now
  durationMinutes?: number;
  rating?: number; // 1-5 stars
  notes?: string;
}

export interface ManualSessionSetInput {
  setType: SetType;
  setNumberWithinType: number;
  reps: number;
  weight?: string; // Decimal as string
  rpe?: number;
  notes?: string;
  isFailure?: boolean;
}

export interface ManualSessionExerciseInput {
  exerciseId: number;
  sets: ManualSessionSetInput[];
}

export interface CreateManualSessionBody {
  workoutId?: number; // Optional for ad-hoc workouts
  workoutName?: string; // For ad-hoc workouts without template
  performedAt: string; // ISO date string, user-specified
  durationMinutes?: number;
  bodyweight?: string; // Decimal as string
  rating?: number; // 1-5 stars
  notes?: string;
  exercises: ManualSessionExerciseInput[];
}

// ============================================================================
// Response Types
// ============================================================================

export interface WorkoutLogWithDetails extends WorkoutLog {
  workout?: {
    id: number;
    name: string;
    description: string | null;
  };
  sets: SetLogWithDetails[];
  stats: {
    totalSets: number;
    totalReps: number;
    totalVolume: number; // sum of (reps * weight)
    exercisesCompleted: number;
  };
}

export interface SetLogWithDetails extends SetLog {
  exercise: {
    id: number;
    code: string;
    name: string;
    muscleGroup: string;
  };
}

export interface SessionExerciseInfo {
  exercise: Exercise;
  config: WorkoutExercise;
  completedSets: SetLogWithDetails[];
  nextSetInfo?: {
    setType: SetType;
    setNumberWithinType: number;
    suggestedRestSeconds: number;
  };
}

export interface SessionWithExercises extends WorkoutLog {
  workout?: Workout;
  exercises: SessionExerciseInfo[];
}

export interface PaginatedSessions {
  sessions: WorkoutLogWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Re-export schema types
export type { WorkoutLog, NewWorkoutLog, SetLog, NewSetLog };

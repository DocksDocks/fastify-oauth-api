import { describe, it, expect, beforeEach } from 'vitest';
import { WorkoutsService } from '@/modules/workouts/workouts.service';
import {
  createUser,
  createExercise,
  createWorkout,
  createWorkoutExercise,
  createWorkoutShare,
} from '../helper/factories';
import { BadRequestError, NotFoundError, ForbiddenError } from '@/utils/errors';

describe('WorkoutsService', () => {
  let workoutsService: WorkoutsService;

  beforeEach(() => {
    workoutsService = new WorkoutsService();
  });

  describe('listWorkouts', () => {
    it('should list own workouts', async () => {
      const user = await createUser();
      const otherUser = await createUser({ email: 'other@test.com' });

      await createWorkout({ name: 'My Workout', ownerId: user.id });
      await createWorkout({ name: 'Other Workout', ownerId: otherUser.id });

      const result = await workoutsService.listWorkouts({}, user.id);

      expect(result.workouts).toHaveLength(1);
      expect(result.workouts[0].name).toBe('My Workout');
    });

    it('should list shared workouts', async () => {
      const owner = await createUser({ email: 'owner@test.com' });
      const sharedUser = await createUser({ email: 'shared@test.com' });

      const workout = await createWorkout({ name: 'Shared Workout', ownerId: owner.id });
      await createWorkoutShare({
        workoutId: workout.id,
        sharedById: owner.id,
        sharedWithId: sharedUser.id,
      });

      const result = await workoutsService.listWorkouts({}, sharedUser.id);

      expect(result.workouts).toHaveLength(1);
      expect(result.workouts[0].name).toBe('Shared Workout');
      expect(result.workouts[0].isSharedWithMe).toBe(true);
    });

    it('should filter by search term', async () => {
      const user = await createUser();
      await createWorkout({ name: 'Push Workout', ownerId: user.id });
      await createWorkout({ name: 'Pull Workout', ownerId: user.id });

      const result = await workoutsService.listWorkouts({ search: 'push' }, user.id);

      expect(result.workouts).toHaveLength(1);
      expect(result.workouts[0].name).toBe('Push Workout');
    });

    it('should filter by difficulty', async () => {
      const user = await createUser();
      await createWorkout({ name: 'Easy', ownerId: user.id, difficulty: 'beginner' });
      await createWorkout({ name: 'Hard', ownerId: user.id, difficulty: 'advanced' });

      const result = await workoutsService.listWorkouts({ difficulty: 'beginner' }, user.id);

      expect(result.workouts).toHaveLength(1);
      expect(result.workouts[0].difficulty).toBe('beginner');
    });

    it('should filter by template status', async () => {
      const user = await createUser();
      await createWorkout({ name: 'Template', ownerId: user.id, isTemplate: true });
      await createWorkout({ name: 'Regular', ownerId: user.id, isTemplate: false });

      const result = await workoutsService.listWorkouts({ isTemplate: true }, user.id);

      expect(result.workouts).toHaveLength(1);
      expect(result.workouts[0].isTemplate).toBe(true);
    });

    it('should paginate results', async () => {
      const user = await createUser();
      for (let i = 0; i < 5; i++) {
        await createWorkout({ name: `Workout ${i}`, ownerId: user.id });
      }

      const page1 = await workoutsService.listWorkouts({ page: 1, limit: 2 }, user.id);
      const page2 = await workoutsService.listWorkouts({ page: 2, limit: 2 }, user.id);

      expect(page1.workouts).toHaveLength(2);
      expect(page2.workouts).toHaveLength(2);
      expect(page1.pagination.totalPages).toBe(3);
    });
  });

  describe('getSharedWorkouts', () => {
    it('should list workouts shared with user', async () => {
      const owner = await createUser({ email: 'owner@test.com' });
      const sharedUser = await createUser({ email: 'shared@test.com' });

      const workout = await createWorkout({ ownerId: owner.id });
      await createWorkoutShare({
        workoutId: workout.id,
        sharedById: owner.id,
        sharedWithId: sharedUser.id,
        permission: 'view',
      });

      const shares = await workoutsService.getSharedWorkouts(sharedUser.id);

      expect(shares).toHaveLength(1);
      expect(shares[0].workout.id).toBe(workout.id);
      expect(shares[0].permission).toBe('view');
    });
  });

  describe('getWorkoutById', () => {
    it('should get own workout', async () => {
      const user = await createUser();
      const exercise = await createExercise();
      const workout = await createWorkout({ ownerId: user.id });
      await createWorkoutExercise({ workoutId: workout.id, exerciseId: exercise.id });

      const result = await workoutsService.getWorkoutById(workout.id, user.id);

      expect(result.id).toBe(workout.id);
      expect(result.exercises).toHaveLength(1);
      expect(result.isSharedWithMe).toBe(false);
    });

    it('should get shared workout', async () => {
      const owner = await createUser({ email: 'owner@test.com' });
      const sharedUser = await createUser({ email: 'shared@test.com' });

      const workout = await createWorkout({ ownerId: owner.id });
      await createWorkoutShare({
        workoutId: workout.id,
        sharedById: owner.id,
        sharedWithId: sharedUser.id,
        permission: 'view',
      });

      const result = await workoutsService.getWorkoutById(workout.id, sharedUser.id);

      expect(result.id).toBe(workout.id);
      expect(result.isSharedWithMe).toBe(true);
      expect(result.sharePermission).toBe('view');
    });

    it('should throw NotFoundError for non-existent workout', async () => {
      const user = await createUser();

      await expect(workoutsService.getWorkoutById(99999, user.id)).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when accessing others workout', async () => {
      const owner = await createUser();
      const otherUser = await createUser({ email: 'other@test.com' });

      const workout = await createWorkout({ ownerId: owner.id });

      await expect(workoutsService.getWorkoutById(workout.id, otherUser.id)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('createWorkout', () => {
    it('should create workout without exercises', async () => {
      const user = await createUser();

      const workout = await workoutsService.createWorkout(
        {
          name: 'New Workout',
          description: 'Test workout',
          difficulty: 'intermediate',
        },
        user.id
      );

      expect(workout.name).toBe('New Workout');
      expect(workout.ownerId).toBe(user.id);
      expect(workout.exercises).toHaveLength(0);
    });

    it('should create workout with exercises', async () => {
      const user = await createUser();
      const exercise1 = await createExercise({ code: 'EX1' });
      const exercise2 = await createExercise({ code: 'EX2' });

      const workout = await workoutsService.createWorkout(
        {
          name: 'New Workout',
          description: 'Test workout',
          exercises: [
            { exerciseId: exercise1.id, orderIndex: 1, sets: 3, reps: 10 },
            { exerciseId: exercise2.id, orderIndex: 2, sets: 4, reps: 8 },
          ],
        },
        user.id
      );

      expect(workout.exercises).toHaveLength(2);
      expect(workout.exercises[0].exerciseId).toBe(exercise1.id);
    });
  });

  describe('updateWorkout', () => {
    it('should update own workout', async () => {
      const user = await createUser();
      const workout = await createWorkout({ ownerId: user.id, name: 'Original' });

      const updated = await workoutsService.updateWorkout(
        workout.id,
        { name: 'Updated' },
        user.id
      );

      expect(updated.name).toBe('Updated');
    });

    it('should throw ForbiddenError when updating others workout', async () => {
      const owner = await createUser();
      const otherUser = await createUser({ email: 'other@test.com' });
      const workout = await createWorkout({ ownerId: owner.id });

      await expect(
        workoutsService.updateWorkout(workout.id, { name: 'Hacked' }, otherUser.id)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError when updating shared workout without copy permission', async () => {
      const owner = await createUser({ email: 'owner@test.com' });
      const sharedUser = await createUser({ email: 'shared@test.com' });

      const workout = await createWorkout({ ownerId: owner.id });
      await createWorkoutShare({
        workoutId: workout.id,
        sharedById: owner.id,
        sharedWithId: sharedUser.id,
        permission: 'view',
      });

      await expect(
        workoutsService.updateWorkout(workout.id, { name: 'Hacked' }, sharedUser.id)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('deleteWorkout', () => {
    it('should delete own workout', async () => {
      const user = await createUser();
      const workout = await createWorkout({ ownerId: user.id });

      await workoutsService.deleteWorkout(workout.id, user.id);

      await expect(workoutsService.getWorkoutById(workout.id, user.id)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw ForbiddenError when deleting others workout', async () => {
      const owner = await createUser();
      const otherUser = await createUser({ email: 'other@test.com' });
      const workout = await createWorkout({ ownerId: owner.id });

      await expect(workoutsService.deleteWorkout(workout.id, otherUser.id)).rejects.toThrow(
        ForbiddenError
      );
    });
  });

  describe('addExercisesToWorkout', () => {
    it('should add exercises to workout', async () => {
      const user = await createUser();
      const workout = await createWorkout({ ownerId: user.id });
      const exercise = await createExercise();

      await workoutsService.addExercisesToWorkout(
        workout.id,
        [{ exerciseId: exercise.id, orderIndex: 1, sets: 3, reps: 10 }],
        user.id
      );

      const updated = await workoutsService.getWorkoutById(workout.id, user.id);
      expect(updated.exercises).toHaveLength(1);
    });

    it('should throw ForbiddenError when adding exercises to others workout', async () => {
      const owner = await createUser();
      const otherUser = await createUser({ email: 'other@test.com' });
      const workout = await createWorkout({ ownerId: owner.id });
      const exercise = await createExercise();

      await expect(
        workoutsService.addExercisesToWorkout(
          workout.id,
          [{ exerciseId: exercise.id, orderIndex: 1, sets: 3, reps: 10 }],
          otherUser.id
        )
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('removeExerciseFromWorkout', () => {
    it('should remove exercise from workout', async () => {
      const user = await createUser();
      const workout = await createWorkout({ ownerId: user.id });
      const exercise = await createExercise();
      await createWorkoutExercise({ workoutId: workout.id, exerciseId: exercise.id });

      await workoutsService.removeExerciseFromWorkout(workout.id, exercise.id, user.id);

      const updated = await workoutsService.getWorkoutById(workout.id, user.id);
      expect(updated.exercises).toHaveLength(0);
    });
  });

  describe('shareWorkout', () => {
    it('should share workout with another user', async () => {
      const owner = await createUser({ email: 'owner@test.com' });
      const shareWith = await createUser({ email: 'share@test.com' });
      const workout = await createWorkout({ ownerId: owner.id });

      const share = await workoutsService.shareWorkout(
        workout.id,
        { sharedWithId: shareWith.id, permission: 'view' },
        owner.id
      );

      expect(share.sharedWithId).toBe(shareWith.id);
      expect(share.permission).toBe('view');
    });

    it('should throw ForbiddenError when sharing others workout', async () => {
      const owner = await createUser({ email: 'owner@test.com' });
      const otherUser = await createUser({ email: 'other@test.com' });
      const shareWith = await createUser({ email: 'share@test.com' });
      const workout = await createWorkout({ ownerId: owner.id });

      await expect(
        workoutsService.shareWorkout(
          workout.id,
          { sharedWithId: shareWith.id, permission: 'view' },
          otherUser.id
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw BadRequestError when sharing with self', async () => {
      const user = await createUser();
      const workout = await createWorkout({ ownerId: user.id });

      await expect(
        workoutsService.shareWorkout(
          workout.id,
          { sharedWithId: user.id, permission: 'view' },
          user.id
        )
      ).rejects.toThrow(BadRequestError);
    });

    it('should update existing share permission', async () => {
      const owner = await createUser({ email: 'owner@test.com' });
      const shareWith = await createUser({ email: 'share@test.com' });
      const workout = await createWorkout({ ownerId: owner.id });

      await createWorkoutShare({
        workoutId: workout.id,
        sharedById: owner.id,
        sharedWithId: shareWith.id,
        permission: 'view',
      });

      const updated = await workoutsService.shareWorkout(
        workout.id,
        { sharedWithId: shareWith.id, permission: 'copy' },
        owner.id
      );

      expect(updated.permission).toBe('copy');
    });
  });

  describe('unshareWorkout', () => {
    it('should unshare workout', async () => {
      const owner = await createUser({ email: 'owner@test.com' });
      const shareWith = await createUser({ email: 'share@test.com' });
      const workout = await createWorkout({ ownerId: owner.id });

      await createWorkoutShare({
        workoutId: workout.id,
        sharedById: owner.id,
        sharedWithId: shareWith.id,
      });

      await workoutsService.unshareWorkout(workout.id, shareWith.id, owner.id);

      const shares = await workoutsService.getSharedWorkouts(shareWith.id);
      expect(shares).toHaveLength(0);
    });

    it('should throw ForbiddenError when unsharing others workout', async () => {
      const owner = await createUser({ email: 'owner@test.com' });
      const otherUser = await createUser({ email: 'other@test.com' });
      const shareWith = await createUser({ email: 'share@test.com' });
      const workout = await createWorkout({ ownerId: owner.id });

      await createWorkoutShare({
        workoutId: workout.id,
        sharedById: owner.id,
        sharedWithId: shareWith.id,
      });

      await expect(
        workoutsService.unshareWorkout(workout.id, shareWith.id, otherUser.id)
      ).rejects.toThrow(ForbiddenError);
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { ExercisesService } from '@/modules/exercises/exercises.service';
import { createUser, createExercise, createWorkout, createWorkoutExercise, createWorkoutShare } from '../helper/factories';
import { BadRequestError, NotFoundError, ForbiddenError } from '@/utils/errors';

describe('ExercisesService', () => {
  let exercisesService: ExercisesService;

  beforeEach(() => {
    exercisesService = new ExercisesService();
  });

  describe('listExercises', () => {
    it('should list public exercises for unauthenticated users', async () => {
      const publicExercise = await createExercise({
        code: 'PUBLIC_EX',
        name: 'Public Exercise',
        isPublic: true,
        createdBy: null,
      });

      const user = await createUser();
      await createExercise({
        code: 'CUSTOM_EX',
        name: 'Custom Exercise',
        isPublic: false,
        createdBy: user.id,
      });

      const result = await exercisesService.listExercises({});

      expect(result.exercises).toHaveLength(1);
      expect(result.exercises[0].code).toBe('PUBLIC_EX');
    });

    it('should list public and own custom exercises for authenticated users', async () => {
      const user = await createUser();

      await createExercise({
        code: 'PUBLIC_EX',
        name: 'Public Exercise',
        isPublic: true,
      });

      await createExercise({
        code: 'MY_CUSTOM_EX',
        name: 'My Custom Exercise',
        isPublic: false,
        createdBy: user.id,
      });

      const otherUser = await createUser({ email: 'other@test.com' });
      await createExercise({
        code: 'OTHER_CUSTOM_EX',
        name: 'Other Custom Exercise',
        isPublic: false,
        createdBy: otherUser.id,
      });

      const result = await exercisesService.listExercises({}, user.id);

      expect(result.exercises).toHaveLength(2);
      expect(result.exercises.map(e => e.code).sort()).toEqual(['MY_CUSTOM_EX', 'PUBLIC_EX']);
    });

    it('should include exercises from shared workouts', async () => {
      const owner = await createUser({ email: 'owner@test.com' });
      const sharedUser = await createUser({ email: 'shared@test.com' });

      const sharedExercise = await createExercise({
        code: 'SHARED_EX',
        isPublic: false,
        createdBy: owner.id,
      });

      const workout = await createWorkout({ ownerId: owner.id });
      await createWorkoutExercise({ workoutId: workout.id, exerciseId: sharedExercise.id });
      await createWorkoutShare({
        workoutId: workout.id,
        sharedById: owner.id,
        sharedWithId: sharedUser.id,
      });

      const result = await exercisesService.listExercises({}, sharedUser.id);

      expect(result.exercises).toHaveLength(1);
      expect(result.exercises[0].code).toBe('SHARED_EX');
    });

    it('should filter by search term', async () => {
      await createExercise({ code: 'BENCH_PRESS', name: 'Bench Press' });
      await createExercise({ code: 'SQUAT', name: 'Squat' });

      const result = await exercisesService.listExercises({ search: 'bench' });

      expect(result.exercises).toHaveLength(1);
      expect(result.exercises[0].code).toBe('BENCH_PRESS');
    });

    it('should filter by category', async () => {
      await createExercise({ code: 'STRENGTH_EX', category: 'strength' });
      await createExercise({ code: 'CARDIO_EX', category: 'cardio' });

      const result = await exercisesService.listExercises({ category: 'strength' });

      expect(result.exercises).toHaveLength(1);
      expect(result.exercises[0].code).toBe('STRENGTH_EX');
    });

    it('should filter by muscle group', async () => {
      await createExercise({ code: 'CHEST_EX', muscleGroup: 'chest' });
      await createExercise({ code: 'BACK_EX', muscleGroup: 'back' });

      const result = await exercisesService.listExercises({ muscleGroup: 'chest' });

      expect(result.exercises).toHaveLength(1);
      expect(result.exercises[0].code).toBe('CHEST_EX');
    });

    it('should paginate results', async () => {
      for (let i = 0; i < 5; i++) {
        await createExercise({ code: `EX_${i}`, name: `Exercise ${i}` });
      }

      const page1 = await exercisesService.listExercises({ page: 1, limit: 2 });
      const page2 = await exercisesService.listExercises({ page: 2, limit: 2 });

      expect(page1.exercises).toHaveLength(2);
      expect(page2.exercises).toHaveLength(2);
      expect(page1.pagination.page).toBe(1);
      expect(page1.pagination.totalPages).toBe(3);
      expect(page1.pagination.total).toBe(5);
    });
  });

  describe('getExerciseByCode', () => {
    it('should get public exercise by code', async () => {
      const exercise = await createExercise({ code: 'TEST_CODE', isPublic: true });

      const result = await exercisesService.getExerciseByCode('TEST_CODE');

      expect(result.id).toBe(exercise.id);
      expect(result.code).toBe('TEST_CODE');
    });

    it('should get own custom exercise by code', async () => {
      const user = await createUser();
      const exercise = await createExercise({
        code: 'CUSTOM_CODE',
        isPublic: false,
        createdBy: user.id,
      });

      const result = await exercisesService.getExerciseByCode('CUSTOM_CODE', user.id);

      expect(result.id).toBe(exercise.id);
    });

    it('should throw NotFoundError for non-existent exercise', async () => {
      await expect(exercisesService.getExerciseByCode('NON_EXISTENT')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw NotFoundError for other users custom exercise', async () => {
      const owner = await createUser();
      const otherUser = await createUser({ email: 'other@test.com' });

      await createExercise({
        code: 'PRIVATE_CODE',
        isPublic: false,
        createdBy: owner.id,
      });

      await expect(
        exercisesService.getExerciseByCode('PRIVATE_CODE', otherUser.id)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getExerciseById', () => {
    it('should get public exercise by ID', async () => {
      const exercise = await createExercise({ isPublic: true });

      const result = await exercisesService.getExerciseById(exercise.id);

      expect(result.id).toBe(exercise.id);
    });

    it('should get own custom exercise by ID', async () => {
      const user = await createUser();
      const exercise = await createExercise({ isPublic: false, createdBy: user.id });

      const result = await exercisesService.getExerciseById(exercise.id, user.id);

      expect(result.id).toBe(exercise.id);
    });

    it('should throw NotFoundError for non-existent exercise', async () => {
      await expect(exercisesService.getExerciseById(99999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('createCustomExercise', () => {
    it('should create custom exercise for authenticated user', async () => {
      const user = await createUser();

      const exercise = await exercisesService.createCustomExercise(
        {
          code: 'NEW_CUSTOM',
          name: 'New Custom Exercise',
          description: 'Test description',
          category: 'strength',
          muscleGroup: 'chest',
          equipment: 'Barbell',
        },
        user.id
      );

      expect(exercise.code).toBe('NEW_CUSTOM');
      expect(exercise.createdBy).toBe(user.id);
      expect(exercise.isPublic).toBe(false);
    });

    it('should throw BadRequestError for duplicate code', async () => {
      const user = await createUser();
      await createExercise({ code: 'DUPLICATE', createdBy: user.id });

      await expect(
        exercisesService.createCustomExercise(
          {
            code: 'DUPLICATE',
            name: 'Duplicate Exercise',
            description: 'Test',
            category: 'strength',
            muscleGroup: 'chest',
            equipment: 'Barbell',
          },
          user.id
        )
      ).rejects.toThrow(BadRequestError);
    });

    it('should validate video URL domain', async () => {
      const user = await createUser();

      await expect(
        exercisesService.createCustomExercise(
          {
            code: 'BAD_VIDEO',
            name: 'Bad Video',
            description: 'Test',
            category: 'strength',
            muscleGroup: 'chest',
            equipment: 'Barbell',
            videoUrl: 'http://evil.com/video.mp4',
          },
          user.id
        )
      ).rejects.toThrow(BadRequestError);
    });

    it('should accept valid YouTube video URL', async () => {
      const user = await createUser();

      const exercise = await exercisesService.createCustomExercise(
        {
          code: 'YOUTUBE_EX',
          name: 'YouTube Exercise',
          description: 'Test',
          category: 'strength',
          muscleGroup: 'chest',
          equipment: 'Barbell',
          videoUrl: 'https://www.youtube.com/watch?v=test',
        },
        user.id
      );

      expect(exercise.videoUrl).toBe('https://www.youtube.com/watch?v=test');
    });

    it('should accept valid Vimeo video URL', async () => {
      const user = await createUser();

      const exercise = await exercisesService.createCustomExercise(
        {
          code: 'VIMEO_EX',
          name: 'Vimeo Exercise',
          description: 'Test',
          category: 'strength',
          muscleGroup: 'chest',
          equipment: 'Barbell',
          videoUrl: 'https://vimeo.com/123456789',
        },
        user.id
      );

      expect(exercise.videoUrl).toBe('https://vimeo.com/123456789');
    });
  });

  describe('createSystemExercise', () => {
    it('should create system exercise (public)', async () => {
      const exercise = await exercisesService.createSystemExercise({
        code: 'SYSTEM_EX',
        name: 'System Exercise',
        description: 'Test',
        category: 'strength',
        muscleGroup: 'chest',
        equipment: 'Barbell',
      });

      expect(exercise.code).toBe('SYSTEM_EX');
      expect(exercise.createdBy).toBeNull();
      expect(exercise.isPublic).toBe(true);
    });

    it('should throw BadRequestError for duplicate code', async () => {
      await createExercise({ code: 'DUPLICATE_SYS' });

      await expect(
        exercisesService.createSystemExercise({
          code: 'DUPLICATE_SYS',
          name: 'Duplicate System',
          description: 'Test',
          category: 'strength',
          muscleGroup: 'chest',
          equipment: 'Barbell',
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('updateExercise', () => {
    it('should update own custom exercise', async () => {
      const user = await createUser();
      const exercise = await createExercise({ createdBy: user.id, name: 'Original Name' });

      const updated = await exercisesService.updateExercise(
        exercise.id,
        { name: 'Updated Name' },
        user.id
      );

      expect(updated.name).toBe('Updated Name');
    });

    it('should throw ForbiddenError when updating other users exercise', async () => {
      const owner = await createUser();
      const otherUser = await createUser({ email: 'other@test.com' });
      const exercise = await createExercise({ createdBy: owner.id });

      await expect(
        exercisesService.updateExercise(exercise.id, { name: 'Hacked' }, otherUser.id)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError when updating system exercise', async () => {
      const user = await createUser();
      const exercise = await createExercise({ createdBy: null, isPublic: true });

      await expect(
        exercisesService.updateExercise(exercise.id, { name: 'Hacked' }, user.id)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('deleteExercise', () => {
    it('should delete own custom exercise', async () => {
      const user = await createUser();
      const exercise = await createExercise({ createdBy: user.id });

      await exercisesService.deleteExercise(exercise.id, user.id);

      await expect(exercisesService.getExerciseById(exercise.id)).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when deleting other users exercise', async () => {
      const owner = await createUser();
      const otherUser = await createUser({ email: 'other@test.com' });
      const exercise = await createExercise({ createdBy: owner.id });

      await expect(exercisesService.deleteExercise(exercise.id, otherUser.id)).rejects.toThrow(
        ForbiddenError
      );
    });

    it('should throw ForbiddenError when deleting system exercise', async () => {
      const user = await createUser();
      const exercise = await createExercise({ createdBy: null, isPublic: true });

      await expect(exercisesService.deleteExercise(exercise.id, user.id)).rejects.toThrow(
        ForbiddenError
      );
    });

    it('should throw NotFoundError for non-existent exercise', async () => {
      const user = await createUser();

      await expect(exercisesService.deleteExercise(99999, user.id)).rejects.toThrow(
        NotFoundError
      );
    });
  });
});

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { exercises } from '@/db/schema/exercises';

// Interface for exercise JSON data
interface ExerciseJSON {
  code: string;
  name: string;
  description: string | null;
  category: 'strength' | 'cardio' | 'flexibility' | 'other';
  muscleGroup: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'full_body';
  equipment: string | null;
  videoUrl: string | null;
  instructions: string | null;
}

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read exercises from JSON file
const exercisesDataPath = join(__dirname, 'data', 'exercises.json');
const exercisesData: ExerciseJSON[] = JSON.parse(readFileSync(exercisesDataPath, 'utf-8'));

export async function seedExercises(): Promise<void> {
  try {
    console.log('🏋️  Seeding system exercises from JSON...');

    // Validate unique codes
    const codes = exercisesData.map((ex) => ex.code);
    const uniqueCodes = new Set(codes);

    if (codes.length !== uniqueCodes.size) {
      throw new Error('Duplicate exercise codes found in JSON file!');
    }

    console.log(`   Found ${exercisesData.length} exercises in JSON file`);
    console.log(`   All codes are unique ✓`);

    // Insert or update exercises (createdBy is null for system exercises)
    // Use onConflictDoUpdate to make seeding idempotent
    const insertedExercises = await db.insert(exercises).values(
      exercisesData.map((exercise) => ({
        code: exercise.code,
        name: exercise.name,
        description: exercise.description,
        category: exercise.category,
        muscleGroup: exercise.muscleGroup,
        equipment: exercise.equipment,
        videoUrl: exercise.videoUrl,
        instructions: exercise.instructions,
        createdBy: null, // System exercises have no creator
        isPublic: true, // All system exercises are public
      }))
    ).onConflictDoUpdate({
      target: exercises.code,
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        category: sql`excluded.category`,
        muscleGroup: sql`excluded.muscle_group`,
        equipment: sql`excluded.equipment`,
        videoUrl: sql`excluded.video_url`,
        instructions: sql`excluded.instructions`,
        updatedAt: new Date(),
      }
    }).returning();

    console.log(`✓ Successfully seeded ${insertedExercises.length} system exercises`);
    console.log('\nExercises by muscle group:');

    const grouped = insertedExercises.reduce((acc, ex) => {
      acc[ex.muscleGroup] = (acc[ex.muscleGroup] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(grouped).forEach(([group, count]) => {
      console.log(`  ${group}: ${count} exercises`);
    });

    console.log('\nExercises by category:');
    const byCategory = insertedExercises.reduce((acc, ex) => {
      acc[ex.category] = (acc[ex.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(byCategory).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} exercises`);
    });
  } catch (error) {
    console.error('❌ Error seeding exercises:', error);
    throw error; // Re-throw to let parent handler deal with it
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedExercises().then(() => {
    console.log('\n✅ Exercise seeding complete!');
    process.exit(0);
  }).catch((error) => {
    console.error('\n❌ Exercise seeding failed:', error);
    process.exit(1);
  });
}

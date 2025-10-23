import { describe, it, expect } from 'vitest';
import {
  collections,
  getCollectionByTable,
  getAvailableCollections,
  getTableMap,
  type Collection,
  type CollectionColumn,
} from '@/config/collections';
import * as schema from '@/db/schema';

/**
 * Comprehensive test suite for collections configuration
 * Tests both utility functions and integration with real database schema
 */

describe('Collections Configuration', () => {
  /**
   * Integration Tests - Real Schema (Modular)
   * These tests automatically work with any table added to the schema
   */
  describe('Integration Tests - Real Schema', () => {
    it('should generate collections from real database schema', () => {
      expect(collections).toBeDefined();
      expect(Array.isArray(collections)).toBe(true);
      expect(collections.length).toBeGreaterThan(0);
    });

    it('should generate collections for all non-excluded tables', () => {
      // Verify we have at least the main tables
      const tableNames = collections.map((c) => c.table);

      expect(tableNames).toContain('users');
      expect(tableNames).toContain('exercises');
      expect(tableNames).toContain('workouts');
    });

    it('should exclude internal system tables', () => {
      const tableNames = collections.map((c) => c.table);

      // These should never appear in collections
      expect(tableNames).not.toContain('seed_status');
      expect(tableNames).not.toContain('refresh_tokens');
      expect(tableNames).not.toContain('api_keys');
    });

    it('should have valid structure for all collections', () => {
      collections.forEach((collection) => {
        // Required fields
        expect(collection).toHaveProperty('name');
        expect(collection).toHaveProperty('table');
        expect(collection).toHaveProperty('columns');
        expect(collection).toHaveProperty('defaultSort');
        expect(collection).toHaveProperty('defaultLimit');

        // Name should be Title Case
        expect(collection.name).toMatch(/^[A-Z]/);

        // Table should be snake_case or lowercase
        expect(collection.table).toMatch(/^[a-z_]+$/);

        // Should have at least one column
        expect(collection.columns.length).toBeGreaterThan(0);

        // Default sort should be valid
        expect(collection.defaultSort).toHaveProperty('column');
        expect(collection.defaultSort).toHaveProperty('order');
        expect(['asc', 'desc']).toContain(collection.defaultSort?.order);

        // Default limit should be positive number
        expect(collection.defaultLimit).toBeGreaterThan(0);
      });
    });

    it('should have valid column structure for all columns', () => {
      collections.forEach((collection) => {
        collection.columns.forEach((column) => {
          // Required fields
          expect(column).toHaveProperty('name');
          expect(column).toHaveProperty('label');
          expect(column).toHaveProperty('type');
          expect(column).toHaveProperty('sortable');
          expect(column).toHaveProperty('searchable');

          // Name should be valid identifier (camelCase or snake_case)
          expect(column.name).toMatch(/^[a-zA-Z_][a-zA-Z0-9_]*$/);

          // Label should not be empty
          expect(column.label.length).toBeGreaterThan(0);

          // Type should be valid
          expect(['text', 'number', 'date', 'timestamp', 'boolean', 'enum', 'json']).toContain(
            column.type
          );

          // Sortable and searchable should be booleans
          expect(typeof column.sortable).toBe('boolean');
          expect(typeof column.searchable).toBe('boolean');
        });
      });
    });

    it('should sort collections alphabetically by name', () => {
      const names = collections.map((c) => c.name);
      const sortedNames = [...names].sort((a, b) => a.localeCompare(b));

      expect(names).toEqual(sortedNames);
    });

    it('should have id column first in all collections', () => {
      collections.forEach((collection) => {
        const idColumn = collection.columns.find((c) => c.name === 'id');
        if (idColumn) {
          // If collection has id column, it should be first
          expect(collection.columns[0].name).toBe('id');
        }
      });
    });

    it('should have timestamps last in all collections', () => {
      const timestampNames = ['created_at', 'updated_at', 'deleted_at', 'revoked_at', 'last_login_at', 'createdAt', 'updatedAt', 'deletedAt', 'revokedAt', 'lastLoginAt'];

      collections.forEach((collection) => {
        const nonTimestampColumns = collection.columns.filter(
          (c) => !timestampNames.includes(c.name)
        );
        const timestampColumns = collection.columns.filter((c) =>
          timestampNames.includes(c.name)
        );

        if (timestampColumns.length > 0) {
          // Timestamps should appear after all non-timestamp columns
          const lastNonTimestampIndex = collection.columns.findIndex(
            (c) => c === nonTimestampColumns[nonTimestampColumns.length - 1]
          );
          const firstTimestampIndex = collection.columns.findIndex(
            (c) => c === timestampColumns[0]
          );

          if (lastNonTimestampIndex >= 0 && firstTimestampIndex >= 0) {
            expect(firstTimestampIndex).toBeGreaterThan(lastNonTimestampIndex);
          }
        }
      });
    });
  });

  /**
   * Specific Table Tests
   * Ensures critical tables have expected structure
   */
  describe('Specific Table Tests', () => {
    it('should correctly configure users collection', () => {
      const users = getCollectionByTable('users');

      expect(users).toBeDefined();
      expect(users?.name).toBe('Users');
      expect(users?.table).toBe('users');

      // Check specific columns
      const emailColumn = users?.columns.find((c) => c.name === 'email');
      expect(emailColumn).toMatchObject({
        type: 'text',
        searchable: true,
        sortable: true,
      });

      const roleColumn = users?.columns.find((c) => c.name === 'role');
      expect(roleColumn).toMatchObject({
        type: 'enum',
        sortable: true,
      });

      const idColumn = users?.columns.find((c) => c.name === 'id');
      expect(idColumn).toMatchObject({
        type: 'number',
        searchable: false,
        sortable: true,
      });
    });

    it('should correctly configure exercises collection', () => {
      const exercises = getCollectionByTable('exercises');

      expect(exercises).toBeDefined();
      expect(exercises?.name).toBe('Exercises');
      expect(exercises?.table).toBe('exercises');

      // Check specific columns
      const nameColumn = exercises?.columns.find((c) => c.name === 'name');
      expect(nameColumn).toMatchObject({
        type: 'text',
        searchable: true,
        sortable: true,
      });

      const codeColumn = exercises?.columns.find((c) => c.name === 'code');
      expect(codeColumn).toMatchObject({
        type: 'text',
        searchable: true,
        sortable: true,
      });

      const isPublicColumn = exercises?.columns.find((c) => c.name === 'isPublic');
      expect(isPublicColumn).toMatchObject({
        type: 'boolean',
        sortable: true,
      });
    });

    it('should correctly configure workouts collection', () => {
      const workouts = getCollectionByTable('workouts');

      expect(workouts).toBeDefined();
      expect(workouts?.name).toBe('Workouts');
      expect(workouts?.table).toBe('workouts');

      // Workouts should have ownerId foreign key
      const ownerIdColumn = workouts?.columns.find((c) => c.name === 'ownerId');
      expect(ownerIdColumn).toBeDefined();
      expect(ownerIdColumn?.type).toBe('number');
    });
  });

  /**
   * Helper Function Tests
   */
  describe('Helper Functions', () => {
    describe('getCollectionByTable', () => {
      it('should return collection for existing table', () => {
        const users = getCollectionByTable('users');
        expect(users).toBeDefined();
        expect(users?.table).toBe('users');
      });

      it('should return undefined for non-existent table', () => {
        const nonExistent = getCollectionByTable('non_existent_table');
        expect(nonExistent).toBeUndefined();
      });

      it('should return undefined for excluded tables', () => {
        const seedStatus = getCollectionByTable('seed_status');
        const refreshTokens = getCollectionByTable('refresh_tokens');
        const apiKeys = getCollectionByTable('api_keys');

        expect(seedStatus).toBeUndefined();
        expect(refreshTokens).toBeUndefined();
        expect(apiKeys).toBeUndefined();
      });
    });

    describe('getAvailableCollections', () => {
      it('should return list of all collections with name and table', () => {
        const available = getAvailableCollections();

        expect(Array.isArray(available)).toBe(true);
        expect(available.length).toBeGreaterThan(0);

        available.forEach((item) => {
          expect(item).toHaveProperty('name');
          expect(item).toHaveProperty('table');
          expect(typeof item.name).toBe('string');
          expect(typeof item.table).toBe('string');
        });
      });

      it('should match collections array length', () => {
        const available = getAvailableCollections();
        expect(available.length).toBe(collections.length);
      });
    });

    describe('getTableMap', () => {
      it('should return map of all non-excluded tables', () => {
        const tableMap = getTableMap();

        expect(typeof tableMap).toBe('object');
        expect(Object.keys(tableMap).length).toBeGreaterThan(0);

        // Should have main tables
        expect(tableMap).toHaveProperty('users');
        expect(tableMap).toHaveProperty('exercises');
        expect(tableMap).toHaveProperty('workouts');
      });

      it('should not include excluded tables in map', () => {
        const tableMap = getTableMap();

        expect(tableMap).not.toHaveProperty('seed_status');
        expect(tableMap).not.toHaveProperty('refresh_tokens');
        expect(tableMap).not.toHaveProperty('api_keys');
      });

      it('should return valid Drizzle table objects', () => {
        const tableMap = getTableMap();

        Object.values(tableMap).forEach((table) => {
          // Drizzle tables have getSQL method
          expect(table).toHaveProperty('getSQL');
          expect(typeof (table as any).getSQL).toBe('function');
        });
      });

      it('should match collections array length', () => {
        const tableMap = getTableMap();
        expect(Object.keys(tableMap).length).toBe(collections.length);
      });
    });
  });

  /**
   * Column Type Mapping Tests
   */
  describe('Column Type Mapping', () => {
    it('should map id columns to number type', () => {
      collections.forEach((collection) => {
        const idColumn = collection.columns.find((c) => c.name === 'id');
        if (idColumn) {
          expect(idColumn.type).toBe('number');
        }
      });
    });

    it('should map integer foreign key columns to number type', () => {
      collections.forEach((collection) => {
        // Only check integer foreign keys (excludes providerId which is varchar)
        const integerFkColumns = collection.columns.filter((c) =>
          (c.name.endsWith('_id') || c.name.endsWith('Id')) &&
          c.name !== 'providerId' // providerId is varchar, not integer
        );
        integerFkColumns.forEach((fk) => {
          expect(fk.type).toBe('number');
        });
      });
    });

    it('should map timestamp columns to date type', () => {
      const timestampColumns = ['created_at', 'updated_at', 'deleted_at', 'revoked_at', 'last_login_at', 'createdAt', 'updatedAt', 'deletedAt', 'revokedAt', 'lastLoginAt'];

      collections.forEach((collection) => {
        collection.columns
          .filter((c) => timestampColumns.includes(c.name))
          .forEach((col) => {
            // Drizzle's columnType returns 'date' for timestamp columns
            expect(col.type).toBe('date');
          });
      });
    });

    it('should map boolean columns correctly', () => {
      const booleanColumnNames = ['is_public', 'is_coach', 'is_revoked', 'is_used', 'isPublic', 'isCoach', 'isRevoked', 'isUsed', 'isTemplate', 'isLocked'];

      collections.forEach((collection) => {
        collection.columns
          .filter((c) => booleanColumnNames.includes(c.name))
          .forEach((col) => {
            expect(col.type).toBe('boolean');
          });
      });
    });

    it('should map enum columns correctly', () => {
      const users = getCollectionByTable('users');
      const roleColumn = users?.columns.find((c) => c.name === 'role');

      expect(roleColumn?.type).toBe('enum');
    });
  });

  /**
   * Searchability Tests
   */
  describe('Column Searchability', () => {
    it('should make text columns searchable except excluded patterns', () => {
      const excludedPatterns = ['id', '_id', 'created_at', 'updated_at', 'deleted_at'];

      collections.forEach((collection) => {
        collection.columns
          .filter((c) => c.type === 'text')
          .forEach((col) => {
            const shouldBeExcluded = excludedPatterns.some((pattern) =>
              col.name === pattern || col.name.endsWith(pattern)
            );

            if (shouldBeExcluded) {
              expect(col.searchable).toBe(false);
            } else {
              expect(col.searchable).toBe(true);
            }
          });
      });
    });

    it('should not make non-text columns searchable', () => {
      const nonTextTypes = ['number', 'date', 'timestamp', 'boolean', 'enum', 'json'];

      collections.forEach((collection) => {
        collection.columns
          .filter((c) => nonTextTypes.includes(c.type))
          .forEach((col) => {
            expect(col.searchable).toBe(false);
          });
      });
    });

    it('should not make id columns searchable', () => {
      collections.forEach((collection) => {
        const idColumn = collection.columns.find((c) => c.name === 'id');
        if (idColumn) {
          expect(idColumn.searchable).toBe(false);
        }
      });
    });

    it('should not make timestamp columns searchable', () => {
      const timestampNames = ['created_at', 'updated_at', 'deleted_at', 'revoked_at', 'createdAt', 'updatedAt', 'deletedAt', 'revokedAt', 'lastLoginAt'];

      collections.forEach((collection) => {
        collection.columns
          .filter((c) => timestampNames.includes(c.name))
          .forEach((col) => {
            expect(col.searchable).toBe(false);
          });
      });
    });
  });

  /**
   * Sortability Tests
   */
  describe('Column Sortability', () => {
    it('should make all columns sortable', () => {
      collections.forEach((collection) => {
        collection.columns.forEach((col) => {
          expect(col.sortable).toBe(true);
        });
      });
    });
  });

  /**
   * Default Sort Tests
   */
  describe('Default Sort Configuration', () => {
    it('should prefer created_at/createdAt desc for default sort', () => {
      collections.forEach((collection) => {
        const hasCreatedAt = collection.columns.some((c) => c.name === 'created_at' || c.name === 'createdAt');
        const hasPerformedAt = collection.columns.some((c) => c.name === 'performed_at' || c.name === 'performedAt');

        if (hasPerformedAt) {
          expect(['performed_at', 'performedAt']).toContain(collection.defaultSort?.column);
          expect(collection.defaultSort?.order).toBe('desc');
        } else if (hasCreatedAt) {
          expect(['created_at', 'createdAt']).toContain(collection.defaultSort?.column);
          expect(collection.defaultSort?.order).toBe('desc');
        }
      });
    });

    it('should use name asc if no timestamp columns', () => {
      collections.forEach((collection) => {
        const hasCreatedAt = collection.columns.some((c) => c.name === 'created_at' || c.name === 'createdAt');
        const hasPerformedAt = collection.columns.some((c) => c.name === 'performed_at' || c.name === 'performedAt');
        const hasName = collection.columns.some((c) => c.name === 'name');

        if (!hasPerformedAt && !hasCreatedAt && hasName) {
          expect(collection.defaultSort?.column).toBe('name');
          expect(collection.defaultSort?.order).toBe('asc');
        }
      });
    });

    it('should fallback to id desc if no other options', () => {
      collections.forEach((collection) => {
        const hasCreatedAt = collection.columns.some((c) => c.name === 'created_at' || c.name === 'createdAt');
        const hasPerformedAt = collection.columns.some((c) => c.name === 'performed_at' || c.name === 'performedAt');
        const hasName = collection.columns.some((c) => c.name === 'name');

        if (!hasPerformedAt && !hasCreatedAt && !hasName) {
          expect(collection.defaultSort?.column).toBe('id');
          expect(collection.defaultSort?.order).toBe('desc');
        }
      });
    });
  });

  /**
   * Edge Case Tests - Defensive Code Paths
   * Note: Lines 167-173 and 219-221 in collections.ts are defensive code paths
   * that cannot be reached with current Drizzle schema conventions:
   * - Lines 167-173: Handle snake_case timestamp names (Drizzle uses camelCase)
   * - Lines 219-221: Handle tables without createdAt (all tables have createdAt)
   * These are marked with v8 ignore comments as per project standards.
   */
  describe('Edge Case Tests', () => {
    it('should have valid default sort configuration for all collections', () => {
      collections.forEach((collection) => {
        // Verify defaultSort column exists in the collection
        const sortColumn = collection.columns.find((c) => c.name === collection.defaultSort?.column);
        expect(sortColumn).toBeDefined();

        // Verify sort order is valid
        expect(['asc', 'desc']).toContain(collection.defaultSort?.order);

        // Verify defaultSort column is sortable
        expect(sortColumn?.sortable).toBe(true);
      });
    });
  });

  /**
   * Label Formatting Tests
   */
  describe('Label Formatting', () => {
    it('should convert snake_case to Title Case', () => {
      collections.forEach((collection) => {
        collection.columns.forEach((col) => {
          // Label should start with capital letter
          expect(col.label).toMatch(/^[A-Z]/);

          // Should not contain underscores
          expect(col.label).not.toContain('_');

          // Examples of correct formatting
          if (col.name === 'user_id') {
            expect(col.label).toBe('User Id');
          }
          if (col.name === 'createdAt') {
            expect(col.label).toBe('Createdat');
          }
          if (col.name === 'isPublic') {
            expect(col.label).toBe('Ispublic');
          }
        });
      });
    });

    it('should handle single word column names', () => {
      collections.forEach((collection) => {
        collection.columns
          .filter((c) => !c.name.includes('_'))
          .forEach((col) => {
            // Single word should just be capitalized
            const expected = col.name.charAt(0).toUpperCase() + col.name.slice(1).toLowerCase();
            expect(col.label).toBe(expected);
          });
      });
    });
  });
});

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  validateCollectionDefinition,
  generateCreateTableSQL,
  checkNamingConflicts,
  getAllCollectionDefinitions,
  getCollectionDefinitionById,
  createCollectionDefinition,
  updateCollectionDefinition,
  deleteCollectionDefinition,
  type CollectionDefinitionInput,
} from '@/builder/services/collection-builder.service';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { collectionDefinitions } from '@/db/schema/collection-definitions';
import { users } from '@/db/schema/users';
import '../helper/setup';

/**
 * Collection Builder Service Test Suite
 * Tests validation, SQL generation, and CRUD operations for collection definitions
 */

describe('Collection Builder Service', () => {
  let testUserId: number;

  beforeEach(async () => {
    // Clear collections table
    await db.delete(collectionDefinitions);

    // Create test user
    const [user] = await db
      .insert(users)
      .values({
        email: `test-${Date.now()}@test.com`,
        name: 'Test User',
        role: 'superadmin',
        provider: 'google',
        providerId: `google-${Date.now()}`,
      })
      .returning();

    testUserId = user.id;

    // Clean up test tables before each test
    try {
      await db.execute(sql`DROP TABLE IF EXISTS blog_posts CASCADE`);
      await db.execute(sql`DROP TABLE IF EXISTS articles CASCADE`);
    } catch {
      // Ignore errors
    }
  });

  afterAll(async () => {
    // Final cleanup of any test tables
    try {
      await db.execute(sql`DROP TABLE IF EXISTS blog_posts CASCADE`);
      await db.execute(sql`DROP TABLE IF EXISTS articles CASCADE`);
    } catch {
      // Ignore errors
    }
  });

  describe('validateCollectionDefinition', () => {
    it('should validate a correct collection definition', () => {
      const definition: CollectionDefinitionInput = {
        name: 'blog_posts',
        apiName: 'blog_posts',
        displayName: 'Blog Posts',
        description: 'Blog post collection',
        icon: 'FileText',
        fields: [
          {
            name: 'title',
            type: 'text',
            label: 'Title',
            required: true,
          },
          {
            name: 'content',
            type: 'longtext',
            label: 'Content',
          },
        ],
        indexes: [],
        relationships: [],
      };

      const result = validateCollectionDefinition(definition);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid collection name', () => {
      const definition: CollectionDefinitionInput = {
        name: 'Blog Posts!', // Invalid: contains spaces and special chars
        apiName: 'blog_posts',
        displayName: 'Blog Posts',
        fields: [
          {
            name: 'title',
            type: 'text',
            label: 'Title',
          },
        ],
      };

      const result = validateCollectionDefinition(definition);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'name')).toBe(true);
    });

    it('should reject reserved collection names', () => {
      const definition: CollectionDefinitionInput = {
        name: 'users', // Reserved name
        apiName: 'users',
        displayName: 'Users',
        fields: [
          {
            name: 'title',
            type: 'text',
            label: 'Title',
          },
        ],
      };

      const result = validateCollectionDefinition(definition);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('reserved'))).toBe(true);
    });

    it('should reject invalid field names', () => {
      const definition: CollectionDefinitionInput = {
        name: 'blog_posts',
        apiName: 'blog_posts',
        displayName: 'Blog Posts',
        fields: [
          {
            name: 'Title With Spaces', // Invalid: contains spaces and capitals
            type: 'text',
            label: 'Title',
          },
        ],
      };

      const result = validateCollectionDefinition(definition);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Field name'))).toBe(true);
    });

    it('should reject reserved field names', () => {
      const definition: CollectionDefinitionInput = {
        name: 'blog_posts',
        apiName: 'blog_posts',
        displayName: 'Blog Posts',
        fields: [
          {
            name: 'id', // Reserved field name
            type: 'text',
            label: 'ID',
          },
        ],
      };

      const result = validateCollectionDefinition(definition);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('reserved'))).toBe(true);
    });

    it('should reject duplicate field names', () => {
      const definition: CollectionDefinitionInput = {
        name: 'blog_posts',
        apiName: 'blog_posts',
        displayName: 'Blog Posts',
        fields: [
          {
            name: 'title',
            type: 'text',
            label: 'Title',
          },
          {
            name: 'title', // Duplicate
            type: 'text',
            label: 'Title 2',
          },
        ],
      };

      const result = validateCollectionDefinition(definition);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Duplicate'))).toBe(true);
    });

    it('should reject enum field without values', () => {
      const definition: CollectionDefinitionInput = {
        name: 'blog_posts',
        apiName: 'blog_posts',
        displayName: 'Blog Posts',
        fields: [
          {
            name: 'status',
            type: 'enum',
            label: 'Status',
            // Missing enumValues
          },
        ],
      };

      const result = validateCollectionDefinition(definition);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Enum'))).toBe(true);
    });

    it('should reject relation field without config', () => {
      const definition: CollectionDefinitionInput = {
        name: 'blog_posts',
        apiName: 'blog_posts',
        displayName: 'Blog Posts',
        fields: [
          {
            name: 'author',
            type: 'relation',
            label: 'Author',
            // Missing relationConfig
          },
        ],
      };

      const result = validateCollectionDefinition(definition);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('relation'))).toBe(true);
    });

    it('should reject index with non-existent field', () => {
      const definition: CollectionDefinitionInput = {
        name: 'blog_posts',
        apiName: 'blog_posts',
        displayName: 'Blog Posts',
        fields: [
          {
            name: 'title',
            type: 'text',
            label: 'Title',
          },
        ],
        indexes: [
          {
            name: 'idx_content',
            fields: ['content'], // Field doesn't exist
            unique: false,
          },
        ],
      };

      const result = validateCollectionDefinition(definition);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('references non-existent'))).toBe(true);
    });

    it('should require at least one field', () => {
      const definition: CollectionDefinitionInput = {
        name: 'blog_posts',
        apiName: 'blog_posts',
        displayName: 'Blog Posts',
        fields: [], // Empty fields array
      };

      const result = validateCollectionDefinition(definition);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('At least one field'))).toBe(true);
    });
  });

  describe('generateCreateTableSQL', () => {
    it('should generate CREATE TABLE SQL with text fields', () => {
      const definition: CollectionDefinitionInput = {
        name: 'blog_posts',
        apiName: 'blog_posts',
        displayName: 'Blog Posts',
        fields: [
          {
            name: 'title',
            type: 'text',
            label: 'Title',
            required: true,
          },
          {
            name: 'slug',
            type: 'text',
            label: 'Slug',
            unique: true,
          },
        ],
      };

      const sql = generateCreateTableSQL(definition);

      expect(sql).toContain('CREATE TABLE IF NOT EXISTS blog_posts');
      expect(sql).toContain('id SERIAL PRIMARY KEY');
      expect(sql).toContain('title VARCHAR(255) NOT NULL');
      expect(sql).toContain('slug VARCHAR(255) UNIQUE');
      expect(sql).toContain('created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()');
      expect(sql).toContain('updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()');
    });

    it('should generate SQL with number fields', () => {
      const definition: CollectionDefinitionInput = {
        name: 'products',
        apiName: 'products',
        displayName: 'Products',
        fields: [
          {
            name: 'price',
            type: 'number',
            label: 'Price',
            numberType: 'decimal',
            decimalPlaces: 2,
          },
          {
            name: 'stock',
            type: 'number',
            label: 'Stock',
            numberType: 'integer',
          },
        ],
      };

      const sql = generateCreateTableSQL(definition);

      expect(sql).toContain('price NUMERIC(10, 2)');
      expect(sql).toContain('stock INTEGER');
    });

    it('should generate SQL with boolean field', () => {
      const definition: CollectionDefinitionInput = {
        name: 'posts',
        apiName: 'posts',
        displayName: 'Posts',
        fields: [
          {
            name: 'is_published',
            type: 'boolean',
            label: 'Published',
            defaultValue: false,
          },
        ],
      };

      const sql = generateCreateTableSQL(definition);

      expect(sql).toContain('is_published BOOLEAN DEFAULT false');
    });

    it('should generate SQL with enum field', () => {
      const definition: CollectionDefinitionInput = {
        name: 'posts',
        apiName: 'posts',
        displayName: 'Posts',
        fields: [
          {
            name: 'status',
            type: 'enum',
            label: 'Status',
            enumValues: ['draft', 'published', 'archived'],
            required: true,
          },
        ],
      };

      const sql = generateCreateTableSQL(definition);

      expect(sql).toContain('CREATE TYPE status_enum AS ENUM');
      expect(sql).toContain("'draft'");
      expect(sql).toContain("'published'");
      expect(sql).toContain("'archived'");
      expect(sql).toContain('status status_enum NOT NULL');
    });

    it('should generate SQL with JSON field', () => {
      const definition: CollectionDefinitionInput = {
        name: 'posts',
        apiName: 'posts',
        displayName: 'Posts',
        fields: [
          {
            name: 'metadata',
            type: 'json',
            label: 'Metadata',
          },
        ],
      };

      const sql = generateCreateTableSQL(definition);

      expect(sql).toContain('metadata JSONB');
    });

    it('should generate SQL with date fields', () => {
      const definition: CollectionDefinitionInput = {
        name: 'events',
        apiName: 'events',
        displayName: 'Events',
        fields: [
          {
            name: 'event_date',
            type: 'date',
            label: 'Event Date',
          },
          {
            name: 'event_datetime',
            type: 'datetime',
            label: 'Event DateTime',
          },
        ],
      };

      const sql = generateCreateTableSQL(definition);

      expect(sql).toContain('event_date DATE');
      expect(sql).toContain('event_datetime TIMESTAMP WITH TIME ZONE');
    });

    it('should generate SQL with relation (foreign key)', () => {
      const definition: CollectionDefinitionInput = {
        name: 'posts',
        apiName: 'posts',
        displayName: 'Posts',
        fields: [
          {
            name: 'author_id',
            type: 'relation',
            label: 'Author',
            relationConfig: {
              targetCollection: 'users',
              relationType: 'one-to-one',
              cascadeDelete: false,
            },
          },
        ],
      };

      const sql = generateCreateTableSQL(definition);

      expect(sql).toContain('author_id INTEGER');
      expect(sql).toContain('FOREIGN KEY (author_id) REFERENCES users(id)');
      expect(sql).toContain('ON DELETE RESTRICT');
    });

    it('should generate SQL with indexes', () => {
      const definition: CollectionDefinitionInput = {
        name: 'posts',
        apiName: 'posts',
        displayName: 'Posts',
        fields: [
          {
            name: 'title',
            type: 'text',
            label: 'Title',
          },
          {
            name: 'slug',
            type: 'text',
            label: 'Slug',
          },
        ],
        indexes: [
          {
            name: 'idx_title',
            fields: ['title'],
            unique: false,
          },
          {
            name: 'idx_unique_slug',
            fields: ['slug'],
            unique: true,
          },
        ],
      };

      const sql = generateCreateTableSQL(definition);

      expect(sql).toContain('CREATE INDEX idx_title ON posts(title)');
      expect(sql).toContain('CREATE UNIQUE INDEX idx_unique_slug ON posts(slug)');
    });
  });

  describe('checkNamingConflicts', () => {
    it('should return false when no conflicts exist', async () => {
      const hasConflict = await checkNamingConflicts('new_collection', 'new_collection_api');

      expect(hasConflict).toBe(false);
    });

    it('should return true when name conflicts', async () => {
      // Create a collection
      await db.insert(collectionDefinitions).values({
        name: 'existing_collection',
        apiName: 'existing_api',
        displayName: 'Existing Collection',
        fields: [{ name: 'title', type: 'text', label: 'Title' }],
        isSystem: false,
        createdBy: testUserId,
      });

      const hasConflict = await checkNamingConflicts('existing_collection', 'different_api');

      expect(hasConflict).toBe(true);
    });

    it('should return true when apiName conflicts', async () => {
      // Create a collection
      await db.insert(collectionDefinitions).values({
        name: 'existing_collection',
        apiName: 'existing_api',
        displayName: 'Existing Collection',
        fields: [{ name: 'title', type: 'text', label: 'Title' }],
        isSystem: false,
        createdBy: testUserId,
      });

      const hasConflict = await checkNamingConflicts('different_name', 'existing_api');

      expect(hasConflict).toBe(true);
    });
  });

  describe('CRUD Operations', () => {
    const validDefinition: CollectionDefinitionInput = {
      name: 'blog_posts',
      apiName: 'blog_posts',
      displayName: 'Blog Posts',
      description: 'Blog post collection',
      icon: 'FileText',
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Title',
          required: true,
        },
        {
          name: 'content',
          type: 'longtext',
          label: 'Content',
        },
      ],
      indexes: [
        {
          name: 'idx_title',
          fields: ['title'],
          unique: false,
        },
      ],
      relationships: [],
    };

    describe('createCollectionDefinition', () => {
      it('should create a new collection definition', async () => {
        const created = await createCollectionDefinition(validDefinition, testUserId);

        expect(created.id).toBeDefined();
        expect(created.name).toBe('blog_posts');
        expect(created.displayName).toBe('Blog Posts');
        expect(created.createdBy).toBe(testUserId);
        expect(created.isSystem).toBe(false);
      });

      it('should reject invalid definition', async () => {
        const invalidDefinition: CollectionDefinitionInput = {
          name: 'Invalid Name!',
          apiName: 'invalid_api',
          displayName: 'Invalid',
          fields: [],
        };

        await expect(createCollectionDefinition(invalidDefinition, testUserId)).rejects.toThrow(
          /Validation failed/,
        );
      });

      it('should reject duplicate collection name', async () => {
        await createCollectionDefinition(validDefinition, testUserId);

        await expect(createCollectionDefinition(validDefinition, testUserId)).rejects.toThrow(
          /already exists/,
        );
      });
    });

    describe('getAllCollectionDefinitions', () => {
      it('should return empty array when no collections exist', async () => {
        const collections = await getAllCollectionDefinitions();

        expect(collections).toEqual([]);
      });

      it('should return all collections', async () => {
        await createCollectionDefinition(validDefinition, testUserId);
        await createCollectionDefinition(
          {
            ...validDefinition,
            name: 'articles',
            apiName: 'articles',
            displayName: 'Articles',
          },
          testUserId,
        );

        const collections = await getAllCollectionDefinitions();

        expect(collections).toHaveLength(2);
        expect(collections[0].name).toBe('articles'); // Should be sorted alphabetically
        expect(collections[1].name).toBe('blog_posts');
      });
    });

    describe('getCollectionDefinitionById', () => {
      it('should return collection by ID', async () => {
        const created = await createCollectionDefinition(validDefinition, testUserId);

        const found = await getCollectionDefinitionById(created.id);

        expect(found).toBeDefined();
        expect(found?.id).toBe(created.id);
        expect(found?.name).toBe('blog_posts');
      });

      it('should return undefined for non-existent ID', async () => {
        const found = await getCollectionDefinitionById(99999);

        expect(found).toBeUndefined();
      });
    });

    describe('updateCollectionDefinition', () => {
      it('should update collection definition', async () => {
        const created = await createCollectionDefinition(validDefinition, testUserId);

        const updated = await updateCollectionDefinition(
          created.id,
          {
            displayName: 'Updated Blog Posts',
            description: 'Updated description',
          },
          testUserId,
        );

        expect(updated.displayName).toBe('Updated Blog Posts');
        expect(updated.description).toBe('Updated description');
        expect(updated.name).toBe('blog_posts'); // Name should not change
      });

      it('should reject invalid updates', async () => {
        const created = await createCollectionDefinition(validDefinition, testUserId);

        await expect(
          updateCollectionDefinition(
            created.id,
            {
              fields: [], // Invalid: no fields
            },
            testUserId,
          ),
        ).rejects.toThrow(/Validation failed/);
      });

      it('should reject updating non-existent collection', async () => {
        await expect(
          updateCollectionDefinition(
            99999,
            {
              displayName: 'Updated',
            },
            testUserId,
          ),
        ).rejects.toThrow(/not found/);
      });

      it('should reject updating system collection', async () => {
        // Create a system collection
        const [systemCollection] = await db
          .insert(collectionDefinitions)
          .values({
            name: 'system_collection',
            apiName: 'system_api',
            displayName: 'System Collection',
            fields: [{ name: 'title', type: 'text', label: 'Title' }],
            isSystem: true,
            createdBy: testUserId,
          })
          .returning();

        await expect(
          updateCollectionDefinition(
            systemCollection.id,
            {
              displayName: 'Updated System',
            },
            testUserId,
          ),
        ).rejects.toThrow(/Cannot update system collections/);
      });
    });

    describe('deleteCollectionDefinition', () => {
      it('should delete collection definition', async () => {
        const created = await createCollectionDefinition(validDefinition, testUserId);

        await deleteCollectionDefinition(created.id);

        const found = await getCollectionDefinitionById(created.id);
        expect(found).toBeUndefined();
      });

      it('should reject deleting non-existent collection', async () => {
        await expect(deleteCollectionDefinition(99999)).rejects.toThrow(/not found/);
      });

      it('should reject deleting system collection', async () => {
        // Create a system collection
        const [systemCollection] = await db
          .insert(collectionDefinitions)
          .values({
            name: 'system_collection',
            apiName: 'system_api',
            displayName: 'System Collection',
            fields: [{ name: 'title', type: 'text', label: 'Title' }],
            isSystem: true,
            createdBy: testUserId,
          })
          .returning();

        await expect(deleteCollectionDefinition(systemCollection.id)).rejects.toThrow(
          /Cannot delete system collections/,
        );
      });
    });
  });
});

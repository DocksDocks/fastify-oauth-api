# Collection Builder - Backend Tasks

## 🎯 Your Mission

Build the **backend engine** for the Collection Builder feature. This includes database schema, API routes, schema generation service, and migration system.

---

## 📋 Tasks Breakdown

### Task 1: Database Schema

**Create:** `backend/src/db/schema/collection-definitions.ts`

**Table: collection_definitions**
- `id` - serial, primary key
- `name` - varchar(255), unique (internal name, snake_case)
- `api_name` - varchar(255), unique (API endpoint name)
- `display_name` - varchar(255) (human-readable name)
- `description` - text, nullable
- `icon` - varchar(50), nullable (Lucide icon name)
- `fields` - jsonb (array of field definitions)
- `indexes` - jsonb, nullable (array of index definitions)
- `relationships` - jsonb, nullable (array of relationship configs)
- `is_system` - boolean, default false
- `created_by` - integer, FK to users(id)
- `created_at` - timestamp with time zone, not null, default now()
- `updated_at` - timestamp with time zone, not null, default now()

**Create:** `backend/src/db/schema/collection-migrations.ts`

**Table: collection_migrations**
- `id` - serial, primary key
- `collection_id` - integer, FK to collection_definitions(id) ON DELETE CASCADE
- `migration_sql` - text, not null
- `status` - enum ('pending', 'applied', 'failed'), default 'pending'
- `applied_at` - timestamp with time zone, nullable
- `error_message` - text, nullable
- `created_by` - integer, FK to users(id)
- `created_at` - timestamp with time zone, not null, default now()

**Then run:**
```bash
pnpm db:generate  # Generate migration
pnpm db:migrate   # Apply migration
```

---

### Task 2: Backend Routes

**Create:** `backend/src/routes/admin/collection-builder.ts`

**Endpoints:**

```typescript
// List all custom collections
GET /api/admin/collection-builder/definitions
- Auth: JWT required
- RBAC: requireSuperadmin
- Response: { success: true, data: CollectionDefinition[] }

// Get single collection
GET /api/admin/collection-builder/definitions/:id
- Auth: JWT required
- RBAC: requireSuperadmin
- Response: { success: true, data: CollectionDefinition }

// Create new collection
POST /api/admin/collection-builder/definitions
- Auth: JWT required
- RBAC: requireSuperadmin
- Body: CollectionDefinition (without id, timestamps)
- Response: { success: true, data: CollectionDefinition }

// Update collection
PATCH /api/admin/collection-builder/definitions/:id
- Auth: JWT required
- RBAC: requireSuperadmin
- Body: Partial<CollectionDefinition>
- Response: { success: true, data: CollectionDefinition }

// Delete collection
DELETE /api/admin/collection-builder/definitions/:id
- Auth: JWT required
- RBAC: requireSuperadmin
- Response: { success: true, message: string }

// Preview migration SQL
POST /api/admin/collection-builder/definitions/:id/preview-migration
- Auth: JWT required
- RBAC: requireSuperadmin
- Response: { success: true, data: { sql: string, warnings: string[] } }

// Apply migration
POST /api/admin/collection-builder/definitions/:id/apply-migration
- Auth: JWT required
- RBAC: requireSuperadmin
- Response: { success: true, message: string }
```

**Register routes in:** `backend/src/app.ts`
```typescript
await app.register(collectionBuilderRoutes, {
  prefix: '/api/admin/collection-builder'
});
```

---

### Task 3: Schema Generator Service

**Create:** `backend/src/services/collection-builder.service.ts`

**Key Functions:**

```typescript
// Validate collection definition
export function validateCollectionDefinition(definition: CollectionDefinition): ValidationResult

// Generate PostgreSQL CREATE TABLE statement
export function generateCreateTableSQL(definition: CollectionDefinition): string

// Generate ALTER TABLE statements (for updates)
export function generateAlterTableSQL(
  oldDefinition: CollectionDefinition,
  newDefinition: CollectionDefinition
): string

// Generate Drizzle schema TypeScript code
export function generateDrizzleSchema(definition: CollectionDefinition): string

// Check for naming conflicts
export function checkNamingConflicts(name: string): Promise<boolean>

// Get all collection definitions
export async function getAllCollectionDefinitions(): Promise<CollectionDefinition[]>

// Create new collection definition
export async function createCollectionDefinition(
  definition: CollectionDefinitionInput,
  userId: number
): Promise<CollectionDefinition>

// Update collection definition
export async function updateCollectionDefinition(
  id: number,
  updates: Partial<CollectionDefinitionInput>,
  userId: number
): Promise<CollectionDefinition>

// Delete collection definition
export async function deleteCollectionDefinition(id: number): Promise<void>
```

**Field Type Mapping:**
```typescript
const FIELD_TYPE_MAP: Record<FieldType, string> = {
  text: 'varchar(255)',
  longtext: 'text',
  richtext: 'text',
  number: 'integer', // or 'numeric(10, 2)' for decimals
  date: 'date',
  datetime: 'timestamp with time zone',
  boolean: 'boolean',
  enum: 'enum_type', // Created separately with CREATE TYPE
  json: 'jsonb',
  relation: 'integer', // Foreign key
  media: 'text', // File URL
};
```

---

### Task 4: Migration Generator Service

**Create:** `backend/src/services/migration-generator.service.ts`

**Key Functions:**

```typescript
// Preview migration (don't execute)
export async function previewMigration(
  collectionId: number
): Promise<{ sql: string; warnings: string[] }>

// Apply migration (execute SQL)
export async function applyMigration(
  collectionId: number,
  userId: number
): Promise<{ success: boolean; message: string }>

// Generate CREATE TABLE SQL
function generateCreateTableStatement(definition: CollectionDefinition): string

// Generate indexes
function generateIndexStatements(
  tableName: string,
  indexes: CollectionIndex[]
): string[]

// Generate foreign keys
function generateForeignKeyStatements(
  tableName: string,
  fields: CollectionField[]
): string[]

// Check for destructive changes
function detectDestructiveChanges(
  oldDefinition: CollectionDefinition,
  newDefinition: CollectionDefinition
): string[]

// Create migration record
async function createMigrationRecord(
  collectionId: number,
  sql: string,
  userId: number
): Promise<number>

// Update migration status
async function updateMigrationStatus(
  migrationId: number,
  status: 'applied' | 'failed',
  error?: string
): Promise<void>
```

**SQL Template Example:**
```sql
-- Create enum types first (if any)
CREATE TYPE blog_post_status AS ENUM ('draft', 'published', 'archived');

-- Create main table
CREATE TABLE IF NOT EXISTS blog_posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  status blog_post_status NOT NULL DEFAULT 'draft',
  author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_blog_posts_author_id ON blog_posts(author_id);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE UNIQUE INDEX idx_blog_posts_title ON blog_posts(title);
```

---

### Task 5: Schema Validator Service

**Create:** `backend/src/services/schema-validator.service.ts`

**Validation Rules:**

```typescript
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// Main validation function
export function validateCollectionSchema(
  definition: CollectionDefinitionInput
): ValidationResult {
  const errors: ValidationError[] = [];

  // 1. Validate collection name
  if (!definition.name || !/^[a-z_]+$/.test(definition.name)) {
    errors.push({
      field: 'name',
      message: 'Name must be lowercase with underscores only',
    });
  }

  // 2. Check for reserved names
  const RESERVED_NAMES = ['user', 'users', 'admin', 'system', 'schema', 'table'];
  if (RESERVED_NAMES.includes(definition.name)) {
    errors.push({
      field: 'name',
      message: 'Name is reserved and cannot be used',
    });
  }

  // 3. Validate fields
  if (!definition.fields || definition.fields.length === 0) {
    errors.push({
      field: 'fields',
      message: 'At least one field is required',
    });
  }

  // 4. Check for duplicate field names
  const fieldNames = new Set<string>();
  definition.fields.forEach((field, index) => {
    if (fieldNames.has(field.name)) {
      errors.push({
        field: `fields[${index}].name`,
        message: `Duplicate field name: ${field.name}`,
      });
    }
    fieldNames.add(field.name);
  });

  // 5. Validate field names
  definition.fields.forEach((field, index) => {
    if (!/^[a-z_][a-z0-9_]*$/.test(field.name)) {
      errors.push({
        field: `fields[${index}].name`,
        message: 'Field name must start with letter and contain only lowercase letters, numbers, underscores',
      });
    }
  });

  // 6. Validate enum fields have values
  definition.fields.forEach((field, index) => {
    if (field.type === 'enum' && (!field.enumValues || field.enumValues.length === 0)) {
      errors.push({
        field: `fields[${index}].enumValues`,
        message: 'Enum fields must have at least one value',
      });
    }
  });

  // 7. Validate relation fields have config
  definition.fields.forEach((field, index) => {
    if (field.type === 'relation' && !field.relationConfig) {
      errors.push({
        field: `fields[${index}].relationConfig`,
        message: 'Relation fields must have relationConfig',
      });
    }
  });

  // 8. Validate indexes reference existing fields
  if (definition.indexes) {
    definition.indexes.forEach((index, i) => {
      index.fields.forEach((fieldName) => {
        if (!fieldNames.has(fieldName)) {
          errors.push({
            field: `indexes[${i}].fields`,
            message: `Index references non-existent field: ${fieldName}`,
          });
        }
      });
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Check if table name already exists in database
export async function checkTableExists(tableName: string): Promise<boolean>

// Check if collection name is taken
export async function checkCollectionNameTaken(name: string): Promise<boolean>
```

---

### Task 6: Dynamic Schema Loader

**Modify:** `backend/src/config/collections.ts`

**Add function to load custom collections:**

```typescript
// Load custom collections from database
async function loadCustomCollections(): Promise<Collection[]> {
  const definitions = await getAllCollectionDefinitions();

  return definitions.map((def) => ({
    name: def.displayName,
    table: def.name,
    description: def.description,
    columns: def.fields.map(fieldToCollectionColumn),
    defaultSort: { column: 'id', order: 'asc' },
    defaultLimit: 20,
  }));
}

// Convert CollectionField to CollectionColumn
function fieldToCollectionColumn(field: CollectionField): CollectionColumn {
  return {
    name: field.name,
    dbColumnName: camelToSnake(field.name),
    label: field.label,
    type: mapFieldTypeToColumnType(field.type),
    sortable: field.type !== 'json' && field.type !== 'richtext',
    searchable: field.type === 'text' || field.type === 'longtext',
    readonly: false,
    enumValues: field.enumValues,
    foreignKey: field.relationConfig ? {
      table: field.relationConfig.targetCollection,
      displayField: 'id', // Can be customized
    } : undefined,
  };
}

// Map field types to collection column types
function mapFieldTypeToColumnType(fieldType: FieldType): string {
  const typeMap: Record<FieldType, string> = {
    text: 'text',
    longtext: 'text',
    richtext: 'text',
    number: 'number',
    date: 'date',
    datetime: 'timestamp',
    boolean: 'boolean',
    enum: 'enum',
    json: 'json',
    relation: 'number', // FK is a number
    media: 'text', // URL is text
  };
  return typeMap[fieldType] || 'text';
}

// Merge system and custom collections
export async function getAllCollections(): Promise<Collection[]> {
  const systemCollections = generateCollections(); // Existing function
  const customCollections = await loadCustomCollections();

  return [...systemCollections, ...customCollections].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}
```

---

## 🧪 Testing

**Unit Tests:** `backend/test/services/collection-builder.test.ts`

Test cases:
- ✅ Validate collection definition (valid cases)
- ✅ Validate collection definition (invalid names)
- ✅ Validate collection definition (duplicate field names)
- ✅ Validate collection definition (missing enum values)
- ✅ Generate CREATE TABLE SQL (simple table)
- ✅ Generate CREATE TABLE SQL (with foreign keys)
- ✅ Generate CREATE TABLE SQL (with enums)
- ✅ Generate CREATE TABLE SQL (with indexes)
- ✅ Detect destructive changes
- ✅ Check naming conflicts

**Integration Tests:** `backend/test/routes/collection-builder.test.ts`

Test cases:
- ✅ GET /definitions - List all (empty)
- ✅ POST /definitions - Create collection (valid)
- ✅ POST /definitions - Create collection (invalid name)
- ✅ POST /definitions - Create collection (duplicate name)
- ✅ GET /definitions/:id - Get single collection
- ✅ PATCH /definitions/:id - Update collection
- ✅ DELETE /definitions/:id - Delete collection (not system)
- ✅ DELETE /definitions/:id - Cannot delete system collection
- ✅ POST /definitions/:id/preview-migration - Preview SQL
- ✅ POST /definitions/:id/apply-migration - Apply migration
- ✅ RBAC: Non-superadmin cannot access

---

## 🔄 Coordination

**Update:** `feature/collection-builder/PROGRESS.md` after each task

**Git Branch:** `feature/collection-builder-backend`

**Integration:** Frontend is building the UI - you're building the engine

---

## 🧪 Testing & Quality Checklist ⭐ IMPORTANT

**After completing EACH task, ALWAYS run:**

### Type Checking
```bash
pnpm type-check
```
**Must pass with 0 errors**

### Linting
```bash
pnpm lint
```
**Must pass with 0 errors or warnings**

### Unit Tests (when applicable)
```bash
pnpm test
```
**Must maintain or improve coverage**

**IMPORTANT:** Fix any TypeScript or ESLint errors IMMEDIATELY. Do not proceed to next task with failing checks.

---

## 📝 Notes

- Follow existing patterns in `backend/src/routes/admin/`
- Use Drizzle ORM for all database queries
- Use `requireSuperadmin` middleware on all routes
- Return consistent response format: `{ success: true, data: ... }`
- Handle errors with try/catch and return `{ success: false, error: ... }`
- Use Pino logger for all operations
- Add JSDoc comments to all exported functions
- **ALWAYS run `pnpm type-check` and `pnpm lint` after changes**

---

## ✅ Definition of Done

- [ ] Database schema created and migrated
- [ ] All routes implemented and registered
- [ ] Schema generator service working
- [ ] Migration generator service working
- [ ] Schema validator service working
- [ ] Dynamic schema loader integrated
- [ ] Unit tests written (85%+ coverage)
- [ ] Integration tests written
- [ ] TypeScript compiles without errors
- [ ] ESLint passes
- [ ] API documented in INTEGRATION_POINTS.md
- [ ] Ready for frontend integration

---

Good luck! 🚀

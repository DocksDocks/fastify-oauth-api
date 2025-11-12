# Collection Builder - API Integration Points

This document defines the API contracts between frontend and backend for the Collection Builder feature.

---

## 🔐 Authentication & Authorization

**All endpoints require:**
- ✅ Valid JWT token in `Authorization: Bearer <token>` header
- ✅ Valid API key in `X-API-Key` header
- ✅ User role: `superadmin` only

**Error Responses:**
- `401 Unauthorized` - Invalid or missing JWT token
- `403 Forbidden` - User is not superadmin
- `400 Bad Request` - Invalid input data
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## 📡 API Endpoints

### 1. List All Collections

**Endpoint:** `GET /api/admin/collection-builder/definitions`

**Description:** Retrieve all custom collection definitions

**Request:**
```http
GET /api/admin/collection-builder/definitions HTTP/1.1
Host: localhost:1337
Authorization: Bearer eyJhbGc...
X-API-Key: your-api-key
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "blog_posts",
      "apiName": "blog_posts",
      "displayName": "Blog Posts",
      "description": "Blog articles and news posts",
      "icon": "FileText",
      "fields": [
        {
          "name": "title",
          "type": "text",
          "label": "Title",
          "required": true,
          "unique": false
        },
        {
          "name": "content",
          "type": "longtext",
          "label": "Content",
          "required": true
        },
        {
          "name": "status",
          "type": "enum",
          "label": "Status",
          "required": true,
          "enumValues": ["draft", "published", "archived"],
          "defaultValue": "draft"
        }
      ],
      "indexes": [
        {
          "name": "idx_blog_posts_title",
          "fields": ["title"],
          "unique": true
        }
      ],
      "relationships": [],
      "isSystem": false,
      "createdBy": 1,
      "createdAt": "2025-11-12T10:00:00Z",
      "updatedAt": "2025-11-12T10:00:00Z"
    }
  ]
}
```

**Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

---

### 2. Get Single Collection

**Endpoint:** `GET /api/admin/collection-builder/definitions/:id`

**Description:** Retrieve a specific collection definition by ID

**Request:**
```http
GET /api/admin/collection-builder/definitions/1 HTTP/1.1
Host: localhost:1337
Authorization: Bearer eyJhbGc...
X-API-Key: your-api-key
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "blog_posts",
    "apiName": "blog_posts",
    "displayName": "Blog Posts",
    "description": "Blog articles and news posts",
    "icon": "FileText",
    "fields": [ /* same as above */ ],
    "indexes": [ /* same as above */ ],
    "relationships": [],
    "isSystem": false,
    "createdBy": 1,
    "createdAt": "2025-11-12T10:00:00Z",
    "updatedAt": "2025-11-12T10:00:00Z"
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Not Found",
  "message": "Collection definition not found"
}
```

---

### 3. Create Collection

**Endpoint:** `POST /api/admin/collection-builder/definitions`

**Description:** Create a new custom collection definition

**Request:**
```http
POST /api/admin/collection-builder/definitions HTTP/1.1
Host: localhost:1337
Authorization: Bearer eyJhbGc...
X-API-Key: your-api-key
Content-Type: application/json

{
  "name": "blog_posts",
  "apiName": "blog_posts",
  "displayName": "Blog Posts",
  "description": "Blog articles and news posts",
  "icon": "FileText",
  "fields": [
    {
      "name": "title",
      "type": "text",
      "label": "Title",
      "required": true,
      "unique": false,
      "validation": {
        "min": 3,
        "max": 255,
        "errorMessage": "Title must be between 3 and 255 characters"
      }
    },
    {
      "name": "content",
      "type": "longtext",
      "label": "Content",
      "required": true
    },
    {
      "name": "status",
      "type": "enum",
      "label": "Status",
      "required": true,
      "enumValues": ["draft", "published", "archived"],
      "defaultValue": "draft"
    },
    {
      "name": "authorId",
      "type": "relation",
      "label": "Author",
      "required": true,
      "relationConfig": {
        "targetCollection": "users",
        "relationType": "one-to-many",
        "cascadeDelete": false
      }
    }
  ],
  "indexes": [
    {
      "name": "idx_blog_posts_title",
      "fields": ["title"],
      "unique": true
    },
    {
      "name": "idx_blog_posts_author_id",
      "fields": ["authorId"],
      "unique": false
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "blog_posts",
    "apiName": "blog_posts",
    "displayName": "Blog Posts",
    /* ... full collection definition with id, timestamps, etc. */
  }
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Invalid collection definition",
  "details": [
    {
      "field": "name",
      "message": "Name must be lowercase with underscores only"
    },
    {
      "field": "fields[0].name",
      "message": "Field name must start with letter"
    }
  ]
}
```

**Response (409 Conflict):**
```json
{
  "success": false,
  "error": "Conflict",
  "message": "A collection with this name already exists"
}
```

---

### 4. Update Collection

**Endpoint:** `PATCH /api/admin/collection-builder/definitions/:id`

**Description:** Update an existing collection definition

**Request:**
```http
PATCH /api/admin/collection-builder/definitions/1 HTTP/1.1
Host: localhost:1337
Authorization: Bearer eyJhbGc...
X-API-Key: your-api-key
Content-Type: application/json

{
  "displayName": "Blog Articles",
  "description": "Updated description for blog articles",
  "fields": [
    /* updated fields array */
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "blog_posts",
    /* ... updated collection definition */
  }
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Cannot modify system collection"
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Not Found",
  "message": "Collection definition not found"
}
```

---

### 5. Delete Collection

**Endpoint:** `DELETE /api/admin/collection-builder/definitions/:id`

**Description:** Delete a custom collection definition (system collections cannot be deleted)

**Request:**
```http
DELETE /api/admin/collection-builder/definitions/1 HTTP/1.1
Host: localhost:1337
Authorization: Bearer eyJhbGc...
X-API-Key: your-api-key
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Collection definition deleted successfully"
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Bad Request",
  "message": "Cannot delete system collection"
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Not Found",
  "message": "Collection definition not found"
}
```

---

### 6. Preview Migration

**Endpoint:** `POST /api/admin/collection-builder/definitions/:id/preview-migration`

**Description:** Preview the SQL migration for a collection (without executing)

**Request:**
```http
POST /api/admin/collection-builder/definitions/1/preview-migration HTTP/1.1
Host: localhost:1337
Authorization: Bearer eyJhbGc...
X-API-Key: your-api-key
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "sql": "-- Create enum types\nCREATE TYPE blog_post_status AS ENUM ('draft', 'published', 'archived');\n\n-- Create main table\nCREATE TABLE IF NOT EXISTS blog_posts (\n  id SERIAL PRIMARY KEY,\n  title VARCHAR(255) NOT NULL,\n  content TEXT NOT NULL,\n  status blog_post_status NOT NULL DEFAULT 'draft',\n  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,\n  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),\n  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()\n);\n\n-- Create indexes\nCREATE UNIQUE INDEX idx_blog_posts_title ON blog_posts(title);\nCREATE INDEX idx_blog_posts_author_id ON blog_posts(author_id);",
    "affectedTables": ["blog_posts"],
    "warnings": [
      "This will create a new table 'blog_posts'",
      "Enum type 'blog_post_status' will be created"
    ]
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Not Found",
  "message": "Collection definition not found"
}
```

---

### 7. Apply Migration

**Endpoint:** `POST /api/admin/collection-builder/definitions/:id/apply-migration`

**Description:** Execute the SQL migration for a collection (creates/modifies database table)

**Request:**
```http
POST /api/admin/collection-builder/definitions/1/apply-migration HTTP/1.1
Host: localhost:1337
Authorization: Bearer eyJhbGc...
X-API-Key: your-api-key
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Migration applied successfully",
  "data": {
    "migrationId": 1,
    "appliedAt": "2025-11-12T10:30:00Z"
  }
}
```

**Response (500 Internal Server Error):**
```json
{
  "success": false,
  "error": "Migration Failed",
  "message": "Failed to apply migration",
  "details": "ERROR: relation \"blog_posts\" already exists"
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Not Found",
  "message": "Collection definition not found"
}
```

---

## 📦 TypeScript Types

**Shared types between frontend and backend:**

```typescript
// Field Types
export type FieldType =
  | 'text'        // varchar(255)
  | 'longtext'    // text
  | 'richtext'    // text (HTML)
  | 'number'      // integer or numeric
  | 'date'        // date
  | 'datetime'    // timestamp with time zone
  | 'boolean'     // boolean
  | 'enum'        // enum type
  | 'json'        // jsonb
  | 'relation'    // foreign key
  | 'media';      // text (file URL)

// Collection Definition (database model)
export interface CollectionDefinition {
  id: number;
  name: string;
  apiName: string;
  displayName: string;
  description?: string;
  icon?: string;
  fields: CollectionField[];
  indexes?: CollectionIndex[];
  relationships?: CollectionRelationship[];
  isSystem: boolean;
  createdBy: number;
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string
}

// Collection Field
export interface CollectionField {
  name: string;
  type: FieldType;
  label: string;
  description?: string;
  required?: boolean;
  unique?: boolean;
  defaultValue?: any;
  validation?: FieldValidation;

  // For number type
  numberType?: 'integer' | 'decimal';
  decimalPlaces?: number;

  // For enum type
  enumValues?: string[];

  // For relation type
  relationConfig?: RelationConfig;
}

// Field Validation Rules
export interface FieldValidation {
  min?: number;
  max?: number;
  regex?: string;
  errorMessage?: string;
}

// Relation Configuration
export interface RelationConfig {
  targetCollection: string;
  relationType: 'one-to-one' | 'one-to-many' | 'many-to-many';
  cascadeDelete?: boolean;
  foreignKeyName?: string;
}

// Collection Index
export interface CollectionIndex {
  name: string;
  fields: string[];
  unique: boolean;
}

// Collection Relationship
export interface CollectionRelationship {
  fieldName: string;
  targetCollection: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

// Input type (for creating/updating)
export type CollectionDefinitionInput = Omit<
  CollectionDefinition,
  'id' | 'createdBy' | 'createdAt' | 'updatedAt'
>;

// Migration Preview
export interface MigrationPreview {
  sql: string;
  affectedTables: string[];
  warnings: string[];
}

// Migration Result
export interface MigrationResult {
  success: boolean;
  message: string;
  migrationId?: number;
  appliedAt?: string;
  error?: string;
}

// API Response Wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any;
}

// Validation Error
export interface ValidationError {
  field: string;
  message: string;
}
```

---

## 🔄 Data Flow

### Creating a New Collection

```
Frontend                          Backend                        Database
--------                          -------                        --------
1. User fills form
2. Click "Create"
   |
   |--POST /definitions-->
                                3. Validate input
                                4. Check naming conflicts
                                5. Insert into collection_definitions
                                                                6. Insert row
   <--201 Created---------
7. Show success message
8. Redirect to list page
```

### Applying a Migration

```
Frontend                          Backend                        Database
--------                          -------                        --------
1. User clicks "Apply Migration"
   |
   |--POST /preview-migration-->
                                2. Generate SQL
                                3. Detect warnings
   <--200 OK--------------
4. Show SQL preview modal
5. User confirms
   |
   |--POST /apply-migration-->
                                6. Begin transaction
                                7. Execute CREATE TABLE
                                                                8. Create table
                                9. Execute CREATE INDEX
                                                                10. Create indexes
                                11. Create migration record
                                                                12. Insert migration row
                                13. Commit transaction
   <--200 OK--------------
14. Show success message
15. Reload collections list
```

---

## ⚠️ Error Handling

### Frontend Error Handling Pattern

```typescript
try {
  const response = await collectionBuilder.create(data);
  // Handle success
  console.log('Collection created:', response.data);
} catch (error) {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data;

    if (error.response?.status === 400) {
      // Validation error
      console.error('Validation errors:', apiError.details);
      // Show field-level errors in form
    } else if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      router.push('/admin/login');
    } else if (error.response?.status === 403) {
      // Forbidden - show error message
      alert('You do not have permission to perform this action');
    } else if (error.response?.status === 409) {
      // Conflict - collection name already exists
      alert('A collection with this name already exists');
    } else {
      // Generic error
      alert('An error occurred. Please try again.');
    }
  }
}
```

### Backend Error Response Pattern

```typescript
// Success response
return reply.code(200).send({
  success: true,
  data: result,
});

// Validation error
return reply.code(400).send({
  success: false,
  error: 'Validation Error',
  message: 'Invalid collection definition',
  details: validationErrors,
});

// Not found error
return reply.code(404).send({
  success: false,
  error: 'Not Found',
  message: 'Collection definition not found',
});

// Internal server error
return reply.code(500).send({
  success: false,
  error: 'Internal Server Error',
  message: 'An unexpected error occurred',
  details: process.env.NODE_ENV === 'development' ? error.message : undefined,
});
```

---

## 🧪 Testing Integration

### Integration Test Checklist

- [ ] Frontend can fetch empty list (no collections)
- [ ] Frontend can fetch list with collections
- [ ] Frontend can create new collection
- [ ] Frontend handles validation errors correctly
- [ ] Frontend can update existing collection
- [ ] Frontend can delete collection
- [ ] Frontend shows superadmin-only access correctly
- [ ] Frontend can preview migration
- [ ] Frontend can apply migration
- [ ] Error responses display correctly
- [ ] Loading states work properly
- [ ] RBAC enforcement works (non-superadmin blocked)

### Mock Data for Testing

**Frontend can use this mock data before backend is ready:**

```typescript
const mockCollections: CollectionDefinition[] = [
  {
    id: 1,
    name: 'blog_posts',
    apiName: 'blog_posts',
    displayName: 'Blog Posts',
    description: 'Blog articles and news',
    icon: 'FileText',
    fields: [
      { name: 'title', type: 'text', label: 'Title', required: true },
      { name: 'content', type: 'longtext', label: 'Content', required: true },
      {
        name: 'status',
        type: 'enum',
        label: 'Status',
        required: true,
        enumValues: ['draft', 'published'],
        defaultValue: 'draft',
      },
    ],
    indexes: [],
    relationships: [],
    isSystem: false,
    createdBy: 1,
    createdAt: '2025-11-12T10:00:00Z',
    updatedAt: '2025-11-12T10:00:00Z',
  },
];
```

---

## 📝 Notes

- All dates are in ISO 8601 format (UTC)
- All IDs are positive integers
- Field names must be camelCase in API, snake_case in database
- Enum values are lowercase strings
- File paths for media fields are relative to uploads directory
- Maximum request body size: 10MB (for large field definitions)
- Rate limiting: 100 requests per minute per user

---

**Last Updated:** [Update when changes are made]

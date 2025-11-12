# Collection Builder - Design Decisions & Open Questions

This document tracks important design decisions, open questions, and technical considerations for the Collection Builder feature.

**Last Updated:** 2025-11-12

---

## ✅ Confirmed Decisions

### 1. Scope & Features ✅
**Decision:** Build full Strapi-like Collection Builder with all features
- Visual drag-and-drop designer
- Support for all field types (text, longtext, richtext, number, date, datetime, boolean, enum, json, relation, media)
- Relationship management (one-to-one, one-to-many, many-to-many)
- Validation rules
- Custom indexes
- Migration system

**Rationale:** User wants comprehensive solution, not MVP

---

### 2. Migration Strategy ✅
**Decision:** Hybrid approach - preview SQL first, then apply with confirmation
- Generate SQL from collection definition
- Show preview in modal with syntax highlighting
- User must confirm before applying
- Store migration history in database

**Rationale:** Balance between safety (review before apply) and convenience (don't need file system access)

**Alternatives Considered:**
- ❌ Auto-apply: Too risky, can't review changes
- ❌ Generate files only: Requires dev intervention, slows workflow

---

### 3. UI Style ✅
**Decision:** Visual drag-and-drop designer (like Strapi)
- 3-panel layout: Field palette | Canvas | Configuration panel
- Drag fields from palette to canvas
- Click field to configure in right panel
- Visual relationship builder

**Rationale:** More intuitive than forms, matches Strapi UX that user is familiar with

**Alternatives Considered:**
- ❌ Form-based: Easier to build but less intuitive

---

### 4. Permission Level ✅
**Decision:** Superadmin only
- Only users with role `superadmin` can access Collection Builder
- Regular admins cannot create/modify collections

**Rationale:** Schema changes are high-risk operations, should be restricted to highest privilege level

---

### 5. Sidebar Organization ✅
**Decision:** Group navigation with collapsible dropdowns
```
Dashboard
Admin Settings (dropdown)
  ├── API Keys
  └── Authorized Admins
Collections (dropdown)
  ├── [Dynamic collections]
Collection Builder (superadmin only)
Dev Reset (dev mode only)
```

**Rationale:** Cleaner sidebar, logically groups related features

---

### 6. Database Schema Strategy ✅
**Decision:** Hybrid - system tables use Drizzle, custom tables use dynamic loading
- System tables (users, api_keys, etc.) remain as static Drizzle schemas
- Custom collections stored as JSONB in `collection_definitions` table
- Generate SQL dynamically at runtime
- Store generated TypeScript schemas in `backend/src/db/schema/generated/`

**Rationale:** Drizzle requires compile-time types, but we need runtime flexibility

---

### 7. Field Type Support ✅
**Decision:** Support 11 field types initially
1. **text** - varchar(255) for short text
2. **longtext** - text for long content
3. **richtext** - text (stores HTML from WYSIWYG editor)
4. **number** - integer or numeric (with decimal places)
5. **date** - date only
6. **datetime** - timestamp with time zone
7. **boolean** - true/false
8. **enum** - predefined list of values
9. **json** - jsonb for structured data
10. **relation** - foreign key to other collection
11. **media** - text (stores file URL/path)

**Rationale:** Covers 95% of common use cases, can extend later

---

### 8. Validation Rules ✅
**Decision:** Support common validation rules per field
- Required/optional
- Unique constraint
- Min/max length (text)
- Min/max value (number)
- Custom regex patterns
- Custom error messages

**Rationale:** Essential for data quality, matches Strapi capabilities

---

### 9. Many-to-Many Relations ✅
**Decision:** Auto-generate join tables
- Junction table naming: `{collection1}_{collection2}_junction`
- Automatically created when many-to-many relation is defined
- Users don't need to manually create join tables
- Join tables shown in schema designer (read-only)

**Rationale:** Simplifies user workflow, reduces errors

---

### 10. Media Upload Strategy ✅
**Decision:** Start with local filesystem storage
- Store files in `backend/uploads/` directory
- Save file path in database (text field)
- Generate thumbnails for images (using sharp)
- Support common formats: images (jpg, png, webp), documents (pdf), videos (mp4)

**Future:** Can extend to S3-compatible storage later

**Rationale:** Local storage simpler to implement, sufficient for most use cases

---

## ❓ Open Questions

### 1. Schema Versioning
**Question:** Should we track schema version history to enable rollbacks?

**Options:**
- A) Store only current schema (simpler)
- B) Store version history (enables rollback)
- C) Use git-like diff system (most complex)

**Impact:** Affects database schema and migration logic

**Status:** ⏳ Needs user input

---

### 2. Auto-Generated API Endpoints
**Question:** Should custom collections automatically get CRUD API endpoints?

**Example:** If user creates `blog_posts` collection, should we auto-generate:
- `GET /api/collections/blog_posts`
- `GET /api/collections/blog_posts/:id`
- `POST /api/collections/blog_posts`
- `PATCH /api/collections/blog_posts/:id`
- `DELETE /api/collections/blog_posts/:id`

**Options:**
- A) Auto-generate for all collections (convenient)
- B) Opt-in per collection (more control)
- C) Manual only (most flexible)

**Impact:** Affects route registration and security

**Status:** ⏳ Needs user input

---

### 3. Swagger/OpenAPI Documentation
**Question:** Should we auto-generate API docs for custom collections?

**Options:**
- A) Yes - generate OpenAPI spec automatically
- B) No - manual documentation only
- C) Later phase

**Impact:** Affects documentation strategy

**Status:** ⏳ Needs user input

---

### 4. Collection Templates
**Question:** Should we provide pre-built collection templates?

**Examples:**
- Blog (posts, categories, tags)
- E-commerce (products, orders, customers)
- CMS (pages, menus, media library)

**Options:**
- A) Yes - build template library
- B) No - users create from scratch
- C) Later phase

**Status:** ⏳ Needs user input

---

### 5. Data Import/Export
**Question:** Should collections support CSV/JSON import/export?

**Use Cases:**
- Bulk data import
- Backup/restore
- Migration between environments

**Options:**
- A) Yes - implement in Phase 4
- B) No - out of scope
- C) Later phase

**Status:** ⏳ Needs user input

---

### 6. Soft Deletes
**Question:** Should collections have optional soft delete support?

**Behavior:** Add `deleted_at` column instead of hard deleting records

**Options:**
- A) Checkbox in collection settings
- B) Always enabled
- C) Never enabled

**Impact:** Affects schema generation and query logic

**Status:** ⏳ Needs user input

---

### 7. Audit Logging
**Question:** Should we track who created/modified each record in custom collections?

**Fields:** `created_by`, `updated_by` (FK to users table)

**Options:**
- A) Checkbox in collection settings (opt-in)
- B) Always enabled (automatic)
- C) Never enabled

**Impact:** Affects schema generation

**Status:** ⏳ Needs user input

---

### 8. Collection Permissions
**Question:** Should individual collections have granular permissions?

**Example:** Allow admins to view but not edit certain collections

**Options:**
- A) Global permissions only (simpler)
- B) Per-collection permissions (more flexible)
- C) Field-level permissions (most granular)

**Impact:** Large feature, affects RBAC system

**Status:** ⏳ Needs user input (likely future phase)

---

### 9. Relationship UI Display
**Question:** How should related data be displayed in the collections browser?

**Example:** Blog post has `authorId` FK to users table

**Options:**
- A) Show ID only (simple)
- B) Show related field (e.g., user's email) - **currently implemented**
- C) Clickable link to related record
- D) Inline editing of related data

**Impact:** Affects frontend display logic

**Current:** Option B is implemented. Can extend to C/D later.

**Status:** ✅ Option B confirmed (can revisit later)

---

### 10. Migration Rollback
**Question:** Should we support rolling back applied migrations?

**Use Case:** User applies migration with mistake, wants to undo

**Options:**
- A) Yes - generate DOWN migrations (complex)
- B) No - forward-only migrations (simpler)
- C) Manual rollback via SQL (middle ground)

**Impact:** Affects migration system complexity

**Status:** ⏳ Needs user input

---

## 🔧 Technical Considerations

### 1. Performance Concerns

**Large JSONB Fields:**
- Collection definitions stored as JSONB
- Could get large with many fields
- **Mitigation:** Pagination, lazy loading, index JSONB columns

**Dynamic Schema Loading:**
- Loading custom schemas on every request could be slow
- **Mitigation:** Redis caching, invalidate on schema changes

**Migration Execution:**
- Large migrations could timeout
- **Mitigation:** Set longer timeout, run in background job

---

### 2. Type Safety

**Challenge:** Drizzle expects compile-time types, but we have runtime schemas

**Solutions Considered:**
- A) Generate TypeScript files at runtime (complex, requires TS compiler API)
- B) Use generic types + runtime validation (simpler, less type-safe)
- C) Separate system and custom collections (hybrid approach) ✅

**Current Decision:** Option C - hybrid approach

---

### 3. SQL Injection Protection

**Risk:** Generating SQL from user input could enable SQL injection

**Mitigations:**
- ✅ Whitelist allowed characters in names (alphanumeric + underscore)
- ✅ Use parameterized queries where possible
- ✅ Validate all input with Zod schemas
- ✅ Escape SQL identifiers with Drizzle's `sql` tagged template
- ✅ Never concatenate user input directly into SQL strings

---

### 4. Concurrent Migrations

**Risk:** Two users apply migrations simultaneously, causing conflicts

**Mitigations:**
- ✅ Database transaction for migration application
- ✅ Advisory locks on migration execution
- ✅ Check migration status before applying
- ⚠️ Consider queue system for migrations (future)

---

### 5. Drizzle Schema Sync

**Challenge:** Drizzle migrations vs dynamic collections

**Current Approach:**
- System tables: Use `drizzle-kit generate` for migrations
- Custom collections: Use dynamic SQL generation
- **Never mix the two** - keep separate

**Consideration:** May need to regenerate Drizzle config to include custom tables (future)

---

## 📝 Implementation Notes

### Phase Breakdown

**Phase 1: Foundation (2-3 days)**
- Database schema
- Backend routes structure
- Frontend sidebar reorganization

**Phase 2: Visual Designer (4-5 days)**
- Drag-and-drop field palette
- Canvas with field reordering
- Configuration panel
- Relationship builder UI

**Phase 3: Backend Engine (3-4 days)**
- Schema generator service
- Migration generator service
- Schema validator service
- Dynamic schema loader

**Phase 4: Advanced Features (3-4 days)**
- Media upload system
- Rich text editor
- Validation rules
- Custom indexes
- Collection settings

**Testing & Polish: (5-7 days)**
- Unit tests (85%+ coverage)
- Integration tests
- E2E tests
- Bug fixes
- Documentation

**Total Estimate:** 20-25 days

---

## 🚧 Known Limitations

### Current Limitations:

1. **No schema versioning** - Only current schema stored
2. **No rollback support** - Migrations are forward-only
3. **Local storage only** - No S3 support yet
4. **No data validation UI** - Validation errors shown as text only
5. **No bulk operations** - One record at a time
6. **No audit trail** - No record of who changed what
7. **No soft deletes** - Hard delete only
8. **No collection templates** - Must build from scratch
9. **No import/export** - No CSV/JSON support
10. **Global permissions only** - No per-collection permissions

### Future Enhancements:

- Collection templates library
- Data import/export (CSV, JSON)
- S3-compatible storage
- Advanced validation UI
- Webhook support (trigger on CRUD events)
- GraphQL API generation
- Collection duplication
- Schema diff viewer
- Migration queue system
- Field dependencies (show field A only if field B = X)

---

## 💡 Ideas & Suggestions

**Add your ideas here:**

- [ ] Idea: Auto-generate REST API clients (TypeScript, Python, etc.)
- [ ] Idea: Collection marketplace (share collection schemas)
- [ ] Idea: Visual query builder for collections
- [ ] Idea: Scheduled tasks (cron jobs) per collection
- [ ] Idea: Webhooks for collection events (onCreate, onUpdate, onDelete)
- [ ] Idea: Collection analytics dashboard
- [ ] Idea: Field validation preview (test validation before saving)
- [ ] Idea: Duplicate collection feature
- [ ] Idea: Collection tags/categories for organization

---

## 📚 References

**Strapi Documentation:**
- [Content-Type Builder](https://docs.strapi.io/user-docs/content-type-builder)
- [Relations](https://docs.strapi.io/user-docs/content-type-builder/configuring-fields-content-type#relations)

**Drizzle ORM:**
- [Schema Declaration](https://orm.drizzle.team/docs/sql-schema-declaration)
- [PostgreSQL Column Types](https://orm.drizzle.team/docs/column-types/pg)
- [Migrations](https://orm.drizzle.team/docs/migrations)

**PostgreSQL:**
- [CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html)
- [CREATE TYPE (Enums)](https://www.postgresql.org/docs/current/sql-createtype.html)
- [CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html)

---

**Remember to update this document when:**
- Making important design decisions
- Discovering new constraints or limitations
- Getting answers to open questions
- Identifying technical debt
- Coming up with new ideas

---

**Last Updated:** 2025-11-12

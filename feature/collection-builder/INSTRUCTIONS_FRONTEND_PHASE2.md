# Collection Builder - Frontend Phase 2: Visual Designer

## 🎯 Your Mission

Build the **visual collection designer interface** (the actual collection builder UI) now that the backend APIs are ready and working. Replace the placeholder "Coming Soon" pages with functional forms.

**Backend Status:** ✅ Tasks 1-4 complete (Database, Routes, SQL Generation, Migrations)

---

## 📋 Tasks Breakdown

### Task 1: Field Type Components Library ⭐

**Create:** `frontend/components/collection-builder/field-types/`

Build reusable field configuration components for each field type:

**Files to create:**
- `FieldTypeSelector.tsx` - Dropdown to select field type
- `TextFieldConfig.tsx` - Config for text/longtext/richtext
- `NumberFieldConfig.tsx` - Config for number (integer/decimal)
- `DateFieldConfig.tsx` - Config for date/datetime
- `BooleanFieldConfig.tsx` - Config for boolean
- `EnumFieldConfig.tsx` - Config for enum (with value list)
- `JsonFieldConfig.tsx` - Config for json
- `RelationFieldConfig.tsx` - Config for relation (FK)
- `MediaFieldConfig.tsx` - Config for media (file URL)

**Each config component should handle:**
- Field label (required)
- Field description (optional)
- Required checkbox
- Unique checkbox
- Default value input
- Type-specific options (e.g., decimal places for numbers, enum values for enums)
- Validation rules (min/max for text and numbers)

**Component Pattern:**
```tsx
interface FieldConfigProps {
  field: CollectionField;
  onChange: (field: CollectionField) => void;
  onRemove: () => void;
}

export function TextFieldConfig({ field, onChange, onRemove }: FieldConfigProps) {
  // Render field configuration form
}
```

---

### Task 2: Collection Creation Form

**Create:** `frontend/app/admin/collection-builder/new/page.tsx` (replace placeholder)

**Requirements:**

**Step 1: Basic Info**
- Collection name (snake_case, validated)
- API name (snake_case, validated)
- Display name (human-readable)
- Description (optional)
- Icon selector (Lucide icons - use a searchable dropdown)

**Step 2: Fields**
- Add Field button
- Field list (sortable/draggable would be nice but not required)
- Each field shows:
  - Field name (validated: lowercase, underscores only)
  - Field type selector
  - Type-specific configuration (renders appropriate component from Task 1)
  - Remove field button

**Step 3: Indexes (Optional)**
- Add Index button
- Index list with:
  - Index name
  - Fields to index (multi-select from defined fields)
  - Unique constraint checkbox
  - Remove index button

**Step 4: Review & Create**
- Show summary of collection
- Validation errors (if any)
- Create Collection button
- Calls `POST /api/admin/collection-builder/definitions`

**Form Validation:**
- Collection name: `/^[a-z_]+$/`
- Field names: `/^[a-z_][a-z0-9_]*$/`
- At least 1 field required
- No duplicate field names
- Enum fields must have values
- Relation fields must have config

**Success Flow:**
1. Create collection definition (API call)
2. Redirect to collection edit page
3. Show success toast: "Collection created! Now preview and apply migration."

---

### Task 3: Collection Edit/Migration Page

**Create:** `frontend/app/admin/collection-builder/[id]/page.tsx` (replace placeholder)

**Layout:**

**Left Panel: Collection Info**
- Display collection details (read-only)
- Edit button → Opens edit modal (can modify fields, indexes)

**Right Panel: Migration Actions**
- Preview Migration button
- Shows migration status badge:
  - 🟡 "Not Applied" if no migration
  - 🟢 "Applied" if migration exists
  - 🔴 "Failed" if last migration failed

**Preview Migration Modal:**
- Title: "Preview Migration SQL"
- Shows SQL in code block (syntax highlighted if possible)
- Shows warnings list (with ⚠️  icons)
- Warnings examples:
  - "✓ This is a new table creation (non-destructive)"
  - "⚠️  Table already exists. Schema changes require careful review."
- Cancel button
- Apply Migration button (if SQL looks good)

**Apply Migration Flow:**
1. User clicks "Apply Migration"
2. Show confirmation dialog:
   - "Are you sure you want to apply this migration?"
   - "This will create/modify the database table: [table_name]"
   - Warning if destructive
3. Call `POST /api/admin/collection-builder/definitions/:id/apply-migration`
4. Show loading state "Applying migration..."
5. On success:
   - Show success toast: "Migration applied successfully!"
   - Update status badge to "Applied"
   - Disable Apply button (already applied)
6. On failure:
   - Show error dialog with error message
   - Update status badge to "Failed"

**Migration History Section:**
- List of past migrations (optional - nice to have)
- Shows: SQL, status, timestamp, applied by

---

### Task 4: Field Type Icons & Visual Polish

**Enhance:** All collection builder pages

**Field Type Icons:**
Create a mapping of field types to Lucide icons:
```tsx
const FIELD_TYPE_ICONS = {
  text: <Type />,
  longtext: <FileText />,
  richtext: <Edit3 />,
  number: <Hash />,
  date: <Calendar />,
  datetime: <Clock />,
  boolean: <ToggleLeft />,
  enum: <List />,
  json: <Braces />,
  relation: <Link />,
  media: <Image />,
};
```

**Visual Improvements:**
- Use shadcn/ui components throughout (Card, Badge, Alert, Dialog)
- Add proper spacing and typography
- Use OKLCH theme colors
- Add loading states (Skeleton components)
- Add empty states with illustrations
- Add validation error messages (inline and toast)

---

### Task 5: Collection List Enhancements

**Enhance:** `frontend/app/admin/collection-builder/page.tsx`

**Current State:** Basic table with delete functionality

**Enhancements Needed:**
1. **Status Column:**
   - Show migration status badge (Applied/Not Applied/Failed)
   - Get status from API or local state

2. **Actions Column:**
   - Edit button → Navigate to `/admin/collection-builder/[id]`
   - Preview Migration button → Opens preview modal (inline)
   - Delete button (already implemented) → Only if not system collection

3. **Filter/Search:**
   - Search by name
   - Filter by status (All/Applied/Not Applied/Failed)
   - Filter by type (All/System/Custom)

4. **Empty State:**
   - Already implemented, but enhance with better CTA
   - "Create your first collection to get started"
   - Add illustration or icon

---

### Task 6: Edit Collection Modal

**Create:** `frontend/components/collection-builder/EditCollectionModal.tsx`

**Trigger:** Edit button on collection edit page or list page

**Functionality:**
- Load existing collection definition
- Allow editing:
  - Display name, description, icon
  - Fields (add/edit/remove)
  - Indexes (add/edit/remove)
- Cannot edit:
  - Collection name (table name - dangerous)
  - API name (endpoint name - dangerous)
- Save button → `PATCH /api/admin/collection-builder/definitions/:id`
- After save:
  - Show success toast
  - Prompt user to preview and apply migration
  - Navigate back to edit page

**Warning:**
- Show warning if editing applied collection:
  - "This collection has already been applied to the database."
  - "Changing the schema will require a new migration."
  - "Review the migration preview carefully before applying."

---

### Task 7: Validation & Error Handling

**Enhance:** All forms with comprehensive validation

**Client-Side Validation:**
- Use React Hook Form with Zod schema validation
- Validate before API calls
- Show inline errors on fields
- Disable submit button if validation fails

**Example Zod Schema:**
```tsx
const collectionSchema = z.object({
  name: z.string()
    .regex(/^[a-z_]+$/, 'Name must be lowercase with underscores'),
  apiName: z.string()
    .regex(/^[a-z_]+$/, 'API name must be lowercase with underscores'),
  displayName: z.string().min(1, 'Display name is required'),
  fields: z.array(fieldSchema).min(1, 'At least one field is required'),
  // ... more validation
});
```

**Server Error Handling:**
- Parse API error responses
- Show error toast with message
- For validation errors, show field-specific errors
- For conflicts (e.g., duplicate name), show clear message

---

## 🎨 Design Guidelines

**Use shadcn/ui components:**
- Form, Input, Label, Select, Checkbox, Switch
- Card, Badge, Alert, AlertDialog, Dialog
- Button, Separator, ScrollArea, Tabs
- Skeleton (for loading states)

**Color Coding:**
- System collections: Blue badge
- Custom collections: Green badge
- Applied migration: Green badge
- Not applied: Yellow badge
- Failed migration: Red badge

**Icons:**
- Use Lucide React icons throughout
- Field types get specific icons (see Task 4)
- Actions use standard icons (Edit, Trash, Eye, Play)

**Responsive:**
- Stack form sections on mobile
- Keep table scrollable on mobile
- Ensure modals are mobile-friendly

---

## 🔄 API Integration

**Backend APIs Ready:**
```typescript
// List collections
GET /api/admin/collection-builder/definitions
Response: { success: true, data: CollectionDefinition[] }

// Get single collection
GET /api/admin/collection-builder/definitions/:id
Response: { success: true, data: CollectionDefinition }

// Create collection
POST /api/admin/collection-builder/definitions
Body: { name, apiName, displayName, description, icon, fields, indexes, relationships }
Response: { success: true, data: CollectionDefinition }

// Update collection
PATCH /api/admin/collection-builder/definitions/:id
Body: Partial<CollectionDefinition>
Response: { success: true, data: CollectionDefinition }

// Delete collection
DELETE /api/admin/collection-builder/definitions/:id
Response: { success: true, message: string }

// Preview migration
POST /api/admin/collection-builder/definitions/:id/preview-migration
Response: { success: true, data: { sql: string, warnings: string[] } }

// Apply migration
POST /api/admin/collection-builder/definitions/:id/apply-migration
Response: { success: true, message: string, data: { migrationId: number, appliedAt: Date } }
```

**API Client Methods (Already Created in Phase 1):**
```typescript
adminApi.collectionBuilder.list()
adminApi.collectionBuilder.get(id)
adminApi.collectionBuilder.create(data)
adminApi.collectionBuilder.update(id, data)
adminApi.collectionBuilder.delete(id)
adminApi.collectionBuilder.previewMigration(id)
adminApi.collectionBuilder.applyMigration(id)
```

---

## 🧪 Testing Checklist

After each task, test:

### Functionality:
- [ ] Can create new collection with all field types
- [ ] Can add/remove fields dynamically
- [ ] Can add/remove indexes
- [ ] Validation catches all errors (duplicate names, invalid formats)
- [ ] Preview migration shows correct SQL
- [ ] Apply migration works and updates status
- [ ] Can edit existing collections
- [ ] Can delete collections (with confirmation)
- [ ] Cannot delete system collections
- [ ] Migration status badges update correctly

### UI/UX:
- [ ] Forms are intuitive and easy to use
- [ ] Loading states show during API calls
- [ ] Error messages are clear and actionable
- [ ] Success toasts confirm actions
- [ ] Modals are mobile-friendly
- [ ] Icons make field types recognizable
- [ ] Colors follow theme (light/dark mode)

### Code Quality:
- [ ] TypeScript compilation passes (`pnpm type-check`)
- [ ] ESLint passes (`pnpm lint`)
- [ ] Components are reusable and well-structured
- [ ] Forms use React Hook Form + Zod
- [ ] API calls use existing api.ts client
- [ ] i18n translations used (not hardcoded strings)

---

## 📝 Priority Order

**High Priority (MVP):**
1. Task 1 (Field Type Components) - Foundation
2. Task 2 (Create Form) - Core functionality
3. Task 3 (Edit/Migration Page) - Core functionality
4. Task 7 (Validation) - Essential for UX

**Medium Priority:**
5. Task 5 (List Enhancements) - Better UX
6. Task 6 (Edit Modal) - Convenience

**Nice to Have:**
7. Task 4 (Visual Polish) - Final touches
8. Migration history display
9. Drag-and-drop field ordering
10. Icon picker with search

---

## 🚀 Getting Started

**Step 1:** Read this entire document

**Step 2:** Start with Task 1 (Field Type Components) - these are reusable building blocks

**Step 3:** Move to Task 2 (Create Form) - test end-to-end with backend

**Step 4:** Implement Task 3 (Edit/Migration) - complete the cycle

**Step 5:** Add Task 7 (Validation) throughout

**Step 6:** Polish with Tasks 4, 5, 6

---

## 🔗 Resources

**Backend Status:**
- ✅ Database schema created
- ✅ API routes working
- ✅ SQL generation functional
- ✅ Migration system operational

**Frontend Foundation (Phase 1):**
- ✅ Types defined in `frontend/types/index.ts`
- ✅ API client methods in `frontend/lib/api.ts`
- ✅ i18n translations in `frontend/messages/*.json`
- ✅ Sidebar navigation configured
- ✅ List page structure ready

**Reference:**
- Backend contract: `feature/collection-builder/INTEGRATION_POINTS.md`
- Design decisions: `feature/collection-builder/DECISIONS.md`
- Progress tracker: `feature/collection-builder/PROGRESS.md`

---

## 💡 Tips

1. **Start simple:** Get basic form working first, then add enhancements
2. **Reuse components:** Use existing shadcn/ui components and patterns from other admin pages
3. **Test incrementally:** Test each task with real backend before moving on
4. **Follow patterns:** Look at API Keys and Authorized Admins pages for reference
5. **Validate early:** Add validation from the start to avoid bugs
6. **Use types:** Leverage TypeScript types from `frontend/types/index.ts`
7. **i18n first:** Don't hardcode strings, use translation keys
8. **Error handling:** Always handle loading, error, and success states

---

Good luck! 🎨 Let's build an amazing collection builder UI!

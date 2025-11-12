# Collection Builder - Frontend Tasks

## 🎯 Your Mission

You are responsible for building the **frontend foundation** for the Collection Builder feature. Another Claude Code instance is handling the backend (database, routes, services). Your work will integrate with theirs once both foundations are complete.

---

## 📋 Context

### What We're Building
A **Strapi-like Collection Builder** that allows superadmins to create custom database tables/collections through a visual interface. Think of it as a low-code database schema designer.

### Current State
- ✅ Project has admin panel with Next.js 16 (App Router)
- ✅ Existing features: Dashboard, API Keys, Authorized Admins, Collections Browser
- ✅ Authentication with JWT + RBAC (user/admin/superadmin)
- ✅ Styling: shadcn/ui + TailwindCSS v4 + OKLCH colors
- ✅ State: Zustand for auth

### What You'll Build
1. Reorganized admin sidebar with grouped navigation
2. Collection Builder list page (table view of custom collections)
3. Collection Builder create/edit page (placeholder for now)
4. API client methods for backend integration
5. TypeScript types for collection definitions

---

## 🚨 IMPORTANT RULES

### ✅ DO:
- Work ONLY in `frontend/` directory
- Use existing patterns from API Keys and Authorized Admins pages
- Follow shadcn/ui component patterns
- Use OKLCH theme variables (bg-background, text-foreground, etc.)
- Use path aliases (@/components, @/lib, @/types)
- Mark as "superadmin only" - all Collection Builder routes
- Update `PROGRESS.md` after completing each task
- Test that everything compiles (`pnpm type-check`)

### ❌ DON'T:
- Touch anything in `backend/` directory
- Implement the full visual designer yet (that's Phase 2)
- Add new dependencies without asking user
- Use relative imports like `../../components` (use @/components)
- Hardcode API URLs (use existing api.ts patterns)

---

## 📦 Tasks Breakdown

## Task 1: Reorganize Admin Sidebar ⭐

**File:** `frontend/components/layout/Sidebar.tsx`

**Current Structure:**
```
Dashboard
API Keys
Authorized Admins
Collections (collapsible dropdown)
  ├── Users
  ├── Provider Accounts
  └── ...
Dev Reset
```

**New Structure:**
```
Dashboard
Admin Settings (collapsible dropdown) ⭐ NEW
  ├── API Keys
  └── Authorized Admins
Collections (existing collapsible dropdown)
  ├── Users
  ├── Provider Accounts
  └── ...
Collection Builder ⭐ NEW (superadmin only)
Dev Reset (dev mode only)
```

### Implementation Details:

1. **Create Admin Settings Dropdown** (similar to existing Collections dropdown)
   - Use `<Collapsible>` component (already imported)
   - Icon: `Settings` from lucide-react
   - Contains: API Keys, Authorized Admins

2. **Add Collection Builder Link**
   - Route: `/admin/collection-builder`
   - Icon: `Wrench` or `Boxes` from lucide-react
   - Show only if: `user?.role === 'superadmin'`
   - Place AFTER Collections dropdown, BEFORE Dev Reset

3. **Update Navigation State**
   - Active link highlighting should work for Collection Builder routes
   - Admin Settings should auto-expand when on API Keys or Authorized Admins pages

### Code Reference Points:

**Existing Collections Dropdown** (lines 163-209 in Sidebar.tsx):
```typescript
<Collapsible
  open={isCollectionsOpen}
  onOpenChange={setIsCollectionsOpen}
>
  <CollapsibleTrigger asChild>
    <Button variant="ghost" className="...">
      <Database className="..." />
      <span>Collections</span>
      <ChevronRight className="..." />
    </Button>
  </CollapsibleTrigger>
  <CollapsibleContent>
    {/* collection links */}
  </CollapsibleContent>
</Collapsible>
```

**Pattern to Follow:**
1. Add state: `const [isAdminSettingsOpen, setIsAdminSettingsOpen] = useState(false)`
2. Auto-expand logic (like lines 69-75)
3. Same styling classes for consistency

---

## Task 2: Create Collection Builder List Page

**File:** `frontend/app/admin/collection-builder/page.tsx` (NEW FILE)

**Purpose:** Display table of all custom collections with CRUD actions

### Features:

1. **Page Header**
   - Title: "Collection Builder"
   - Subtitle: "Create and manage custom database collections"
   - "Create New Collection" button (top-right)

2. **Table Columns:**
   - Name (clickable → edit page)
   - API Name (monospace font, muted color)
   - Fields Count (e.g., "5 fields")
   - Created At (formatted date)
   - Status (badge: "Draft" or "Published")
   - Actions (Edit, Delete buttons)

3. **Empty State:**
   - When no collections exist
   - Icon: `Database` or `Boxes`
   - Text: "No custom collections yet"
   - Subtext: "Create your first collection to get started"
   - CTA button: "Create Collection"

4. **Delete Confirmation:**
   - Use AlertDialog component
   - Warning: "This will delete the collection schema. Data will be preserved."
   - Buttons: Cancel, Delete

### Code Template:

```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Wrench, Plus, Trash2, Edit, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { collectionBuilder } from '@/lib/api';
import { CollectionDefinition } from '@/types';
import { formatDistanceToNow } from 'date-fns';

export default function CollectionBuilderPage() {
  const [collections, setCollections] = useState<CollectionDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Fetch collections
  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      const response = await collectionBuilder.list();
      setCollections(response.data);
    } catch (error) {
      console.error('Failed to load collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await collectionBuilder.delete(deleteId);
      await loadCollections();
      setDeleteId(null);
    } catch (error) {
      console.error('Failed to delete collection:', error);
    }
  };

  // Empty state
  if (!loading && collections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Database className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No custom collections yet</h2>
        <p className="text-muted-foreground mb-6">
          Create your first collection to get started
        </p>
        <Button asChild>
          <Link href="/admin/collection-builder/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Collection
          </Link>
        </Button>
      </div>
    );
  }

  // Table view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Collection Builder</h1>
          <p className="text-muted-foreground">
            Create and manage custom database collections
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/collection-builder/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Collection
          </Link>
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>API Name</TableHead>
              <TableHead>Fields</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {collections.map((collection) => (
              <TableRow key={collection.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/admin/collection-builder/${collection.id}`}
                    className="hover:underline"
                  >
                    {collection.displayName}
                  </Link>
                </TableCell>
                <TableCell>
                  <code className="text-xs text-muted-foreground">
                    {collection.apiName}
                  </code>
                </TableCell>
                <TableCell>{collection.fields.length} fields</TableCell>
                <TableCell>
                  {formatDistanceToNow(new Date(collection.createdAt), {
                    addSuffix: true,
                  })}
                </TableCell>
                <TableCell>
                  <Badge variant={collection.isSystem ? 'secondary' : 'default'}>
                    {collection.isSystem ? 'System' : 'Custom'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/collection-builder/${collection.id}`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteId(collection.id)}
                    disabled={collection.isSystem}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Collection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this collection schema? This action
              cannot be undone. Existing data will be preserved but inaccessible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

### Notes:
- `date-fns` is already installed - use `formatDistanceToNow`
- Use `'use client'` directive (this is a client component)
- Error handling: console.error for now (we'll add toast notifications later)

---

## Task 3: Create Collection Builder Edit/Create Pages

### File 1: `frontend/app/admin/collection-builder/new/page.tsx`

**Purpose:** Placeholder for creating new collections

```typescript
'use client';

import Link from 'next/link';
import { ArrowLeft, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NewCollectionPage() {
  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground">
          Admin
        </Link>
        <span>/</span>
        <Link href="/admin/collection-builder" className="hover:text-foreground">
          Collection Builder
        </Link>
        <span>/</span>
        <span className="text-foreground">New Collection</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/collection-builder">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Create New Collection</h1>
      </div>

      {/* Placeholder */}
      <div className="flex flex-col items-center justify-center min-h-[50vh] border-2 border-dashed rounded-lg p-12 text-center">
        <Database className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Visual Designer Coming Soon</h2>
        <p className="text-muted-foreground max-w-md">
          The drag-and-drop collection builder interface is being developed.
          This will allow you to visually design database schemas.
        </p>
      </div>
    </div>
  );
}
```

### File 2: `frontend/app/admin/collection-builder/[id]/page.tsx`

**Purpose:** Placeholder for editing existing collections

```typescript
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { collectionBuilder } from '@/lib/api';
import { CollectionDefinition } from '@/types';

export default function EditCollectionPage({
  params,
}: {
  params: { id: string };
}) {
  const [collection, setCollection] = useState<CollectionDefinition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCollection();
  }, [params.id]);

  const loadCollection = async () => {
    try {
      const response = await collectionBuilder.get(Number(params.id));
      setCollection(response.data);
    } catch (error) {
      console.error('Failed to load collection:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!collection) {
    return <div>Collection not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground">
          Admin
        </Link>
        <span>/</span>
        <Link href="/admin/collection-builder" className="hover:text-foreground">
          Collection Builder
        </Link>
        <span>/</span>
        <span className="text-foreground">{collection.displayName}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/collection-builder">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Edit: {collection.displayName}</h1>
      </div>

      {/* Placeholder */}
      <div className="flex flex-col items-center justify-center min-h-[50vh] border-2 border-dashed rounded-lg p-12 text-center">
        <Database className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Visual Designer Coming Soon</h2>
        <p className="text-muted-foreground max-w-md">
          The drag-and-drop collection builder interface is being developed.
          This will allow you to visually design database schemas.
        </p>
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm font-mono text-left">
            Current Fields: {collection.fields.length}
            <br />
            API Name: {collection.apiName}
            <br />
            Status: {collection.isSystem ? 'System' : 'Custom'}
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

## Task 4: Add API Client Methods

**File:** `frontend/lib/api.ts`

**Location:** Add after the existing API methods (around line 100+)

```typescript
// Collection Builder API
export const collectionBuilder = {
  list: () => api.get('/api/admin/collection-builder/definitions'),

  get: (id: number) =>
    api.get(`/api/admin/collection-builder/definitions/${id}`),

  create: (data: CollectionDefinition) =>
    api.post('/api/admin/collection-builder/definitions', data),

  update: (id: number, data: Partial<CollectionDefinition>) =>
    api.patch(`/api/admin/collection-builder/definitions/${id}`, data),

  delete: (id: number) =>
    api.delete(`/api/admin/collection-builder/definitions/${id}`),

  previewMigration: (id: number) =>
    api.post(`/api/admin/collection-builder/definitions/${id}/preview-migration`),

  applyMigration: (id: number) =>
    api.post(`/api/admin/collection-builder/definitions/${id}/apply-migration`),
};
```

**Note:** The `api` instance already exists in this file with axios interceptors configured.

---

## Task 5: Add TypeScript Types

**File:** `frontend/types/index.ts`

**Location:** Add at the end of the file

```typescript
// ============================================================================
// Collection Builder Types
// ============================================================================

export interface CollectionDefinition {
  id: number;
  name: string; // Internal name (lowercase, underscored)
  apiName: string; // API endpoint name (e.g., "blog_posts")
  displayName: string; // Human-readable name (e.g., "Blog Posts")
  description?: string;
  icon?: string; // Lucide icon name
  fields: CollectionField[];
  indexes?: CollectionIndex[];
  relationships?: CollectionRelationship[];
  isSystem: boolean; // System collections can't be deleted
  createdBy: number; // User ID
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export type FieldType =
  | 'text' // varchar(255)
  | 'longtext' // text
  | 'richtext' // text (HTML)
  | 'number' // integer or numeric
  | 'date' // date
  | 'datetime' // timestamp
  | 'boolean' // boolean
  | 'enum' // enum type
  | 'json' // jsonb
  | 'relation' // foreign key
  | 'media'; // text (file URL)

export interface CollectionField {
  name: string; // Field name (camelCase in code, snake_case in DB)
  type: FieldType;
  label: string; // Display label
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

export interface FieldValidation {
  min?: number; // Min length (text) or min value (number)
  max?: number; // Max length (text) or max value (number)
  regex?: string; // Validation regex
  errorMessage?: string; // Custom error message
}

export interface RelationConfig {
  targetCollection: string; // Table name of related collection
  relationType: 'one-to-one' | 'one-to-many' | 'many-to-many';
  cascadeDelete?: boolean; // Delete related records on parent delete
  foreignKeyName?: string; // Custom FK column name
}

export interface CollectionIndex {
  name: string; // Index name
  fields: string[]; // Fields to index
  unique: boolean; // Unique constraint?
}

export interface CollectionRelationship {
  fieldName: string; // Field that holds the relation
  targetCollection: string; // Related collection name
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

// Migration preview/application
export interface MigrationPreview {
  sql: string; // Generated SQL
  affectedTables: string[];
  warnings: string[]; // Potential issues
}

export interface MigrationResult {
  success: boolean;
  message: string;
  error?: string;
}
```

---

## 🧪 Testing Checklist

After completing all tasks, verify:

- [ ] TypeScript compiles without errors: `pnpm type-check`
- [ ] ESLint passes: `pnpm lint`
- [ ] Sidebar shows new structure with Admin Settings dropdown
- [ ] Collection Builder link only shows for superadmin users
- [ ] Can navigate to `/admin/collection-builder`
- [ ] List page renders (even with empty data)
- [ ] Can navigate to `/admin/collection-builder/new`
- [ ] Can navigate to `/admin/collection-builder/[id]` (placeholder)
- [ ] All imports resolve correctly (no path errors)
- [ ] Dark mode works correctly on all new pages
- [ ] Mobile responsive (sidebar collapses properly)

---

## 🔄 Integration Points

### What You Need from Backend:
- `GET /api/admin/collection-builder/definitions` endpoint
- Response format: `{ success: true, data: CollectionDefinition[] }`

### What Backend Needs from You:
- TypeScript types (they'll use the same structure)
- API contract (documented in INTEGRATION_POINTS.md)

### When to Integrate:
- After backend has routes working
- Test with mock data first if backend isn't ready
- Update `PROGRESS.md` when ready for integration

---

## 📝 Progress Tracking

**After completing each task:**

1. Update `feature/collection-builder/PROGRESS.md`
2. Mark task as ✅ completed
3. Note any blockers or questions
4. Commit your work to `feature/collection-builder-frontend` branch

---

## 🆘 Help & Resources

### Existing Code to Reference:
- **Sidebar patterns:** `frontend/components/layout/Sidebar.tsx`
- **Table patterns:** `frontend/app/admin/api-keys/page.tsx`
- **CRUD patterns:** `frontend/app/admin/authorized-admins/page.tsx`
- **API patterns:** `frontend/lib/api.ts`
- **Type patterns:** `frontend/types/index.ts`

### shadcn/ui Components to Use:
- `Button`, `Table`, `Badge`, `AlertDialog`
- `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`
- All already installed - just import from `@/components/ui/`

### Icons (lucide-react):
- `Wrench`, `Boxes`, `Database` - Collection Builder
- `Settings` - Admin Settings
- `Plus`, `Edit`, `Trash2` - Actions
- `ArrowLeft` - Back navigation

---

## Task 6: Add Internationalization (i18n) Translations ⭐ NEW

**Files:**
- `frontend/messages/en.json`
- `frontend/messages/pt-BR.json`

**Purpose:** Add missing translations for new sidebar items and improve organization

### Subtasks:

#### 6.1 Add English Translations
**File:** `frontend/messages/en.json`

Add to the appropriate section:
```json
{
  "sidebar": {
    "adminPanel": "Admin Panel",
    "adminSettings": "Admin Settings",
    "collectionBuilder": "Collection Builder",
    "collections": "Collections"
  }
}
```

#### 6.2 Add Brazilian Portuguese Translations
**File:** `frontend/messages/pt-BR.json`

Add to the appropriate section:
```json
{
  "sidebar": {
    "adminPanel": "Painel Administrativo",
    "adminSettings": "Configurações de Administração",
    "collectionBuilder": "Construtor de Coleções",
    "collections": "Coleções"
  }
}
```

#### 6.3 Update Sidebar to Use Translations
**File:** `frontend/components/layout/Sidebar.tsx`

Replace hardcoded strings with translation keys:
- "Admin Settings" → `{t('sidebar.adminSettings')}`
- "Collection Builder" → `{t('sidebar.collectionBuilder')}`
- "Collections" → `{t('sidebar.collections')}`

Import useTranslations at the top:
```typescript
import { useTranslations } from 'next-intl';

// Inside component
const t = useTranslations();
```

#### 6.4 Better Sidebar Organization

**Current structure is good, but make sure:**
- Admin Settings dropdown is visually distinct
- Collection Builder is clearly superadmin-only (maybe add a badge or different styling)
- Collections dropdown shows a count of available collections if possible
- Consistent spacing and indentation

**Notes:**
- The project already uses next-intl for i18n
- Follow existing translation patterns from other sidebar items
- Make sure both English and Portuguese translations are complete
- Test language switching works correctly

---

## 🧪 Testing & Quality Checklist ⭐ IMPORTANT

**Before marking tasks as complete, ALWAYS run:**

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

### Manual Testing
- [ ] Navigate to all new routes
- [ ] Test sidebar navigation
- [ ] Test language switching (en ↔ pt-BR)
- [ ] Verify superadmin-only access works
- [ ] Test in both light and dark mode
- [ ] Test on mobile (responsive sidebar)

**IMPORTANT:** Fix any TypeScript or ESLint errors IMMEDIATELY. Do not proceed to next task with failing checks.

---

## 🚫 Out of Scope (Don't Implement Yet)

These are Phase 2 tasks - **DO NOT** implement now:
- ❌ Visual drag-and-drop designer
- ❌ Field palette with draggable items
- ❌ Relationship visual builder
- ❌ SQL preview modal
- ❌ Migration application logic
- ❌ Rich text editor
- ❌ Media upload component

Just create placeholders for now!

---

## ✅ Summary

**You are building:** Frontend foundation for Collection Builder
**6 main tasks:** Sidebar, list page, create/edit pages, API client, types, i18n translations
**Time estimate:** 5-7 hours
**Coordination:** Update PROGRESS.md, commit to your branch
**Integration:** After backend routes are ready

**Quality requirements:**
- ✅ `pnpm type-check` must pass
- ✅ `pnpm lint` must pass
- ✅ All translations complete (en + pt-BR)
- ✅ Manual testing in both languages

**Questions?** Add them to `DECISIONS.md` or check with the user.

Good luck! 🚀

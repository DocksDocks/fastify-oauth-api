/**
 * Collections Configuration
 *
 * Manual definition of database tables accessible via admin panel
 * Each collection specifies which columns to show, which are searchable, etc.
 */

export interface CollectionColumn {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'enum';
  sortable?: boolean;
  searchable?: boolean;
}

export interface Collection {
  name: string; // Display name
  table: string; // Database table name
  description?: string;
  columns: CollectionColumn[];
  defaultSort?: { column: string; order: 'asc' | 'desc' };
  defaultLimit?: number;
}

/**
 * Available collections for admin panel
 *
 * Add new collections here to make them accessible in the admin UI
 */
export const collections: Collection[] = [
  {
    name: 'Users',
    table: 'users',
    description: 'System users with OAuth authentication',
    columns: [
      { name: 'id', label: 'ID', type: 'number', sortable: true },
      { name: 'email', label: 'Email', type: 'text', sortable: true, searchable: true },
      { name: 'name', label: 'Name', type: 'text', sortable: true, searchable: true },
      { name: 'role', label: 'Role', type: 'enum', sortable: true },
      { name: 'provider', label: 'Provider', type: 'text', sortable: true },
      { name: 'last_login_at', label: 'Last Login', type: 'date', sortable: true },
      { name: 'created_at', label: 'Created', type: 'date', sortable: true },
    ],
    defaultSort: { column: 'created_at', order: 'desc' },
    defaultLimit: 20,
  },
  {
    name: 'Exercises',
    table: 'exercises',
    description: 'Exercise library (system and user-created)',
    columns: [
      { name: 'id', label: 'ID', type: 'number', sortable: true },
      { name: 'name', label: 'Name', type: 'text', sortable: true, searchable: true },
      { name: 'category', label: 'Category', type: 'text', sortable: true },
      { name: 'muscle_group', label: 'Muscle Group', type: 'text', sortable: true },
      { name: 'equipment', label: 'Equipment', type: 'text', sortable: true },
      { name: 'difficulty', label: 'Difficulty', type: 'text', sortable: true },
      { name: 'created_by', label: 'Created By', type: 'number', sortable: true },
      { name: 'created_at', label: 'Created', type: 'date', sortable: true },
    ],
    defaultSort: { column: 'name', order: 'asc' },
    defaultLimit: 20,
  },
  {
    name: 'Workouts',
    table: 'workouts',
    description: 'User workout plans',
    columns: [
      { name: 'id', label: 'ID', type: 'number', sortable: true },
      { name: 'name', label: 'Name', type: 'text', sortable: true, searchable: true },
      { name: 'description', label: 'Description', type: 'text', searchable: true },
      { name: 'user_id', label: 'User ID', type: 'number', sortable: true },
      { name: 'is_public', label: 'Public', type: 'boolean', sortable: true },
      { name: 'created_at', label: 'Created', type: 'date', sortable: true },
      { name: 'updated_at', label: 'Updated', type: 'date', sortable: true },
    ],
    defaultSort: { column: 'created_at', order: 'desc' },
    defaultLimit: 20,
  },
  {
    name: 'API Keys',
    table: 'api_keys',
    description: 'Global API keys for mobile apps and admin panel',
    columns: [
      { name: 'id', label: 'ID', type: 'number', sortable: true },
      { name: 'name', label: 'Name', type: 'text', sortable: true, searchable: true },
      { name: 'created_by', label: 'Created By', type: 'number', sortable: true },
      { name: 'created_at', label: 'Created', type: 'date', sortable: true },
      { name: 'updated_at', label: 'Updated', type: 'date', sortable: true },
      { name: 'revoked_at', label: 'Revoked', type: 'date', sortable: true },
    ],
    defaultSort: { column: 'created_at', order: 'desc' },
    defaultLimit: 10,
  },
  {
    name: 'Refresh Tokens',
    table: 'refresh_tokens',
    description: 'JWT refresh tokens for user sessions',
    columns: [
      { name: 'id', label: 'ID', type: 'number', sortable: true },
      { name: 'user_id', label: 'User ID', type: 'number', sortable: true },
      { name: 'family_id', label: 'Family ID', type: 'text', sortable: true },
      { name: 'is_revoked', label: 'Revoked', type: 'boolean', sortable: true },
      { name: 'expires_at', label: 'Expires', type: 'date', sortable: true },
      { name: 'created_at', label: 'Created', type: 'date', sortable: true },
    ],
    defaultSort: { column: 'created_at', order: 'desc' },
    defaultLimit: 20,
  },
];

/**
 * Get collection configuration by table name
 */
export function getCollectionByTable(table: string): Collection | undefined {
  return collections.find((c) => c.table === table);
}

/**
 * Get list of all available collection names
 */
export function getAvailableCollections(): { name: string; table: string; description?: string }[] {
  return collections.map((c) => ({
    name: c.name,
    table: c.table,
    description: c.description,
  }));
}

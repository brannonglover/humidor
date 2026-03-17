/**
 * Centralized database module for Cavaro app.
 * Uses a single `cigars` table with a `collection` column instead of
 * three separate tables (cavaro, likes, dislikes).
 * cigar_catalog: local cache/fallback when API is unavailable (see api/catalog.js).
 * Primary catalog source is PostgreSQL via API.
 */
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'cigars.db';
export const db = SQLite.openDatabaseSync(DB_NAME);

const COLLECTIONS = {
  CAVARO: 'cavaro',
  LIKES: 'likes',
  DISLIKES: 'dislikes',
};

export { COLLECTIONS };

/**
 * Creates tables and migrates data. Catalog is fetched from API; local cigar_catalog is offline cache.
 */
export async function initDatabase() {
  await db.withTransactionAsync(async () => {
    // Create cigar catalog table (central database users select from)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cigar_catalog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brand TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        wrapper TEXT,
        binder TEXT,
        filler TEXT,
        length TEXT NOT NULL,
        image TEXT,
        UNIQUE(brand, name, length)
      )
    `);
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_catalog_brand ON cigar_catalog(brand)
    `);
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_catalog_brand_name ON cigar_catalog(brand, name)
    `);
    const catalogInfo = await db.getAllAsync('PRAGMA table_info(cigar_catalog)');
    if (!catalogInfo.some((c) => c.name === 'line')) {
      await db.execAsync('ALTER TABLE cigar_catalog ADD COLUMN line TEXT');
    }

    // Create user cigars table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cigars (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brand TEXT,
        name TEXT,
        description TEXT,
        wrapper TEXT,
        binder TEXT,
        filler TEXT,
        length TEXT,
        image TEXT,
        quantity INTEGER NOT NULL DEFAULT 1,
        collection TEXT NOT NULL DEFAULT 'cavaro' CHECK(collection IN ('cavaro', 'likes', 'dislikes'))
      )
    `);
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_cigars_collection ON cigars(collection)
    `);

    // Catalog comes from API (PostgreSQL). Local table is cache/offline fallback.
    // Seed server: cd server && npm run init-catalog

    // Add quantity column if missing (migration for existing DBs)
    const tableInfo = await db.getAllAsync('PRAGMA table_info(cigars)');
    const hasQuantity = tableInfo.some((col) => col.name === 'quantity');
    if (!hasQuantity) {
      await db.execAsync('ALTER TABLE cigars ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1');
    }

    // Add is_favorite column if missing (migration for existing DBs)
    const tableInfo2 = await db.getAllAsync('PRAGMA table_info(cigars)');
    const hasIsFavorite = tableInfo2.some((col) => col.name === 'is_favorite');
    if (!hasIsFavorite) {
      await db.execAsync('ALTER TABLE cigars ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0');
      await db.execAsync("UPDATE cigars SET is_favorite = 1 WHERE collection = 'likes'");
    }

    // Add favorite notes columns if missing
    const tableInfo3 = await db.getAllAsync('PRAGMA table_info(cigars)');
    const colNames = new Set(tableInfo3.map((c) => c.name));
    const noteCols = ['favorite_notes', 'flavor_profile', 'construction_quality', 'smoked_date', 'flavor_changes'];
    for (const col of noteCols) {
      if (!colNames.has(col)) {
        await db.execAsync(`ALTER TABLE cigars ADD COLUMN ${col} TEXT`);
      }
    }

    // Add strength_profile column if missing (JSON: { thirds: [{ strength, flavors }] })
    const tableInfo4 = await db.getAllAsync('PRAGMA table_info(cigars)');
    const hasStrengthProfile = tableInfo4.some((c) => c.name === 'strength_profile');
    if (!hasStrengthProfile) {
      await db.execAsync('ALTER TABLE cigars ADD COLUMN strength_profile TEXT');
    }

    // Add date_added column if missing (ISO date YYYY-MM-DD when cigar entered cavaro)
    const tableInfo5 = await db.getAllAsync('PRAGMA table_info(cigars)');
    const hasDateAdded = tableInfo5.some((c) => c.name === 'date_added');
    if (!hasDateAdded) {
      await db.execAsync('ALTER TABLE cigars ADD COLUMN date_added TEXT');
    }

    // Add line column if missing (sub-brand / series, e.g. Black Market)
    const tableInfo6 = await db.getAllAsync('PRAGMA table_info(cigars)');
    const hasLine = tableInfo6.some((c) => c.name === 'line');
    if (!hasLine) {
      await db.execAsync('ALTER TABLE cigars ADD COLUMN line TEXT');
    }

    // Migration: humidor -> cavaro collection (recreate table to update CHECK constraint)
    const cigarsSchema = await db.getFirstAsync("SELECT sql FROM sqlite_master WHERE type='table' AND name='cigars'");
    if (cigarsSchema?.sql?.includes("'humidor'")) {
      await db.execAsync(`
        CREATE TABLE cigars_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          brand TEXT,
          name TEXT,
          description TEXT,
          wrapper TEXT,
          binder TEXT,
          filler TEXT,
          length TEXT,
          image TEXT,
          quantity INTEGER NOT NULL DEFAULT 1,
          collection TEXT NOT NULL DEFAULT 'cavaro' CHECK(collection IN ('cavaro', 'likes', 'dislikes')),
          is_favorite INTEGER NOT NULL DEFAULT 0,
          favorite_notes TEXT,
          flavor_profile TEXT,
          construction_quality TEXT,
          smoked_date TEXT,
          flavor_changes TEXT,
          strength_profile TEXT,
          date_added TEXT,
          line TEXT
        )
      `);
      await db.execAsync(`
        INSERT INTO cigars_new SELECT id, brand, name, description, wrapper, binder, filler, length, image, quantity,
          CASE WHEN collection='humidor' THEN 'cavaro' ELSE collection END,
          COALESCE(is_favorite, 0), favorite_notes, flavor_profile, construction_quality, smoked_date, flavor_changes, strength_profile, date_added, line
        FROM cigars
      `);
      await db.execAsync('DROP TABLE cigars');
      await db.execAsync('ALTER TABLE cigars_new RENAME TO cigars');
      await db.execAsync('CREATE INDEX IF NOT EXISTS idx_cigars_collection ON cigars(collection)');
    }

    // Create smoke_history table (tracks when each cigar was smoked, for quantity > 1)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS smoke_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cigar_id INTEGER NOT NULL,
        smoked_at TEXT NOT NULL,
        FOREIGN KEY (cigar_id) REFERENCES cigars(id)
      )
    `);
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_smoke_history_cigar ON smoke_history(cigar_id)
    `);

    // Check if old tables exist (migration from previous schema)
    const humidorTable = await db.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='humidor'"
    );
    const hasOldTables = !!humidorTable;

    if (hasOldTables) {
      // Migrate data from old tables to new unified table
      await db.execAsync(`
        INSERT INTO cigars (brand, name, description, wrapper, binder, filler, length, image, collection)
        SELECT brand, name, description, wrapper, binder, filler, length, image, 'cavaro' FROM humidor
      `);
      await db.execAsync(`
        INSERT INTO cigars (brand, name, description, wrapper, binder, filler, length, image, collection)
        SELECT brand, name, description, wrapper, binder, filler, length, image, 'likes' FROM likes
      `);
      await db.execAsync(`
        INSERT INTO cigars (brand, name, description, wrapper, binder, filler, length, image, collection)
        SELECT brand, name, description, wrapper, binder, filler, length, image, 'dislikes' FROM dislikes
      `);

      // Drop old tables
      await db.execAsync('DROP TABLE humidor');
      await db.execAsync('DROP TABLE likes');
      await db.execAsync('DROP TABLE dislikes');
    }
  });
}

/**
 * Search user cigars by taste profile keywords.
 * Searches: flavor_profile, favorite_notes, flavor_changes, strength_profile (flavors JSON),
 * description, wrapper, binder, filler.
 * Keywords are OR'd together (any match).
 */
export async function searchCigarsByTaste(keywords) {
  if (!keywords?.length) return [];
  const terms = keywords
    .map((k) => String(k).trim().toLowerCase())
    .filter((k) => k.length > 0);
  if (terms.length === 0) return [];

  const conditions = [];
  const params = [];
  for (const term of terms) {
    const like = `%${term}%`;
    conditions.push(
      `(COALESCE(flavor_profile,'') LIKE ? OR COALESCE(favorite_notes,'') LIKE ? OR ` +
        `COALESCE(flavor_changes,'') LIKE ? OR COALESCE(strength_profile,'') LIKE ? OR ` +
        `COALESCE(description,'') LIKE ? OR COALESCE(wrapper,'') LIKE ? OR ` +
        `COALESCE(binder,'') LIKE ? OR COALESCE(filler,'') LIKE ?)`
    );
    params.push(like, like, like, like, like, like, like, like);
  }
  const whereClause = conditions.join(' OR ');
  const rows = await db.getAllAsync(
    `SELECT * FROM cigars WHERE ${whereClause} ORDER BY collection = 'likes' DESC, brand, name`,
    params.flat()
  );
  return rows ?? [];
}

/**
 * Top N cigars from user's reviews (favorites with notes).
 * Ranks by: (1) is_favorite, (2) number of review fields filled, (3) smoke count.
 */
export async function getTopReviewedCigars(limit = 5) {
  const rows = await db.getAllAsync(`
    SELECT c.*,
      (CASE WHEN c.is_favorite = 1 THEN 1 ELSE 0 END) +
      (CASE WHEN c.favorite_notes IS NOT NULL AND c.favorite_notes != '' THEN 1 ELSE 0 END) +
      (CASE WHEN c.flavor_profile IS NOT NULL AND c.flavor_profile != '' THEN 1 ELSE 0 END) +
      (CASE WHEN c.strength_profile IS NOT NULL AND c.strength_profile != '' THEN 1 ELSE 0 END) +
      (CASE WHEN c.construction_quality IS NOT NULL AND c.construction_quality != '' THEN 1 ELSE 0 END) +
      (CASE WHEN c.flavor_changes IS NOT NULL AND c.flavor_changes != '' THEN 1 ELSE 0 END) +
      COALESCE((SELECT COUNT(*) FROM smoke_history sh WHERE sh.cigar_id = c.id), 0) AS review_score
    FROM cigars c
    WHERE (c.collection = 'likes' OR (c.collection = 'cavaro' AND c.is_favorite = 1))
      AND (
        (c.favorite_notes IS NOT NULL AND c.favorite_notes != '')
        OR (c.flavor_profile IS NOT NULL AND c.flavor_profile != '')
        OR (c.strength_profile IS NOT NULL AND c.strength_profile != '')
      )
    ORDER BY review_score DESC, c.brand, c.name
    LIMIT ?
  `, [limit]);
  return rows ?? [];
}

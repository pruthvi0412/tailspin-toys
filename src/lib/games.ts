/**
 * Game data-access helpers for the Tailspin Toys Crowd Funding platform.
 * Provides functions to retrieve game information from the database, including filtering.
 */
import { eq, asc, and } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game } from '../types/game';

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

/** 
 * Returns all games ordered by title.
 * 
 * @param db - The Drizzle database client.
 * @returns A promise that resolves to an array of all games.
 */
export async function getAllGames(db: Database): Promise<Game[]> {
    const rows = await baseGamesQuery(db).orderBy(asc(games.title));
    return rows.map(mapGame);
}

/**
 * Filter options for games.
 */
export type GameFilters = {
    categoryId?: number;
    publisherId?: number;
};

/** 
 * Returns games matching the specified filters, ordered by title.
 * 
 * @param db - The Drizzle database client.
 * @param filters - The category and publisher filters.
 * @returns A promise that resolves to an array of filtered games.
 */
export async function getFilteredGames(db: Database, filters: GameFilters): Promise<Game[]> {
    const conditions = [];
    if (filters.categoryId !== undefined) {
        conditions.push(eq(games.categoryId, filters.categoryId));
    }
    if (filters.publisherId !== undefined) {
        conditions.push(eq(games.publisherId, filters.publisherId));
    }

    let query = baseGamesQuery(db);
    if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
    }
    
    const rows = await query.orderBy(asc(games.title));
    return rows.map(mapGame);
}

/** 
 * Returns all game ids ordered by title.
 * 
 * @param db - The Drizzle database client.
 * @returns A promise that resolves to an array of game ids.
 */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/** 
 * Returns a single game by id, or null when it does not exist.
 * 
 * @param db - The Drizzle database client.
 * @param id - The game id.
 * @returns A promise that resolves to the game or null.
 */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}

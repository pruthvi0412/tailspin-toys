import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
    getFilteredGames,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('filters games by category and publisher', async () => {
        // Setup additional data for filtering
        const [cat1] = await db.insert(categories).values({ name: 'Cat 1' }).returning();
        const [cat2] = await db.insert(categories).values({ name: 'Cat 2' }).returning();
        const [pub1] = await db.insert(publishers).values({ name: 'Pub 1' }).returning();
        const [pub2] = await db.insert(publishers).values({ name: 'Pub 2' }).returning();

        await db.insert(games).values([
            { title: 'G1', description: 'd', categoryId: cat1.id, publisherId: pub1.id },
            { title: 'G2', description: 'd', categoryId: cat1.id, publisherId: pub2.id },
            { title: 'G3', description: 'd', categoryId: cat2.id, publisherId: pub1.id },
            { title: 'G4', description: 'd', categoryId: cat2.id, publisherId: pub2.id },
        ]);

        const filterCat1 = await getFilteredGames(db, { categoryId: cat1.id });
        expect(filterCat1.map(g => g.title)).toEqual(['G1', 'G2']);

        const filterPub2 = await getFilteredGames(db, { publisherId: pub2.id });
        expect(filterPub2.map(g => g.title)).toEqual(['G2', 'G4']);

        const filterBoth = await getFilteredGames(db, { categoryId: cat2.id, publisherId: pub1.id });
        expect(filterBoth.map(g => g.title)).toEqual(['G3']);
    });
});

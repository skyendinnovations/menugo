import { Router } from 'express';
import { db } from '../db';
import { user as userTable, session as sessionTable } from '../db/schemas/auth.schema';
import { restaurants as restaurantsTable, restaurantMembers as restaurantMembersTable } from '../db/schemas';
import { randomUUID } from 'crypto';

const router = Router();

// Create a test user and session, return token and userId
router.post('/create-user', async (req, res) => {
    try {
        const email = req.body.email || `test+${Date.now()}@example.com`;
        const userId = req.body.userId || randomUUID();
        const sessionId = req.body.sessionId || randomUUID();
        const token = req.body.token || `test-token-${Date.now()}`;

        await db.insert(userTable).values({ id: userId, name: 'Test User', email }).onConflictDoNothing();
        await db.insert(sessionTable).values({ id: sessionId, token, expiresAt: new Date(Date.now() + 3600_000), userId }).onConflictDoNothing();

        res.json({ success: true, userId, sessionId, token });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Delete a test user and session and any created restaurants
router.post('/delete-user', async (req, res) => {
    try {
        const { userId, token } = req.body;
        if (!userId && !token) return res.status(400).json({ success: false, message: 'userId or token required' });

        if (token) {
            const [sess] = await db.select().from(sessionTable).where(sessionTable.token.eq(token));
            if (sess) {
                await db.delete(restaurantMembersTable).where(restaurantMembersTable.userId.eq(sess.userId));
                await db.delete(restaurantsTable).where(restaurantsTable.id.in(db.select().from(restaurantMembersTable).where(restaurantMembersTable.userId.eq(sess.userId)).select(restaurantMembersTable.restaurantId)));
                await db.delete(sessionTable).where(sessionTable.token.eq(token));
                await db.delete(userTable).where(userTable.id.eq(sess.userId));
                return res.json({ success: true });
            }
        }

        if (userId) {
            await db.delete(restaurantMembersTable).where(restaurantMembersTable.userId.eq(userId));
            await db.delete(restaurantsTable).where(restaurantsTable.id.in(db.select().from(restaurantMembersTable).where(restaurantMembersTable.userId.eq(userId)).select(restaurantMembersTable.restaurantId)));
            await db.delete(sessionTable).where(sessionTable.userId.eq(userId));
            await db.delete(userTable).where(userTable.id.eq(userId));
            return res.json({ success: true });
        }

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;

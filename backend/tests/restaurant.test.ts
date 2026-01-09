// Integration tests that use the real auth endpoints (no direct DB access)

import request from 'supertest';
import app from '../index';

describe('Restaurants API (E2E with Better Auth)', () => {
    const email = `test+${Date.now()}@example.com`;
    const password = 'Password123!';
    let token: string | null = null;
    let userId: string | null = null;
    let createdRestaurantId: number | null = null;

    function extractToken(body: any): string | null {
        return (
            body?.session?.token ||
            body?.data?.session?.token ||
            body?.token ||
            body?.data?.token ||
            null
        );
    }

    beforeAll(async () => {
        // Sign up the user via the public auth endpoint
        const signUpRes = await request(app).post('/api/auth/sign-up/email').send({ email, password, name: 'Test User' });

        // Try to extract user id from sign up response
        userId = signUpRes.body?.user?.id || signUpRes.body?.data?.user?.id || null;

        // Sign in to obtain a session token
        const signInRes = await request(app).post('/api/auth/sign-in/email').send({ email, password });
        token = extractToken(signInRes.body);

        if (!token) {
            throw new Error('Failed to obtain auth token from sign-in response');
        }
    });

    afterAll(async () => {
        try {
            // Delete created restaurant via API if exists
            if (createdRestaurantId && token) {
                await request(app).delete(`/api/restaurants/${createdRestaurantId}`).set('Authorization', `Bearer ${token}`);
            }

            // Delete user via API
            if (userId && token) {
                await request(app).delete(`/api/users/${userId}`).set('Authorization', `Bearer ${token}`);
            }
        } catch (e) {
            // ignore cleanup errors
        }
    });

    it('should create a restaurant (POST /api/restaurants) using auth token', async () => {
        const payload = {
            name: 'Restaurant Name',
            slug: `restaurant-${Date.now()}`,
            workflowSettings: { hasKitchenView: true, orderFlow: ['received'] },
        };

        const res = await request(app)
            .post('/api/restaurants')
            .set('Authorization', `Bearer ${token}`)
            .send(payload)
            .expect(201);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('id');
        createdRestaurantId = res.body.data.id;
    });

    it('should list restaurants (GET /api/restaurants)', async () => {
        const res = await request(app).get('/api/restaurants').set('Authorization', `Bearer ${token}`).expect(200);
        expect(res.body).toHaveProperty('success', true);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should get a restaurant by id (GET /api/restaurants/:id)', async () => {
        const id = createdRestaurantId as number;
        const res = await request(app).get(`/api/restaurants/${id}`).set('Authorization', `Bearer ${token}`).expect(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toHaveProperty('id', id);
    });

    it('should update a restaurant (PUT /api/restaurants/:id)', async () => {
        const id = createdRestaurantId as number;
        const res = await request(app)
            .put(`/api/restaurants/${id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Updated' })
            .expect(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toHaveProperty('name', 'Updated');
    });

    it('should delete a restaurant (DELETE /api/restaurants/:id)', async () => {
        const id = createdRestaurantId as number;
        const res = await request(app).delete(`/api/restaurants/${id}`).set('Authorization', `Bearer ${token}`).expect(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toHaveProperty('id', id);
        createdRestaurantId = null;
    });
});

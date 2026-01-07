import { userRepository } from '../repositories/user.repository';
import { user } from '../db/schemas/auth.schema';
import { AppError } from '../types';
import type { PaginationParams } from '../types';

export class UserService {
    async getAllUsers(pagination?: PaginationParams) {
        try {
            const result = await userRepository.findAll(pagination);
            return result;
        } catch (error) {
            throw new AppError(500, 'Failed to fetch users');
        }
    }

    async getUserById(id: string) {
        const user = await userRepository.findById(id);

        if (!user) {
            throw new AppError(404, 'User not found');
        }

        return user;
    }

    async createUser(data: {
        name: string;
        email: string;
        password?: string;
    }) {
        // Check if user already exists
        const existingUser = await userRepository.findByEmail(data.email);

        if (existingUser) {
            throw new AppError(409, 'User with this email already exists');
        }

        // TODO: Hash password
        // const hashedPassword = await bcrypt.hash(data.password, 10);

        const newUser = await userRepository.create({
            id: crypto.randomUUID(),
            name: data.name,
            email: data.email,
            emailVerified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        return newUser;
    }

    async updateUser(id: string, data: Partial<typeof user.$inferInsert>) {
        const user = await userRepository.findById(id);

        if (!user) {
            throw new AppError(404, 'User not found');
        }

        // If email is being updated, check if it's already taken
        if (data.email && data.email !== user.email) {
            const existingUser = await userRepository.findByEmail(data.email);
            if (existingUser) {
                throw new AppError(409, 'Email already in use');
            }
        }

        const updatedUser = await userRepository.update(id, data);
        return updatedUser;
    }

    async deleteUser(id: string) {
        const user = await userRepository.findById(id);

        if (!user) {
            throw new AppError(404, 'User not found');
        }

        await userRepository.delete(id);
        return { message: 'User deleted successfully' };
    }

    async searchUsers(query: string, pagination?: PaginationParams) {
        const result = await userRepository.search(query, pagination);
        return result;
    }

    async banUser(id: string) {
        const user = await this.getUserById(id);

        if (user.banned) {
            throw new AppError(400, 'User is already banned');
        }

        const updatedUser = await userRepository.update(id, { banned: true });
        return updatedUser;
    }

    async unbanUser(id: string) {
        const user = await this.getUserById(id);

        if (!user.banned) {
            throw new AppError(400, 'User is not banned');
        }

        const updatedUser = await userRepository.update(id, { banned: false });
        return updatedUser;
    }
}

export const userService = new UserService();

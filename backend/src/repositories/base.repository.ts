// Base repository interface for common CRUD operations
export interface IRepository<T> {
    findAll(pagination?: any): Promise<{ data: T[]; total: number }>;
    findById(id: string): Promise<T | null>;
    create(data: any): Promise<T>;
    update(id: string, data: any): Promise<T | null>;
    delete(id: string): Promise<T | null>;
}

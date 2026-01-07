// Base service interface for business logic
export interface IService<T> {
    getAll(pagination?: any): Promise<{ data: T[]; total: number }>;
    getById(id: string): Promise<T>;
    create(data: any): Promise<T>;
    update(id: string, data: any): Promise<T>;
    delete(id: string): Promise<{ message: string }>;
}

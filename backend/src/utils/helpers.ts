export const asyncHandler = (
    fn: Function
) => (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateId = () => crypto.randomUUID();

export const sanitizeEmail = (email: string) => email.toLowerCase().trim();

export const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    banned: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface SignInData {
    email: string;
    password: string;
}

export interface SignUpData {
    name: string;
    email: string;
    password: string;
    role?: "user" | "admin";
}

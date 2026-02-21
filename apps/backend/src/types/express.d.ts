declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
      subscription?: {
        planSlug: string;
        active: boolean;
        interval: string | null;
        expiresAt: string | null;
      };
    }
  }
}

export {};

import { useState, useEffect, useCallback } from "react";
import { authClient, sessionManager, getSession } from "../auth-client";

interface User {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    createdAt: string;
    updatedAt: string;
    role: string;
    banned: boolean;
}

interface SessionData {
    user: User | null;
    session?: any;
}

interface UseSessionResult {
    data: SessionData | null;
    error: Error | null;
    isPending: boolean;
    isRefetching: boolean;
    refetch: () => Promise<void>;
}

export function useAuth(): UseSessionResult {
    const [data, setData] = useState<SessionData | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [isPending, setIsPending] = useState(true);
    const [isRefetching, setIsRefetching] = useState(false);

    const fetchSession = useCallback(async (isRefetch = false) => {
        if (isRefetch) {
            setIsRefetching(true);
        } else {
            setIsPending(true);
        }

        try {
            // First check manual storage for immediate response
            const stored = sessionManager.getStoredSession();
            if (stored?.user) {
                setData({ user: stored.user, session: stored });
            }

            // Then try to get fresh session from server
            const result = await getSession();
            if (result.data?.user) {
                setData({ user: result.data.user, session: result.data.session });
                // Update manual storage with fresh data
                sessionManager.saveSession({ user: result.data.user });
            } else if (stored?.user) {
                // Keep using stored data if server doesn't return anything
                setData({ user: stored.user, session: stored });
            } else {
                setData(null);
            }
            setError(null);
        } catch (e) {
            setError(e as Error);
            // Still use stored session on error
            const stored = sessionManager.getStoredSession();
            if (stored?.user) {
                setData({ user: stored.user, session: stored });
            }
        } finally {
            setIsPending(false);
            setIsRefetching(false);
        }
    }, []);

    useEffect(() => {
        fetchSession();
    }, [fetchSession]);

    const refetch = useCallback(async () => {
        await fetchSession(true);
    }, [fetchSession]);

    return { data, error, isPending, isRefetching, refetch };
}

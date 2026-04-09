import { api } from "@/lib/api";

type StoredUser = {
  id?: string;
  name?: string;
  email?: string;
  token?: string;
};

type RefreshResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

let refreshSessionPromise: Promise<StoredUser | null> | null = null;

export const getStoredUser = (): StoredUser | null => {
  const rawUser = localStorage.getItem("user");
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser) as StoredUser;
  } catch {
    localStorage.removeItem("user");
    return null;
  }
};

export const storeUser = (user: StoredUser) => {
  localStorage.setItem("user", JSON.stringify(user));
};

export const clearStoredUser = () => {
  localStorage.removeItem("user");
};

export const refreshSession = async (): Promise<StoredUser | null> => {
  if (!refreshSessionPromise) {
    refreshSessionPromise = api
      .post<RefreshResponse>("/api/auth/refresh")
      .then(({ data }) => {
        const nextUser = { ...data.user, token: data.token };
        storeUser(nextUser);
        return nextUser;
      })
      .catch(() => {
        clearStoredUser();
        return null;
      })
      .finally(() => {
        refreshSessionPromise = null;
      });
  }

  return refreshSessionPromise;
};

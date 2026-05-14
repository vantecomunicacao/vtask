/** localStorage seguro — retorna fallback se indisponível (modo privado, iOS, quota excedida). */
export const storage = {
    get(key: string): string | null {
        try { return localStorage.getItem(key); } catch { return null; }
    },
    set(key: string, value: string): void {
        try { localStorage.setItem(key, value); } catch { /* quota exceeded or unavailable */ }
    },
    getJSON<T>(key: string, fallback: T): T {
        try {
            const raw = localStorage.getItem(key);
            return raw ? (JSON.parse(raw) as T) : fallback;
        } catch { return fallback; }
    },
    setJSON(key: string, value: unknown): void {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota exceeded or unavailable */ }
    },
};

import { useCallback, useEffect, useRef, useState } from "react";

type PersistStorage = "local" | "session";

type UsePersistentDraftOptions<T> = {
  storageKey: string | null | undefined;
  initialValue: T;
  enabled?: boolean;
  storage?: PersistStorage;
};

const getStore = (storage: PersistStorage) => {
  if (typeof window === "undefined") return null;
  try {
    return storage === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
};

/**
 * Synchronous, bulletproof draft persistence.
 * - Writes to storage on every setDraft call (no debounce, no loss on quick navigation).
 * - Reads once per storageKey change. If a draft exists, it wins over initialValue.
 * - Never overwrites an existing draft with a fresh initialValue (e.g. DB refetch).
 */
export function usePersistentDraft<T>({
  storageKey,
  initialValue,
  enabled = true,
  storage = "local",
}: UsePersistentDraftOptions<T>) {
  const initialRef = useRef(initialValue);
  initialRef.current = initialValue;

  const readInitial = (): { value: T; restored: boolean } => {
    if (!enabled || !storageKey) return { value: initialValue, restored: false };
    const store = getStore(storage);
    try {
      let raw = store?.getItem(storageKey) ?? null;
      if (!raw && storage === "local") {
        // Migrate legacy sessionStorage drafts.
        const legacy = window.sessionStorage.getItem(storageKey);
        if (legacy) {
          raw = legacy;
          store?.setItem(storageKey, legacy);
        }
      }
      if (raw) return { value: JSON.parse(raw) as T, restored: true };
    } catch {
      // ignore
    }
    return { value: initialValue, restored: false };
  };

  const first = useRef(readInitial());
  const [draft, setDraftState] = useState<T>(first.current.value);
  const [hasStoredDraft, setHasStoredDraft] = useState(first.current.restored);
  const lastKeyRef = useRef<string | null | undefined>(storageKey);

  // If storageKey changes (e.g. companyId arrives), re-read from storage.
  useEffect(() => {
    if (lastKeyRef.current === storageKey) return;
    lastKeyRef.current = storageKey;
    const { value, restored } = readInitial();
    setDraftState(value);
    setHasStoredDraft(restored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, enabled, storage]);

  const writeStorage = useCallback(
    (value: T) => {
      if (!enabled || !storageKey) return;
      const store = getStore(storage);
      try {
        store?.setItem(storageKey, JSON.stringify(value));
        setHasStoredDraft(true);
      } catch {
        // ignore quota / unavailable storage
      }
    },
    [enabled, storageKey, storage],
  );

  const setDraft = useCallback(
    (next: T | ((current: T) => T)) => {
      setDraftState((current) => {
        const computed = typeof next === "function" ? (next as (c: T) => T)(current) : next;
        writeStorage(computed);
        return computed;
      });
    },
    [writeStorage],
  );

  const clearDraft = useCallback(() => {
    if (!storageKey) return;
    const store = getStore(storage);
    try {
      store?.removeItem(storageKey);
      window.sessionStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    setHasStoredDraft(false);
  }, [storageKey, storage]);

  // Flush on tab hide / unload as a final safety net.
  useEffect(() => {
    if (!enabled || !storageKey) return;
    const flush = () => writeStorage(draft);
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [enabled, storageKey, draft, writeStorage]);

  // Reset draft to a new external value (e.g. after a successful save).
  const resetDraft = useCallback((value: T) => {
    setDraftState(value);
  }, []);

  return { draft, setDraft, resetDraft, hydrated: true, hasStoredDraft, clearDraft };
}

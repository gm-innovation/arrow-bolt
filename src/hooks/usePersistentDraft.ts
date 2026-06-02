import { useCallback, useEffect, useRef, useState } from "react";

type PersistStorage = "local" | "session";

type UsePersistentDraftOptions<T> = {
  storageKey: string | null | undefined;
  initialValue: T;
  enabled?: boolean;
  storage?: PersistStorage;
  debounceMs?: number;
};

const getStore = (storage: PersistStorage) => {
  if (typeof window === "undefined") return null;
  try {
    return storage === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
};

export function usePersistentDraft<T>({
  storageKey,
  initialValue,
  enabled = true,
  storage = "local",
  debounceMs = 250,
}: UsePersistentDraftOptions<T>) {
  const [draft, setDraftState] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);
  const [hasStoredDraft, setHasStoredDraft] = useState(false);
  const skipNextPersistRef = useRef(false);

  useEffect(() => {
    if (!enabled || !storageKey) {
      setDraftState(initialValue);
      setHydrated(false);
      setHasStoredDraft(false);
      return;
    }

    const store = getStore(storage);
    let restored = false;

    try {
      let raw = store?.getItem(storageKey);
      if (!raw && storage === "local") {
        raw = window.sessionStorage.getItem(storageKey);
        if (raw) store?.setItem(storageKey, raw);
      }
      if (raw) {
        setDraftState(JSON.parse(raw) as T);
        restored = true;
      } else {
        setDraftState(initialValue);
      }
    } catch {
      setDraftState(initialValue);
    }

    setHasStoredDraft(restored);
    setHydrated(true);
    skipNextPersistRef.current = true;
  }, [enabled, storageKey, storage, initialValue]);

  useEffect(() => {
    if (!enabled || !storageKey || !hydrated) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }

    const store = getStore(storage);
    const timeout = window.setTimeout(() => {
      try {
        store?.setItem(storageKey, JSON.stringify(draft));
        setHasStoredDraft(true);
      } catch {
        // Storage can be unavailable/full; the caller still keeps in-memory state.
      }
    }, debounceMs);

    return () => window.clearTimeout(timeout);
  }, [enabled, storageKey, storage, hydrated, draft, debounceMs]);

  const setDraft = useCallback((next: T | ((current: T) => T)) => {
    setDraftState((current) => (typeof next === "function" ? (next as (current: T) => T)(current) : next));
  }, []);

  const clearDraft = useCallback(() => {
    if (!storageKey) return;
    const store = getStore(storage);
    try {
      store?.removeItem(storageKey);
    } catch {
      // ignore
    }
    setHasStoredDraft(false);
  }, [storageKey, storage]);

  return { draft, setDraft, hydrated, hasStoredDraft, clearDraft };
}
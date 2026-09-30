export type Memory = {
  id: string;
  title: string;
  description: string;
  category: string;
  createdAt: string;
  isFavorite: boolean;
  isRetainedInAiMemory: boolean;
};

export type WishlistItem = {
  id: string;
  title: string;
  category: string;
  notes: string;
  createdAt: string;
  isCompleted: boolean;
  isSharedWithAi: boolean;
};

export type MoodEntry = {
  id: string;
  mood: string;
  note: string;
  createdAt: string;
};

const MEMORY_KEY = "yama-memories";
const WISHLIST_KEY = "yama-wishlist";
const MOOD_HISTORY_KEY = "yama-mood-history";

function read<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getMemories() {
  return read<Memory[]>(MEMORY_KEY, []);
}

export function saveMemory(input: Omit<Memory, "id" | "createdAt">) {
  const memory: Memory = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const next = [memory, ...getMemories()];
  write(MEMORY_KEY, next);
  return memory;
}

export function updateMemory(id: string, patch: Partial<Memory>) {
  const next = getMemories().map((item) => item.id === id ? { ...item, ...patch } : item);
  write(MEMORY_KEY, next);
  return next;
}

export function deleteMemory(id: string) {
  const next = getMemories().filter((item) => item.id !== id);
  write(MEMORY_KEY, next);
  return next;
}

export function getWishlist() {
  return read<WishlistItem[]>(WISHLIST_KEY, []);
}

export function saveWishlistItem(input: Omit<WishlistItem, "id" | "createdAt">) {
  const item: WishlistItem = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const next = [item, ...getWishlist()];
  write(WISHLIST_KEY, next);
  return item;
}

export function updateWishlistItem(id: string, patch: Partial<WishlistItem>) {
  const next = getWishlist().map((item) => item.id === id ? { ...item, ...patch } : item);
  write(WISHLIST_KEY, next);
  return next;
}

export function deleteWishlistItem(id: string) {
  const next = getWishlist().filter((item) => item.id !== id);
  write(WISHLIST_KEY, next);
  return next;
}

export function getMoodHistory() {
  return read<MoodEntry[]>(MOOD_HISTORY_KEY, []);
}

export function addMoodEntry(mood: string, note = "") {
  const entry: MoodEntry = {
    id: crypto.randomUUID(),
    mood,
    note,
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...getMoodHistory()].slice(0, 30);
  write(MOOD_HISTORY_KEY, next);
  return entry;
}

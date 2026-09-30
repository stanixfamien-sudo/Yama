import { supabase } from "../lib/supabase";

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

async function currentUserId() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

function mapMemory(row: any): Memory {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    category: row.category ?? "Personnel",
    createdAt: row.created_at,
    isFavorite: Boolean(row.is_favorite),
    isRetainedInAiMemory: Boolean(row.is_retained_in_ai_memory),
  };
}

function mapWishlist(row: any): WishlistItem {
  return {
    id: row.id,
    title: row.title,
    category: row.category ?? "Personnel",
    notes: row.notes ?? "",
    createdAt: row.created_at,
    isCompleted: Boolean(row.is_completed),
    isSharedWithAi: Boolean(row.is_shared_with_ai),
  };
}

function mapMood(row: any): MoodEntry {
  return {
    id: row.id,
    mood: row.mood,
    note: row.note ?? "",
    createdAt: row.created_at,
  };
}

export async function getMemories() {
  const userId = await currentUserId();
  if (supabase && userId) {
    const { data, error } = await supabase
      .from("memories")
      .select("id,title,description,category,created_at,is_favorite,is_retained_in_ai_memory")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!error && data) {
      const result = data.map(mapMemory);
      write(MEMORY_KEY, result);
      return result;
    }
  }
  return read<Memory[]>(MEMORY_KEY, []);
}

export async function saveMemory(input: Omit<Memory, "id" | "createdAt">) {
  const userId = await currentUserId();
  if (supabase && userId) {
    const { data, error } = await supabase.from("memories").insert({
      user_id: userId,
      title: input.title,
      description: input.description,
      category: input.category,
      is_favorite: input.isFavorite,
      is_retained_in_ai_memory: input.isRetainedInAiMemory,
    }).select("id,title,description,category,created_at,is_favorite,is_retained_in_ai_memory").single();
    if (!error && data) {
      const item = mapMemory(data);
      const next = [item, ...read<Memory[]>(MEMORY_KEY, [])];
      write(MEMORY_KEY, next);
      return item;
    }
  }

  const memory: Memory = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  write(MEMORY_KEY, [memory, ...read<Memory[]>(MEMORY_KEY, [])]);
  return memory;
}

export async function updateMemory(id: string, patch: Partial<Memory>) {
  const userId = await currentUserId();
  const local = read<Memory[]>(MEMORY_KEY, []);
  if (supabase && userId) {
    const payload: Record<string, unknown> = {};
    if (patch.title !== undefined) payload.title = patch.title;
    if (patch.description !== undefined) payload.description = patch.description;
    if (patch.category !== undefined) payload.category = patch.category;
    if (patch.isFavorite !== undefined) payload.is_favorite = patch.isFavorite;
    if (patch.isRetainedInAiMemory !== undefined) payload.is_retained_in_ai_memory = patch.isRetainedInAiMemory;
    const { data, error } = await supabase.from("memories").update(payload)
      .eq("id", id).eq("user_id", userId)
      .select("id,title,description,category,created_at,is_favorite,is_retained_in_ai_memory").single();
    if (!error && data) {
      const result = local.map((item) => item.id === id ? mapMemory(data) : item);
      write(MEMORY_KEY, result);
      return result;
    }
  }
  const result = local.map((item) => item.id === id ? { ...item, ...patch } : item);
  write(MEMORY_KEY, result);
  return result;
}

export async function deleteMemory(id: string) {
  const userId = await currentUserId();
  if (supabase && userId) {
    const { error } = await supabase.from("memories").delete().eq("id", id).eq("user_id", userId);
    if (!error) {
      const result = read<Memory[]>(MEMORY_KEY, []).filter((item) => item.id !== id);
      write(MEMORY_KEY, result);
      return result;
    }
  }
  const result = read<Memory[]>(MEMORY_KEY, []).filter((item) => item.id !== id);
  write(MEMORY_KEY, result);
  return result;
}

export async function getWishlist() {
  const userId = await currentUserId();
  if (supabase && userId) {
    const { data, error } = await supabase
      .from("wishlist_items")
      .select("id,title,category,notes,created_at,is_completed,is_shared_with_ai")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!error && data) {
      const result = data.map(mapWishlist);
      write(WISHLIST_KEY, result);
      return result;
    }
  }
  return read<WishlistItem[]>(WISHLIST_KEY, []);
}

export async function saveWishlistItem(input: Omit<WishlistItem, "id" | "createdAt">) {
  const userId = await currentUserId();
  if (supabase && userId) {
    const { data, error } = await supabase.from("wishlist_items").insert({
      user_id: userId,
      title: input.title,
      category: input.category,
      notes: input.notes,
      is_completed: input.isCompleted,
      is_shared_with_ai: input.isSharedWithAi,
    }).select("id,title,category,notes,created_at,is_completed,is_shared_with_ai").single();
    if (!error && data) {
      const item = mapWishlist(data);
      write(WISHLIST_KEY, [item, ...read<WishlistItem[]>(WISHLIST_KEY, [])]);
      return item;
    }
  }
  const item: WishlistItem = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  write(WISHLIST_KEY, [item, ...read<WishlistItem[]>(WISHLIST_KEY, [])]);
  return item;
}

export async function updateWishlistItem(id: string, patch: Partial<WishlistItem>) {
  const userId = await currentUserId();
  const local = read<WishlistItem[]>(WISHLIST_KEY, []);
  if (supabase && userId) {
    const payload: Record<string, unknown> = {};
    if (patch.title !== undefined) payload.title = patch.title;
    if (patch.category !== undefined) payload.category = patch.category;
    if (patch.notes !== undefined) payload.notes = patch.notes;
    if (patch.isCompleted !== undefined) payload.is_completed = patch.isCompleted;
    if (patch.isSharedWithAi !== undefined) payload.is_shared_with_ai = patch.isSharedWithAi;
    const { data, error } = await supabase.from("wishlist_items").update(payload)
      .eq("id", id).eq("user_id", userId)
      .select("id,title,category,notes,created_at,is_completed,is_shared_with_ai").single();
    if (!error && data) {
      const result = local.map((item) => item.id === id ? mapWishlist(data) : item);
      write(WISHLIST_KEY, result);
      return result;
    }
  }
  const result = local.map((item) => item.id === id ? { ...item, ...patch } : item);
  write(WISHLIST_KEY, result);
  return result;
}

export async function deleteWishlistItem(id: string) {
  const userId = await currentUserId();
  if (supabase && userId) {
    const { error } = await supabase.from("wishlist_items").delete().eq("id", id).eq("user_id", userId);
    if (!error) {
      const result = read<WishlistItem[]>(WISHLIST_KEY, []).filter((item) => item.id !== id);
      write(WISHLIST_KEY, result);
      return result;
    }
  }
  const result = read<WishlistItem[]>(WISHLIST_KEY, []).filter((item) => item.id !== id);
  write(WISHLIST_KEY, result);
  return result;
}

export async function getMoodHistory() {
  const userId = await currentUserId();
  if (supabase && userId) {
    const { data, error } = await supabase
      .from("mood_entries")
      .select("id,mood,note,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (!error && data) {
      const result = data.map(mapMood);
      write(MOOD_HISTORY_KEY, result);
      return result;
    }
  }
  return read<MoodEntry[]>(MOOD_HISTORY_KEY, []);
}

export async function addMoodEntry(mood: string, note = "") {
  const userId = await currentUserId();
  if (supabase && userId) {
    const { data, error } = await supabase.from("mood_entries").insert({
      user_id: userId,
      mood,
      note,
    }).select("id,mood,note,created_at").single();
    if (!error && data) {
      const entry = mapMood(data);
      write(MOOD_HISTORY_KEY, [entry, ...read<MoodEntry[]>(MOOD_HISTORY_KEY, [])].slice(0, 30));
      return entry;
    }
  }
  const entry: MoodEntry = { id: crypto.randomUUID(), mood, note, createdAt: new Date().toISOString() };
  write(MOOD_HISTORY_KEY, [entry, ...read<MoodEntry[]>(MOOD_HISTORY_KEY, [])].slice(0, 30));
  return entry;
}

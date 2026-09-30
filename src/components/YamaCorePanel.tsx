import { useEffect, useState } from "react";
import { Check, Heart, Plus, Smile, Trash2 } from "lucide-react";
import {
  addMoodEntry,
  deleteMemory,
  deleteWishlistItem,
  getMemories,
  getMoodHistory,
  getWishlist,
  saveMemory,
  saveWishlistItem,
  updateMemory,
  updateWishlistItem,
  type Memory,
  type MoodEntry,
  type WishlistItem,
} from "../features/yamaCore";

const moodLabels: Record<string, string> = { "😊": "Joyeuse", "🥰": "Affectueuse", "😌": "Calme", "😴": "Fatiguée", "✨": "Inspirée" };

type Props = {
  mode: "memories" | "wishlist" | "mood";
  currentMood?: string;
};

export function YamaCorePanel({ mode, currentMood }: Props) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Personnel");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const load = async () => {
      if (mode === "memories") {
        const data = await getMemories();
        if (active) setMemories(data);
      } else if (mode === "wishlist") {
        const data = await getWishlist();
        if (active) setWishlist(data);
      } else {
        const data = await getMoodHistory();
        if (active) setMoods(data);
      }
      if (active) setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [mode]);

  async function createMemory() {
    if (!title.trim() || saving) return;
    setSaving(true);
    const item = await saveMemory({
      title: title.trim(),
      description: description.trim(),
      category,
      isFavorite: false,
      isRetainedInAiMemory: false,
    });
    setMemories((items) => [item, ...items]);
    setTitle("");
    setDescription("");
    setSaving(false);
  }

  async function createWishlistItem() {
    if (!title.trim() || saving) return;
    setSaving(true);
    const item = await saveWishlistItem({
      title: title.trim(),
      category,
      notes: description.trim(),
      isCompleted: false,
      isSharedWithAi: false,
    });
    setWishlist((items) => [item, ...items]);
    setTitle("");
    setDescription("");
    setSaving(false);
  }

  async function recordCurrentMood() {
    if (!currentMood || saving) return;
    setSaving(true);
    const entry = await addMoodEntry(currentMood);
    setMoods((items) => [entry, ...items].slice(0, 30));
    setSaving(false);
  }

  if (mode === "mood") {
    return (
      <section className="content-section">
        <div className="section-title">
          <div><span className="card-kicker">Mémoire du jour</span><h2>Ton historique d'humeur</h2></div>
          <Smile size={24} />
        </div>
        {currentMood && (
          <button className="primary-button" onClick={() => void recordCurrentMood()} disabled={saving}>
            {saving ? "Enregistrement..." : <>Enregistrer « {currentMood} » <Check size={18} /></>}
          </button>
        )}
        {loading ? <div className="empty-state"><p>Chargement de ton historique…</p></div> : (
          <div className="surprise-grid">
            {moods.length === 0 ? (
              <div className="empty-state"><h3>Aucune humeur enregistrée.</h3><p>Ton historique commencera ici.</p></div>
            ) : moods.slice(0, 10).map((entry) => (
              <article className="surprise-item" key={entry.id}>
                <span>{new Date(entry.createdAt).toLocaleDateString("fr-FR")}</span>
                <h3>{moodLabels[entry.mood] ?? entry.mood}</h3>
                <p>{entry.note || "Aucune note."}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    );
  }

  const isMemory = mode === "memories";
  const items = isMemory ? memories : wishlist;

  return (
    <section className="content-section">
      <div className="section-title">
        <div>
          <span className="card-kicker">{isMemory ? "Privé" : "Envies"}</span>
          <h2>{isMemory ? "Mes souvenirs" : "Ma wishlist"}</h2>
        </div>
        <Plus size={24} />
      </div>

      <div className="form-card">
        <label>{isMemory ? "Titre du souvenir" : "Une envie"}<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isMemory ? "Un moment à garder..." : "Quelque chose que tu aimerais..."}/></label>
        <label>{isMemory ? "Description" : "Notes"}<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Quelques détails..."/></label>
        <label>Catégorie<input value={category} onChange={(e) => setCategory(e.target.value)} /></label>
        <button className="primary-button" onClick={() => void (isMemory ? createMemory() : createWishlistItem())} disabled={saving}>
          {saving ? "Enregistrement..." : <>Ajouter <Plus size={18} /></>}
        </button>
      </div>

      {loading ? <div className="empty-state"><p>Chargement…</p></div> : (
        <div className="surprise-grid">
          {items.length === 0 ? (
            <div className="empty-state"><h3>{isMemory ? "Le premier souvenir n'attend que toi." : "Ta wishlist est encore vide."}</h3><p>Ajoute un premier élément ci-dessus.</p></div>
          ) : isMemory ? memories.map((item) => (
            <article className="surprise-item" key={item.id}>
              <span>{item.category}</span>
              <h3>{item.title}</h3>
              <p>{item.description || "Aucune description."}</p>
              <button className="text-button" onClick={() => void updateMemory(item.id, { isRetainedInAiMemory: !item.isRetainedInAiMemory }).then(setMemories)}>
                {item.isRetainedInAiMemory ? "Mémoire IA activée" : "Mémoire IA désactivée"}
              </button>
              <button className="circle-button" aria-label="Supprimer" onClick={() => void deleteMemory(item.id).then(setMemories)}><Trash2 size={16}/></button>
            </article>
          )) : wishlist.map((item) => (
            <article className="surprise-item" key={item.id}>
              <span>{item.category}</span>
              <h3>{item.title}</h3>
              <p>{item.notes || "Aucune note."}</p>
              <button className="text-button" onClick={() => void updateWishlistItem(item.id, { isCompleted: !item.isCompleted }).then(setWishlist)}>
                {item.isCompleted ? "Terminé ✓" : "Marquer comme réalisé"}
              </button>
              <button className="text-button" onClick={() => void updateWishlistItem(item.id, { isSharedWithAi: !item.isSharedWithAi }).then(setWishlist)}>
                {item.isSharedWithAi ? "Partagé avec Yama AI" : "Non partagé avec Yama AI"}
              </button>
              <button className="circle-button" aria-label="Supprimer" onClick={() => void deleteWishlistItem(item.id).then(setWishlist)}><Trash2 size={16}/></button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

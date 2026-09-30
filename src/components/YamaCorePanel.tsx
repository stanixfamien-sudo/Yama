import { useState } from "react";
import { Check, Heart, Plus, Trash2 } from "lucide-react";
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

type Props = {
  mode: "memories" | "wishlist" | "mood";
  currentMood?: string;
};

export function YamaCorePanel({ mode, currentMood }: Props) {
  const [memories, setMemories] = useState<Memory[]>(getMemories);
  const [wishlist, setWishlist] = useState<WishlistItem[]>(getWishlist);
  const [moods, setMoods] = useState<MoodEntry[]>(getMoodHistory);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Personnel");

  function createMemory() {
    if (!title.trim()) return;
    const item = saveMemory({
      title: title.trim(),
      description: description.trim(),
      category,
      isFavorite: false,
      isRetainedInAiMemory: true,
    });
    setMemories((items) => [item, ...items]);
    setTitle("");
    setDescription("");
  }

  function createWishlistItem() {
    if (!title.trim()) return;
    const item = saveWishlistItem({
      title: title.trim(),
      category,
      notes: description.trim(),
      isCompleted: false,
      isSharedWithAi: true,
    });
    setWishlist((items) => [item, ...items]);
    setTitle("");
    setDescription("");
  }

  function recordCurrentMood() {
    if (!currentMood) return;
    const entry = addMoodEntry(currentMood);
    setMoods((items) => [entry, ...items].slice(0, 30));
  }

  if (mode === "mood") {
    return (
      <section className="content-section">
        <div className="section-title">
          <div><span className="card-kicker">Mémoire du jour</span><h2>Ton historique d'humeur</h2></div>
          <Heart size={24} />
        </div>
        {currentMood && (
          <button className="primary-button" onClick={recordCurrentMood}>
            Enregistrer « {currentMood} » <Check size={18} />
          </button>
        )}
        <div className="surprise-grid">
          {moods.length === 0 ? (
            <div className="empty-state"><h3>Aucune humeur enregistrée.</h3><p>Ton historique commencera ici.</p></div>
          ) : moods.slice(0, 10).map((entry) => (
            <article className="surprise-item" key={entry.id}>
              <span>{new Date(entry.createdAt).toLocaleDateString("fr-FR")}</span>
              <h3>{entry.mood}</h3>
              <p>{entry.note || "Aucune note."}</p>
            </article>
          ))}
        </div>
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
        <button className="primary-button" onClick={isMemory ? createMemory : createWishlistItem}>
          Ajouter <Plus size={18} />
        </button>
      </div>

      <div className="surprise-grid">
        {items.length === 0 ? (
          <div className="empty-state"><h3>{isMemory ? "Le premier souvenir n'attend que toi." : "Ta wishlist est encore vide."}</h3><p>Ajoute un premier élément ci-dessus.</p></div>
        ) : isMemory ? memories.map((item) => (
          <article className="surprise-item" key={item.id}>
            <span>{item.category}</span>
            <h3>{item.title}</h3>
            <p>{item.description || "Aucune description."}</p>
            <button className="text-button" onClick={() => setMemories(updateMemory(item.id, { isRetainedInAiMemory: !item.isRetainedInAiMemory }))}>
              {item.isRetainedInAiMemory ? "Mémoire IA activée" : "Mémoire IA désactivée"}
            </button>
            <button className="circle-button" aria-label="Supprimer" onClick={() => setMemories(deleteMemory(item.id))}><Trash2 size={16}/></button>
          </article>
        )) : wishlist.map((item) => (
          <article className="surprise-item" key={item.id}>
            <span>{item.category}</span>
            <h3>{item.title}</h3>
            <p>{item.notes || "Aucune note."}</p>
            <button className="text-button" onClick={() => setWishlist(updateWishlistItem(item.id, { isCompleted: !item.isCompleted }))}>
              {item.isCompleted ? "Terminé ✓" : "Marquer comme réalisé"}
            </button>
            <button className="text-button" onClick={() => setWishlist(updateWishlistItem(item.id, { isSharedWithAi: !item.isSharedWithAi }))}>
              {item.isSharedWithAi ? "Partagé avec Yama AI" : "Non partagé avec Yama AI"}
            </button>
            <button className="circle-button" aria-label="Supprimer" onClick={() => setWishlist(deleteWishlistItem(item.id))}><Trash2 size={16}/></button>
          </article>
        ))}
      </div>
    </section>
  );
}

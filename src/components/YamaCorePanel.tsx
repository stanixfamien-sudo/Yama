import { useEffect, useState } from "react";
import { Check, Plus, Smile, Target, Trash2 } from "lucide-react";
import {
  addMoodEntry,
  deleteTask,
  deleteWishlistItem,
  getTasks,
  
  getMoodHistory,
  getWishlist,
  saveTask,
  
  saveWishlistItem,
  updateTask,
  
  updateWishlistItem,

  type MoodEntry,
  type Task,
  type WishlistItem,
} from "../features/yamaCore";

const moodLabels: Record<string, string> = { "😊": "Joyeuse", "🥰": "Affectueuse", "😌": "Calme", "😴": "Fatiguée", "✨": "Inspirée" };

type Props = {
  mode: "tasks" | "wishlist" | "mood";
  currentMood?: string;
};

export function YamaCorePanel({ mode, currentMood }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Personnel");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const load = async () => {
      if (mode === "tasks") {
        const data = await getTasks();
        if (active) setTasks(data);
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

  async function createTask() {
    if (!title.trim() || saving) return;
    setSaving(true);
    const item = await saveTask({
      title: title.trim(),
      note: description.trim(),
      priority,
      dueDate,
      isCompleted: false,
    });
    setTasks((items) => [item, ...items]);
    setTitle("");
    setDescription("");
    setDueDate("");
    setPriority("medium");
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

  const isTask = mode === "tasks";
  const items = isTask ? tasks : wishlist;

  return (
    <section className="content-section">
      <div className="section-title">
        <div><span className="card-kicker">{isTask ? "Mon quotidien" : "Envies"}</span><h2>{isTask ? "Ce que tu veux accomplir." : "Ma wishlist"}</h2></div>
        {isTask ? <Target size={24} /> : <Plus size={24} />}
      </div>

      <div className="form-card">
        <label>{isTask ? "Ce que tu dois faire" : "Une envie"}<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isTask ? "Ex. Réviser les maths..." : "Quelque chose que tu aimerais..."}/></label>
        <label>{isTask ? "Détails" : "Notes"}<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Quelques détails..."/></label>
        {isTask ? <>
          <label>Priorité<select value={priority} onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}><option value="low">Normale</option><option value="medium">Importante</option><option value="high">Urgente</option></select></label>
          <label>Date prévue<input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
        </> : <label>Catégorie<input value={category} onChange={(e) => setCategory(e.target.value)} /></label>}
        <button className="primary-button" onClick={() => void (isTask ? createTask() : createWishlistItem())} disabled={saving}>
          {saving ? "Enregistrement..." : <>Ajouter <Plus size={18} /></>}
        </button>
      </div>

      {loading ? <div className="empty-state"><p>Chargement…</p></div> : (
        <div className="surprise-grid">
          {items.length === 0 ? (
            <div className="empty-state"><h3>{isTask ? "Ta journée est encore vide." : "Ta wishlist est encore vide."}</h3><p>{isTask ? "Ajoute ce qui compte aujourd'hui pour garder le cap." : "Ajoute un premier élément ci-dessus."}</p></div>
          ) : isTask ? tasks.map((item) => (
            <article className="surprise-item" key={item.id}>
              <span>{item.priority === "high" ? "Urgente" : item.priority === "medium" ? "Importante" : "Normale"}{item.dueDate ? " · " + new Date(item.dueDate).toLocaleDateString("fr-FR") : ""}</span>
              <h3>{item.title}</h3>
              <p>{item.note || "Aucun détail."}</p>
              <button className="text-button" onClick={() => void updateTask(item.id, { isCompleted: !item.isCompleted }).then(setTasks)}>
                {item.isCompleted ? "Terminée ✓" : "Marquer comme terminée"}
              </button>
              <button className="circle-button" aria-label="Supprimer" onClick={() => void deleteTask(item.id).then(setTasks)}><Trash2 size={16}/></button>
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

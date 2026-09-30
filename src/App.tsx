import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Cloud as CloudIcon, Heart, Home, Image, Lightbulb, Pencil, Plus, Sparkles, Target, UserRound } from "lucide-react";
import { supabase } from "./lib/supabase";
import { AuthGate } from "./components/AuthGate";
import { YamaCorePanel } from "./components/YamaCorePanel";
import { YamaAIStudio } from "./components/YamaAIStudio";
import { getMemories, getMoodHistory, getWishlist, type Memory, type MoodEntry, type WishlistItem } from "./features/yamaCore";

type Tab = "home" | "memories" | "wishlist" | "mood" | "ai" | "me";
type Profile = { name: string; nickname: string; favoriteColor: string; favoriteThings: string[]; note: string };

const tabs = [
  { id: "home" as Tab, label: "Accueil", icon: Home },
  { id: "memories" as Tab, label: "Souvenirs", icon: Image },
  { id: "wishlist" as Tab, label: "Wishlist", icon: Heart },
  { id: "mood" as Tab, label: "Humeur", icon: Sparkles },
  { id: "ai" as Tab, label: "Yama AI", icon: Sparkles },
  { id: "me" as Tab, label: "Moi", icon: UserRound },
];

const moods = [
  { value: "😊", label: "Joyeuse", mark: "J" },
  { value: "🥰", label: "Affectueuse", mark: "A" },
  { value: "😌", label: "Calme", mark: "C" },
  { value: "😴", label: "Fatiguée", mark: "F" },
  { value: "✨", label: "Inspirée", mark: "I" },
];
const interests = ["Musique", "Mode", "Voyage", "Films", "Food", "Lecture", "Sport", "Art"];
const emptyProfile: Profile = { name: "", nickname: "", favoriteColor: "", favoriteThings: [], note: "" };

function readProfile(): Profile {
  try {
    const saved = localStorage.getItem("yama-profile");
    return saved ? { ...emptyProfile, ...JSON.parse(saved) } : emptyProfile;
  } catch { return emptyProfile; }
}

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [profile, setProfile] = useState<Profile>(readProfile);
  const [mood, setMood] = useState("");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => { localStorage.setItem("yama-profile", JSON.stringify(profile)); }, [profile]);

  useEffect(() => {
    let mounted = true;
    if (!supabase) { setSessionReady(true); return; }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUserEmail(session?.user.email ?? session?.user.phone ?? "");
      setSessionReady(true);
      if (session) void loadProfile();
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUserEmail(session?.user.email ?? session?.user.phone ?? "");
      setSessionReady(true);
    });
    async function loadProfile() {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !mounted) return;
      const { data, error } = await supabase.from("profiles").select("name,nickname,favorite_color,favorite_things,note").eq("id", session.user.id).maybeSingle();
      if (error) { if (mounted) setSyncError(error.message); return; }
      if (data && mounted) {
        setProfile({
          name: data.name ?? "",
          nickname: data.nickname ?? "",
          favoriteColor: data.favorite_color ?? "",
          favoriteThings: data.favorite_things ?? [],
          note: data.note ?? "",
        });
      }
    }
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!sessionReady || (supabase && !userEmail)) return;
    let active = true;
    setDashboardLoading(true);
    Promise.all([getMemories(), getWishlist(), getMoodHistory()]).then(([memoryData, wishlistData, moodData]) => {
      if (!active) return;
      setMemories(memoryData);
      setWishlist(wishlistData);
      setMoodHistory(moodData);
      if (!mood && moodData[0]) setMood(moodData[0].mood);
      setDashboardLoading(false);
    }).catch(() => {
      if (active) setDashboardLoading(false);
    });
    return () => { active = false; };
  }, [sessionReady, userEmail]);

  const name = profile.nickname || profile.name || "Yama";
  const completedWishlist = wishlist.filter((item) => item.isCompleted).length;
  const aiMemories = memories.filter((item) => item.isRetainedInAiMemory).length;
  const aiWishlist = wishlist.filter((item) => item.isSharedWithAi).length;
  const profileProgress = [
    Boolean(profile.name),
    Boolean(profile.nickname),
    Boolean(profile.favoriteColor),
    profile.favoriteThings.length > 0,
    Boolean(profile.note),
  ].filter(Boolean).length * 20;

  const suggestion = useMemo(() => {
    if (wishlist.find((item) => !item.isCompleted)) {
      const item = wishlist.find((entry) => !entry.isCompleted);
      return { title: item?.title ?? "Une envie à retrouver", reason: "Une envie est encore en attente dans ta wishlist.", action: "Voir ma wishlist", target: "wishlist" as Tab };
    }
    if (profile.favoriteThings[0]) {
      return { title: "Explorer " + profile.favoriteThings[0], reason: "C'est l'un de tes centres d'intérêt enregistrés.", action: "Voir mon profil", target: "me" as Tab };
    }
    if (memories.length) {
      return { title: "Revisiter un souvenir", reason: "Tu as déjà commencé à construire ta mémoire YAMA.", action: "Mes souvenirs", target: "memories" as Tab };
    }
    return { title: "Créer ton premier souvenir", reason: "YAMA apprend à partir de ce que tu choisis de conserver.", action: "Ajouter un souvenir", target: "memories" as Tab };
  }, [wishlist, profile.favoriteThings, memories]);

  function toggleInterest(item: string) {
    setProfile((p) => ({
      ...p,
      favoriteThings: p.favoriteThings.includes(item)
        ? p.favoriteThings.filter((x) => x !== item)
        : [...p.favoriteThings, item],
    }));
  }

  async function saveProfile() {
    if (!supabase) { setEditing(false); return; }
    setSaving(true);
    setSyncError("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setSyncError("Aucune session Supabase active.");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("profiles").upsert({
      id: session.user.id,
      name: profile.name,
      nickname: profile.nickname,
      favorite_color: profile.favoriteColor,
      favorite_things: profile.favoriteThings,
      note: profile.note,
      updated_at: new Date().toISOString(),
    });
    if (error) setSyncError(error.message);
    else setEditing(false);
    setSaving(false);
  }

  function navigate(next: Tab) { setTab(next); setEditing(false); }

  const pageTitle =
    tab === "home" ? "Bienvenue dans ton univers."
    : tab === "me" ? "Ce que tu veux partager."
    : tab === "memories" ? "Nos souvenirs."
    : tab === "wishlist" ? "Tes envies."
    : tab === "mood" ? "Ton humeur."
    : tab === "ai" ? "Ton espace Yama AI."
    : "Ce que tu veux partager.";

  if (!sessionReady) return <main className="auth-shell"><section className="auth-card"><div className="auth-mark"><Heart size={25} fill="currentColor" /></div><h1>YAMA</h1><p>Chargement de ton univers…</p></section></main>;
  if (supabase && !userEmail) return <AuthGate />;

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => navigate("home")} aria-label="Retour à l'accueil"><span className="brand-mark">Y</span><span>YAMA</span></button>
        <nav className="desktop-nav" aria-label="Navigation principale">{tabs.map(({ id, label }) => <button className={tab === id ? "active" : ""} key={id} onClick={() => navigate(id)}>{label}</button>)}</nav>
        <span className="topbar-caption">{userEmail || "ton petit univers"}</span>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">YAMA · {name.toUpperCase()}</span>
          <h1>{pageTitle} <Heart size={25} fill="currentColor" /></h1>
          <p>Un espace personnel qui apprend doucement ce que tu aimes, garde tes souvenirs et prépare de jolies surprises.</p>
          <div className="hero-actions">
            <button className="hero-action primary" onClick={() => navigate("memories")}><Plus size={17} /> Ajouter un souvenir</button>
            <button className="hero-action" onClick={() => navigate("wishlist")}><Heart size={17} /> Ajouter une envie</button>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <span className="hero-orbit hero-orbit-one" /><span className="hero-orbit hero-orbit-two" />
          <div className="hero-monogram">Y</div><div className="hero-mood">{mood ? <span className="mood-letter">{mood === "😊" ? "S" : mood === "🥰" ? "A" : mood === "😌" ? "C" : mood === "😴" ? "R" : "L"}</span> : <CloudIcon />}</div>
        </div>
      </section>

      {tab === "home" && (
        <div className="page-grid dashboard">
          <section className="card mood-card">
            <div className="card-heading"><div><span className="card-kicker">Aujourd'hui</span><h2>Comment tu te sens ?</h2></div>{mood && <span className="mood-selected">{moods.find((item) => item.value === mood)?.label ?? "Humeur"}</span>}</div>
            <div className="moods">{moods.map((item) => <button className={mood === item.value ? "mood-button selected" : "mood-button"} key={item.value} onClick={() => setMood(item.value)} title={item.label} aria-label={item.label}><span className="mood-mark">{item.mark}</span></button>)}</div>
            <button className="text-button mood-history-link" onClick={() => navigate("mood")}>Voir mon historique <ArrowRight size={16} /></button>
          </section>

          <section className="stats-strip">
            <button className="stat-card" onClick={() => navigate("memories")}><span className="stat-number">{dashboardLoading ? "…" : memories.length}</span><span>Souvenirs</span><Image size={18} /></button>
            <button className="stat-card" onClick={() => navigate("wishlist")}><span className="stat-number">{dashboardLoading ? "…" : wishlist.length}</span><span>Envies</span><Heart size={18} /></button>
            <button className="stat-card" onClick={() => navigate("mood")}><span className="stat-number">{dashboardLoading ? "…" : moodHistory.length}</span><span>Humeurs</span><Sparkles size={18} /></button>
          </section>

          <section className="card profile-card">
            <div className="card-icon"><UserRound size={21} /></div>
            <span className="card-kicker">Ton profil · {profileProgress}%</span>
            <div className="progress-track"><span style={{ width: profileProgress + "%" }} /></div>
            <h2>{profile.name ? "Ton univers commence à prendre forme." : "Fais connaissance avec ton espace."}</h2>
            <p>{profile.favoriteThings.length ? profile.favoriteThings.length + " centre(s) d'intérêt enregistré(s)." : "Choisis quelques préférences pour rendre Yama vraiment personnel."}</p>
            <button className="text-button" onClick={() => { setTab("me"); setEditing(true); }}>{profile.name ? "Compléter mon profil" : "Commencer"} <ArrowRight size={17} /></button>
          </section>

          <section className="card suggestion-card">
            <div className="suggestion-icon"><Lightbulb size={22} /></div>
            <span className="card-kicker">Pour toi</span>
            <h2>{suggestion.title}</h2>
            <p>{suggestion.reason}</p>
            <button className="text-button" onClick={() => navigate(suggestion.target)}>{suggestion.action} <ArrowRight size={17} /></button>
          </section>

          <section className="card interests-card">
            <div className="card-heading"><div><span className="card-kicker">Ton univers</span><h2>Ce qui compte pour toi.</h2></div><Sparkles size={22} /></div>
            <div className="chips">{profile.favoriteThings.length ? profile.favoriteThings.map((x) => <span className="chip" key={x}>{x}</span>) : <span className="empty-chip">Tes goûts apparaîtront ici.</span>}</div>
          </section>

          <section className="card recent-card">
            <div className="card-heading"><div><span className="card-kicker">Mémoire récente</span><h2>Ce que YAMA garde.</h2></div><button className="mini-link" onClick={() => navigate("memories")}>Tout voir</button></div>
            {dashboardLoading ? <p>Chargement de ton univers…</p> : memories.length ? <div className="recent-list">{memories.slice(0,3).map((item) => <button key={item.id} onClick={() => navigate("memories")}><span className="recent-dot">{item.isFavorite ? "♥" : "•"}</span><span><strong>{item.title}</strong><small>{item.category}</small></span><ArrowRight size={16} /></button>)}</div> : <div className="inline-empty"><Image size={20}/><span>Ton premier souvenir peut commencer ici.</span><button className="mini-link" onClick={() => navigate("memories")}>Ajouter</button></div>}
          </section>

          <section className="card wishlist-progress-card">
            <div className="card-heading"><div><span className="card-kicker">Wishlist</span><h2>Tes envies avancent.</h2></div><Target size={22}/></div>
            <div className="wishlist-progress"><strong>{completedWishlist}</strong><span> / {wishlist.length || 0} réalisées</span></div>
            <div className="progress-track"><span style={{ width: wishlist.length ? ((completedWishlist / wishlist.length) * 100) + "%" : "0%" }} /></div>
            <button className="text-button" onClick={() => navigate("wishlist")}>Voir mes envies <ArrowRight size={17}/></button>
          </section>

          <section className="card ai-card wide-card">
            <div className="ai-card-top"><div className="suggestion-icon"><Sparkles size={21}/></div><span className="card-kicker">Yama AI · Préparation</span></div>
            <h2>Une IA qui te connaît seulement si tu l'autorises.</h2>
            <p>Le profil, les souvenirs et la wishlist peuvent devenir un contexte personnalisé. Rien n'est présenté comme mémoire IA tant que tu ne l'as pas autorisé.</p>
            <div className="ai-permission-row"><span>{aiMemories} souvenir(s) autorisé(s)</span><span>{aiWishlist} envie(s) autorisée(s)</span><span>Contrôle des permissions</span></div>
          </section>
        </div>
      )}

      {tab === "memories" && <YamaCorePanel mode="memories" />}
      {tab === "wishlist" && <YamaCorePanel mode="wishlist" />}
      {tab === "mood" && <YamaCorePanel mode="mood" currentMood={mood} />}
      {tab === "ai" && <YamaAIStudio />}

      {tab === "me" && (
        <section className="content-section">
          <div className="section-title"><div><span className="card-kicker">Profil</span><h2>Ce que tu veux que Yama sache</h2></div>{!editing && <button className="circle-button" onClick={() => setEditing(true)}><Pencil size={18} /></button>}</div>
          {!editing ? (
            <div className="profile-summary">
              <div className="avatar">{(profile.name || "Y").charAt(0).toUpperCase()}</div>
              <h3>{profile.name || "Ton prénom"}</h3><p>{profile.nickname ? "Surnom : " + profile.nickname : "Ajoute un surnom si tu en as envie."}</p>
              <div className="profile-stat-row"><span><strong>{profile.favoriteThings.length}</strong> intérêts</span><span><strong>{memories.length}</strong> souvenirs</span><span><strong>{wishlist.length}</strong> envies</span></div>
              <div className="chips">{profile.favoriteThings.map((x) => <span className="chip" key={x}>{x}</span>)}</div>
              {profile.note && <p className="profile-note">“{profile.note}”</p>}
            </div>
          ) : (
            <div className="form-card">{syncError && <p className="connection-error">{syncError}</p>}
              <label>Ton prénom<input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Comment tu t'appelles ?" /></label>
              <label>Ton surnom<input value={profile.nickname} onChange={(e) => setProfile({ ...profile, nickname: e.target.value })} placeholder="Un surnom que tu aimes" /></label>
              <label>Une couleur que tu aimes<input value={profile.favoriteColor} onChange={(e) => setProfile({ ...profile, favoriteColor: e.target.value })} placeholder="Ex. rose, bleu, noir..." /></label>
              <div><span className="label">Ce qui t'intéresse</span><div className="interest-grid">{interests.map((item) => { const selected = profile.favoriteThings.includes(item); return <button className={selected ? "interest selected" : "interest"} key={item} onClick={() => toggleInterest(item)}>{selected && <Check size={15} />} {item}</button>; })}</div></div>
              <label>Une petite note pour ton univers<textarea value={profile.note} onChange={(e) => setProfile({ ...profile, note: e.target.value })} placeholder="Quelque chose que tu aimerais garder ici..." rows={4} /></label>
              <button className="primary-button" onClick={saveProfile} disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer mon profil"} <Check size={18} /></button>
            </div>
          )}
        </section>
      )}

      <nav className="bottom-nav">{tabs.map(({ id, label, icon: Icon }) => <button className={tab === id ? "active" : ""} key={id} onClick={() => navigate(id)}><Icon size={20} /><span>{label}</span></button>)}</nav>
    </main>
  );
}

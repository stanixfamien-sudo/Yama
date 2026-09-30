import { useEffect, useState } from "react";
import { ArrowRight, Check, Gift, Heart, Home, Image, Pencil, Plus, Sparkles, UserRound } from "lucide-react";
import { supabase } from "./lib/supabase";

type Tab = "home" | "memories" | "surprises" | "me";
type Profile = { name: string; nickname: string; favoriteColor: string; favoriteThings: string[]; note: string };

const tabs = [
  { id: "home" as Tab, label: "Accueil", icon: Home },
  { id: "memories" as Tab, label: "Souvenirs", icon: Image },
  { id: "surprises" as Tab, label: "Surprises", icon: Gift },
  { id: "me" as Tab, label: "Moi", icon: UserRound },
];

const moods = ["😊", "🥰", "😌", "😴", "✨"];
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
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncError, setSyncError] = useState("");

  useEffect(() => { localStorage.setItem("yama-profile", JSON.stringify(profile)); }, [profile]);

  useEffect(() => {
    let mounted = true;
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
    loadProfile();
    return () => { mounted = false; };
  }, []);

  const name = profile.nickname || profile.name || "Yama";

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

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => navigate("home")}><span className="brand-mark">Y</span><span>YAMA</span></button>
        <span className="topbar-caption">ton petit univers</span>
      </header>

      <section className="hero">
        <span className="eyebrow">YAMA · {name.toUpperCase()}</span>
        <h1>{tab === "home" ? "Bienvenue dans ton univers." : tab === "me" ? "Ce que tu veux partager." : tab === "memories" ? "Nos souvenirs." : "Petites surprises."} <Heart size={25} fill="currentColor" /></h1>
        <p>Un espace personnel qui apprend doucement ce que tu aimes, garde tes souvenirs et prépare de jolies surprises.</p>
      </section>

      {tab === "home" && (
        <div className="page-grid">
          <section className="card mood-card">
            <div className="card-heading"><div><span className="card-kicker">Aujourd'hui</span><h2>Comment tu te sens ?</h2></div>{mood && <span className="mood-selected">{mood}</span>}</div>
            <div className="moods">{moods.map((item) => <button className={mood === item ? "mood-button selected" : "mood-button"} key={item} onClick={() => setMood(item)}>{item}</button>)}</div>
          </section>

          <section className="card">
            <div className="card-icon"><UserRound size={21} /></div>
            <span className="card-kicker">Ton profil</span>
            <h2>{profile.name ? "Ton univers commence à prendre forme." : "Fais connaissance avec ton espace."}</h2>
            <p>{profile.favoriteThings.length ? profile.favoriteThings.length + " centre(s) d'intérêt enregistré(s)." : "Choisis quelques préférences pour rendre Yama vraiment personnel."}</p>
            <button className="text-button" onClick={() => { setTab("me"); setEditing(true); }}>{profile.name ? "Modifier mon profil" : "Commencer"} <ArrowRight size={17} /></button>
          </section>

          <section className="card">
            <div className="card-heading"><div><span className="card-kicker">Ton univers</span><h2>Ce qui compte pour toi.</h2></div><Sparkles size={22} /></div>
            <div className="chips">{profile.favoriteThings.length ? profile.favoriteThings.map((x) => <span className="chip" key={x}>{x}</span>) : <span className="empty-chip">Tes goûts apparaîtront ici.</span>}</div>
          </section>

          <section className="card ai-card wide-card">
            <span className="card-kicker">Bientôt</span><h2>Yama AI</h2>
            <p>Un assistant personnel construit à partir des informations que tu choisis de partager. L'IA viendra après la base de données et la sécurité.</p>
            <span className="coming-soon">En préparation</span>
          </section>
        </div>
      )}

      {tab === "memories" && (
        <section className="content-section">
          <div className="section-title"><div><span className="card-kicker">Privé</span><h2>Les souvenirs à venir</h2></div><button className="circle-button"><Plus size={20} /></button></div>
          <div className="empty-state"><div className="empty-icon"><Image size={28} /></div><h3>Le premier souvenir n'attend que toi.</h3><p>Photos, petits moments et messages pourront être ajoutés ici.</p></div>
        </section>
      )}

      {tab === "surprises" && (
        <section className="content-section">
          <div className="section-title"><div><span className="card-kicker">À découvrir</span><h2>Des surprises personnalisées</h2></div><Gift size={25} /></div>
          <div className="surprise-grid">
            <article className="surprise-item"><span>01</span><h3>Une idée pour toi</h3><p>Les premières surprises seront basées sur tes préférences explicites.</p></article>
            <article className="surprise-item"><span>02</span><h3>Une attention</h3><p>Des messages et petites attentions pourront être préparés ici.</p></article>
          </div>
        </section>
      )}

      {tab === "me" && (
        <section className="content-section">
          <div className="section-title"><div><span className="card-kicker">Profil</span><h2>Ce que tu veux que Yama sache</h2></div>{!editing && <button className="circle-button" onClick={() => setEditing(true)}><Pencil size={18} /></button>}</div>
          {!editing ? (
            <div className="profile-summary">
              <div className="avatar">{(profile.name || "Y").charAt(0).toUpperCase()}</div>
              <h3>{profile.name || "Ton prénom"}</h3><p>{profile.nickname ? "Surnom : " + profile.nickname : "Ajoute un surnom si tu en as envie."}</p>
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

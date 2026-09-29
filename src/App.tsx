import { Heart, Home, Image, Sparkles, UserRound } from "lucide-react";

const sections = [
  { label: "Accueil", icon: Home },
  { label: "Souvenirs", icon: Image },
  { label: "Surprises", icon: Sparkles },
  { label: "Moi", icon: UserRound },
];

export default function App() {
  return (
    <main className="app-shell">
      <section className="hero">
        <span className="eyebrow">YAMA</span>
        <h1>Bienvenue dans ton petit univers. <Heart size={24} fill="currentColor" /></h1>
        <p>Un espace personnel qui évoluera avec tes goûts, tes souvenirs et tes envies.</p>
      </section>

      <section className="cards">
        <article className="card mood">
          <span>Ton mood aujourd'hui</span>
          <strong>Comment tu te sens ?</strong>
          <div className="moods">
            {["😊", "🥰", "😌", "😴", "✨"].map((emoji) => <button key={emoji}>{emoji}</button>)}
          </div>
        </article>
        <article className="card">
          <span>Ton univers</span>
          <strong>Nous allons apprendre ce que tu aimes.</strong>
          <p>Profil, préférences, souvenirs, envies et surprises seront ajoutés progressivement.</p>
        </article>
        <article className="card ai">
          <span>Yama AI</span>
          <strong>Ton assistant personnel arrive bientôt.</strong>
          <p>L'IA sera ajoutée après la mise en place du profil et des données.</p>
        </article>
      </section>

      <nav className="bottom-nav" aria-label="Navigation">
        {sections.map(({ label, icon: Icon }, index) => (
          <button className={index === 0 ? "active" : ""} key={label}>
            <Icon size={20} /><span>{label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
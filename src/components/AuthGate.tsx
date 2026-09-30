import { FormEvent, useState } from "react";
import { Chrome, LockKeyhole, Mail, Phone, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabase";

export function AuthGate() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) {
      setMessage("Supabase n'est pas configuré dans l'environnement de l'application.");
      return;
    }
    setLoading(true);
    setMessage("");
    const isPhone = !identifier.includes("@");
    const credentials = isPhone ? { phone: identifier.trim(), password } : { email: identifier.trim(), password };
    const result = mode === "signin"
      ? await supabase.auth.signInWithPassword(credentials)
      : await supabase.auth.signUp(credentials);
    if (result.error) {
      setMessage(result.error.message);
    } else if (mode === "signup" && result.data.session === null) {
      setMessage(isPhone ? "Un code de vérification peut être envoyé par SMS selon la configuration Supabase." : "Vérifie ton e-mail pour confirmer ton YAMA ID.");
    }
    setLoading(false);
  }

  async function google() {
    if (!supabase) return setMessage("Supabase n'est pas configuré.");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setMessage(error.message);
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-mark"><Sparkles size={25} /></div>
        <span className="eyebrow">YAMA ID</span>
        <h1>{mode === "signin" ? "Bienvenue dans ton univers." : "Créer ton YAMA ID."}</h1>
        <p>Un compte personnel pour garder ton profil, tes souvenirs et tes préférences au même endroit.</p>
        <form className="auth-form" onSubmit={submit}>
          <label>{identifier.includes("@") ? <Mail size={17} /> : <Phone size={17} />}
            <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Email ou numéro de téléphone" required autoComplete="username" />
          </label>
          <label><LockKeyhole size={17} /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" required minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"} /></label>
          {message && <p className="auth-message">{message}</p>}
          <button className="primary-button" type="submit" disabled={loading}>{loading ? "Connexion..." : mode === "signin" ? "Se connecter" : "Créer mon YAMA ID"}</button>
        </form>
        <div className="auth-divider"><span>ou</span></div>
        <button className="google-button" onClick={google} disabled={loading}><Chrome size={18} /> Continuer avec Google</button>
        <button className="auth-switch" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }}>
          {mode === "signin" ? "Créer un YAMA ID" : "J'ai déjà un YAMA ID"}
        </button>
      </section>
    </main>
  );
}
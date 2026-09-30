import { useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  BookOpen, CheckCircle2, FileImage, FileText, ImagePlus, Lightbulb,
  Play, Sparkles, Upload, WandSparkles, X,
} from "lucide-react";

type StudioMode = "chat" | "image" | "retouch" | "files" | "homework" | "learn";
type LocalFile = { id: string; file: File; url: string };
type AIResult = { type: "text"; text: string } | { type: "image"; mimeType: string; dataUrl: string };

const tools: { id: StudioMode; label: string; description: string; icon: typeof Sparkles }[] = [
  { id: "chat", label: "Assistant", description: "Réfléchir, écrire et organiser", icon: Sparkles },
  { id: "image", label: "Images", description: "Créer des visuels à partir d'une idée", icon: ImagePlus },
  { id: "retouch", label: "Retouche", description: "Améliorer et transformer une image", icon: WandSparkles },
  { id: "files", label: "Fichiers", description: "Importer et travailler avec tes documents", icon: Upload },
  { id: "homework", label: "Devoirs", description: "Comprendre et résoudre un exercice", icon: BookOpen },
  { id: "learn", label: "Apprendre", description: "Créer un parcours et s'entraîner", icon: Lightbulb },
];

export function YamaAIStudio() {
  const [mode, setMode] = useState<StudioMode>("chat");
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [generated, setGenerated] = useState<string[]>([]);
  const [aiResults, setAiResults] = useState<AIResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quizAnswer, setQuizAnswer] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const activeTool = tools.find((tool) => tool.id === mode) ?? tools[0];
  const canGenerate = prompt.trim().length > 0 || files.length > 0;
  const apiUrl = import.meta.env.VITE_AI_API_URL || "/api/yama-ai";

  const modeCopy = useMemo(() => ({
    chat: { title: "Ton espace de réflexion", placeholder: "Écris ce que tu veux faire avec Yama…" },
    image: { title: "Créer une image", placeholder: "Décris l'image que tu veux créer…" },
    retouch: { title: "Retoucher une image", placeholder: "Ex. améliorer la lumière, supprimer un élément, restaurer…" },
    files: { title: "Travailler avec un fichier", placeholder: "Que veux-tu que Yama fasse avec ton document ?" },
    homework: { title: "Aide aux devoirs", placeholder: "Colle l'énoncé ou explique ce qui te bloque…" },
    learn: { title: "Apprendre avec Yama", placeholder: "Quelle matière ou quelle compétence veux-tu travailler ?" },
  }[mode]), [mode]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) }));
    setFiles((current) => [...current, ...next].slice(0, 8));
  }

  function removeFile(id: string) {
    setFiles((current) => {
      const item = current.find((file) => file.id === id);
      if (item) URL.revokeObjectURL(item.url);
      return current.filter((file) => file.id !== id);
    });
  }

  async function fileToDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Impossible de lire le fichier."));
      reader.readAsDataURL(file);
    });
  }

  async function runAction() {
    if (!canGenerate || loading) return;
    setLoading(true);
    setError("");
    try {
      if (!supabase) throw new Error("Supabase n'est pas configuré dans l'application.");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Ta session a expiré. Reconnecte-toi à YAMA.");
      const attachments = await Promise.all(files.map(async (item) => ({
        name: item.file.name,
        mimeType: item.file.type || "application/octet-stream",
        data: await fileToDataUrl(item.file),
      })));
      const imageFile = files.find((item) => item.file.type.startsWith("image/"));
      const imageData = imageFile ? await fileToDataUrl(imageFile.file) : undefined;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({
          mode, prompt,
          attachments: mode === "retouch" ? [] : attachments,
          imageData, imageMimeType: imageFile?.file.type,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Yama AI n'a pas pu répondre.");
      if (data.type === "image" && data.dataUrl) {
        setAiResults((current) => [{ type: "image", mimeType: data.mimeType || "image/png", dataUrl: data.dataUrl }, ...current].slice(0, 4));
      } else if (data.type === "text") {
        setAiResults((current) => [{ type: "text", text: data.text || "Yama AI n'a pas retourné de texte." }, ...current].slice(0, 6));
      }
      setGenerated((current) => [mode === "image" ? "Image générée avec Hugging Face." : mode === "retouch" ? "Image retouchée avec Hugging Face." : "Réponse générée par Gemini.", ...current].slice(0, 4));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur inattendue est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ai-studio">
      <div className="ai-studio-head">
        <div>
          <span className="card-kicker">YAMA AI</span>
          <h2>Studio de création et d'apprentissage</h2>
          <p>Un seul espace pour réfléchir, créer, étudier et travailler avec tes fichiers.</p>
        </div>
        <div className="ai-status"><span className="ai-status-dot" /> Espace prêt</div>
      </div>

      <div className="ai-tool-grid">
        {tools.map(({ id, label, description, icon: Icon }) => (
          <button className={mode === id ? "ai-tool active" : "ai-tool"} key={id} onClick={() => setMode(id)}>
            <span className="ai-tool-icon"><Icon size={19} /></span>
            <span><strong>{label}</strong><small>{description}</small></span>
          </button>
        ))}
      </div>

      <div className="ai-workspace">
        <div className="ai-workspace-main">
          <div className="ai-workspace-title">
            <div className="ai-tool-icon large"><activeTool.icon size={22} /></div>
            <div><span className="card-kicker">Mode {activeTool.label}</span><h3>{modeCopy.title}</h3></div>
          </div>

          {(mode === "retouch" || mode === "files" || mode === "homework" || mode === "chat" || mode === "learn") && (
            <button className="upload-zone" onClick={() => inputRef.current?.click()}>
              <Upload size={23} />
              <strong>Importer des fichiers</strong>
              <span>Images, PDF et documents selon le mode</span>
              <input ref={inputRef} type="file" multiple hidden accept="image/*,.pdf,.doc,.docx,.txt" onChange={(e) => addFiles(e.target.files)} />
            </button>
          )}

          <textarea className="ai-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={modeCopy.placeholder} rows={7} />

          {(mode === "homework" || mode === "learn") && (
            <div className="learning-options">
              <span><BookOpen size={16} /> Explication étape par étape</span>
              <span><CheckCircle2 size={16} /> Vérifier ma réponse</span>
              <span><FileText size={16} /> Générer des exercices similaires</span>
            </div>
          )}

          <div className="ai-composer-footer">
            <button className="secondary-action" onClick={() => inputRef.current?.click()}><Upload size={17} /> Ajouter un fichier</button>
            <button className="primary-button ai-run" disabled={!canGenerate || loading} onClick={runAction}>
              {loading ? "Yama réfléchit..." : mode === "homework" || mode === "learn" ? "Commencer" : mode === "image" ? "Créer l'image" : mode === "retouch" ? "Retoucher l'image" : "Envoyer à Yama AI"} <Play size={17} />
            </button>
          </div>

          {error && <p className="connection-error" role="alert">{error}</p>}

          {files.length > 0 && (
            <div className="file-list">
              {files.map((item) => (
                <div className="file-chip" key={item.id}>
                  {item.file.type.startsWith("image/") ? <FileImage size={17} /> : <FileText size={17} />}
                  <span>{item.file.name}</span>
                  <button onClick={() => removeFile(item.id)} aria-label="Retirer le fichier"><X size={15} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="ai-workspace-side">
          <div className="ai-side-card">
            <span className="card-kicker">Pipeline YAMA</span>
            <h3>Créer → vérifier → améliorer</h3>
            <p>Le studio est préparé pour connecter les moteurs réels de génération d'image, de retouche et les modèles d'assistance.</p>
            <div className="pipeline"><span>01</span> Comprendre <span>02</span> Produire <span>03</span> Affiner</div>
          </div>
          <div className="ai-side-card">
            <span className="card-kicker">Fichiers</span>
            <h3>{files.length} élément{files.length > 1 ? "s" : ""} importé{files.length > 1 ? "s" : ""}</h3>
            <p>Les fichiers sélectionnés restent dans ce flux local tant qu'aucun stockage sécurisé n'est configuré.</p>
          </div>
        </aside>
      </div>

      {mode === "learn" && (
        <div className="quiz-card">
          <div><span className="card-kicker">Entraînement</span><h3>Mini exercice</h3><p>Réponds en quelques lignes. Yama pourra ensuite corriger et expliquer la méthode.</p></div>
          <input value={quizAnswer} onChange={(e) => setQuizAnswer(e.target.value)} placeholder="Ta réponse…" />
          <button className="secondary-action" disabled={!quizAnswer.trim()} onClick={() => setGenerated((current) => ["Réponse enregistrée pour correction guidée.", ...current])}>Vérifier</button>
        </div>
      )}

      {aiResults.length > 0 && (
        <div className="ai-results">
          <div className="section-title"><div><span className="card-kicker">Réponses réelles</span><h3>Yama AI</h3></div><Sparkles size={21} /></div>
          {aiResults.map((result, index) => result.type === "image" ? (
            <div className="ai-result ai-image-result" key={index}>
              <img src={result.dataUrl} alt="Résultat généré par Yama AI" />
            </div>
          ) : (
            <div className="ai-result" key={index}><Sparkles size={18} /><span>{result.text}</span></div>
          ))}
        </div>
      )}
      {generated.length > 0 && (
        <div className="ai-results">
          <div className="section-title"><div><span className="card-kicker">Activité récente</span><h3>Flux Yama AI</h3></div><Sparkles size={21} /></div>
          {generated.map((item, index) => <div className="ai-result" key={index}><CheckCircle2 size={18} /><span>{item}</span></div>)}
        </div>
      )}
    </section>
  );
}

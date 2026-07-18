import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Headset } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Button } from "./Button";
import { Input } from "./Input";
import { useApp } from "../../context/AppContext";
import { usePrefs } from "../../context/PrefsContext";
import { cn } from "../ui/utils";

interface Msg {
  id: number;
  from: "user" | "agent";
  text: string;
  time: string;
}

let msgId = 1;
const now = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

// Support en ligne uniquement en journée (9h–18h) — sinon formulaire de contact
const isOnline = () => {
  const h = new Date().getHours();
  return h >= 9 && h < 18;
};

export function SupportChat() {
  const { currentUser } = useApp();
  const { t, dir } = usePrefs();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(true);
  const online = isOnline();

  const [messages, setMessages] = useState<Msg[]>([
    { id: msgId++, from: "agent", text: t("chat.greeting"), time: now() },
  ]);
  const [draft, setDraft] = useState("");
  const [form, setForm] = useState({ name: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "", email: currentUser?.email ?? "", message: "" });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) { setUnread(false); scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }
  }, [open, messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    const userMsg: Msg = { id: msgId++, from: "user", text: draft.trim(), time: now() };
    setMessages((m) => [...m, userMsg]);
    setDraft("");
    // Réponse automatique simulée
    setTimeout(() => {
      setMessages((m) => [...m, { id: msgId++, from: "agent", text: t("chat.auto"), time: now() }]);
    }, 1000);
  };

  const submitOffline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) { toast.error("Veuillez remplir tous les champs."); return; }
    toast.success("Message envoyé ! Nous vous répondrons par e-mail.");
    setForm((f) => ({ ...f, message: "" }));
    setOpen(false);
  };

  return (
    <>
      {/* Bulle flottante */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed bottom-6 z-50 size-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30",
          "flex items-center justify-center hover:brightness-110 active:scale-95 transition-all",
          dir === "rtl" ? "left-6" : "right-6",
        )}
        aria-label={t("chat.title")}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><X className="size-6" /></motion.span>
          ) : (
            <motion.span key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}><MessageCircle className="size-6" /></motion.span>
          )}
        </AnimatePresence>
        {!open && unread && (
          <span className="absolute -top-1 -right-1 size-5 rounded-full bg-destructive text-white text-[10px] font-semibold flex items-center justify-center animate-pulse">1</span>
        )}
      </button>

      {/* Fenêtre de chat */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed bottom-24 z-50 w-[calc(100vw-3rem)] sm:w-96 h-[30rem] max-h-[70vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden",
              dir === "rtl" ? "left-6" : "right-6",
            )}
          >
            {/* En-tête */}
            <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
              <span className="size-9 rounded-full bg-white/20 flex items-center justify-center"><Headset className="size-5" /></span>
              <div className="flex-1">
                <p className="font-semibold leading-tight">{t("chat.title")}</p>
                <p className="text-xs flex items-center gap-1.5 text-white/80">
                  <span className={cn("size-2 rounded-full", online ? "bg-emerald-400" : "bg-slate-300")} />
                  {online ? `${t("chat.online")} 🟢` : "Hors ligne"}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/10 rounded-lg"><X className="size-5" /></button>
            </div>

            {online ? (
              <>
                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/40">
                  {messages.map((m) => (
                    <div key={m.id} className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[80%] px-3.5 py-2 text-sm shadow-sm",
                        m.from === "user"
                          ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                          : "bg-card text-foreground border border-border rounded-2xl rounded-bl-md",
                      )}>
                        <p>{m.text}</p>
                        <p className={cn("text-[10px] mt-1", m.from === "user" ? "text-white/70" : "text-muted-foreground")}>{m.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Saisie */}
                <form onSubmit={sendMessage} className="p-3 border-t border-border flex items-center gap-2">
                  <input
                    value={draft} onChange={(e) => setDraft(e.target.value)}
                    placeholder={t("chat.placeholder")}
                    className="flex-1 h-10 rounded-full border border-border bg-input-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  <button type="submit" className="size-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:brightness-110 active:scale-95 transition-all">
                    <Send className="size-4" />
                  </button>
                </form>
              </>
            ) : (
              /* Formulaire de contact hors ligne */
              <form onSubmit={submitOffline} className="flex-1 overflow-y-auto p-4 space-y-3">
                <p className="text-sm text-muted-foreground">Nous sommes actuellement hors ligne. Laissez-nous un message :</p>
                <Input label="Nom" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                <Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
                <div>
                  <label className="block mb-1.5 text-sm text-foreground">Message</label>
                  <textarea value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    className="w-full min-h-24 rounded-lg border border-border bg-input-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y" required />
                </div>
                <Button type="submit" className="w-full"><Send className="size-4" /> {t("action.send")}</Button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

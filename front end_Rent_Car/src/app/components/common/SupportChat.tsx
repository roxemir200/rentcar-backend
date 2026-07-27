import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Headset } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useApp } from "../../context/AppContext";
import { useWebSocket } from "../../hooks/useWebSocket";
import { cn } from "../ui/utils";
import { usersAPI } from "../../api/users.api";

export function SupportChat() {
  const { currentUser } = useApp();
  const {
    isConnected,
    messages,
    unreadCount,
    sendMessage,
    markAsRead,
    loadHistory,
    historyLoaded,
  } = useWebSocket();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [supportId, setSupportId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Récupérer l'utilisateur support (admin)
  useEffect(() => {
    async function fetchSupport() {
      try {
        const response = await usersAPI.getSupport();
        setSupportId(Number(response.data.id));
        if (currentUser) {
          setConversationId(`user-${currentUser.id}`);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération du support :", error);
      }
    }

    if (currentUser) {
      fetchSupport();
    }
  }, [currentUser]);

  // Charger l'historique UNIQUEMENT quand le chat s'ouvre
  useEffect(() => {
    if (open && currentUser && conversationId && !historyLoaded) {
      loadHistory(conversationId);
      markAsRead(conversationId);
    }

    // Réinitialiser quand le chat se ferme (optionnel)
    if (!open && historyLoaded) {
      // resetHistory(); // Décommente pour vider l'historique à la fermeture
    }
  }, [open, currentUser, conversationId, historyLoaded, loadHistory, markAsRead]);

  // Scroll automatique en bas
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Envoyer un message
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !isConnected || !supportId || !conversationId) return;

    sendMessage(supportId, draft.trim(), conversationId);
    setDraft("");
  };

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 size-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center hover:brightness-110 active:scale-95 transition-all"
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
        {!open && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 size-5 rounded-full bg-destructive text-white text-[10px] font-semibold flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
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
            className="fixed bottom-24 right-6 z-50 w-96 h-[30rem] max-h-[70vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* En-tête */}
            <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
              <Headset className="size-5" />
              <div className="flex-1">
                <p className="font-semibold">Support RentCar</p>
                <p className="text-xs flex items-center gap-1.5 text-white/80">
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      isConnected ? "bg-emerald-400" : "bg-slate-300"
                    )}
                  />
                  {isConnected ? "En ligne 🟢" : "Hors ligne"}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/40"
            >
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  Aucun message. Posez votre question !
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.senderId === Number(currentUser?.id)
                        ? "justify-end"
                        : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] px-3.5 py-2 text-sm shadow-sm",
                        msg.senderId === Number(currentUser?.id)
                          ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                          : "bg-card text-foreground border border-border rounded-2xl rounded-bl-md"
                      )}
                    >
                      <p>{msg.message}</p>
                      <p
                        className={cn(
                          "text-[10px] mt-1",
                          msg.senderId === Number(currentUser?.id)
                            ? "text-white/70"
                            : "text-muted-foreground"
                        )}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Saisie */}
            <form
              onSubmit={handleSend}
              className="p-3 border-t border-border flex items-center gap-2"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={isConnected ? "Écrire un message..." : "Connexion en cours..."}
                disabled={!isConnected}
                className="flex-1 h-10 rounded-full border border-border bg-input-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!isConnected || !draft.trim()}
                className="size-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                <Send className="size-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

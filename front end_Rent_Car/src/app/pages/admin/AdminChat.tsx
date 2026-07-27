import { useState, useEffect, useRef } from 'react';
import { Search, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import { formatDate } from '../../lib/format';
import { cn } from '../../components/ui/utils';

// ============================================================
// INTERFACES
// ============================================================

interface Conversation {
    userId: string;
    userName: string;
    userEmail: string;
    lastMessage: string;
    lastMessageTime: string;
    unreadCount: number;
    isActive: boolean;
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function AdminChat() {
    const { currentUser } = useApp();
    const { 
        isConnected, 
        messages, 
        sendMessage, 
        loadHistory, 
        markAsRead, 
        conversations, 
        fetchConversations, 
        isLoadingConversations 
    } = useWebSocket();
    
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [draft, setDraft] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // ID du support/admin
    const SUPPORT_ID = Number(currentUser?.id);

    // ============================================================
    // CHARGER LES CONVERSATIONS
    // ============================================================

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    // ============================================================
    // SÉLECTIONNER UNE CONVERSATION
    // ============================================================

    const handleSelectConversation = async (userId: number) => {
        setSelectedUserId(String(userId));
        const conversationId = `user-${userId}`;
        
        // Charger l'historique
        await loadHistory(conversationId);
        
        // Marquer comme lu
        await markAsRead(conversationId);
        
        // Recharger les conversations pour mettre à jour le compteur de non lus
        fetchConversations();
    };

    // ============================================================
    // ENVOYER UN MESSAGE (ADMIN → CLIENT)
    // ============================================================

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!draft.trim() || !selectedUserId || !isConnected) return;
        
        const receiverId = Number(selectedUserId);
        const conversationId = `user-${selectedUserId}`;
        
        sendMessage(receiverId, draft.trim(), conversationId);
        setDraft('');
        
        // Recharger les conversations pour mettre à jour le dernier message
        setTimeout(() => {
            fetchConversations();
        }, 100);
    };

    // ============================================================
    // FILTRER LES CONVERSATIONS
    // ============================================================

    const filteredConversations = conversations.filter(conv => 
        conv.userName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        conv.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const selectedConversation = conversations.find(c => c.userId === selectedUserId);

    // ============================================================
    // SCROLL AUTO
    // ============================================================

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // ============================================================
    // RENDU
    // ============================================================

    return (
        <div className="h-[calc(100vh-200px)]">
            <div className="flex h-full gap-4">
                {/* ============================================================
                    SIDEBAR - Liste des conversations
                ============================================================ */}
                <div className="w-80 flex-shrink-0 bg-muted/30 rounded-xl overflow-hidden border border-border">
                    <div className="p-4 border-b border-border bg-background">
                        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            <MessageCircle className="size-5 text-primary" />
                            Conversations
                            <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                                {conversations.length}
                            </span>
                        </h2>
                        <div className="relative mt-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Rechercher un client..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                        </div>
                    </div>
                    
                    <div className="overflow-y-auto h-[calc(100%-80px)] p-2 space-y-1">
                        {filteredConversations.length === 0 ? (
                            <div className="text-center text-muted-foreground text-sm py-8">
                                Aucune conversation
                            </div>
                        ) : (
                            filteredConversations.map((conv) => (
                                <button
                                    key={conv.userId}
                                    onClick={() => handleSelectConversation(Number(conv.userId))}
                                    className={cn(
                                        "w-full p-3 rounded-xl text-left transition-all hover:bg-muted/50",
                                        selectedUserId === String(conv.userId) && "bg-primary/10 border border-primary/20"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                                                {conv.userName.charAt(0).toUpperCase()}
                                            </div>
                                            {conv.isActive && (
                                                <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 border-2 border-white" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className="font-medium text-foreground truncate">
                                                    {conv.userName}
                                                </p>
                                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                    {formatDate(conv.lastMessageTime, { includeTime: true })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground truncate">
                                                {conv.lastMessage}
                                            </p>
                                        </div>
                                        {conv.unreadCount > 0 && (
                                            <span className="size-5 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold flex items-center justify-center">
                                                {conv.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* ============================================================
                    CHAT - Messages sélectionnés
                ============================================================ */}
                <div className="flex-1 bg-muted/30 rounded-xl overflow-hidden border border-border flex flex-col">
                    {selectedUserId ? (
                        <>
                            {/* En-tête */}
                            <div className="p-4 border-b border-border bg-background flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                                        {selectedConversation?.userName.charAt(0).toUpperCase() || 'C'}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground">
                                            {selectedConversation?.userName || 'Client'}
                                        </p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                            <span className={cn("size-2 rounded-full", selectedConversation?.isActive ? "bg-emerald-400" : "bg-slate-300")} />
                                            {selectedConversation?.isActive ? "En ligne" : "Hors ligne"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                        {selectedConversation?.userEmail}
                                    </span>
                                </div>
                            </div>

                            {/* Messages */}
                            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                                {messages.length === 0 ? (
                                    <div className="text-center text-muted-foreground text-sm py-8">
                                        Aucun message. Commencez la conversation !
                                    </div>
                                ) : (
                                    messages.map((msg) => {
                                        const isAdmin = msg.senderId === SUPPORT_ID;
                                        return (
                                            <motion.div
                                                key={msg.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={cn("flex", isAdmin ? "justify-end" : "justify-start")}
                                            >
                                                <div className={cn(
                                                    "max-w-[70%] px-4 py-2.5 rounded-2xl shadow-sm",
                                                    isAdmin
                                                        ? "bg-primary text-primary-foreground rounded-br-md"
                                                        : "bg-card text-foreground border border-border rounded-bl-md"
                                                )}>
                                                    <p className="text-sm">{msg.message}</p>
                                                    <p className={cn(
                                                        "text-[10px] mt-1",
                                                        isAdmin ? "text-white/70" : "text-muted-foreground"
                                                    )}>
                                                        {formatDate(msg.timestamp, { includeTime: true })}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Saisie */}
                            <form onSubmit={handleSend} className="p-3 border-t border-border bg-background flex items-center gap-2">
                                <input
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                    placeholder={isConnected ? "Écrire un message..." : "Connexion en cours..."}
                                    disabled={!isConnected}
                                    className="flex-1 h-10 rounded-full border border-border bg-input-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                                <button
                                    type="submit"
                                    disabled={!isConnected || !draft.trim()}
                                    className="size-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <MessageCircle className="size-16 mb-4 opacity-20" />
                            <p className="text-lg font-medium">Sélectionnez une conversation</p>
                            <p className="text-sm">Choisissez un client pour commencer à discuter</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

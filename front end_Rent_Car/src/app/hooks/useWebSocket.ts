import { useEffect, useState, useRef, useCallback } from "react";
import { Client, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useApp } from "../context/AppContext";
import { api } from "../api/axios";

interface ChatMessage {
  id: number;
  senderId: number;
  receiverId: number;
  message: string;
  timestamp: string;
  isRead: boolean;
  conversationId: string;
}

interface Conversation {
  userId: number;
  userName: string;
  userEmail: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isActive: boolean;
}

export function useWebSocket() {
  const { currentUser } = useApp();
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const stompClient = useRef<Client | null>(null);
  const unreadCountFetchingRef = useRef(false);
  const currentConversationId = useRef<string | null>(null);
  const isLoadingHistoryRef = useRef(false);
  const isLoadingConversationsRef = useRef(false);

  const fetchUnreadCount = useCallback(async () => {
    if (unreadCountFetchingRef.current) return;

    unreadCountFetchingRef.current = true;

    try {
      const response = await api.get("/chat/unread-count");
      setUnreadCount(response.data);
    } finally {
      unreadCountFetchingRef.current = false;
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    if (isLoadingConversationsRef.current) return;

    isLoadingConversationsRef.current = true;
    setIsLoadingConversations(true);

    try {
      const response = await api.get("/chat/conversations");
      setConversations(response.data);
    } finally {
      isLoadingConversationsRef.current = false;
      setIsLoadingConversations(false);
    }
  }, []);

  const markAsRead = useCallback(async (conversationId: string) => {
    try {
      await api.put(`/chat/read/${conversationId}`);
      await fetchUnreadCount();
      await fetchConversations();
    } catch {
      // Ignore transient failures and keep current UI state.
    }
  }, [fetchConversations, fetchUnreadCount]);

  const loadHistory = useCallback(async (conversationId: string) => {
    if (isLoadingHistoryRef.current) return;

    isLoadingHistoryRef.current = true;
    currentConversationId.current = conversationId;
    setHistoryLoaded(false);

    try {
      const response = await api.get(`/chat/history/${conversationId}`);
      setMessages(response.data);
      setHistoryLoaded(true);
    } finally {
      isLoadingHistoryRef.current = false;
    }
  }, []);

  const resetHistory = useCallback(() => {
    currentConversationId.current = null;
    setHistoryLoaded(false);
    setMessages([]);
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const socket = new SockJS("http://localhost:8089/ws");
    const client = new Client({
      webSocketFactory: () => socket,
      connectHeaders: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      reconnectDelay: 5000,
      onConnect: () => {
        setIsConnected(true);

        client.subscribe(`/topic/messages/${currentUser.id}`, (message: IMessage) => {
          const newMessage = JSON.parse(message.body) as ChatMessage;

          if (currentConversationId.current === newMessage.conversationId) {
            setMessages((prev) => {
              if (prev.some((item) => item.id === newMessage.id)) {
                return prev;
              }
              return [...prev, newMessage];
            });
          }

          if (newMessage.receiverId === Number(currentUser.id) && !newMessage.isRead) {
            setUnreadCount((prev) => prev + 1);
          }

          void fetchConversations();
        });

        client.subscribe(`/topic/presence`, () => {
          void fetchConversations();
        });

        void fetchUnreadCount();
        void fetchConversations();
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      onWebSocketClose: () => {
        setIsConnected(false);
      },
    });

    client.activate();
    stompClient.current = client;

    return () => {
      const activeClient = stompClient.current;
      stompClient.current = null;
      if (activeClient) {
        void activeClient.deactivate();
      }
    };
  }, [currentUser, fetchConversations, fetchUnreadCount]);

  const sendMessage = (
    receiverId: number,
    message: string,
    conversationId: string
  ) => {
    if (!stompClient.current || !isConnected) return;

    currentConversationId.current = conversationId;
    setHistoryLoaded(true);

    const chatMessage = {
      senderId: Number(currentUser?.id),
      receiverId,
      message,
      conversationId,
      timestamp: new Date().toISOString(),
      isRead: false,
    };

    stompClient.current.publish({
      destination: "/app/chat.send",
      body: JSON.stringify(chatMessage),
    });

    setMessages((prev) => [
      ...prev,
      { ...chatMessage, id: Date.now() } as ChatMessage,
    ]);
  };

  return {
    isConnected,
    messages,
    conversations,
    unreadCount,
    isLoadingConversations,
    sendMessage,
    markAsRead,
    loadHistory,
    fetchConversations,
    historyLoaded,
    resetHistory,
  };
}

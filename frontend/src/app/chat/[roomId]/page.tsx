'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useChatStore } from '@/store/chat.store';
import { useAuthStore } from '@/store/auth.store';
import { Message } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import ChatHeader from '@/components/chat/ChatHeader';
import MessageBubble from '@/components/chat/MessageBubble';
import MessageInput from '@/components/chat/MessageInput';
import TypingIndicator from '@/components/chat/TypingIndicator';
import ForwardModal from '@/components/chat/ForwardModal';

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuthStore();
  const { rooms, messages, hasMore, nextCursors, setMessages, prependMessages, setActiveRoom, setUnreadCount, addOptimisticMessage } = useChatStore();
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useRef(true);

  const currentUserId = (user?.id ?? user?._id) || '';
  const room = rooms.find((r) => r._id === roomId);
  const roomMessages = messages[roomId] || [];
  const roomHasMore = hasMore[roomId] ?? false;
  const cursor = nextCursors[roomId];

  const fetchMessages = useCallback(async (cursorParam?: string) => {
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (cursorParam) params.set('cursor', cursorParam);
      const { data } = await api.get(`/rooms/${roomId}/messages?${params}`);
      return data.data;
    } catch {
      return null;
    }
  }, [roomId]);

  useEffect(() => {
    setActiveRoom(roomId);
    setIsLoading(true);

    fetchMessages().then((data) => {
      if (data) setMessages(roomId, data.messages, data.nextCursor, data.hasMore);
      setIsLoading(false);
    });

    const socket = getSocket();
    socket.emit('room:join', roomId);
    socket.emit('messages:read', { roomId });
    socket.emit('message:delivered', { roomId });
    setUnreadCount(roomId, 0);

    return () => {
      setActiveRoom(null);
      socket.emit('room:leave', roomId);
    };
  }, [roomId, setActiveRoom, fetchMessages, setMessages, setUnreadCount]);

  // Scroll to bottom on new messages if already at bottom
  useEffect(() => {
    if (isAtBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [roomMessages.length]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    isAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;

    // Infinite scroll - load more when near top
    if (el.scrollTop < 100 && roomHasMore && !isLoadingMore) {
      loadMore();
    }
  };

  const loadMore = async () => {
    if (!cursor || isLoadingMore) return;
    setIsLoadingMore(true);
    const prevHeight = containerRef.current?.scrollHeight || 0;
    const data = await fetchMessages(cursor);
    if (data) {
      prependMessages(roomId, data.messages, data.nextCursor, data.hasMore);
      // Maintain scroll position
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight - prevHeight;
        }
      });
    }
    setIsLoadingMore(false);
  };

  const sendMessage = (content: string, type: 'text' | 'emoji' = 'text', mentions?: { userId: string; username: string }[]) => {
    addOptimisticMessage(roomId, {
      content,
      type: type as any,
      sender: { ...user, id: currentUserId, _id: currentUserId, username: user?.username } as any,
      reply: replyTo ? { messageId: replyTo._id, content: replyTo.content, senderUsername: replyTo.sender.username } : undefined,
    });
    const socket = getSocket();
    const payload: any = {
      roomId,
      content,
      type,
      clientMessageId: `c${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    };
    if (replyTo) {
      payload.reply = {
        messageId: replyTo._id,
        content: replyTo.content,
        senderUsername: replyTo.sender.username,
      };
      setReplyTo(null);
    }
    if (mentions?.length) payload.mentions = mentions;
    socket.emit('message:send', payload);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-950 min-h-0">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 border-2 border-slate-700 border-t-primary-500 rounded-full"
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-slate-400"
          >
            Loading conversation...
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      {/* Premium ambient - very subtle radial accent */}
      <div
        className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(251,191,36,0.02),transparent_50%)]"
      />
      {room && <ChatHeader room={room} currentUserId={currentUserId} />}

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-4 md:px-5 space-y-1 relative"
      >
        <AnimatePresence mode="wait">
          {isLoadingMore && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center py-2"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-6 h-6 border-2 border-slate-700 border-t-primary-500 rounded-full"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {roomMessages.map((message: Message, index: number) => {
          const prev = roomMessages[index - 1];
          const next = roomMessages[index + 1];
          const senderId = message.sender._id ?? message.sender.id;
          const prevSenderId = prev ? (prev.sender._id ?? prev.sender.id) : null;
          const nextSenderId = next ? (next.sender._id ?? next.sender.id) : null;
          const showAvatar = !prev || prevSenderId !== senderId;
          const isLast = !next || nextSenderId !== senderId;

          return (
            <MessageBubble
              key={message._id}
              message={message}
              isOwn={senderId === currentUserId}
              showAvatar={showAvatar}
              isLast={isLast}
              currentUserId={currentUserId}
              onReply={() => setReplyTo(message)}
              onForward={setForwardMessage}
            />
          );
        })}

        <TypingIndicator roomId={roomId} currentUserId={currentUserId} />
        <div ref={bottomRef} />
      </div>

      <MessageInput
        roomId={roomId}
        room={room}
        currentUserId={currentUserId}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onSend={sendMessage}
      />

      <AnimatePresence>
        {forwardMessage && (
          <ForwardModal
            key="forward"
            message={forwardMessage}
            rooms={rooms}
            currentRoomId={roomId}
            currentUserId={currentUserId}
            onClose={() => setForwardMessage(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

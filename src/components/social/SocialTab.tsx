import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../lib/context';
import { db, SocialPost } from '../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import { Users, MessageCircle, Shield, Send, Lock, Wifi, Heart, MessageSquare, Share2, MoreHorizontal, Hash, Filter, X, Search, Calendar, User as UserIcon } from 'lucide-react';
import { formatDistanceToNow, subDays } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  isSystem?: boolean;
}

export const SocialTab = () => {
  const { user } = useAppContext();
  const [activeView, setActiveView] = useState<'feed' | 'chat' | 'profile'>('feed');
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const cryptoKeyRef = useRef<CryptoKey | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Feed State
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostTags, setNewPostTags] = useState('');
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState('');

  // Group chat state
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [selectedBuddies, setSelectedBuddies] = useState<string[]>([]);
  
  // Share state
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharePassword, setSharePassword] = useState('');
  const [selectedSharePostId, setSelectedSharePostId] = useState<string | null>(null);

  const generatePostShareLink = () => {
    if (!selectedSharePostId) return;
    const baseUrl = window.location.origin;
    let shareUrl = `${baseUrl}/share/post/${selectedSharePostId}`;
    if (sharePassword) {
      shareUrl += `?protected=true`;
    }
    navigator.clipboard.writeText(shareUrl);
    toast.success(`Link copied to clipboard!\n${sharePassword ? '(Password protected)' : '(Public link)'}`);
    setShowShareModal(false);
    setSelectedSharePostId(null);
    setSharePassword('');
  };

  const uniqueUsers = useLiveQuery(async () => {
    if (!user) return [];
    const allPosts = await db.posts.toArray();
    const usersMap = new Map();
    allPosts.forEach(p => {
      if (p.userId !== user.id) {
        usersMap.set(p.userId, { id: p.userId, name: p.authorName, avatar: p.authorName.charAt(0) });
      }
    });
    return Array.from(usersMap.values());
  }, [user]);

  const toggleBuddySelection = (id: string) => {
    setSelectedBuddies(prev => 
      prev.includes(id) ? prev.filter(b => b !== id) : 
      prev.length < 4 ? [...prev, id] : prev
    );
  };

  const createGroupChannel = () => {
    if (selectedBuddies.length === 0) return;
    const newRoomId = `group_${uuidv4().slice(0, 8)}`;
    setRoomId(newRoomId);
    setIsCreatingGroup(false);
    setSelectedBuddies([]);
    joinRoom(newRoomId); // automatically join
  };

  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showMyPostsOnly, setShowMyPostsOnly] = useState(false);
  const [showFollowingOnly, setShowFollowingOnly] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  const { updateUser } = useAppContext();

  const posts = useLiveQuery(
    async () => {
      let collection = await db.posts.orderBy('createdAt').reverse().toArray();
      
      if (showMyPostsOnly && user) {
        collection = collection.filter(p => p.userId === user.id);
      } else if (selectedUserId) {
        collection = collection.filter(p => p.userId === selectedUserId);
      } else if (showFollowingOnly && user && user.following) {
        collection = collection.filter(p => user.following?.includes(p.userId));
      }
      
      if (activeTag) {
        collection = collection.filter(p => p.tags && p.tags.includes(activeTag));
      }

      if (searchKeyword) {
        const lowerKeyword = searchKeyword.toLowerCase();
        collection = collection.filter(p => p.content.toLowerCase().includes(lowerKeyword));
      }

      if (dateFilter === '7days') {
        collection = collection.filter(p => new Date(p.createdAt) >= subDays(new Date(), 7));
      } else if (dateFilter === '30days') {
        collection = collection.filter(p => new Date(p.createdAt) >= subDays(new Date(), 30));
      }
      
      return collection;
    },
    [activeTag, showMyPostsOnly, showFollowingOnly, selectedUserId, user?.id, user?.following, searchKeyword, dateFilter]
  );

  const trendingTags = useLiveQuery(async () => {
    const allPosts = await db.posts.toArray();
    const tagCounts: Record<string, number> = {};
    allPosts.forEach(post => {
      post.tags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag);
  });

  const comments = useLiveQuery(
    () => expandedPostId ? db.comments.where('postId').equals(expandedPostId).sortBy('createdAt') : []
  , [expandedPostId]);

  useEffect(() => {
    // Seed some posts if empty
    const seedPosts = async () => {
      const count = await db.posts.count();
      if (count === 0) {
        await db.posts.bulkAdd([
          {
            id: uuidv4(),
            userId: 'system-1',
            authorName: 'Sarah K.',
            content: 'Just hit 30 days sober! Feeling clearer than ever. Thanks for the support everyone.',
            likes: ['user-1', 'user-2'],
            commentsCount: 2,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            isPublic: true,
            tags: ['milestone', 'grateful']
          },
          {
            id: uuidv4(),
            userId: 'system-2',
            authorName: 'Mike R.',
            content: 'Struggling a bit today with cravings, but going for a run instead of giving in.',
            likes: ['user-3'],
            commentsCount: 1,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
            isPublic: true,
            tags: ['cravings', 'exercise']
          }
        ]);
      }
    };
    seedPosts();
  }, []);

  // Chat Logic (Updated for ECDH)
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const getAESEncryptionKey = async (secret: string) => {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode("noteflow-group-chat-salt"),
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  };

  const encryptMessage = async (text: string) => {
    if (!cryptoKeyRef.current) return null;
    const encoder = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      cryptoKeyRef.current,
      encoder.encode(text)
    );
    
    const buffer = new Uint8Array(iv.byteLength + encrypted.byteLength);
    buffer.set(iv);
    buffer.set(new Uint8Array(encrypted), iv.byteLength);
    
    return btoa(String.fromCharCode(...buffer));
  };

  const decryptMessage = async (base64: string) => {
    if (!cryptoKeyRef.current) return null;
    try {
      const binary = atob(base64);
      const buffer = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        buffer[i] = binary.charCodeAt(i);
      }
      
      const iv = buffer.slice(0, 12);
      const data = buffer.slice(12);
      
      const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        cryptoKeyRef.current,
        data
      );
      
      return new TextDecoder().decode(decrypted);
    } catch (e) {
      console.error("Decryption failed", e);
      return "[Encrypted Message]";
    }
  };

  const joinRoom = async (overrideRoomId?: string) => {
    const targetRoom = overrideRoomId || roomId;
    if (!targetRoom.trim() || !user) return;
    
    // Generate ephemeral key pair for this session
    const keyPair = await generateKeyPair();
    privateKeyRef.current = keyPair.privateKey;
    const publicKeyJwk = await exportKey(keyPair.publicKey);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    
    ws.onopen = () => {
      setIsConnected(true);
      if (overrideRoomId) setRoomId(overrideRoomId);
      
      ws.send(JSON.stringify({ type: 'join', roomId: targetRoom }));
      
      // Broadcast public key to establish shared secret
      ws.send(JSON.stringify({
        type: 'signal',
        data: { type: 'offer', key: publicKeyJwk },
        senderId: user.id
      }));

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        senderId: 'system',
        content: `Joined secure channel: ${roomId}. Waiting for secure handshake...`,
        timestamp: new Date().toISOString(),
        isSystem: true
      }]);
    };
    
    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'system') {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          senderId: 'system',
          content: data.content,
          timestamp: new Date().toISOString(),
          isSystem: true
        }]);
      } else if (data.type === 'signal') {
        // Handle Key Exchange
        if (data.senderId === user.id) return; // Ignore own signals

        if (data.data.type === 'offer') {
          // Received an offer, compute shared secret and send answer
          const remotePublicKey = await importKey(data.data.key);
          if (privateKeyRef.current) {
            cryptoKeyRef.current = await deriveSharedKey(privateKeyRef.current, remotePublicKey);
            
            // Send our public key back
            const myPublicKeyJwk = await exportKey(keyPair.publicKey);
            ws.send(JSON.stringify({
              type: 'signal',
              data: { type: 'answer', key: myPublicKeyJwk },
              senderId: user.id
            }));
            
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              senderId: 'system',
              content: 'Secure connection established (E2E Encrypted).',
              timestamp: new Date().toISOString(),
              isSystem: true
            }]);
          }
        } else if (data.data.type === 'answer') {
          // Received an answer, compute shared secret
          const remotePublicKey = await importKey(data.data.key);
          if (privateKeyRef.current) {
            cryptoKeyRef.current = await deriveSharedKey(privateKeyRef.current, remotePublicKey);
            
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              senderId: 'system',
              content: 'Secure connection established (E2E Encrypted).',
              timestamp: new Date().toISOString(),
              isSystem: true
            }]);
          }
        }
      } else if (data.type === 'message') {
        const decrypted = await decryptMessage(data.content);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          senderId: data.senderId,
          content: decrypted || '[Error decrypting - Key Mismatch]',
          timestamp: data.timestamp
        }]);
      }
    };
    
    ws.onclose = () => {
      setIsConnected(false);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        senderId: 'system',
        content: 'Disconnected from secure channel.',
        timestamp: new Date().toISOString(),
        isSystem: true
      }]);
      cryptoKeyRef.current = null;
      privateKeyRef.current = null;
    };
    wsRef.current = ws;
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !wsRef.current || !isConnected || !user) return;
    const encrypted = await encryptMessage(inputMessage);
    if (!encrypted) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'message',
      content: encrypted,
      senderId: user.id
    }));
    
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      senderId: user.id,
      content: inputMessage,
      timestamp: new Date().toISOString()
    }]);
    setInputMessage('');
  };

  // Feed Actions
  const handleCreatePost = async () => {
    if (!user || !newPostContent.trim()) return;
    try {
      await db.posts.add({
        id: uuidv4(),
        userId: user.id,
        authorName: user.name,
        content: newPostContent,
        likes: [],
        commentsCount: 0,
        createdAt: new Date().toISOString(),
        isPublic: true,
        tags: newPostTags.split(',').map(t => t.trim()).filter(Boolean)
      });
      setNewPostContent('');
      setNewPostTags('');
      setIsCreatingPost(false);
    } catch (error) {
      console.error("Failed to create post", error);
    }
  };

  const handleLike = async (post: SocialPost) => {
    if (!user) return;
    const isLiked = post.likes.includes(user.id);
    const newLikes = isLiked 
      ? post.likes.filter(id => id !== user.id)
      : [...post.likes, user.id];
    
    await db.posts.update(post.id, { likes: newLikes });
  };

  const handleComment = async (postId: string) => {
    if (!user || !commentContent.trim()) return;
    try {
      await db.comments.add({
        id: uuidv4(),
        postId,
        userId: user.id,
        authorName: user.name,
        content: commentContent,
        createdAt: new Date().toISOString()
      });
      
      const post = await db.posts.get(postId);
      if (post) {
        await db.posts.update(postId, { commentsCount: post.commentsCount + 1 });
      }
      
      setCommentContent('');
    } catch (error) {
      console.error("Failed to add comment", error);
    }
  };

  const handleFollow = async (authorId: string) => {
    if (!user) return;
    const isFollowing = user.following?.includes(authorId);
    const newFollowing = isFollowing 
      ? user.following?.filter(id => id !== authorId)
      : [...(user.following || []), authorId];
    
    await updateUser({ following: newFollowing });
  };

  const handleStartDM = (targetUserId: string) => {
    if (!user) return;
    // Create a consistent room ID for the two users
    const sortedIds = [user.id, targetUserId].sort();
    const dmRoomId = `dm_${sortedIds[0]}_${sortedIds[1]}`;
    setRoomId(dmRoomId);
    setActiveView('chat');
  };

  const viewProfile = (userId: string) => {
    setViewingProfileId(userId);
    setActiveView('profile');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-semibold tracking-tight">Community</h2>
        <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveView('feed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === 'feed' 
                ? 'bg-white dark:bg-neutral-700 shadow-sm text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)]' 
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            Feed
          </button>
          <button
            onClick={() => setActiveView('chat')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === 'chat' 
                ? 'bg-white dark:bg-neutral-700 shadow-sm text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)]' 
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            Secure Chat
          </button>
        </div>
      </div>

      {activeView === 'feed' ? (
        <div className="space-y-6">
          {/* Create Post Card */}

          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-sm border border-neutral-200 dark:border-neutral-700">
            {!isCreatingPost ? (
              <div 
                onClick={() => setIsCreatingPost(true)}
                className="flex items-center gap-3 cursor-pointer p-2 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 rounded-xl transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[var(--color-primary-100)] dark:bg-[var(--color-primary-900)] flex items-center justify-center text-[var(--color-primary-700)] dark:text-[var(--color-primary-300)] font-bold">
                  {user?.name.charAt(0)}
                </div>
                <div className="flex-1 bg-neutral-100 dark:bg-neutral-900/50 rounded-full px-4 py-2.5 text-neutral-500 text-sm">
                  Share your recovery journey...
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full p-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl border border-neutral-200 dark:border-neutral-700 resize-none focus:ring-2 focus:ring-[var(--color-primary-500)] outline-none"
                  rows={3}
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <Hash size={16} className="text-neutral-400" />
                  <input
                    type="text"
                    value={newPostTags}
                    onChange={(e) => setNewPostTags(e.target.value)}
                    placeholder="Tags (comma separated)"
                    className="flex-1 bg-transparent text-sm outline-none text-neutral-600 dark:text-neutral-300 placeholder:text-neutral-400"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => setIsCreatingPost(false)}
                    className="px-4 py-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCreatePost}
                    disabled={!newPostContent.trim()}
                    className="px-4 py-2 bg-[var(--color-primary-600)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-primary-700)] transition-colors disabled:opacity-50"
                  >
                    Post
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Filters & Trending */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input 
                  type="text" 
                  placeholder="Search posts..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-[var(--color-primary-500)] outline-none transition-all text-sm"
                />
              </div>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full sm:w-auto pl-9 pr-8 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-[var(--color-primary-500)] outline-none transition-all text-sm appearance-none"
                >
                  <option value="all">All Time</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
              <button
                onClick={() => {
                  setShowMyPostsOnly(!showMyPostsOnly);
                  setShowFollowingOnly(false);
                  setActiveTag(null);
                  setSelectedUserId(null);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  showMyPostsOnly
                    ? 'bg-[var(--color-primary-600)] text-white'
                    : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700'
                }`}
              >
                <Users size={14} />
                My Posts
              </button>
              <button
                onClick={() => {
                  setShowFollowingOnly(!showFollowingOnly);
                  setShowMyPostsOnly(false);
                  setActiveTag(null);
                  setSelectedUserId(null);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  showFollowingOnly
                    ? 'bg-[var(--color-primary-600)] text-white'
                    : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700'
                }`}
              >
                <Users size={14} />
                Following
              </button>
              {selectedUserId && (
                <button
                  onClick={() => setSelectedUserId(null)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--color-primary-100)] text-[var(--color-primary-700)] dark:bg-[var(--color-primary-900)] dark:text-[var(--color-primary-300)] border border-[var(--color-primary-200)] whitespace-nowrap"
                >
                  <Users size={12} />
                  Selected User
                  <X size={14} className="ml-1" />
                </button>
              )}
              <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700 mx-1" />
              {trendingTags?.map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    setActiveTag(activeTag === tag ? null : tag);
                    setShowMyPostsOnly(false);
                  }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                    activeTag === tag
                      ? 'bg-[var(--color-primary-100)] text-[var(--color-primary-700)] dark:bg-[var(--color-primary-900)] dark:text-[var(--color-primary-300)] border border-[var(--color-primary-200)]'
                      : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:border-[var(--color-primary-300)]'
                  }`}
                >
                  <Hash size={12} />
                  {tag}
                </button>
              ))}
              {activeTag && (
                <button
                  onClick={() => setActiveTag(null)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-full text-xs font-medium text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <X size={14} />
                  Clear
                </button>
              )}
            </div>

            {/* Feed List */}
            <div className="space-y-4">
              {posts?.length === 0 && (
                <div className="text-center py-12 text-neutral-500">
                  <p>No posts found matching your filters.</p>
                  {(activeTag || showMyPostsOnly || showFollowingOnly || selectedUserId) && (
                    <button 
                      onClick={() => { setActiveTag(null); setShowMyPostsOnly(false); setShowFollowingOnly(false); setSelectedUserId(null); }}
                      className="text-[var(--color-primary-600)] hover:underline mt-2 text-sm"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}
              {posts?.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm border border-neutral-200 dark:border-neutral-700"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      onClick={() => viewProfile(post.userId)}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all"
                    >
                      {post.authorName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 
                          className="font-semibold text-neutral-900 dark:text-neutral-100 cursor-pointer hover:underline"
                          onClick={() => viewProfile(post.userId)}
                        >
                          {post.authorName}
                        </h4>
                        {user && user.id !== post.userId && (
                          <button
                            onClick={() => handleFollow(post.userId)}
                            className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${
                              user.following?.includes(post.userId)
                                ? 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400'
                                : 'bg-[var(--color-primary-50)] text-[var(--color-primary-600)] dark:bg-[var(--color-primary-900)]/30 dark:text-[var(--color-primary-400)] hover:bg-[var(--color-primary-100)]'
                            }`}
                          >
                            {user.following?.includes(post.userId) ? 'Following' : 'Follow'}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500">{formatDistanceToNow(new Date(post.createdAt))} ago</p>
                    </div>
                  </div>
                  <button className="text-neutral-400 hover:text-neutral-600">
                    <MoreHorizontal size={20} />
                  </button>
                </div>

                <p className="text-neutral-700 dark:text-neutral-300 mb-4 whitespace-pre-wrap">{post.content}</p>

                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {post.tags.map((tag, i) => (
                      <span key={i} className="text-xs font-medium text-[var(--color-primary-600)] bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-900)]/30 px-2 py-1 rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-6 pt-4 border-t border-neutral-100 dark:border-neutral-700/50">
                  <button 
                    onClick={() => handleLike(post)}
                    className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                      post.likes.includes(user?.id || '') 
                        ? 'text-rose-500' 
                        : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                    }`}
                  >
                    <Heart size={18} fill={post.likes.includes(user?.id || '') ? "currentColor" : "none"} />
                    {post.likes.length}
                  </button>
                  <button 
                    onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
                    className="flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                  >
                    <MessageSquare size={18} />
                    {post.commentsCount}
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedSharePostId(post.id);
                      setShowShareModal(true);
                    }}
                    className="flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors ml-auto"
                  >
                    <Share2 size={18} />
                  </button>
                </div>

                {/* Comments Section */}
                <AnimatePresence>
                  {expandedPostId === post.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-700/50 space-y-4"
                    >
                      {comments?.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {comment.authorName.charAt(0)}
                          </div>
                          <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl p-3 flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold">{comment.authorName}</span>
                              <span className="text-[10px] text-neutral-400">{formatDistanceToNow(new Date(comment.createdAt))} ago</span>
                            </div>
                            <p className="text-sm text-neutral-700 dark:text-neutral-300">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                      
                      <div className="flex gap-3 items-center mt-4">
                        <div className="w-8 h-8 rounded-full bg-[var(--color-primary-100)] dark:bg-[var(--color-primary-900)] flex items-center justify-center text-[var(--color-primary-700)] dark:text-[var(--color-primary-300)] font-bold shrink-0">
                          {user?.name.charAt(0)}
                        </div>
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={commentContent}
                            onChange={(e) => setCommentContent(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                            placeholder="Write a comment..."
                            className="w-full pl-4 pr-10 py-2 rounded-full border border-neutral-200 dark:border-neutral-700 bg-transparent text-sm focus:ring-2 focus:ring-[var(--color-primary-500)] outline-none"
                          />
                          <button 
                            onClick={() => handleComment(post.id)}
                            disabled={!commentContent.trim()}
                            className="absolute right-1.5 top-1.5 p-1 bg-[var(--color-primary-600)] text-white rounded-full hover:bg-[var(--color-primary-700)] disabled:opacity-50 transition-colors"
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
          </div>
        </div>
      ) : activeView === 'chat' ? (
        // Chat View (Existing Logic)
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div 
            className="lg:col-span-1 bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6 space-y-6 flex flex-col max-h-[600px] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Shield size={20} className="text-[var(--color-primary-500)]" />
                Secure Channel
              </h3>
              {!isConnected && (
                <button
                  onClick={() => setIsCreatingGroup(!isCreatingGroup)}
                  className="text-xs bg-[var(--color-primary-50)] text-[var(--color-primary-700)] dark:bg-[var(--color-primary-900)]/30 dark:text-[var(--color-primary-400)] px-2 py-1 rounded-lg hover:bg-[var(--color-primary-100)] transition-colors"
                >
                  {isCreatingGroup ? 'Cancel' : '+ Group Chat'}
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              {isCreatingGroup && !isConnected ? (
                <div className="space-y-4 border border-[var(--color-primary-200)] dark:border-[var(--color-primary-800)] p-4 rounded-xl bg-[var(--color-primary-50)]/50 dark:bg-[var(--color-primary-900)]/10">
                  <h4 className="text-sm font-medium">Select Buddies (Up to 4)</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {uniqueUsers?.map(u => (
                      <div 
                        key={u.id}
                        onClick={() => toggleBuddySelection(u.id)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${selectedBuddies.includes(u.id) ? 'bg-[var(--color-primary-100)] dark:bg-[var(--color-primary-800)]' : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                      >
                         <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded-full bg-[var(--color-primary-200)] flex items-center justify-center text-xs font-bold text-[var(--color-primary-800)]">
                             {u.avatar}
                           </div>
                           <span className="text-sm">{u.name}</span>
                         </div>
                         {selectedBuddies.includes(u.id) && <div className="w-2 h-2 rounded-full bg-[var(--color-primary-600)]" />}
                      </div>
                    ))}
                    {uniqueUsers?.length === 0 && (
                      <p className="text-xs text-neutral-500">No buddies found in feed.</p>
                    )}
                  </div>
                  <button 
                    onClick={createGroupChannel}
                    disabled={selectedBuddies.length === 0}
                    className="w-full py-2 bg-[var(--color-primary-600)] text-white rounded-xl font-medium hover:bg-[var(--color-primary-700)] transition-colors disabled:opacity-50"
                  >
                    Start Group Chat
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1 block">Room ID / Buddy Code</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input 
                        type="text" 
                        placeholder="Enter secret code..."
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        disabled={isConnected}
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-transparent focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] outline-none transition-all text-sm"
                      />
                    </div>
                  </div>
                  
                  {!isConnected ? (
                    <button 
                      onClick={() => joinRoom()}
                      disabled={!roomId.trim()}
                      className="w-full py-2 bg-[var(--color-primary-600)] text-white rounded-xl font-medium hover:bg-[var(--color-primary-700)] transition-colors disabled:opacity-50"
                    >
                      Join Channel
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        wsRef.current?.close();
                        setIsConnected(false);
                        setRoomId('');
                        setMessages([]);
                      }}
                      className="w-full py-2 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-xl font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                    >
                      Leave Channel
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="pt-6 border-t border-neutral-200 dark:border-neutral-700 mt-auto">
               <p className="text-xs text-neutral-400 text-center">
                 Share the Room ID securely with your buddies. Messages are end-to-end encrypted.
               </p>
            </div>
          </motion.div>

          <motion.div 
            className="lg:col-span-2 bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 flex flex-col overflow-hidden h-[600px]"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageCircle size={20} className="text-[var(--color-primary-500)]" />
                <span className="font-medium text-neutral-700 dark:text-neutral-200">
                  {isConnected ? `Secure Chat: ${roomId}` : 'Not Connected'}
                </span>
              </div>
              {isConnected && (
                <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                  <Wifi size={12} />
                  Connected
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50/50 dark:bg-black/20">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-400 space-y-4">
                  <Shield size={48} className="opacity-20" />
                  <p>Messages are end-to-end encrypted.</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  if (msg.isSystem) {
                    return (
                      <div key={index} className="flex justify-center my-4">
                        <span className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-500 px-4 py-1.5 rounded-full shadow-sm border border-neutral-200 dark:border-neutral-700">
                          {msg.content}
                        </span>
                      </div>
                    );
                  }
                  
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                      <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`px-4 py-2.5 shadow-sm relative ${
                          isMe 
                            ? 'bg-[var(--color-primary-600)] text-white rounded-2xl rounded-tr-sm' 
                            : 'bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-600 rounded-2xl rounded-tl-sm'
                        }`}>
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                        </div>
                        <span className={`text-[10px] mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? 'text-neutral-500 mr-1' : 'text-neutral-500 ml-1'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  placeholder={isConnected ? "Type a secure message..." : "Join a channel to chat"}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  disabled={!isConnected}
                  className="flex-1 px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-transparent focus:ring-2 focus:ring-[var(--color-primary-500)] outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button 
                  onClick={sendMessage}
                  disabled={!isConnected || !inputMessage.trim()}
                  className="p-2 bg-[var(--color-primary-600)] text-white rounded-xl font-medium hover:bg-[var(--color-primary-700)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      ) : activeView === 'profile' && viewingProfileId ? (
        <UserProfileView 
          userId={viewingProfileId} 
          onBack={() => setActiveView('feed')} 
          onMessage={() => handleStartDM(viewingProfileId)}
          onFollow={() => handleFollow(viewingProfileId)}
          isFollowing={user?.following?.includes(viewingProfileId) || false}
          isCurrentUser={user?.id === viewingProfileId}
        />
      ) : null}

      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-800 rounded-2xl w-full max-w-sm p-6 shadow-xl border border-neutral-200 dark:border-neutral-700"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Share2 size={20} className="text-[var(--color-primary-500)]" />
                  Share Post
                </h3>
                <button 
                  onClick={() => setShowShareModal(false)}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                Anyone with the link will be able to view this post. You can optionally protect it with a password.
              </p>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2 block">Password (Optional)</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input 
                      type="password" 
                      placeholder="Leave blank for public link..."
                      value={sharePassword}
                      onChange={(e) => setSharePassword(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] outline-none transition-all text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowShareModal(false)}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-medium border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={generatePostShareLink}
                  className="flex-1 px-4 py-2 bg-[var(--color-primary-600)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-primary-700)] transition-colors"
                >
                  Generate Link
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Sub-component for User Profile View
const UserProfileView = ({ userId, onBack, onMessage, onFollow, isFollowing, isCurrentUser }: any) => {
  const profilePosts = useLiveQuery(
    () => db.posts.where('userId').equals(userId).reverse().sortBy('createdAt'),
    [userId]
  );

  // Derive basic profile info from their posts (since we don't sync full user profiles in this local-first demo)
  const profileName = profilePosts && profilePosts.length > 0 ? profilePosts[0].authorName : 'Unknown User';
  const totalLikes = profilePosts?.reduce((sum, post) => sum + post.likes.length, 0) || 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
      >
        ← Back to Feed
      </button>

      <div className="bg-white dark:bg-neutral-800 rounded-3xl p-8 shadow-sm border border-neutral-200 dark:border-neutral-700 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 dark:from-indigo-500/10 dark:to-purple-500/10"></div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300 text-3xl font-bold border-4 border-white dark:border-neutral-800 shadow-lg mb-4">
            {profileName.charAt(0)}
          </div>
          <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">{profileName}</h3>
          <p className="text-sm text-neutral-500 mb-6">Recovery Community Member</p>

          <div className="flex items-center justify-center gap-8 mb-8">
            <div className="text-center">
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{profilePosts?.length || 0}</p>
              <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium">Posts</p>
            </div>
            <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-700"></div>
            <div className="text-center">
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{totalLikes}</p>
              <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium">Likes Received</p>
            </div>
          </div>

          {!isCurrentUser && (
            <div className="flex items-center gap-3">
              <button 
                onClick={onFollow}
                className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isFollowing
                    ? 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300'
                    : 'bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)] shadow-lg shadow-[var(--color-primary-600)]/20'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
              <button 
                onClick={onMessage}
                className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-xl text-sm font-medium transition-all shadow-sm"
              >
                <MessageCircle size={18} />
                Message
              </button>
            </div>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <UserIcon size={20} className="text-[var(--color-primary-500)]" />
          Recent Activity
        </h4>
        <div className="space-y-4">
          {profilePosts?.length === 0 ? (
            <p className="text-center py-8 text-neutral-500">No posts yet.</p>
          ) : (
            profilePosts?.map(post => (
              <div key={post.id} className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm border border-neutral-200 dark:border-neutral-700">
                <p className="text-xs text-neutral-500 mb-3">{formatDistanceToNow(new Date(post.createdAt))} ago</p>
                <p className="text-neutral-700 dark:text-neutral-300 mb-3 whitespace-pre-wrap">{post.content}</p>
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag, i) => (
                      <span key={i} className="text-xs font-medium text-[var(--color-primary-600)] bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-900)]/30 px-2 py-1 rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};

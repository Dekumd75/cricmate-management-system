import { useState, useEffect, useRef, useCallback } from 'react';
import { CoachSidebar } from './CoachSidebar';
import { AdminSidebar } from './AdminSidebar';
import { ParentSidebar } from './ParentSidebar';
import { useApp } from './AppContext';
import api from '../services/api';
import {
  Send, Search, Plus, X, MessageSquare,
  ChevronRight, Check, CheckCheck, Users
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Contact {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Conversation {
  contactId: number;
  contactName: string;
  contactRole: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface ChatMessage {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  isRead: boolean;
  sentAt: string;
  isMine: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isThisYear = d.getFullYear() === now.getFullYear();
  return isThisYear
    ? d.toLocaleDateString([], { day: 'numeric', month: 'short' })
    : d.toLocaleDateString([], { day: 'numeric', month: 'short', year: '2-digit' });
}

function getInitial(name: string) {
  return name ? name.charAt(0).toUpperCase() : '?';
}

function roleLabel(role: string) {
  return role === 'coach' ? 'Coach' : 'Parent';
}

function roleColor(role: string) {
  return role === 'coach' ? '#6366f1' : '#22c55e';
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, role, size = 40 }: { name: string; role: string; size?: number }) {
  const color = roleColor(role);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `${color}22`, border: `2px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color,
    }}>
      {getInitial(name)}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function MessagesScreen() {
  const { user } = useApp();
  const myId = parseInt(user?.id || '0');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeContactId, setActiveContactId] = useState<number | null>(null);
  const [activeContact, setActiveContact] = useState<{ id: number; name: string; role: string } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);

  // New-conversation modal
  const [showContacts, setShowContacts] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch conversations ────────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get<{ conversations: Conversation[] }>('/messages/conversations');
      setConversations(res.data.conversations);
    } catch {
      // silent poll failure
    }
  }, []);

  // ── Fetch thread ───────────────────────────────────────────────────────────
  const fetchThread = useCallback(async (contactId: number) => {
    try {
      const res = await api.get<{ messages: ChatMessage[]; contact: { id: number; name: string; role: string } }>(
        `/messages/thread/${contactId}`
      );
      setMessages(res.data.messages);
      setActiveContact(res.data.contact);
      // Mark as read silently
      api.put(`/messages/read/${contactId}`).catch(() => {});
    } catch {
      // silent
    }
  }, []);

  // ── Polling ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchConversations();
    pollRef.current = setInterval(() => {
      fetchConversations();
      if (activeContactId) fetchThread(activeContactId);
    }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchConversations, fetchThread, activeContactId]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Select conversation ────────────────────────────────────────────────────
  const openConversation = (contactId: number, contactName: string, contactRole: string) => {
    setActiveContactId(contactId);
    setActiveContact({ id: contactId, name: contactName, role: contactRole });
    fetchThread(contactId);
    setConversations(prev =>
      prev.map(c => c.contactId === contactId ? { ...c, unreadCount: 0 } : c)
    );
  };

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!draft.trim() || !activeContactId || sending) return;
    setSending(true);
    const text = draft.trim();
    setDraft('');
    try {
      const res = await api.post<{ message: ChatMessage }>('/messages/send', {
        receiverId: activeContactId,
        content: text,
      });
      setMessages(prev => [...prev, res.data.message]);
      fetchConversations();
    } catch {
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  // ── Open new contact modal ─────────────────────────────────────────────────
  const openContactModal = async () => {
    setShowContacts(true);
    setLoadingContacts(true);
    setContactSearch('');
    try {
      const res = await api.get<{ contacts: Contact[] }>('/messages/contacts');
      setContacts(res.data.contacts);
    } catch {
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  };

  const startNewThread = (contact: Contact) => {
    setShowContacts(false);
    setConversations(prev => {
      const exists = prev.find(c => c.contactId === contact.id);
      if (!exists) {
        return [
          {
            contactId: contact.id, contactName: contact.name,
            contactRole: contact.role, lastMessage: '', lastMessageAt: new Date().toISOString(),
            unreadCount: 0
          },
          ...prev
        ];
      }
      return prev;
    });
    openConversation(contact.id, contact.name, contact.role);
  };

  const getSidebar = () => {
    if (user?.role === 'admin') return <AdminSidebar />;
    if (user?.role === 'coach') return <CoachSidebar />;
    if (user?.role === 'parent') return <ParentSidebar />;
    return null;
  };

  const filteredConvs = conversations.filter(c =>
    c.contactName.toLowerCase().includes(search.toLowerCase())
  );

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(contactSearch.toLowerCase())
  );

  // unused myId suppression
  void myId;

  // ─── UI ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--background)', overflow: 'hidden' }}>
      {getSidebar()}

      {/* ── Left panel: Conversation List ─────────────────────────────────── */}
      <div style={{
        width: 300, flexShrink: 0,
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        background: 'var(--card)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 16px 14px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <MessageSquare size={15} color="white" />
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)' }}>Messages</span>
            </div>
            <button
              onClick={openContactModal}
              title="New conversation"
              style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer',
                background: 'rgba(99,102,241,0.1)', color: '#6366f1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.1)')}
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..."
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--muted)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '7px 10px 7px 32px',
                fontSize: 13, color: 'var(--foreground)', outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredConvs.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>
              <Users size={32} style={{ margin: '0 auto 10px', opacity: 0.4, display: 'block' }} />
              {conversations.length === 0
                ? 'No conversations yet.\nClick + to start one!'
                : 'No results found'}
            </div>
          ) : (
            filteredConvs.map(conv => {
              const isActive = activeContactId === conv.contactId;
              return (
                <button
                  key={conv.contactId}
                  onClick={() => openConversation(conv.contactId, conv.contactName, conv.contactRole)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px', border: 'none', cursor: 'pointer', textAlign: 'left',
                    background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
                    borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--muted)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ position: 'relative' }}>
                    <Avatar name={conv.contactName} role={conv.contactRole} size={42} />
                    {conv.unreadCount > 0 && (
                      <div style={{
                        position: 'absolute', top: -2, right: -2,
                        minWidth: 18, height: 18, borderRadius: 9, padding: '0 4px',
                        background: '#6366f1', color: 'white',
                        fontSize: 10, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid var(--card)',
                      }}>
                        {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span style={{
                        fontSize: 13, fontWeight: conv.unreadCount > 0 ? 700 : 500,
                        color: 'var(--foreground)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130,
                      }}>
                        {conv.contactName}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--muted-foreground)', flexShrink: 0 }}>
                        {conv.lastMessageAt ? formatTime(conv.lastMessageAt) : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 4,
                        background: `${roleColor(conv.contactRole)}18`, color: roleColor(conv.contactRole),
                        fontWeight: 600, flexShrink: 0,
                      }}>
                        {roleLabel(conv.contactRole)}
                      </span>
                      <span style={{
                        fontSize: 12, color: 'var(--muted-foreground)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {conv.lastMessage || 'No messages yet'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right panel: Chat Thread ───────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {activeContact ? (
          <>
            {/* Chat header */}
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'var(--card)',
            }}>
              <Avatar name={activeContact.name} role={activeContact.role} size={40} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>{activeContact.name}</div>
                <div style={{
                  fontSize: 11, padding: '1px 7px', borderRadius: 4, display: 'inline-block',
                  background: `${roleColor(activeContact.role)}18`, color: roleColor(activeContact.role),
                  fontWeight: 600,
                }}>
                  {roleLabel(activeContact.role)}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--background)' }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13, marginTop: 40 }}>
                  <MessageSquare size={36} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
                  No messages yet — send one below!
                </div>
              )}
              {messages.map((msg, idx) => {
                const isMine = msg.isMine;
                const prevMsg = idx > 0 ? messages[idx - 1] : null;
                const showDate = !prevMsg ||
                  new Date(msg.sentAt).toDateString() !== new Date(prevMsg.sentAt).toDateString();

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div style={{ textAlign: 'center', margin: '10px 0 6px' }}>
                        <span style={{
                          fontSize: 11, color: 'var(--muted-foreground)',
                          background: 'var(--muted)',
                          padding: '3px 12px', borderRadius: 20,
                        }}>
                          {new Date(msg.sentAt).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '68%',
                        background: isMine
                          ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                          : 'var(--muted)',
                        borderRadius: isMine ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                        padding: '10px 14px',
                        boxShadow: isMine ? '0 4px 14px rgba(99,102,241,0.25)' : 'none',
                      }}>
                        <p style={{ margin: 0, fontSize: 14, color: isMine ? '#ffffff' : 'var(--foreground)', lineHeight: 1.5, wordBreak: 'break-word' }}>
                          {msg.content}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 }}>
                          <span style={{ fontSize: 10, color: isMine ? 'rgba(255,255,255,0.6)' : 'var(--muted-foreground)' }}>
                            {formatTime(msg.sentAt)}
                          </span>
                          {isMine && (
                            msg.isRead
                              ? <CheckCheck size={12} color="rgba(255,255,255,0.7)" />
                              : <Check size={12} color="rgba(255,255,255,0.5)" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border)',
              background: 'var(--card)',
              display: 'flex', gap: 10, alignItems: 'flex-end',
            }}>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                }}
                placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                rows={2}
                style={{
                  flex: 1, resize: 'none',
                  background: 'var(--muted)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '10px 14px',
                  fontSize: 14, color: 'var(--foreground)', outline: 'none', lineHeight: 1.5,
                  transition: 'border-color 0.15s',
                  fontFamily: 'inherit',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
              <button
                onClick={sendMessage}
                disabled={!draft.trim() || sending}
                style={{
                  width: 44, height: 44, borderRadius: 12, border: 'none',
                  cursor: draft.trim() && !sending ? 'pointer' : 'not-allowed',
                  background: draft.trim() && !sending
                    ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                    : 'var(--muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'all 0.2s',
                  boxShadow: draft.trim() && !sending ? '0 4px 14px rgba(99,102,241,0.4)' : 'none',
                }}
              >
                <Send size={18} color={draft.trim() && !sending ? 'white' : 'var(--muted-foreground)'} />
              </button>
            </div>
          </>
        ) : (
          /* Empty state */
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16, color: 'var(--muted-foreground)',
            background: 'var(--background)',
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(99,102,241,0.1)', border: '2px solid rgba(99,102,241,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MessageSquare size={36} color="#6366f1" style={{ opacity: 0.6 }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>
                Select a conversation
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
                or click <span style={{ color: '#6366f1' }}>+</span> to start a new one
              </div>
            </div>
            <button
              onClick={openContactModal}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                border: 'none', borderRadius: 10, padding: '10px 20px',
                cursor: 'pointer', color: 'white', fontSize: 14, fontWeight: 600,
                boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
              }}
            >
              <Plus size={16} /> New Message
            </button>
          </div>
        )}
      </div>

      {/* ── New Conversation Modal ─────────────────────────────────────────── */}
      {showContacts && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          backdropFilter: 'blur(4px)',
        }}
          onClick={e => { if (e.target === e.currentTarget) setShowContacts(false); }}
        >
          <div style={{
            width: 420, maxHeight: '70vh',
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 16, display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
          }}>
            {/* Modal header */}
            <div style={{
              padding: '18px 20px 14px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)' }}>New Message</div>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>
                  {user?.role === 'coach' ? 'Select a parent to message' : 'Select a coach to message'}
                </div>
              </div>
              <button
                onClick={() => setShowContacts(false)}
                style={{
                  width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer',
                  background: 'var(--muted)', color: 'var(--muted-foreground)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Search */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
                <input
                  autoFocus
                  value={contactSearch}
                  onChange={e => setContactSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--muted)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '8px 10px 8px 32px',
                    fontSize: 13, color: 'var(--foreground)', outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Contact list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loadingContacts ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>
                  Loading contacts…
                </div>
              ) : filteredContacts.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>
                  No contacts found
                </div>
              ) : (
                filteredContacts.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => startNewThread(contact)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px', border: 'none', cursor: 'pointer',
                      background: 'transparent', textAlign: 'left',
                      borderBottom: '1px solid var(--border)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Avatar name={contact.name} role={contact.role} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', marginBottom: 2 }}>
                        {contact.name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {contact.email}
                      </div>
                    </div>
                    <ChevronRight size={16} color="var(--muted-foreground)" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

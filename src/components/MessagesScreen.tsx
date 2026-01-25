import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useApp } from './AppContext';
import { Send, Search, ArrowLeft } from 'lucide-react';
import { CoachSidebar } from './CoachSidebar';
import { AdminSidebar } from './AdminSidebar';
import { PlayerSidebar } from './PlayerSidebar';
import { ParentSidebar } from './ParentSidebar';
import { Input } from './ui/input';

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  avatar: string;
}

interface ChatMessage {
  id: string;
  sender: 'me' | 'them';
  content: string;
  timestamp: string;
}

export function MessagesScreen() {
  const navigate = useNavigate();
  const { user } = useApp();
  const [selectedConversation, setSelectedConversation] = useState<string | null>('1');
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleBackClick = () => {
    switch (user?.role) {
      case 'admin':
        navigate('/admin/dashboard');
        break;
      case 'coach':
        navigate('/coach/dashboard');
        break;
      case 'player':
        navigate('/player/dashboard');
        break;
      case 'parent':
        navigate('/parent/dashboard');
        break;
      default:
        navigate('/');
    }
  };

  // Mock conversations based on role
  const conversations: Conversation[] = user?.role === 'coach' || user?.role === 'admin'
    ? [
        {
          id: '1',
          name: 'Parent of Ashan Silva',
          lastMessage: 'Thank you for the update!',
          timestamp: '2025-10-18T14:30:00',
          unread: true,
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200'
        },
        {
          id: '2',
          name: 'Parent of Kavindu Perera',
          lastMessage: 'When is the next match?',
          timestamp: '2025-10-17T10:15:00',
          unread: false,
          avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200'
        },
        {
          id: '3',
          name: 'Parent of Dineth Fernando',
          lastMessage: 'Looking forward to the tournament!',
          timestamp: '2025-10-16T09:45:00',
          unread: false,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
        },
      ]
    : [
        {
          id: '1',
          name: 'Coach Rajesh',
          lastMessage: 'Great performance in today\'s practice session!',
          timestamp: '2025-10-18T14:30:00',
          unread: true,
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200'
        },
        {
          id: '2',
          name: 'Coach Priya',
          lastMessage: 'Remember to bring your equipment tomorrow.',
          timestamp: '2025-10-17T11:20:00',
          unread: false,
          avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200'
        },
      ];

  // Mock messages for selected conversation
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'them',
      content: 'Great performance in today\'s practice session!',
      timestamp: '2025-10-18T14:30:00'
    },
    {
      id: '2',
      sender: 'them',
      content: 'Ashan showed excellent improvement in his batting technique.',
      timestamp: '2025-10-18T14:31:00'
    },
    {
      id: '3',
      sender: 'me',
      content: 'Thank you so much! We\'ve been practicing at home too.',
      timestamp: '2025-10-18T14:35:00'
    },
  ]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      sender: 'me',
      content: newMessage,
      timestamp: new Date().toISOString()
    };

    setMessages([...messages, message]);
    setNewMessage('');
  };

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedConv = conversations.find(c => c.id === selectedConversation);

  const getSidebar = () => {
    switch (user?.role) {
      case 'admin':
        return <AdminSidebar />;
      case 'coach':
        return <CoachSidebar />;
      case 'player':
        return <PlayerSidebar />;
      case 'parent':
        return <ParentSidebar />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {getSidebar()}
      <div className="flex-1 flex">
        {/* Conversations List */}
        <div className="w-80 border-r border-border bg-card overflow-y-auto flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackClick}
                className="shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h2 className="flex-1">Messages</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv.id)}
                className={`w-full p-4 border-b border-border hover:bg-muted/50 transition-colors text-left ${
                  selectedConversation === conv.id ? 'bg-muted' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <img
                      src={conv.avatar}
                      alt={conv.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {conv.unread && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                        1
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="truncate">{conv.name}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(conv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border bg-card">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedConv.avatar}
                    alt={selectedConv.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <h3>{selectedConv.name}</h3>
                    <p className="text-xs text-muted-foreground">Active now</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-md px-4 py-3 rounded-lg ${
                        message.sender === 'me'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p>{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender === 'me' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-border bg-card">
                <div className="flex gap-2">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="resize-none"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSendMessage}
                    className="bg-primary hover:bg-primary/90 px-6"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a conversation to start messaging
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

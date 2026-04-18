import { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Bell, Mail, Monitor, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function authHeader() {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

interface Notification {
  notificationID: number;
  content: string;
  channel: string;
  status: string;
  sentAt: string;
  triggeringEntityType: string;
}

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-LK', { timeZone: 'Asia/Colombo', day: 'numeric', month: 'short', year: 'numeric' });
}

function ChannelBadge({ channel }: { channel: string }) {
  const channels = (channel || 'system').split(',').map(c => c.trim());
  return (
    <div className="flex gap-1 flex-wrap">
      {channels.map(ch => {
        let cls = 'bg-blue-100 text-blue-700';
        let icon = <Monitor className="w-3 h-3" />;
        if (ch === 'email') { cls = 'bg-green-100 text-green-700'; icon = <Mail className="w-3 h-3" />; }
        return (
          <span key={ch} className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>
            {icon} {ch}
          </span>
        );
      })}
    </div>
  );
}

export function MyNotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/notifications/my`, { headers: authHeader() });
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const broadcasts = notifications.filter(n => n.triggeringEntityType === 'broadcast');
  const systemNotifs = notifications.filter(n => n.triggeringEntityType !== 'broadcast');

  return (
    <div className="flex-1 p-8 overflow-auto">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">My Notifications</h1>
              <p className="text-sm text-muted-foreground">
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''} total
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchNotifications} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground">Loading notifications…</p>
          </div>
        ) : notifications.length === 0 ? (
          <Card className="p-12 text-center">
            <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold text-muted-foreground mb-1">No notifications yet</h3>
            <p className="text-sm text-muted-foreground">
              Announcements from your coach or admin will appear here.
            </p>
          </Card>
        ) : (
          <>
            {/* Broadcast announcements */}
            {broadcasts.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-primary">
                  📢 Announcements ({broadcasts.length})
                </h3>
                <div className="space-y-3">
                  {broadcasts.map(n => (
                    <div
                      key={n.notificationID}
                      className="flex gap-4 p-4 border border-border rounded-xl hover:bg-muted/30 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bell className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-relaxed">{n.content}</p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <ChannelBadge channel={n.channel} />
                          <span className="text-xs text-muted-foreground">{timeAgo(n.sentAt)}</span>
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle2 className="w-3 h-3" /> Delivered
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* System notifications (payment, etc.) */}
            {systemNotifs.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-muted-foreground" />
                  System Notifications ({systemNotifs.length})
                </h3>
                <div className="space-y-3">
                  {systemNotifs.map(n => (
                    <div
                      key={n.notificationID}
                      className="flex gap-4 p-4 border border-border rounded-xl hover:bg-muted/30 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Monitor className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-relaxed">{n.content}</p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <ChannelBadge channel={n.channel} />
                          <span className="text-xs text-muted-foreground">{timeAgo(n.sentAt)}</span>
                          <span className="text-xs capitalize text-muted-foreground">
                            {n.triggeringEntityType}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

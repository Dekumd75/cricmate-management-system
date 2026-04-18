import { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Bell, Plus, Send, Trash2, Edit2, X, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function authHeader() {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

interface Template {
  templateID: number;
  templateName: string;
  subject: string;
  body: string;
  channel: string;
}

interface SentLog {
  notificationID: number;
  content: string;
  channel: string;
  sentAt: string;
  recipient?: { id: number; name: string; role: string };
}

const CHANNELS = ['system', 'email', 'sms'];
const ROLES = [
  { value: 'player',  label: 'All Players' },
  { value: 'parent',  label: 'All Parents' },
  { value: 'coach',   label: 'All Coaches' },
];

export function NotificationsScreen() {
  // ── Templates state ──────────────────────────────────────────────────────────
  const [templates, setTemplates]       = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // ── Create / Edit form ───────────────────────────────────────────────────────
  const [showForm, setShowForm]         = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formName, setFormName]         = useState('');
  const [formSubject, setFormSubject]   = useState('');
  const [formBody, setFormBody]         = useState('');
  const [formChannel, setFormChannel]   = useState('system');
  const [savingForm, setSavingForm]     = useState(false);

  // ── Send panel state ─────────────────────────────────────────────────────────
  const [showSendPanel, setShowSendPanel] = useState(false);
  const [sendTemplateID, setSendTemplateID] = useState<number | ''>('');
  const [sendCustomMsg, setSendCustomMsg]   = useState('');
  const [sendRoles, setSendRoles]           = useState<string[]>([]);
  const [sendChannels, setSendChannels]     = useState<string[]>(['system']);
  const [sending, setSending]               = useState(false);
  const [sendResult, setSendResult]         = useState<string | null>(null);

  // ── Sent log ─────────────────────────────────────────────────────────────────
  const [sentLog, setSentLog]   = useState<SentLog[]>([]);
  const [showLog, setShowLog]   = useState(false);
  const [loadingLog, setLoadingLog] = useState(false);

  // ── fetch templates ──────────────────────────────────────────────────────────
  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch(`${API}/api/notifications/templates`, { headers: authHeader() });
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch {
      toast.error('Failed to load templates');
    } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  // ── open form ────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingTemplate(null);
    setFormName(''); setFormSubject(''); setFormBody(''); setFormChannel('system');
    setShowForm(true);
  };

  const openEdit = (t: Template) => {
    setEditingTemplate(t);
    setFormName(t.templateName); setFormSubject(t.subject);
    setFormBody(t.body); setFormChannel(t.channel);
    setShowForm(true);
  };

  // ── save template ─────────────────────────────────────────────────────────────
  const saveTemplate = async () => {
    if (!formName.trim() || !formBody.trim()) {
      toast.error('Template name and body are required');
      return;
    }
    setSavingForm(true);
    try {
      const url = editingTemplate
        ? `${API}/api/notifications/templates/${editingTemplate.templateID}`
        : `${API}/api/notifications/templates`;
      const method = editingTemplate ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: authHeader(),
        body: JSON.stringify({ templateName: formName, subject: formSubject, body: formBody, channel: formChannel })
      });
      if (!res.ok) throw new Error();
      toast.success(editingTemplate ? 'Template updated!' : 'Template created!');
      setShowForm(false);
      fetchTemplates();
    } catch {
      toast.error('Failed to save template');
    } finally {
      setSavingForm(false);
    }
  };

  // ── delete template ───────────────────────────────────────────────────────────
  const deleteTemplate = async (id: number, name: string) => {
    if (!confirm(`Delete template "${name}"?`)) return;
    try {
      const res = await fetch(`${API}/api/notifications/templates/${id}`, {
        method: 'DELETE', headers: authHeader()
      });
      if (!res.ok) throw new Error();
      toast.success('Template deleted');
      fetchTemplates();
    } catch {
      toast.error('Failed to delete template');
    }
  };

  // ── toggle role selection ─────────────────────────────────────────────────────
  const toggleRole = (role: string) => {
    setSendRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  // ── toggle channel selection ──────────────────────────────────────────────────
  const toggleChannel = (ch: string) => {
    setSendChannels(prev => {
      if (prev.includes(ch)) {
        // Keep at least one channel selected
        if (prev.length === 1) return prev;
        return prev.filter(c => c !== ch);
      }
      return [...prev, ch];
    });
  };

  const sendNotification = async () => {
    if (!sendTemplateID && !sendCustomMsg.trim()) {
      toast.error('Select a template or enter a custom message');
      return;
    }
    if (sendRoles.length === 0) {
      toast.error('Select at least one target group');
      return;
    }
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch(`${API}/api/notifications/send`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({
          templateID: sendTemplateID || undefined,
          customMessage: sendCustomMsg || undefined,
          targetRoles: sendRoles,
          channels: sendChannels
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const chLabel = sendChannels.join(' + ');
      setSendResult(`✅ Sent to ${data.sentCount} users via ${chLabel}`);
      toast.success(data.message);
      setSendTemplateID('');
      setSendCustomMsg('');
      setSendRoles([]);
      setSendChannels(['system']);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  // ── load sent log ─────────────────────────────────────────────────────────────
  const loadSentLog = async () => {
    setShowLog(true);
    setLoadingLog(true);
    try {
      const res = await fetch(`${API}/api/notifications/sent-log`, { headers: authHeader() });
      const data = await res.json();
      setSentLog(data.logs || []);
    } catch {
      toast.error('Failed to load sent log');
    } finally {
      setLoadingLog(false);
    }
  };

  const channelBadge = (ch: string) => {
    const colors: Record<string, string> = {
      system: 'bg-blue-100 text-blue-700',
      email:  'bg-green-100 text-green-700',
      sms:    'bg-purple-100 text-purple-700',
    };
    return `text-xs font-semibold px-2 py-0.5 rounded-full ${colors[ch] || 'bg-gray-100 text-gray-600'}`;
  };

  return (
    <div className="flex-1 p-8 overflow-auto">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Notifications</h1>
              <p className="text-sm text-muted-foreground">
                Manage templates &amp; broadcast messages to players, parents and coaches
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={showLog ? () => setShowLog(false) : loadSentLog}>
              {showLog ? 'Hide Log' : 'View Sent Log'}
            </Button>
            <Button size="sm" onClick={() => setShowSendPanel(p => !p)}>
              <Send className="w-4 h-4 mr-2" />
              {showSendPanel ? 'Close Send Panel' : 'Send Notification'}
            </Button>
          </div>
        </div>

        {/* ── Send Panel ─────────────────────────────────────────────────────── */}
        {showSendPanel && (
          <Card className="p-6 border-2 border-primary/20 bg-primary/5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" /> Broadcast Notification
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Template selector */}
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">
                  Use Template (optional)
                </label>
                <select
                  className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={sendTemplateID}
                  onChange={e => setSendTemplateID(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">— No template (custom message) —</option>
                  {templates.map(t => (
                    <option key={t.templateID} value={t.templateID}>{t.templateName}</option>
                  ))}
                </select>
              </div>

              {/* Target roles */}
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">
                  Send To
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {ROLES.map(r => (
                    <button
                      key={r.value}
                      onClick={() => toggleRole(r.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        sendRoles.includes(r.value)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery channels */}
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">
                  Delivery Channel
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  <button
                    id="channel-system"
                    onClick={() => toggleChannel('system')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      sendChannels.includes('system')
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-border text-muted-foreground hover:border-blue-400'
                    }`}
                  >
                    <span>🖥️</span> In-App
                  </button>
                  <button
                    id="channel-email"
                    onClick={() => toggleChannel('email')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      sendChannels.includes('email')
                        ? 'bg-green-600 text-white border-green-600'
                        : 'border-border text-muted-foreground hover:border-green-400'
                    }`}
                  >
                    <span>✉️</span> Email
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {sendChannels.includes('email') && sendChannels.includes('system')
                    ? '📢 Recipients will receive an in-app notification AND an email'
                    : sendChannels.includes('email')
                    ? '✉️ Recipients will receive an email only'
                    : '🖥️ Recipients will see this only inside the app'}
                </p>
              </div>

              {/* Custom message */}
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground block mb-1">
                  Custom Message {sendTemplateID ? '(overrides template body)' : '(required if no template)'}
                </label>
                <textarea
                  rows={3}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Type your message here…"
                  value={sendCustomMsg}
                  onChange={e => setSendCustomMsg(e.target.value)}
                />
              </div>
            </div>

            {sendResult && (
              <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" /> {sendResult}
              </div>
            )}

            <div className="flex justify-end mt-4">
              <Button onClick={sendNotification} disabled={sending}>
                {sending ? 'Sending…' : (<><Send className="w-4 h-4 mr-2" /> Send Now</>)}
              </Button>
            </div>
          </Card>
        )}

        {/* ── Sent Log ───────────────────────────────────────────────────────── */}
        {showLog && (
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Sent Notification Log</h3>
            {loadingLog ? (
              <p className="text-muted-foreground text-center py-6">Loading…</p>
            ) : sentLog.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">No broadcast notifications sent yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 px-3">Recipient</th>
                      <th className="text-left py-2 px-3">Role</th>
                      <th className="text-left py-2 px-3">Message</th>
                      <th className="text-left py-2 px-3">Channel</th>
                      <th className="text-left py-2 px-3">Sent At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sentLog.map(log => (
                      <tr key={log.notificationID} className="border-b border-border hover:bg-muted/30">
                        <td className="py-2 px-3">{log.recipient?.name || 'Unknown'}</td>
                        <td className="py-2 px-3 capitalize">{log.recipient?.role || '—'}</td>
                        <td className="py-2 px-3 max-w-xs truncate">{log.content}</td>
                        <td className="py-2 px-3"><span className={channelBadge(log.channel)}>{log.channel}</span></td>
                        <td className="py-2 px-3 text-muted-foreground">
                          {new Date(log.sentAt).toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* ── Templates Section ───────────────────────────────────────────────── */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold">Notification Templates ({templates.length})</h3>
            <Button size="sm" variant="outline" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" /> New Template
            </Button>
          </div>

          {/* Create / Edit Form */}
          {showForm && (
            <div className="mb-6 p-5 border border-border rounded-xl bg-muted/20 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium">{editingTemplate ? 'Edit Template' : 'Create Template'}</h4>
                <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Template Name *</label>
                  <input
                    className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. Fee Reminder"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Channel</label>
                  <select
                    className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={formChannel}
                    onChange={e => setFormChannel(e.target.value)}
                  >
                    {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Subject (optional)</label>
                  <input
                    className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. Monthly Fee Due"
                    value={formSubject}
                    onChange={e => setFormSubject(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Message Body *</label>
                  <textarea
                    rows={4}
                    className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Write the notification message here…"
                    value={formBody}
                    onChange={e => setFormBody(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button size="sm" onClick={saveTemplate} disabled={savingForm}>
                  {savingForm ? 'Saving…' : editingTemplate ? 'Save Changes' : 'Create Template'}
                </Button>
              </div>
            </div>
          )}

          {/* Templates list */}
          {loadingTemplates ? (
            <p className="text-muted-foreground text-center py-8">Loading templates…</p>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No templates yet. Create your first one above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map(t => (
                <div
                  key={t.templateID}
                  className="flex items-start gap-4 p-4 border border-border rounded-xl hover:bg-muted/30 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bell className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{t.templateName}</p>
                      <span className={channelBadge(t.channel)}>{t.channel}</span>
                    </div>
                    {t.subject && <p className="text-xs text-muted-foreground mb-1">Subject: {t.subject}</p>}
                    <p className="text-sm text-muted-foreground line-clamp-2">{t.body}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(t)}
                      className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteTemplate(t.templateID, t.templateName)}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}

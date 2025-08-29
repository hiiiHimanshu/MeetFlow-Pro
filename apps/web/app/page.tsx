"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { Button } from "@repo/components/ui/button";
import { Input } from "@repo/components/ui/input";
import { Label } from "@repo/components/ui/label";
import { Textarea } from "@repo/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/components/ui/card";
import { Badge } from "@repo/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@repo/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/components/ui/avatar";
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "@repo/components/ui/navigation-menu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@repo/components/ui/dropdown-menu";
import { Loader2, Plus, FileText, MessageSquare, Download, ExternalLink, Settings, User, LogOut, Upload, Calendar, Clock, CheckCircle } from "lucide-react";

// Prefer environment variable with fallback for local dev
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

type Meeting = { id: string; title: string; createdAt: string };

export default function Page() {
  const { data: session } = useSession();
  const [workspaceId, setWorkspaceId] = useState<string>('demo');
  const [workspaces, setWorkspaces] = useState<string[]>(['demo', 'team-1']);
  const [title, setTitle] = useState('Weekly Sync');
  const [text, setText] = useState('Discussed roadmap and blockers.');
  const [file, setFile] = useState<File | null>(null);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [actionsText, setActionsText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notionOpen, setNotionOpen] = useState(false);
  const notionParentRef = useRef<HTMLInputElement>(null);

  const headers = useMemo(() => ({ 'x-workspace-id': workspaceId }), [workspaceId]);

  const fetchMeetings = useCallback(async () => {
    try {
      const res = await fetch(`${API}/meetings?limit=20`, { headers });
      if (!res.ok) throw new Error('Failed to load meetings');
      const data = await res.json();
      setMeetings(data.meetings || []);
    } catch (e: any) {
      setError(e.message);
    }
  }, [headers]);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  async function ingest() {
    setError(null); setLoading(true);
    try {
      let fileUrl: string | undefined;
      if (file) {
        // request presigned upload URL
        const up = await fetch(`${API}/storage/upload-url`, { headers });
        const { key, url } = await up.json();
        await fetch(url, { method: 'PUT', body: file });
        fileUrl = key;
      }
      const res = await fetch(`${API}/meetings/ingest`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, title, text: file ? undefined : text, fileUrl })
      });
      const data = await res.json();
      setMeetingId(data.meeting.id);
      await fetchMeetings();
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  }

  async function summarize() {
    if (!meetingId) return;
    setError(null); setLoading(true);
    try {
      await fetch(`${API}/meetings/${meetingId}/summarize`, { method: 'POST', headers });
      pollSummary(meetingId, 8_000, 8);
    } catch (e: any) { setError(e.message); setLoading(false); }
  }

  async function loadSummary(mid = meetingId) {
    if (!mid) return;
    const res = await fetch(`${API}/meetings/${mid}/summary`, { headers });
    const data = await res.json();
    const s = data.summary?.content || '';
    setSummary(s);
    const lines = s.split('\n').filter((l: string) => l.trim().startsWith('- [ ]'));
    setActionsText(lines.join('\n'));
    setLoading(false);
  }

  function pollSummary(mid: string, interval = 5000, attempts = 10) {
    let tries = 0;
    const id = setInterval(async () => {
      tries++;
      try {
        const res = await fetch(`${API}/meetings/${mid}/summary`, { headers });
        const data = await res.json();
        const s: string = data.summary?.content || '';
        if (s) {
          setSummary(s);
          const lines = s.split('\n').filter((l: string) => l.trim().startsWith('- [ ]'));
          setActionsText(lines.join('\n'));
          clearInterval(id);
          setLoading(false);
        } else if (tries >= attempts) {
          clearInterval(id);
          setLoading(false);
        }
      } catch (e: any) {
        // stop polling on error after a few attempts
        if (tries >= attempts) {
          clearInterval(id);
          setError(e.message || 'Polling failed');
          setLoading(false);
        }
      }
    }, interval);
  }

  // Auto-load summary when selecting a meeting from the list
  useEffect(() => {
    if (meetingId) {
      setLoading(true);
      loadSummary(meetingId);
    } else {
      setSummary('');
      setActionsText('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  async function postSlack() {
    if (!meetingId) return;
    await fetch(`${API}/meetings/${meetingId}/post-slack`, { method: 'POST', headers });
  }

  async function saveActions() {
    if (!meetingId) return;
    const items = actionsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => ({ text: l.replace(/^[*-]\s*\[\s*\]/, '').trim() }));
    await fetch(`${API}/actions/bulk-create`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetingId, items })
    });
  }

  async function getPdf() {
    if (!meetingId) return;
    const res = await fetch(`${API}/meetings/${meetingId}/pdf`, { headers });
    const data = await res.json();
    setPdfUrl(data.url);
  }

  async function notionExport() {
    if (!meetingId) return;
    const parentId = notionParentRef.current?.value || '';
    if (!parentId) { setError('Enter Notion parent page ID'); return; }
    await fetch(`${API}/meetings/${meetingId}/notion`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId })
    });
    setNotionOpen(false);
  }

  function MeetingRow({ m }: { m: Meeting }) {
    const active = meetingId === m.id;
    return (
      <button 
        onClick={() => setMeetingId(m.id)} 
        className={`w-full text-left transition-all duration-200 ${
          active 
            ? 'bg-primary/10 border-primary/20 text-primary' 
            : 'hover:bg-muted/50 border-border'
        } rounded-lg border p-3 hover:shadow-sm`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{m.title}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <Calendar className="h-3 w-3" />
              {new Date(m.createdAt).toLocaleDateString()}
              <Clock className="h-3 w-3 ml-2" />
              {new Date(m.createdAt).toLocaleTimeString()}
            </div>
          </div>
          {active && (
            <Badge variant="secondary" className="ml-2">
              <CheckCircle className="h-3 w-3 mr-1" />
              Active
            </Badge>
          )}
        </div>
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <MessageSquare className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Meeting Assistant</h1>
                <p className="text-sm text-muted-foreground">AI-powered meeting insights</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Select value={workspaceId} onValueChange={setWorkspaceId}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select workspace" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((w) => (
                    <SelectItem key={w} value={w}>{w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {session?.user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={session.user.image || ''} alt={session.user.name || ''} />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{session.user.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {session.user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut()}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button onClick={() => signIn('google')} size="sm">
                  <User className="mr-2 h-4 w-4" />
                  Sign in
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Recent Meetings</CardTitle>
                <CardDescription>Your meeting history</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {meetings.map((m) => (
                  <MeetingRow key={m.id} m={m} />
                ))}
                {!meetings.length && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No meetings yet</p>
                    <p className="text-xs">Create your first meeting to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3 space-y-6">
            <Tabs defaultValue="create" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="create">Create Meeting</TabsTrigger>
                <TabsTrigger value="summary" disabled={!meetingId}>Summary</TabsTrigger>
                <TabsTrigger value="actions" disabled={!meetingId}>Actions</TabsTrigger>
              </TabsList>

              <TabsContent value="create" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      New Meeting
                    </CardTitle>
                    <CardDescription>
                      Create a new meeting by pasting transcript text or uploading a file
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Meeting Title</Label>
                      <Input
                        id="title"
                        placeholder="Enter meeting title..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="transcript">Transcript Text</Label>
                        <Textarea
                          id="transcript"
                          placeholder="Paste your meeting transcript here..."
                          rows={8}
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="file">Or Upload File</Label>
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm font-medium mb-1">Click to upload</p>
                          <p className="text-xs text-muted-foreground mb-3">Supports TXT and PDF files</p>
                          <input
                            id="file"
                            type="file"
                            accept=".txt,.pdf"
                            className="hidden"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('file')?.click()}
                          >
                            Choose File
                          </Button>
                          {file && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              Selected: {file.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                        {error}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button onClick={ingest} disabled={loading} className="flex-1">
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Meeting
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="summary" className="space-y-4">
                {summary && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Meeting Summary
                      </CardTitle>
                      <CardDescription>
                        AI-generated summary of your meeting
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Summary</Label>
                        <div className="p-4 bg-muted/50 rounded-lg border">
                          <pre className="whitespace-pre-wrap text-sm">{summary}</pre>
                        </div>
                      </div>

                      {pdfUrl && (
                        <div className="flex items-center gap-2">
                          <Download className="h-4 w-4" />
                          <a 
                            href={pdfUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            Download PDF
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button onClick={summarize} disabled={loading} variant="outline">
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <FileText className="mr-2 h-4 w-4" />
                              Regenerate Summary
                            </>
                          )}
                        </Button>
                        <Button onClick={postSlack} variant="outline">
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Post to Slack
                        </Button>
                        <Dialog open={notionOpen} onOpenChange={setNotionOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Export to Notion
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Export to Notion</DialogTitle>
                              <DialogDescription>
                                Enter the Notion parent page ID where you want to export this meeting.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-2">
                              <Label htmlFor="notion-parent">Parent Page ID</Label>
                              <Input
                                id="notion-parent"
                                ref={notionParentRef}
                                placeholder="Enter Notion parent page ID"
                              />
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setNotionOpen(false)}>
                                Cancel
                              </Button>
                              <Button onClick={notionExport}>
                                Export
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button onClick={getPdf} variant="outline">
                          <Download className="mr-2 h-4 w-4" />
                          Get PDF
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="actions" className="space-y-4">
                {actionsText && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        Action Items
                      </CardTitle>
                      <CardDescription>
                        Review and edit action items from your meeting
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="actions">Action Items</Label>
                        <Textarea
                          id="actions"
                          rows={8}
                          value={actionsText}
                          onChange={(e) => setActionsText(e.target.value)}
                          placeholder="Action items will appear here..."
                        />
                      </div>
                      <Button onClick={saveActions} className="w-full">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Save Action Items
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </div>
  );
}

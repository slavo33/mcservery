import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Send, Users, Copy, Settings, RefreshCw, Terminal, Wifi, WifiOff, Crown, ChevronDown, ChevronUp, LogIn, LogOut, Skull, Trophy, Ban, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";

interface ChatMessage {
  id: string;
  player_name: string | null;
  user_id: string | null;
  source: string;
  message: string;
  created_at: string;
}

interface OnlinePlayer {
  id: string;
  player_name: string;
  player_uuid: string | null;
}

interface ServerOption {
  id: string;
  name: string;
  ip: string;
  vip_expires_at: string | null;
}

const ServerConsole = () => {
  const { user, loading, isAdmin, profile } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [servers, setServers] = useState<ServerOption[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [players, setPlayers] = useState<OnlinePlayer[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [profileCache, setProfileCache] = useState<Record<string, string>>({});

  // Fetch eligible servers
  useEffect(() => {
    if (!user) return;
    const fetchServers = async () => {
      let query = supabase.from("servers").select("id, name, ip, vip_expires_at");
      if (!isAdmin) {
        query = query.eq("owner_id", user.id);
      }
      const { data } = await query;
      if (data) {
        const eligible = isAdmin
          ? data
          : data.filter((s: any) => s.vip_expires_at && new Date(s.vip_expires_at) > new Date());
        setServers(eligible);
        if (eligible.length === 1) setSelectedServerId(eligible[0].id);
      }
    };
    fetchServers();
  }, [user, isAdmin]);

  // Fetch/create chat connection when server selected
  useEffect(() => {
    if (!selectedServerId || !user) return;
    const fetchConnection = async () => {
      const { data } = await supabase
        .from("chat_connections" as any)
        .select("id, api_key, is_active")
        .eq("server_id", selectedServerId)
        .maybeSingle();

      if (data) {
        setApiKey((data as any).api_key);
        setConnectionId((data as any).id);
        setIsConnected((data as any).is_active);
      } else {
        setApiKey(null);
        setConnectionId(null);
        setIsConnected(false);
      }
    };
    fetchConnection();
  }, [selectedServerId, user]);

  // Fetch existing messages
  useEffect(() => {
    if (!selectedServerId) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("chat_messages" as any)
        .select("*")
        .eq("server_id", selectedServerId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (data) setMessages(data as any);
    };
    fetchMessages();
  }, [selectedServerId]);

  // Fetch online players
  useEffect(() => {
    if (!selectedServerId) return;
    const fetchPlayers = async () => {
      const { data } = await supabase
        .from("chat_online_players" as any)
        .select("*")
        .eq("server_id", selectedServerId);
      if (data) setPlayers(data as any);
    };
    fetchPlayers();
  }, [selectedServerId]);

  // Realtime subscription for messages
  useEffect(() => {
    if (!selectedServerId) return;
    const channel = supabase
      .channel(`chat-messages-${selectedServerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `server_id=eq.${selectedServerId}`,
        },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => [...prev.slice(-499), msg]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedServerId]);

  // Realtime subscription for players
  useEffect(() => {
    if (!selectedServerId) return;
    const channel = supabase
      .channel(`chat-players-${selectedServerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_online_players",
          filter: `server_id=eq.${selectedServerId}`,
        },
        () => {
          // Refetch players on any change
          supabase
            .from("chat_online_players" as any)
            .select("*")
            .eq("server_id", selectedServerId)
            .then(({ data }) => {
              if (data) setPlayers(data as any);
            });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedServerId]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch profile nicknames for web messages
  useEffect(() => {
    const userIds = messages
      .filter((m) => m.source === "web" && m.user_id && !profileCache[m.user_id])
      .map((m) => m.user_id!);
    const unique = [...new Set(userIds)];
    if (unique.length === 0) return;

    supabase
      .from("profiles")
      .select("id, nickname")
      .in("id", unique)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((p) => { map[p.id] = p.nickname; });
          setProfileCache((prev) => ({ ...prev, ...map }));
        }
      });
  }, [messages]);

  const createConnection = async () => {
    if (!selectedServerId) return;
    const { data, error } = await supabase
      .from("chat_connections" as any)
      .insert({ server_id: selectedServerId } as any)
      .select()
      .single();

    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
      return;
    }
    if (data) {
      setApiKey((data as any).api_key);
      setConnectionId((data as any).id);
      setIsConnected(true);
      toast({ title: "Pripojenie vytvorené", description: "API kľúč bol vygenerovaný." });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedServerId || !user) return;
    setSendingMessage(true);
    const { error } = await supabase.from("chat_messages" as any).insert({
      server_id: selectedServerId,
      user_id: user.id,
      source: "web",
      message: newMessage.trim().slice(0, 500),
    } as any);

    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    } else {
      setNewMessage("");
    }
    setSendingMessage(false);
  };

  const copyApiKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      toast({ title: "Skopírované", description: "API kľúč bol skopírovaný do schránky." });
    }
  };

  const regenerateApiKey = async () => {
    if (!connectionId) return;
    const newKey = crypto.randomUUID();
    const { error } = await supabase
      .from("chat_connections" as any)
      .update({ api_key: newKey } as any)
      .eq("id", connectionId);

    if (!error) {
      setApiKey(newKey);
      toast({ title: "Nový kľúč", description: "API kľúč bol regenerovaný. Aktualizujte plugin." });
    }
  };

  const getDisplayName = (msg: ChatMessage) => {
    if (msg.source === "minecraft") return msg.player_name || "Server";
    if (msg.user_id && profileCache[msg.user_id]) return profileCache[msg.user_id];
    if (msg.user_id === user?.id && profile?.nickname) return profile.nickname;
    return "Web";
  };

  const selectedServer = servers.find((s) => s.id === selectedServerId);
  const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-plugin-api`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  // Check if user has any eligible servers or is admin
  const hasAccess = isAdmin || servers.length > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center gap-3 mb-6">
          <Terminal className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Server Console</h1>
          <Badge variant="outline" className="gap-1">
            <Crown className="h-3 w-3" />
            VIP
          </Badge>
        </div>

        {!hasAccess ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Crown className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">VIP funkcia</h2>
              <p className="text-muted-foreground">
                Na prístup k Server Console potrebuješ aktívne VIP predplatné pre svoj server.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Server selector + settings */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={selectedServerId} onValueChange={setSelectedServerId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Vyber server..." />
                </SelectTrigger>
                <SelectContent>
                  {servers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.ip})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedServerId && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Nastavenia pripojenia</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {!apiKey ? (
                        <div className="text-center py-4">
                          <p className="text-muted-foreground mb-4">
                            Najskôr vytvor pripojenie pre tento server.
                          </p>
                          <Button onClick={createConnection}>Vytvoriť pripojenie</Button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className="text-sm font-medium">API Kľúč</label>
                            <div className="flex gap-2 mt-1">
                              <Input value={apiKey} readOnly className="font-mono text-xs" />
                              <Button variant="outline" size="icon" onClick={copyApiKey}>
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="icon" onClick={regenerateApiKey}>
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">API URL</label>
                            <div className="flex gap-2 mt-1">
                              <Input value={edgeFunctionUrl} readOnly className="font-mono text-xs" />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  navigator.clipboard.writeText(edgeFunctionUrl);
                                  toast({ title: "Skopírované" });
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="bg-muted rounded-lg p-4 text-sm space-y-2">
                            <p className="font-semibold">Inštalácia pluginu:</p>
                            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                              <li>Stiahni plugin <code className="text-xs bg-background px-1 py-0.5 rounded">MCServeryChat.jar</code></li>
                              <li>Vlož ho do priečinka <code className="text-xs bg-background px-1 py-0.5 rounded">plugins/</code> na serveri</li>
                              <li>V súbore <code className="text-xs bg-background px-1 py-0.5 rounded">config.yml</code> nastav:</li>
                            </ol>
                            <pre className="bg-background rounded p-3 text-xs overflow-x-auto mt-2">
{`api-url: "${edgeFunctionUrl}"
api-key: "${apiKey}"`}
                            </pre>
                            <p className="text-muted-foreground text-xs mt-2">
                              Plugin posiela chat správy a zoznam hráčov na API a zobrazuje webové správy v hre.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {selectedServerId && (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
                {/* Chat area */}
                <Card className="flex flex-col" style={{ height: "calc(100vh - 280px)", minHeight: "400px" }}>
                  <CardHeader className="py-3 px-4 border-b flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-2">
                      {apiKey ? (
                        <Wifi className="h-4 w-4 text-green-500" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">
                        {selectedServer?.name || "Chat"}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="lg:hidden"
                      onClick={() => setShowPlayers(!showPlayers)}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      {players.length}
                      {showPlayers ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                    </Button>
                  </CardHeader>

                  {/* Mobile player list */}
                  {showPlayers && (
                    <div className="lg:hidden border-b px-4 py-2">
                      <div className="flex flex-wrap gap-2">
                        {players.map((p) => (
                          <div key={p.id} className="flex items-center gap-1.5 bg-muted rounded-full px-2 py-1">
                            <img
                              src={`https://mc-heads.net/avatar/${p.player_name}/16`}
                              alt={p.player_name}
                              className="w-4 h-4 rounded-sm"
                              loading="lazy"
                            />
                            <span className="text-xs">{p.player_name}</span>
                          </div>
                        ))}
                        {players.length === 0 && (
                          <span className="text-xs text-muted-foreground">Žiadni hráči online</span>
                        )}
                      </div>
                    </div>
                  )}

                  <ScrollArea className="flex-1 px-4">
                    <div className="py-3 space-y-1">
                      {!apiKey && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Terminal className="h-8 w-8 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">Klikni na ⚙️ a vytvor pripojenie pre začatie chatu.</p>
                        </div>
                      )}
                      {apiKey && messages.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <p className="text-sm">Žiadne správy. Nainštaluj plugin na server pre zobrazenie chatu.</p>
                        </div>
                      )}
                      {messages.map((msg) => {
                        const isEvent = msg.source.startsWith("event:");
                        const eventType = isEvent ? msg.source.split(":")[1] : null;

                        if (isEvent) {
                          const eventIcon = eventType === "join" ? <LogIn className="h-3 w-3" />
                            : eventType === "leave" ? <LogOut className="h-3 w-3" />
                            : eventType === "death" ? <Skull className="h-3 w-3" />
                            : eventType === "advancement" ? <Trophy className="h-3 w-3" />
                            : eventType === "kick" ? <Ban className="h-3 w-3" />
                            : <Terminal className="h-3 w-3" />;

                          const eventColor = eventType === "join" ? "text-green-500"
                            : eventType === "leave" ? "text-red-400"
                            : eventType === "death" ? "text-red-500"
                            : eventType === "advancement" ? "text-yellow-500"
                            : "text-muted-foreground";

                          return (
                            <div key={msg.id} className="flex items-center gap-2 py-0.5 px-2 -mx-2">
                              <div className={`w-5 h-5 rounded-sm shrink-0 flex items-center justify-center ${eventColor}`}>
                                {eventIcon}
                              </div>
                              <span className={`text-xs italic ${eventColor}`}>
                                {msg.message}
                              </span>
                              <span className="text-[10px] text-muted-foreground/60 ml-auto shrink-0">
                                {new Date(msg.created_at).toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div key={msg.id} className="flex items-start gap-2 py-1 hover:bg-muted/50 rounded px-2 -mx-2">
                          {msg.source === "minecraft" && msg.player_name ? (
                            <img
                              src={`https://mc-heads.net/avatar/${msg.player_name}/20`}
                              alt={msg.player_name}
                              className="w-5 h-5 rounded-sm mt-0.5 shrink-0"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-sm mt-0.5 shrink-0 bg-primary/20 flex items-center justify-center">
                              <Terminal className="h-3 w-3 text-primary" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className={`text-sm font-medium ${msg.source === "web" ? "text-primary" : "text-foreground"}`}>
                              {getDisplayName(msg)}
                            </span>
                            <span className="text-sm text-muted-foreground ml-2">
                              {msg.message}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground/60 ml-auto shrink-0 mt-0.5">
                            {new Date(msg.created_at).toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        );
                      })}
                      <div ref={chatEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Message input */}
                  <div className="border-t p-3">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        sendMessage();
                      }}
                      className="flex gap-2"
                    >
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Napíš správu..."
                        maxLength={500}
                        disabled={!apiKey || sendingMessage}
                        className="flex-1"
                      />
                      <Button type="submit" size="icon" disabled={!apiKey || sendingMessage || !newMessage.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </Card>

                {/* Desktop player list */}
                <Card className="hidden lg:flex flex-col" style={{ height: "calc(100vh - 280px)", minHeight: "400px" }}>
                  <CardHeader className="py-3 px-4 border-b space-y-0">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Hráči online
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {players.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <ScrollArea className="flex-1">
                    <div className="p-3 space-y-1">
                      {players.map((p) => (
                        <div key={p.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50">
                          <img
                            src={`https://mc-heads.net/avatar/${p.player_name}/24`}
                            alt={p.player_name}
                            className="w-6 h-6 rounded-sm shrink-0"
                            loading="lazy"
                          />
                          <span className="text-sm truncate">{p.player_name}</span>
                        </div>
                      ))}
                      {players.length === 0 && (
                        <p className="text-xs text-center text-muted-foreground py-4">
                          Žiadni hráči online
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </Card>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ServerConsole;

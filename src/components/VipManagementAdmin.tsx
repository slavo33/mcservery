import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Settings, Crown, Plus, Minus, XCircle, CalendarPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

interface VipServer {
  id: string;
  name: string;
  ip: string;
  vip_expires_at: string | null;
  vote_cooldown_hours: number;
  is_featured: boolean;
}

const VipManagementAdmin = () => {
  const { locale } = useLanguage();
  const [servers, setServers] = useState<VipServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [extendDialog, setExtendDialog] = useState<VipServer | null>(null);
  const [cancelDialog, setCancelDialog] = useState<VipServer | null>(null);
  const [extendDays, setExtendDays] = useState("30");
  const [assignDialog, setAssignDialog] = useState(false);
  const [allServers, setAllServers] = useState<VipServer[]>([]);
  const [selectedServerId, setSelectedServerId] = useState("");
  const [assignTier, setAssignTier] = useState("basic");
  const [assignDays, setAssignDays] = useState("30");
  const [processing, setProcessing] = useState(false);

  const localeMap: Record<string, string> = {
    sk: "sk-SK", cs: "cs-CZ", en: "en-US", de: "de-DE", fr: "fr-FR",
    ru: "ru-RU", uk: "uk-UA", es: "es-ES", pt: "pt-PT", br: "pt-BR",
    zh: "zh-CN", ja: "ja-JP",
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(localeMap[locale] || "en-US", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

  const tierFromCooldown = (hours: number) => {
    if (hours <= 2) return "max";
    if (hours <= 4) return "pro";
    return "basic";
  };

  const cooldownFromTier = (tier: string) => {
    switch (tier) { case "max": return 2; case "pro": return 4; default: return 8; }
  };

  const tierColor = (tier: string) => {
    switch (tier) {
      case "basic": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "pro": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "max": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  useEffect(() => { fetchVipServers(); }, []);

  const fetchVipServers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("servers")
      .select("id, name, ip, vip_expires_at, vote_cooldown_hours, is_featured")
      .not("vip_expires_at", "is", null)
      .gt("vip_expires_at", new Date().toISOString())
      .order("vip_expires_at", { ascending: true });
    setServers(data || []);
    setLoading(false);
  };

  const fetchAllServers = async () => {
    const { data } = await supabase
      .from("servers")
      .select("id, name, ip, vip_expires_at, vote_cooldown_hours, is_featured")
      .order("name");
    setAllServers(data || []);
  };

  const handleExtend = async () => {
    if (!extendDialog) return;
    setProcessing(true);
    const currentExpiry = new Date(extendDialog.vip_expires_at!);
    const newExpiry = new Date(currentExpiry.getTime() + parseInt(extendDays) * 24 * 60 * 60 * 1000);

    const { error } = await supabase
      .from("servers")
      .update({ vip_expires_at: newExpiry.toISOString() })
      .eq("id", extendDialog.id);

    if (error) {
      toast.error("Chyba pri predĺžení VIP");
    } else {
      toast.success(`VIP predĺžené o ${extendDays} dní`);
      setExtendDialog(null);
      fetchVipServers();
    }
    setProcessing(false);
  };

  const handleCancel = async () => {
    if (!cancelDialog) return;
    setProcessing(true);
    const { error } = await supabase
      .from("servers")
      .update({
        vip_expires_at: null,
        vote_cooldown_hours: 24,
        is_featured: false,
      })
      .eq("id", cancelDialog.id);

    if (error) {
      toast.error("Chyba pri zrušení VIP");
    } else {
      toast.success("VIP status zrušený");
      setCancelDialog(null);
      fetchVipServers();
    }
    setProcessing(false);
  };

  const handleAssign = async () => {
    if (!selectedServerId) return;
    setProcessing(true);
    const expiry = new Date(Date.now() + parseInt(assignDays) * 24 * 60 * 60 * 1000);
    const cooldown = cooldownFromTier(assignTier);

    const { error } = await supabase
      .from("servers")
      .update({
        vip_expires_at: expiry.toISOString(),
        vote_cooldown_hours: cooldown,
        is_featured: true,
      })
      .eq("id", selectedServerId);

    if (error) {
      toast.error("Chyba pri prideľovaní VIP");
    } else {
      toast.success("VIP status pridelený");
      setAssignDialog(false);
      setSelectedServerId("");
      fetchVipServers();
    }
    setProcessing(false);
  };

  const daysLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <section className="mt-12">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold text-foreground">Správa VIP</h2>
        <Badge variant="secondary" className="ml-1">{servers.length}</Badge>
        <Button
          size="sm"
          className="ml-auto gap-1.5"
          onClick={() => { setAssignDialog(true); fetchAllServers(); }}
        >
          <Plus className="h-3.5 w-3.5" /> Prideliť VIP
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Načítavam...</p>
      ) : servers.length === 0 ? (
        <div className="text-center py-10">
          <Crown className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">Žiadne aktívne VIP servery</p>
        </div>
      ) : (
        <div className="space-y-3">
          {servers.map((s) => {
            const tier = tierFromCooldown(s.vote_cooldown_hours);
            return (
              <div key={s.id} className="rounded-lg border border-border bg-secondary/20 p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${tierColor(tier)}`}>
                      {tier.toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-foreground">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.ip}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                    {daysLeft(s.vip_expires_at!)}d zostáva
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-xs text-muted-foreground">
                    Vyprší: <span className="text-foreground">{formatDate(s.vip_expires_at!)}</span>
                    <span className="mx-2">•</span>
                    Cooldown: <span className="text-foreground">{s.vote_cooldown_hours}h</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setExtendDialog(s); setExtendDays("30"); }}>
                      <CalendarPlus className="h-3.5 w-3.5" /> Predĺžiť
                    </Button>
                    <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setCancelDialog(s)}>
                      <XCircle className="h-3.5 w-3.5" /> Zrušiť
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Extend dialog */}
      <Dialog open={!!extendDialog} onOpenChange={(o) => !o && setExtendDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Predĺžiť VIP — {extendDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="text-sm text-muted-foreground">Počet dní na predĺženie</label>
            <Input type="number" min="1" value={extendDays} onChange={(e) => setExtendDays(e.target.value)} />
            {extendDialog?.vip_expires_at && (
              <p className="text-xs text-muted-foreground">
                Aktuálna expirácia: {formatDate(extendDialog.vip_expires_at)}
                <br />
                Nová expirácia: {formatDate(new Date(new Date(extendDialog.vip_expires_at).getTime() + parseInt(extendDays || "0") * 86400000).toISOString())}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setExtendDialog(null)}>Zrušiť</Button>
            <Button onClick={handleExtend} disabled={processing || !extendDays || parseInt(extendDays) < 1}>
              {processing ? "..." : "Predĺžiť"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel dialog */}
      <Dialog open={!!cancelDialog} onOpenChange={(o) => !o && setCancelDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zrušiť VIP — {cancelDialog?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            VIP status bude okamžite zrušený. Cooldown sa vráti na 24h a server bude odstránený z odporúčaných.
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCancelDialog(null)}>Späť</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={processing}>
              {processing ? "..." : "Zrušiť VIP"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign VIP dialog */}
      <Dialog open={assignDialog} onOpenChange={(o) => !o && setAssignDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prideliť VIP manuálne</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Server</label>
              <Select value={selectedServerId} onValueChange={setSelectedServerId}>
                <SelectTrigger><SelectValue placeholder="Vyber server" /></SelectTrigger>
                <SelectContent>
                  {allServers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.ip})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Tier</label>
              <Select value={assignTier} onValueChange={setAssignTier}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic (8h cooldown)</SelectItem>
                  <SelectItem value="pro">Pro (4h cooldown)</SelectItem>
                  <SelectItem value="max">Max (2h cooldown)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Trvanie (dní)</label>
              <Input type="number" min="1" value={assignDays} onChange={(e) => setAssignDays(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAssignDialog(false)}>Zrušiť</Button>
            <Button onClick={handleAssign} disabled={processing || !selectedServerId || parseInt(assignDays) < 1}>
              {processing ? "..." : "Prideliť VIP"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default VipManagementAdmin;

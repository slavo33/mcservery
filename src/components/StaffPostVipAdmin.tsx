import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Crown, Plus, CalendarPlus, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface VipPost {
  id: string;
  position: string;
  server_ip: string;
  vip_tier: string;
  vip_expires_at: string;
  server_name?: string;
}

const StaffPostVipAdmin = () => {
  const [posts, setPosts] = useState<VipPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignDialog, setAssignDialog] = useState(false);
  const [allPosts, setAllPosts] = useState<{ id: string; position: string; server_ip: string }[]>([]);
  const [selectedPostId, setSelectedPostId] = useState("");
  const [assignTier, setAssignTier] = useState("basic");
  const tierDays: Record<string, number> = { basic: 7, pro: 30, max: 90 };
  const [extendDialog, setExtendDialog] = useState<VipPost | null>(null);
  const [extendDays, setExtendDays] = useState("30");
  const [processing, setProcessing] = useState(false);

  const tierColor = (tier: string) => {
    switch (tier) {
      case "basic": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "pro": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "max": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  useEffect(() => { fetchVipPosts(); }, []);

  const fetchVipPosts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("staff_posts")
      .select("id, position, server_ip, vip_tier, vip_expires_at, server_id")
      .not("vip_tier", "is", null)
      .not("vip_expires_at", "is", null)
      .gt("vip_expires_at", new Date().toISOString())
      .order("vip_expires_at", { ascending: true });

    if (data && data.length > 0) {
      const serverIds = [...new Set(data.map(p => p.server_id))];
      const { data: servers } = await supabase.from("servers").select("id, name").in("id", serverIds);
      const serverMap = new Map(servers?.map(s => [s.id, s.name]) || []);
      setPosts(data.map(p => ({
        ...p,
        vip_tier: (p as any).vip_tier,
        vip_expires_at: (p as any).vip_expires_at,
        server_name: serverMap.get(p.server_id) || "Unknown",
      })));
    } else {
      setPosts([]);
    }
    setLoading(false);
  };

  const fetchAllPosts = async () => {
    const { data } = await supabase
      .from("staff_posts")
      .select("id, position, server_ip")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setAllPosts(data || []);
  };

  const handleAssign = async () => {
    if (!selectedPostId) return;
    setProcessing(true);
    const expiry = new Date(Date.now() + (tierDays[assignTier] || 30) * 86400000);
    const { error } = await supabase
      .from("staff_posts")
      .update({ vip_tier: assignTier, vip_expires_at: expiry.toISOString() } as any)
      .eq("id", selectedPostId);
    if (error) {
      toast.error("Chyba pri prideľovaní VIP");
    } else {
      toast.success("VIP pridelený príspevku");
      setAssignDialog(false);
      setSelectedPostId("");
      fetchVipPosts();
    }
    setProcessing(false);
  };

  const handleExtend = async () => {
    if (!extendDialog) return;
    setProcessing(true);
    const currentExpiry = new Date(extendDialog.vip_expires_at);
    const newExpiry = new Date(currentExpiry.getTime() + parseInt(extendDays) * 86400000);
    const { error } = await supabase
      .from("staff_posts")
      .update({ vip_expires_at: newExpiry.toISOString() } as any)
      .eq("id", extendDialog.id);
    if (error) {
      toast.error("Chyba pri predĺžení VIP");
    } else {
      toast.success(`VIP predĺžené o ${extendDays} dní`);
      setExtendDialog(null);
      fetchVipPosts();
    }
    setProcessing(false);
  };

  const handleCancel = async (post: VipPost) => {
    setProcessing(true);
    const { error } = await supabase
      .from("staff_posts")
      .update({ vip_tier: null, vip_expires_at: null } as any)
      .eq("id", post.id);
    if (error) {
      toast.error("Chyba pri zrušení VIP");
    } else {
      toast.success("VIP zrušený");
      fetchVipPosts();
    }
    setProcessing(false);
  };

  const daysLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("sk-SK", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

  return (
    <section className="mt-12">
      <div className="flex items-center gap-2 mb-4">
        <Crown className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold text-foreground">Správa VIP príspevkov</h2>
        <Badge variant="secondary" className="ml-1">{posts.length}</Badge>
        <Button
          size="sm"
          className="ml-auto gap-1.5"
          onClick={() => { setAssignDialog(true); fetchAllPosts(); }}
        >
          <Plus className="h-3.5 w-3.5" /> Prideliť VIP
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Načítavam...</p>
      ) : posts.length === 0 ? (
        <div className="text-center py-10">
          <Crown className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">Žiadne aktívne VIP príspevky</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <div key={p.id} className="rounded-lg border border-border bg-secondary/20 p-4">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${tierColor(p.vip_tier)}`}>
                    {p.vip_tier.toUpperCase()}
                  </span>
                  <Link to={`/staff/${p.id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                    {p.position} — {p.server_name}
                  </Link>
                  <span className="text-xs text-muted-foreground">{p.server_ip}</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                  {daysLeft(p.vip_expires_at)}d zostáva
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-xs text-muted-foreground">
                  Vyprší: <span className="text-foreground">{formatDate(p.vip_expires_at)}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setExtendDialog(p); setExtendDays("30"); }}>
                    <CalendarPlus className="h-3.5 w-3.5" /> Predĺžiť
                  </Button>
                  <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => handleCancel(p)}>
                    <XCircle className="h-3.5 w-3.5" /> Zrušiť
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign dialog */}
      <Dialog open={assignDialog} onOpenChange={(o) => !o && setAssignDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prideliť VIP príspevku</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Príspevok</label>
              <Select value={selectedPostId} onValueChange={setSelectedPostId}>
                <SelectTrigger><SelectValue placeholder="Vyber príspevok" /></SelectTrigger>
                <SelectContent>
                  {allPosts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.position} — {p.server_ip}
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
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="max">Max</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Trvanie: <span className="text-foreground font-medium">{tierDays[assignTier] || 30} dní</span>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAssignDialog(false)}>Zrušiť</Button>
            <Button onClick={handleAssign} disabled={processing || !selectedPostId}>
              {processing ? "..." : "Prideliť VIP"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend dialog */}
      <Dialog open={!!extendDialog} onOpenChange={(o) => !o && setExtendDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Predĺžiť VIP — {extendDialog?.position}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="text-sm text-muted-foreground">Počet dní na predĺženie</label>
            <Input type="number" min="1" value={extendDays} onChange={(e) => setExtendDays(e.target.value)} />
            {extendDialog && (
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
    </section>
  );
};

export default StaffPostVipAdmin;

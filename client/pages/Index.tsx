import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import {
  AlertCircle,
  BarChart3,
  Check,
  Clock,
  MapPin,
  MessageSquare,
  Package as PackageIcon,
  Pill,
  TrendingUp,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLocalStorage } from "@/hooks/use-local-storage";

// Types
interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  minStock: number;
  demandCount: number;
  unitPrice: number; // for sales calculations
}

interface SmsRequest {
  id: string;
  patientName: string;
  medicineId: string;
  medicineName: string;
  qty: number;
  distanceKm: number; // distance from this pharmacy
  nearestPharmacyName?: string;
  assignedTo?: string; // if another pharmacy already accepted
  createdAt: number;
  status: "pending" | "accepted" | "rejected" | "handedoff";
  address: string;
}

interface HandoffOrder {
  id: string; // same as request id
  patientName: string;
  address: string;
  medicineName: string;
  qty: number;
  createdAt: number;
  handedOffAt?: number;
}

const now = () => Date.now();

function seasonOf(date: Date) {
  const m = date.getMonth();
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "autumn";
  return "winter";
}

const DEFAULT_INVENTORY: InventoryItem[] = [
  { id: "paracetamol", name: "Paracetamol 500mg", stock: 6, minStock: 12, demandCount: 128, unitPrice: 1.5 },
  { id: "amoxicillin", name: "Amoxicillin 250mg", stock: 0, minStock: 10, demandCount: 96, unitPrice: 2.2 },
  { id: "cetirizine", name: "Cetirizine 10mg", stock: 28, minStock: 20, demandCount: 211, unitPrice: 0.8 },
  { id: "saline", name: "Oral Rehydration Salts", stock: 2, minStock: 8, demandCount: 75, unitPrice: 0.6 },
  { id: "calamine", name: "Calamine Lotion", stock: 1, minStock: 6, demandCount: 59, unitPrice: 3.1 },
  { id: "acyclovir", name: "Acyclovir 400mg", stock: 0, minStock: 8, demandCount: 43, unitPrice: 2.8 },
];

const DEFAULT_REQUESTS: SmsRequest[] = [
  {
    id: "r1",
    patientName: "Sita Devi",
    medicineId: "paracetamol",
    medicineName: "Paracetamol 500mg",
    qty: 2,
    distanceKm: 1.2,
    createdAt: now() - 1000 * 60 * 10,
    status: "pending",
    address: "Ward 3, Near Panchayat Bhavan",
  },
  {
    id: "r2",
    patientName: "Mohit Kumar",
    medicineId: "amoxicillin",
    medicineName: "Amoxicillin 250mg",
    qty: 1,
    distanceKm: 4.8,
    nearestPharmacyName: "Seva Medico",
    assignedTo: "Seva Medico",
    createdAt: now() - 1000 * 60 * 25,
    status: "pending",
    address: "Kisan Colony, House 12",
  },
  {
    id: "r3",
    patientName: "Radha Patel",
    medicineId: "cetirizine",
    medicineName: "Cetirizine 10mg",
    qty: 1,
    distanceKm: 0.5,
    createdAt: now() - 1000 * 60 * 5,
    status: "pending",
    address: "Maa Mandir Road, Opp. Primary School",
  },
  {
    id: "r4",
    patientName: "Ramu",
    medicineId: "acyclovir",
    medicineName: "Acyclovir 400mg",
    qty: 1,
    distanceKm: 2.1,
    createdAt: now() - 1000 * 60 * 40,
    status: "pending",
    address: "Chowk Bazaar, Next to Tea Stall",
  },
];

const DEFAULT_HANDOFFS: HandoffOrder[] = [];

export default function Index() {
  const [inventory, setInventory] = useLocalStorage<InventoryItem[]>(
    "jl_inventory",
    DEFAULT_INVENTORY,
  );
  const [requests, setRequests] = useLocalStorage<SmsRequest[]>(
    "jl_requests",
    DEFAULT_REQUESTS,
  );
  const [handoffs, setHandoffs] = useLocalStorage<HandoffOrder[]>(
    "jl_handoffs",
    DEFAULT_HANDOFFS,
  );
  const [offline, setOffline] = useLocalStorage<boolean>("jl_offline", false);

  // Derived data
  const outOfStock = useMemo(
    () =>
      inventory
        .filter((i) => i.stock <= 0 || i.stock < i.minStock)
        .sort((a, b) => a.stock - b.stock),
    [inventory],
  );

  const mostDemand = useMemo(
    () => [...inventory].sort((a, b) => b.demandCount - a.demandCount).slice(0, 5),
    [inventory],
  );

  const season = seasonOf(new Date());
  const seasonalRecommendations = useMemo(() => {
    const list: { title: string; reason: string; meds: string[] }[] = [];
    if (season === "spring") {
      list.push({
        title: "Pox preparedness",
        reason:
          "Cases rising in nearby villages. Stock antivirals, fever and itch relief.",
        meds: ["Acyclovir 400mg", "Calamine Lotion", "Paracetamol 500mg"],
      });
      list.push({
        title: "Allergy surge",
        reason: "High pollen counts. Antihistamines in demand.",
        meds: ["Cetirizine 10mg"],
      });
    }
    if (season === "summer") {
      list.push({
        title: "Dehydration risk",
        reason: "Heat wave alert. Rehydrate and electrolytes.",
        meds: ["Oral Rehydration Salts"],
      });
    }
    if (season === "winter") {
      list.push({
        title: "Viral fever",
        reason: "Seasonal flu uptick. Antipyretics & cough remedies.",
        meds: ["Paracetamol 500mg"],
      });
    }
    return list;
  }, [season]);

  const salesByDay = useMemo(() => {
    // Fake 7-day sales based on demandCount and orders
    const days = Array.from({ length: 7 }).map((_, idx) => {
      const day = new Date();
      day.setDate(day.getDate() - (6 - idx));
      const key = `${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`;
      const ordersToday = handoffs.filter((o) => {
        const d = new Date(o.createdAt);
        return (
          d.getFullYear() === day.getFullYear() &&
          d.getMonth() === day.getMonth() &&
          d.getDate() === day.getDate()
        );
      });
      const revenue = ordersToday.reduce((sum, o) => {
        const inv = inventory.find((i) => i.name === o.medicineName);
        return sum + (inv ? inv.unitPrice * o.qty : 0);
      }, 0);
      return { key, date: day.toLocaleDateString(undefined, { weekday: "short" }), revenue };
    });
    return days;
  }, [handoffs, inventory]);

  const totalSales = useMemo(() => salesByDay.reduce((s, d) => s + d.revenue, 0), [salesByDay]);

  // Actions
  const restock = (id: string, amount = 10) => {
    setInventory((prev) =>
      prev.map((i) => (i.id === id ? { ...i, stock: i.stock + amount } : i)),
    );
    toast({ title: "Inventory updated", description: `Added +${amount} units.` });
  };

  const canFulfill = (req: SmsRequest) => {
    const item = inventory.find((i) => i.id === req.medicineId);
    return !!item && item.stock >= req.qty;
  };

  const acceptRequest = (id: string) => {
    setRequests((prev) => {
      const req = prev.find((r) => r.id === id);
      if (!req) return prev;
      if (!canFulfill(req)) {
        toast({ title: "Insufficient stock", description: `Cannot fulfill ${req.medicineName}.` });
        return prev;
      }
      // update inventory
      setInventory((inv) =>
        inv.map((i) =>
          i.id === req.medicineId ? { ...i, stock: Math.max(0, i.stock - req.qty) } : i,
        ),
      );
      // create handoff order
      const order: HandoffOrder = {
        id: req.id,
        patientName: req.patientName,
        address: req.address,
        medicineName: req.medicineName,
        qty: req.qty,
        createdAt: now(),
      };
      setHandoffs((h) => [order, ...h]);
      toast({ title: "Request accepted", description: `${req.patientName} · ${req.medicineName}` });
      return prev.map((r) => (r.id === id ? { ...r, status: "accepted" } : r));
    });
  };

  const rejectRequest = (id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "rejected" } : r)),
    );
    toast({ title: "Request rejected" });
  };

  const handoff = (id: string) => {
    setHandoffs((prev) => prev.map((o) => (o.id === id ? { ...o, handedOffAt: now() } : o)));
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "handedoff" } : r)));
    toast({ title: "Handoff completed", description: "Medicine given to CHW partner." });
  };

  // Priority score: nearest and in-stock wins
  const priorityLabel = (req: SmsRequest) => {
    if (req.assignedTo) return `Assigned to ${req.assignedTo}`;
    if (!canFulfill(req)) return "Out of stock";
    if (req.distanceKm <= 1) return "You are nearest";
    if (req.distanceKm <= 3) return "High priority";
    return "Normal";
  };

  // Simulate offline by disabling actions
  const disabledByOffline = offline;

  // Effects: keep title dynamic
  useEffect(() => {
    document.title = "Jeevanline Pharmacy | Dashboard";
  }, []);

  return (
    <div className="py-6 sm:py-8">
      {/* Top status bar */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="col-span-2">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  Jeevanline Pharmacy Operations
                </h1>
                <p className="text-sm text-muted-foreground">
                  Offline-first, mobile-first workflow for village telemedicine
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={offline ? "destructive" : "secondary"}>
                  {offline ? "Offline" : "Online"}
                </Badge>
                <Button
                  variant={offline ? "secondary" : "outline"}
                  onClick={() => setOffline(!offline)}
                >
                  {offline ? "Go online" : "Go offline"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">7-day revenue</p>
                <p className="text-lg font-semibold">₹{totalSales.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Out of stock */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" /> Medicine out of stock
              </CardTitle>
              <Badge variant="destructive">Action needed</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {outOfStock.length === 0 && (
              <p className="text-sm text-muted-foreground">All good. No stock alerts.</p>
            )}
            {outOfStock.map((item) => {
              const low = item.stock <= 0;
              const pct = Math.max(0, Math.min(100, (item.stock / item.minStock) * 100));
              return (
                <div key={item.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <Pill className="h-4 w-4 text-primary" /> {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">Min {item.minStock} · In stock {item.stock}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={low ? "destructive" : "secondary"}>{low ? "Out" : "Low"}</Badge>
                      <Button size="sm" onClick={() => restock(item.id)} disabled={disabledByOffline}>Restock +10</Button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Progress value={pct} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Most demand */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Medicines with most demand
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {mostDemand.map((m) => (
                <div key={m.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{m.name}</p>
                    <Badge variant="secondary">{m.demandCount} req</Badge>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" /> Typical daily ~{Math.max(1, Math.round(m.demandCount / 30))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Seasonal recommendations */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" /> Recommendations · {season.toUpperCase()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {seasonalRecommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No seasonal alerts.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {seasonalRecommendations.map((rec, idx) => (
                  <div key={idx} className="rounded-xl border p-4 bg-gradient-to-br from-secondary to-background">
                    <p className="font-semibold mb-1">{rec.title}</p>
                    <p className="text-sm text-muted-foreground mb-2">{rec.reason}</p>
                    <div className="flex flex-wrap gap-2">
                      {rec.meds.map((n) => (
                        <Badge key={n}>{n}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* SMS Requests */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" /> SMS requests
              </CardTitle>
              <Badge variant="secondary">{requests.filter((r) => r.status === "pending").length} pending</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {requests.length === 0 && (
              <p className="text-sm text-muted-foreground">No requests right now.</p>
            )}
            {requests
              .filter((r) => r.status === "pending")
              .sort((a, b) => a.distanceKm - b.distanceKm)
              .map((r) => {
                const priority = priorityLabel(r);
                const disabled = disabledByOffline || !!r.assignedTo;
                return (
                  <div key={r.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{r.patientName}</p>
                        <p className="text-xs text-muted-foreground">{r.medicineName} · Qty {r.qty}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {r.distanceKm.toFixed(1)} km · {r.address}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={priority.includes("Assigned") ? "secondary" : priority === "Out of stock" ? "destructive" : "default"}>
                          {priority}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Button size="sm" onClick={() => acceptRequest(r.id)} disabled={disabled || !canFulfill(r)} className="inline-flex">
                        <Check className="h-4 w-4" /> Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => rejectRequest(r.id)} disabled={disabled} className="inline-flex">
                        <X className="h-4 w-4" /> Reject
                      </Button>
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>

        {/* Delivery handoff */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <PackageIcon className="h-5 w-5 text-primary" /> Handoff to CHW
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {handoffs.filter((h) => !h.handedOffAt).length === 0 && (
              <p className="text-sm text-muted-foreground">No packages ready yet.</p>
            )}
            {handoffs
              .filter((h) => !h.handedOffAt)
              .map((h) => (
                <div key={h.id} className="rounded-lg border p-3">
                  <p className="font-medium">{h.patientName}</p>
                  <p className="text-xs text-muted-foreground">{h.medicineName} · Qty {h.qty}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {h.address}</p>
                  <div className="mt-2">
                    <Button size="sm" onClick={() => handoff(h.id)} disabled={disabledByOffline} className="inline-flex">
                      <SendIcon className="h-4 w-4" /> Handoff to CHW
                    </Button>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Sales dashboard */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> Sales overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <Stat label="Total revenue (7d)" value={`₹${totalSales.toFixed(2)}`} />
              <Stat label="Pending requests" value={String(requests.filter((r) => r.status === "pending").length)} />
              <Stat label="Accepted" value={String(requests.filter((r) => r.status === "accepted").length)} />
              <Stat label="Handed off" value={String(handoffs.filter((h) => h.handedOffAt).length)} />
            </div>
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesByDay} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} className="fill-muted-foreground text-xs" />
                  <YAxis tickLine={false} axisLine={false} className="fill-muted-foreground text-xs" />
                  <ReTooltip formatter={(v: number) => `₹${v.toFixed(2)}`} labelClassName="text-xs" />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function SendIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

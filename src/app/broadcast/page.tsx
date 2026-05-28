"use client";

import { useState, useEffect } from "react";
import {
  QrCode,
  RefreshCw,
  Send,
  PlayCircle,
  Settings2,
  ShieldCheck,
  Loader2,
  BrainCircuit,
  X,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  StopCircle,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase-browser";

const SETTINGS_ID = "11111111-1111-1111-1111-111111111111";

interface Campaign {
  id: string;
  status: string;
  target_group: string;
  template_id: string;
  total_count: number;
  sent_count: number;
  failed_count: number;
  progress: number;
  created_at: string;
  completed_at: string | null;
}

export default function BroadcastPage() {
  const supabase = createClient();
  const [botEnabled, setBotEnabled] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>("disconnected");
  const [targetGroup, setTargetGroup] = useState("All Contacts");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [minDelay, setMinDelay] = useState(40);
  const [maxDelay, setMaxDelay] = useState(150);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContacts, setPreviewContacts] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [groups, setGroups] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    const fetchStatus = async () => {
      if (cancelled) return;
      const { data: settings } = await supabase
        .from("bot_settings")
        .select("is_bot_enabled,session_status,qr_code")
        .eq("id", SETTINGS_ID)
        .single();
      if (cancelled) return;
      if (settings) {
        setBotEnabled(settings.is_bot_enabled);
        setConnectionStatus(settings.session_status);
        if (settings.qr_code && settings.session_status === "waiting_qr") {
          setQrCodeData(settings.qr_code);
        } else if (settings.session_status === "connected") {
          setQrCodeData(null);
        }
      }

      const { data: campaign } = await supabase
        .from("campaigns")
        .select("*")
        .in("status", ["pending", "sending"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setActiveCampaign(campaign);
    };

    const fetchAll = async () => {
      if (cancelled) return;
      await fetchStatus();

      const { data: tmpls } = await supabase
        .from("templates")
        .select("id,name,created_at")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (tmpls) setTemplates(tmpls);

      const { data: contacts } = await supabase.from("contacts").select("group_name");
      if (cancelled) return;
      if (contacts) {
        const uniqueGroups = [...new Set(contacts.map((c: any) => c.group_name).filter(Boolean))] as string[];
        setGroups(uniqueGroups);
      }
    };

    fetchAll();
    const statusInterval = setInterval(fetchStatus, 10000);
    const fullInterval = setInterval(fetchAll, 30000);
    return () => { cancelled = true; clearInterval(statusInterval); clearInterval(fullInterval); };
  }, []);

  const handlePreviewContacts = async () => {
    setPreviewLoading(true);
    setShowPreview(true);
    let query = supabase.from("contacts").select("*").order("name");
    if (targetGroup !== "All Contacts") {
      query = query.eq("group_name", targetGroup);
    }
    const { data, error } = await query.limit(50);
    if (!error && data) {
      setPreviewContacts(data);
    } else {
      setPreviewContacts([]);
      toast.error("Failed to load contacts", { description: error?.message || "Unknown error" });
    }
    setPreviewLoading(false);
  };

  const handleLaunch = async () => {
    if (!selectedTemplate) {
      toast.error("No Template Selected", { description: "Please select a message template." });
      return;
    }
    if (connectionStatus !== "connected") {
      toast.error("Bot Not Connected", { description: "Please connect to WhatsApp first." });
      return;
    }

    setIsLaunching(true);
    const { error } = await supabase.from("campaigns").insert([{
      target_group: targetGroup,
      template_id: selectedTemplate,
      min_delay: minDelay,
      max_delay: maxDelay,
      status: "pending",
      progress: 0,
      sent_count: 0,
      failed_count: 0,
      total_count: 0,
    }]);
    setIsLaunching(false);

    if (error) {
      toast.error("Failed to launch", { description: error.message });
    } else {
      toast.success("Campaign Queued", { description: "Worker will start sending messages shortly." });
    }
  };

  const handleCancelCampaign = async () => {
    if (!activeCampaign) return;
    if (!confirm("Cancel this campaign?")) return;
    const { error } = await supabase
      .from("campaigns")
      .update({ status: "cancelled" })
      .eq("id", activeCampaign.id);
    if (error) {
      toast.error("Failed to cancel", { description: error.message });
    } else {
      toast.success("Campaign cancelled");
    }
  };

  const toggleBot = async () => {
    const newState = !botEnabled;
    setBotEnabled(newState);
    await supabase.from("bot_settings").update({ is_bot_enabled: newState }).eq("id", SETTINGS_ID);
    toast(newState ? "AI Auto-Reply Enabled" : "AI Auto-Reply Disabled");
  };

  const handleRegenerateQR = async () => {
    toast.info("Regenerating QR Code...");
    setQrCodeData(null);
    await supabase
      .from("bot_settings")
      .update({ qr_code: null, session_status: "waiting_qr" })
      .eq("id", SETTINGS_ID);
  };

  const isCampaignActive = activeCampaign && ["pending", "sending"].includes(activeCampaign.status);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-cyan-500 p-6 sm:p-8 text-white shadow-xl shadow-indigo-500/20">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Broadcast Campaign</h1>
          <p className="mt-2 text-indigo-100 text-sm sm:text-base max-w-2xl">
            Configure and launch your AI-powered WhatsApp marketing campaigns with human mimicry.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Campaign Setup */}
          <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4 bg-slate-50/50 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <Settings2 className="h-4 w-4" />
              </div>
              <h2 className="font-bold text-slate-900">Campaign Setup</h2>
            </div>
            <div className="p-6 space-y-6">
              {/* Target Selection */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Target Audience</label>
                <div className="flex gap-3">
                  <select
                    value={targetGroup}
                    onChange={(e) => setTargetGroup(e.target.value)}
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl bg-white text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="All Contacts">All Contacts</option>
                    {groups.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  <button
                    onClick={handlePreviewContacts}
                    className="px-5 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all active:scale-[0.97]"
                  >
                    Preview
                  </button>
                </div>
              </div>

              {/* Template Selection */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Message Template</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  <option value="">Select a template...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Delay Config */}
              <div className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 p-5">
                <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold text-sm">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  Anti-Ban Protection (Human Mimicry)
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Min Delay (sec)</label>
                    <input
                      type="number"
                      value={minDelay}
                      onChange={(e) => setMinDelay(Number(e.target.value))}
                      min={10}
                      max={300}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm font-medium focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Max Delay (sec)</label>
                    <input
                      type="number"
                      value={maxDelay}
                      onChange={(e) => setMaxDelay(Number(e.target.value))}
                      min={10}
                      max={600}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm font-medium focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                  Each message uses a random delay between Min and Max to simulate human behavior.
                </p>
              </div>

              {/* Launch / Cancel Button */}
              {isCampaignActive ? (
                <button
                  onClick={handleCancelCampaign}
                  className="w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-gradient-to-r from-rose-500 to-red-500 text-white rounded-2xl font-bold text-base shadow-lg shadow-rose-500/25 transition-all hover:shadow-rose-500/40 active:scale-[0.98]"
                >
                  <StopCircle className="h-5 w-5" />
                  Cancel Campaign
                </button>
              ) : (
                <button
                  onClick={handleLaunch}
                  disabled={isLaunching}
                  className="w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white rounded-2xl font-bold text-base shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {isLaunching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  {isLaunching ? "Launching..." : "Launch Campaign"}
                </button>
              )}
            </div>
          </div>

          {/* Live Progress */}
          <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                  <PlayCircle className="h-4 w-4" />
                </div>
                <h2 className="font-bold text-slate-900">Live Progress</h2>
              </div>
              {activeCampaign && (
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                  activeCampaign.status === "completed" ? "bg-emerald-100 text-emerald-700"
                  : activeCampaign.status === "sending" ? "bg-indigo-100 text-indigo-700"
                  : activeCampaign.status === "cancelled" ? "bg-rose-100 text-rose-700"
                  : "bg-slate-100 text-slate-500"
                }`}>
                  {activeCampaign.status}
                </span>
              )}
            </div>
            <div className="p-6">
              {activeCampaign ? (
                <>
                  <div className="mb-4 flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Completion</span>
                    <span className="font-bold text-indigo-600">{activeCampaign.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 mb-8 overflow-hidden">
                    <motion.div
                      className="bg-gradient-to-r from-indigo-500 to-cyan-500 h-3 rounded-full shadow-sm shadow-indigo-500/30"
                      initial={{ width: 0 }}
                      animate={{ width: `${activeCampaign.progress}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total</span>
                      </div>
                      <div className="text-3xl font-black text-slate-800">{activeCampaign.total_count}</div>
                    </div>
                    <div className="text-center p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Sent</span>
                      </div>
                      <div className="text-3xl font-black text-emerald-600">{activeCampaign.sent_count}</div>
                    </div>
                    <div className="text-center p-4 rounded-2xl bg-rose-50 border border-rose-100">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                        <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">Failed</span>
                      </div>
                      <div className="text-3xl font-black text-rose-600">{activeCampaign.failed_count}</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 mb-3">
                    <PlayCircle className="h-7 w-7" />
                  </div>
                  <p className="font-semibold text-slate-500">No active campaign</p>
                  <p className="text-xs text-slate-400 mt-1">Launch a campaign to see real-time progress</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Connection Card */}
          <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600">
                  <QrCode className="h-4 w-4" />
                </div>
                <h2 className="font-bold text-slate-900">Connection</h2>
              </div>
              <span className="flex h-3 w-3 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${connectionStatus === "connected" ? "bg-emerald-400" : connectionStatus === "waiting_qr" ? "bg-amber-400" : "bg-rose-400"} opacity-75`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${connectionStatus === "connected" ? "bg-emerald-500" : connectionStatus === "waiting_qr" ? "bg-amber-500" : "bg-rose-500"}`} />
              </span>
            </div>
            <div className="p-6 flex flex-col items-center">
              <div className="w-52 h-52 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 mb-5 overflow-hidden">
                {connectionStatus === "connected" ? (
                  <div className="flex flex-col items-center text-emerald-500">
                    <CheckCircle2 className="h-14 w-14 mb-2" />
                    <span className="text-xs font-semibold">Connected</span>
                  </div>
                ) : qrCodeData ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeData)}`}
                    alt="WhatsApp QR Code"
                    className="w-full h-full object-cover p-2"
                  />
                ) : (
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-3" />
                    <span className="text-xs font-medium text-center px-4 text-slate-400">Generating QR...</span>
                  </div>
                )}
              </div>
              <button
                onClick={handleRegenerateQR}
                className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all active:scale-[0.97] w-full justify-center"
              >
                <RefreshCw className="h-4 w-4" /> Regenerate QR
              </button>
            </div>
          </div>

          {/* AI Auto-Reply */}
          <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${botEnabled ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"}`}>
                    <BrainCircuit className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-sm">AI Auto-Reply</h2>
                    <p className="text-xs text-slate-400">{botEnabled ? "Active" : "Disabled"}</p>
                  </div>
                </div>
                <button
                  onClick={toggleBot}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${botEnabled ? "bg-indigo-600" : "bg-slate-300"}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${botEnabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                When enabled, the bot automatically replies to inbound messages following your AI Training context.
              </p>
              <div className="rounded-xl bg-amber-50 border border-amber-200/60 p-3.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                  <span className="text-xs font-bold text-amber-800">Built-in Safety</span>
                </div>
                <p className="text-xs text-amber-700/80">The bot never replies to your own outbound messages.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Contact Preview</h3>
                    <p className="text-xs text-slate-500">{targetGroup} &mdash; {previewContacts.length} loaded</p>
                  </div>
                </div>
                <button onClick={() => setShowPreview(false)} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>
              <div className="overflow-y-auto max-h-[60vh] p-5">
                {previewLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                  </div>
                ) : previewContacts.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 mx-auto mb-3">
                      <Users className="h-8 w-8" />
                    </div>
                    <p className="font-semibold text-slate-500">No contacts found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {previewContacts.map((contact) => (
                      <div key={contact.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-indigo-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 text-white text-xs font-bold">
                            {contact.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{contact.name}</p>
                            <p className="text-xs text-slate-500">{contact.phone_number}</p>
                          </div>
                        </div>
                        <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500">
                          {contact.group_name || "Ungrouped"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

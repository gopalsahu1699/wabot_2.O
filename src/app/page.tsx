"use client";

import { useState, useEffect } from "react";
import { Users, Send, AlertCircle, PlayCircle, TrendingUp, ArrowRight, WifiOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { motion } from "framer-motion";

export default function Dashboard() {
  const supabase = createClient();
  const [stats, setStats] = useState({
    totalContacts: 0,
    messagesSent: 0,
    failedMessages: 0,
    activeCampaigns: 0,
  });
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      if (cancelled) return;
      const { count: totalContacts } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true });

      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("sent_count, failed_count, status")
        .order("created_at", { ascending: false });

      if (cancelled) return;
      let messagesSent = 0;
      let failedMessages = 0;
      let activeCampaigns = 0;
      if (campaigns) {
        campaigns.forEach((c: any) => {
          messagesSent += c.sent_count || 0;
          failedMessages += c.failed_count || 0;
          if (["pending", "sending"].includes(c.status)) activeCampaigns++;
        });
      }

      setStats({
        totalContacts: totalContacts || 0,
        messagesSent,
        failedMessages,
        activeCampaigns,
      });

      const { data: recent } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (cancelled) return;
      setRecentCampaigns(recent || []);
      setLoading(false);
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const metrics = [
    {
      label: "Total Contacts",
      value: stats.totalContacts,
      icon: Users,
      bg: "bg-blue-50",
      text: "text-blue-600",
      ring: "ring-blue-500/10",
    },
    {
      label: "Messages Sent",
      value: stats.messagesSent,
      icon: Send,
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      ring: "ring-emerald-500/10",
    },
    {
      label: "Failed Messages",
      value: stats.failedMessages,
      icon: AlertCircle,
      bg: "bg-rose-50",
      text: "text-rose-600",
      ring: "ring-rose-500/10",
    },
    {
      label: "Active Campaigns",
      value: stats.activeCampaigns,
      icon: PlayCircle,
      bg: "bg-violet-50",
      text: "text-violet-600",
      ring: "ring-violet-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 text-white shadow-xl shadow-slate-900/20">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back <span className="text-indigo-400">👋</span>
          </h1>
          <p className="mt-2 text-slate-400 max-w-xl text-sm sm:text-base">
            Here&apos;s what&apos;s happening with your WhatsApp bot campaigns today.
          </p>
          <Link
            href="/broadcast"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-400 hover:shadow-indigo-500/40 active:scale-[0.98]"
          >
            Get Started <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="group rounded-2xl border border-slate-200/60 bg-white p-5 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${metric.bg} ${metric.text} ring-1 ${metric.ring} transition-transform duration-300 group-hover:scale-110`}>
              <metric.icon className="h-5 w-5" />
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{metric.label}</p>
              <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-900">
                {loading ? <Loader2 className="h-6 w-6 animate-spin text-slate-300" /> : metric.value}
              </h2>
            </div>
          </div>
        ))}
      </div>

      {/* Status Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50 p-6 shadow-sm">
        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-amber-400/10 blur-2xl" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 ring-1 ring-amber-200">
              <WifiOff className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900 text-lg">Bot is currently disconnected</h3>
              <p className="mt-0.5 text-amber-700/80 text-sm">
                Go to the Broadcast page to scan the QR code and connect your WhatsApp.
              </p>
            </div>
          </div>
          <Link
            href="/broadcast"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-600/20 transition-all hover:bg-amber-500 active:scale-[0.98] whitespace-nowrap"
          >
            Connect Now
          </Link>
        </div>
      </div>

      {/* Recent Campaigns */}
      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900">Recent Campaigns</h3>
          </div>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : recentCampaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 mb-3">
                <PlayCircle className="h-7 w-7" />
              </div>
              <p className="font-semibold text-slate-500">No campaigns yet</p>
              <p className="text-xs text-slate-400 mt-1">Launch a campaign to see results here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCampaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      c.status === "completed" ? "bg-emerald-100 text-emerald-600"
                      : c.status === "sending" ? "bg-indigo-100 text-indigo-600"
                      : c.status === "cancelled" ? "bg-rose-100 text-rose-600"
                      : "bg-slate-100 text-slate-500"
                    }`}>
                      {c.status === "completed" ? <CheckCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{c.target_group || "All Contacts"}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(c.created_at).toLocaleDateString()} &middot; {c.sent_count || 0}/{c.total_count || 0} sent
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                    c.status === "completed" ? "bg-emerald-100 text-emerald-700"
                    : c.status === "sending" ? "bg-indigo-100 text-indigo-700"
                    : c.status === "cancelled" ? "bg-rose-100 text-rose-700"
                    : "bg-slate-100 text-slate-500"
                  }`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

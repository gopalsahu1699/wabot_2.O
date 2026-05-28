"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Save,
  Loader2,
  AlertTriangle,
  Trash2,
  Gauge,
  MessageSquare,
  Clock,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase-browser";

const SETTINGS_ID = "11111111-1111-1111-1111-111111111111";

export default function SettingsPage() {
  const supabase = createClient();
  const [botName, setBotName] = useState("WaBot AI");
  const [replyDelay, setReplyDelay] = useState(5);
  const [maxMessagesPerDay, setMaxMessagesPerDay] = useState(200);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const { data, error } = await supabase
        .from("bot_settings")
        .select("*")
        .eq("id", SETTINGS_ID)
        .single();
      if (!error && data) {
        if (data.bot_name) setBotName(data.bot_name);
        if (data.reply_delay) setReplyDelay(data.reply_delay);
        if (data.max_messages_per_day) setMaxMessagesPerDay(data.max_messages_per_day);
      }
      setIsLoading(false);
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from("bot_settings").upsert(
        [
          {
            id: SETTINGS_ID,
            bot_name: botName,
            reply_delay: replyDelay,
            max_messages_per_day: maxMessagesPerDay,
          },
        ],
        { onConflict: "id" }
      );
      if (error) throw error;
      toast.success("Settings Saved", { description: "Your bot settings have been updated." });
    } catch (err: any) {
      toast.error("Save Failed", { description: err.message || "An error occurred." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSession = async () => {
    if (
      !confirm(
        "This will disconnect the WhatsApp session. You will need to scan the QR code again. Continue?"
      )
    )
      return;
    setIsResetting(true);
    try {
      const { error } = await supabase
        .from("bot_settings")
        .update({ qr_code: null, session_status: "disconnected" })
        .eq("id", SETTINGS_ID);
      if (error) throw error;
      toast.success("Session Reset", {
        description: "WhatsApp session disconnected. Go to Broadcast to reconnect.",
      });
    } catch (err: any) {
      toast.error("Reset Failed", { description: err.message });
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 max-w-4xl"
    >
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 p-6 sm:p-8 text-white shadow-xl shadow-slate-900/20">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 flex-shrink-0">
            <Settings className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
            <p className="mt-2 text-slate-400 text-sm sm:text-base max-w-xl">
              Configure your bot behavior and application preferences.
            </p>
          </div>
        </div>
      </div>

      {/* General Settings */}
      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Bot Name */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-900">Bot Name</label>
                <p className="text-xs text-slate-500">Displayed in the sidebar and used for identification.</p>
              </div>
            </div>
            <input
              type="text"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              placeholder="e.g. My Support Bot"
            />
          </motion.div>

          {/* Numeric Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900">Reply Delay (sec)</label>
                  <p className="text-xs text-slate-500">Minimum delay to appear human.</p>
                </div>
              </div>
              <input
                type="number"
                value={replyDelay}
                onChange={(e) => setReplyDelay(Number(e.target.value))}
                min={1}
                max={60}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                  <Gauge className="h-4 w-4" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900">Max Messages / Day</label>
                  <p className="text-xs text-slate-500">Safety limit for WhatsApp.</p>
                </div>
              </div>
              <input
                type="number"
                value={maxMessagesPerDay}
                onChange={(e) => setMaxMessagesPerDay(Number(e.target.value))}
                min={10}
                max={1000}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </motion.div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all hover:shadow-indigo-500/30 active:scale-[0.97] disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-rose-200/60 bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-rose-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Danger Zone</h3>
              <p className="text-xs text-slate-500">Irreversible actions. Proceed with caution.</p>
            </div>
          </div>
        </div>
        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-bold text-slate-900">Reset WhatsApp Session</p>
            <p className="text-sm text-slate-500 mt-0.5">
              Disconnect the current session and require a new QR scan.
            </p>
          </div>
          <button
            onClick={handleResetSession}
            disabled={isResetting}
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold shadow-md shadow-rose-600/20 transition-all hover:bg-rose-500 hover:shadow-rose-600/30 active:scale-[0.97] disabled:opacity-60 whitespace-nowrap"
          >
            {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {isResetting ? "Resetting..." : "Reset Session"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

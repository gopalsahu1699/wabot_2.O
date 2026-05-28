"use client";

import { useState, useEffect } from "react";
import { Save, BrainCircuit, Loader2, CheckCircle, Building2, Package, Headphones, Bot } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase-browser";

const TRAINING_ID = "11111111-1111-1111-1111-111111111111";

export default function AITrainingPage() {
  const supabase = createClient();
  const [companyDetails, setCompanyDetails] = useState("");
  const [productDetails, setProductDetails] = useState("");
  const [supportGuidelines, setSupportGuidelines] = useState("");
  const [botBehavior, setBotBehavior] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  useEffect(() => {
    const loadTrainingData = async () => {
      const { data, error } = await supabase
        .from("ai_training")
        .select("*")
        .eq("id", TRAINING_ID)
        .maybeSingle();

      if (!error && data) {
        setCompanyDetails(data.company_details || "");
        setProductDetails(data.product_details || "");
        setSupportGuidelines(data.customer_support_details || "");
        setBotBehavior(data.bot_behavior || "");
        if (data.created_at) setLastSaved(new Date(data.created_at).toLocaleString());
      }
      setIsLoading(false);
    };
    loadTrainingData();
  }, []);

  const handleSave = async () => {
    if (!companyDetails.trim() && !productDetails.trim() && !supportGuidelines.trim() && !botBehavior.trim()) {
      toast.error("Empty Training Data", { description: "Please fill in at least one field before saving." });
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("ai_training")
        .upsert([{
          id: TRAINING_ID,
          company_details: companyDetails,
          product_details: productDetails,
          customer_support_details: supportGuidelines,
          bot_behavior: botBehavior,
        }], { onConflict: "id" });

      if (error) throw error;
      setLastSaved(new Date().toLocaleString());
      toast.success("Training Data Saved", { description: "Your AI training context has been updated." });
    } catch (err: any) {
      toast.error("Save Failed", { description: err.message || "An error occurred." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const fields = [
    { key: "company", label: "Company Details", description: "Name, location, operating hours, and general background.", icon: Building2, placeholder: "e.g. We are TechNova, located in New York, open 9 AM to 5 PM EST...", minH: "min-h-[120px]", value: companyDetails, onChange: setCompanyDetails },
    { key: "product", label: "Product & Services Details", description: "Pricing, features, and available offerings.", icon: Package, placeholder: "e.g. Our main product is the ProPlan which costs $29/mo and includes...", minH: "min-h-[120px]", value: productDetails, onChange: setProductDetails },
    { key: "support", label: "Customer Support Guidelines", description: "Refund policies, shipping times, and FAQs.", icon: Headphones, placeholder: "e.g. We offer a 30-day money-back guarantee. Shipping takes 3-5 business days.", minH: "min-h-[120px]", value: supportGuidelines, onChange: setSupportGuidelines },
    { key: "behavior", label: "Bot Behavior & Tone", description: "How should the bot sound? (e.g. professional, friendly, use emojis).", icon: Bot, placeholder: "e.g. Be extremely polite and enthusiastic. Use emojis occasionally.", minH: "min-h-[100px]", value: botBehavior, onChange: setBotBehavior },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6 max-w-4xl">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-500 to-cyan-500 p-6 sm:p-8 text-white shadow-xl shadow-indigo-500/20">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 flex-shrink-0">
            <BrainCircuit className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">AI Bot Training</h1>
            <p className="mt-2 text-indigo-100 text-sm sm:text-base max-w-xl">
              Provide context and knowledge so your AI bot can answer customer queries intelligently.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
        <div className="p-6 space-y-5">
          {fields.map((field, i) => (
            <motion.div key={field.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <field.icon className="h-4 w-4" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900">{field.label}</label>
                  <p className="text-xs text-slate-500">{field.description}</p>
                </div>
              </div>
              <textarea
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                className={`w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all ${field.minH} leading-relaxed`}
                placeholder={field.placeholder}
              />
            </motion.div>
          ))}

          <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-100">
            <div>
              {lastSaved ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  Last saved: <span className="font-medium text-slate-700">{lastSaved}</span>
                </div>
              ) : (
                <div className="text-sm text-slate-400">Not saved yet</div>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all hover:shadow-indigo-500/30 active:scale-[0.97] disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? "Saving..." : "Save Training Data"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  BrainCircuit,
  Users,
  Settings,
  Menu,
  X,
  Zap,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Broadcast", href: "/broadcast", icon: MessageSquare },
  { name: "Templates", href: "/templates", icon: FileText },
  { name: "AI Training", href: "/ai-training", icon: BrainCircuit },
  { name: "Contacts", href: "/contacts", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const navContent = (
    <nav className="space-y-1 px-3">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-indigo-500/10 text-indigo-400 shadow-sm shadow-indigo-500/5"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200",
                isActive
                  ? "bg-indigo-500/20 text-indigo-400"
                  : "bg-white/5 text-slate-500 group-hover:bg-white/10 group-hover:text-slate-300"
              )}
            >
              <item.icon className="h-4.5 w-4.5" />
            </div>
            {item.name}
            {isActive && (
              <motion.div
                layoutId="activeNav"
                className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );

  const userSection = (
    <div className="space-y-3">
      {user && (
        <div className="mx-3 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
          <p className="text-xs text-slate-500 truncate">{user.email}</p>
        </div>
      )}
      <Link
        href="/settings"
        onClick={() => setMobileOpen(false)}
        className={cn(
          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
          pathname === "/settings"
            ? "bg-indigo-500/10 text-indigo-400"
            : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
        )}
      >
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200",
            pathname === "/settings"
              ? "bg-indigo-500/20 text-indigo-400"
              : "bg-white/5 text-slate-500 group-hover:bg-white/10 group-hover:text-slate-300"
          )}
        >
          <Settings className="h-4.5 w-4.5" />
        </div>
        Settings
      </Link>
      <button
        onClick={handleSignOut}
        className="w-full group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-200"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-slate-500 group-hover:bg-rose-500/20 group-hover:text-rose-400 transition-all duration-200">
          <LogOut className="h-4.5 w-4.5" />
        </div>
        Sign Out
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-900/20 md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-950 md:hidden"
          >
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-6">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">WaBot AI</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4">{navContent}</div>
            <div className="border-t border-white/10 p-4">{userSection}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden md:flex h-screen w-64 flex-col bg-slate-950 text-slate-300">
        <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-lg shadow-indigo-500/25">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white">WaBot AI</span>
        </div>
        <div className="flex-1 overflow-y-auto py-4">{navContent}</div>
        <div className="border-t border-white/10 p-4">{userSection}</div>
      </div>
    </>
  );
}

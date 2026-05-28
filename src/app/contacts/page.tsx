"use client";

import { useState, useRef, useMemo } from "react";
import {
  Plus,
  Upload,
  Trash2,
  Edit,
  Eye,
  Loader2,
  X,
  Save,
  Search,
  Users,
  Phone,
  Tag,
  CalendarDays,
  CheckSquare,
  Square,
  FolderOpen,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase-browser";
import { useEffect } from "react";

interface Contact {
  id: string;
  name: string;
  phone_number: string;
  group_name: string;
  last_used_date: string | null;
  created_at: string;
}

export default function ContactsPage() {
  const supabase = createClient();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeGroup, setActiveGroup] = useState("All");
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [viewContact, setViewContact] = useState<Contact | null>(null);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editGroup, setEditGroup] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchContacts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setContacts(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const groups = useMemo(() => {
    const set = new Set<string>();
    contacts.forEach((c) => {
      if (c.group_name) set.add(c.group_name);
    });
    return ["All", "Ungrouped", ...Array.from(set).sort()];
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone_number.includes(search) ||
        c.group_name?.toLowerCase().includes(search.toLowerCase());
      const matchesGroup =
        activeGroup === "All" ||
        (activeGroup === "Ungrouped" && !c.group_name) ||
        c.group_name === activeGroup;
      return matchesSearch && matchesGroup;
    });
  }, [contacts, search, activeGroup]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map((c) => c.id)));
    }
  };

  const handleAssignGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error("Enter a group name", { description: "Please type a group name." });
      return;
    }
    setIsAssigning(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from("contacts")
      .update({ group_name: newGroupName.trim() })
      .in("id", ids);
    setIsAssigning(false);
    if (error) {
      toast.error("Failed", { description: error.message });
    } else {
      toast.success("Group Assigned", {
        description: `${ids.length} contact(s) added to "${newGroupName.trim()}".`,
      });
      setSelectedIds(new Set());
      setShowGroupModal(false);
      setNewGroupName("");
      fetchContacts();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) {
      toast.error("Delete Failed", { description: error.message });
    } else {
      toast.success("Contact Deleted", { description: `${name} has been removed.` });
      fetchContacts();
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditContact(contact);
    setEditName(contact.name);
    setEditPhone(contact.phone_number);
    setEditGroup(contact.group_name || "");
  };

  const handleSaveEdit = async () => {
    if (!editContact || !editName || !editPhone) {
      toast.error("Validation Error", { description: "Name and phone number are required." });
      return;
    }
    setIsSaving(true);
    const { error } = await supabase
      .from("contacts")
      .update({ name: editName, phone_number: editPhone, group_name: editGroup })
      .eq("id", editContact.id);
    setIsSaving(false);
    if (error) {
      toast.error("Update Failed", { description: error.message });
    } else {
      toast.success("Contact Updated", { description: `${editName} has been updated.` });
      setEditContact(null);
      fetchContacts();
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast.error("Invalid File", { description: "Please upload a CSV file." });
      return;
    }
    setIsUploading(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        toast.error("Empty CSV", { description: "The CSV file has no data rows." });
        setIsUploading(false);
        return;
      }
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const nameIdx = headers.findIndex((h) => h.includes("name"));
      const phoneIdx = headers.findIndex((h) => h.includes("phone") || h.includes("number"));
      const groupIdx = headers.findIndex((h) => h.includes("group"));
      if (nameIdx === -1 || phoneIdx === -1) {
        toast.error("Invalid CSV Format", {
          description: "CSV must have 'name' and 'number' columns.",
        });
        setIsUploading(false);
        return;
      }
      const newContacts = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim());
        const name = cols[nameIdx]?.replace(/"/g, "");
        const phone = cols[phoneIdx]?.replace(/"/g, "");
        const group = groupIdx !== -1 ? cols[groupIdx]?.replace(/"/g, "") : "Imported";
        if (name && phone) newContacts.push({ name, phone_number: phone, group_name: group || "Imported" });
      }
      if (newContacts.length === 0) {
        toast.error("No Valid Rows", { description: "Could not parse any valid contacts." });
        setIsUploading(false);
        return;
      }
      const { error } = await supabase.from("contacts").insert(newContacts);
      setIsUploading(false);
      if (error) {
        toast.error("Upload Failed", { description: error.message });
      } else {
        toast.success("CSV Uploaded", { description: `${newContacts.length} contacts imported.` });
        fetchContacts();
      }
    } catch {
      toast.error("Parse Error", { description: "Failed to read the CSV file." });
      setIsUploading(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddContact = async () => {
    const name = window.prompt("Enter Contact Name:");
    if (!name) return;
    const phone = window.prompt("Enter Phone Number (with country code):");
    if (!phone) return;
    const { error } = await supabase
      .from("contacts")
      .insert([{ name, phone_number: phone, group_name: "Hot Leads" }]);
    if (error) {
      toast.error("Failed to add", { description: error.message });
    } else {
      toast.success("Contact Added", { description: `${name} was added successfully.` });
      fetchContacts();
    }
  };

  const isAllSelected = filteredContacts.length > 0 && selectedIds.size === filteredContacts.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Contacts</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage your target audience and contact lists.</p>
        </div>
        <div className="flex gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all active:scale-[0.97] disabled:opacity-60"
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {isUploading ? "Uploading..." : "Upload CSV"}
          </button>
          <button
            onClick={handleAddContact}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" /> Add Contact
          </button>
        </div>
      </div>

      {/* Search + Group Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl bg-white text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          />
        </div>
        <div className="relative">
          <FolderOpen className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <select
            value={activeGroup}
            onChange={(e) => setActiveGroup(e.target.value)}
            className="pl-11 pr-8 py-3 border border-slate-200 rounded-xl bg-white text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all appearance-none cursor-pointer min-w-[160px]"
          >
            {groups.map((g) => (
              <option key={g} value={g}>
                {g === "All" ? "All Groups" : g}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50 border border-indigo-200/60">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <CheckSquare className="h-4.5 w-4.5" />
                </div>
                <span className="text-sm font-bold text-indigo-900">
                  {selectedIds.size} contact{selectedIds.size > 1 ? "s" : ""} selected
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-white rounded-xl transition-all"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowGroupModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all active:scale-[0.97]"
                >
                  <Layers className="h-4 w-4" /> Assign to Group
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-4 py-4 w-12">
                  <button onClick={toggleSelectAll} className="flex items-center justify-center">
                    {isAllSelected ? (
                      <CheckSquare className="h-4.5 w-4.5 text-indigo-600" />
                    ) : (
                      <Square className="h-4.5 w-4.5 text-slate-300" />
                    )}
                  </button>
                </th>
                <th className="px-3 py-4 w-14 text-center">#</th>
                <th className="px-4 py-4">Name</th>
                <th className="px-4 py-4 hidden sm:table-cell">Phone</th>
                <th className="px-4 py-4 hidden md:table-cell">Group</th>
                <th className="px-4 py-4 hidden lg:table-cell">Last Used</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
                  </td>
                </tr>
              ) : filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 mx-auto mb-3">
                      <Users className="h-8 w-8" />
                    </div>
                    <p className="font-semibold text-slate-500">
                      {search || activeGroup !== "All" ? "No contacts match filters" : "No contacts yet"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {search || activeGroup !== "All"
                        ? "Try adjusting your search or group filter"
                        : 'Click "Add Contact" to get started'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact, i) => {
                  const serialNo = i + 1;
                  const isSelected = selectedIds.has(contact.id);
                  return (
                    <motion.tr
                      key={contact.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className={`transition-colors group ${
                        isSelected ? "bg-indigo-50/60" : "hover:bg-indigo-50/30"
                      }`}
                    >
                      <td className="px-4 py-4">
                        <button
                          onClick={() => toggleSelect(contact.id)}
                          className="flex items-center justify-center"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4.5 w-4.5 text-indigo-600" />
                          ) : (
                            <Square className="h-4.5 w-4.5 text-slate-300 group-hover:text-slate-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          {serialNo}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 text-white text-xs font-bold flex-shrink-0">
                            {contact.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{contact.name}</p>
                            <p className="text-xs text-slate-500 sm:hidden">{contact.phone_number}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600 font-medium hidden sm:table-cell">
                        {contact.phone_number}
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100/60">
                          <Tag className="h-3 w-3" />
                          {contact.group_name || "Ungrouped"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-500 font-medium text-xs hidden lg:table-cell">
                        {contact.last_used_date
                          ? new Date(contact.last_used_date).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setViewContact(contact)}
                            className="p-2 bg-slate-100 rounded-xl hover:bg-blue-100 hover:text-blue-600 transition-all text-slate-500"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(contact)}
                            className="p-2 bg-slate-100 rounded-xl hover:bg-amber-100 hover:text-amber-600 transition-all text-slate-500"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(contact.id, contact.name)}
                            className="p-2 bg-slate-100 rounded-xl hover:bg-rose-100 hover:text-rose-600 transition-all text-slate-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Footer count */}
        {!isLoading && filteredContacts.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 text-xs font-medium text-slate-500">
            Showing {filteredContacts.length} of {contacts.length} contacts
            {activeGroup !== "All" && (
              <span className="ml-2 text-indigo-600 font-bold">in {activeGroup}</span>
            )}
          </div>
        )}
      </div>

      {/* Assign Group Modal */}
      <AnimatePresence>
        {showGroupModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowGroupModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Assign to Group</h3>
                    <p className="text-xs text-slate-500">{selectedIds.size} contact(s) selected</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowGroupModal(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Group Name</label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAssignGroup()}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    placeholder="e.g. Hot Leads"
                    autoFocus
                  />
                </div>
                {groups.filter((g) => g !== "All" && g !== "Ungrouped").length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Existing Groups</p>
                    <div className="flex flex-wrap gap-2">
                      {groups
                        .filter((g) => g !== "All" && g !== "Ungrouped")
                        .map((g) => (
                          <button
                            key={g}
                            onClick={() => setNewGroupName(g)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              newGroupName === g
                                ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
                <button
                  onClick={() => setShowGroupModal(false)}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignGroup}
                  disabled={isAssigning || !newGroupName.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all disabled:opacity-60"
                >
                  {isAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
                  {isAssigning ? "Assigning..." : "Assign Group"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Modal */}
      <AnimatePresence>
        {viewContact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setViewContact(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 bg-gradient-to-br from-indigo-600 to-cyan-500 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-2xl font-black">
                      {viewContact.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-xl">{viewContact.name}</h3>
                      <p className="text-indigo-100 text-sm">{viewContact.phone_number}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewContact(null)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Phone</p>
                    <p className="text-sm font-bold text-slate-800">{viewContact.phone_number}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                  <Tag className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Group</p>
                    <p className="text-sm font-bold text-slate-800">{viewContact.group_name || "Ungrouped"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Last Used</p>
                    <p className="text-sm font-bold text-slate-800">
                      {viewContact.last_used_date
                        ? new Date(viewContact.last_used_date).toLocaleDateString()
                        : "Never"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setViewContact(null)}
                  className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editContact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setEditContact(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-lg">Edit Contact</h3>
                <button
                  onClick={() => setEditContact(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Group</label>
                  <input
                    type="text"
                    value={editGroup}
                    onChange={(e) => setEditGroup(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    placeholder="e.g. Hot Leads"
                  />
                </div>
              </div>
              <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
                <button
                  onClick={() => setEditContact(null)}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all disabled:opacity-60"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

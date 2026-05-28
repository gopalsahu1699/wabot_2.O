"use client";

import { useState, useRef, useEffect } from "react";
import {
  Plus,
  Trash2,
  Edit,
  Image as ImageIcon,
  Save,
  X,
  Loader2,
  FileText,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase-browser";

interface Template {
  id: string;
  name: string;
  content: string;
  image_url: string | null;
  created_at: string;
}

export default function TemplatesPage() {
  const supabase = createClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [templateName, setTemplateName] = useState("");
  const [templateContent, setTemplateContent] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTemplates = async () => {
    setIsFetching(true);
    const { data, error } = await supabase
      .from("templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setTemplates(data);
    setIsFetching(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    return () => { if (mediaPreview) URL.revokeObjectURL(mediaPreview); };
  }, [mediaPreview]);

  const resetForm = () => {
    setTemplateName("");
    setTemplateContent("");
    setEditingTemplate(null);
    setMediaFile(null);
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsEditing(true);
  };

  const handleOpenEdit = (template: Template) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateContent(template.content);
    setMediaPreview(template.image_url || null);
    setMediaFile(null);
    setIsEditing(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error("Invalid File", { description: "Please select an image or video file." });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File Too Large", { description: "File must be under 10MB." });
      return;
    }
    setMediaFile(file);
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!templateName.trim() || !templateContent.trim()) {
      toast.error("Validation Error", { description: "Please fill out both name and content." });
      return;
    }
    setIsLoading(true);
    try {
      let mediaUrl = editingTemplate?.image_url || null;
      if (mediaFile) {
        const fileExt = mediaFile.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("template-images")
          .upload(fileName, mediaFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("template-images").getPublicUrl(fileName);
        mediaUrl = urlData.publicUrl;
      }
      if (editingTemplate) {
        const { error } = await supabase
          .from("templates")
          .update({ name: templateName, content: templateContent, image_url: mediaUrl })
          .eq("id", editingTemplate.id);
        if (error) throw error;
        toast.success("Template Updated", { description: `"${templateName}" has been updated.` });
      } else {
        const { error } = await supabase
          .from("templates")
          .insert([{ name: templateName, content: templateContent, image_url: mediaUrl }]);
        if (error) throw error;
        toast.success("Template Created", { description: `"${templateName}" has been saved.` });
      }
      setIsEditing(false);
      resetForm();
      fetchTemplates();
    } catch (err: any) {
      toast.error("Failed to save", { description: err.message || "An error occurred." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (template: Template) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) return;
    const { error } = await supabase.from("templates").delete().eq("id", template.id);
    if (error) {
      toast.error("Delete Failed", { description: error.message });
    } else {
      toast.success("Template Deleted", { description: `"${template.name}" has been removed.` });
      fetchTemplates();
    }
  };

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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Message Templates
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Create and manage your reusable AI broadcast templates.
          </p>
        </div>
        {!isEditing && (
          <motion.button
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" /> Create Template
          </motion.button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="rounded-2xl border border-slate-200/60 bg-white shadow-lg p-6 sm:p-8 max-w-2xl"
          >
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingTemplate ? "Edit Template" : "Create New Template"}
                </h2>
              </div>
              <button
                onClick={() => {
                  setIsEditing(false);
                  resetForm();
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Template Name
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
                  placeholder="e.g. Welcome Series 1"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-bold text-slate-700">Message Content</label>
                  <span className="text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100/60">
                    Supports {"{{name}}"}
                  </span>
                </div>
                <textarea
                  value={templateContent}
                  onChange={(e) => setTemplateContent(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white min-h-[160px] transition-all leading-relaxed"
                  placeholder="Hi {{name}}, we have a special offer for you!"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Attach Media
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {mediaPreview ? (
                  <div className="relative border border-slate-200 rounded-2xl overflow-hidden">
                    {mediaFile?.type.startsWith("video/") ? (
                      <video src={mediaPreview} className="w-full h-48 object-cover" controls />
                    ) : (
                      <img src={mediaPreview} alt="Media preview" className="w-full h-48 object-cover" />
                    )}
                    <button
                      onClick={() => {
                        setMediaFile(null);
                        setMediaPreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors shadow-lg"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center text-slate-400 hover:bg-indigo-50/30 hover:border-indigo-300 hover:text-indigo-500 cursor-pointer transition-all group"
                  >
                    <div className="p-4 bg-slate-100 rounded-2xl group-hover:bg-indigo-100 transition-colors mb-3">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                    <span className="font-semibold text-sm">Click to upload an image or video</span>
                    <span className="text-xs text-slate-400 mt-1">PNG, JPG, MP4 up to 10MB</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    resetForm();
                  }}
                  className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all active:scale-[0.97]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all hover:shadow-indigo-500/30 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isLoading ? "Saving..." : editingTemplate ? "Update Template" : "Save Template"}
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-5 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          >
            {isFetching ? (
              <div className="col-span-full flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              </div>
            ) : templates.length === 0 ? (
              <div className="col-span-full text-center py-20">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-50 text-slate-300 mx-auto mb-4">
                  <FileText className="h-10 w-10" />
                </div>
                <p className="font-bold text-lg text-slate-700">No templates yet</p>
                <p className="text-sm text-slate-400 mt-1 mb-5">
                  Create your first message template to get started.
                </p>
                <button
                  onClick={handleOpenCreate}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all hover:shadow-indigo-500/30 active:scale-[0.97]"
                >
                  <Plus className="h-4 w-4" /> Create Template
                </button>
              </div>
            ) : (
              templates.map((template, i) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group rounded-2xl border border-slate-200/60 bg-white shadow-sm p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {template.name}
                    </h3>
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEdit(template)}
                        className="p-1.5 hover:bg-indigo-100 hover:text-indigo-600 rounded-lg transition-colors text-slate-400"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(template)}
                        className="p-1.5 hover:bg-rose-100 hover:text-rose-600 rounded-lg transition-colors text-slate-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-sm text-slate-600 line-clamp-3 mb-4 leading-relaxed">
                    {template.content}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-400">
                      {new Date(template.created_at).toLocaleDateString()}
                    </div>
                    {template.image_url && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100/60">
                        <ImageIcon className="h-3 w-3" /> Media
                      </span>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

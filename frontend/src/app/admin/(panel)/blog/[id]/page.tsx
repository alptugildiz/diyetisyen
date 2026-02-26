"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { adminGetPost, adminCreatePost, adminUpdatePost } from "@/lib/api";

interface Props {
  params: Promise<{ id: string }>;
}

export default function BlogEditorPage({ params }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const token = (session as { backendToken?: string })?.backendToken ?? "";

  const [id, setId] = useState<string>("");
  const [isNew, setIsNew] = useState(false);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const editor = useEditor({
    extensions: [StarterKit, Image, Link],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-emerald max-w-none min-h-[300px] focus:outline-none p-4",
      },
    },
  });

  useEffect(() => {
    params.then(({ id: resolvedId }) => {
      setId(resolvedId);
      if (resolvedId === "yeni") {
        setIsNew(true);
        return;
      }
      if (!token) return;
      adminGetPost(resolvedId, token).then((post) => {
        setTitle(post.title);
        setExcerpt(post.excerpt);
        setCoverImage(post.coverImage ?? "");
        setTags(post.tags?.join(", ") ?? "");
        setStatus(post.status);
        editor?.commands.setContent(post.content);
      });
    });
  }, [params, token, editor]);

  const handleSave = async () => {
    setError("");
    if (!title.trim() || !excerpt.trim()) {
      setError("Başlık ve özet zorunludur.");
      return;
    }
    setSaving(true);
    try {
      const data = {
        title,
        excerpt,
        coverImage,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        status,
        content: editor?.getHTML() ?? "",
      };

      if (isNew) {
        await adminCreatePost(data, token);
      } else {
        await adminUpdatePost(id, data, token);
      }
      router.push("/admin/blog");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {isNew ? "Yeni Yazı" : "Yazıyı Düzenle"}
        </h1>
        <div className="flex gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "draft" | "published")}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm"
          >
            <option value="draft">Taslak</option>
            <option value="published">Yayınla</option>
          </select>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors"
          >
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <div className="space-y-5 bg-white border border-gray-200 rounded-2xl p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Başlık
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="Yazı başlığı"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Özet
          </label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={3}
            maxLength={300}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
            placeholder="Kısa özet (maks. 300 karakter)"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kapak Görseli URL
            </label>
            <input
              type="text"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Etiketler (virgülle ayırın)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="sağlık, diyet, tarif"
            />
          </div>
        </div>

        {/* Tiptap Editor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            İçerik
          </label>

          {/* Toolbar */}
          <div className="flex flex-wrap gap-1 border border-gray-300 border-b-0 rounded-t-xl px-3 py-2 bg-gray-50">
            {[
              {
                label: "B",
                action: () => editor?.chain().focus().toggleBold().run(),
                active: editor?.isActive("bold"),
              },
              {
                label: "I",
                action: () => editor?.chain().focus().toggleItalic().run(),
                active: editor?.isActive("italic"),
              },
              {
                label: "H2",
                action: () =>
                  editor?.chain().focus().toggleHeading({ level: 2 }).run(),
                active: editor?.isActive("heading", { level: 2 }),
              },
              {
                label: "H3",
                action: () =>
                  editor?.chain().focus().toggleHeading({ level: 3 }).run(),
                active: editor?.isActive("heading", { level: 3 }),
              },
              {
                label: "• List",
                action: () => editor?.chain().focus().toggleBulletList().run(),
                active: editor?.isActive("bulletList"),
              },
              {
                label: "1. List",
                action: () => editor?.chain().focus().toggleOrderedList().run(),
                active: editor?.isActive("orderedList"),
              },
            ].map((btn) => (
              <button
                key={btn.label}
                type="button"
                onClick={btn.action}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  btn.active
                    ? "bg-emerald-500 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="border border-gray-300 rounded-b-xl overflow-hidden">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
}

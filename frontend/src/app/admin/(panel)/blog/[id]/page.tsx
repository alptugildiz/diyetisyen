"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { adminGetPost, adminCreatePost, adminUpdatePost, adminUploadImage } from "@/lib/api";
import { Button, INPUT_CLS, useToast } from "@/components/admin/ui";

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
  const [slug, setSlug] = useState("");
  const [coverImageAlt, setCoverImageAlt] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { url } = await adminUploadImage(file, token);
      setCoverImage(url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Image, Link],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-green max-w-none min-h-[300px] focus:outline-none p-4",
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
        setCoverImage(post.coverImage || "");
        setCoverImageAlt(post.coverImageAlt ?? "");
        setSlug(post.slug ?? "");
        setMetaTitle(post.metaTitle ?? "");
        setMetaDescription(post.metaDescription ?? "");
        setTags(post.tags?.join(", ") ?? "");
        setStatus(post.status);
        editor?.commands.setContent(post.content);
      });
    });
  }, [params, token, editor]);

  const handleSave = async () => {
    setError("");
    if (!title.trim()) {
      setError("Başlık boş bırakılamaz.");
      return;
    }
    if (!excerpt.trim()) {
      setError("Özet boş bırakılamaz.");
      return;
    }
    if (!editor?.getText().trim()) {
      setError("İçerik boş bırakılamaz.");
      return;
    }
    setSaving(true);
    try {
      const data = {
        title,
        excerpt,
        coverImage,
        coverImageAlt,
        metaTitle,
        metaDescription,
        // Boş bırakılırsa sunucu başlıktan üretir; dolu ise korunur.
        ...(slug.trim() ? { slug: slug.trim() } : {}),
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
      toast.success(
        status === "published" ? "Yazı yayınlandı." : "Taslak kaydedildi.",
      );
      router.push("/admin/blog");
    } catch (err) {
      setError((err as Error).message);
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {isNew ? "Yeni Yazı" : "Yazıyı Düzenle"}
        </h1>
        <div className="flex gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "draft" | "published")}
            className="border border-brand-400 bg-white text-brand-600 font-semibold rounded-md px-3 py-2 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <option value="draft">Taslak</option>
            <option value="published">Yayınla</option>
          </select>
          <Button onClick={handleSave} loading={saving}>
            Kaydet
          </Button>
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
            className={INPUT_CLS}
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
            className={`${INPUT_CLS} resize-none`}
            placeholder="Kısa özet (maks. 300 karakter)"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kapak Görseli
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {coverImage ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImage}
                  alt="Kapak görseli önizleme"
                  className="w-full h-36 object-cover rounded-xl border border-gray-200"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-500 disabled:opacity-50"
                  >
                    {uploading ? "Yükleniyor…" : "Değiştir"}
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => setCoverImage("")}
                    className="text-xs font-semibold text-red-500 hover:text-red-400"
                  >
                    Kaldır
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full border-2 border-dashed border-gray-300 hover:border-brand-400 rounded-xl py-6 text-sm text-gray-500 hover:text-brand-600 transition-colors disabled:opacity-50"
                >
                  {uploading ? "Yükleniyor…" : "Bilgisayardan Yükle"}
                </button>
                <input
                  type="text"
                  value={coverImage ?? ""}
                  onChange={(e) => setCoverImage(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  placeholder="veya URL girin (https://...)"
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Etiketler (virgülle ayırın)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className={INPUT_CLS}
              placeholder="sağlık, diyet, tarif"
            />
          </div>
        </div>

        <details className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
          <summary className="font-semibold text-gray-900 cursor-pointer select-none">
            SEO ayarları
          </summary>
          <p className="text-sm text-gray-500 mt-2 mb-4">
            Boş bırakılırsa yazının başlığı ve özeti kullanılır.
          </p>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Meta başlık
                </label>
                <CharCounter value={metaTitle} ideal={60} max={70} />
              </div>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                maxLength={70}
                className={INPUT_CLS}
                placeholder="Google sonuçlarında görünecek başlık"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Meta açıklama
                </label>
                <CharCounter value={metaDescription} ideal={160} max={200} />
              </div>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                maxLength={200}
                rows={3}
                className={`${INPUT_CLS} resize-none`}
                placeholder="Arama sonucunda başlığın altında görünen açıklama"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kapak görseli alt metni
              </label>
              <input
                type="text"
                value={coverImageAlt}
                onChange={(e) => setCoverImageAlt(e.target.value)}
                maxLength={200}
                className={INPUT_CLS}
                placeholder="Görselde ne var? Görme engelliler ve Google için."
              />
            </div>

            {!isNew && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adres (slug)
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className={INPUT_CLS}
                  placeholder="kilo-verirken-protein"
                />
                <p className="text-xs text-amber-600 mt-1">
                  Yayındaki bir yazının adresini değiştirmek, o adrese verilmiş
                  bağlantıları ve arama sıralamasını kaybettirir.
                </p>
              </div>
            )}
          </div>
        </details>

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
                    ? "bg-brand-500 text-white"
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

/** Meta alanları için karakter sayacı. Google'ın kırpma eşiğini aşınca
 *  sarıya, sert sınıra dayanınca kırmızıya döner. */
function CharCounter({
  value,
  ideal,
  max,
}: {
  value: string;
  ideal: number;
  max: number;
}) {
  const len = value.length;
  const tone =
    len === 0
      ? "text-gray-400"
      : len > max
        ? "text-red-500"
        : len > ideal
          ? "text-amber-600"
          : "text-emerald-600";
  return (
    <span className={`text-xs tabular-nums ${tone}`}>
      {len}/{ideal}
    </span>
  );
}

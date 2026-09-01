"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { adminGetPosts, adminDeletePost } from "@/lib/api";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  useConfirm,
  type Column,
} from "@/components/admin/ui";
import type { Post } from "@/types";

export default function AdminBlogPage() {
  const { data: session } = useSession();
  const token = (session as { backendToken?: string })?.backendToken ?? "";
  const confirm = useConfirm();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      if (!token) return;
      try {
        setPosts(await adminGetPosts(token));
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [token]);

  const handleDelete = async (post: Post) => {
    const ok = await confirm({
      title: "Yazı silinsin mi?",
      message: `"${post.title}" kalıcı olarak silinecek.`,
      confirmLabel: "Sil",
      danger: true,
    });
    if (!ok) return;
    await adminDeletePost(post._id, token);
    setPosts((prev) => prev.filter((p) => p._id !== post._id));
  };

  const columns: Column<Post>[] = [
    {
      key: "title",
      header: "Başlık",
      render: (p) => (
        <Link
          href={`/admin/blog/${p._id}`}
          className="font-medium text-gray-900 hover:text-brand-600"
        >
          {p.title}
        </Link>
      ),
    },
    {
      key: "status",
      header: "Durum",
      render: (p) => (
        <Badge tone={p.status === "published" ? "brand" : "gray"}>
          {p.status === "published" ? "Yayında" : "Taslak"}
        </Badge>
      ),
    },
    {
      key: "date",
      header: "Tarih",
      render: (p) => (
        <span className="text-gray-400">
          {new Date(p.createdAt).toLocaleDateString("tr-TR")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (p) => (
        <div className="flex gap-3 justify-end">
          <Link
            href={`/admin/blog/${p._id}`}
            className="text-brand-600 hover:underline font-medium"
          >
            Düzenle
          </Link>
          <button
            onClick={() => handleDelete(p)}
            className="text-red-400 hover:underline font-medium"
          >
            Sil
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Blog Yazıları</h1>
        <Link href="/admin/blog/yeni">
          <Button>+ Yeni Yazı</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-400">Yükleniyor…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={posts}
          keyOf={(p) => p._id}
          empty={
            <EmptyState
              title="Henüz yazı yok"
              description="İlk blog yazını ekleyerek başla."
              action={
                <Link href="/admin/blog/yeni">
                  <Button>Yazı ekle</Button>
                </Link>
              }
            />
          }
        />
      )}
    </div>
  );
}

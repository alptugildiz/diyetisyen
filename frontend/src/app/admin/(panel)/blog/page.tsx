"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { adminGetPosts, adminDeletePost } from "@/lib/api";
import type { Post } from "@/types";

export default function AdminBlogPage() {
  const { data: session } = useSession();
  const token = (session as { backendToken?: string })?.backendToken ?? "";

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    if (!token) return;
    try {
      const data = await adminGetPosts(token);
      setPosts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" silinsin mi?`)) return;
    await adminDeletePost(id, token);
    setPosts((prev) => prev.filter((p) => p._id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Blog Yazıları</h1>
        <Link
          href="/admin/blog/yeni"
          className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          + Yeni Yazı
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-400">Yükleniyor…</p>
      ) : posts.length === 0 ? (
        <p className="text-gray-400">Henüz yazı yok.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 font-semibold text-gray-600">
                  Başlık
                </th>
                <th className="text-left px-6 py-4 font-semibold text-gray-600">
                  Durum
                </th>
                <th className="text-left px-6 py-4 font-semibold text-gray-600">
                  Tarih
                </th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {posts.map((post) => (
                <tr
                  key={post._id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {post.title}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        post.status === "published"
                          ? "bg-brand-100 text-brand-600"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {post.status === "published" ? "Yayında" : "Taslak"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {new Date(post.createdAt).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-6 py-4 flex gap-3 justify-end">
                    <Link
                      href={`/admin/blog/${post._id}`}
                      className="text-brand-600 hover:underline font-medium"
                    >
                      Düzenle
                    </Link>
                    <button
                      onClick={() => handleDelete(post._id, post.title)}
                      className="text-red-400 hover:underline font-medium"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

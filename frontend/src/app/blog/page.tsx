import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getPosts } from "@/lib/api";

export const revalidate = 60; // ISR — revalidate every 60 seconds

interface Props {
  searchParams: Promise<{ page?: string; tag?: string }>;
}

export default async function BlogPage({ searchParams }: Props) {
  const { page: pageParam, tag } = await searchParams;
  const page = Number(pageParam) || 1;

  let data;
  try {
    data = await getPosts(page, tag);
  } catch {
    data = { posts: [], total: 0, page: 1, totalPages: 1 };
  }

  const { posts, totalPages } = data;

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen bg-white px-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Blog</h1>
          <p className="text-gray-500 mb-12">
            Sağlıklı beslenme, tarifler ve yaşam tüyoları
          </p>

          {posts.length === 0 ? (
            <p className="text-gray-400 text-center py-24">Henüz yazı yok.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => (
                <Link
                  key={post._id}
                  href={`/blog/${post.slug}`}
                  className="group bg-gray-50 rounded-2xl overflow-hidden hover:shadow-md transition-shadow duration-200"
                >
                  {post.coverImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-6">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {post.tags?.map((t) => (
                        <span
                          key={t}
                          className="bg-emerald-100 text-emerald-700 text-xs font-medium px-2 py-0.5 rounded-full"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <h2 className="font-bold text-gray-900 text-lg group-hover:text-emerald-600 transition-colors mb-2 line-clamp-2">
                      {post.title}
                    </h2>
                    <p className="text-gray-500 text-sm line-clamp-3">
                      {post.excerpt}
                    </p>
                    <p className="text-gray-400 text-xs mt-4">
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString(
                            "tr-TR",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            },
                          )
                        : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-12">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/blog?page=${p}${tag ? `&tag=${tag}` : ""}`}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    p === page
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-emerald-50"
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

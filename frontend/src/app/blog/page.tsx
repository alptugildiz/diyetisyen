import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { getPosts, getTags } from "@/lib/api";
import { breadcrumbSchema, buildMetadata } from "@/lib/seo";

export const revalidate = 60; // ISR — revalidate every 60 seconds

interface Props {
  searchParams: Promise<{ page?: string; tag?: string }>;
}

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const { page: pageParam, tag } = await searchParams;
  const page = Number(pageParam) || 1;

  // Kendine referans veren canonical: etiket ve sayfa filtreleri farklı URL'ler
  // olduğu için her biri kendini işaret eder, aksi hâlde Google hepsini
  // /blog'un kopyası sayar.
  const query = [tag ? `tag=${encodeURIComponent(tag)}` : "", page > 1 ? `page=${page}` : ""]
    .filter(Boolean)
    .join("&");
  const path = query ? `/blog?${query}` : "/blog";

  const title = tag
    ? `${tag} Yazıları${page > 1 ? ` — Sayfa ${page}` : ""}`
    : page > 1
      ? `Blog — Sayfa ${page}`
      : "Beslenme ve Diyet Blogu";

  const description = tag
    ? `${tag} konusunda diyetisyen Beyza Şule Kahraman'ın yazıları: bilimsel, uygulanabilir beslenme önerileri ve tarifler.`
    : "Sağlıklı beslenme, kilo yönetimi ve tarifler üzerine diyetisyen Beyza Şule Kahraman'ın yazıları. Bilimsel ve uygulanabilir öneriler.";

  return buildMetadata({ title, description, path });
}

export default async function BlogPage({ searchParams }: Props) {
  const { page: pageParam, tag } = await searchParams;
  const page = Number(pageParam) || 1;

  const [data, tagsResult] = await Promise.allSettled([
    getPosts(page, tag),
    getTags(),
  ]);

  const { posts, totalPages } =
    data.status === "fulfilled" ? data.value : { posts: [], totalPages: 1 };

  const allTags = tagsResult.status === "fulfilled" ? tagsResult.value : [];

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Ana Sayfa", path: "/" },
          { name: "Blog", path: "/blog" },
        ])}
      />
      <Navbar />

      {/* Hero başlık */}
      <section className="grain relative overflow-hidden pt-32 pb-16 px-6 bg-linear-to-b from-brand-bg to-brand-bg">
        <div className="max-w-5xl mx-auto text-center">
          <p className="font-cabin text-brand-600 font-semibold tracking-widest uppercase text-sm mb-4">
            Sağlıklı Yaşam
          </p>
          <h1 className="font-oswald text-5xl md:text-6xl font-bold text-gray-900 mb-4">
            Blog
          </h1>
          <p className="font-hind-vadodara text-brand-600 text-lg max-w-xl mx-auto">
            Sağlıklı beslenme, tarifler ve yaşam tüyoları
          </p>
        </div>
      </section>

      {/* Kartlar */}
      <main className="min-h-screen pb-24 px-6 bg-linear-to-b from-brand-bg to-brand-bg">
        <div className="max-w-5xl mx-auto pt-16">
          {/* Tag Filter Bar */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-12 ">
              <Link
                href="/blog"
                className={`font-cabin text-sm font-semibold px-4 py-2 rounded-full transition-all duration-200  ${
                  !tag
                    ? "bg-brand-500 text-white shadow-md border border-transparent"
                    : "bg-brand-50 text-brand-600 border border-brand-400 hover:bg-brand-400 hover:text-white"
                }`}
              >
                <span className="relative top-0.5">Tümü</span>
              </Link>
              {allTags.map((t) => (
                <Link
                  key={t}
                  href={
                    tag === t ? "/blog" : `/blog?tag=${encodeURIComponent(t)}`
                  }
                  className={`font-cabin text-sm font-semibold px-4 py-2 rounded-full transition-all duration-200 ${
                    tag === t
                      ? "bg-brand-500 text-white shadow-md border border-transparent"
                      : "bg-brand-50 text-brand-600 border border-brand-400 hover:bg-brand-400 hover:text-white"
                  }`}
                >
                  <span className="relative top-0.5">{t}</span>
                </Link>
              ))}
            </div>
          )}
          {posts.length === 0 ? (
            <p className="font-hind-vadodara text-brand-600 text-center py-24 text-lg">
              Henüz yazı yok.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post, i) => (
                <Link
                  key={post._id}
                  href={`/blog/${post.slug}`}
                  className="group bg-brand-50 rounded-2xl overflow-hidden shadow-lg hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 flex flex-col"
                >
                  {post.coverImage ? (
                    <div className="relative w-full h-48">
                      <Image
                        src={post.coverImage}
                        alt={post.coverImageAlt || post.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        priority={i === 0}
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-brand-100 flex items-center justify-center">
                      <span className="text-5xl">🥗</span>
                    </div>
                  )}
                  <div className="p-6 flex flex-col flex-1 border-x border-b border-brand-200 rounded-b-2xl">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {post.tags?.map((t) => (
                        <span
                          key={t}
                          className="bg-brand-500 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <h2 className="font-oswald font-bold text-brand-600 text-xl group-hover:text-brand-400 transition-colors mb-2 line-clamp-2 leading-tight">
                      {post.title}
                    </h2>
                    <p className="font-hind-vadodara text-brand-600/80 text-sm line-clamp-3 flex-1">
                      {post.excerpt}
                    </p>
                    <p className="font-cabin text-brand-600/60 text-xs mt-4 font-medium">
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
            <div className="flex justify-center gap-2 mt-16">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/blog?page=${p}${tag ? `&tag=${tag}` : ""}`}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
                    p === page
                      ? "bg-brand-500 text-white shadow-lg"
                      : "bg-brand-50 text-brand-600 border border-brand-400 hover:bg-brand-400 hover:text-white"
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

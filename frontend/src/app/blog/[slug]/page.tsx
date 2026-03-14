import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getPost, getPosts, getRelatedPosts } from "@/lib/api";

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const data = await getPosts(1);
    return data.posts.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;

  let post;
  try {
    post = await getPost(slug);
  } catch {
    notFound();
  }

  const related = await getRelatedPosts(slug).catch(() => []);

  return (
    <>
      <Navbar />

      {/* Cover image hero veya düz başlık alanı */}
      {post.coverImage ? (
        <div className="relative w-full h-72 md:h-96 mt-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-brand-bg/80 to-transparent" />
        </div>
      ) : (
        <div className="grain relative overflow-hidden pt-32 pb-10 px-6 bg-linear-to-b from-brand-bg to-brand-50" />
      )}

      <main className="bg-linear-to-b from-brand-bg to-brand-50 px-6 pb-24">
        <article className="max-w-3xl mx-auto pt-10">

          {/* Geri dön */}
          <Link
            href="/blog"
            className="font-cabin inline-flex items-center gap-2 text-brand-600 text-sm font-semibold mb-8 hover:text-brand-500 transition-colors"
          >
            ← Tüm Yazılar
          </Link>

          {/* Etiketler */}
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {post.tags?.map((t) => (
              <span
                key={t}
                className="bg-brand-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full"
              >
                {t}
              </span>
            ))}
          </div>

          {/* Başlık */}
          <h1 className="font-oswald text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight text-center">
            {post.title}
          </h1>

          {/* Tarih */}
          {post.publishedAt && (
            <p className="font-cabin text-brand-600/60 text-sm mb-10 font-medium text-center">
              {new Date(post.publishedAt).toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}

          {/* Ayraç */}
          <div className="w-16 h-1 rounded-full bg-brand-400 mb-10 mx-auto" />

          {/* İçerik */}
          <div
            className="prose prose-lg max-w-none
              prose-headings:font-oswald prose-headings:text-brand-600
              prose-p:font-hind-vadodara prose-p:text-brand-600/90 prose-p:leading-relaxed
              prose-a:text-brand-500 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-brand-600
              prose-li:text-brand-600/90 prose-li:font-hind-vadodara
              prose-blockquote:border-brand-400 prose-blockquote:text-brand-600/70"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Alt ayraç */}
          <div className="mt-16 pt-8 border-t border-brand-200">
            <Link
              href="/blog"
              className="font-cabin inline-flex items-center gap-2 text-brand-600 text-sm font-semibold hover:text-brand-500 transition-colors"
            >
              ← Tüm Yazılara Dön
            </Link>
          </div>
        </article>
      </main>

      {/* İlgili Yazılar */}
      {related.length > 0 && (
        <section className="px-6 pb-24 bg-linear-to-b from-brand-50 to-brand-bg">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-10">
              <div className="h-px flex-1 bg-brand-200" />
              <p className="font-oswald text-2xl font-bold text-brand-600">Bunları da sevebilirsiniz</p>
              <div className="h-px flex-1 bg-brand-200" />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {related.map((r) => (
                <Link
                  key={r._id}
                  href={`/blog/${r.slug}`}
                  className="group bg-brand-100 rounded-2xl overflow-hidden shadow-lg hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 flex flex-col"
                >
                  {r.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.coverImage} alt={r.title} className="w-full h-44 object-cover" />
                  ) : (
                    <div className="w-full h-44 bg-brand-200 flex items-center justify-center">
                      <span className="text-5xl">🥗</span>
                    </div>
                  )}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {r.tags?.map((t) => (
                        <span key={t} className="bg-brand-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                          {t}
                        </span>
                      ))}
                    </div>
                    <h3 className="font-oswald font-bold text-brand-600 text-lg group-hover:text-brand-400 transition-colors line-clamp-2 leading-tight mb-1">
                      {r.title}
                    </h3>
                    <p className="font-hind-vadodara text-brand-600/70 text-sm line-clamp-2 flex-1">
                      {r.excerpt}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </>
  );
}

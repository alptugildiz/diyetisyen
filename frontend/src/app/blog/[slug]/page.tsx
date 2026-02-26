import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getPost, getPosts } from "@/lib/api";

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

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen bg-white px-6">
        <article className="max-w-3xl mx-auto">
          {post.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-72 object-cover rounded-2xl mb-8"
            />
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags?.map((t) => (
              <span
                key={t}
                className="bg-emerald-100 text-emerald-700 text-xs font-medium px-2.5 py-1 rounded-full"
              >
                {t}
              </span>
            ))}
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
            {post.title}
          </h1>

          {post.publishedAt && (
            <p className="text-gray-400 text-sm mb-8">
              {new Date(post.publishedAt).toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}

          <div
            className="prose prose-emerald max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>
      </main>
      <Footer />
    </>
  );
}

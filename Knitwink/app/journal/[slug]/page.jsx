
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { getPost, getPosts } from '@/lib/api/blog';
import { SITE_NAME } from '@/lib/constants';





export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    const post = await getPost(slug);
    return {
      title: post.title,
      description: post.excerpt,
      openGraph: {
        title: `${post.title} | ${SITE_NAME}`,
        description: post.excerpt,
        images: [{ url: post.coverImage }]
      }
    };
  } catch {
    return { title: 'Journal' };
  }
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;

  let post;
  try {
    post = await getPost(slug);
  } catch {
    notFound();
  }

  const related = await getPosts().catch(() => []);
  const relatedPosts = related.filter((p) => p.slug !== slug).slice(0, 3);

  return (
    <>
      {/* Cover image */}
      <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-gray-100">
        <div className="relative aspect-video w-full">
          <Image src={post.coverImage} alt={post.title} fill className="object-cover" priority />
        </div>
      </section>

      {/* Title + body */}
      <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-white px-6 py-12 md:px-10 lg:px-16">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium uppercase tracking-widest text-sage">
            {post.category}
          </span>
          <h1 className="mt-4 font-display text-4xl font-normal text-brand-black lg:text-5xl">
            {post.title}
          </h1>
          <p className="mt-4 text-sm text-gray-400">
            {format(new Date(post.publishedAt), 'd MMM yyyy')} · {post.readTime} min read
          </p>
        </div>

        <div className="mx-auto max-w-2xl pb-4 pt-12">
          <div className="prose prose-gray max-w-none text-gray-800">
            {post.body ?
            <div dangerouslySetInnerHTML={{ __html: post.body }} /> :

            <p className="text-base leading-relaxed text-gray-600">{post.excerpt}</p>
            }
          </div>

          {/* Author */}
          <div className="mt-12 flex items-center gap-4 border-t border-gray-200 pt-8">
            {post.author.avatar &&
            <div className="relative h-12 w-12 overflow-hidden rounded-full bg-gray-100">
                <Image src={post.author.avatar} alt={post.author.name} fill className="object-cover" />
              </div>
            }
            <div>
              <p className="text-sm font-medium text-brand-black">{post.author.name}</p>
              <p className="text-xs text-gray-600">{format(new Date(post.publishedAt), 'd MMM yyyy')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Related posts */}
      {relatedPosts.length > 0 &&
      <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-off-white px-6 py-16 md:px-10 lg:px-16">
          <div className="mx-auto max-w-site">
            <p className="mb-8 text-xs font-medium uppercase tracking-widest text-gray-600">
              More from the Journal
            </p>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {relatedPosts.map((p) =>
            <Link
              key={p.id}
              href={`/journal/${p.slug}`}
              className="group flex flex-col gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2">
              
                  <div className="relative aspect-video overflow-hidden rounded-xl bg-gray-100">
                    <Image
                  src={p.coverImage}
                  alt={p.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-150 group-hover:scale-[1.02]" />
                
                  </div>
                  <p className="text-sm font-medium text-brand-black transition-colors duration-150 group-hover:text-sage">
                    {p.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    {format(new Date(p.publishedAt), 'd MMM yyyy')} · {p.readTime} min read
                  </p>
                </Link>
            )}
            </div>
          </div>
        </section>
      }
    </>);

}
export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
      <p className="text-gray-500 mb-8">
        Hoş geldiniz. Sol menüden yönetmek istediğiniz bölümü seçin.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          {
            title: "Blog Yazıları",
            desc: "Yeni yazı ekle, düzenle veya sil.",
            href: "/admin/blog",
            emoji: "📝",
          },
          {
            title: "SSS",
            desc: "Sıkça sorulan soruları yönet.",
            href: "/admin/sss",
            emoji: "❓",
          },
        ].map((card) => (
          <a
            key={card.href}
            href={card.href}
            className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-3">{card.emoji}</div>
            <h2 className="font-bold text-gray-900 mb-1">{card.title}</h2>
            <p className="text-gray-500 text-sm">{card.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

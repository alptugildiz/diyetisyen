import Link from "next/link";

export default function Footer() {
  return (
    <footer id="iletisim" className=" bg-brand-600 text-gray-300 py-16 px-6">
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-12">
        {/* Brand */}
        <div>
          <p className="text-white font-bold text-xl mb-3">Diyetisyen</p>
          <p className="text-sm leading-relaxed text-gray-400">
            Sağlıklı beslenme ve kişiye özel diyet programları ile hayatınızı
            dönüştürün.
          </p>
        </div>

        {/* Links */}
        <div>
          <p className="text-white font-semibold mb-4">Hızlı Bağlantılar</p>
          <ul className="space-y-2 text-sm">
            {[
              { href: "/blog", label: "Blog" },
              { href: "/sss", label: "SSS" },
              { href: "/#hizmetler", label: "Hizmetler" },
              { href: "/#hakkimda", label: "Hakkımda" },
            ].map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="hover:text-brand-400 transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <p className="text-white font-semibold mb-4">İletişim</p>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>📧 info@diyetisyen.com</li>
            <li>📞 +90 555 123 45 67</li>
            <li>📍 İstanbul, Türkiye</li>
          </ul>
          <div className="flex gap-4 mt-6">
            <a
              href="#"
              className="hover:text-brand-400 transition-colors"
              aria-label="Instagram"
            >
              Instagram
            </a>
            <a
              href="#"
              className="hover:text-brand-400 transition-colors"
              aria-label="YouTube"
            >
              YouTube
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto border-t border-white mt-12 pt-8 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Diyetisyen. Tüm hakları saklıdır.
      </div>
    </footer>
  );
}

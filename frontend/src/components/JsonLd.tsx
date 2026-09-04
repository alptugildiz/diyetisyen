/**
 * JSON-LD yapısal veri basar.
 *
 * `<` karakteri `<` olarak kaçırılıyor: içerik veritabanından geliyor ve
 * kaçırılmazsa gövdedeki bir `</script>` dizisi script etiketini erkenden
 * kapatarak XSS'e yol açar.
 */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

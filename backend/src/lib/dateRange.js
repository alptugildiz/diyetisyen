// Tarih alanlarının tek doğruluk kaynağı. DB'deki tüm tarihler UTC gece
// yarısına normalize edilir; aralık filtresi `to` gününün tamamını kapsar.

function toUtcMidnight(input) {
  const d = input instanceof Date ? input : new Date(input);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

// { from, to } sorgu parametrelerinden Mongo filtresi üretir.
// `to` gün sonuna taşınır, aksi halde o günün kayıtları aralığın dışında kalır.
function buildDateFilter(query, field = "date") {
  const filter = {};
  if (!query.from && !query.to) return filter;

  filter[field] = {};
  if (query.from) filter[field].$gte = toUtcMidnight(query.from);
  if (query.to) {
    const end = toUtcMidnight(query.to);
    end.setUTCHours(23, 59, 59, 999);
    filter[field].$lte = end;
  }
  return filter;
}

module.exports = { toUtcMidnight, buildDateFilter };

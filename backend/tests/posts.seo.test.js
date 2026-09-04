const request = require("supertest");
const app = require("../src/app");
const Post = require("../src/models/Post");
const { connect, clearDatabase, closeDatabase } = require("./testDb");
const { makeToken } = require("./authHelper");

let token;

beforeAll(async () => {
  await connect();
  token = makeToken();
});
afterEach(async () => {
  await clearDatabase();
});
afterAll(async () => {
  await closeDatabase();
});

const base = {
  title: "Kilo verirken protein",
  slug: "kilo-verirken-protein",
  excerpt: "Kısa özet",
  content: "<p>İçerik</p>",
};

describe("blog SEO alanları", () => {
  it("SEO alanlarını kaydeder ve geri döner", async () => {
    const res = await request(app)
      .post("/api/admin/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ...base,
        metaTitle: "Kilo Verirken Protein | Dyt. Beyza Şule",
        metaDescription: "Kilo verirken protein ihtiyacı nasıl hesaplanır?",
        coverImageAlt: "Tabakta ızgara tavuk ve sebze",
      });

    expect(res.status).toBe(201);
    expect(res.body.metaTitle).toBe("Kilo Verirken Protein | Dyt. Beyza Şule");
    expect(res.body.metaDescription).toBe(
      "Kilo verirken protein ihtiyacı nasıl hesaplanır?",
    );
    expect(res.body.coverImageAlt).toBe("Tabakta ızgara tavuk ve sebze");
  });

  it("SEO alanları verilmezse boş string olur", async () => {
    const res = await request(app)
      .post("/api/admin/posts")
      .set("Authorization", `Bearer ${token}`)
      .send(base);

    expect(res.status).toBe(201);
    expect(res.body.metaTitle).toBe("");
    expect(res.body.metaDescription).toBe("");
    expect(res.body.coverImageAlt).toBe("");
  });

  it("güncellemede SEO alanları değişir, diğerleri korunur", async () => {
    const created = await Post.create(base);
    const res = await request(app)
      .put(`/api/admin/posts/${created._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ metaTitle: "Yeni başlık" });

    expect(res.status).toBe(200);
    expect(res.body.metaTitle).toBe("Yeni başlık");
    expect(res.body.title).toBe(base.title);
  });

  it("metaTitle 70 karakteri aşarsa 400 döner", async () => {
    const res = await request(app)
      .post("/api/admin/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...base, metaTitle: "x".repeat(71) });

    expect(res.status).toBe(400);
  });

  it("metaDescription 200 karakteri aşarsa 400 döner", async () => {
    const res = await request(app)
      .post("/api/admin/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...base, metaDescription: "x".repeat(201) });

    expect(res.status).toBe(400);
  });

  it("slug elle verilebilir", async () => {
    const res = await request(app)
      .post("/api/admin/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...base, slug: "elle-yazilmis-slug" });

    expect(res.status).toBe(201);
    expect(res.body.slug).toBe("elle-yazilmis-slug");
  });

  it("slug verilmezse başlıktan üretilir", async () => {
    const res = await request(app)
      .post("/api/admin/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...base, slug: undefined });

    expect(res.status).toBe(201);
    expect(res.body.slug).toBe("kilo-verirken-protein");
  });

  it("verilen slug güvenli biçime çevrilir", async () => {
    const res = await request(app)
      .post("/api/admin/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...base, slug: "Şeker Tüketimi & Sağlık" });

    expect(res.status).toBe(201);
    expect(res.body.slug).toBe("seker-tuketimi-and-saglik");
  });

  it("başlık değişince yayındaki yazının slug'ı korunur", async () => {
    const created = await Post.create({ ...base, status: "published" });
    const res = await request(app)
      .put(`/api/admin/posts/${created._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Bambaşka bir başlık" });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Bambaşka bir başlık");
    expect(res.body.slug).toBe(base.slug);
  });

  it("slug açıkça gönderilirse güncellenir", async () => {
    const created = await Post.create(base);
    const res = await request(app)
      .put(`/api/admin/posts/${created._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ slug: "yeni-slug" });

    expect(res.status).toBe(200);
    expect(res.body.slug).toBe("yeni-slug");
  });

  it("public uçta da SEO alanları görünür", async () => {
    await Post.create({
      ...base,
      status: "published",
      metaTitle: "Public meta başlık",
      coverImageAlt: "Kapak açıklaması",
    });

    const res = await request(app).get(`/api/posts/${base.slug}`);

    expect(res.status).toBe(200);
    expect(res.body.metaTitle).toBe("Public meta başlık");
    expect(res.body.coverImageAlt).toBe("Kapak açıklaması");
  });
});

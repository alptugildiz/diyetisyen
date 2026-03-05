import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

// auth.ts always runs server-side
// Docker: BACKEND_URL=http://backend:5000 | Manuel: http://localhost:5000
const API_URL = process.env.BACKEND_URL ?? "http://localhost:5000";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Parola", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const res = await fetch(`${API_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!res.ok) return null;

          const data = await res.json();
          return {
            id: data.admin.id,
            email: data.admin.email,
            name: data.admin.name,
            // store backend JWT in user so it's accessible in session
            backendToken: data.token,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.backendToken = (user as { backendToken?: string }).backendToken;
      }
      return token;
    },
    async session({ session, token }) {
      (session as { backendToken?: string }).backendToken =
        token.backendToken as string;
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
  },
  session: { strategy: "jwt" },
});

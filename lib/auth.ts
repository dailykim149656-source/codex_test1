import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";

const hasGoogleAuth = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

const isSecureContext =
  process.env.NEXTAUTH_URL?.startsWith("https://") ||
  process.env.NODE_ENV === "production";

export const authOptions: NextAuthOptions = {
  providers: hasGoogleAuth
    ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID ?? "",
          clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        }),
      ]
    : [
        CredentialsProvider({
          name: "Setup Required",
          credentials: {},
          async authorize() {
            return null;
          },
        }),
      ],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
    updateAge: 60 * 30,
  },
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: Boolean(isSecureContext),
  cookies: {
    sessionToken: {
      name: isSecureContext
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: Boolean(isSecureContext),
      },
    },
    csrfToken: {
      name: isSecureContext ? "__Host-next-auth.csrf-token" : "next-auth.csrf-token",
      options: {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        secure: Boolean(isSecureContext),
      },
    },
  },
  pages: {
    signIn: "/",
  },
};

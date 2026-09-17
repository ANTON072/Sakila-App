import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authenticateStaff } from "@/feature/staff";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: {},
        password: {},
      },
      authorize: (credentials) => authenticateStaff(credentials),
    }),
  ],
});

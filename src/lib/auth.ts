import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "@/db";
import { staff } from "@/db/schema";

const ERROR_MESSAGE = "Invalid credentials";

const credentialSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: {},
        password: {},
      },
      authorize: async (credentials) => {
        const parsed = credentialSchema.safeParse(credentials);
        if (!parsed.success) throw new Error(ERROR_MESSAGE);

        const { username, password } = parsed.data;

        const [staffMember] = await db
          .select()
          .from(staff)
          .where(eq(staff.username, username));

        if (!staffMember || !staffMember.active) {
          throw new Error(ERROR_MESSAGE);
        }

        const staffPassword = staffMember.password;
        if (!staffPassword) {
          throw new Error(ERROR_MESSAGE);
        }

        const isValidPassword = await bcrypt.compare(password, staffPassword);
        if (!isValidPassword) {
          throw new Error(ERROR_MESSAGE);
        }

        return {
          id: String(staffMember.staffId),
          firstName: staffMember.firstName,
          lastName: staffMember.lastName,
          email: staffMember.email,
          picture: staffMember.picture,
        };
      },
    }),
  ],
});

"use server";

import { parseWithZod } from "@conform-to/zod/v4";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { loginSchema } from "./schema";

export async function login(_: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: loginSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }

  try {
    await signIn("credentials", {
      ...submission.value,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return submission.reply({ formErrors: ["Invalid username or password"] });
    }
    throw error;
  }
}

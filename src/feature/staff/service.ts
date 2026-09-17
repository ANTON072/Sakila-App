import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, type Executer } from "@/db";
import { staff } from "@/db/schema";
import { loginSchema } from "@/feature/login";

export async function authenticateStaff(
  credentials: unknown,
  executer: Executer = db,
) {
  const ERROR_MESSAGE = "Invalid credentials";

  const parsed = loginSchema.safeParse(credentials);
  if (!parsed.success) throw new Error(ERROR_MESSAGE);

  const { username, password } = parsed.data;

  const [staffMember] = await executer
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
}

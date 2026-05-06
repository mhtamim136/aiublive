import bcrypt from "bcryptjs";

// Cost 10 is the OWASP-recommended floor and ~4× faster than cost 12 with
// the pure-JS bcryptjs library (~120 ms vs ~600 ms on a typical serverless
// CPU). The previous cost was the dominant source of login/signup latency.
const BCRYPT_COST = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

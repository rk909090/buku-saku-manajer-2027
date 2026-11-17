import "server-only";
import type { RowDataPacket } from "mysql2/promise";
import { getPool } from "@/lib/db";

export async function listAdmins() {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT id, email, name, role, active, last_login_at, created_at FROM admin_users ORDER BY id"
  );
  return rows;
}

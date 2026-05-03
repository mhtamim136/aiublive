import { Client } from "pg";

export async function GET() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    const result = await client.query("SELECT COUNT(*) FROM users");

    await client.end();

    return Response.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    return Response.json({ success: false, error: err.message });
  }
}
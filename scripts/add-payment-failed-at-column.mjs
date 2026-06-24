import "dotenv/config";
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured");
}

const sql = postgres(process.env.DATABASE_URL, {
  ssl: "require",
  max: 1,
});

try {
  const result = await sql.begin(async (transaction) => {
    const [{ before_count: beforeCount }] = await transaction`
      select count(*)::bigint as before_count
      from users
    `;

    await transaction`
      alter table users
      add column if not exists payment_failed_at timestamp
    `;

    const [{ after_count: afterCount }] = await transaction`
      select count(*)::bigint as after_count
      from users
    `;

    if (beforeCount !== afterCount) {
      throw new Error(
        `Safety check failed: users row count changed from ${beforeCount} to ${afterCount}`
      );
    }

    return { beforeCount, afterCount };
  });

  console.log(
    `payment_failed_at is ready. Users preserved: ${result.afterCount}`
  );
} finally {
  await sql.end();
}

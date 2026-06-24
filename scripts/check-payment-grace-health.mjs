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
  const [summary] = await sql`
    select
      count(*) filter (where subscription_status = 'active')::int as active,
      count(*) filter (where subscription_status = 'past_due')::int as past_due,
      count(*) filter (
        where subscription_status = 'past_due'
          and payment_failed_at > now() - interval '10 days'
      )::int as in_grace,
      count(*) filter (
        where subscription_status = 'past_due'
          and payment_failed_at <= now() - interval '10 days'
      )::int as overdue_for_inactivation,
      count(*) filter (
        where subscription_status = 'past_due'
          and payment_failed_at is null
      )::int as missing_failure_time,
      count(*) filter (where subscription_status = 'inactive')::int as inactive,
      count(*) filter (where subscription_status = 'free_access')::int as free_access
    from users
  `;

  const overdue = await sql`
    select
      id,
      payment_failed_at,
      extract(day from now() - payment_failed_at)::int as days_past_due
    from users
    where subscription_status = 'past_due'
      and payment_failed_at <= now() - interval '10 days'
    order by payment_failed_at asc
  `;

  console.table([summary]);

  if (overdue.length > 0) {
    console.warn("Users still past_due after 10 days:");
    console.table(overdue);
  } else {
    console.log("Payment grace health check passed: no overdue past_due users.");
  }

  if (summary.missing_failure_time > 0) {
    console.warn(
      `${summary.missing_failure_time} past_due user(s) have no payment_failed_at timestamp.`
    );
    process.exitCode = 1;
  }

  if (summary.overdue_for_inactivation > 0) {
    process.exitCode = 1;
  }
} finally {
  await sql.end();
}

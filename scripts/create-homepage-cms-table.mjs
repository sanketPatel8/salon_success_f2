import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, {
  ssl: "require",
});

try {
  await sql`
    create table if not exists homepage_cms_content (
      id serial primary key,
      content jsonb not null,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    )
  `;

  console.log("homepage_cms_content ready");
} finally {
  await sql.end();
}

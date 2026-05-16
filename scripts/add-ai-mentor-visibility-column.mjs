import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, {
  ssl: "require",
});

try {
  await sql`
    alter table ai_mentor_settings
    add column if not exists visible_to_members boolean not null default true
  `;

  console.log("ai_mentor_settings.visible_to_members ready");
} finally {
  await sql.end();
}

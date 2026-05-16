const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
const base = "http://127.0.0.1:8080";

const currentResponse = await fetch(`${base}/api/admin/ai/settings`, {
  headers: { "x-admin-password": adminPassword },
});

if (!currentResponse.ok) {
  throw new Error(`Failed to load settings: ${currentResponse.status}`);
}

const current = await currentResponse.json();

let instructions = current.settings.instructions;

instructions = instructions.replace(
  '- Always engage the user with a micro-prompt ("Want an example?" / "Prefer a checklist version?").',
  '- Always engage the user with a micro-prompt ("Want an example?" / "Prefer a checklist version?").\n- If the user asks for something unrelated to salon, beauty, coaching, visibility, leadership, marketing, systems, mindset, pricing, profit, team growth, or the product experience, reply exactly: "This AI is specifically designed for this product."',
);

instructions = instructions.replace(
  `- If a query is outside coverage: deliver 3-5 quick wins or next steps in Katie's voice; offer 1 engagement choice (example, simplification, tailored schedule); point to the closest related topic in Katie's material; mark assumptions in one line: "Assumption: ... (tell me if wrong)."`,
  `- If a query is outside the product scope, reply exactly: "This AI is specifically designed for this product."\n- If a query is within scope but outside exact coverage: deliver 3-5 quick wins or next steps in Katie's voice; offer 1 engagement choice (example, simplification, tailored schedule); point to the closest related topic in Katie's material; mark assumptions in one line: "Assumption: ... (tell me if wrong)."`,
);

instructions = instructions.replace(
  '- Never tell users where content is stored or that you are "reading files."',
  '- Never tell users where content is stored or that you are "reading files."\n- Do not answer general news, geopolitics, entertainment, sport, coding, or unrelated open-domain questions. For those, reply exactly: "This AI is specifically designed for this product."',
);

const payload = {
  ...current.settings,
  instructions,
};

delete payload.id;
delete payload.createdAt;
delete payload.updatedAt;
delete payload.lastKnowledgeSyncAt;
delete payload.lastKnowledgeSyncStatus;
delete payload.lastKnowledgeSyncMessage;

const saveResponse = await fetch(`${base}/api/admin/ai/settings`, {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    "x-admin-password": adminPassword,
  },
  body: JSON.stringify(payload),
});

if (!saveResponse.ok) {
  const body = await saveResponse.text();
  throw new Error(`Failed to save settings: ${saveResponse.status} ${body}`);
}

console.log("AI mentor instructions updated");

// Cloudflare Worker: хранит прогресс повторения карточек Vocabulario
// (какая карточка на какой "коробке" Лейтнера и когда её повторять снова).
// Сами слова/переводы/примеры тут не хранятся — только id + расписание.
//
// Хранилище: KV namespace VOCAB_PROGRESS, один ключ "state" со всем JSON.
// Авторизация: общий секрет AUTH_TOKEN (Worker secret), передаётся с сайта
// заголовком Authorization: Bearer <token>.

const ALLOWED_ORIGIN = "https://victoriaminaeva.github.io";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders();

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/progress") {
      return new Response("Not found", { status: 404, headers: cors });
    }

    const auth = request.headers.get("Authorization") || "";
    if (auth !== `Bearer ${env.AUTH_TOKEN}`) {
      return new Response("Unauthorized", { status: 401, headers: cors });
    }

    if (request.method === "GET") {
      const raw = await env.VOCAB_PROGRESS.get("state");
      return new Response(raw || "{}", {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST") {
      let update;
      try {
        update = await request.json();
      } catch {
        return new Response("Bad JSON", { status: 400, headers: cors });
      }
      if (!update || typeof update.id !== "string") {
        return new Response("Missing id", { status: 400, headers: cors });
      }

      const raw = await env.VOCAB_PROGRESS.get("state");
      const state = raw ? JSON.parse(raw) : {};

      state[update.id] = {
        box: Number.isInteger(update.box) ? update.box : 0,
        due: typeof update.due === "string" ? update.due : new Date().toISOString(),
        learned: !!update.learned,
        lastReview: new Date().toISOString(),
      };

      await env.VOCAB_PROGRESS.put("state", JSON.stringify(state));
      return new Response(JSON.stringify(state), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405, headers: cors });
  },
};

# Vocabulario — backend прогресса (Cloudflare Worker)

Хранит только расписание повторения карточек (id → box, дата следующего повторения).
Сами слова лежат в `../data.json`.

## Деплой (один раз)

Выполнять из этой папки (`spanish-lessons/vocabulario/worker`):

```bash
npx wrangler login
```
Откроется браузер — авторизуйте wrangler в своём Cloudflare-аккаунте (бесплатного тарифа достаточно).

```bash
npx wrangler kv namespace create VOCAB_PROGRESS
```
Команда выведет `id = "..."` — вставьте это значение в `wrangler.toml` вместо
`REPLACE_WITH_KV_NAMESPACE_ID`.

```bash
npx wrangler secret put AUTH_TOKEN
```
Придумайте и вставьте случайную длинную строку (например, `openssl rand -hex 32`) —
это будет секрет, которым сайт подтверждает право писать в ваш прогресс.

```bash
npx wrangler deploy
```
В выводе будет URL вида `https://spanish-vocabulario-progress.<ваш-субдомен>.workers.dev`.

## После деплоя

Откройте `../index.html` и в начале `<script>` замените:

```js
const WORKER_URL = "https://REPLACE-ME.workers.dev/progress";
const AUTH_TOKEN = "REPLACE_ME";
```

на реальный URL (с `/progress` на конце) и тот же токен, что задали в `wrangler secret put AUTH_TOKEN`.

## Важно про безопасность

Страница `vocabulario/index.html` публична (обычный GitHub Pages), и `AUTH_TOKEN` лежит прямо в её
исходном коде — это не настоящий секрет, а просто фильтр от случайных чужих запросов к Worker'у
(CORS ограничивает только браузерные запросы с других сайтов, а не прямые запросы вроде curl).
Для личного списка слов это нормальный компромисс: цена утечки токена — кто-то теоретически может
испортить вам расписание повторения, не более того. Не используйте эту же схему для чего-то ценного.

## Обновление Worker'а

Если поменяете `worker.js` — просто `npx wrangler deploy` заново из этой папки, `wrangler.toml` и
секрет/namespace останутся как есть.

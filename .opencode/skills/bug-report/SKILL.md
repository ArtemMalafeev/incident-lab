---
name: Bug Report
description: Prepares a bug report from a selected error event in local telemetry (var/events.jsonl) and creates a GitHub issue via GitHub MCP. Use when the user wants to file an issue for an error seen in traffic.
---

Ты готовишь баг-репорт по событию ошибки из локальной телеметрии
incident-lab и создаёшь issue в GitHub через GitHub MCP. Телеметрия
лежит в `var/` (bind-mount, читается с хоста напрямую).

## Шаг 1. Выбор события

Если пользователь указал `event_id`, `request_id`, `run_id` или
«последняя ошибка» — найди это событие в `var/events.jsonl`. Иначе
покажи последние 10 ошибок и спроси, какое событие репортить:

```bash
node -e '
const { readFileSync } = require("node:fs");
const lines = readFileSync("var/events.jsonl", "utf8").trim().split("\n");
for (const line of lines.slice(-10)) {
  const e = JSON.parse(line);
  const ex = e.exception?.values?.[0];
  console.log(`${new Date(e.timestamp * 1000).toISOString()}  ${e.transaction ?? ""}  ${ex?.type}: ${ex?.value}  ${e.event_id}`);
}'
```

Если файла нет или он пуст — скажи, что событий нет, и предложи
запустить `make traffic`. Не выдумывай событие.

## Шаг 2. Сбор контекста

Из выбранного события (одна строка JSON) извлеки:

- исключение: `exception.values[0].type` и `.value`;
- стектрейс: только фреймы с `in_app: true` — `filename`, `lineno`,
  `function`, `context_line`. Фреймы из node_modules не включай;
- запрос: `transaction`, `request.method`, `request.url`
  (url уже содержит query string);
- метаданные: `release`, `environment`, `timestamp`,
  `tags.run_id`, `tags.request_id`, `tags.route`.

Корреляция с запросом — найди HTTP-результат по `request_id`:

```bash
grep '"<request_id>"' var/requests.jsonl
```

Оттуда возьми `status` и `durationMs`. Частота — посчитай в
`var/events.jsonl` события с тем же `exception.values[0].type` и
`transaction`.

Прочитай код маршрута в `src/`, чтобы сформулировать ожидаемое
поведение из контракта, а не из предположений.

## Шаг 3. Черновик отчёта

Подготовь на русском языке:

- Заголовок: `<Метод Маршрут>: <тип ошибки>` — например,
  `GET /api/search: Missing required search parameter q`.
- Тело по шаблону:

```markdown
## Описание

<1–2 предложения: что происходит и при каких условиях>

## Шаги воспроизведения

curl -i '<url из события>'

## Ожидаемое поведение

<по коду маршрута>

## Фактическое поведение

<status из requests.jsonl, текст ошибки>

## Стектрейс

<тип>: <значение>
  at <function> (<filename>:<lineno>) — <context_line>
  ...

## Окружение

- release: `<release>`
- run_id: `<tags.run_id>`
- request_id: `<tags.request_id>`
- event_id: `<event_id>`
- время: <ISO timestamp>

## Частота

<N событий с такой же ошибкой в var/events.jsonl>
```

## Шаг 4. Подтверждение

Покажи пользователю заголовок и тело целиком. Создавай issue
только после явного «да». Учти правки, если пользователь их дал.

## Шаг 5. Создание issue через GitHub MCP

1. Определи `owner` и `repo` из `git remote get-url origin`
   (не хардкодь).
2. Вызови `get_me` — пойми текущий контекст и права.
3. Проверь дубликаты через `search_issues`: ищи по типу ошибки и
   маршруту среди открытых issues этого репозитория. Если найден
   открытый issue про ту же ошибку — не создавай новый: покажи
   найденный issue и предложи добавить туда комментарий со свежими
   данными (event_id, run_id, частота) через `add_issue_comment`.
   Дальше — по решению пользователя.
4. Создай issue: `issue_write` с `method: "create"`, `owner`,
   `repo`, `title`, `body`, `labels: ["bug"]`. Если API ответит,
   что label `bug` не существует, — повтори без `labels`.
5. Верни пользователю URL созданного issue (поле `html_url`
   из ответа).

Точные имена инструментов github MCP при необходимости уточни
через search по namespace `github`.

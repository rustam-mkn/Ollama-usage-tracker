# Ollama Usage Tracker

Терминальное приложение для отслеживания `Cloud Usage` сразу по нескольким аккаунтам Ollama без постоянного переключения через `ollama signin` / `ollama signout`.

## Что умеет

- Отслеживает несколько аккаунтов Ollama в одном интерфейсе
- Показывает `session` и `weekly` usage в терминале
- Поддерживает два режима отображения: таблица и карточки
- Хранит отдельный браузерный профиль для каждой почты
- Позволяет отметить текущий активный аккаунт для подсветки
- Подключается к команде `ollama account` в `zsh`, не заменяя настоящий `ollama`

## Как это работает

Приложение использует Playwright и отдельный профиль Chrome для каждой почты.

Когда ты добавляешь аккаунт:

1. Открывается окно браузера для конкретной почты
2. Ты вручную входишь в Ollama
3. Приложение сохраняет сессию и потом использует ее для чтения `Cloud Usage`

За счет этого обычные команды Ollama не ломаются, а usage можно собирать сразу по нескольким аккаунтам независимо друг от друга.

## Требования

- macOS
- `zsh`
- Node.js 18+
- установленный Google Chrome в `/Applications/Google Chrome.app`

## Установка

```bash
git clone https://github.com/rustam-mkn/Ollama-usage-tracker.git
cd Ollama-usage-tracker
npm install
npm run install:zsh
source ~/.zshrc
```

## Запуск

Основной запуск:

```bash
ollama account
```

Если нужно запустить напрямую без shell-интеграции:

```bash
node ./src/cli.js
```

## Первый запуск

При первом запуске:

1. Выбери `Add first account`
2. Введи почту аккаунта Ollama
3. Войди в Ollama в открывшемся окне Chrome
4. Вернись в терминал и нажми Enter

После этого можно:

- обновлять usage по всем аккаунтам
- добавлять новые аккаунты
- перевходить в конкретный аккаунт
- удалять аккаунты из отслеживания
- переключать вид между `table` и `cards`
- выбирать текущий активный аккаунт

## Безопасность

Команда `ollama account` подключается через небольшую `zsh`-функцию.

Перехватывается только этот конкретный случай:

```bash
ollama account
```

Все остальные команды уходят в настоящий бинарник Ollama:

- `ollama run`
- `ollama list`
- `ollama signin`
- `ollama signout`
- `ollama --help`

То есть реальный `ollama` не подменяется и не ломается.

## Структура проекта

```text
config/accounts.json        список отслеживаемых аккаунтов и настройки интерфейса
data/current-account.txt    текущий подсвеченный аккаунт
data/usage-snapshot.json    последний сохраненный usage snapshot
profiles/                   постоянные Chrome-профили, по одному на аккаунт
src/cli.js                  точка входа
src/services/menu.js        интерактивное меню
src/services/usage-collector.js
                            сбор usage через Playwright
src/storage/store.js        работа с конфигом и snapshot
src/render.js               терминальный рендер интерфейса
```

## Полезные команды

Установить интеграцию для `zsh`:

```bash
npm run install:zsh
```

Посмотреть текущее внутреннее состояние в JSON:

```bash
node ./src/cli.js --json
```

## Важные замечания

- Если Google блокирует вход как «небезопасный браузер», приложение использует установленный Chrome, а не встроенный Chromium Playwright
- Если Ollama изменит верстку страницы `Cloud Usage`, парсер в `src/services/usage-collector.js` может потребовать обновления

## Для разработки

Запуск без `ollama account`:

```bash
node ./src/cli.js
```

Если после установки интеграции команда не подхватилась:

```bash
source ~/.zshrc
```

# J0IN

![Angular](https://img.shields.io/badge/Angular-22-red?style=flat-square&logo=angular)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?style=flat-square&logo=typescript)
![SCSS](https://img.shields.io/badge/SCSS-design%20tokens-cc6699?style=flat-square&logo=sass)
![PHP](https://img.shields.io/badge/PHP-REST%20API-777bb4?style=flat-square&logo=php)
![MySQL](https://img.shields.io/badge/MySQL-InnoDB-4479a1?style=flat-square&logo=mysql)

A task and project board: put work on a kanban board, break it into subtasks, assign people and
drag cards through columns you define yourself.

> Live at [j0in.weskakay.de](https://j0in.weskakay.de). Sign in as a guest to try the board without
> an account.

## 💡 What is this?

J0IN is a rebuild of a kanban tool I worked on in a team, redone as my own product. The original
was plain JavaScript across two dozen HTML pages with a hosted database. This version is an Angular
app with standalone components and signals, talking to a REST API I wrote in PHP on MySQL. Both
halves live in this repository and deploy to the same origin, so there is no CORS to handle.

Two things set it apart from the original.

**The columns are yours.** The old version had four hard-coded states, and the words `todo`,
`progress`, `feedback` and `done` appeared twelve times across the code. Here a column is a row in
a table: add one, rename it, drag it into place, delete it. A task points at a column instead of
carrying a status string, so the board can look however you work. New boards start with the four
familiar columns so there is something to work with straight away.

**Passwords never leave the server.** The original compared them in the browser, which meant every
user record, password included, was downloaded in order to sign in. Here they are hashed with
BCRYPT and verified server side, and the browser only ever holds a session cookie it cannot read.

## 🧠 Planned features

✅ Sign up, sign in, guest access, sign out
✅ Board with freely definable columns, drag and drop on desktop and touch
✅ Tasks with description, due date, priority, project, assignees and subtasks
✅ Progress bar from the subtasks that are done
✅ Search across title and description
✅ Projects with colour, icon, status, deadline and a short description, pinned ones in the sidebar
✅ Team page: everyone on the board with their open cards and a workload from the estimates against a weekly capacity
✅ Calendar with month and week view for every board; with Google Calendar connected, its events show up and open cards can be dragged into the week
✅ Settings with their own navigation: look, board and projects, time, focus, calendar, access and account
✅ Dark and light, following the system by default
✅ Two looks to choose from: the flat J0IN look and a glass look with floating, see-through surfaces
✅ Home screen: the day as three rings, what comes next, focus, my tasks, the week, projects and who is busy
✅ Board or list, figures above the board, filters for project and priority that live in the address bar
✅ Every task opens in a side panel under its own address: change the column, add subtasks, start a focus
✅ Estimates on tasks, and the moment a task reached the last column is kept for the figures
✅ Time tracking per task and phase, with a timer on every card
✅ Focus runs of 15, 25 or 50 minutes, counted down in a small pill at the top of every page; default length and daily goal are set per board
✅ Command palette on Ctrl K or Cmd K: pages, actions, tasks, projects and contacts
✅ Insights page with priorities, columns and due dates as charts
✅ Google Calendar and a day planner for accounts the owner has unlocked

## 👀 Try it as a guest

The guest board is reset once a day and every card on it shows one feature:

| Card | Where to look |
|---|---|
| Switch the look: J0IN or glass | Settings, appearance, look |
| Find anything with Ctrl K | Ctrl K or Cmd K anywhere |
| Start a 25 minute focus | Home, focus widget, or the button in an open card |
| Open a card in the panel and change its column | Any card on the board |
| Try the list and the filters | Board, switch to list, pick a project |
| Look at the insights | Insights in the menu |
| Look at the projects and pin one | Projects in the menu, the star on a card |
| Open the calendar and look at the week | Calendar, switch between month and week |
| Look at the team and its workload | Team in the menu, open a profile |
| Set the focus length and daily goal | Settings, focus and capacity |
| Track time on a card | The play button on a card |
| Browse the stack | A column with more than three cards |

## 🖥️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Angular 22, standalone components |
| Language | TypeScript, strict mode |
| State | Angular Signals |
| Forms | Reactive Forms with the app's own validation |
| Styling | SCSS, every value a design token |
| API | PHP with PDO |
| Database | MySQL, InnoDB, foreign keys with cascading deletes |

## 🚀 Setup

### Frontend

```bash
git clone https://github.com/weskakay/j0in.git
cd j0in
npm install
ng serve          # Dev server → http://localhost:4200
ng lint           # Must exit 0
ng build --configuration=production
```

### Backend

Import `schema.sql` once into an empty MySQL database, then copy `api/config.example.php` to
`api/config.php` and fill in the real connection values. That file is gitignored and never
committed.

On shared hosting the database usually runs on its own host, so `localhost` will not connect.
Take the host from the hosting panel's connection details.

An existing database is brought up to date with the files in `api/migrations/`, run once each in
date order.

Deploy the Angular build and the `api/` folder to the same domain. `spa.htaccess` belongs in the
web root as `.htaccess`: it leaves `/api/` alone and routes everything else to `index.html`, so
deep links survive a reload.

## 📁 Project Structure

```
j0in/
├── api/
│   ├── index.php           # Routing, JSON responses, error handling
│   ├── db.php              # PDO connection and UUID helper
│   └── config.example.php  # Template, the real config.php stays out of git
├── schema.sql              # Table structure, no data
├── spa.htaccess            # SPA fallback, /api/ excluded
└── src/
    ├── app/
    │   ├── core/           # Auth, HTTP, error handling
    │   ├── data/           # State and domain logic, knows nothing about screens
    │   ├── ui/             # Reusable building blocks
    │   ├── layout/         # Sidebar, top bar, focus pill, command palette, dialogs
    │   └── pages/          # One screen per route
    └── styles/
        └── _tokens.scss    # Every colour, spacing, radius and font
```

The four layers are deliberate. `data/` holds the domain logic and knows nothing about screens, so
that logic can move elsewhere later without dragging the interface along with it.

## 🧹 Code quality

Enforced by the linter rather than by review, so a violation fails the build:

| Rule | Setting |
|---|---|
| Function length | `max-lines-per-function: 14` |
| File length | `max-lines: 400` |
| Console output | `no-console`, only `error` and `warn` |
| Naming | `camelCase` |

Test files are exempt from the function length rule: a `describe` block is scaffolding, not
production code.

## 🎨 Design

Every colour, spacing, radius, shadow and font is a CSS Custom Property in `styles/_tokens.scss`
and used as `var(--j0in-...)` everywhere else. No component stylesheet carries a hex value.

That is what makes switching the theme a swap of values rather than a rewrite. The glass look is
built the same way: it only redefines tokens under `[data-look="glass"]`, so every component comes
out flat or as glass without knowing which look is on.

## 📄 License

[MIT](LICENSE). Use it, read it, take pieces of it.

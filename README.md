# J0IN

![Angular](https://img.shields.io/badge/Angular-22-red?style=flat-square&logo=angular)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?style=flat-square&logo=typescript)
![SCSS](https://img.shields.io/badge/SCSS-design%20tokens-cc6699?style=flat-square&logo=sass)
![PHP](https://img.shields.io/badge/PHP-REST%20API-777bb4?style=flat-square&logo=php)
![MySQL](https://img.shields.io/badge/MySQL-InnoDB-4479a1?style=flat-square&logo=mysql)

A task and project board: put work on a kanban board, break it into subtasks, assign people and
drag cards through columns you define yourself.

> Work in progress. The scaffold stands, the features are being built stage by stage.

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
✅ Tasks with description, due date, priority, category, assignees and subtasks
✅ Progress bar from the subtasks that are done
✅ Search across title and description
✅ Contacts, grouped alphabetically, assignable to tasks
✅ Settings for columns, categories and the colour theme
✅ Dark and light, following the system by default

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
    │   ├── layout/         # Navbar and sidebar
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

That is what makes switching the theme a swap of values rather than a rewrite, and it is the
groundwork for the configurable colours and fonts planned later.

## 📄 License

Private project, published for reference.

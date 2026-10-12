# The Blogging Platform v1.0

An open source blogging platform. People publish articles, read the feed, discuss posts, and keep profiles inside one shell: a header, navigation on the left, content in the center, and popular comments on the right.

![Home: the Design topic, the article feed, and popular comments](cover.png)

## Stack

The browser talks only to the gateway. Requests then go to the identity, content, discussion, messaging, notification, and media services. Each service has its own database, services exchange events, and files are stored separately.


| Layer    | Contents                                                                                             |
| -------- | ---------------------------------------------------------------------------------------------------- |
| Client   | React 19, TypeScript, Vite, Tailwind CSS 4, HeroUI, TanStack Query, Zustand, React Router, Editor.js |
| Services | Node.js 22, TypeScript, Fastify, Drizzle ORM, Zod                                                    |
| Data     | PostgreSQL 16, one database per service                                                              |
| Events   | NATS JetStream                                                                                       |
| Files    | MinIO                                                                                                |
| Sign-in  | Firebase Authentication; an emulator in local and dev                                                |
| Runtime  | pnpm, Docker Compose                                                                                 |


## Installation

You need Node.js 22, pnpm 9.15, and Docker with Compose v2. Run the commands from the repository root.

```bash
pnpm install
cp infra/env/local.env.example infra/env/local.env
pnpm local
```

`pnpm local` starts the services, databases, NATS, MinIO, the client, and the Firebase Auth emulator, then loads the small set of test data. In `local`, the `CHANGE_ME` placeholders from the template are fine.

The site opens at [http://localhost:8080](http://localhost:8080), and the gateway at [http://localhost:3000](http://localhost:3000). Sign in opens the emulator page, where you pick a test participant.

The large set is 500+ articles and thousands of comments:

```bash
pnpm infra:seed local large
```

Stop the containers:

```bash
pnpm infra:down local
```

`pnpm infra:down local -- --volumes` stops the environment and deletes the data volumes.

## Features

- **Feeds and topics.** A guest reads Fresh and Popular, topic pages, public profiles, the rating, and About. My feed is built from subscriptions to authors and topics. An article can be expanded in its card or opened on its own page. Posts you have already seen are tucked behind a Hidden bar, and confirmed impressions keep a post in Popular for seven days.
- **Publishing.** A member who can publish writes in a block editor: paragraphs and headings, lists, quotes, code, captioned images, tables, attachments, and person cards. Links to YouTube, Vimeo, X, GitHub, and CodePen get a preview. A draft is visible only to its author. A published article has an audience — everyone, signed-in members only, or the author only — and comments can be turned on or off separately.
- **Discussion.** Articles and comments take reactions from the site catalog. Comments reply to each other, and an article counts views, bookmarks, and shares. People who already have the page open see new comments, reactions, views, and the author's edits without a reload.
- **People.** A profile stores a name, description, avatar, cover, and short address. It shows reputation, the year joined, badges, followers, following, posts, and comments. Members exchange direct messages, receive notifications, and search for articles, people, and topics.
- **Appearance and language.** Light and dark mode are the same screen layout. Interface labels switch to Russian, English, or Serbian; articles and comments that people have already written stay as they are. On a narrow screen there is one column, and the left navigation opens from the header.
- **Administration.** Sign-in goes through Firebase Authentication. A superadmin sets the name and logo, the language, the About text, topics, the reaction and badge catalogs, social covers, registration rules, and whether new members can publish right away. An admin hides, restores, and deletes articles and comments and handles reports. A restricted member can read what they are allowed to see, and cannot publish, comment, react, or send messages.

Tags: движок платфомы vc.ru, движок блог платформы, блог-платформа, скрипт сайта dtf.ru
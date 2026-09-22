# board-service (MySQL)

Standalone Board / Column / Task service, split out of the monolith and
converted to MySQL to match `user` and `notification`. Same modular
pattern: `server.js` → `src/app.js` → `src/modules/{boards,columns,tasks}/`.

## Run it

```bash
cp .env.example .env      # fill in real DB/JWT values
npm install
```

Load the schema once against your MySQL server (creates its own database,
`board_db` by default — see "Multiple services, one MySQL host" below):

```bash
mysql -u root -p < src/db/schema.sql
```

Then start it:

```bash
npm run start     # or npm run dev with nodemon
```

## What changed from the Mongo version

The monolith's `Board`/`Column`/`Task` were nested Mongo documents (a
board embeds columns, a column embeds tasks, a task embeds comments,
attachments, and an activity log). MySQL has no equivalent, so `src/db/schema.sql`
flattens all of that into 9 relational tables:

| Table | Replaces |
|---|---|
| `boards` | Board document (minus `members`) |
| `board_members` | `Board.members` array |
| `columns` | Column document |
| `tasks` | Task document (scalar fields; `timeManagement` flattened into columns) |
| `task_assignees` | `Task.assignedTo` array |
| `task_comments` | `Task.comments` array |
| `task_comment_attachments` | `comment.attachments` array |
| `task_attachments` | `Task.attachments` array (direct file uploads) |
| `task_activity_log` | `Task.activityLog` array |
| `task_daily_logs` | `timeManagement.dailyLogs` array |

All child tables use `FOREIGN KEY ... ON DELETE CASCADE`, so deleting a
board or column cleans up everything under it in one `DELETE` — no more
manually chaining `Task.deleteMany()` + `Column.deleteMany()` like the
Mongo version needed.

IDs are UUID strings (`CHAR(36)`, via the `uuid` package), matching the
style `user-service`'s account IDs already use — not MySQL auto-increment
integers — so they still look/behave like the Mongo ObjectIds the frontend
was built against.

`owner`/`members`/`assignedTo`/`uploaded_by`/comment `user_id` are plain
`VARCHAR(100)` — the user-service's id — not a foreign key, since users
live in a different database entirely now.

**Everything from the earlier Mongo version still applies** — no local
`User` table, `src/utils/userClient.js` fetches display info from the
user-service over HTTP, `src/utils/notifyClient.js` POSTs to the
notification-service instead of an in-process `Notification.create()`,
and JWT is verified against the same `JWT_SECRET_KEY` user-service signs
with. See the "⚠️ one thing you still need to add" note below — it's
still outstanding.

## ⚠️ One thing you still need to add to `user-service`

`userClient.js` calls `GET {USER_SERVICE_URL}/internal/users/:id`, expecting
`{ id, name, email, role }` back. That route doesn't exist yet in the
`user` bundle you shared — only `GET /profile/:profileId` exists, which
returns a different kind of object (a tutor/institute profile). Until you
add something like this, board responses show `name: null, email: null`
for members/assignees instead of failing outright:

```js
// user-service: src/modules/accounts/accounts.routes.js (new)
router.get('/internal/users/:id', async (req, res) => {
  const user = await accountsRepository.getById(req.params.id);
  if (!user) return res.status(404).json({ message: 'Not found' });
  res.json({ id: user.id, name: user.full_name, email: user.email, role: user.role });
});
```

## Multiple services, one MySQL host

Since `user`, `notification`, and `board` now all point at the same
Hostinger MySQL server, each needs **its own database** — don't point
this at `u878069289_plm_db`. Create a separate one (e.g.
`u878069289_board_db`) and set `DB_NAME` to it in `.env`. The DB user
needs privileges granted on that database too.

## Tested

Verified against a real local MariaDB instance: schema loads cleanly,
service boots, and `POST /api/boards` was exercised end-to-end with a
signed JWT and returned a real row from the database.

## Routes

Unchanged from the Mongo version — see the route list below.

- `POST   /api/boards` — create board (admin only)
- `GET    /api/boards` — boards the current user is a member of
- `GET    /api/boards/:id` — board detail, with columns → tasks
- `PATCH  /api/boards/:boardId/add-member`
- `PUT    /api/boards/:boardId`
- `DELETE /api/boards/:boardId`
- `POST   /api/boards/:boardId/columns/create`
- `GET    /api/boards/:boardId/columns`
- `DELETE /api/boards/:boardId/columns/:columnId`
- `POST   /api/boards/:boardId/columns/:columnId/tasks` — create task
- `GET    /api/tasks?scope=mine|boardId=&columnId=`
- `PATCH  /api/tasks/:taskId`
- `PATCH  /api/tasks/:taskId/move`
- `DELETE /api/tasks/:taskId`
- `POST   /api/tasks/:taskId/comments`
- `POST   /api/tasks/:taskId/timer`
- `POST   /api/tasks/:taskId/upload`
- `DELETE /api/tasks/:taskId/upload/:fileId`

All routes except `/health` require a `Bearer` access token from the
user-service (or an `authToken` cookie).

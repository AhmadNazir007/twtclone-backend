# twtclone-backend

NestJS backend for the Twitter clone frontend.

## Setup

```bash
npm install
copy .env.example .env
npm run start:dev
```

The API listens on `PORT` or `4000` by default.

## Environment

Required variables:

- `JWT_SECRET`
- `ADMIN_SECRET`
- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_NAME`

Optional variables:

- `PORT`, defaults to `4000`
- `FRONTEND_URL`, defaults to `http://localhost:3000`
- `DB_SSL`, set to `false` for local Postgres without SSL
- `TYPEORM_SYNC`, set to `true` for local development schema sync

## API Surface

Auth:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`

Posts:

- `GET /posts`
- `GET /posts/:id`
- `POST /posts`
- `PUT /posts/:id`
- `DELETE /posts/:id`
- `POST /posts/:id/like`
- `POST /posts/:id/comments`

Categories:

- `POST /category/create` admin only
- `GET /category` authenticated users

Users:

- `POST /users`
- `GET /users` authenticated users

## Notes

- Validation is enabled globally with whitelisting.
- Passwords are hidden by default from TypeORM selects and API responses.
- Post updates/deletes are restricted to the post owner or admin users.
- Logout updates `lastLogout`; JWT validation rejects tokens issued before that time.

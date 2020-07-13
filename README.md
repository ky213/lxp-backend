# LXP Backend API

Node.js Role Based Authorization API for the LXP application

To start it locally, run from terminal:
`docker-compose up`

If running for the first time, you need to run migrations and optional seeds for the database. First start the API with docker-compose:
`docker-compose up --build` (add -d to run it detached in background)

And then, open a new terminal and do:
```
docker exec -it api bash
cd /srv/app/lxp-server/db
/srv/app/lxp-server/node_modules/.bin/knex migrate:latest
/srv/app/lxp-server/node_modules/.bin/knex seed:run
```

This starts the following:
1. LXP API: http://localhost:4000/api
2. PostgreSQL database: localhost:54320 (from docker containers: posgresdb:5432)
3. pgAdmin: http://localhost:8068
#!/bin/bash
function create_container {
    docker run -d --name $CONTAINER_NAME \
    -e POSTGRES_USER=$POSTGRES_USER \
    -e POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
    -e POSTGRES_DB=$POSTGRES_DB \
    -p $PORT:5432 postgres -c log_statement=all

}
function seed_db {
    cd ./db
    ../node_modules/.bin/knex seed:run 
}


function migrate_db {
    cd ./db
    ../node_modules/.bin/knex migrate:latest
}

function start_container {
   docker start $CONTAINER_NAME
}

function stop_container {
    docker stop $CONTAINER_NAME
}

function delete_container {
    docker rm -f $CONTAINER_NAME
}



CONTAINER_NAME="lxp-psql"
POSTGRES_USER="admin"
POSTGRES_PASSWORD="admin"
POSTGRES_DB="lxpdb"
PORT=25432

case "$1" in
"create" | "new" | "run") 
    create_container
;;
"seed") 
    seed_db
;;


"up") 
    migrate_db
;;


"connect")
    psql -U $POSTGRES_USER -h 127.0.0.1 -p $PORT $POSTGRES_DB
;;

"start") 
    start_container
;;

"stop") 
    stop_container
;;

"delete" | "remove" | "rm") 
    delete_container
;;

*) 
    echo "create|new|run|start|stop|delete|remove|rm"
;;
esac


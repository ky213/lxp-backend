#!/bin/bash
function create_container {
    docker run -d --name $CONTAINER_NAME \
    -e POSTGRES_USER=admin \
    -e POSTGRES_PASSWORD=admin \
    -e POSTGRES_HOST_AUTH_METHOD=trust \
    -e POSTGRES_DB=lxpdb \
    -p 25432:5432 postgres

    sleep 2
    cd ./db
    ../node_modules/.bin/knex migrate:latest
    ../node_modules/.bin/knex seed:run
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

case "$1" in
"create" | "new" | "run") 
    create_container
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


#!/bin/bash

cloud_sql_proxy -instances="lxp-dev-qa:europe-west1:lxp-staging-01=tcp:5432"

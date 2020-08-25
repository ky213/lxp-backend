#!/bin/bash

gsutil cors set development-cors.json gs://lxp-uploads-development/
gsutil cors set staging-cors.json gs://lxp-uploads-staging/

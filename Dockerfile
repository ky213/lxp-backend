FROM node:12.2.0

WORKDIR /srv/app/lxp-server

COPY package.json /srv/app/lxp-server
RUN apt update
#COPY package-lock.json /srv/app/lxp-server
RUN apt install python2.7 python-pip -y
RUN npm install

#COPY . /srv/app/lxp-server

CMD [ "npm", "run", "start"]
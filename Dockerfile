FROM node:9.3.0

RUN mkdir /app
WORKDIR /app

ADD package.json /app
ADD yarn.lock /app
RUN yarn install

ADD . /app
FROM node:9.3.0

RUN mkdir /app
WORKDIR /app

ADD package.json /app
RUN yarn install

ADD . /app

CMD ["node", "--experimental-modules", "api.mjs"]
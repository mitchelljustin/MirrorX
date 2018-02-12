FROM node:9.3.0

RUN mkdir /app
WORKDIR /app

RUN yarn global add node-gyp
RUN git clone https://github.com/barrysteyn/node-scrypt.git && \
    cd node-scrypt && yarn install && node-gyp configure build

ADD package.json /app
ADD yarn.lock /app
RUN yarn install

RUN cp -f /app/node-scrypt/build/Release/scrypt.node /app/node_modules/scrypt/build/Release/

ADD . /app
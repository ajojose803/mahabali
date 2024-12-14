FROM node:21-alpine

WORKDIR /server

COPY ./package.json ./

RUN npm install

COPY . .


EXPOSE 7000

CMD [ "npm","start" ]
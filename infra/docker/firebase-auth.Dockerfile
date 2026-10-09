# syntax=docker/dockerfile:1.7
# Только эмулятор Firebase Auth. В prod этого образа нет.
# Java 21 в Debian bookworm нет ни в main, ни в backports; в Alpine пакет есть.
FROM node:22-alpine

RUN apk add --no-cache openjdk21-jre-headless ca-certificates \
  && npm install -g firebase-tools@14.12.0 \
  && adduser -D -s /sbin/nologin emulator

COPY infra/docker/firebase-auth-entrypoint.sh /usr/local/bin/firebase-auth-entrypoint.sh
RUN chmod +x /usr/local/bin/firebase-auth-entrypoint.sh

USER emulator
WORKDIR /home/emulator
ENV FIREBASE_PROJECT_ID=demo-blog
EXPOSE 9099
ENTRYPOINT ["firebase-auth-entrypoint.sh"]

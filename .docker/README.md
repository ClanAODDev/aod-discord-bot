# BOT DB
This directory contains all the files needed to get a test db up and running for the discord bot.

## Requirments
Recommend using Linux or WSL.

- [Docker](https://www.docker.com/?utm_source=google&utm_medium=cpc&utm_campaign=search_emea_brand&utm_term=docker_exact&gclid=Cj0KCQjwof6WBhD4ARIsAOi65ag5MvTIjgaAuxv5ALjgSf7_ltgVuayDzdf30-QpZMnPqlHw4s15rJUaAkmWEALw_wcB)

- [Docker compose](https://docs.docker.com/compose/install/)
    - Note: that this is installed easiest for WSL using [Docker desktop](https://docs.docker.com/desktop/windows/wsl/)

- schema file, which will be supplied to anyone approved to work on this

## Running

The db can be run from the root directory using
```bash
docker-compose -f ./docker/docker-compose.yml up
```
or by running
```bash
npm run db
```

## Data
The db uses _schema.sql_ to build the table structure and to add fixtures this is found at infra/db/schema
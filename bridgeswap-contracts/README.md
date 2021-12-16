# Bridgeswap V1 Contracts

## Local development

The following assumes this image is running:

```
docker run -v "$(pwd)"/conf:/home_conf:ro -p 0.0.0.0:48132:48132 -p 0.0.0.0:41420:41420 -p 0.0.0.0:8484:8484 -p 0.0.0.0:8483:8383 --rm vitelabs/gvite-nightly:v2.11.1-latest virtual --config /home_conf/node_config.json
```

### Install dependencies

`yarn`

### List accounts

`yarn accounts`

### Run tests

`yarn test`

### Run tests matching pattern

`yarn test -g 'swap test'`

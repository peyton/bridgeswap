# Bridgeswap V1 Contracts

## Local development

The following image should be run when deploying locally:

```
docker run -v "$(pwd)"/conf:/home_conf:ro -p 0.0.0.0:48132:48132 -p 0.0.0.0:41420:41420 -p 0.0.0.0:8484:8484 -p 0.0.0.0:8483:8383 --rm vitelabs/gvite-nightly:v2.11.1-latest virtual --config /home_conf/node_config.json
```

### Install dependencies

`yarn`

### List accounts

`yarn accounts`

## Testing

The automated tests assume this image is running:
```
docker run -p 127.0.0.1:48132:48132 --rm vitelabs/gvite-nightly:v2.11.1-latest virtual --config conf/evm/node_config.json --rich vite_cecce91eb5ed40879105e1c780c572d087bb6ec91db043f422
```

### Run tests

`yarn test`

### Run tests matching pattern

`yarn test -g 'swap test'`

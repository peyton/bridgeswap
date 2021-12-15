# Bridgeswap V1 Contracts

## Local development

The following assumes this image is running:

```
docker run -p 127.0.0.1:48132:48132 --rm vitelabs/gvite-nightly:v2.11.1-latest virtual --config conf/evm/node_config.json --rich vite_cecce91eb5ed40879105e1c780c572d087bb6ec91db043f422
```

### Install dependencies

`yarn`

### List accounts

`yarn accounts`

### Run tests

`yarn test`

### Test single file

`yarn test:file tests/deploy.test.ts`

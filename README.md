# US Treasury for Jaspers Terminal

Yield-paying rates, the debt to the penny, auctions, and federal spending from Fiscal Data. No key.

Sources: `treasury/rates`, `treasury/debt`, `treasury/auctions`, `treasury/spending`.

## Install

In Jaspers Terminal: **Settings > Plugins > Add a plugin**, and paste this repository's link. Or
clone this folder into `~/Jaspers/plugins/treasury` and the app builds it on the next save.

## What it needs

No key and no account. The data is public and this asks for it directly, saying who it is in its
`User-Agent`.

## Working on it

```sh
npm install
npm run typecheck
npm test
```

MIT.

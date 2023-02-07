<p align="center">
  <h1 align="center">cardano-cli</h1>

  <p align="center">
    <a href="https://twitter.com/hlabs_tech">
      <img src="https://img.shields.io/twitter/follow/hlabs_tech?style=for-the-badge&logo=twitter" />
    </a>
    <a href="https://twitter.com/MicheleHarmonic">
      <img src="https://img.shields.io/twitter/follow/MicheleHarmonic?style=for-the-badge&logo=twitter" />
    </a>
  </p>
</p>

## Overview

`cardanocli-pluts` is a library that wraps cardano-cli using Typescript allowing you to interact with the cli using the Types exposed by [`plu-ts`](https://github.com/HarmonicLabs/plu-ts)

## Prerequisites

- `cardano-node >= 1.29.0`
- `node.js >= 12.19.0`


## Getting started

```ts
import { CardanoCliPluts } from "@harmoniclabs/cardanocli-pluts"
import { Value } from "@harmoniclabs/plu-ts"

const cli = new CardanocliJs({
    network: "testnet 42"
});

async function main(){

    // read a saved address from file
    const bobAddr = await cli.utils.readAddress( "./addresses/bob.addr" );

    // or make a new addres using the cli
    const { privateKey, publicKey } = await cli.address.keyGen();

    const myAddr = await cli.address.build({
        payment: { publicKey }
    });

    // query the UTxOs at myAddr
    const myUtxos = await cli.query.utxo({
        address: myAddr
    });

    // send some ada to bob
    const tx = await cli.transaction.build({
        inputs: [{ utxo: myUtxos[0] }],
        outpus: [
            {
                address: bobAddr,
                value: Value.lovelaces(2_000_000)
            }
        ],
        changeAddress: myAddr
    });

    const txSigned = await cli.transaction.sign({
        tx,
        privateKey
    });

    // let's check everything is ok before submission
    console.log(
        JSON.stringify(
            txSigned.toJson(),
            undefined,
            2
        )
    );

    // send the transaction
    cli.transaction.submit({ tx: txSigned })

}

main()
```

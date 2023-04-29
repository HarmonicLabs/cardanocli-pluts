import { DataB, DataConstr, DataList, Script, ScriptType, Value, compile, data, pfn, pmakeUnit, unit } from "@harmoniclabs/plu-ts";
import { cli } from "../../../../test_utils/cli";
import { addr, privateKey } from "../../../../test_utils/addrs";
import { fromAscii } from "@harmoniclabs/uint8array-utils";

// jest.setTimeout( 60_000 )

describe("", () => {

    const nameTOKEN = fromAscii( "TOKEN" );

    test("let's see", async () => {

        const mint1 = new Script(
            ScriptType.PlutusV2,
            compile(
                pfn([
                    data,
                    data
                ],  unit)
                ( ( __, _ ) => pmakeUnit() )
            )
        );

        const mintedTOKEN = new Value([
            {
                policy: mint1.hash,
                assets: [
                    Value.assetEntry( nameTOKEN, 1_000_000_000 )
                ]
            }
        ]);

        const utxos = await cli.query.utxo({
            address: addr
        });

        const arrs: number[][] = new Array(8);

        for( let i = 0; i < 8; i++ )
        {
            arrs[i] = new Array(32).fill(undefined).map( (_, idx) => idx + (i * 32) )
        }

        const tx = await cli.transaction.build({
            inputs: utxos.map( utxo => ({ utxo })) as any,
            outputs:[
                {
                    address: addr,
                    value: Value.add(
                        Value.lovelaces(3_000_000),
                        utxos.reduce(
                            (accum, elem) => {

                                const amt = elem.resolved.value.get( mint1.hash.toString(), nameTOKEN );

                                return amt === BigInt(0) ? accum :
                                Value.add(
                                    accum,
                                    new Value([
                                        {
                                            policy: mint1.hash,
                                            assets: [
                                                Value.assetEntry( nameTOKEN, amt )
                                            ]
                                        }
                                    ])
                                );
                            },
                            mintedTOKEN
                        )
                    ),
                    datum: new DataList(
                        arrs.map( arr => new DataB( Buffer.from(arr) ) )
                    )
                }
            ],
            collaterals: [ utxos[0].utxoRef ],
            mints: [
                {
                    value: mintedTOKEN,
                    script: {
                        inline: mint1,
                        redeemer: new DataConstr( 0, [] )
                    }
                }
            ],
            changeAddress: addr
        });

        //*
        console.log(
            JSON.stringify(
                tx.toJson(),
                undefined,
                2
            )
        );
        //*/

        const signed = await cli.transaction.sign({
            tx,
            privateKey
        });

        await cli.transaction.submit({ tx: signed });

    });

})
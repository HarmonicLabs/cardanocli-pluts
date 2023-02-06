import { Value } from "@harmoniclabs/plu-ts";
import { cli } from "../../../../test_utils/cli";


describe("", () => {

    test("let's see", async () => {

        const addr = cli.utils.readAddress(
        );

        const utxos = await cli.query.utxo({
            address: addr
        });

        const tx = await cli.transaction.build({
            inputs: [{ utxo: utxos[ 0 ] }],
            outputs:[
                {
                    address: addr,
                    value: Value.lovelaces(1_000_000)
                }
            ],
            changeAddress: addr
        });

        const privateKey = cli.utils.readPrivateKey(
        )

        const signed = await cli.transaction.sign({
            tx,
            privateKey
        });

        await cli.transaction.submit({ tx: signed });

    });

})
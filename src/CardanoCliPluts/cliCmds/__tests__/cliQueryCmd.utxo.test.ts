import { addrOut } from "../../../../test_utils/addrs"
import { cli } from "../../../../test_utils/cli"

describe("cli.query.utxo", () => {

    test("addrOut", async () => {

        const utxos = await cli.query.utxo({
            address: addrOut
        });

        console.log(
            ...utxos.map(
                u => JSON.stringify(
                    u.toJson(),
                    undefined,
                    2
                )
            )
        );

        await cli.query.protocolParameters()

    })
})
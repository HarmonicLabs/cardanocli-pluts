import { cli } from "../../../../test_utils/cli";
import { existsSync, readFileSync, unlink } from "node:fs";

describe("CliAddressCmd", () => {

    test("keyGen", async () => {

        const { privateKey, publicKey } = await cli.address.keyGen();

        expect( existsSync( privateKey.path ) ).toBe( true );
        expect( existsSync( publicKey.path ) ).toBe( true );

        expect(
            JSON.parse(
                readFileSync( privateKey.path )
                .toString()
            ).cborHex.slice(4) // cbor tag
        ).toEqual(
            privateKey.asString
        )

        expect(
            JSON.parse(
                readFileSync( publicKey.path )
                .toString()
            ).cborHex.slice(4) // cbor tag
        ).toEqual(
            publicKey.asString
        )

        // clear what created by the test
        unlink( privateKey.path, () => {} );
        // unlink( publicKey.path , () => {} );
        
    });

})
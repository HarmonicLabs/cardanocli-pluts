import { CliCmd, ICliCmdConfig } from "../CliCmd";
import { Address, AddressStr, ProtocolParamters, TxOutRef, UTxO } from "@harmoniclabs/plu-ts";
import { WithPath, withPath } from "../../../utils/path/withPath";
import randId from "../../../utils/randId";
import { exec } from "../../../utils/node_promises";
import { waitForFileExists } from "../../../utils/waitForFileExists";
import { existsSync, readFileSync } from "node:fs";
import ObjectUtils from "../../../utils/ObjectUtils";
import { parseUtxoOutput } from "./parseUtxoOutput";
import { CardanoCliPlutsBaseError } from "../../../errors/ CardanoCliPlutsBaseError";

export type QueryByTxOutRefFilter = (TxOutRef | `${string}#${number}`);
export type QueryByAddressFilter = (Address | AddressStr);

export type QueryUTxOArgs = {
    addresses: QueryByAddressFilter[]
} | {
    byTxOutRef: QueryByTxOutRefFilter[]
} | {
    /**
     * @deprecated
     * **returns all the utxos of the network**
     * 
     * ## use only on small private networks
     */
    allUTxOs: boolean
}

export class CliQueryCmd extends CliCmd
{
    constructor( cfg: ICliCmdConfig )
    {
        super( cfg );
    }

    async protocolParameters(): Promise<WithPath<ProtocolParamters>>
    {
        let ppId: string;
        let ppPath: string;
        
        do {
            ppId = randId();
            ppPath = `${this.cfg.tmpDirPath}/${ppId}_protocol_params.json`;
        } while( existsSync(ppPath)  )

        await exec(
            `${this.cfg.cliPath} query protocol-parameters \
            --${this.cfg.network} \
            --out-file ${ppPath}
            `
        );

        await waitForFileExists( ppPath, 5000 );

        const pp = JSON.parse(
            readFileSync( ppPath ).toString()
        );

        return withPath( ppPath, pp );
    }

    async utxo( args: QueryUTxOArgs): Promise<UTxO[]>
    {
        if( ObjectUtils.hasOwn( args, "allUTxOs" ) )
        {
            if( args.allUTxOs !== true )
            return [];

            return parseUtxoOutput(
                (await exec(
                    `${this.cfg.cliPath} query utxo \
                    --${this.cfg.network} \
                    --whole-utxo
                    `
                )).stdout,
                Address.fake
            );
        }
        if( ObjectUtils.hasOwn( args, "byTxOutRef" ) )
        {
            return parseUtxoOutput(
                (await 
                    exec(
                        `${this.cfg.cliPath} query utxo \
                        --${this.cfg.network} \
                        ${(args.byTxOutRef as QueryByTxOutRefFilter[])
                            .map( byRef =>
                                "--tx-in" + (
                                    typeof byRef === "string" ? 
                                    byRef :
                                    byRef.toString() 
                                )
                            ).join(' ')
                        } `
                    )
                ).stdout,
                Address.fake
            );
        }
        if( ObjectUtils.hasOwn( args, "addresses" ) )
        {
            return (await Promise.all(
                (args.addresses as QueryByAddressFilter[])
                .map( async byAddr =>
                    parseUtxoOutput(
                        (await exec(
                            `${this.cfg.cliPath} query utxo \
                            --${this.cfg.network} \
                            --address ${
                                typeof byAddr === "string" ?
                                byAddr : 
                                byAddr.toString()
                            }
                            `
                        )).stdout,
                        typeof byAddr === "string" ? Address.fromString( byAddr ) : byAddr
                    )
                )
            ))
            .reduce( (accum, utxos) => accum.concat( utxos ) );
        }

        throw new CardanoCliPlutsBaseError(
            "unkown arguments to pass to 'cardano-cli query utxo'"
        );
    }
}
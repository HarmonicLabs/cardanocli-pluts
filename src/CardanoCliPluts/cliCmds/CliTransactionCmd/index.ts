import { Hash32, PrivateKey, Tx, forceBigUInt } from "@harmoniclabs/plu-ts";
import { OrPath, WithPath, withPath } from "../../../utils/path/withPath";
import { CliCmd, ICliCmdConfig } from "../CliCmd";
import ObjectUtils from "../../../utils/ObjectUtils";
import { exec } from "../../../utils/node_promises";
import { ensurePath } from "../../../utils/path/ensurePath";
import { toInputBuildOptions } from "./ICliTxBuildIn";
import { toOutputBuildOptions, toReturnCollateralOpt } from "./ITxBuildOutput";
import randId from "../../../utils/randId";
import { waitForFileExists } from "../../../utils/waitForFileExists";
import { existsSync, readFileSync } from "fs";
import { getPath } from "../../../utils/path/getPath";
import { isCardanoEra } from "../../../types/CardanoEra";
import { CliTransactionCmdBuild, needsPlutusScripts, includeUtxosRefWith, requiredSignersToOpts, getMintOpts, certToOpt, withdrawToOpt, writeCborFile, mintsToCliEntry } from "./tx_build_utils";
import { extractIdFromPath } from "../../../utils/extractFromPath";
import { unlink, rename } from "node:fs/promises";
import { Buffer } from "buffer";
import { sha256 } from "../../../utils/sha256";


export interface CliTransactionCmdSubmit
{
    tx: OrPath<Tx>
}

export interface CliTransactionCmdSign {
    tx: OrPath<Tx>,
    privateKey: OrPath<PrivateKey>
}

export class CliTransactionCmd extends CliCmd
{
    constructor( cfg: ICliCmdConfig )
    {
        super( cfg );
    }

    async submit({
        tx
    }: CliTransactionCmdSubmit)
    : Promise<void>
    {
        if( !ObjectUtils.hasOwn( tx, "path" ) )
        {            
            await ensurePath(
                Tx,
                tx,
                {
                    postfix: "tx",
                    tmpDirPath: this.cfg.tmpDirPath,
                    jsonType: "Transaction"
                }
            );
        }

        await exec(
            `${this.cfg.cliPath} transaction submit \
            --${this.cfg.network} \
            --tx-file ${(tx as any).path}
            `,
            { env: { "CARDANO_NODE_SOCKET_PATH": this.cfg.socketPath } }
        );
    }

    async sign({
        tx,
        privateKey
    }: CliTransactionCmdSign)
    : Promise<WithPath<Tx>>
    {
        const txPath: string = await getPath(
            Tx,
            tx,
            {
                postfix: "tx_signed",
                tmpDirPath: this.cfg.tmpDirPath
            }
        );
        const skeyPath: string = await getPath(
            PrivateKey,
            privateKey,
            {
                postfix: "skey",
                tmpDirPath: this.cfg.tmpDirPath
            }
        );

        let outPath: string = `${this.cfg.tmpDirPath}/${extractIdFromPath( txPath, randId )}_tx_signed.json`;

        // can't extract file id from path and randId returned an exsisting id
        while( existsSync( outPath ) )
        outPath = `${this.cfg.tmpDirPath}/${randId()}_tx_signed.json`;

        await exec(
            `${this.cfg.cliPath} transaction sign \
            --${this.cfg.network} \
            --tx-file ${txPath} \
            --signing-key-file ${skeyPath} \
            --out-file ${outPath}
            `,
            { env: { "CARDANO_NODE_SOCKET_PATH": this.cfg.socketPath } }
        );

        await waitForFileExists( outPath );

        const txCbor = Buffer.from(
            JSON.parse(
                readFileSync( outPath )
                .toString()
            ).cborHex,
            "hex"
        );

        // the hash is different from the tx hash
        // since it includes also non-body fields
        // (on top of not being blake2b_256)
        const path = `${this.cfg.tmpDirPath}/${sha256(txCbor)}_tx_signed.json`;

        if( !existsSync(path) )
        await rename( outPath, path );

        if( existsSync( outPath ) )
        unlink( outPath );

        await waitForFileExists( path );

        return withPath(
            path,
            Tx.fromCbor( txCbor )
        );
    }

    async build({
        inputs,
        outputs,
        changeAddress,
        readonlyRefInputs,
        requiredSigners,
        collaterals,
        collateralReturn,
        mints,
        invalidBefore,
        invalidAfter,
        certificates,
        withdrawals,
        metadata,
        protocolUpdateProposalPath,
        era
    }: CliTransactionCmdBuild)
    : Promise<WithPath<Tx>>
    {
        let cmd =
            `${this.cfg.cliPath} transaction build \
            --cddl-format \
            --${era !== undefined && isCardanoEra(era) ? era : "babbage"}-era \
            --${this.cfg.network} \
            ${inputs.map( toInputBuildOptions ( this.cfg ) ).join(' ')} `;

        if(
            needsPlutusScripts(
                inputs,
                mints,
                certificates,
                withdrawals
            )
        )
        cmd += ` --protocol-params-file ${await this.cfg.getProtocolParamsPath()} `;

        if( outputs !== undefined )
        cmd += (await Promise.all(outputs.map( toOutputBuildOptions( this.cfg ) ))).join(' ');

        if( changeAddress !== undefined )
        cmd += ` --change-address ${changeAddress.toString()} `;

        cmd += [
            includeUtxosRefWith("--read-only-tx-in-reference", readonlyRefInputs ),
            includeUtxosRefWith("--tx-in-collateral", collaterals ),
            requiredSignersToOpts(requiredSigners),
            toReturnCollateralOpt(collateralReturn)
        ].join(' ');

        if( invalidBefore !== undefined )
        cmd += ` --invalid-before ${forceBigUInt( invalidBefore ).toString()} `;

        if( invalidAfter !== undefined )
        cmd += ` --invalid-hereafter ${forceBigUInt( invalidAfter ).toString()} `;

        if( mints !== undefined )
        cmd += mintsToCliEntry( mints ) + (await Promise.all(
                mints.map(
                    getMintOpts({
                        postfix: "minting_policy",
                        tmpDirPath: this.cfg.tmpDirPath
                    })
                )
            )
        ).join(' ');

        if( certificates !== undefined )
        cmd += ' ' + (
            await Promise.all(
                certificates.map(
                    certToOpt({
                        postfix: "certificate_validator",
                        tmpDirPath: this.cfg.tmpDirPath
                    })
                )
            )
        ).join(' ') + ' ';

        if( withdrawals !== undefined )
        cmd += ' ' + (
            await Promise.all(
                withdrawals.map(
                    withdrawToOpt({
                        postfix: "stake_validator",
                        tmpDirPath: this.cfg.tmpDirPath
                    })
                )
            )
        ).join(' ') + ' ';

        if( metadata !== undefined )
        cmd += ` --metadata-cbor-file ${
            ObjectUtils.hasOwn( metadata, "path" ) ?
            metadata.path :
            await writeCborFile(
                metadata.toCbor().asBytes,
                this.cfg.tmpDirPath,
                "metadata"
            )
        } `;

        if( protocolUpdateProposalPath !== undefined )
        cmd += ` --update-proposal-file ${protocolUpdateProposalPath} `

        let outPath: string;
        do {
            outPath = `${this.cfg.tmpDirPath}/${randId()}_tx.json`
        } while ( existsSync( outPath ) );

        cmd += ` --out-file ${outPath} `;
    
        await exec(cmd, { env: { "CARDANO_NODE_SOCKET_PATH": this.cfg.socketPath } });

        await waitForFileExists( outPath, 5000 );

        const txCbor = Buffer.from(
            JSON.parse(
                readFileSync( outPath )
                .toString()
            ).cborHex,
            "hex"
        );

        // the hash is different from the tx hash
        // since it includes also non-body fields
        // (on top of not being blake2b_256)
        const path = `${this.cfg.tmpDirPath}/${sha256(txCbor)}_tx.json`;

        if( !existsSync(path) )
        await rename( outPath, path );

        if( existsSync( outPath ) )
        unlink( outPath );

        await waitForFileExists( path );

        return withPath(
            path,
            Tx.fromCbor( txCbor )
        );
    }

    async txId( tx: OrPath<Tx> | { tx: OrPath<Tx> } ): Promise<Hash32>
    {
        tx = ObjectUtils.hasOwn( tx, "tx" ) ? tx.tx as OrPath<Tx> : tx;

        const txId = (
            await exec(
                `${this.cfg.cliPath} transaction txid --tx-file ${
                    await getPath( Tx, tx , { ...this.cfg , postfix: "tx" } )
                }`
            )
        ).stdout;

        return new Hash32( txId )
    }

}
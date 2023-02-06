import { Address, AddressStr, CanBeUInteger, Certificate, Hash28, ITxOut, PrivateKey, ProtocolUpdateProposal, PubKeyHash, Script, Tx, TxBody, TxMetadata, forceBigUInt } from "@harmoniclabs/plu-ts";
import { OrPath, WithPath, withPath } from "../../../utils/path/withPath";
import { CliCmd, ICliCmdConfig } from "../CliCmd";
import ObjectUtils from "../../../utils/ObjectUtils";
import { exec } from "../../../utils/node_promises";
import { ensurePath } from "../../../utils/path/ensurePath";
import { ICliTxBuildIn, toInputBuildOptions } from "./ICliTxBuildIn";
import { ICliTxBuildOut, toOutputBuildOptions, toReturnCollateralOpt, valueToString } from "./ITxBuildOutput";
import { CanBeUTxORef, forceUTxORefString } from "./CanBeUTxORef";
import { ICliTxBuildMint } from "./ICliTxBuildMint";
import { ICliTxBuildCert } from "./ICliTxBuildCert";
import { ICliTxBuildWithdrawal } from "./ICliTxBuildWithdrawal";
import { forceData } from "../../../utils/CanBeData";
import { CardanoCliPlutsBaseError } from "../../../errors/ CardanoCliPlutsBaseError";
import randId from "../../../utils/randId";
import { waitForFileExists } from "../../../utils/waitForFileExists";
import { existsSync, readFileSync } from "fs";
import { getPath } from "../../../utils/path/getPath";


export interface CliTransactionCmdBuild
{
    inputs: [ ICliTxBuildIn, ...ICliTxBuildIn[] ],
    outputs?: ICliTxBuildOut[],
    changeAddress?: Address | AddressStr,
    readonlyRefInputs?: CanBeUTxORef[],
    requiredSigners?: OrPath<PubKeyHash | string>[],
    collaterals?: CanBeUTxORef[],
    collateralReturn?: ICliTxBuildOut,
    mints?: ICliTxBuildMint[],
    invalidBefore?: CanBeUInteger,
    invalidAfter?: CanBeUInteger,
    certificates?: ICliTxBuildCert[],
    withdrawals?: ICliTxBuildWithdrawal[],
    metadata?: OrPath<object | TxMetadata>,
    protocolUpdateProposal?: OrPath<ProtocolUpdateProposal>
}

function includeUtxosRefWith(
    option: string,
    utxosRef: CanBeUTxORef[] | undefined
): string
{
    return utxosRef
        ?.map( ref => 
            ` ${option} ${forceUTxORefString(ref)} `
        )
        .join(' ') ?? ""
}

function requiredSignersToOpts( 
    requiredSigners: OrPath<PubKeyHash | string>[] | undefined
): string
{
    return requiredSigners?.map( sig => {

        if( sig instanceof Hash28 || typeof sig === "string" )
        return ` --required-signer-hash ${sig.toString()} `;
        return ` --required-signer ${sig.path} `;
    })
    .join(' ') ?? ""
}

function mintToOpt({
    value,
    script
}: ICliTxBuildMint ): string
{
    let opt = ` --mint ${valueToString(value)} `;

    if( ObjectUtils.hasOwn( script, "inline" ) )
    {
        if( ObjectUtils.hasOwn( script.inline, "path" ) )
        opt += ` --mint-script-file ${script.inline.path} ` +
            ` --mint-redeemer-value ${
                JSON.stringify(
                    forceData( script.redeemer )
                    .toJson()
                )
            } `;
    }
    else if( ObjectUtils.hasOwn( script, "ref" ) )
    {
        opt += ` --mint-tx-in-reference ${forceUTxORefString( script.ref )} ` +
            " --mint-plutus-script-v2 " +
            ` --mint-reference-tx-in-redeemer-value ${
                JSON.stringify(
                    forceData( script.redeemer )
                    .toJson()
                )
            } ` + 
            ` --policy-id ${script.policyId.toString()} `
    }

    return opt;
}

function certToOpt({
    cert,
    script
}: ICliTxBuildCert ): string
{
    let opt = "";

    if( !ObjectUtils.hasOwn( cert, "path" ) )
    {
        ensurePath(
            Certificate as any,
            cert,
            {
                postfix: "cert",
                tmpDirPath: ""
            }
        )
    }

    opt += ` --certificate-file ${(cert as any).path} `;

    if( script === undefined ) return opt;

    if( ObjectUtils.hasOwn( script, "ref" ) )
    {
        opt += ` --certificate-tx-in-reference ${forceUTxORefString(script.ref)} ` + 
            " --certificate-plutus-script-v2 " +
            ` --certificate-reference-tx-in-redeemer-value ${
                JSON.stringify(
                    forceData( script.redeemer )
                    .toJson()
                )
            } `;
    }
    else if( ObjectUtils.hasOwn( script, "inline" ) )
    {
        if( !ObjectUtils.hasOwn( script.inline, "path" ) )
        {
            ensurePath(
                Script,
                script.inline,
                {
                    postfix: "script",
                    tmpDirPath: ""
                }
            )
        }

        opt += ` --certificate-script-file ${(script.inline as any).path} ` +
        ` --certificate-redeemer-value ${
            JSON.stringify(
                forceData( script.redeemer )
                .toJson()
            )
        } `;

    }
    else throw new CardanoCliPlutsBaseError(
        "invald certificate script"
    )

    return opt;
}

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
                postfix: "tx",
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

        let outPath: string;
        do {
            outPath = `${this.cfg.tmpDirPath}/${randId()}_tx.json`;
        } while( existsSync(outPath) )

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

        return withPath(
            outPath,
            Tx.fromCbor(
                JSON.parse(
                    readFileSync( outPath )
                    .toString()
                ).cborHex
            )
        )
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
        protocolUpdateProposal
    }: CliTransactionCmdBuild)
    : Promise<WithPath<Tx>>
    {
        let cmd =
            `${this.cfg.cliPath} transaction build \
            --cddl-format \
            --${this.cfg.network} \
            ${inputs  .map( toInputBuildOptions ( this.cfg ) ).join(' ')} `;

        if( outputs !== undefined )
        cmd += outputs.map( toOutputBuildOptions( this.cfg ) ).join(' ');

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
        cmd += mints.map( mintToOpt ).join(' ');

        if( certificates !== undefined )
        cmd += certificates.map( certToOpt ).join(' ');


        let outPath: string;
        do {
            outPath = `${this.cfg.tmpDirPath}/${randId()}_tx.json`
        } while ( existsSync( outPath ) );

        cmd += ` --out-file ${outPath} `;
    
        await exec(cmd, { env: { "CARDANO_NODE_SOCKET_PATH": this.cfg.socketPath } });

        await waitForFileExists( outPath, 5000 );

        const cborHex = JSON.parse(
            readFileSync( outPath )
            .toString()
        ).cborHex;

        console.log( cborHex );

        return withPath(
            outPath,
            Tx.fromCbor( cborHex )
        );
    }

}
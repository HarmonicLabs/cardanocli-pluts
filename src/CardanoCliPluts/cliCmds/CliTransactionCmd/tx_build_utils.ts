import { Address, AddressStr, PubKeyHash, CanBeUInteger, TxMetadata, ProtocolUpdateProposal, Script, ScriptType, Hash28, Certificate, hashData, Data, dataToCbor } from "@harmoniclabs/plu-ts";
import { existsSync, readFileSync, writeFile, writeFileSync } from "fs";
import { CardanoCliPlutsBaseError } from "../../../errors/ CardanoCliPlutsBaseError";
import { CardanoEra } from "../../../types/CardanoEra";
import { forceData } from "../../../utils/CanBeData";
import ObjectUtils from "../../../utils/ObjectUtils";
import { EnsurePathDetails, ensurePath } from "../../../utils/path/ensurePath";
import { getPath } from "../../../utils/path/getPath";
import { OrPath } from "../../../utils/path/withPath";
import { CanBeUTxORef, forceUTxORefString } from "./CanBeUTxORef";
import { ICliTxBuildCert } from "./ICliTxBuildCert";
import { ICliTxBuildIn } from "./ICliTxBuildIn";
import { ICliTxBuildMint } from "./ICliTxBuildMint";
import { ICliTxBuildWithdrawal } from "./ICliTxBuildWithdrawal";
import { ICliTxBuildOut, valueToString } from "./ITxBuildOutput";
import { waitForFileExists } from "../../../utils/waitForFileExists";
import { CborString } from "@harmoniclabs/plu-ts/dist/cbor/CborString";
import { createHash } from "crypto";


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
    metadata?: OrPath<TxMetadata>,
    protocolUpdateProposalPath?: string,
    era?: CardanoEra
}

export function isPlutus( script: OrPath<Script> ): boolean
{
    if( script instanceof Script )
    return (
        script.type === ScriptType.PlutusV1 ||
        script.type === ScriptType.PlutusV2
    );

    const t = JSON.parse(
        readFileSync(script.path)
        .toString()
    ).type;

    return (
        t === ScriptType.PlutusV1 ||
        t === ScriptType.PlutusV2
    );
}

export function needsPlutusScripts(
    inputs: ICliTxBuildIn[],
    mints: ICliTxBuildMint[] = [],
    certs: ICliTxBuildCert[] = [],
    withdrawals: ICliTxBuildWithdrawal[] = []
): boolean
{
    return (
        mints.some( ({ script }) =>
            (ObjectUtils.hasOwn( script, "inline" ) && isPlutus( script.inline )) ||
            ObjectUtils.hasOwn( script, "ref" )
        ) ||
        certs.some( ({ script }) =>
            script !== undefined && (
                (ObjectUtils.hasOwn( script, "inline" ) && isPlutus( script.inline )) ||
                ObjectUtils.hasOwn( script, "ref" )
            )
        ) ||
        withdrawals.some( ({ script }) =>
            script !== undefined && (
                (ObjectUtils.hasOwn( script, "inline" ) && isPlutus( script.inline )) ||
                ObjectUtils.hasOwn( script, "ref" )
            )
        ) ||
        inputs.some( ({ inputScript, referenceScriptV2 }) =>
            referenceScriptV2 !== undefined ||
            (
                inputScript !== undefined && isPlutus( inputScript.script )
            )
        )
    );
}

export function includeUtxosRefWith(
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

export function requiredSignersToOpts( 
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

export function mintToOpt( details: EnsurePathDetails ): (mint: ICliTxBuildMint ) => Promise<string>
{
    return (async({
        value,
        script
    }: ICliTxBuildMint ) => 
    {

        let opt = ` --mint ${valueToString(value, false)} `;
    
        if( ObjectUtils.hasOwn( script, "inline" ) )
        {
            const scritpPath = await getPath(
                Script,
                script.inline,
                {
                    ...details,
                    jsonType: script.inline.type === ScriptType.NativeScript ? "SimpleScriptV2" : script.inline.type
                }
            );

            opt += ` --mint-script-file ${scritpPath} ` +
                ` --mint-redeemer-cbor-file ${
                    await writeDataAsCbor(
                        forceData(script.redeemer),
                        details.tmpDirPath
                    )} `;
        }
        else if( ObjectUtils.hasOwn( script, "ref" ) )
        {
            opt += ` --mint-tx-in-reference ${forceUTxORefString( script.ref )} ` +
                " --mint-plutus-script-v2 " +
                ` --mint-reference-tx-in-redeemer-cbor-file ${
                    await writeDataAsCbor(
                        forceData(script.redeemer),
                        details.tmpDirPath
                    )} ` + 
                ` --policy-id ${script.policyId.toString()} `
        }
    
        return opt;
    })
}

export function certToOpt( details: EnsurePathDetails ): ( cert: ICliTxBuildCert ) => Promise<string>
{
    return async function ({
        cert,
        script
    }: ICliTxBuildCert ): Promise<string>
    {
        let opt = "";
    
        if( !ObjectUtils.hasOwn( cert, "path" ) )
        {
            await ensurePath(
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
                ` --certificate-reference-tx-in-redeemer-cbor-file  ${
                    await writeDataAsCbor(
                        forceData(script.redeemer),
                        details.tmpDirPath
                    )} `;
        }
        else if( ObjectUtils.hasOwn( script, "inline" ) )
        {
            opt += ` --certificate-script-file ${
                await getPath(
                    Script,
                    script.inline,
                    details
                )} ` +
            ` --certificate-redeemer-cbor-file ${
                await writeDataAsCbor(
                    forceData(script.redeemer),
                    details.tmpDirPath
                )} `;
    
        }
        else throw new CardanoCliPlutsBaseError(
            "invald certificate script"
        )
    
        return opt;
    }
}

export function withdrawToOpt( details: EnsurePathDetails ): ( withdrawal: ICliTxBuildWithdrawal ) => Promise<string>
{
    return async function ({
        withdrawal,
        script
    }: ICliTxBuildWithdrawal)
    {
        let opt = ` --withdrawal ${withdrawal.rewardAccount.toString()}+${withdrawal.amount.toString()} `;
    
        if( script === undefined ) return opt;
    
        if( ObjectUtils.hasOwn( script, "ref" ) )
        {
            opt += ` --withdrawal-tx-in-reference ${forceUTxORefString(script.ref)} ` + 
                " --withdrawal-plutus-script-v2 " +
                ` --withdrawal-reference-tx-in-redeemer-cbor-file ${
                    await writeDataAsCbor(
                        forceData(script.redeemer),
                        details.tmpDirPath
                    )} `;
        }
        else if( ObjectUtils.hasOwn( script, "inline" ) )
        {
            opt += ` --withdrawal-script-file ${
                await getPath(
                    Script,
                    script.inline,
                    details
                )} ` +
            ` --withdrawal-redeemer-cbor-file ${
                await writeDataAsCbor(
                    forceData(script.redeemer),
                    details.tmpDirPath
                )} `;
    
        }
        else throw new CardanoCliPlutsBaseError(
            "invald certificate script"
        )
    
        return opt;
    }
}

export async function writeDataAsCbor( data: Data, tmpDirPath: string ): Promise<string>
{
    const path = 
        `${tmpDirPath}/${
            hashData( data )
            .map( n => 
                n.toString(16)
                .padStart(2,'0')
            )
            .join('')
        }_data.cbor`
        
    if( existsSync(path) ) return path;

    writeFileSync( path, dataToCbor( data ).asBytes );

    await waitForFileExists( path );

    return path;
}

export async function writeCborFile(
    cStr: CborString | Buffer,
    tmpDirPath: string,
    postfix: string
): Promise<string>
{
    const data = Buffer.isBuffer( cStr ) ? cStr : cStr.asBytes;

    const path = 
        `${tmpDirPath}/${
            createHash( 'sha256' )
            .update( data )
            .digest("hex")
        }_${postfix}.cbor`;

    if( existsSync(path) ) return path;

    writeFileSync( path, data );

    await waitForFileExists( path );

    return path;
}
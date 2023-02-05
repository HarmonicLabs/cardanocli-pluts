import { Script, addPIntMethods } from "@harmoniclabs/plu-ts"
import { CanBeUTxORef, forceUTxORefString } from "./CanBeUTxORef"
import { CanBeData, forceData } from "../../../utils/CanBeData"
import { CardanoCliPlutsBaseError } from "../../../errors/ CardanoCliPlutsBaseError"
import randId from "../../../utils/randId"
import { existsSync } from "fs"
import { ICliCmdConfig } from "../CliCmd"
import { OrPath } from "../../../utils/path/withPath"
import ObjectUtils from "../../../utils/ObjectUtils"
import { ensurePath } from "../../../utils/path/ensurePath"

export interface ICliTxBuildIn {
    utxo: CanBeUTxORef,
    referenceScriptV2?: {
        refUtxo: CanBeUTxORef,
        datum: CanBeData | "inline",
        redeemer: CanBeData,
    }
    inputScript?: {
        script: OrPath<Script>,
        datum: CanBeData | "inline",
        redeemer: CanBeData
    }
}

export function toInputBuildOptions(
    cfg: Readonly<ICliCmdConfig>
): (inputOptions: ICliTxBuildIn) => string
{
    return function ({
        utxo,
        referenceScriptV2,
        inputScript
    }: ICliTxBuildIn): string
    {
        const utxoRefStr = forceUTxORefString( utxo );
        let result = ` --tx-in ${utxoRefStr} `;

        if( referenceScriptV2 !== undefined )
        {
            if( inputScript !== undefined )
            throw new CardanoCliPlutsBaseError(
                "multiple spending scripts specified for " + utxoRefStr
            );

            result +=
            ` --spending-tx-in-reference ${forceUTxORefString( referenceScriptV2.refUtxo )} \
            --spending-plutus-script-v2 `;

            if( referenceScriptV2.datum === "inline" )
            result += " --spending-reference-tx-in-inline-datum-present ";
            else
            {
                result += ` --spending-reference-tx-in-datum-value ${
                    JSON.stringify(
                        forceData( referenceScriptV2.datum )
                        .toJson()
                    )
                } `;
            }

            result += ` --spending-reference-tx-in-redeemer-value ${
                JSON.stringify(
                    forceData( referenceScriptV2.redeemer )
                    .toJson()
                )
            } `;

        }
        else if( inputScript !== undefined )
        {
            if( !ObjectUtils.hasOwn( inputScript.script, "path" ) )
            {
                ensurePath(
                    Script,
                    inputScript.script,
                    {
                        postfix: "script",
                        tmpDirPath: cfg.tmpDirPath,
                        jsonType: inputScript.script.type
                    }
                );
            }

            result += ` --tx-in-script-file ${(inputScript.script as any).path} `;

            if( inputScript.datum === "inline" )
            result += " --tx-in-inline-datum-present ";
            else
            {
                result += ` --tx-in-datum-value ${
                    JSON.stringify(
                        forceData( inputScript.datum )
                        .toJson()
                    )
                } `;
            }

            result += ` --tx-in-redeemer-value ${
                JSON.stringify(
                    forceData( inputScript.redeemer )
                    .toJson()
                )
            } `;

        }

        return result;
    }
}
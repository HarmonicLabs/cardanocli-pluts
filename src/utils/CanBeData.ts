import { Data, dataFromCbor, isData } from "@harmoniclabs/plu-ts";

export type CanBeData = Data | string;

export function forceData( canBeData: CanBeData ): Data
{
    return isData( canBeData ) ? canBeData : dataFromCbor( canBeData );
}
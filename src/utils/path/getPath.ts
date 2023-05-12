
import ObjectUtils from "../ObjectUtils";
import { PlutsClassToCbor, PlutsClassFromCbor, EnsurePathDetails, ensurePath } from "./ensurePath";
import { OrPath } from "./withPath";

export async function getPath<T extends PlutsClassToCbor>(
    ctor: PlutsClassFromCbor<T>,
    maybePath: OrPath<T>,
    details: EnsurePathDetails
): Promise<string>
{
    if( !ObjectUtils.hasOwn( maybePath, "path" ) || maybePath.path === undefined )
    {
        return (await ensurePath(
            ctor,
            maybePath,
            details
        )).path;
    }

    return maybePath.path;
}
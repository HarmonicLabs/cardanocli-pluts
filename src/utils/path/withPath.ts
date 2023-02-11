import ObjectUtils from "../ObjectUtils"

export type WithPath<T> = T & { path: string }

/**
 * mainly used for input of functions
 */
export type OrPath<T> = { path: string } | T

export function withPath<T>( path: string, something: T, dir?: string ): WithPath<T>
{
    if( ObjectUtils.hasOwn( something, "path" ) )
    {
        something.path = path;
        return something;
    }

    let _path = path; 
    return ObjectUtils.definePropertyIfNotPresent(
        something as any, "path",
        {
            get: () => _path,
            set: ( newPath: any ) => {
                if( typeof newPath !== "string" ) return;

                _path = newPath;
            },
            configurable: false,
            enumerable: true
        }
    ) as any;
}
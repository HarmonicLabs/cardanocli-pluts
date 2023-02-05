
export async function sleep( ms: number ): Promise<void>
{
    await new Promise( (resolve, reject) => setTimeout(() => resolve( true ), ms ));
}
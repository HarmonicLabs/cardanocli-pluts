import { config } from "dotenv";
import { cli } from "./cli";

config();

export const addr = cli.utils.readAddress(
    process.env.ADDR_PATH ?? ""
);

export const addrOut = cli.utils.readAddress(
    process.env.ADDR_OUT_PATH ?? ""
);

export const privateKey = cli.utils.readPrivateKey(
    process.env.PRIVATE_KEY_PATH ?? ""
);
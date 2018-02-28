import {ExtendedPromise} from "./definitions";

declare global {
    interface Promise<T> extends ExtendedPromise<T> {

    }
}


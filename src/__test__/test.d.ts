import {ExtendedPromise, ExtendedPromiseConstructor} from "../lib/definitions";

declare global {
    interface Promise<T> extends ExtendedPromise<T> {

    }

    interface PromiseConstructor extends ExtendedPromiseConstructor {

    }
}
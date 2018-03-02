/** @private */ /** */
import {BasicPromise, BasicPromiseConstructor} from "./definitions";

export function makeRejectingPromise<P extends BasicPromise>(ctor : BasicPromiseConstructor<P>, value ?: any) {
    if ("reject" in ctor) {
        return (ctor as any).reject(value);
    }
    return new ctor((resolve, reject) => {
        reject(value);
    })
}
/** @external */
export function makeResolvingPromise<P extends BasicPromise, T>(ctor : BasicPromiseConstructor<P>, value : T | PromiseLike<T>) {
    if ("resolve" in ctor) {
        return (ctor as any).resolve(value);
    }
    let x = value as any;
    return new ctor((resolve, reject) => {
        if ("then" in x) {
            x.then(resolve, reject);
        } else {
            resolve(x);
        }
        resolve(value);
    });
}
/** @external */
export let normalizeTime = (t: number | Date) => {
    if (t === +t) {
        return t;
    } else {
        let dt = t as Date;
        return Math.max(0, dt.getTime() - Date.now());
    }
};
/** @external */
export let isFunction = (t : any) : t is Function => {
    return Object.prototype.toString.call(t) === "[object Function]";
};
/** @external */
export let isPromiseLike = (t : any) : t is PromiseLike<any> => {
    return "then" in t;
};
/**
 * @module promise-stuff
 */ /** */
import {AsyncCallback, BasicPromise, BasicPromiseConstructor} from "./definitions";
import {StaticOperators} from "./static-operators";
import {isFunction, isPromiseLike, makeRejectingPromise, normalizeTime} from "./common";
import {ExtendedPromise} from "./definitions";


/**
 * A module that provides static bindings for functions implemented by [[ExtendedPromise]].
 */
export module Operators {
    /**
     * Returns a `StaticOperators` module, which provides static bindings for functions implemented by a [[ExtendedPromiseConstructor]].
     * The `StaticOperators` instance provides functions that use the constructor `ctor` internally.
     * @param {BasicPromiseConstructor<P extends BasicPromise<*>>} ctor The promise constructor for which to create an operators module.
     * @returns {StaticOperators<BasicPromise<*>>}
     * @constructor
     */
    export function For<P extends BasicPromise<any>>(ctor: BasicPromiseConstructor<P>) {
        return StaticOperators.create(ctor);
    }

    /**
     * Static version of the `race` function.
     * @see [[ExtendedPromise.race]]
     */
    export function race<P extends BasicPromise<T>, T = any>(promise: P, ...others: PromiseLike<T>[]): P {
        let ctor = promise.constructor as BasicPromiseConstructor<P>;
        others.unshift(promise);

        if ("race" in ctor) {
            return (ctor as any).race(others);
        }
        return new ctor((resolve, reject) => {
            let done = false;
            for (let promise of others) {
                promise.then(x => {
                    !done && resolve(x);
                    done = true;
                }, err => {
                    !done && reject(err);
                    done = true;
                });
            }
        });
    }

    /**
     * Static version of the `and` function.
     * @see [[ExtendedPromise.and]]
     * @param {P} promise
     * @param {PromiseLike<T>} others
     * @returns {BasicPromise<*[]>} The return type of this function is meant to be `P<T[]>`, where `P` is the input promise type.
     */
    export function and<P extends BasicPromise<T>, T = any>(promise: P, ...others: PromiseLike<T>[]): BasicPromise<any[]> {
        let ctor = promise.constructor as BasicPromiseConstructor<P>;
        others.unshift(promise);
        if ("all" in ctor) {
            return (ctor as any).all(others);
        }
        return new ctor((resolve, reject) => {
            let arr = [];
            let count = 0;
            let done = false;
            for (let i = 0; i < others.length; i++) {
                let promise = others[i];
                promise.then(x => {
                    if (done) return;
                    arr[i] = x;
                    count++;
                    if (count === others.length) {
                        resolve(arr);
                        done = true;
                    }
                }, err => {
                    reject(err);
                    done = true;
                });
            }
        });
    }

    /**
     * Static version of the `fallback` function.
     * @see [[ExtendedPromise.fallback]]
     * @param {P} promise
     * @param {PromiseLike<T> | ((reason: any) => (PromiseLike<T> | T)) | T} others
     * @returns {P}
     */
    export function fallback<P extends BasicPromise<T>, T = any>(promise: P, ...others: (PromiseLike<T> | T | ((reason: any) => (PromiseLike<T> | T)))[]): P {
        let ctor = promise.constructor as BasicPromiseConstructor<P>;
        others.unshift(promise);
        let lastFailure = null;
        return new ctor((resolve, reject) => {
            let resolveOn = i => {
                if (i >= others.length) return reject(lastFailure);
                let current = others[i];
                if (isFunction(current)) {
                    current = current(lastFailure);
                }
                if (isPromiseLike(current)) {
                    current.then(x => resolve(x), err => {
                        lastFailure = err;
                        if (i >= others.length - 1) {
                            return reject(err);
                        } else {
                            return resolveOn(i + 1);
                        }
                    });
                }
                else {
                    return resolve(current);
                }
            };
            others.filter(other => isPromiseLike(other)).forEach(promise => (promise as PromiseLike<any>).then(undefined, () => {
            }));
            resolveOn(0);
        });
    }

    /**
     * Static version of the `delay` function.
     * @see [[ExtendedPromise.delay]]
     * @param {P} promise
     * @param {number | Date} time
     * @returns {P}
     */
    export function delay<P extends BasicPromise<T>, T = any>(promise: P, time: number | Date): P {
        let ctor = promise.constructor as BasicPromiseConstructor<P>;
        let operators = For(ctor);
        return promise.then(x => operators.wait(time).then(() => x), x => operators.wait(time).then(() => {
            return makeRejectingPromise(ctor, x);
        })) as P;
    }

    /**
     * Static version of the `each` function.
     * @see [[ExtendedPromise.each]]
     * @param {P} promise
     * @param {AsyncCallback<any, void>} action
     * @returns {P}
     */
    export function each<P extends BasicPromise<T>, T = any>(promise: P, action: AsyncCallback<any, void>): P {
        return promise.then(x => {
            let p = action(x, true) as any;
            if (p instanceof promise.constructor) {
                return p.then(() => x);
            } else {
                return x;
            }
        }) as P
    }

    /**
     * Static version of the `lastly` function.
     * @see [[ExtendedPromise.lastly]]
     * @param {P} promise
     * @param {AsyncCallback<any, void>} action
     * @returns {P}
     */
    export function lastly<T, P extends BasicPromise<T>>(promise: P, action: AsyncCallback<any, void>): P {
        let ctor = promise.constructor as BasicPromiseConstructor<P>;
        return promise.then(x => {
            let p = action(x, true) as any;
            if (p instanceof ctor) {
                return p.then(() => x);
            }
        }, err => {
            let p = action(err, false) as any;
            if (p instanceof ctor) {
                return p.then(() => makeRejectingPromise(ctor, err));
            }
        }) as P;
    }

    /**
     * Static version of the `mustNot` function.
     * @see [[ExtendedPromise.mustNot]]
     * @param {P} promise
     * @param {AsyncCallback<T, any>} failReason
     * @returns {P}
     */
    export function mustNot<P extends BasicPromise<T>, T = any>(promise: P, failReason: AsyncCallback<T, any>): P {
        let ctor = promise.constructor as BasicPromiseConstructor<P>;
        return promise.then(result => {
            let p = failReason(result, true) as any;
            if (isPromiseLike(p)) {
                return p.then(err => {
                    if (err) {
                        return makeRejectingPromise(ctor, err) as Promise<any>;
                    } else {
                        return result;
                    }
                }, err => makeRejectingPromise(ctor, err));
            }
            else if (p) {
                return makeRejectingPromise(ctor, p);
            } else {
                return result;
            }
        }) as P;
    }

    /**
     * Static version of the `stall` function.
     * @see [[ExtendedPromise.stall]]
     * @param {P} promise
     * @param {number | Date} time
     * @returns {P}
     */
    export function stall<P extends BasicPromise<T>, T>(promise: P, time: number | Date): P {
        let deadline = Date.now() + normalizeTime(time);
        let ctor = promise.constructor as BasicPromiseConstructor<P>;
        return new ctor((resolve, reject) => {
            promise.then(x => {
                let now = Date.now();
                if (now >= deadline) {
                    resolve(x);
                } else {
                    setTimeout(() => {
                        resolve(x);
                    }, now - deadline)
                }
            }, err => {
                let now = Date.now();
                if (now >= deadline) {
                    reject(err);
                } else {
                    setTimeout(() => {
                        reject(err);
                    }, now - deadline);
                }
            });
        });
    }

    /**
     * Static version of the `timeout` function.
     * @see [[ExtendedPromise.timeout]]
     * @param {P} promise
     * @param {number | Date} time
     * @param {() => (PromiseLike<T> | T)} onTimeout
     * @returns {P}
     */
    export function timeout<P extends BasicPromise<T>, T>(promise: P, time: number | Date, onTimeout ?: () => T | PromiseLike<T>): P {
        let ctor = promise.constructor as BasicPromiseConstructor<P>;
        let stat = For(ctor);
        let timeoutTk = {} as any;
        return race(promise, stat.wait(time, timeoutTk)).then(x => {
            if (x === timeoutTk) {
                let result = onTimeout();
                return result;
            }
            return x;
        }) as P;
    }

    /**
     * Static version of the `test` function.
     * @see [[ExtendedPromise.test]]
     * @param {P} promise
     * @returns {BasicPromise<boolean>} The return type is meant to be `P<boolean>`, where `P` is the promise type.
     */
    export function test<P extends BasicPromise<T>, T>(promise: P): BasicPromise<boolean> {
        return promise.then(x => true, x => false) as P;
    }

    /**
     * Static version of the `invert` function.
     * @see [[ExtendedPromise.invert]]
     * @param {P} promise
     * @returns {BasicPromise<*>} The return type of this function is meant to be `P<any>`, where `P` is the promise type.
     */
    export function invert<T, P extends BasicPromise<T>>(promise: P): BasicPromise<any> {
        let ctor = promise.constructor as BasicPromiseConstructor<P>;
        return promise.then(x => makeRejectingPromise(ctor, x), err => err) as P;
    }
}
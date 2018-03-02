/**
 * @module promise-stuff
 */ /** */
import {AsyncCallback, BasicPromise, BasicPromiseConstructor} from "./definitions";
import {StaticOperators} from "./static-operators";
import {isFunction, isPromiseLike, makeRejectingPromise, normalizeTime} from "./common";
import {ExtendedPromise} from "./definitions";


export module Operators {
    export function For<P extends BasicPromise>(ctor: BasicPromiseConstructor<P>) {
        return StaticOperators.create(ctor);
    }

    /**
     * Static version of the `race` function.
     * @see [[ExtendedPromise.race]]
     */
    export function race<P extends BasicPromise, T = any>(promise: P, ...others: PromiseLike<T>[]): P {
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

    export function and<P extends BasicPromise, T = any>(promise: P, ...others: PromiseLike<T>[]): P {
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

    export function fallback<P extends BasicPromise, T = any>(promise: P, ...others: (PromiseLike<T> | T | ((reason: any) => (PromiseLike<T> | T)))[]): P {
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

    export function delay<P extends BasicPromise, T = any>(promise: P, time: number | Date): P {
        let ctor = promise.constructor as BasicPromiseConstructor<P>;
        let operators = For(ctor);
        return promise.then(x => operators.wait(time).then(() => x), x => operators.wait(time).then(() => {
            return makeRejectingPromise(ctor, x);
        }));
    }

    export function each<P extends BasicPromise, T = any>(promise: P, action: AsyncCallback<any, void>): P {
        return promise.then(x => {
            let p = action(x, true) as any;
            if (p instanceof promise.constructor) {
                return p.then(() => x);
            } else {
                return x;
            }
        })
    }

    export function lastly<P extends BasicPromise>(promise: P, action: AsyncCallback<any, void>): P {
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
        });
    }

    export function mustNot<P extends BasicPromise, T = any>(promise: P, failReason: AsyncCallback<T, any>): P {
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
        });
    }

    export function stall<P extends BasicPromise>(promise: P, time: number | Date): P {
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

    export function timeout<P extends BasicPromise, T>(promise: P, time: number | Date, onTimeout ?: () => T | PromiseLike<T>): P {
        let ctor = promise.constructor as BasicPromiseConstructor<P>;
        let stat = For(ctor);
        let timeoutTk = {} as any;
        return race(promise, stat.wait(time, timeoutTk)).then(x => {
            if (x === timeoutTk) {
                let result = onTimeout();
                return result;
            }
            return x;
        });
    }

    export function test<P extends BasicPromise, T>(promise: P): P {
        return promise.then(x => true, x => false);
    }

    export function invert<P extends BasicPromise>(promise: P): P {
        let ctor = promise.constructor as BasicPromiseConstructor<P>;
        return promise.then(x => makeRejectingPromise(ctor, x), err => err);
    }
}
import {AsyncCallback, ExtendedPromiseConstructor} from "./definitions";

let normalizeTime = (t: number | Date) => {
    if (t === +t) {
        return t;
    } else {
        let dt = t as Date;
        return Math.max(0, dt.getTime() - Date.now());
    }
};

let isFunction = (t : any) : t is Function => {
    return Object.prototype.toString.call(t) === "[object Function]";
};

let isPromiseLike = (t : any) : t is PromiseLike<any> => {
    return "then" in t;
};

let instanceFunctions = [] as Function[];
let staticFunctions = [] as Function[];

export class StaticOperators {
    constructor(private ctor : PromiseConstructor) {

    }

    wait<T>(time : number | Date, value ?: T) : Promise<T> {
        time = Math.max(0, normalizeTime(time));
        return new this.ctor((resolve, reject) => {
            setTimeout(() => {
                resolve(value);
            }, time);
        });
    }

    soon<T>(action : ((() => T) | (() => Promise<T>))) {
        return new this.ctor((resolve, reject) => {
            resolve();
        }).then(() => action());
    }

    never<T = never>() {
        return new this.ctor((resolve, reject) => {

        });
    }

    create<T>(executor: (resolve: (value: T) => void, reject: (reason: any) => void) => void | PromiseLike<void>) {
        return new this.ctor((resolve, reject) => {
            let result = executor(resolve, reject) as any;
            if (isPromiseLike(result)) {
                return result.then(undefined, err => reject(err));
            }
        })
    }

    from<T>(other : PromiseLike<T>) : Promise<T> {
        return new this.ctor((resolve, reject) => {
            other.then(resolve, reject);
        });
    }

    static create(ctor : PromiseConstructor) {
        return new StaticOperators(ctor);
    }
}


export module Operators {
    export function For(ctor : PromiseConstructor){
        return StaticOperators.create(ctor);
    }

    export function race<T>(promise : Promise<T>,...others : PromiseLike<T>[]) : Promise<T> {
        let ctor = promise.constructor as PromiseConstructor;
        others.unshift(promise);
        if (ctor.race) {
            return ctor.race(others);
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

    export function and<T>(promise : Promise<T>,...others : PromiseLike<T>[]) : Promise<T[]> {
        let ctor = promise.constructor as PromiseConstructor;
        others.unshift(promise);
        if (ctor.all) {
            return ctor.all(others);
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

    export function fallback<T> (promise : Promise<T>, ...others : (PromiseLike<T> | T | ((reason : any) => PromiseLike<T>))[]) : Promise<T> {
        let ctor = promise.constructor as PromiseConstructor;
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
            others.filter(other => other instanceof ctor).forEach(promise => (promise as any).catch(() => {}));
            resolveOn(0);
        });
    }

    export function delay<T>(promise : Promise<T>,time : number | Date) {
        let ctor = promise.constructor as PromiseConstructor;
        let operators = For(ctor);
        return promise.then(x => operators.wait(time).then(() => x), x => operators.wait(time).then(() => ctor.reject(x)));
    }

    export function cast<T, S>(promise : Promise<T>) {
        return promise as any as Promise<S>;
    }

    export function each<T>(promise : Promise<T>,action : AsyncCallback<any, void>) {
        return promise.then(x => {
            let p = action(x, true) as any;
            if (p instanceof promise.constructor) {
                return p.then(() => x);
            } else {
                return x;
            }
        })
    }

    export function lastly <T>(promise : Promise<T>,action : AsyncCallback<any, void>) {
        let ctor = promise.constructor as PromiseConstructor;
        return promise.then( x => {
            let p = action(x, true) as any;
            if (p instanceof ctor) {
                return p.then(() => x);
            }
        }).catch(err => {
            let p = action(err, false) as any;
            if (p instanceof ctor) {
                return p.then(() => ctor.reject(err));
            }
        })
    }

    export function must<T>(promise : Promise<T>,failReason : AsyncCallback<T, any>) {
        let ctor = promise.constructor as PromiseConstructor;
        return promise.then(result => {
            let p = failReason(result, true) as any;
            if (isPromiseLike(p)) {
                return p.then(err => {
                    if (err) {
                        return ctor.reject(err) as Promise<any>;
                    } else {
                        return result;
                    }
                }, err => ctor.reject(err));
            }
            else if (p) {
                return ctor.reject(p);
            } else {
                return result;
            }
        });
    }

    export function stall<T>(promise : Promise<T>,time : number | Date) {
        let deadline = Date.now() + normalizeTime(time);
        let ctor = promise.constructor as PromiseConstructor;
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
            }).catch(err => {
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

    export function timeout<T>(promise : Promise<T>,time : number | Date, onTimeout ?: () => T | PromiseLike<T>) : Promise<T> {
        let ctor = promise.constructor as PromiseConstructor;
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

    export function test<T>(promise : Promise<T>) : Promise<boolean> {
        return promise.then(x => true, x => false);
    }

    export function invert<T>(promise : Promise<T>) : Promise<any> {
        let ctor = promise.constructor as PromiseConstructor;
        return promise.then(x => ctor.reject(x)).catch(err => err);
    }
}

            export module PromiseStuff {
    /**
     * Accepts a Promise/A+ constructor and uses it to create a derived promise based on that implementation, with all the additional members.
     * Use this function to wrap an existing Promise implementation without modifying it.
     * Note that promise implementations that define methods beyond  the Promise/A+ interface may return instances of the base promise, instead of the derived one.
     * @param {PromiseConstructor} constructor The promise constructor used to create the derived promise.
     * @returns {ExtendedPromiseConstructor}
     */
    export function deriveNew(constructor : PromiseConstructor) {
        class ExtendedPromise<T> extends constructor<T> {
            then(a, b) {
                return new ExtendedPromise<T>((resolve, reject) => {
                    super.then(a, b).then(resolve, reject);
                });
            }

            catch(a) {
                return new ExtendedPromise<T>((resolve, reject) => {
                    super.catch(reject);
                });
            }
        }

        Object.setPrototypeOf(ExtendedPromise, constructor);
        for (let k of Object.keys(Operators)) {
            let f = Operators[k];
            if (!(f.name in ExtendedPromise.prototype)) {
                ExtendedPromise.prototype[f.name] = function() {
                    return f(this, ...arguments);
                }
            }
        }

        let operators = Operators.For(constructor);

        for (let k of Object.keys(StaticOperators.prototype)) {
            if (!(k in ExtendedPromise)) {
                ExtendedPromise[k] = function() {
                    return operators[k](...arguments);
                };
            }
        }

        return ExtendedPromise as any as ExtendedPromiseConstructor;
    }

    /**
     * Accepts an existing Promise/A+ constructor and extends the constructor itself and its prototype with all the available methods.
     * Calling this method on a Promise mutates it.
     * @param {PromiseConstructor} s
     */
    export function extendExisting(s : PromiseConstructor) {
        for (let f of instanceFunctions) {
            if (!(f.name in s.prototype)) {
                s.prototype[f.name] = function() {
                    return f(this, ...arguments);
                }
            }
        }

        for (let f of staticFunctions) {
            if (!(f.name in s)) {
                s[f.name] = function() {
                    return f(this, ...arguments);
                };
            }
        }
    }
}

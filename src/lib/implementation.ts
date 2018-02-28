import {AsyncCallback, BasicPromise, BasicPromiseConstructor, ExtendedPromiseConstructor} from "./definitions";

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

function makeRejectingPromise<P extends BasicPromise>(ctor : BasicPromiseConstructor<P>, value ?: any) {
    if ("reject" in ctor) {
        return (ctor as any).reject(value);
    }
    return new ctor((resolve, reject) => {
        reject(value);
    })
}

function makeResolvingPromise<P extends BasicPromise, T>(ctor : BasicPromiseConstructor<P>, value : T | PromiseLike<T>) {
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

export class StaticOperators<P extends BasicPromise> {
    private ctor : BasicPromiseConstructor<P>;
    constructor(ctor : BasicPromiseConstructor<P>) {
        this.ctor = ctor;
    }

    wait<T = any>(time : number | Date, value ?: T) : P{
        time = Math.max(0, normalizeTime(time));
        return new this.ctor((resolve, reject) => {
            setTimeout(() => {
                resolve(value);
            }, time);
        });
    }

    soon<T = any>(action : ((() => T) | (() => PromiseLike<T>))) : P {
        return new this.ctor((resolve, reject) => {
            resolve();
        }).then(() => action());
    }

    never() : P{
        return new this.ctor((resolve, reject) => {

        });
    }

    create<T = any>(executor: (resolve: (value: T) => void, reject: (reason: any) => void) => void | PromiseLike<void>) : P {
        return new this.ctor((resolve, reject) => {
            let result = executor(resolve, reject) as any;
            if (isPromiseLike(result)) {
                return result.then(undefined, err => reject(err));
            }
        })
    }

    from<T = any>(other : PromiseLike<T>) : P {
        return new this.ctor((resolve, reject) => {
            other.then(resolve, reject);
        });
    }

    resolve<T = any>(value : T | PromiseLike<T>) : P {
        return makeResolvingPromise(this.ctor, value);
    }

    reject(reason : any) : P {
        return makeRejectingPromise(this.ctor, reason);
    }

    static create<P extends BasicPromise>(ctor : BasicPromiseConstructor<P>) {
        return new StaticOperators(ctor);
    }
}

export module Operators {
    export function For<P extends BasicPromise>(ctor : BasicPromiseConstructor<P>) {
        return StaticOperators.create(ctor);
    }

    export function race<P extends BasicPromise, T = any>(promise : P,...others : PromiseLike<T>[]) : P {
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

    export function and<P extends BasicPromise, T = any>(promise : P,...others : PromiseLike<T>[]) : P {
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

    export function fallback<P extends BasicPromise, T = any> (promise : P, ...others : (PromiseLike<T> | T | ((reason : any) => (PromiseLike<T> | T)))[]) : P {
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
            others.filter(other => isPromiseLike(other)).forEach(promise => (promise as PromiseLike<any>).then(undefined, () => {}));
            resolveOn(0);
        });
    }

    export function delay<P extends BasicPromise, T = any>(promise : P,time : number | Date)  : P{
        let ctor = promise.constructor as BasicPromiseConstructor<P>;
        let operators = For(ctor);
        return promise.then(x => operators.wait(time).then(() => x), x => operators.wait(time).then(() => {
            return makeRejectingPromise(ctor, x);
        }));
    }

    export function each<P extends BasicPromise,T = any>(promise : P,action : AsyncCallback<any, void>) : P {
        return promise.then(x => {
            let p = action(x, true) as any;
            if (p instanceof promise.constructor) {
                return p.then(() => x);
            } else {
                return x;
            }
        })
    }

    export function lastly <P extends BasicPromise>(promise : P,action : AsyncCallback<any, void>) : P {
        let ctor = promise.constructor as BasicPromiseConstructor<P>;
        return promise.then( x => {
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

    export function mustNot<P extends BasicPromise,T = any>(promise : P, failReason : AsyncCallback<T, any>)  : P{
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

    export function stall<P extends BasicPromise>(promise : P,time : number | Date) : P {
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

    export function timeout<P extends BasicPromise, T>(promise : P,time : number | Date, onTimeout ?: () => T | PromiseLike<T>)  : P{
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

    export function test<P extends BasicPromise, T>(promise : P) : P {
        return promise.then(x => true, x => false);
    }

    export function invert<P extends BasicPromise>(promise : P) : P {
        let ctor = promise.constructor as BasicPromiseConstructor<P>;
        return promise.then(x => makeRejectingPromise(ctor, x), err=> err);
    }
}

export module PromiseStuff {
    /**
     * Accepts a Promise/A+ constructor and uses it to create a derived promise based on that implementation, with all the additional members.
     * Use this function to wrap an existing Promise implementation without modifying it.
     * Note that promise implementations that define methods beyond  the Promise/A+ interface may return instances of the base promise, instead of the derived one.
     * @param {BasicPromiseConstructor} constructor The promise constructor used to create the derived promise.
     * @returns {ExtendedPromiseConstructor}
     */
    export function deriveNew(constructor : PromiseConstructorLike) {
        class ExtendedPromise<T> extends constructor<T> {
            then(a, b) {
                return new ExtendedPromise<T>((resolve, reject) => {
                    super.then(a, b).then(resolve, reject);
                });
            }

            cast() {
                return this;
            }
        }

        Object.setPrototypeOf(ExtendedPromise, constructor);
        for (let k of Object.keys(Operators)) {
            let f = Operators[k];
            if (!(f.name in ExtendedPromise.prototype)) {
                ExtendedPromise.prototype[f.name] = function(...args) {
                    return f(this, ...args);
                }
            }
        }

        let operators = Operators.For(constructor);

        for (let k of Object.keys(StaticOperators.prototype)) {
            if (!(k in ExtendedPromise)) {
                ExtendedPromise[k] = function(...args) {
                    return operators[k](...args);
                };
            }
        }

        return ExtendedPromise as any as ExtendedPromiseConstructor;
    }

    /**
     * Accepts an existing Promise/A+ constructor and extends the constructor itself and its prototype with all the available methods.
     * Calling this method on a Promise mutates it.
     * @param {BasicPromiseConstructor} s
     */
    export function extendExisting(s : PromiseConstructorLike) {
        for (let k of Object.keys(Operators)) {
            let f = Operators[k];
            if (!(f.name in s.prototype)) {
                s.prototype[f.name] = function(...args : any[]) {
                    return f(this, ...args);
                }
            }
        }
        s.prototype.cast = function() {
            return this;
        };
        let keySource = StaticOperators.prototype;
        let impl = Operators.For(s);
        for (let k of Object.getOwnPropertyNames(keySource)) {
            if (k === "constructor") continue;
            let f = impl[k];
            if (!(f.name in s)) {
                s[f.name] = function(...args : any[]) {
                    return impl[f.name](...args);
                };
            }
        }


    }
}

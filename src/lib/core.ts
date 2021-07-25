/**
 * @module promise-stuff
 */ /** */
import {BasicPromiseConstructor, ExtendedPromiseConstructor} from "./definitions";
import {StaticOperators} from "./static-operators";
import {Operators} from "./operators";

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
        if (!("finally" in ExtendedPromise.prototype)) {
            (ExtendedPromise.prototype as any).finally = (ExtendedPromise.prototype as any).lastly;
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

/**
 * @module promise-stuff
 */ /** */
import {BasicPromise, BasicPromiseConstructor} from "./definitions";
import {isPromiseLike, makeRejectingPromise, makeResolvingPromise, normalizeTime} from "./common";

export class StaticOperators<P extends BasicPromise<any>> {
    private ctor: BasicPromiseConstructor<P>;

    constructor(ctor: BasicPromiseConstructor<P>) {
        this.ctor = ctor;
    }

    /**
     * Static version of the `wait` function.
     * @see [[ExtendedPromiseConstructor.wait]]
     * @param {number | Date} time
     * @param {T} value
     * @returns {P}
     */
    wait<T = any>(time: number | Date, value ?: T): P {
        time = Math.max(0, normalizeTime(time));
        return new this.ctor((resolve, reject) => {
            setTimeout(() => {
                resolve(value);
            }, time);
        });
    }

    /**
     * Static version of the `soon` function.
     * @see [[ExtendedPromiseConstructor.soon]]
     * @param {(() => T) | (() => PromiseLike<T>)} action
     * @returns {P}
     */
    soon<T = any>(action: ((() => T) | (() => PromiseLike<T>))): P {
        return new this.ctor((resolve, reject) => {
            resolve();
        }).then(() => action()) as P;
    }

    /**
     * Static version of the `never` function.
     * @see [[ExtendedPromiseConstructor.soon]]
     * @returns {P}
     */
    never(): P {
        return new this.ctor((resolve, reject) => {

        });
    }

    /**
     * Static version of the `create` function.
     * @see [[ExtendedPromiseConstructor.create]]
     * @param {(resolve: (value: T) => void, reject: (reason: any) => void) => (void | PromiseLike<void>)} executor
     * @returns {P}
     */
    create<T = any>(executor: (resolve: (value: T) => void, reject: (reason: any) => void) => void | PromiseLike<void>): P {
        return new this.ctor((resolve, reject) => {
            try {
                let result = executor(resolve, reject) as any;
                if (isPromiseLike(result)) {
                    result.then(undefined, err => {
                        reject(err);
                    });
                }
            }
            catch (err) {
                reject(err);
            }
        })
    }

    /**
     * Static version of the `from` function.
     * @param {PromiseLike<T>} other
     * @returns {P}
     * @see [[ExtendedPromiseConstructor.from]]
     */
    from<T = any>(other: PromiseLike<T>): P {
        return new this.ctor((resolve, reject) => {
            other.then(resolve, reject);
        });
    }

    /**
     * Creates a new instance of the StaticOperators class.
     * @param {BasicPromiseConstructor<P extends BasicPromise<any>>} ctor The promise constructor wrapped by the static operator module.
     * @returns {StaticOperators<BasicPromise<any>>}
     */
    static create<P extends BasicPromise<any>>(ctor: BasicPromiseConstructor<P>) {
        return new StaticOperators(ctor);
    }
}
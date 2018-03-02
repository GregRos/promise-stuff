/**
 * @module promise-stuff
 */ /** */
import {BasicPromise, BasicPromiseConstructor} from "./definitions";
import {isPromiseLike, makeRejectingPromise, makeResolvingPromise, normalizeTime} from "./common";

export class StaticOperators<P extends BasicPromise> {
    private ctor: BasicPromiseConstructor<P>;

    constructor(ctor: BasicPromiseConstructor<P>) {
        this.ctor = ctor;
    }

    wait<T = any>(time: number | Date, value ?: T): P {
        time = Math.max(0, normalizeTime(time));
        return new this.ctor((resolve, reject) => {
            setTimeout(() => {
                resolve(value);
            }, time);
        });
    }

    soon<T = any>(action: ((() => T) | (() => PromiseLike<T>))): P {
        return new this.ctor((resolve, reject) => {
            resolve();
        }).then(() => action());
    }

    never(): P {
        return new this.ctor((resolve, reject) => {

        });
    }

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

    from<T = any>(other: PromiseLike<T>): P {
        return new this.ctor((resolve, reject) => {
            other.then(resolve, reject);
        });
    }

    resolve<T = any>(value: T | PromiseLike<T>): P {
        return makeResolvingPromise(this.ctor, value);
    }

    reject(reason: any): P {
        return makeRejectingPromise(this.ctor, reason);
    }

    static create<P extends BasicPromise>(ctor: BasicPromiseConstructor<P>) {
        return new StaticOperators(ctor);
    }
}
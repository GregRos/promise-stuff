/**
 * @module promise-stuff
 */ /** */

/**
 * An asynchronous callback that handles the value yielded by a promise. The callback returns a promise that another promise will wait on.
 */
import {WithEvents} from "./static-operators";

export type AsyncCallback<T, TResult> = (value : T, wasResolved : boolean) => TResult | PromiseLike<TResult>;


/**
 * Similar to PromiseLike<T>.
 * @see [[PromiseLike<T>]]
 */
export interface BasicPromise<T> {
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): BasicPromise<TResult1 | TResult2>;
}

/**
 * Constructor for a Promise-like object.
 */
export interface BasicPromiseConstructor<P extends BasicPromise<any>> {
    readonly prototype : P;

    new(executor: (resolve: (value?: any | PromiseLike<any>) => void, reject: (reason?: any) => void) => void): P;
}
/**
 * A promise extended with all the extra functionality of 'promise-stuff'.
 */
export interface ExtendedPromise<T> {
    /**
     * A symbol property specifying that this is a promise.
     */
    readonly [Symbol.toStringTag]: string;

    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): Promise<T>

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed. The return type is meant to be `Self<TResult1 | TResult>`.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): Promise<TResult1 | TResult2>;

    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback. The return type is meant to be `Self<T | TResult>`, where `Self` is the current promise type.
     *
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): Promise<T | TResult>;

    /**
     * Returns a promise that waits for `this` to finish for an amount of time depending on the type of `deadline`.
     * If `this` does not finish on time, `onTimeout` will be called. The returned promise will then behave like the promise returned by `onTimeout`.
     * If `onTimeout` is not provided, the returned promise will reject with an Error.
     *
     * Note that any code already waiting on `this` to finish will still be waiting. The timeout only affects the returned promise.
     * @param deadline If a number, the time to wait in milliseconds. If a date, the date to wait for.
     * @param {() => Promise<*>} onTimeout Called to produce an alternative promise once `this` expires. Can be an async function.
     */
    timeout(deadline : number | Date, onTimeout ?: () => PromiseLike<T>) : this;

    /**
     * Returns a promise that acts like `this`, but will finish no earlier than the given time (it will stall if `this` finishes before this time, without resolving or rejecting).
     * @param {number|Date} deadline If a number, the time to wait in milliseconds. If a date, the date to wait for.
     * @returns {Promise<*>}
     */
    stall(deadline : number | Date) : this;

    /**
     * Returns a promise that will wait after `this` has finished, and then finish in the same way (resolving or rejecting).
     * @param {number} time If a number, the number of milliseconds to wait. If a date, the date to delay until.
     */
    delay(time : number | Date) : this;

    /**
     * Returns a promise that will wait on `this` promise followed by the promises (or other objects; see below) in `others`, in order.
     * It will move on to the next promise once a previous finishes with a rejection. If all the promises reject, the returned promise will reject
     * with the last rejection.
     *
     * Each of the arguments in `others` can be:
     * - A function returning a promise, in which case the function will be called once the previous promise rejects, with the reason for the rejection as an argument.
     * - A promise, in which case it will be waited on.
     * - A value, in which case the returned promise resolves with that value.
     * @param {(reason: any) => (Promise)} others One or more arguments used as fallbacks for `this` promise.
     * @returns {this}
     */
    fallback(...others : (((reason : any) => PromiseLike<T>) | PromiseLike<T> | T)[]) : this;

    /**
     * Returns a promise that will race `this` against the promises in `others` and finish in the same way as the first promise that finishes.
     * Handles the rejections of all the promises.
     * @template S
     * @param {ExtendedPromise | T} others The other promises to race against.
     * @returns {ExtendedPromise}
     */
    race(...others : Promise<T> []) : this;

    /**
     * For use in TypeScript. Returns `this` but statically typed as a `Promise<S>`.
     * @template S
     * @returns {ExtendedPromise<S>} The return type is meant to be `Self<S>`, where `Self` is the promise type.
     */
    cast<S>() : ExtendedPromise<S>;

    /**
     * Returns a promise that finishes when `this` does, but in the opposite manner.
     * If `this` resolves, the returned promise rejects with the value. If `this` rejects, the returned promise will resolve with the rejection reason.
     * @template S
     * @returns {ExtendedPromise<S>} The return type is meant to be `Self<S>`, where `Self` is the promise type.
     */
    invert<S>() : ExtendedPromise<S>;

    /**
     * Returns a promise that will await `this` and all the promises in `others` to resolve and yield their results in an array.
     * If a promise rejects, the returned promise will rejection with the reason of the first rejection.
     * @param {Promise<*>} others The other promises that must be resolved with this one.
     * @returns {Promise<*[]>} The return type is meant to be `Self<T[]>`, where `Self` is the promise type.
     */
    and(...others : PromiseLike<T>[]) : ExtendedPromise<T[]>;

    /**
     * Returns a promise that will execute a callback whether `this` resolves or rejects, and then finish the same way.
     * The callback will receive the rejection reason or result as an argument.
     * @param callback The action to perform.
     */
    lastly(callback : AsyncCallback<any, void>) : this;

    /**
     * Returns a promise that will execute the given callback if `this` resolves, and then resolve with the same result.
     * @param callback The callback.
     */
    each(callback : AsyncCallback<T, void>) : this;

    /**
     * Returns a promise that will return `true` if `this` resolves and `false` if `this` rejects. The returned promise always resolves.
     * Calling this method handles rejections by `this`.
     * @returns {Promise<*>} The return type is meant to be `Self<boolean>`, where `Self` is the promise type.
     */
    test() : ExtendedPromise<boolean>;
}

/**
 * A promise constructor extended by all the functionality of `promise-stuff`.
 */
export interface ExtendedPromiseConstructor {

    /**
     * A reference to the prototype.
     */
    readonly prototype: Promise<any>;

    /**
     * Creates a new Promise.
     * @param executor A callback used to initialize the promise. This callback is passed two arguments:
     * a resolve callback used resolve the promise with a value or the result of another promise,
     * and a reject callback used to reject the promise with a provided reason or error.
     */
    new <T>(executor: (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void): ExtendedPromise<T>;

    /**
     * Schedules an action to occur immediately but after current code has finished executing, using the Promise's scheduling mechanism.
     * This is similar to `setTimeout(action, 0)` or `setImmediate(action)`.
     * @template T
     * @param {() => (T | Promise<T>)} action The acion to execute.
     * @returns {Promise<T>} The return type is meant to be `P<T>`, where `P` is the underlying promise type.
     */
    soon<T>(action : () => (T | PromiseLike<T>)) : ExtendedPromise<T>;

    /**
     * Converts the given Promise/A+ implementation into ExtendedPromise promise using this constructor.
     * @param {PromiseLike<T>} other The Promise/A+ implementation.
     * @returns {ExtendedPromise<T>} The return type is meant to be `P<T>`, where `P` is the underlying promise type.
     */
    from<T>(other : PromiseLike<T>) : ExtendedPromise<T>

    /**
     * Returns a promise that will never resolve or reject.
     * @returns {PromiseLike<never>} The return type is meant to be `P<never>`, where `P` is the underlying promise type.
     */
    never() : ExtendedPromise<never>;

    /**
     * Returns a promise that will wait for some time, and then resolve with the value given in `value` (undefined by default).
     * @param {number | Date} deadline If a number, the milliseconds to wait. If a date, the date to wait for.
     * @param {T} value The value to resolve with.
     * @template T
     * @returns {PromiseLike<T>} The return type is meant to be `P<T>`, where `P` is the underlying promise type.
     */
    wait<T = void>(deadline : number | Date, value ?: T) : ExtendedPromise<T>;

    /**
     * Constructs a new promise, similarly to the Promise constructor. The main difference is that `definition` itself may return a promise (or be async).
     * If the promise returned by `definition` rejects, the returned promise will also reject. Normally, this would cause the returned promise to hang.
     * @template T
     * @param {(resolve: (x: T) => void, reject: (y: T) => void) => (void | PromiseLike<void>)} executor
     * @returns {PromiseLike<T>} The return type is meant to be `P<T>`, where `P` is the underlying promise type.
     */
    create<T>(executor : (resolve : ((x : T) => void), reject : ((y : T) => void)) => void | Promise<void>) : ExtendedPromise<T>;

    eventOnce<TEvent extends string, TTarget extends WithEvents<TEvent>>(target : TTarget, event : TEvent) : ExtendedPromise<any>;
}





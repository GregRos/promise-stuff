/**
 * A handler that is used to project or filter promises. The handler can either be synchronous or asynchronous.
 * If it is asynchronous, a promise that calls it will wait for it to finish, so it can delay it resolving or rejecting.
 */
export type AsyncCallback<T, TResult> = (value : T, wasResolved : boolean) => TResult | PromiseLike<TResult>;

export interface BasicPromise {
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = any, TResult2 = never>(onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): any;
}

export interface BasicPromiseConstructor<P extends BasicPromise> {
    readonly prototype : P;

    new(executor: (resolve: (value?: any | PromiseLike<any>) => void, reject: (reason?: any) => void) => void): P;
}

export interface ExtendedPromise<T> {
    readonly [Symbol.toStringTag]: "Promise";

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): ExtendedPromise<TResult1 | TResult2>;

    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): ExtendedPromise<T | TResult>;
    /**
     * Returns a promise that waits for `this` to finish for an amount of time depending on the type of `deadline`.
     * If `this` does not finish on time, `onTimeout` will be called. The returned promise will then behave like the promise returned by `onTimeout`.
     * If `onTimeout` is not provided, the returned promise will reject with an Error.
     *
     * Note that any code already waiting on `this` to finish will still be waiting. The timeout only affects the returned promise.
     * @param deadline If a number, the time to wait in milliseconds. If a date, the date to wait for.
     * @param {() => Promise<*>} onTimeout Called to produce an alternative promise once `this` expires. Can be an async function.
     */
    timeout(deadline : number | Date, onTimeout ?: () => PromiseLike<T>) : ExtendedPromise<T>;

    /**
     * Returns a promise that acts like `this`, but will finish no earlier than the given time (it will stall if `this` finishes before this time, without resolving or rejecting).
     * @param {number|Date} deadline If a number, the time to wait in milliseconds. If a date, the date to wait for.
     * @returns {Promise<*>}
     */
    stall(deadline : number | Date) : ExtendedPromise<T>;

    /**
     * Returns a promise that will wait after `this` has finished, and then finish in the same way (resolving or rejecting).
     * @param {number} time If a number, the number of milliseconds to wait. If a date, the date to delay until.
     */
    delay(time : number | Date) : ExtendedPromise<T>;

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
     * @returns {Promise}
     */
    fallback(...others : (((reason : any) => PromiseLike<T>) | PromiseLike<T> | T)[]) : ExtendedPromise<T>;

    /**
     * Returns a promise that will race `this` against the promises in `others` and finish in the same way as the first promise that finishes.
     * Handles the rejections of all the promises.
     * @template S
     * @param {Promise | T} others The other promises to race against.
     * @returns {Promise}
     */
    race(...others : Promise<T> []) : ExtendedPromise<T>;

    /**
     * For use in TypeScript. Returns `this` but statically typed as a `Promise<S>`.
     * @template S
     * @returns {Promise<S>}
     */
    cast<S>() : ExtendedPromise<S>;

    /**
     * Returns a promise that finishes when `this` does, but in the opposite manner.
     * If `this` resolves, the returned promise rejects with the value. If `this` rejects, the returned promise will resolve with the rejection reason.
     * @template S
     */
    invert<S>() : ExtendedPromise<S>;

    /**
     * Returns a promise that will await `this` and all the promises in `others` to resolve and yield their results in an array.
     * If a promise rejects, the returned promise will rejection with the reason of the first rejection.
     * @param {Promise<*>} others
     * @returns {Promise<*[]>}
     */
    and(...others : PromiseLike<T>[]) : ExtendedPromise<T[]>;

    /**
     * Returns a promise that will execute a callback whether `this` resolves or rejects, and then finish the same way.
     * The callback will receive the rejection reason or result as an argument.
     * @param callback The action to perform.
     */
    lastly(callback : AsyncCallback<any, void>) : ExtendedPromise<T>;

    /**
     * Returns a promise that will execute the given callback if `this` resolves, and then resolve with the same result.
     * @param callback The callback.
     */
    each(callback : AsyncCallback<T, void>) : ExtendedPromise<T>;

    /**
     * Returns a promise that will return `true` if `this` resolves and `false` if `this` rejects. The returned promise always resolves.
     * Calling this method handles rejections by `this`.
     * @returns {Promise<*>}
     */
    test() : ExtendedPromise<boolean>;
}

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
     * @returns {Promise<T>}
     */
    soon<T>(action : () => (T | PromiseLike<T>)) : ExtendedPromise<T>;

    /**
     * Converts the given Promise/A+ implementation into ExtendedPromise promise using this constructor.
     * @param {PromiseLike<T>} other The Promise/A+ implementation.
     * @returns {ExtendedPromise<T>}
     */
    from<T>(other : PromiseLike<T>) : ExtendedPromise<T>

    /**
     * Returns a promise that will never resolve or reject.
     * @returns {PromiseLike<never>}
     */
    never() : ExtendedPromise<never>;

    /**
     * Returns a promise that will wait for some time, and then resolve with the value given in `value` (undefined by default).
     * @param {number | Date} deadline If a number, the milliseconds to wait. If a date, the date to wait for.
     * @param {T} value The value to resolve with.
     * @template T
     * @returns {PromiseLike<T>}
     */
    wait<T = void>(deadline : number | Date, value ?: T) : ExtendedPromise<T>;

    /**
     * Constructs a new promise, similarly to the Promise constructor. The main difference is that `definition` itself may return a promise (or be async).
     * If the promise returned by `definition` rejects, the returned promise will also reject. Normally, this would cause the returned promise to hang.
     * @template T
     * @param {(resolve: (x: T) => void, reject: (y: T) => void) => (void | PromiseLike<void>)} executor
     * @returns {PromiseLike<T>}
     */
    create<T>(executor : (resolve : ((x : T) => void), reject : ((y : T) => void)) => void | Promise<void>) : ExtendedPromise<T>;
}





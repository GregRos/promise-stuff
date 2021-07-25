import test from 'ava';
import {describe} from 'ava-spec';

import {Operators} from "../../lib";
import {PromiseStuff} from "../../lib/core";
import {ExtendedPromiseConstructor} from "../../lib/definitions";
import {StaticOperators} from "../../lib/static-operators";
import {EventEmitter} from "events";
PromiseStuff.extendExisting(Promise);
let ExtendedPromise = Promise as any as ExtendedPromiseConstructor;

const from = ExtendedPromise.from;
const fromAsync = (f) => from(f());

class InternalError extends Error {

}

let resolveAfter3s =<T>(v ?: T) => from(new Promise((resolve, reject) => {
    setTimeout(() => {
        resolve(v);
    }, 3000);
}));
let rejectAfter3s = <T>(v ?: any) => from(new Promise((resolve, reject) => {
    setTimeout(() => {
        reject(v);
    }, 3000);
}));

test("finally", async t => {
    const x = rejectAfter3s(new Error());
    let a = 1;
    await x.finally(() => a = 5).catch(() => {});
    t.is(a, 5);
})

test("and", async t => {
    let two = await resolveAfter3s(1).and(resolveAfter3s(1));
    t.deepEqual(two, [1, 1]);
});

test("cast", async t => {
    let o = {};
    let two = resolveAfter3s(o).cast();
    t.is(await two, o);
});

test("wait", async t => {
    let firstDone = false;
    let secondDone = false;

    setTimeout(() => {
        firstDone = true;
    }, 498);
    let wait = ExtendedPromise.wait(498);
    setTimeout(() => {
        secondDone = true;
    }, 550);
    await wait;
    t.deepEqual(firstDone, true);
    t.deepEqual(secondDone, false);
});

describe("timeout", it => {
    it("success", async t => {
        let p = resolveAfter3s(1);
        let pt = p.timeout(new Date(Date.now() + 3500), () => Promise.reject(null));
        t.deepEqual(await pt, 1);
    });

    it("fail+resolve", async t => {
        let p = resolveAfter3s(1);
        let pt = await p.timeout(new Date(Date.now() + 100), () => Promise.resolve(null));
        t.deepEqual(pt, null);
    });

    it("fail + reject", async t => {
        let p =resolveAfter3s(1);
        let err = new InternalError();
        await t.throws(p.timeout(new Date(Date.now() + 100), () => Promise.reject(err)), InternalError);
    });
});

test("soon", async t => {
    let start = Date.now();
    let end = await ExtendedPromise.soon(() => Date.now());
    t.true(end - start <= 50);
});

test("never", async t => {
    let p = resolveAfter3s(1);
    let never = ExtendedPromise.never();
    let fst = await Promise.race([p, never]);
    t.deepEqual(fst, 1);
});

describe("create", it => {
    it("resolves", async t => {
        let p = await ExtendedPromise.create(async (resolve, reject) => {
            resolve(5);
        });
        t.deepEqual(p, 5);
    });

    it("rejects", async t => {
        let err = new InternalError();
        let p = ExtendedPromise.create(async (resolve, reject) => {
            reject(err);
        });
        await t.throws(p, InternalError);
    });

    it("executor rejects", async t => {
        let err = new InternalError();
        let p = ExtendedPromise.create(async (resolve, reject) => {
            throw err;
        });

        await t.throws(p, InternalError);
    })
});

describe("delay", it => {
    it("delay", async t => {
        let x = resolveAfter3s(5).delay(1000);
        let start = Date.now();
        let r  = await x;
        t.deepEqual(r, 5);
        let dif = Date.now() - start;
        t.true(dif >= 3995 && dif <= 4050);
    })
});

describe("eventOnce", it => {
    it("EventEmitter", async t => {
        let ee = new EventEmitter();
        let p = await ExtendedPromise.eventOnce(ee, "Hello").timeout(3000, () => Promise.resolve("TimedOut"));
        t.deepEqual(p, "TimedOut");
        let q = ExtendedPromise.eventOnce(ee, "Hello");
        ee.emit("Hello", "Hello");
        t.deepEqual(await q, "Hello");
        ee.emit("Hello", "Goodbye");
        t.deepEqual(await q, "Hello");
    });
})




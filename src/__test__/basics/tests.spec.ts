import test from 'ava';
import {Operators} from "../../lib";
import {PromiseStuff, StaticOperators} from "../../lib/implementation";
import {ExtendedPromiseConstructor} from "../../lib/definitions";

PromiseStuff.extendExisting(Promise);
let ExtendedPromise = Promise as any as ExtendedPromiseConstructor;

const from = ExtendedPromise.from;
const fromAsync = (f) => from(f());


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

test("timeout", async t => {

});



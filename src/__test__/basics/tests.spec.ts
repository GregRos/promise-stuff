import test from 'ava';
import {Operators} from "../../lib";
import {StaticOperators} from "../../lib/implementation";

const PromiseHelpers = StaticOperators.create(Promise);

let p = (async() => {return 5;})().and().then(x => x[0]);

let x : Promise<number> = p;

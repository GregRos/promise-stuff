# Promise-stuff
*Because promises can use a lot more stuff!*

[![npm](https://badge.fury.io/js/promise-stuff.svg )](https://www.npmjs.com/package/promise-stuff)

[API](https://gregros.github.io/promise-stuff/modules/promise_stuff.html)

`promise-stuff` is an awesome little library that adds extra functionality to your promises. It can be installed on any promise implementation or used as a set of static functions. 

## Using `promise-stuff`
There are a few ways of using the functions offerred by promise stuff.

### As operators
Here is an example:

	import {Operators} from 'promise-stuff'
	let p = new Promise(...);
	let result = Operators.lastly(p, x => {
		//cleanup
	});

These operators return a promise of exactly the same type as the original.

### Create a new, derived promise
Create a new promise constructor from an existing one, like a native `Promise` or a different implementation.

	import {PromiseStuff} from 'promise-stuff';
	export MyExtendedPromise = PromiseStuff.deriveNew(Promise);
	let newPromise = new MyExtendedPromise(...); //promise constructor
	newPromise.lastly(x => {
		//cleanup
	});

### Install on an existing promise

	import {PromiseStuff} from 'promise-stuff';
	PromiseStuff.extendExisting(Promise);
	let pr = new Promise(...);
	pr.lastly(x => {
		//cleanup
	});

## Examples

## `Promise-stuff-es6`
[![npm](https://badge.fury.io/js/promise-stuff-es6.svg )](https://www.npmjs.com/package/promise-stuff-es6)

This is a small package designed to integrate `promsise-stuff` into the native ES6 promise by doing:

    PromiseStuff.extendExisting(Promise);



# Promise-stuff
*Because promises can use a lot more stuff!*

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
	newPromise.finally(x => {
		//cleanup
	});

### Install on an existing promise

	import {PromiseStuff} from 'promise-stuff';
	PromiseStuff.extendExisting(Promise);
	let pr = new Promise(...);
	pr.finally(x => {
		//cleanup
	});

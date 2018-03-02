import {Operators} from "../lib/operators";


let p = (async() => {return 5})();

Operators.each(p, () => {}).invert();

let ct = Operators.For<Promise<boolean>>(Promise );



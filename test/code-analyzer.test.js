import assert from 'assert';
import { parseCode } from '../src/js/code-analyzer';
import { traverse } from '../src/js/code-analyzer';
import { to_test } from '../src/js/code-analyzer';
import { init } from '../src/js/code-analyzer';
import { handle_string } from '../src/js/code-analyzer';

describe('The javascript parser', () => {
    it('TEST1', () => {
        assert.equal(to_test(parseCode(
            //input:
            `function foo(x, y, z){
                let a = x + 1;
                let b = a + y;
                let c = 0;
                
                while (a < z) {
                    c = a + b;
                    z = c * 2;
                }
                
                return z;
            }`), [["x", "1"], ["y", "2"], ["z", "3"]]),
            //res:
            `function foo(x, y, z) {\n    while (x + 1 < z) {\n        z = (x + 1 + (x + 1 + y)) * 2;\n    }\n    return z;\n}`
        );
    })
});



describe('The javascript parser', () => {
    it('TEST2', () => {
        assert.equal(to_test(parseCode(
            //input:
            `function foo(x, y, z){
                let a = x + 1;
                let b = a + y;
                let c = 0;
                
                if (b < z) {
                    c = c + 5;
                    return x + y + z + c;
                } else if (b < z * 2) {
                    c = c + x + 5;
                    return x + y + z + c;
                } else {
                    c = c + z + 5;
                    return x + y + z + c;
                }
            }`), [["x", "1"], ["y", "2"], ["z", "3"]]),
            //res:
            `function foo(x, y, z) {\n    if (x + 1 + y < z) {\n        return x + y + z + (x + 1 + (x + 1 + y) + 5);\n    } else if (x + 1 + y < z * 2) {\n        return x + y + z + (x + 1 + (x + 1 + y) + x + 5);\n    } else {\n        return x + y + z + (x + 1 + (x + 1 + y) + z + 5);\n    }\n}`
        );
    })
});

describe('The javascript parser', () => {
    it('TEST3', () => {
        assert.equal(to_test(parseCode(
            //input:
            `function foo(x, y, z){
                let a = x + 1;
                let b = a + y;
                let c = 0;
                z = z + 5
                
                if (b < z) {
                    c = c + 5;
                    return x + y + z + c;
                } else if (b < z * 2) {
                    c = c + x + 5;
                    return x + y + z + c;
                } else {
                    c = c + z + 5;
                    return x + y + z + c;
                }
            }`), [["x", "1"], ["y", "2"], ["z", "3"]]).replace(/\s+/g, ''),
            //res:
            `functionfoo(x,y,z){z=z+5;if(x+1+y<z){returnx+y+z+(x+1+(x+1+y)+x+5+5);}elseif(x+1+y<z*2){returnx+y+z+(x+1+(x+1+y)+x+5+x+5);}else{returnx+y+z+(x+1+(x+1+y)+x+5+z+5);}}`.replace(/\s+/g, '')
        );
    })
});

describe('The javascript parser', () => {
    it('TEST4', () => {
        assert.equal(traverse(parseCode(
            //input:
            `function foo(x, y, z){
                let a = x + 1;
                let b = a + y[0];
                let c = 0;
                
                if (b < z) {
                    c = c + 5;
                    return x + y[0] + z + c;
                } else if (b < z * 2) {
                    c = c + x + 5;
                    return x + y[0] + z + c;
                } else {
                    c = c + z + 5;
                    return x + y[0] + z + c;
                }
            }`), [["x", "1"], ["y", "[2]"], ["z", "3"]]).replace(/\s+/g, ''),
            //res:
            `<fontsize=\"4\">functionfoo(x,y,z){<fontsize=\"5\"><b><fontcolor=\"red\">if(</font></b></font><fontsize=\"5\"><b><fontcolor=\"red\">x+1+y<z</font></b></font><fontsize=\"5\"><b><fontcolor=\"red\">)</font></b></font>{returnx+y[0]+z+(x+1+(x+1+y)+x+5+x+5+5);}else<fontsize=\"5\"><b><fontcolor=\"green\">if(</font></b></font><fontsize=\"5\"><b><fontcolor=\"green\">x+1+y<z*2</font></b></font><fontsize=\"5\"><b><fontcolor=\"green\">)</font></b></font>{returnx+y[0]+z+(x+1+(x+1+y)+x+5+x+5+x+5);}else{returnx+y[0]+z+(x+1+(x+1+y)+x+5+x+5+z+5);}}</font>`.replace(/\s+/g, '')
        );
    })
});

describe('The javascript parser', () => {
    it('TEST5', () => {
        assert.equal(to_test(parseCode(
            //input:
            `function foo(x, y){
                let arr = [x , y];
                return arr[0];
            }`), [["x", "1"], ["y", "2"], ["z", "3"]]).replace(/\s+/g, ''),
            //res:
            `functionfoo(x,y){returnarr[0];}`.replace(/\s+/g, '')
        );
    })
});

describe('The javascript parser', () => {
    it('TEST6', () => {
        assert.equal(to_test(parseCode(
            //input:
            `function foo(x, y){
                let arr = [x , y];
                if(x){                     
                     return arr[0];
                }
                else return arr[1];
            }`), [["x", "true"], ["y", "false"]]).replace(/\s+/g, ''),
            //res:
            `functionfoo(x,y){if(x){returnx;}elsereturny;}`.replace(/\s+/g, '')
        );
    })
});

describe('The javascript parser', () => {
    it('TEST7', () => {
        assert.equal(to_test(parseCode(
            //input:
            `function foo(x, y){
                let arr = [x , y];
                if(x){                     
                     return arr[0];
                }
                return arr[1];
            }`), [["x", "true"], ["y", "false"]]).replace(/\s+/g, ''),
            //res:
            `functionfoo(x,y){if(x){returnx;}returny;}`.replace(/\s+/g, '')
        );
    })
});

describe('The javascript parser', () => {
    it('TEST8', () => {
        assert.equal(to_test(parseCode(
            //input:
            `function binarySearch(X, V, n){
                let low = 0;
                let high = 0;
                let mid = 0;
                low = 0;
                high = n - 1;
                while (low <= high) {
                    mid = (low + high)/2;
                    if (X < V[mid]){
                        high = mid - 1;}
                    else if (X > V[mid]){
                        low = mid + 1;}
                    else
                        return mid;
                }
                return -1;
            }`), [["X", "2"], ["V", "3"] , ["n", "4"]]).replace(/\s+/g, ''),
            //res:
            `functionbinarySearch(X,V,n){while(0<=n-1){if(X<V[(0+0)/2]){}elseif(X>V[0]){}elsereturn0;}return-1;}`.replace(/\s+/g, '')
        );
    })
});

describe('The javascript parser', () => {
    it('TEST9', () => {
        assert.equal(to_test(parseCode(
            //input:
            `function foo(x , y){
                for(let i=0; i < y ; i++){ 
                }
                return x;
                }`), [["x", "1"], ["y", "2"] , ["z", "3"]]).replace(/\s+/g, ''),
            //res:
            `functionfoo(x,y){for(;i<y;i++){}returnx;}`.replace(/\s+/g, '')
        );
    })
});

describe('The javascript parser', () => {
    it('TEST10', () => {
        assert.equal(to_test(parseCode(
            //input:
            `function foo(x , y){
                let arr = [ 1 , 2 ];
                arr[0] = 3;
                return x;
                
                }`), [["x", "1"], ["y", "2"] , ["z", "3"]]).replace(/\s+/g, ''),
            //res:
            `functionfoo(x,y){returnx;}`.replace(/\s+/g, '')
        );
    })
});

describe('The javascript parser', () => {
    it('TEST11', () => {
        assert.equal(init({type: "Expression"}), undefined)
    })
    });


describe('The javascript parser', () => {
        it('TEST13', () => {
            assert.equal(handle_string("true"), true)
        })
        });

describe('The javascript parser', () => {
        it('TEST13', () => {
            assert.equal(handle_string("false"), false)
        })
        });
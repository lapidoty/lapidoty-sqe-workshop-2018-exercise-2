import * as esprima from 'esprima';
import * as escodegen from 'escodegen';
import * as local_escodegen from '../../local_escodegen';
const cloneDeep = require('clone-deep');
var astEval = require('static-eval');

let old_locals = new Map();
let new_locals = new Map();
let input_vector = new Map();
let current_locals = new_locals;
let isAssignment = false;
let true_path = true;
let subMode = false;

const parseCode = (codeToParse) => {
    return esprima.parseScript(codeToParse);
};

export function to_test(jsonObj , vector) { 
    input_vector = new Map(vector);
    //console.log(jsonObj);
    let program = Program(jsonObj);
    //console.log(program);
    return local_escodegen.generate(program).trim();
}

export function traverse(jsonObj) {
    //console.log(jsonObj);
    let program = Program(jsonObj);
    //console.log(program);
    return local_escodegen.generate(program).fontsize(4);
}

function Program(program) {
    return {
        type: 'Program',
        body: filtered(StatementListItem(program.body)),
        sourceType: 'script',
    };
}

/*********** Statements ***********/
function StatementListItem(body) {

    return body.map((p) => Statement(p));
}

function Statement(statement) {
    switch (statement.type) {
    case 'ExpressionStatement': return ExpressionStatement(statement);
    case 'ReturnStatement': return ReturnStatement(statement);
    case 'BlockStatement': return BlockStatement(statement);
    default: return ConditionStatement(statement);
    }
}

function ConditionStatement(statement) {
    switch (statement.type) {
    case 'IfStatement': return IfStatement(statement);
    case 'WhileStatement': return WhileStatement(statement);
    case 'ForStatement': return ForStatement(statement);
    default: return DeclarationStatement(statement);
    }
}

function DeclarationStatement(statement) {
    switch (statement.type) {
    case 'VariableDeclaration': return VariableDeclaration(statement);
    case 'FunctionDeclaration': return FunctionDeclaration(statement);
    }
}

function FunctionDeclaration(functionDeclaration) {

    return {
        type: 'FunctionDeclaration',
        id: Identifier(functionDeclaration.id),
        params: FunctionParameter(functionDeclaration.params),
        body: Statement(functionDeclaration.body),
        generator: functionDeclaration.generator,
        expression: functionDeclaration.expression,
        async: functionDeclaration.async,
    };
}

function VariableDeclaration(declaration) {

    let declarations = {
        type: 'VariableDeclaration',
        declarations: VariableDeclarator(declaration.declarations),
        kind: declaration.kind,
    };
    handleDeclarations(declarations);
    return null;
}

function handleDeclarations(declarations) {
    declarations.declarations.map((declaration) => handleOneDeclartion(declaration));

}

function handleOneDeclartion(declaration) {

    new_locals.set(declaration.id.name, declaration.init);
    old_locals = cloneDeep(new_locals);
}

function VariableDeclarator(declaration) {
    return declaration.map(function make(d) {
        return {
            type: 'VariableDeclarator',
            id: Identifier(d.id),
            init: Expression(d.init),
        };
    });

}

function AssignmentExpression(expression) {
    isAssignment = true;
    let left = Expression(expression.left);
    isAssignment = false;
    let right = Expression(expression.right);
    let ass = {
        type: 'AssignmentExpression',
        operator: expression.operator,
        left: left,
        right: right,
    };
    if (ass.left.type === 'MemberExpression') handle_array(ass);
    else if (isLocal(ass.left.name)) handle_normal(ass);
    else { input_vector.set(ass.left.name, escodegen.generate(esprima.parse(evaluate(ass.right).toString()).body[0].expression)); return ass;}
}

function IfStatement(statement) {
    let test = Expression(statement.test);
    true_path = (true_path === true) ? handle_string(evaluate(test)) : true_path;
    let color = (true_path === true) ? 'green' : 'red';
    current_locals = cloneDeep(old_locals);
    let consequent = Statement(statement.consequent); let alternate = null;
    current_locals = cloneDeep(old_locals);
    if (statement.alternate !== null) {true_path = !true_path; alternate = Statement(statement.alternate); }
    else {true_path = true;}
    old_locals = cloneDeep(new_locals);
    current_locals = cloneDeep(new_locals);
    let node = {
        type: 'IfStatement',
        test: test,
        consequent: consequent,
        alternate: alternate,
        color: color
    };
    return node;
}

function BlockStatement(statement) {
    return {
        type: 'BlockStatement',
        body: filtered(statement.body.map((s) => Statement(s))),
    };
}

function WhileStatement(statement) {
    let test = Expression(statement.test);

    true_path = evaluate(test);
    current_locals = cloneDeep(old_locals);

    return {
        type: 'WhileStatement',
        test: test,
        body: Statement(statement.body),
    };
}

function ForStatement(statement) {
    return {
        type: 'ForStatement',
        init: init(init),
        test: Expression(statement.test),
        update: Expression(statement.update),
        body: Statement(statement.body),
    };
}

function ExpressionStatement(statement) {

    let s = {
        type: 'ExpressionStatement',
        expression: Expression(statement.expression),
        directive: statement.string,
    };
    if (s.expression != null)
        return s;
    else return null;
}

function ReturnStatement(statement) {
    return {
        type: 'ReturnStatement',
        argument: Expression(statement.argument),
    };
}


/*********** Expressions ***********/

function Expression(expression) {
    switch (expression.type) {
    case 'Identifier': return Identifier(expression);
    case 'Literal': return Literal(expression);
    case 'AssignmentExpression': return AssignmentExpression(expression);
    default: return RecurseiveExpression(expression);
    }
}

function RecurseiveExpression(expression) {
    switch (expression.type) {
    case 'BinaryExpression': return BinaryExpression(expression);
    case 'MemberExpression': return MemberExpression(expression);
    case 'UnaryExpression': return UnaryExpression(expression);
    default: return split(expression);
    }
}

function split(expression) {
    switch (expression.type) {
    case 'UpdateExpression': return UpdateExpression(expression);
    case 'ArrayExpression': return ArrayExpression(expression);
    }
}

function Identifier(expression) {
    if (subMode) return vector_substition(expression);
    else {
        let value = current_locals.get(expression.name);
        if (value === undefined || isAssignment) {
            return {
                type: 'Identifier',
                name: expression.name,
            };
        }
        else { return value; }
    }
}

function Literal(expression) {
    return {
        type: 'Literal',
        value: expression.value,
        raw: expression.raw,
    };
}

function BinaryExpression(expression) {
    return {
        type: 'BinaryExpression',
        operator: expression.operator,
        left: Expression(expression.left),
        right: Expression(expression.right),
    };
}

function ArrayExpression(expression) {
    return {
        type: 'ArrayExpression',
        elements: filtered(expression.elements.map((s) => Expression(s)))
    };
}

function MemberExpression(expression) {
    let node = {
        type: 'MemberExpression',
        computed: expression.computed,
        object: Expression(expression.object),
        property: Expression(expression.property),
    };
    let array = []; let value;
    if (node.object.type !== 'ArrayExpression'){ 
        array = current_locals.get(node.object.name); 
        if( array === undefined ) return node;
    }
    else array = node.object;
    let saveMode = subMode;
    value = array.elements[evaluate(node.property)];
    subMode = saveMode;
    if (isAssignment) return node;
    else return value;
}

function UnaryExpression(expression) {
    return {
        type: 'UnaryExpression',
        operator: expression.operator,
        argument: Expression(expression.argument),
        prefix: expression.prefix,
    };
}

function UpdateExpression(expression) {
    return {
        type: 'UpdateExpression',
        operator: expression.operator,
        argument: Expression(expression.argument),
        prefix: expression.boolean
    };
}

//*********** Utils ***********/

function FunctionParameter(params) {

    return params.map((p) => Param(p));
}

export function init(init) {
    switch (init.type) {
    case 'Expression': return Expression(init);
    default: null;
    }
}

function Param(param) {

    switch (param.type) {
    case 'Identifier': return Identifier(param);
    }
}

function filtered(array) {
    return array.filter(function (el) {
        return el != null;
    });
}

function isLocal(name) {
    return new_locals.get(name) !== undefined;
}

export function handle_string(t) {

    if (t == 'true') {
        return true;
    }
    else if (t == 'false') {
        return false;
    }
    else {
        return t;
    }
}

function handle_normal(ass) {
    if (true_path) new_locals.set(ass.left.name, ass.right);

    current_locals.set(ass.left.name, ass.right);
}

function handle_array(ass) {
    let name = ass.left.object.name;
    let index = evaluate(ass.left.property);
    let array = current_locals.get(name);
    array.elements[index] = ass.right;
    new_locals.set(name, array);
    current_locals.set(name, array);
}

//*********** Eval and Substition /***********/

function evaluate(exp) {
    subMode = true;
    //console.log(exp)
    let to_return = astEval(Expression(exp));
    subMode = false;
    //console.log(to_return)
    //console.log(to_return)
    return to_return;
}

function vector_substition(expression) {
    let value = input_vector.get(expression.name);
    return esprima.parse(value).body[0].expression;
}

export { parseCode };
export { input_vector };


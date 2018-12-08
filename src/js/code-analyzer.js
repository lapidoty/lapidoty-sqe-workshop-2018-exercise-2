import * as esprima from 'esprima';
import * as escodegen from 'escodegen';
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


export function traverse(jsonObj) {
    //console.log(jsonObj);
    let program = Program(jsonObj);
    //console.log(program);
    return escodegen.generate(program).fontsize(4);
}

function Program(program) {
    return {
        type: 'Program',
        body: FunctionDeclarations(program.body),
        sourceType: 'script',
    };
}

/*********** Statements ***********/

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
        case 'FunctionDeclaration ': return FunctionDeclaration(statement);
        default: null;
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
    }
    handleDeclarations(declarations);
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
        }
    });

}

function AssignmentExpression(expression) {
    isAssignment = true;
    let ass = {
        type: 'AssignmentExpression',
        operator: expression.operator,
        left: Expression(expression.left),
        right: Expression(expression.right),
    };

    if (isLocal(ass.left.name)) {
        if (true_path) {
            new_locals.set(ass.left.name, ass.right);
        }

        current_locals.set(ass.left.name, ass.right);

    }
    else {
        return ass;
    }

}

function IfStatement(statement) {

    let test = Expression(statement.test);
    true_path = evaluate(test);
    let color = (true_path === true) ? "green" : "red"
    current_locals = cloneDeep(old_locals);
    let consequent = Statement(statement.consequent);

    true_path = !true_path;
    current_locals = cloneDeep(old_locals);
    let alternate = Statement(statement.alternate)

    old_locals = cloneDeep(new_locals);


    let node = {
        type: 'IfStatement',
        test: test,
        consequent: consequent,
        alternate: alternate,
        color: color
    }

    return node;

}

function BlockStatement(statement) {
    return {
        type: 'BlockStatement',
        body: filtered(statement.body.map((s) => Statement(s))),
    }
}

function WhileStatement(statement) {
    let test = Expression(statement.test);

    true_path = evaluate(test);
    current_locals = cloneDeep(old_locals);

    return {
        type: 'WhileStatement',
        test: test,
        body: Statement(statement.body),
    }
}

function ForStatement(statement) {
    return {
        type: 'ForStatement',
        init: init(init),
        test: Expression(statement.test),
        update: Expression(statement.update),
        body: Statement(statement.body),
    }
}


function ExpressionStatement(statement) {

    let s = {
        type: 'ExpressionStatement',
        expression: Expression(statement.expression),
        directive: statement.string,
    }
    if (s.expression != null)
        return s;
    else return null;
}


function ReturnStatement(statement) {
    return {
        type: 'ReturnStatement',
        argument: Expression(statement.argument),
    }
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
        case 'UpdateExpression': return UpdateExpression(expression);
        default: null;
    }
}

function Identifier(expression) {
    if (subMode) return vector_substition(expression);
    else {
        let value = current_locals.get(expression.name);
        if (value === undefined || isAssignment) {
            if (isAssignment) isAssignment = false;
            return {
                type: 'Identifier',
                name: expression.name,
            };
        }
        else
            return value;
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

function MemberExpression(expression) {
    return {
        type: 'MemberExpression',
        computed: expression.boolean,
        object: Expression(expression.object),
        property: Expression(expression.property),
    }
}

function UnaryExpression(expression) {
    return {
        type: 'UnaryExpression',
        operator: expression.operator,
        argument: Expression(expression.argument),
        prefix: expression.prefix,
    }
}

function UpdateExpression(expression) {
    return {
        type: 'UpdateExpression',
        operator: expression.operator,
        argument: Expression(expression.argument),
        prefix: expression.boolean
    }
}



//*********** Utils ***********/

function FunctionDeclarations(functions) {
    return functions.map((p) => FunctionDeclaration(p));

}
function FunctionParameter(params) {

    return params.map((p) => Param(p));
}

function init(init) {
    switch (init.type) {
        case 'Expression': return Expression(init);
        case 'VariableDeclaration': return VariableDeclaration(init);
        default: null;
    }
}

function Param(param) {

    switch (param.type) {
        case 'Identifier': return Identifier(param);
        default: null;
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


//*********** Eval and Substition /***********/
function evaluate(exp) {
    subMode = true;
    let to_return = astEval(Expression(exp));
    subMode = false;
    return to_return;
}

function vector_substition(expression) {
    if (!isLocal(expression.name)) {
        let value = input_vector.get(expression.name);
        return {
            type: 'Literal',
            value: value,
            raw: "" + value + "",
        };
    }
}

/*
 function try_to_eval(exp){
    console.log(exp)
    let to_ret;
    let value;
    try {
         value = astEval(exp);
    }
    catch {
        to_ret = exp
    }
    finally{
    if(typeof(value) === "number" || typeof(value) === "boolean" || typeof(value) === "string" ){
        to_ret = {
            type: 'Literal',
            value: value,
            raw: "" + value + "",
        };
    }
    else{
        to_ret = exp
    }
        return to_ret;
    
    }
}
*/

export { parseCode };
export { input_vector };

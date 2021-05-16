var codeLinesList = [];
var variables = {};
const TIMEINTERVAL = 1750;
var counter = 0;
var functions = {};
var stackFrameIndex = 0;

const operators = ["**", "*", "/", "//", "%", "+", "-"];
const precedence = [["**"], ["*", "/", "//", "%"], ["+", "-"]];
const digits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "-", "."];
const booleanOps = ["<", "<=", "==", ">=", ">", "!=", "not", "and", "or"] //in and is?
const builtInFunctions = ["abs", "bool", "divmod", "filter", "float", "int",
            "len", "map", "max", "min", "pow", "print", "range", "str", "sum"];

/*
 * get the code that the user entered and put each line into codeLinesList
 */
function getCode()
{
    let codeLinesString = document.getElementById("yourcode").value;
    codeLinesList = codeLinesString.split("\n");
    //TODO: when looking at strings, make sure that if a string has \n,
    //      concatenate the next element in the array
}

/*
 * start running the program
 */
function runLines()
{
    makeBlocks();
    runBlock(codeLinesList);
}

/*
 * structure codeLinesList for blocks
 * TODO: 1-line if statements/loops
 */
function makeBlocks()
{
    let i = 0;

    while(i < codeLinesList.length)
    {
        let beginning = codeLinesList[i].substring(0, 4);

        //header for a block
        if(beginning === "for " || beginning === "whil" || beginning === "def "
            || beginning.substring(0,3) === "if " || beginning === "elif"
            || beginning === "else")
        {
            let newHashmap = {"header": codeLinesList[i], "lines": []};
            i++;

            //size of indentation
            let indentation = codeLinesList[i].length
                                        - codeLinesList[i].trim().length;

            let indentationString = " ".repeat(indentation);

            //add each indented line to the block's list
            while(i < codeLinesList.length
               && codeLinesList[i].substring(0, indentation) === indentationString)
            {
                newHashmap["lines"].push(codeLinesList[i].substring(indentation));
                codeLinesList.splice(i, 1);
            }

            i--;
            codeLinesList[i] = newHashmap;
        }
        i++;
    }
}

/*
 * run the current block of code, whose lines are in the `array` block
 */
function runBlock(block)
{
    let i = 0;
    let returnValue;

    //go through each line
    while(i < block.length)
    {
        //regular line in this scope
        if(typeof block[i] === "string")
        {
            if(block[i].length == 0 || block[i][0] === "#") { i++; continue; }
            else { returnValue = line(block[i]); }
        }
        //if statement
        else if(block[i]["header"].substring(0, 2) === "if")
        {
            let conditionalStatements = [block[i]];
            let j = 1;

            //add all the elif statements
            while(i + j < block.length && !(typeof block[i+j] === "string")
                   && block[i+j]["header"].substring(0, 4) === "elif")
            {
                conditionalStatements.push(block[i+j]);
                j++;
            }

            //add else statement
            if(i + j < block.length && !(typeof block[i+j] === "string")
                    && block[i+j]["header"].substring(0, 4) === "else")
            {
                conditionalStatements.push(block[i+j]);
                j++;
            }

            i = i + j - 1;

            //call function to run if statement
            runConditional(conditionalStatements);
        }

        //value is a function definition
        else if(block[i]["header"].indexOf("def ") == 0)
        {
            let functionAndArgs
              = block[i]["header"].substring(4, block[i]["header"].length - 1);
            let components = isFunctionCall(functionAndArgs);

            //names of parameters at index 0, lines inside function at index 1
            functions[components[0]] = [components[1], block[i]["lines"]];
        }

        i++;
    }
    return returnValue;
}

/*
 * go through if/elif/else and execute the correct one
 * TODO: returning from a function inside a conditional
 */
function runConditional(blocks)
{
    let conditionalCounter = 0;

    let ifHeader = blocks[0]["header"];
    let ifCondition = ifHeader.substring(3, ifHeader.indexOf(":"));

    //show if block header on screen, play sound
    counter++;
    setTimeout(showCurrLine, counter * TIMEINTERVAL, ifHeader, stackFrameIndex);
    setTimeout(playConditionalSound, counter * TIMEINTERVAL, conditionalCounter);

    counter++;

    //if statement condition is true, so run that block
    if(evaluateBoolean(maybeParseBoolean(ifCondition), false))
    {
        runBlock(blocks[0]["lines"]);
        return;
    }

    conditionalCounter++;
    let i = 1;

    //go through elifs
    while(i < blocks.length && blocks[i]["header"].charAt(2) === "i")
    {
        let elifHeader = blocks[i]["header"];
        let elifCondition = elifHeader.substring(5, elifHeader.indexOf(":"));

        //show elif block header on screen, play sound
        counter++;
        setTimeout(showCurrLine, counter*TIMEINTERVAL, elifHeader, stackFrameIndex);
        setTimeout(playConditionalSound, counter*TIMEINTERVAL, conditionalCounter);

        counter++;

        //elif statement condition is true, so run this block
        if(evaluateBoolean(maybeParseBoolean(elifCondition), false))
        {
            runBlock(blocks[i]["lines"]);
            return;
        }

        conditionalCounter++;
        i++;
    }

    //arrived at this point, so execute the else block
    if(blocks[blocks.length-1]["header"].trim() === "else:")
    {
        conditionalCounter = -1;

        //show else block header on screen
        counter++;
        setTimeout(showCurrLine, counter*TIMEINTERVAL, "else:", stackFrameIndex);

        runBlock(blocks[blocks.length-1]["lines"]);
        return;
    }
}

function extractOutermostParentheses(expression)
{
    let startIndex = expression.indexOf("(");
    let endIndex = expression.length;

    //no parentheses, end recursion
    //if(startIndex == -1) { return expression; }

    let numOpening = 1;
    let numClosing = 0;

    //count the number of opening and closing parentheses
    for(let i = startIndex + 1; i < expression.length; i++)
    {
        if(expression.charAt(i) === "(") { numOpening++; }
        else if(expression.charAt(i) === ")") { numClosing++; }

        if(numOpening == numClosing)
        {
            endIndex = i;
            break;
        }
    }

    return expression.substring(startIndex, endIndex + 1);
}

function extractInnermostParentheses(expression)
{
    //index of first "(" symbol
    let startIndex = expression.indexOf("(");
    let endEndex = expression.length;

    //keep going if we encounter another "(" before the next ")"
    while(true)
    {
        let nextClosingParen = expression.indexOf(")", startIndex);
        let nextOpeningParen = expression.indexOf("(", startIndex + 1);

        //next ")" doesn't have "(" before it
        if(nextClosingParen < nextOpeningParen || nextOpeningParen == -1)
        {
            endIndex = nextClosingParen;
            break;
        }

        startIndex = nextOpeningParen;
    }

    return expression.substring(startIndex + 1, endIndex);
}

/*
 * parse currLine and figure out what it does
 * TODO: add support to evaluate functions
 * TODO: skip comments
 */
function line(currLine)
{
    let result;

    counter++;
    setTimeout(showCurrLine, counter * TIMEINTERVAL, currLine, stackFrameIndex);

    let indexOfEquals = 0;
    let assignVariable = false;
    let varName;
    //line contains a singular 'equals' sign
    if((indexOfEquals = removeStringLiterals(currLine).indexOf("=")) != -1
                         && currLine[indexOfEquals + 1] != "=")
    {
        assignVariable = true;

        //get the name of the variable
        varName = currLine.substring(0, indexOfEquals).trim()
                                                 + "-" + stackFrameIndex;
        //create this new variable if it doesn't already exist here
        if(!(varName in variables))
        {
            variables[varName] = 0;
            counter++;
            setTimeout(showNewVariable, counter * TIMEINTERVAL, varName);
        }

        //figure out what value we're assigning to the variable
        currLine = currLine.substring(indexOfEquals + 1).trim();
    }

    //value is a string, assign that to the variable
    if(isString(currLine)) { result = currLine; }

    //value is a boolean literal
    else if(currLine === "True" || currLine === "False")
        { result = pythonize(currLine); }

    //value is a return statement
    else if(currLine.indexOf("return ") == 0)
        { return evaluate(currLine.substring(7).trim()); }

    //value is an expression
    else { result = evaluate(currLine); }

    if(assignVariable)
    {
        variables[varName] = result;

        counter++;
        setTimeout(showVariableValue, counter * TIMEINTERVAL,
                                    varName, pythonize(variables[varName]));
    }


}

function evaluate(expression)
{
    //check: starts with # -> skip

    //check: variable assignment
    //    - take note of variable name
    //    - get the expression after the =

    //highlight the expression to evaluate
    counter++;
    setTimeout(highlightPortion, counter * TIMEINTERVAL,
                                   expression, "line" + stackFrameIndex, "");

    let result;
    let wasInParens = false;

    //unhighlight the parentheses first
    if(expression.charAt(0) === "("
        && expression === extractOutermostParentheses(expression))
    {
        counter++;
        setTimeout(unhighlightParentheses, counter*TIMEINTERVAL, stackFrameIndex);
        expression = expression.substring(1, expression.length-1);
        wasInParens = true;
    }

    let maybeFunctionCall = isFunctionCall(expression);

    //expression is a single variable
    if(expression + "-" + stackFrameIndex in variables)
    {
        result = variables[expression + "-" + stackFrameIndex];
        counter++;
        setTimeout(replaceValueOnLine, counter * TIMEINTERVAL,
                             expression, pythonize(result), stackFrameIndex);
    }

    //check: function call
    else if(maybeFunctionCall != false)
    {
        let goodSpacing = maybeFunctionCall[0] + "("
                                 + maybeFunctionCall[1].join(", ") + ")";
        console.log(expression, goodSpacing)
        if(!(expression === goodSpacing))
        {
            counter++;
            setTimeout(replaceValueOnLine, counter * TIMEINTERVAL,
                               expression, goodSpacing, stackFrameIndex);
        }
        result = runFunction(maybeFunctionCall[0], maybeFunctionCall[1]);
    }

    else
    {
        let couldBeBoolean = maybeParseBoolean(expression);
        let components = couldBeBoolean;

        //arithmetic expression, no boolean stuff
        if(components.length == 1) { result = doArithmetic(expression); }
        //is boolean expression, evaluate
        else
        {
            setTimeout(playEvaluateBoolSound, counter * TIMEINTERVAL);
            let betterSpacing = flattenBooleanExpr(components);
            if(!(expression === betterSpacing)) //make the spacing better
            {
                counter++;
                setTimeout(replaceValueOnLine, counter * TIMEINTERVAL,
                                  expression, betterSpacing, stackFrameIndex);
            }
            result = evaluateBoolean(components, true);
        }
    }

    if(wasInParens) //remove the parentheses on the screen
    {
        counter++;
        setTimeout(removeParentheses, counter * TIMEINTERVAL, stackFrameIndex);
    }

    return result;
}

/*
 * drives the evaluation of the boolean expression
 */
function evaluateBoolean(components, fromEvaluate)
{
    if(!fromEvaluate) //expression needs to be highlighted and sound played
    {
        counter++;
        setTimeout(playEvaluateBoolSound, counter * TIMEINTERVAL);
        setTimeout(highlightPortion, counter * TIMEINTERVAL,
               flattenBooleanExpr(components), "line" + stackFrameIndex, "");
    }

    let originalComponentsLength = components.length;

    //actual values for non-operator terms not in parentheses
    for(let i = 0; i < components.length; i++)
    {
        //term not an operator
        if(!(booleanOps.includes(components[i])))
        {
            if(components[i] === "False") { components[i] = false; }
            else if(components[i] === "True") { components[i] = true; }

            else
            {
                let parsed = parseFloat(components[i]);
                if(parsed == components[i] + "") { components[i] = parsed; }
            }
        }
    }

    //console.log(components)
    let i = 0;

    while(components.length > 1)
    {
        if(booleanOps.includes(components[i]))
        {
            //
            let soFar = flattenBooleanExpr(components.slice(0, i-1));
            if(components[i] === "not") { soFar = ""; }

            let term1;
            let operator = components[i];
            let term2 = components[i+1];

            if(operator === "not") { term1 = ""; }
            else { term1 = components[i-1]; }

            //need to highlight this part of the expression
            if(originalComponentsLength != 2 && originalComponentsLength != 3)
            {
                let portion = flattenBooleanExpr(components.slice(i-1, i+1));

                counter++;
                setTimeout(highlightPortion, counter * TIMEINTERVAL,
                                   portion, "line" + stackFrameIndex, soFar);
            }

            //do the actual calculation
            let result = getBooleanValue(term1, operator, term2, soFar);

            let booleanResult = result[0];
            let currExpr = result[1];

            //replace result on line and play corresponding sound
            counter++;
            setTimeout(playBooleanResultSound,
                              counter * TIMEINTERVAL, booleanResult);
            setTimeout(replaceBoolean, counter * TIMEINTERVAL,
                                     currExpr, booleanResult, stackFrameIndex);

            //replace array with the calculated value
            if(operator === "not") {components[i] = booleanResult; }
            else { components[i-1] = booleanResult; }

            //remove the remainder of this expression
            if(operator === "not") { components.splice(i+1, 1); }
            else { components.splice(i, 2); }

            if(!(operator === "not")) { i--; }

        }

        i++;
    }

    return components[0];
}

/*
 * based on the operator and the terms, evaluate to either true or false
 * returns 2-element array
 *   --> index 0: the result of the boolean evaluation
 *   --> index 1: what the expression should look like on the current line
 */
function getBooleanValue(term1, operator, term2, soFar)
{
  //console.log(term1 , operator , term2)
    if(!(booleanOps.includes(operator)))
    {
        alert("Error: in getBooleanValue()");
        return;
    }

    let term1Value;
    let term2Value;
    let result;

    let rehighlight = false;
    let shortCircuit = false;
    //let expressionBeforeEv = flattenBooleanExpr[term1, operator, term2];

    //////// evaluate term1 ////////
    if(typeof term1 === "boolean"
            || typeof term1 === "number") { term1Value = term1; }
    else if(operator === "not") {term1Value = ""; } //no term1 for `not`
    else if(Array.isArray(term1))
        { term1Value = evaluateBoolean(term1, false); rehighlight = true; }
    else { term1Value = evaluate(term1); rehighlight = true; }

    //short-circuiting stuff
    if(operator === "and" && !term1Value) { shortCircuit = [false]; }
    else if(operator === "or" && term1Value) { shortCircuit = [true]; }

    //////// evaluate term2 ////////
    if(!shortCircuit)
    {
        if(typeof term2 === "boolean"
                || typeof term2 === "number") { term2Value = term2; }
        else
        {
            if(rehighlight) //highlight the operator
            {
                counter++;
                setTimeout(highlightPortion, counter * TIMEINTERVAL,
                                 operator, "line" + stackFrameIndex, soFar);
            }
            rehighlight = true;
            if(Array.isArray(term2))
            { term2Value = evaluateBoolean(term2, false); }
            else { term2Value = evaluate(term2); }
        }
    }
    else { term2Value = term2; }

    let expressionNow = pythonize(term1Value) + " "
                              + operator + " " + pythonize(term2Value);
    if(operator === "not") { expressionNow = expressionNow.substring(1); }

    //one (or both) of the terms was evaluated, rehighlight this expression
    if(rehighlight)
    {
        counter++;
        setTimeout(highlightPortion, counter * TIMEINTERVAL,
                             expressionNow, "line" + stackFrameIndex, soFar);
    }

    if(Array.isArray(shortCircuit)) { result = shortCircuit[0]; }
    else if(operator === "<") { result = term1Value < term2Value; }
    else if(operator === "<=") { result = term1Value <= term2Value; }
    else if(operator === "==") { result = term1Value == term2Value; }
    else if(operator === ">=") { result = term1Value >= term2Value; }
    else if(operator === ">") { result = term1Value > term2Value; }
    else if(operator === "!=") { result = term1Value != term2Value; }
    else if(operator === "not") { result = !term2Value; }
    else if(operator === "and") { result = term1Value && term2Value; }
    else if(operator === "or") { result = term1Value || term2Value; }

    return [result, expressionNow];
}

/*
 * split on the boolean/comparison operators
 * if not boolean expression, return a 1-element array with only the expression
 */
function maybeParseBoolean(expression)
{
    let comp = [];

    let i = 0;
    while(i < expression.length)
    {
        let currChar = expression.charAt(i);
        let maybeOperator = expression.substring(i, i+2);

        //operator, push and update precedence
        if(booleanOps.includes(maybeOperator)
          || booleanOps.includes((maybeOperator = currChar))
          || booleanOps.includes((maybeOperator = expression.substring(i, i+3))))
        {
            comp.push(maybeOperator);

            //update index for 2-character or 3-character operator
            if(maybeOperator.length == 2) { i++; }
            else if(maybeOperator.length == 3) { i += 2; }
        }

        //space, do nothing
        else if(currChar === " ") { }

        //beginning of a term, add it to the list
        else
        {
            let startsFrom = expression.substring(i);

            let j = 0;
            //look for boolean operator
            for(j = 0; j < startsFrom.length; j++)
            {
                //term is in parentheses, skip to the end of it
                if(startsFrom.charAt(j) == "(")
                {
                    let inParentheses
                       = extractOutermostParentheses(expression.substring(j));
                    //jump to the index after the expression
                    j += (inParentheses.length)
                }
                //boolean operator, at end of term
                if(booleanOps.includes(startsFrom.charAt(j))
                  || booleanOps.includes(startsFrom.substring(j,j+2))
                  || booleanOps.includes(startsFrom.substring(j,j+3)))
                {
                    break;
                }
            }
            let termLength = j;
            let term = startsFrom.substring(0, termLength);

            comp.push(term.trim()); //add term to list

            //jump to index after the term
            i += (termLength - 1);
        }

        i++;
    }

    return restructBoolEx(comp);
}

/*
 * comp - array with parsed boolean elements from expression
 * returns a new array with the recursive boolean structure
 */
function restructBoolEx(comp)
{
    //don't need recursive structure
    if(comp.length == 1|| (comp.length == 3 && !(comp.includes("not")))
           ||(!(comp.includes("and")) && !(comp.includes("or"))
           && !(comp.includes("not"))) || typeof comp === "string")
    { return comp; }

    let newComp = []; //new array for recursive structure
    let i = 0;
    let startIndex;

    let splitOn = "";

    if(comp.includes("or")) { splitOn = "or"; }
    else if(comp.includes("and")) { splitOn = "and"; }
    else if(comp[0] === "not")
    {
        newComp.push("not");
        let term = subBooleanExpr(comp, 1, comp.length);
        term = restructBoolEx(term);
        newComp.push(term);
        return newComp;
    }

    //go through each element in the array
    while(i < comp.length)
    {
        startIndex = i;

        if(comp[i] === splitOn) //push the operator to split on
        {
            newComp.push(comp[i]);
            i++;
        }

        else//search for the operator
        {
            while(i < comp.length && !(comp[i] === splitOn)) { i++; }

            //get array for term, recursively restructure, add to newComp
            let term = subBooleanExpr(comp, startIndex, i);
            term = restructBoolEx(term);
            newComp.push(term);
        }
    }

    if(newComp.length == 1 && Array.isArray(newComp[0]))
    { newComp = newComp[0]; }

    return newComp;
}

function subBooleanExpr(comp, start, end)
{
    if(start + 1 < end) { return comp.slice(start, end); }
    else { return comp[start]; }
}

/*
 * get string value of recursive boolean expression
 */
function flattenBooleanExpr(comp)
{
    let string = "";

    for(let i = 0; i < comp.length; i++)
    {
        if(Array.isArray(comp[i])) { string += flattenBooleanExpr(comp[i]); }
        else if(typeof comp[i] === "boolean" && comp[i]) { string += "True"; }
        else if(typeof comp[i] === "boolean" && !comp[i]) { string += "False"; }
        else { string += comp[i]; }

        if(i < comp.length - 1) { string += " "}
    }
    return string;
}

function isString(potentialString)
{
    return (potentialString[0] === "\""
             && potentialString[potentialString.length - 1] == "\"") ||
           (potentialString[0] === "\'"
             && potentialString[potentialString.length - 1] == "\'")
}

/*
 * parse terms and operators and place them in a list
 * even indexes should contain terms, odd indexes should contain operators
 * return a list containing the resulting list and the counts for precedence
 */
function parseExpression(expression)
{
    let comp = [];
    let precedenceCount = [0, 0, 0];

    let i = 0;
    while(i < expression.length)
    {
        let currChar = expression.charAt(i);

        //term is in parentheses, push that whole expression
        if(currChar == "(")
        {
            let inParentheses = extractOutermostParentheses(expression.substring(i));
            comp.push(inParentheses);
            //jump to the index after the expression
            i += (inParentheses.length - 1)
        }

        //operator, push and update precedence
        else if(operators.includes(currChar))
        {
            //check for operator with 2 characters
            if(i < expression.length - 1)
            {
                if(expression.substring(i, i+2) === "**") { currChar = "**"; }
                else if(expression.substring(i, i+2) === "//")
                    { currChar = "//"; }
            }
            //negative number
            if(currChar === "-" && comp.length % 2 == 0)
            {
                let iBefore = i;
                i++;
                while(i < expression.length
                   && !(expression.charAt(i) === " ")
                   && !(operators.includes(expression.charAt(i)))) { i++; }
                comp.push(expression.substring(iBefore, i));
                continue;
            }
            comp.push(currChar);

            //update precedence
            for(let j = 0; j < precedence.length; j++)
            {
                if(precedence[j].includes(currChar))
                {
                    precedenceCount[j]++;
                    break;
                }
            }

            //update index for 2-character operator
            if(currChar.length == 2) { i++; }
        }

        //space, do nothing
        else if(currChar === " ") { }

        //beginning of a term, add it to the list
        else
        {
            let startsFrom = expression.substring(i);

            let j = 1;
            //look for space or operator
            for(j = 1; j < startsFrom.length; j++)
            {
                if(startsFrom[j] === "(") //must be a function call
                {
                    j += (extractOutermostParentheses(
                                       startsFrom.substring(j)).length - 1);
                }
                //at end of term
                else if(startsFrom[j] === " "
                 || operators.includes(startsFrom[j]))
                {
                    break;
                }
            }
            let termLength = j;
            let term = startsFrom.substring(0, termLength);

            comp.push(term); //add term to list

            //jump to index after the term
            i += (termLength - 1);
        }

        i++;
    }

    return [comp, precedenceCount];

}

/*
 * return numerical value of the input string
 * return the value stored in the variable, if it's a variable
 * TODO: value might be a function call
 */
function getNumericalValue(value)
{
    let wasNumeric = false;
    let numerical;
    let potentialVarId = value + "-" + stackFrameIndex;
    let maybeFunctionCall;

    //value is a variable
    if(potentialVarId in variables)
    {
        counter++;
        setTimeout(replaceValueOnLine, counter * TIMEINTERVAL,
                        value, variables[potentialVarId], stackFrameIndex);
        value = variables[potentialVarId];
    }
    else if((maybeFunctionCall = isFunctionCall(value)) != false)
    {
        value = runFunction(maybeFunctionCall[0], maybeFunctionCall[1]);
    }
    else { wasNumeric = true; }

    numerical = parseFloat(value); //numerical value of this expression

    //expression is NaN and is not a variable
    if(numerical != numerical) { return false; }

    return numerical;
}

/*
 * calculate the value of the expression with the given terms and operator
 * recursively evaluate parentheses if needed
 * returns a list with [0] the numerical result of the calculation
 *                     [1] what the line should currently be showing
 */
function calculateExpression(term1, operator, term2, soFar)
{
    //console.log(term1 + " " + operator + " " + term2);
    if(!(operators.includes(operator)))
    {
        alert("Error: in calculateExpression()");
        return;
    }

    let highlightEach = true;

    let nt1;
    let nt2;

    //determine if both terms are already numerical or not
    if((typeof term1 === "number" ||
           (typeof term1 === "string" && isNumeric(term1)))
       && (typeof term2 === "number" ||
           (typeof term2 === "string" && isNumeric(term2))))
    {
        highlightEach = false;
    }

    let rehighlightLater = highlightEach;

    if(highlightEach) //highlight the first term, if needed
    {
        counter++;
        setTimeout(highlightPortion, counter * TIMEINTERVAL,
                                  term1, "line" + stackFrameIndex, soFar);
    }

    //////// evaluate term1 //////
    if(typeof term1 === "number") { nt1 = term1; } //term1 is already numerical
    else if(term1.charAt(0) === "(") //term1 is an expression
    {
        nt1 = doArithmetic(term1);
        //remove the parentheses
        counter++;
        setTimeout(removeParentheses, counter * TIMEINTERVAL, stackFrameIndex);
    }
    else { nt1 = getNumericalValue(term1); } //get first term's numerical value

    soFar += (" " + nt1); //update what should be on the screen so far

    if(typeof term2 === "number" || (typeof term2 === "string"
                       && isNumeric(term2))) { highlightEach = false; }

    if(highlightEach) //highlight the operator and 2nd term, if needed
    {
        counter++;
        setTimeout(highlightPortion, counter * TIMEINTERVAL,
                              operator, "line" + stackFrameIndex, soFar);
        counter++;
        setTimeout(highlightPortion, counter * TIMEINTERVAL,
                                term2, "line" + stackFrameIndex, soFar);
    }

    soFar += (" " + operator); //update what should be on the screen so far

    //////// evaluate term2 //////
    if(typeof term2 === "number") { nt2 = term2; } //term2 is already numerical
    else if(term2.charAt(0) === "(") //term2 is an expression
    {
        nt2 = doArithmetic(term2);
        //remove the parentheses
        counter++;
        setTimeout(removeParentheses, counter * TIMEINTERVAL, stackFrameIndex);
    }
    else { nt2 = getNumericalValue(term2); } //get second term's numerical value

    let exprNow = nt1 + " " + operator + " " + nt2;

    if(rehighlightLater) //highlight the whole expression, if needed
    {
        counter++;
        setTimeout(highlightPortion, counter * TIMEINTERVAL,
                                    exprNow, "line" + stackFrameIndex, "");
    }

    if(operator === "**") { return [nt1 ** nt2, exprNow]; }
    else if(operator === "*") { return [nt1 * nt2, exprNow]; }
    else if(operator === "/") { return [nt1 / nt2, exprNow]; }
    else if(operator === "//") { return [Math.floor(nt1 / nt2), exprNow]; }
    else if(operator === "%") { return [nt1 % nt2, exprNow]; }
    else if(operator === "+") { return [nt1 + nt2, exprNow]; }
    else if(operator === "-") { return [nt1 - nt2, exprNow]; }
}

/*
 * return false if it's not a numerical expression
 * return the result if it is
 * TODO: make sure that if it's in a string, we return false
 * TODO: add stuff for string operations
 */
function doArithmetic(expression)
{
    expression = expression.trim();

    //remove the parentheses first
    if(expression.charAt(0) === "("  &&
               expression === extractOutermostParentheses(expression))
    {
        counter++;
        setTimeout(unhighlightParentheses, counter*TIMEINTERVAL, stackFrameIndex);
        expression = expression.substring(1, expression.length-1);
    }

    setTimeout(playEvalArithSound, counter * TIMEINTERVAL);

    let parseResult = parseExpression(expression);
    let components = parseResult[0];
    let precedenceCount = parseResult[1];

    //replace the current line with prettified spacing
    let betterSpacing = components.join(" ");

    if(!(betterSpacing === expression))
    {
        counter++;
        setTimeout(replaceValueOnLine, counter * TIMEINTERVAL,
                                expression, betterSpacing, stackFrameIndex);
    }

    let originalComponentsLength = components.length;

    //execute operations in order of precedence
    for(let i = 0; i < precedenceCount.length; i++)
    {
        while(precedenceCount[i] > 0)
        {
            //look for the first occurence of an operator of this precedence
            let j = 1;
            while(j < components.length)
            {
                if(precedence[i].includes(components[j])) { break; }

                j += 2;
            }

            let highlightAndReplace = components[j-1] + " "
                             + components[j] + " " + components[j+1];

            //highlight this part of the expression, if needed
            if(originalComponentsLength != 3)
            {
                counter++;
                setTimeout(playEvalArithSound, counter * TIMEINTERVAL);
                setTimeout(highlightPortion, counter * TIMEINTERVAL,
                         highlightAndReplace, "line" + stackFrameIndex, "");
            }

            let soFar = components.slice(0, j-1).join(" ");

            //do the actual calculation
            let result = calculateExpression(components[j-1],
                               components[j], components[j+1], soFar);

            let numResult = result[0];
            let currExpr = result[1];

            //replace result on line, play snap sound
            counter++;
            setTimeout(playSnapSound, counter * TIMEINTERVAL);
            setTimeout(replaceValueOnLine, counter * TIMEINTERVAL,
                                         currExpr, numResult, stackFrameIndex);

            //replace array with the calculated value
            components[j-1] = numResult;

            //remove the remainder of this expression
            components.splice(j, 2);

            precedenceCount[i] -= 1;
        }
    }

    //console.log(components[0]);
    return components[0];
}

/*
 * run the function with the given arguments
 * return the value that the function returns
 */
function runFunction(functionName, args)
{
    let highlightAgain = false;
    //evaluate all of the arguments first
    for(let i = 0; i < args.length; i++)
    {
        if(isNumeric(args[0])) { args[i] = parseFloat(args[i]); }
        else if(args[i] === "True" || args[i] === "False")
            { args[i] = pythonize(args[i]); }
        //else if(is a string)
        else { args[i] = evaluate(args[i]); highlightAgain = true; }
    }

    if(highlightAgain)
    {
        let highlight = functionName + "(" + args.map(pythonize).join(", ") + ")";
        counter++;
        setTimeout(highlightPortion, counter * TIMEINTERVAL,
                                  highlight, "line" + stackFrameIndex, "");
    }

    let returnValue;
    let notBuiltIn = 1;

    if(!(builtInFunctions.includes(functionName)))
    {
        stackFrameIndex++; //increment the stack frame index

        //add space for the stack frame if needed
        if(stackFrameIndex > 2)
        {
            counter++;
            setTimeout(makeSpace, counter * TIMEINTERVAL, stackFrameIndex);
        }

        //add the new stack frame and line
        counter++;
        setTimeout(addFrame, counter * TIMEINTERVAL, functionName,
                         functions[functionName][0], args, stackFrameIndex);

        //show the values of the parameters
        counter++;
        setTimeout(setParameters, counter * TIMEINTERVAL,
                         functions[functionName][0], args, stackFrameIndex);
        counter += 2;

        let functionVars = [];
        //create variables for parameters and assign arg values
        for(let i = 0; i < args.length; i++)
        {
            //name of parameter + "-(stackFrameIndex)"
            let paramKey = functions[functionName][0][i] + "-" + stackFrameIndex;

            //add parameter and its value to the list of variables
            variables[paramKey] = args[i];

            functionVars.push(paramKey); //keep track of the vars
        }

        returnValue = runBlock(functions[functionName][1]);
    }
    else
    {
        notBuiltIn = 0;
        returnValue = runBuiltInFunction(functionName, args);
    }

    //return value, replace function call on previous line
    if(typeof returnValue !== 'undefined')
    {
        let toReplace = functionName + "(" + args.map(pythonize).join(", ") + ")";
        counter++;
        setTimeout(replaceValueOnLine, counter * TIMEINTERVAL, toReplace,
                        pythonize(returnValue), stackFrameIndex-notBuiltIn);
    }

    //remove stack frame and line
    counter++;
    setTimeout(removeFrame, counter * TIMEINTERVAL, stackFrameIndex);

    if(notBuiltIn) { stackFrameIndex--; }

    if(stackFrameIndex > 1) //remove the space left by the previous stack frame
    {
        counter++;
        setTimeout(removeEmptySpace, counter * TIMEINTERVAL, stackFrameIndex);
    }

    return returnValue;
}

/*
 * if myString is a function call, return a list where the 1st element is the
 *      name of a function and the 2nd is a list of all the arguments
 * returns false otherwise
 */
function isFunctionCall(myString)
{
    myString = myString.trim();

    //search for the first "("
    let withoutStringL = removeStringLiterals(myString);
    let startIndex = withoutStringL.indexOf("(");
    if(startIndex == -1 || startIndex == 0) { return false; }

    //compare string lengths, should be equal if it's a function call
    let fromParentheses = myString.substring(startIndex);
    let inParentheses = extractOutermostParentheses(fromParentheses);
    if(!(fromParentheses === inParentheses)) { return false; }

    let functionName = myString.substring(0, startIndex).trim();
    if(!functionName.match(/^[0-9a-z_]+$/i)) { return false; }

    let args = [];
    inParentheses = inParentheses.substring(1, inParentheses.length - 1);
    let inParenthesesNoL = withoutStringL.substring(
                              startIndex+1, withoutStringL.length - 1);
    let i = 0;

    //get the arguments and add them to the array
    while(i < inParentheses.length)
    {
        if(inParentheses[i] === " ") { i++; continue; }
        let startIndex = i;

        //continue until it finds a comma
        while(i < inParentheses.length && !(inParenthesesNoL[i] === ",")) { i++; }

        args.push(inParentheses.substring(startIndex, i).trim()); //add arg to array

        i++;
    }

    return [functionName, args];
}

function runBuiltInFunction(functionName, args)
{
    if(functionName === "abs") { return Math.abs(args[0]); }
    else if(functionName === "bool") {} //needs strings
    else if(functionName === "divmod") {} //needs tuples
    else if(functionName === "filter") {} //needs lists
    else if(functionName === "float") {}
    else if(functionName === "int") {}
    else if(functionName === "len") { return args[0].length; }
    else if(functionName === "map") {}
    else if(functionName === "max") { return Math.max(...args); }
    else if(functionName === "min") { return Math.min(...args); }
    else if(functionName === "pow") { return Math.pow(args[0], args[1]); }
    else if(functionName === "print") {}
    else if(functionName === "range") {}
    else if(functionName === "str") {}
    else if(functionName === "sum")
    {
        let total = 0;
        for(let i = 0; i < args.length; i++) { total += args[i]; }
        return total;
    }
}

/*
 * if code contains any string literals, replace their characters with "-"
 */
function removeStringLiterals(code)
{
    let buildString = "";
    let i = 0;
    let shouldEscape = false;
    let quoteType = "";

    while(i < code.length)
    {
        if(code[i] === "'") { quoteType = "'"; }
        else if(code[i] === '"') { quoteType = '"'; }
        else //outside any string literals
        {
            buildString += code[i];
            i++; continue;
        }
        i++;
        buildString += quoteType;

        while(i < code.length)
        {
            //character isn't the quote type, add _ to new string
            if(!(code[i] === quoteType)) { buildString += "_"; }
            else //character is quote
            {
                //after escape character, add _ and don't end string
                if(shouldEscape) { buildString += "_"; }
                else //end of the string
                {
                    buildString += quoteType;
                    i++; break;
                }
            }

            if(code[i] === "\\") { shouldEscape = true; }
            else { shouldEscape = false; }

            i++;
        }
    }
    return buildString;
}

/*
 * get value in Python format
 */
function pythonize(value)
{
    if(typeof value == "boolean" && value) { return "True"; }
    else if(typeof value == "boolean" && !value) { return "False"; }
    else { return value; }
}

/*
 * return true if string is a numerical value, false if not
 */
function isNumeric(value)
{
    if(!(digits.includes(value[0]))) { return false; }
    for(let i = 0; i < operators.length; i++)
        { if(value.substring(1).includes(operators[i])) { return false; } }
    return true;
}

/*
 * show new line line on the top line
 */
function showCurrLine(line, stackFrameI)
{
    document.getElementById("line" + stackFrameI).innerHTML = line;
}

/*
 * update variable value on screen
 */
function showVariableValue(varName, value)
{
    document.getElementById(varName).innerHTML = value;
    document.getElementById("setVarValueSound").play();
}

/*
 * play the true sound for true, false sound for false
 */
function playBooleanResultSound(result)
{
    if(result) { document.getElementById("trueSound").play(); }
    else { document.getElementById("falseSound").play(); }
}

/*
 *
 */
 function playConditionalSound(conditionalCounter)
 {
      if(conditionalCounter == 0) { document.getElementById("ifSound").play(); }
      else if(conditionalCounter != -1)
      {
          let soundString = "elif" + conditionalCounter + "Sound";
          document.getElementById(soundString).play();
      }
 }

 function playEvaluateBoolSound() { document.getElementById("boolean").play(); }
 function playEvalArithSound() { document.getElementById("arithmetic").play(); }
 function playSnapSound() { document.getElementById("snap").play(); }

/*
 * show new variable on screen
 * TODO: make sure that variables of the same name on different stack
 *       frames aren't mixed up with the same div id
 */
function showNewVariable(varId)
{
    let varLocation = parseFloat(varId.substring(varId.indexOf("-") + 1));
    let varName = varId.substring(0, varId.indexOf("-"));

    let newVarArea = document.createElement("div");
    newVarArea.innerHTML = "<div class=\"variable_name\">" + varName
       + "</div> <div class=\"variable_box\" id=\"" + varId + "\"></div>";
    newVarArea.className = "variable";

    let appendTo;
    if(varLocation > 0) { appendTo = "stack_frame_" + varLocation; }
    else { appendTo = "global_variables"; }

    document.getElementById(appendTo).appendChild(newVarArea);
    document.getElementById("newVarSound").play();
}

/*
 * highlight a portion of the line that's currently running
 * return the html to put in div with id #current_line
 * TODO: make sure that variables of the same name on different stack
 * frames aren't mixed up with the same div id
 * TODO: multiple of the same expression on the same line
 */
function highlightPortion(portion, id, comesAfter)
{
    clearHighlight(id); //get rid of any existing highlights

    //get the entire line that's currently being shown
    let line = document.getElementById(id).innerHTML;
    let prefix = "";

    prefix = line.substring(0, line.indexOf(comesAfter) + comesAfter.length);
    line = line.substring(line.indexOf(comesAfter) + comesAfter.length);

    portion = portion.replace("<", "&lt;");
    portion = portion.replace(">", "&gt;");

    let startIndex = line.indexOf(portion);
    if(startIndex == -1) { return; }

    //strings that represent span
    let divOpen = "<span class=\"highlight\">";
    let divClose = "</span>";

    //the line before the part to highlight
    let before = prefix + line.substring(0, startIndex);

    //the line after the part to highlight
    let after = line.substring(startIndex + portion.length);

    //add the span around the portion to highlight
    let updatedLine = before + divOpen + portion + divClose + after;
    document.getElementById(id).innerHTML = updatedLine;

}

/*
 * remove the span that's highlighting something
 */
function clearHighlight(id)
{
    //get the entire line that's currently being shown
    let line = document.getElementById(id).innerHTML;

    //strings that represent span
    let divOpen = "<span class=\"highlight\">";
    let divClose = "</span>";

    //indexes for substrings
    let endOfPart1 = line.indexOf(divOpen);
    if(endOfPart1 == -1) { return; } //nothing is currently highlighted
    let beginningOfPart2 = endOfPart1 + divOpen.length;
    let endOfPart2 = line.indexOf(divClose);
    let beginningOfPart3 = endOfPart2 + divClose.length;

    //create substrings for part 1 (before span), part 2 (inside span),
    //and part 3 (after span)
    let part1 = line.substring(0, endOfPart1);
    let part2 = line.substring(beginningOfPart2, endOfPart2);
    let part3 = line.substring(beginningOfPart3, line.length);

    document.getElementById(id).innerHTML = part1 + part2 + part3;
}

/*
 * replace the old value with the new value on the current line
 */
function replaceValueOnLine(oldStr, newStr, stackFrameI)
{
    //get the entire line that's currently being shown
    let line = document.getElementById("line" + stackFrameI).innerHTML;
    let indexOfEquals = removeStringLiterals(line).indexOf("=")
    let prefix = line.substring(0, indexOfEquals);
    line = line.substring(indexOfEquals);

    let lineBefore = prefix + line;
    line = line.replace("&lt;", "<");
    line = line.replace("&gt;", ">");

    line = prefix + line.replace(oldStr, newStr);

    //replace the old string with the new string
    document.getElementById("line" + stackFrameI).innerHTML = line;
}

/*
 * overwrite the previous content and display newStr
 */
function replaceWholeLine(newStr, stackFrameI)
{
    document.getElementById("line" + stackFrameI).innerHTML = newStr;
}

/*
 * replace the value of a boolean expression
 */
function replaceBoolean(oldStr, booleanValue, stackFrameI)
{
    //get the entire line that's currently being shown
    let line = document.getElementById("line" + stackFrameI).innerHTML;

    line = line.replace("&lt;", "<");
    line = line.replace("&gt;", ">");

    let newStr;
    if(booleanValue) { newStr = "True"; }
    else { newStr = "False"; }

    line = line.replace(oldStr, newStr);

    document.getElementById("line" + stackFrameI).innerHTML = line;
}

/*
 * add space to the stack and (maybe) the lines area
 */
 function makeSpace(stackFrameI)
 {
    //change scroll_stack to (19.5vh * (stackFrameI-2))
    document.getElementById("scroll_stack").style.height
                                      = (19.5 * (stackFrameI - 2)) + 'vh';

    if(stackFrameI == 3)
    {
       //line3 only goes partially outside the space. Only need 1.8vh
       document.getElementById("scroll_lines").style.height = '1.8vh';
    }
    else if(stackFrameI > 3)
    {
        //change scroll_lines to 1.8vh + ((stackFrameI - 3) * 5.7vh)
        document.getElementById("scroll_lines").style.height
                             = (1.8 + ((stackFrameI - 3)* 5.7)) + 'vh';
    }
 }

/*
 * add frame to stack with function name on the side
 * add new line with params and their corresponding ard values
 */
function addFrame(functionName, params, args, stackFrameI)
{
    ///// add stack frame /////
    let currentStack = document.getElementById("frames_container").innerHTML;
    let newFrameHTML = '<div class="one_frame" id="frame' + stackFrameI
                      + '"><div class="function_name">' + functionName + '</div>'
                      +  '<div class="stack_frame">'
                      +    '<div class="hold_variables" id="stack_frame_'
                      +     stackFrameI + '"></div></div></div>';
    let newStackContents = newFrameHTML + currentStack;
    document.getElementById("frames_container").innerHTML = newStackContents;

    ///// add line /////
    let lineContents = "";
    for(let i = 0; i < params.length; i++)
    {
        lineContents += (params[i] + " = " + args[i]);
        if(i < params.length-1) { lineContents += ", " };
    }
    let currentLines = document.getElementById("lines_container").innerHTML;
    let newLineHTML = '<div class="line" id="line' + stackFrameI + '">'
                            + lineContents +  '</div>';
    let newLinesContents = newLineHTML + currentLines;
    document.getElementById("lines_container").innerHTML = newLinesContents;
}

/*
 * add all of the params and their boxes as variables on the stack
 * highlight the arg values on the line
 * assign the arg values to the parameters
 */
function setParameters(params, args, stackFrameI)
{
    let withHighlight = "";
    //strings that represent span
    let spanOpen = "<span class=\"highlight\">";
    let spanClose = "</span>";

    //show params on stack and build string to replace / replace with
    for(let i = 0; i < params.length; i++)
    {
        showNewVariable(params[i] + "-" + stackFrameI);
        withHighlight += (params[i] + " = " + spanOpen
                                  + pythonize(args[i]) + spanClose);
        if(i < params.length-1){ withHighlight += ", "; }
    }

    //highlight the arg values on the line
    setTimeout(replaceWholeLine, TIMEINTERVAL, withHighlight, stackFrameI);

    //assign the arg values to the parameters
    for(let i = 0; i < params.length; i++)
    {
        setTimeout(showVariableValue, TIMEINTERVAL*2,
                          params[i] + "-" + stackFrameI, pythonize(args[i]));
    }
}

/*
 * pop from stack and remove line
 */
function removeFrame(stackFrameI)
{
    ///// stack frame /////
    let remove = document.getElementById("frame" + stackFrameI);
    remove.parentNode.removeChild(remove);

    ///// line /////
    remove = document.getElementById("line" + stackFrameI);
    remove.parentNode.removeChild(remove);
}

/*
 * remove the empty space from the frame and (maybe) the line
 * call after decrementing stackFrameIndex
 */
 function removeEmptySpace(stackFrameI)
 {
     //change scroll_stack to (19.5vh * (stackFrameI-2))
     document.getElementById("scroll_stack").style.height
                                         = (19.5 * (stackFrameI-2)) + 'vh';

     if(stackFrameI == 2) //3 lines won't exceed the height of the space
     {
         document.getElementById("scroll_lines").style.height = '0vh';
     }
     else if(stackFrameI > 2)
     {
         //change scroll_lines to 1.8vh + ((stackFrameI - 3) * 5.7vh)
         document.getElementById("scroll_lines").style.height
                            = (1.8 + ((stackFrameI - 3)* 5.7)) + 'vh';
     }
 }

/*
 * remove the parentheses around the highlighted expression
 * TODO: only works if there are no spaces between expression and parens
 */
function removeParentheses(stackFrameI)
{
    let line = document.getElementById("line" + stackFrameI).innerHTML;

    //strings that represent span
    let spanOpen = "<span class=\"highlight\">";
    let spanClose = "</span>";

    if(line.indexOf("(") == -1) { return; }
    let startOfSpan = line.indexOf(spanOpen);
    let endOfSpan = line.indexOf(spanClose) + spanClose.length;

    let first = line.substring(0, startOfSpan - 1);
    let second = line.substring(startOfSpan, endOfSpan);
    let third = line.substring(endOfSpan + 1);

    document.getElementById("line" + stackFrameI).innerHTML = first+second+third;
}

function unhighlightParentheses(stackFrameI)
{
    let line = document.getElementById("line" + stackFrameI).innerHTML;

    //strings that represent span
    let spanOpen = "<span class=\"highlight\">";
    let spanClose = "</span>";

    let highlighted = line.substring(
     line.indexOf(spanOpen) + spanOpen.length + 1, line.indexOf(spanClose) - 1);
    let newStr = "(" + spanOpen + highlighted + spanClose + ")";

    let oldStr = spanOpen + "(" + highlighted + ")" + spanClose;
    document.getElementById("line" + stackFrameI).innerHTML
                                        = line.replace(oldStr, newStr);
}

function clearCanvas()
{
    document.getElementById("global_variables").innerHTML = "";
    counter = 0;
    codeLinesList = [];
    variables = {};
}

//from stackoverflow
function allowTabs()
{
  document.getElementById('yourcode').addEventListener('keydown', function(e) {
  if (e.key == 'Tab') {
    e.preventDefault();
    var start = this.selectionStart;
    var end = this.selectionEnd;

    // set textarea value to: text before caret + tab + text after caret
    this.value = this.value.substring(0, start) +
       "\t" + this.value.substring(end);

    // put caret at right position again
    this.selectionStart =
       this.selectionEnd = start + 1;
  }
 });
}





//
var jssm = (function (exports) {
    'use strict';

    class circular_buffer{constructor(uCapacity){if(!Number.isInteger(uCapacity)){throw new RangeError(`Capacity must be an integer, received ${uCapacity}`)}if(uCapacity<0){throw new RangeError(`Capacity must be a non-negative integer, received ${uCapacity}`)}this._values=new Array(uCapacity);this._capacity=uCapacity;this._cursor=0;this._offset=0;this._length=0;}get capacity(){return this._capacity}set capacity(newSize){this.resize(newSize);}get length(){return this._length}set length(newLength){if(newLength>this._capacity){throw new RangeError(`Requested new length [${newLength}] exceeds container capacity [${this._capacity}]`)}if(newLength<0){throw new RangeError(`Requested new length [${newLength}] cannot be negative`)}if(!Number.isInteger(newLength)){throw new RangeError(`Requested new length [${newLength}] must be an integer`)}if(this._length<=newLength){return}this._length=newLength;}get available(){return this._capacity-this._length}get isEmpty(){return this._length===0}get isFull(){return this._length===this._capacity}get first(){if(this.isEmpty){throw new RangeError("Cannot return first element of an empty container")}return this.at(0)}get last(){if(this.isEmpty){throw new RangeError("Cannot return last element of an empty container")}return this.at(this.length-1)}static from(i,map_fn,t){const new_array=map_fn?Array.from(i,map_fn,t):Array.from(i);const target_length=new_array.length;const ncb=new circular_buffer(target_length);ncb._values=new_array;ncb._length=target_length;return ncb}push(v){if(this.isFull){throw new RangeError(`Cannot push, structure is full to capacity`)}this._values[(this._cursor+this._length++)%this._capacity]=v;return v}shove(v){let shoved;if(this._capacity===0){throw new RangeError(`Cannot shove, structure is zero-capacity`)}if(this.isFull){shoved=this.pop();}this.push(v);return shoved}fill(x){for(let i=0;i<this._capacity;i++){this._values[i]=x;}this._length=this._capacity;return this._values}indexOf(searchElement,fromIndex){const normalized=this.toArray();return normalized.indexOf(searchElement,fromIndex)}find(predicate,thisArg){return this.toArray().find(predicate,thisArg)}every(functor,thisArg){const normalized=this.toArray(),res=normalized.every(functor,thisArg);this._values=normalized;this._values.length=this._capacity;this._cursor=0;return res}some(functor,thisArg){const normalized=this.toArray(),res=normalized.some(functor,thisArg);this._values=normalized;this._values.length=this._capacity;this._cursor=0;return res}reverse(){const normalized=this.toArray();this._values=normalized.reverse();this._values.length=this._capacity;this._cursor=0;return this}clear(){const old=this.toArray();this._length=0;return old}pop(){if(this._length<=0){throw new RangeError(`Cannot pop, structure is empty`)}const cache=this.at(0);--this._length;++this._offset;++this._cursor;if(this._cursor>=this._capacity){this._cursor-=this._capacity;}return cache}at(i){if(i<0){throw new RangeError(`circular_buffer does not support negative traversals; called at(${i})`)}if(!Number.isInteger(i)){throw new RangeError(`Accessors must be non-negative integers; called at(${i})`)}if(i>=this._capacity){throw new RangeError(`Requested cell ${i} exceeds container permanent capacity`)}if(i>=this._length){throw new RangeError(`Requested cell ${i} exceeds container current length`)}return this._values[(this._cursor+i)%this._capacity]}pos(i){return this.at(i-this.offset())}offset(){return this._offset}resize(newSize,preferEnd=false){this._values=this.toArray();this._cursor=0;const oldSize=this._length;this._length=Math.min(this._length,newSize);this._capacity=newSize;if(newSize>=oldSize){this._values.length=newSize;}else {if(preferEnd){const tmp=this._values.slice(oldSize-newSize);this._values=tmp;}else {this._values.length=newSize;}}}toArray(){const startPoint=this._cursor%this._capacity;if(this._capacity>startPoint+this._length){return this._values.slice(startPoint,startPoint+this._length)}else {const base=this._values.slice(startPoint,this._capacity);base.push(...this._values.slice(0,this.length-(this._capacity-startPoint)));return base}}}

    /*******
     *
     *  Custom error class for jssm.  Enriches the standard `Error` with
     *  machine context (current state, instance name) and an optional
     *  `requested_state` so that error messages are self-describing.
     *
     *  When a semantic error is detected during `compile()` and the parse tree
     *  was produced with `parse(input, { locations: true })`, the thrown error
     *  also carries a `source_location` field — the FSL source span of the
     *  offending statement — so downstream tooling can map the error to a precise
     *  position in the original source text without additional scanning.
     *
     *  ```typescript
     *  throw new JssmError(machine, 'no such state', { requested_state: 'Blue' });
     *  // JssmError: [[my-light]]: no such state (at "Red", requested "Blue")
     *  ```
     *
     *  @param machine         - The `Machine` instance that raised the error, or
     *                           `undefined` if no machine is available.  Used to
     *                           read `state()` and `instance_name()` for context.
     *  @param message         - A human-readable description of the error.
     *  @param JEEI            - Optional {@link JssmErrorExtendedInfo} with extra
     *                           context such as `requested_state` and/or
     *                           `source_location` (the FSL source span of the
     *                           offending statement, present when the error
     *                           originated from a located parse tree).
     *
     */
    class JssmError extends Error {
        constructor(machine, message, JEEI) {
            const { requested_state, source_location } = (JEEI === undefined)
                ? { requested_state: undefined, source_location: undefined }
                : JEEI;
            const follow_ups = [];
            if (machine && machine.state() !== undefined) {
                follow_ups.push(`at "${machine.state()}"`);
            }
            if (requested_state !== undefined) {
                follow_ups.push(`requested "${requested_state}"`);
            }
            const complex_msg = `${((machine === null || machine === void 0 ? void 0 : machine.instance_name()) === undefined)
            ? ''
            : `[[${machine.instance_name()}]]: `}${message}${follow_ups.length > 0
            ? ` (${follow_ups.join(', ')})`
            : ''}`;
            super(complex_msg);
            this.name = 'JssmError';
            this.message = complex_msg;
            this.base_message = message;
            this.requested_state = requested_state;
            this.source_location = source_location;
        }
    }

    function peg$subclass(child,parent){function ctor(){this.constructor=child;}ctor.prototype=parent.prototype;child.prototype=new ctor;}function peg$SyntaxError(message,expected,found,location){this.message=message;this.expected=expected;this.found=found;this.location=location;this.name="SyntaxError";if(typeof Error.captureStackTrace==="function"){Error.captureStackTrace(this,peg$SyntaxError);}}peg$subclass(peg$SyntaxError,Error);peg$SyntaxError.buildMessage=function(expected,found){var DESCRIBE_EXPECTATION_FNS={literal:function(expectation){return '"'+literalEscape(expectation.text)+'"'},class:function(expectation){var escapedParts="",i;for(i=0;i<expectation.parts.length;i++){escapedParts+=expectation.parts[i]instanceof Array?classEscape(expectation.parts[i][0])+"-"+classEscape(expectation.parts[i][1]):classEscape(expectation.parts[i]);}return "["+(expectation.inverted?"^":"")+escapedParts+"]"},any:function(expectation){return "any character"},end:function(expectation){return "end of input"},other:function(expectation){return expectation.description}};function hex(ch){return ch.charCodeAt(0).toString(16).toUpperCase()}function literalEscape(s){return s.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\0/g,"\\0").replace(/\t/g,"\\t").replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/[\x00-\x0F]/g,function(ch){return "\\x0"+hex(ch)}).replace(/[\x10-\x1F\x7F-\x9F]/g,function(ch){return "\\x"+hex(ch)})}function classEscape(s){return s.replace(/\\/g,"\\\\").replace(/\]/g,"\\]").replace(/\^/g,"\\^").replace(/-/g,"\\-").replace(/\0/g,"\\0").replace(/\t/g,"\\t").replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/[\x00-\x0F]/g,function(ch){return "\\x0"+hex(ch)}).replace(/[\x10-\x1F\x7F-\x9F]/g,function(ch){return "\\x"+hex(ch)})}function describeExpectation(expectation){return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation)}function describeExpected(expected){var descriptions=new Array(expected.length),i,j;for(i=0;i<expected.length;i++){descriptions[i]=describeExpectation(expected[i]);}descriptions.sort();if(descriptions.length>0){for(i=1,j=1;i<descriptions.length;i++){if(descriptions[i-1]!==descriptions[i]){descriptions[j]=descriptions[i];j++;}}descriptions.length=j;}switch(descriptions.length){case 1:return descriptions[0];case 2:return descriptions[0]+" or "+descriptions[1];default:return descriptions.slice(0,-1).join(", ")+", or "+descriptions[descriptions.length-1]}}function describeFound(found){return found?'"'+literalEscape(found)+'"':"end of input"}return "Expected "+describeExpected(expected)+" but "+describeFound(found)+" found."};function peg$parse(input,options){options=options!==void 0?options:{};var peg$FAILED={},peg$startRuleFunctions={Document:peg$parseDocument},peg$startRuleFunction=peg$parseDocument,peg$c0=function(e){return e},peg$c1="default",peg$c2=peg$literalExpectation("default",false),peg$c3="ocean",peg$c4=peg$literalExpectation("ocean",false),peg$c5="modern",peg$c6=peg$literalExpectation("modern",false),peg$c7="plain",peg$c8=peg$literalExpectation("plain",false),peg$c9="bold",peg$c10=peg$literalExpectation("bold",false),peg$c11="[",peg$c12=peg$literalExpectation("[",false),peg$c13="]",peg$c14=peg$literalExpectation("]",false),peg$c15=function(ths,th){const themes=ths.map(t=>t[0]);if(th)themes.push(th);return themes},peg$c16=function(th){return [th]},peg$c17="box3d",peg$c18=peg$literalExpectation("box3d",false),peg$c19="polygon",peg$c20=peg$literalExpectation("polygon",false),peg$c21="ellipse",peg$c22=peg$literalExpectation("ellipse",false),peg$c23="oval",peg$c24=peg$literalExpectation("oval",false),peg$c25="circle",peg$c26=peg$literalExpectation("circle",false),peg$c27="point",peg$c28=peg$literalExpectation("point",false),peg$c29="egg",peg$c30=peg$literalExpectation("egg",false),peg$c31="triangle",peg$c32=peg$literalExpectation("triangle",false),peg$c33="plaintext",peg$c34=peg$literalExpectation("plaintext",false),peg$c35="diamond",peg$c36=peg$literalExpectation("diamond",false),peg$c37="trapezium",peg$c38=peg$literalExpectation("trapezium",false),peg$c39="parallelogram",peg$c40=peg$literalExpectation("parallelogram",false),peg$c41="house",peg$c42=peg$literalExpectation("house",false),peg$c43="pentagon",peg$c44=peg$literalExpectation("pentagon",false),peg$c45="hexagon",peg$c46=peg$literalExpectation("hexagon",false),peg$c47="septagon",peg$c48=peg$literalExpectation("septagon",false),peg$c49="octagon",peg$c50=peg$literalExpectation("octagon",false),peg$c51="doublecircle",peg$c52=peg$literalExpectation("doublecircle",false),peg$c53="doubleoctagon",peg$c54=peg$literalExpectation("doubleoctagon",false),peg$c55="tripleoctagon",peg$c56=peg$literalExpectation("tripleoctagon",false),peg$c57="invtriangle",peg$c58=peg$literalExpectation("invtriangle",false),peg$c59="invtrapezium",peg$c60=peg$literalExpectation("invtrapezium",false),peg$c61="invhouse",peg$c62=peg$literalExpectation("invhouse",false),peg$c63="Mdiamond",peg$c64=peg$literalExpectation("Mdiamond",false),peg$c65="Msquare",peg$c66=peg$literalExpectation("Msquare",false),peg$c67="Mcircle",peg$c68=peg$literalExpectation("Mcircle",false),peg$c69="rectangle",peg$c70=peg$literalExpectation("rectangle",false),peg$c71="rect",peg$c72=peg$literalExpectation("rect",false),peg$c73="square",peg$c74=peg$literalExpectation("square",false),peg$c75="star",peg$c76=peg$literalExpectation("star",false),peg$c77="none",peg$c78=peg$literalExpectation("none",false),peg$c79="underline",peg$c80=peg$literalExpectation("underline",false),peg$c81="cylinder",peg$c82=peg$literalExpectation("cylinder",false),peg$c83="note",peg$c84=peg$literalExpectation("note",false),peg$c85="tab",peg$c86=peg$literalExpectation("tab",false),peg$c87="folder",peg$c88=peg$literalExpectation("folder",false),peg$c89="box",peg$c90=peg$literalExpectation("box",false),peg$c91="component",peg$c92=peg$literalExpectation("component",false),peg$c93="promoter",peg$c94=peg$literalExpectation("promoter",false),peg$c95="cds",peg$c96=peg$literalExpectation("cds",false),peg$c97="terminator",peg$c98=peg$literalExpectation("terminator",false),peg$c99="utr",peg$c100=peg$literalExpectation("utr",false),peg$c101="primersite",peg$c102=peg$literalExpectation("primersite",false),peg$c103="restrictionsite",peg$c104=peg$literalExpectation("restrictionsite",false),peg$c105="fivepoverhang",peg$c106=peg$literalExpectation("fivepoverhang",false),peg$c107="threepoverhang",peg$c108=peg$literalExpectation("threepoverhang",false),peg$c109="noverhang",peg$c110=peg$literalExpectation("noverhang",false),peg$c111="assembly",peg$c112=peg$literalExpectation("assembly",false),peg$c113="signature",peg$c114=peg$literalExpectation("signature",false),peg$c115="insulator",peg$c116=peg$literalExpectation("insulator",false),peg$c117="ribosite",peg$c118=peg$literalExpectation("ribosite",false),peg$c119="rnastab",peg$c120=peg$literalExpectation("rnastab",false),peg$c121="proteasesite",peg$c122=peg$literalExpectation("proteasesite",false),peg$c123="proteinstab",peg$c124=peg$literalExpectation("proteinstab",false),peg$c125="rpromoter",peg$c126=peg$literalExpectation("rpromoter",false),peg$c127="rarrow",peg$c128=peg$literalExpectation("rarrow",false),peg$c129="larrow",peg$c130=peg$literalExpectation("larrow",false),peg$c131="lpromoter",peg$c132=peg$literalExpectation("lpromoter",false),peg$c133="record",peg$c134=peg$literalExpectation("record",false),peg$c135=peg$otherExpectation("forward light arrow ->"),peg$c136="->",peg$c137=peg$literalExpectation("->",false),peg$c138="→",peg$c139=peg$literalExpectation("→",false),peg$c140=function(){return "->"},peg$c141=peg$otherExpectation("two way light arrow <->"),peg$c142="<->",peg$c143=peg$literalExpectation("<->",false),peg$c144="↔",peg$c145=peg$literalExpectation("↔",false),peg$c146=function(){return "<->"},peg$c147=peg$otherExpectation("back light arrow <-"),peg$c148="<-",peg$c149=peg$literalExpectation("<-",false),peg$c150="←",peg$c151=peg$literalExpectation("←",false),peg$c152=function(){return "<-"},peg$c153=peg$otherExpectation("forward fat arrow =>"),peg$c154="=>",peg$c155=peg$literalExpectation("=>",false),peg$c156="⇒",peg$c157=peg$literalExpectation("⇒",false),peg$c158=function(){return "=>"},peg$c159=peg$otherExpectation("two way fat arrow <=>"),peg$c160="<=>",peg$c161=peg$literalExpectation("<=>",false),peg$c162="⇔",peg$c163=peg$literalExpectation("⇔",false),peg$c164=function(){return "<=>"},peg$c165=peg$otherExpectation("back fat arrow <="),peg$c166="<=",peg$c167=peg$literalExpectation("<=",false),peg$c168="⇐",peg$c169=peg$literalExpectation("⇐",false),peg$c170=function(){return "<="},peg$c171=peg$otherExpectation("forward tilde arrow ~>"),peg$c172="~>",peg$c173=peg$literalExpectation("~>",false),peg$c174="↛",peg$c175=peg$literalExpectation("↛",false),peg$c176=function(){return "~>"},peg$c177=peg$otherExpectation("two way tilde arrow <~>"),peg$c178="<~>",peg$c179=peg$literalExpectation("<~>",false),peg$c180="↮",peg$c181=peg$literalExpectation("↮",false),peg$c182=function(){return "<~>"},peg$c183=peg$otherExpectation("back tilde arrow <~"),peg$c184="<~",peg$c185=peg$literalExpectation("<~",false),peg$c186="↚",peg$c187=peg$literalExpectation("↚",false),peg$c188=function(){return "<~"},peg$c189=peg$otherExpectation("light fat arrow <-=>"),peg$c190="<-=>",peg$c191=peg$literalExpectation("<-=>",false),peg$c192="←⇒",peg$c193=peg$literalExpectation("←⇒",false),peg$c194=function(){return "<-=>"},peg$c195="←=>",peg$c196=peg$literalExpectation("←=>",false),peg$c197="<-⇒",peg$c198=peg$literalExpectation("<-⇒",false),peg$c199=peg$otherExpectation("light tilde arrow <-~>"),peg$c200="<-~>",peg$c201=peg$literalExpectation("<-~>",false),peg$c202="←↛",peg$c203=peg$literalExpectation("←↛",false),peg$c204=function(){return "<-~>"},peg$c205="←~>",peg$c206=peg$literalExpectation("←~>",false),peg$c207="<-↛",peg$c208=peg$literalExpectation("<-↛",false),peg$c209=peg$otherExpectation("fat light arrow <=->"),peg$c210="<=->",peg$c211=peg$literalExpectation("<=->",false),peg$c212="⇐→",peg$c213=peg$literalExpectation("⇐→",false),peg$c214=function(){return "<=->"},peg$c215="⇐->",peg$c216=peg$literalExpectation("⇐->",false),peg$c217="<=→",peg$c218=peg$literalExpectation("<=→",false),peg$c219=peg$otherExpectation("fat tilde arrow <=~>"),peg$c220="<=~>",peg$c221=peg$literalExpectation("<=~>",false),peg$c222="⇐↛",peg$c223=peg$literalExpectation("⇐↛",false),peg$c224=function(){return "<=~>"},peg$c225="⇐~>",peg$c226=peg$literalExpectation("⇐~>",false),peg$c227="<=↛",peg$c228=peg$literalExpectation("<=↛",false),peg$c229=peg$otherExpectation("tilde light arrow <~->"),peg$c230="<~->",peg$c231=peg$literalExpectation("<~->",false),peg$c232="↚→",peg$c233=peg$literalExpectation("↚→",false),peg$c234=function(){return "<~->"},peg$c235="↚->",peg$c236=peg$literalExpectation("↚->",false),peg$c237="<~→",peg$c238=peg$literalExpectation("<~→",false),peg$c239=peg$otherExpectation("tilde fat arrow <~=>"),peg$c240="<~=>",peg$c241=peg$literalExpectation("<~=>",false),peg$c242="↚⇒",peg$c243=peg$literalExpectation("↚⇒",false),peg$c244=function(){return "<~=>"},peg$c245="↚=>",peg$c246=peg$literalExpectation("↚=>",false),peg$c247="<~⇒",peg$c248=peg$literalExpectation("<~⇒",false),peg$c249=peg$otherExpectation("light arrow"),peg$c250=peg$otherExpectation("fat arrow"),peg$c251=peg$otherExpectation("tilde arrow"),peg$c252=peg$otherExpectation("mixed arrow"),peg$c253=peg$otherExpectation("arrow"),peg$c254="true",peg$c255=peg$literalExpectation("true",false),peg$c256=function(){return true},peg$c257="false",peg$c258=peg$literalExpectation("false",false),peg$c259=function(){return false},peg$c260="regular",peg$c261=peg$literalExpectation("regular",false),peg$c262="rounded",peg$c263=peg$literalExpectation("rounded",false),peg$c264="lined",peg$c265=peg$literalExpectation("lined",false),peg$c266="solid",peg$c267=peg$literalExpectation("solid",false),peg$c268="dotted",peg$c269=peg$literalExpectation("dotted",false),peg$c270="dashed",peg$c271=peg$literalExpectation("dashed",false),peg$c300="null",peg$c301=peg$literalExpectation("null",false),peg$c302=function(){return null},peg$c303="undefined",peg$c304=peg$literalExpectation("undefined",false),peg$c305=function(){return undefined},peg$c312=peg$otherExpectation("action label"),peg$c314=/^[\n\r\u2028\u2029]/,peg$c315=peg$classExpectation(["\n","\r","\u2028","\u2029"],false,false),peg$c316=peg$otherExpectation("block comment"),peg$c317="/*",peg$c318=peg$literalExpectation("/*",false),peg$c319="*/",peg$c320=peg$literalExpectation("*/",false),peg$c321=peg$anyExpectation(),peg$c322=peg$otherExpectation("line comment"),peg$c323="//",peg$c324=peg$literalExpectation("//",false),peg$c325=peg$otherExpectation("whitespace"),peg$c328=peg$otherExpectation("string"),peg$c331=/^[0-9a-zA-Z.+_\^()*&$#@!?,\x80-\uFFFF]/,peg$c332=peg$classExpectation([["0","9"],["a","z"],["A","Z"],".","+","_","^","(",")","*","&","$","#","@","!","?",",",["","￿"]],false,false),peg$c333=peg$otherExpectation("atom"),peg$c335=peg$otherExpectation("label"),peg$c336="0",peg$c337=peg$literalExpectation("0",false),peg$c338=/^[0-9]/,peg$c339=peg$classExpectation([["0","9"]],false,false),peg$c340=/^[1-9]/,peg$c341=peg$classExpectation([["1","9"]],false,false),peg$c342=/^[0-9a-f]/i,peg$c343=peg$classExpectation([["0","9"],["a","f"]],false,true),peg$c344=/^[0-1]/,peg$c345=peg$classExpectation([["0","1"]],false,false),peg$c346=/^[0-7]/,peg$c347=peg$classExpectation([["0","7"]],false,false),peg$c348=peg$otherExpectation("nonneg number"),peg$c349=".",peg$c350=peg$literalExpectation(".",false),peg$c351=function(){return parseFloat(text())},peg$c352=peg$otherExpectation("number"),peg$c353=function(literal){return literal},peg$c354="NaN",peg$c355=peg$literalExpectation("NaN",false),peg$c356=function(){return NaN},peg$c357="NegativeInfinity",peg$c358=peg$literalExpectation("NegativeInfinity",false),peg$c359=function(){return Number.NEGATIVE_INFINITY},peg$c360="NegativeInf",peg$c361=peg$literalExpectation("NegativeInf",false),peg$c362="NegInfinity",peg$c363=peg$literalExpectation("NegInfinity",false),peg$c364="NegInf",peg$c365=peg$literalExpectation("NegInf",false),peg$c366="NInfinity",peg$c367=peg$literalExpectation("NInfinity",false),peg$c368="NInf",peg$c369=peg$literalExpectation("NInf",false),peg$c370="-∞",peg$c371=peg$literalExpectation("-∞",false),peg$c372="PInfinity",peg$c373=peg$literalExpectation("PInfinity",false),peg$c374=function(){return Number.POSITIVE_INFINITY},peg$c375="Infinity",peg$c376=peg$literalExpectation("Infinity",false),peg$c377="PInf",peg$c378=peg$literalExpectation("PInf",false),peg$c379="Inf",peg$c380=peg$literalExpectation("Inf",false),peg$c381="∞",peg$c382=peg$literalExpectation("∞",false),peg$c383="Epsilon",peg$c384=peg$literalExpectation("Epsilon",false),peg$c385=function(){return Number.EPSILON},peg$c386="𝜀",peg$c387=peg$literalExpectation("𝜀",false),peg$c388="ε",peg$c389=peg$literalExpectation("ε",false),peg$c390="Pi",peg$c391=peg$literalExpectation("Pi",false),peg$c392=function(){return Math.PI},peg$c393="𝜋",peg$c394=peg$literalExpectation("𝜋",false),peg$c395="π",peg$c396=peg$literalExpectation("π",false),peg$c397="EulerNumber",peg$c398=peg$literalExpectation("EulerNumber",false),peg$c399=function(){return Math.E},peg$c400="E",peg$c401=peg$literalExpectation("E",false),peg$c402="e",peg$c403=peg$literalExpectation("e",false),peg$c404="Ɛ",peg$c405=peg$literalExpectation("Ɛ",false),peg$c406="ℇ",peg$c407=peg$literalExpectation("ℇ",false),peg$c408="Root2",peg$c409=peg$literalExpectation("Root2",false),peg$c410=function(){return Math.SQRT2},peg$c411="RootHalf",peg$c412=peg$literalExpectation("RootHalf",false),peg$c413=function(){return Math.SQRT1_2},peg$c414="Ln2",peg$c415=peg$literalExpectation("Ln2",false),peg$c416=function(){return Math.LN2},peg$c417="NatLog2",peg$c418=peg$literalExpectation("NatLog2",false),peg$c419="Ln10",peg$c420=peg$literalExpectation("Ln10",false),peg$c421=function(){return Math.LN10},peg$c422="NatLog10",peg$c423=peg$literalExpectation("NatLog10",false),peg$c424="Log2E",peg$c425=peg$literalExpectation("Log2E",false),peg$c426=function(){return Math.LOG2E},peg$c427="Log10E",peg$c428=peg$literalExpectation("Log10E",false),peg$c429=function(){return Math.LOG10E},peg$c430="MaxSafeInt",peg$c431=peg$literalExpectation("MaxSafeInt",false),peg$c432=function(){return Number.MAX_SAFE_INTEGER},peg$c433="MinSafeInt",peg$c434=peg$literalExpectation("MinSafeInt",false),peg$c435=function(){return Number.MIN_SAFE_INTEGER},peg$c436="MaxPosNum",peg$c437=peg$literalExpectation("MaxPosNum",false),peg$c438=function(){return Number.MAX_VALUE},peg$c439="MinPosNum",peg$c440=peg$literalExpectation("MinPosNum",false),peg$c441=function(){return Number.MIN_VALUE},peg$c442="Phi",peg$c443=peg$literalExpectation("Phi",false),peg$c444=function(){return 1.618033988749895},peg$c445="𝜑",peg$c446=peg$literalExpectation("𝜑",false),peg$c447="𝜙",peg$c448=peg$literalExpectation("𝜙",false),peg$c449="ϕ",peg$c450=peg$literalExpectation("ϕ",false),peg$c451="φ",peg$c452=peg$literalExpectation("φ",false),peg$c453="EulerConstant",peg$c454=peg$literalExpectation("EulerConstant",false),peg$c455=function(){return .5772156649015329},peg$c456="γ",peg$c457=peg$literalExpectation("γ",false),peg$c458="𝛾",peg$c459=peg$literalExpectation("𝛾",false),peg$c460=peg$literalExpectation("e",true),peg$c461=/^[+\-]/,peg$c462=peg$classExpectation(["+","-"],false,false),peg$c463="0x",peg$c464=peg$literalExpectation("0x",true),peg$c465=function(digits){return parseInt(digits,16)},peg$c466="0b",peg$c467=peg$literalExpectation("0b",true),peg$c468=function(digits){return parseInt(digits,2)},peg$c469="0o",peg$c470=peg$literalExpectation("0o",true),peg$c471=function(digits){return parseInt(digits,8)},peg$c472=function(major,minor,patch){const node={major:parseInt(major,10),minor:parseInt(minor,10),patch:parseInt(patch,10),full:text()};if(options.locations){node.loc=location();}return node},peg$c483="http://",peg$c484=peg$literalExpectation("http://",false),peg$c485="https://",peg$c486=peg$literalExpectation("https://",false),peg$c487=/^[a-zA-Z0-9!*'():;@&=+$,\/?#[\]_.~\-]/,peg$c488=peg$classExpectation([["a","z"],["A","Z"],["0","9"],"!","*","'","(",")",":",";","@","&","=","+","$",",","/","?","#","[","]","_",".","~","-"],false,false),peg$c489=function(protocol){return text()},peg$c490="aliceblue",peg$c491=peg$literalExpectation("aliceblue",false),peg$c492=function(){return "#f0f8ffff"},peg$c493="AliceBlue",peg$c494=peg$literalExpectation("AliceBlue",false),peg$c495="antiquewhite",peg$c496=peg$literalExpectation("antiquewhite",false),peg$c497=function(){return "#faebd7ff"},peg$c498="AntiqueWhite",peg$c499=peg$literalExpectation("AntiqueWhite",false),peg$c500="aquamarine",peg$c501=peg$literalExpectation("aquamarine",false),peg$c502=function(){return "#7fffd4ff"},peg$c503="Aquamarine",peg$c504=peg$literalExpectation("Aquamarine",false),peg$c505="aqua",peg$c506=peg$literalExpectation("aqua",false),peg$c507=function(){return "#00ffffff"},peg$c508="Aqua",peg$c509=peg$literalExpectation("Aqua",false),peg$c510="azure",peg$c511=peg$literalExpectation("azure",false),peg$c512=function(){return "#f0ffffff"},peg$c513="Azure",peg$c514=peg$literalExpectation("Azure",false),peg$c515="beige",peg$c516=peg$literalExpectation("beige",false),peg$c517=function(){return "#f5f5dcff"},peg$c518="Beige",peg$c519=peg$literalExpectation("Beige",false),peg$c520="bisque",peg$c521=peg$literalExpectation("bisque",false),peg$c522=function(){return "#ffe4c4ff"},peg$c523="Bisque",peg$c524=peg$literalExpectation("Bisque",false),peg$c525="black",peg$c526=peg$literalExpectation("black",false),peg$c527=function(){return "#000000ff"},peg$c528="Black",peg$c529=peg$literalExpectation("Black",false),peg$c530="blanchedalmond",peg$c531=peg$literalExpectation("blanchedalmond",false),peg$c532=function(){return "#ffebcdff"},peg$c533="BlanchedAlmond",peg$c534=peg$literalExpectation("BlanchedAlmond",false),peg$c535="blueviolet",peg$c536=peg$literalExpectation("blueviolet",false),peg$c537=function(){return "#8a2be2ff"},peg$c538="BlueViolet",peg$c539=peg$literalExpectation("BlueViolet",false),peg$c540="blue",peg$c541=peg$literalExpectation("blue",false),peg$c542=function(){return "#0000ffff"},peg$c543="Blue",peg$c544=peg$literalExpectation("Blue",false),peg$c545="brown",peg$c546=peg$literalExpectation("brown",false),peg$c547=function(){return "#a52a2aff"},peg$c548="Brown",peg$c549=peg$literalExpectation("Brown",false),peg$c550="burlywood",peg$c551=peg$literalExpectation("burlywood",false),peg$c552=function(){return "#deb887ff"},peg$c553="BurlyWood",peg$c554=peg$literalExpectation("BurlyWood",false),peg$c555="cadetblue",peg$c556=peg$literalExpectation("cadetblue",false),peg$c557=function(){return "#5f9ea0ff"},peg$c558="CadetBlue",peg$c559=peg$literalExpectation("CadetBlue",false),peg$c560="chartreuse",peg$c561=peg$literalExpectation("chartreuse",false),peg$c562=function(){return "#7fff00ff"},peg$c563="Chartreuse",peg$c564=peg$literalExpectation("Chartreuse",false),peg$c565="chocolate",peg$c566=peg$literalExpectation("chocolate",false),peg$c567=function(){return "#d2691eff"},peg$c568="Chocolate",peg$c569=peg$literalExpectation("Chocolate",false),peg$c570="coral",peg$c571=peg$literalExpectation("coral",false),peg$c572=function(){return "#ff7f50ff"},peg$c573="Coral",peg$c574=peg$literalExpectation("Coral",false),peg$c575="cornflowerblue",peg$c576=peg$literalExpectation("cornflowerblue",false),peg$c577=function(){return "#6495edff"},peg$c578="CornflowerBlue",peg$c579=peg$literalExpectation("CornflowerBlue",false),peg$c580="cornsilk",peg$c581=peg$literalExpectation("cornsilk",false),peg$c582=function(){return "#fff8dcff"},peg$c583="Cornsilk",peg$c584=peg$literalExpectation("Cornsilk",false),peg$c585="crimson",peg$c586=peg$literalExpectation("crimson",false),peg$c587=function(){return "#dc143cff"},peg$c588="Crimson",peg$c589=peg$literalExpectation("Crimson",false),peg$c590="cyan",peg$c591=peg$literalExpectation("cyan",false),peg$c592="Cyan",peg$c593=peg$literalExpectation("Cyan",false),peg$c594="darkblue",peg$c595=peg$literalExpectation("darkblue",false),peg$c596=function(){return "#00008bff"},peg$c597="DarkBlue",peg$c598=peg$literalExpectation("DarkBlue",false),peg$c599="darkcyan",peg$c600=peg$literalExpectation("darkcyan",false),peg$c601=function(){return "#008b8bff"},peg$c602="DarkCyan",peg$c603=peg$literalExpectation("DarkCyan",false),peg$c604="darkgoldenrod",peg$c605=peg$literalExpectation("darkgoldenrod",false),peg$c606=function(){return "#b8860bff"},peg$c607="DarkGoldenRod",peg$c608=peg$literalExpectation("DarkGoldenRod",false),peg$c609="darkgray",peg$c610=peg$literalExpectation("darkgray",false),peg$c611=function(){return "#a9a9a9ff"},peg$c612="DarkGray",peg$c613=peg$literalExpectation("DarkGray",false),peg$c614="darkgrey",peg$c615=peg$literalExpectation("darkgrey",false),peg$c616="DarkGrey",peg$c617=peg$literalExpectation("DarkGrey",false),peg$c618="darkgreen",peg$c619=peg$literalExpectation("darkgreen",false),peg$c620=function(){return "#006400ff"},peg$c621="DarkGreen",peg$c622=peg$literalExpectation("DarkGreen",false),peg$c623="darkkhaki",peg$c624=peg$literalExpectation("darkkhaki",false),peg$c625=function(){return "#bdb76bff"},peg$c626="DarkKhaki",peg$c627=peg$literalExpectation("DarkKhaki",false),peg$c628="darkmagenta",peg$c629=peg$literalExpectation("darkmagenta",false),peg$c630=function(){return "#8b008bff"},peg$c631="DarkMagenta",peg$c632=peg$literalExpectation("DarkMagenta",false),peg$c633="darkolivegreen",peg$c634=peg$literalExpectation("darkolivegreen",false),peg$c635=function(){return "#556b2fff"},peg$c636="DarkOliveGreen",peg$c637=peg$literalExpectation("DarkOliveGreen",false),peg$c638="darkorange",peg$c639=peg$literalExpectation("darkorange",false),peg$c640=function(){return "#ff8c00ff"},peg$c641="Darkorange",peg$c642=peg$literalExpectation("Darkorange",false),peg$c643="darkorchid",peg$c644=peg$literalExpectation("darkorchid",false),peg$c645=function(){return "#9932ccff"},peg$c646="DarkOrchid",peg$c647=peg$literalExpectation("DarkOrchid",false),peg$c648="darkred",peg$c649=peg$literalExpectation("darkred",false),peg$c650=function(){return "#8b0000ff"},peg$c651="DarkRed",peg$c652=peg$literalExpectation("DarkRed",false),peg$c653="darksalmon",peg$c654=peg$literalExpectation("darksalmon",false),peg$c655=function(){return "#e9967aff"},peg$c656="DarkSalmon",peg$c657=peg$literalExpectation("DarkSalmon",false),peg$c658="darkseagreen",peg$c659=peg$literalExpectation("darkseagreen",false),peg$c660=function(){return "#8fbc8fff"},peg$c661="DarkSeaGreen",peg$c662=peg$literalExpectation("DarkSeaGreen",false),peg$c663="darkslateblue",peg$c664=peg$literalExpectation("darkslateblue",false),peg$c665=function(){return "#483d8bff"},peg$c666="DarkSlateBlue",peg$c667=peg$literalExpectation("DarkSlateBlue",false),peg$c668="darkslategray",peg$c669=peg$literalExpectation("darkslategray",false),peg$c670=function(){return "#2f4f4fff"},peg$c671="DarkSlateGray",peg$c672=peg$literalExpectation("DarkSlateGray",false),peg$c673="darkslategrey",peg$c674=peg$literalExpectation("darkslategrey",false),peg$c675="DarkSlateGrey",peg$c676=peg$literalExpectation("DarkSlateGrey",false),peg$c677="darkturquoise",peg$c678=peg$literalExpectation("darkturquoise",false),peg$c679=function(){return "#00ced1ff"},peg$c680="DarkTurquoise",peg$c681=peg$literalExpectation("DarkTurquoise",false),peg$c682="darkviolet",peg$c683=peg$literalExpectation("darkviolet",false),peg$c684=function(){return "#9400d3ff"},peg$c685="DarkViolet",peg$c686=peg$literalExpectation("DarkViolet",false),peg$c687="deeppink",peg$c688=peg$literalExpectation("deeppink",false),peg$c689=function(){return "#ff1493ff"},peg$c690="DeepPink",peg$c691=peg$literalExpectation("DeepPink",false),peg$c692="deepskyblue",peg$c693=peg$literalExpectation("deepskyblue",false),peg$c694=function(){return "#00bfffff"},peg$c695="DeepSkyBlue",peg$c696=peg$literalExpectation("DeepSkyBlue",false),peg$c697="dimgray",peg$c698=peg$literalExpectation("dimgray",false),peg$c699=function(){return "#696969ff"},peg$c700="DimGray",peg$c701=peg$literalExpectation("DimGray",false),peg$c702="dimgrey",peg$c703=peg$literalExpectation("dimgrey",false),peg$c704="DimGrey",peg$c705=peg$literalExpectation("DimGrey",false),peg$c706="dodgerblue",peg$c707=peg$literalExpectation("dodgerblue",false),peg$c708=function(){return "#1e90ffff"},peg$c709="DodgerBlue",peg$c710=peg$literalExpectation("DodgerBlue",false),peg$c711="firebrick",peg$c712=peg$literalExpectation("firebrick",false),peg$c713=function(){return "#b22222ff"},peg$c714="FireBrick",peg$c715=peg$literalExpectation("FireBrick",false),peg$c716="floralwhite",peg$c717=peg$literalExpectation("floralwhite",false),peg$c718=function(){return "#fffaf0ff"},peg$c719="FloralWhite",peg$c720=peg$literalExpectation("FloralWhite",false),peg$c721="forestgreen",peg$c722=peg$literalExpectation("forestgreen",false),peg$c723=function(){return "#228b22ff"},peg$c724="ForestGreen",peg$c725=peg$literalExpectation("ForestGreen",false),peg$c726="fuchsia",peg$c727=peg$literalExpectation("fuchsia",false),peg$c728=function(){return "#ff00ffff"},peg$c729="Fuchsia",peg$c730=peg$literalExpectation("Fuchsia",false),peg$c731="gainsboro",peg$c732=peg$literalExpectation("gainsboro",false),peg$c733=function(){return "#dcdcdcff"},peg$c734="Gainsboro",peg$c735=peg$literalExpectation("Gainsboro",false),peg$c736="ghostwhite",peg$c737=peg$literalExpectation("ghostwhite",false),peg$c738=function(){return "#f8f8ffff"},peg$c739="GhostWhite",peg$c740=peg$literalExpectation("GhostWhite",false),peg$c741="goldenrod",peg$c742=peg$literalExpectation("goldenrod",false),peg$c743=function(){return "#daa520ff"},peg$c744="GoldenRod",peg$c745=peg$literalExpectation("GoldenRod",false),peg$c746="gold",peg$c747=peg$literalExpectation("gold",false),peg$c748=function(){return "#ffd700ff"},peg$c749="Gold",peg$c750=peg$literalExpectation("Gold",false),peg$c751="gray",peg$c752=peg$literalExpectation("gray",false),peg$c753=function(){return "#808080ff"},peg$c754="Gray",peg$c755=peg$literalExpectation("Gray",false),peg$c756="grey",peg$c757=peg$literalExpectation("grey",false),peg$c758="Grey",peg$c759=peg$literalExpectation("Grey",false),peg$c760="greenyellow",peg$c761=peg$literalExpectation("greenyellow",false),peg$c762=function(){return "#adff2fff"},peg$c763="GreenYellow",peg$c764=peg$literalExpectation("GreenYellow",false),peg$c765="green",peg$c766=peg$literalExpectation("green",false),peg$c767=function(){return "#008000ff"},peg$c768="Green",peg$c769=peg$literalExpectation("Green",false),peg$c770="honeydew",peg$c771=peg$literalExpectation("honeydew",false),peg$c772=function(){return "#f0fff0ff"},peg$c773="HoneyDew",peg$c774=peg$literalExpectation("HoneyDew",false),peg$c775="hotpink",peg$c776=peg$literalExpectation("hotpink",false),peg$c777=function(){return "#ff69b4ff"},peg$c778="HotPink",peg$c779=peg$literalExpectation("HotPink",false),peg$c780="indianred",peg$c781=peg$literalExpectation("indianred",false),peg$c782=function(){return "#cd5c5cff"},peg$c783="IndianRed",peg$c784=peg$literalExpectation("IndianRed",false),peg$c785="indigo",peg$c786=peg$literalExpectation("indigo",false),peg$c787=function(){return "#4b0082ff"},peg$c788="Indigo",peg$c789=peg$literalExpectation("Indigo",false),peg$c790="ivory",peg$c791=peg$literalExpectation("ivory",false),peg$c792=function(){return "#fffff0ff"},peg$c793="Ivory",peg$c794=peg$literalExpectation("Ivory",false),peg$c795="khaki",peg$c796=peg$literalExpectation("khaki",false),peg$c797=function(){return "#f0e68cff"},peg$c798="Khaki",peg$c799=peg$literalExpectation("Khaki",false),peg$c800="lavenderblush",peg$c801=peg$literalExpectation("lavenderblush",false),peg$c802=function(){return "#fff0f5ff"},peg$c803="LavenderBlush",peg$c804=peg$literalExpectation("LavenderBlush",false),peg$c805="lavender",peg$c806=peg$literalExpectation("lavender",false),peg$c807=function(){return "#e6e6faff"},peg$c808="Lavender",peg$c809=peg$literalExpectation("Lavender",false),peg$c810="lawngreen",peg$c811=peg$literalExpectation("lawngreen",false),peg$c812=function(){return "#7cfc00ff"},peg$c813="LawnGreen",peg$c814=peg$literalExpectation("LawnGreen",false),peg$c815="lemonchiffon",peg$c816=peg$literalExpectation("lemonchiffon",false),peg$c817=function(){return "#fffacdff"},peg$c818="LemonChiffon",peg$c819=peg$literalExpectation("LemonChiffon",false),peg$c820="lightblue",peg$c821=peg$literalExpectation("lightblue",false),peg$c822=function(){return "#add8e6ff"},peg$c823="LightBlue",peg$c824=peg$literalExpectation("LightBlue",false),peg$c825="lightcoral",peg$c826=peg$literalExpectation("lightcoral",false),peg$c827=function(){return "#f08080ff"},peg$c828="LightCoral",peg$c829=peg$literalExpectation("LightCoral",false),peg$c830="lightcyan",peg$c831=peg$literalExpectation("lightcyan",false),peg$c832=function(){return "#e0ffffff"},peg$c833="LightCyan",peg$c834=peg$literalExpectation("LightCyan",false),peg$c835="lightgoldenrodyellow",peg$c836=peg$literalExpectation("lightgoldenrodyellow",false),peg$c837=function(){return "#fafad2ff"},peg$c838="LightGoldenRodYellow",peg$c839=peg$literalExpectation("LightGoldenRodYellow",false),peg$c840="lightgray",peg$c841=peg$literalExpectation("lightgray",false),peg$c842=function(){return "#d3d3d3ff"},peg$c843="LightGray",peg$c844=peg$literalExpectation("LightGray",false),peg$c845="lightgrey",peg$c846=peg$literalExpectation("lightgrey",false),peg$c847="LightGrey",peg$c848=peg$literalExpectation("LightGrey",false),peg$c849="lightgreen",peg$c850=peg$literalExpectation("lightgreen",false),peg$c851=function(){return "#90ee90ff"},peg$c852="LightGreen",peg$c853=peg$literalExpectation("LightGreen",false),peg$c854="lightpink",peg$c855=peg$literalExpectation("lightpink",false),peg$c856=function(){return "#ffb6c1ff"},peg$c857="LightPink",peg$c858=peg$literalExpectation("LightPink",false),peg$c859="lightsalmon",peg$c860=peg$literalExpectation("lightsalmon",false),peg$c861=function(){return "#ffa07aff"},peg$c862="LightSalmon",peg$c863=peg$literalExpectation("LightSalmon",false),peg$c864="lightseagreen",peg$c865=peg$literalExpectation("lightseagreen",false),peg$c866=function(){return "#20b2aaff"},peg$c867="LightSeaGreen",peg$c868=peg$literalExpectation("LightSeaGreen",false),peg$c869="lightskyblue",peg$c870=peg$literalExpectation("lightskyblue",false),peg$c871=function(){return "#87cefaff"},peg$c872="LightSkyBlue",peg$c873=peg$literalExpectation("LightSkyBlue",false),peg$c874="lightslategray",peg$c875=peg$literalExpectation("lightslategray",false),peg$c876=function(){return "#778899ff"},peg$c877="LightSlateGray",peg$c878=peg$literalExpectation("LightSlateGray",false),peg$c879="lightslategrey",peg$c880=peg$literalExpectation("lightslategrey",false),peg$c881="LightSlateGrey",peg$c882=peg$literalExpectation("LightSlateGrey",false),peg$c883="lightsteelblue",peg$c884=peg$literalExpectation("lightsteelblue",false),peg$c885=function(){return "#b0c4deff"},peg$c886="LightSteelBlue",peg$c887=peg$literalExpectation("LightSteelBlue",false),peg$c888="lightyellow",peg$c889=peg$literalExpectation("lightyellow",false),peg$c890=function(){return "#ffffe0ff"},peg$c891="LightYellow",peg$c892=peg$literalExpectation("LightYellow",false),peg$c893="limegreen",peg$c894=peg$literalExpectation("limegreen",false),peg$c895=function(){return "#32cd32ff"},peg$c896="LimeGreen",peg$c897=peg$literalExpectation("LimeGreen",false),peg$c898="lime",peg$c899=peg$literalExpectation("lime",false),peg$c900=function(){return "#00ff00ff"},peg$c901="Lime",peg$c902=peg$literalExpectation("Lime",false),peg$c903="linen",peg$c904=peg$literalExpectation("linen",false),peg$c905=function(){return "#faf0e6ff"},peg$c906="Linen",peg$c907=peg$literalExpectation("Linen",false),peg$c908="magenta",peg$c909=peg$literalExpectation("magenta",false),peg$c910="Magenta",peg$c911=peg$literalExpectation("Magenta",false),peg$c912="maroon",peg$c913=peg$literalExpectation("maroon",false),peg$c914=function(){return "#800000ff"},peg$c915="Maroon",peg$c916=peg$literalExpectation("Maroon",false),peg$c917="mediumaquamarine",peg$c918=peg$literalExpectation("mediumaquamarine",false),peg$c919=function(){return "#66cdaaff"},peg$c920="MediumAquaMarine",peg$c921=peg$literalExpectation("MediumAquaMarine",false),peg$c922="mediumblue",peg$c923=peg$literalExpectation("mediumblue",false),peg$c924=function(){return "#0000cdff"},peg$c925="MediumBlue",peg$c926=peg$literalExpectation("MediumBlue",false),peg$c927="mediumorchid",peg$c928=peg$literalExpectation("mediumorchid",false),peg$c929=function(){return "#ba55d3ff"},peg$c930="MediumOrchid",peg$c931=peg$literalExpectation("MediumOrchid",false),peg$c932="mediumpurple",peg$c933=peg$literalExpectation("mediumpurple",false),peg$c934=function(){return "#9370d8ff"},peg$c935="MediumPurple",peg$c936=peg$literalExpectation("MediumPurple",false),peg$c937="mediumseagreen",peg$c938=peg$literalExpectation("mediumseagreen",false),peg$c939=function(){return "#3cb371ff"},peg$c940="MediumSeaGreen",peg$c941=peg$literalExpectation("MediumSeaGreen",false),peg$c942="mediumslateblue",peg$c943=peg$literalExpectation("mediumslateblue",false),peg$c944=function(){return "#7b68eeff"},peg$c945="MediumSlateBlue",peg$c946=peg$literalExpectation("MediumSlateBlue",false),peg$c947="mediumspringgreen",peg$c948=peg$literalExpectation("mediumspringgreen",false),peg$c949=function(){return "#00fa9aff"},peg$c950="MediumSpringGreen",peg$c951=peg$literalExpectation("MediumSpringGreen",false),peg$c952="mediumturquoise",peg$c953=peg$literalExpectation("mediumturquoise",false),peg$c954=function(){return "#48d1ccff"},peg$c955="MediumTurquoise",peg$c956=peg$literalExpectation("MediumTurquoise",false),peg$c957="mediumvioletred",peg$c958=peg$literalExpectation("mediumvioletred",false),peg$c959=function(){return "#c71585ff"},peg$c960="MediumVioletRed",peg$c961=peg$literalExpectation("MediumVioletRed",false),peg$c962="midnightblue",peg$c963=peg$literalExpectation("midnightblue",false),peg$c964=function(){return "#191970ff"},peg$c965="MidnightBlue",peg$c966=peg$literalExpectation("MidnightBlue",false),peg$c967="mintcream",peg$c968=peg$literalExpectation("mintcream",false),peg$c969=function(){return "#f5fffaff"},peg$c970="MintCream",peg$c971=peg$literalExpectation("MintCream",false),peg$c972="mistyrose",peg$c973=peg$literalExpectation("mistyrose",false),peg$c974=function(){return "#ffe4e1ff"},peg$c975="MistyRose",peg$c976=peg$literalExpectation("MistyRose",false),peg$c977="moccasin",peg$c978=peg$literalExpectation("moccasin",false),peg$c979=function(){return "#ffe4b5ff"},peg$c980="Moccasin",peg$c981=peg$literalExpectation("Moccasin",false),peg$c982="navajowhite",peg$c983=peg$literalExpectation("navajowhite",false),peg$c984=function(){return "#ffdeadff"},peg$c985="NavajoWhite",peg$c986=peg$literalExpectation("NavajoWhite",false),peg$c987="navy",peg$c988=peg$literalExpectation("navy",false),peg$c989=function(){return "#000080ff"},peg$c990="Navy",peg$c991=peg$literalExpectation("Navy",false),peg$c992="oldlace",peg$c993=peg$literalExpectation("oldlace",false),peg$c994=function(){return "#fdf5e6ff"},peg$c995="OldLace",peg$c996=peg$literalExpectation("OldLace",false),peg$c997="olivedrab",peg$c998=peg$literalExpectation("olivedrab",false),peg$c999=function(){return "#6b8e23ff"},peg$c1000="OliveDrab",peg$c1001=peg$literalExpectation("OliveDrab",false),peg$c1002="olive",peg$c1003=peg$literalExpectation("olive",false),peg$c1004=function(){return "#808000ff"},peg$c1005="Olive",peg$c1006=peg$literalExpectation("Olive",false),peg$c1007="orangered",peg$c1008=peg$literalExpectation("orangered",false),peg$c1009=function(){return "#ff4500ff"},peg$c1010="OrangeRed",peg$c1011=peg$literalExpectation("OrangeRed",false),peg$c1012="orange",peg$c1013=peg$literalExpectation("orange",false),peg$c1014=function(){return "#ffa500ff"},peg$c1015="Orange",peg$c1016=peg$literalExpectation("Orange",false),peg$c1017="orchid",peg$c1018=peg$literalExpectation("orchid",false),peg$c1019=function(){return "#da70d6ff"},peg$c1020="Orchid",peg$c1021=peg$literalExpectation("Orchid",false),peg$c1022="palegoldenrod",peg$c1023=peg$literalExpectation("palegoldenrod",false),peg$c1024=function(){return "#eee8aaff"},peg$c1025="PaleGoldenRod",peg$c1026=peg$literalExpectation("PaleGoldenRod",false),peg$c1027="palegreen",peg$c1028=peg$literalExpectation("palegreen",false),peg$c1029=function(){return "#98fb98ff"},peg$c1030="PaleGreen",peg$c1031=peg$literalExpectation("PaleGreen",false),peg$c1032="paleturquoise",peg$c1033=peg$literalExpectation("paleturquoise",false),peg$c1034=function(){return "#afeeeeff"},peg$c1035="PaleTurquoise",peg$c1036=peg$literalExpectation("PaleTurquoise",false),peg$c1037="palevioletred",peg$c1038=peg$literalExpectation("palevioletred",false),peg$c1039=function(){return "#d87093ff"},peg$c1040="PaleVioletRed",peg$c1041=peg$literalExpectation("PaleVioletRed",false),peg$c1042="papayawhip",peg$c1043=peg$literalExpectation("papayawhip",false),peg$c1044=function(){return "#ffefd5ff"},peg$c1045="PapayaWhip",peg$c1046=peg$literalExpectation("PapayaWhip",false),peg$c1047="peachpuff",peg$c1048=peg$literalExpectation("peachpuff",false),peg$c1049=function(){return "#ffdab9ff"},peg$c1050="PeachPuff",peg$c1051=peg$literalExpectation("PeachPuff",false),peg$c1052="peru",peg$c1053=peg$literalExpectation("peru",false),peg$c1054=function(){return "#cd853fff"},peg$c1055="Peru",peg$c1056=peg$literalExpectation("Peru",false),peg$c1057="pink",peg$c1058=peg$literalExpectation("pink",false),peg$c1059=function(){return "#ffc0cbff"},peg$c1060="Pink",peg$c1061=peg$literalExpectation("Pink",false),peg$c1062="plum",peg$c1063=peg$literalExpectation("plum",false),peg$c1064=function(){return "#dda0ddff"},peg$c1065="Plum",peg$c1066=peg$literalExpectation("Plum",false),peg$c1067="powderblue",peg$c1068=peg$literalExpectation("powderblue",false),peg$c1069=function(){return "#b0e0e6ff"},peg$c1070="PowderBlue",peg$c1071=peg$literalExpectation("PowderBlue",false),peg$c1072="purple",peg$c1073=peg$literalExpectation("purple",false),peg$c1074=function(){return "#800080ff"},peg$c1075="Purple",peg$c1076=peg$literalExpectation("Purple",false),peg$c1077="red",peg$c1078=peg$literalExpectation("red",false),peg$c1079=function(){return "#ff0000ff"},peg$c1080="Red",peg$c1081=peg$literalExpectation("Red",false),peg$c1082="rosybrown",peg$c1083=peg$literalExpectation("rosybrown",false),peg$c1084=function(){return "#bc8f8fff"},peg$c1085="RosyBrown",peg$c1086=peg$literalExpectation("RosyBrown",false),peg$c1087="royalblue",peg$c1088=peg$literalExpectation("royalblue",false),peg$c1089=function(){return "#4169e1ff"},peg$c1090="RoyalBlue",peg$c1091=peg$literalExpectation("RoyalBlue",false),peg$c1092="saddlebrown",peg$c1093=peg$literalExpectation("saddlebrown",false),peg$c1094=function(){return "#8b4513ff"},peg$c1095="SaddleBrown",peg$c1096=peg$literalExpectation("SaddleBrown",false),peg$c1097="salmon",peg$c1098=peg$literalExpectation("salmon",false),peg$c1099=function(){return "#fa8072ff"},peg$c1100="Salmon",peg$c1101=peg$literalExpectation("Salmon",false),peg$c1102="sandybrown",peg$c1103=peg$literalExpectation("sandybrown",false),peg$c1104=function(){return "#f4a460ff"},peg$c1105="SandyBrown",peg$c1106=peg$literalExpectation("SandyBrown",false),peg$c1107="seagreen",peg$c1108=peg$literalExpectation("seagreen",false),peg$c1109=function(){return "#2e8b57ff"},peg$c1110="SeaGreen",peg$c1111=peg$literalExpectation("SeaGreen",false),peg$c1112="seashell",peg$c1113=peg$literalExpectation("seashell",false),peg$c1114=function(){return "#fff5eeff"},peg$c1115="SeaShell",peg$c1116=peg$literalExpectation("SeaShell",false),peg$c1117="sienna",peg$c1118=peg$literalExpectation("sienna",false),peg$c1119=function(){return "#a0522dff"},peg$c1120="Sienna",peg$c1121=peg$literalExpectation("Sienna",false),peg$c1122="silver",peg$c1123=peg$literalExpectation("silver",false),peg$c1124=function(){return "#c0c0c0ff"},peg$c1125="Silver",peg$c1126=peg$literalExpectation("Silver",false),peg$c1127="skyblue",peg$c1128=peg$literalExpectation("skyblue",false),peg$c1129=function(){return "#87ceebff"},peg$c1130="SkyBlue",peg$c1131=peg$literalExpectation("SkyBlue",false),peg$c1132="slateblue",peg$c1133=peg$literalExpectation("slateblue",false),peg$c1134=function(){return "#6a5acdff"},peg$c1135="SlateBlue",peg$c1136=peg$literalExpectation("SlateBlue",false),peg$c1137="slategray",peg$c1138=peg$literalExpectation("slategray",false),peg$c1139=function(){return "#708090ff"},peg$c1140="SlateGray",peg$c1141=peg$literalExpectation("SlateGray",false),peg$c1142="slategrey",peg$c1143=peg$literalExpectation("slategrey",false),peg$c1144="SlateGrey",peg$c1145=peg$literalExpectation("SlateGrey",false),peg$c1146="snow",peg$c1147=peg$literalExpectation("snow",false),peg$c1148=function(){return "#fffafaff"},peg$c1149="Snow",peg$c1150=peg$literalExpectation("Snow",false),peg$c1151="springgreen",peg$c1152=peg$literalExpectation("springgreen",false),peg$c1153=function(){return "#00ff7fff"},peg$c1154="SpringGreen",peg$c1155=peg$literalExpectation("SpringGreen",false),peg$c1156="steelblue",peg$c1157=peg$literalExpectation("steelblue",false),peg$c1158=function(){return "#4682b4ff"},peg$c1159="SteelBlue",peg$c1160=peg$literalExpectation("SteelBlue",false),peg$c1161="tan",peg$c1162=peg$literalExpectation("tan",false),peg$c1163=function(){return "#d2b48cff"},peg$c1164="Tan",peg$c1165=peg$literalExpectation("Tan",false),peg$c1166="teal",peg$c1167=peg$literalExpectation("teal",false),peg$c1168=function(){return "#008080ff"},peg$c1169="Teal",peg$c1170=peg$literalExpectation("Teal",false),peg$c1171="thistle",peg$c1172=peg$literalExpectation("thistle",false),peg$c1173=function(){return "#d8bfd8ff"},peg$c1174="Thistle",peg$c1175=peg$literalExpectation("Thistle",false),peg$c1176="tomato",peg$c1177=peg$literalExpectation("tomato",false),peg$c1178=function(){return "#ff6347ff"},peg$c1179="Tomato",peg$c1180=peg$literalExpectation("Tomato",false),peg$c1181="transparent",peg$c1182=peg$literalExpectation("transparent",false),peg$c1183=function(){return "#00000000"},peg$c1184="Transparent",peg$c1185=peg$literalExpectation("Transparent",false),peg$c1186="turquoise",peg$c1187=peg$literalExpectation("turquoise",false),peg$c1188=function(){return "#40e0d0ff"},peg$c1189="Turquoise",peg$c1190=peg$literalExpectation("Turquoise",false),peg$c1191="violet",peg$c1192=peg$literalExpectation("violet",false),peg$c1193=function(){return "#ee82eeff"},peg$c1194="Violet",peg$c1195=peg$literalExpectation("Violet",false),peg$c1196="wheat",peg$c1197=peg$literalExpectation("wheat",false),peg$c1198=function(){return "#f5deb3ff"},peg$c1199="Wheat",peg$c1200=peg$literalExpectation("Wheat",false),peg$c1201="whitesmoke",peg$c1202=peg$literalExpectation("whitesmoke",false),peg$c1203=function(){return "#f5f5f5ff"},peg$c1204="WhiteSmoke",peg$c1205=peg$literalExpectation("WhiteSmoke",false),peg$c1206="white",peg$c1207=peg$literalExpectation("white",false),peg$c1208=function(){return "#ffffffff"},peg$c1209="White",peg$c1210=peg$literalExpectation("White",false),peg$c1211="yellowgreen",peg$c1212=peg$literalExpectation("yellowgreen",false),peg$c1213=function(){return "#9acd32ff"},peg$c1214="YellowGreen",peg$c1215=peg$literalExpectation("YellowGreen",false),peg$c1216="yellow",peg$c1217=peg$literalExpectation("yellow",false),peg$c1218=function(){return "#ffff00ff"},peg$c1219="Yellow",peg$c1220=peg$literalExpectation("Yellow",false),peg$c1221=function(lab){return lab},peg$c1222="#",peg$c1223=peg$literalExpectation("#",false),peg$c1224=function(r,g,b){return `#${r}${r}${g}${g}${b}${b}ff`},peg$c1225=function(r1,r2,g1,g2,b1,b2){return `#${r1}${r2}${g1}${g2}${b1}${b2}ff`},peg$c1226=function(r,g,b,a){return `#${r}${r}${g}${g}${b}${b}${a}${a}`},peg$c1227=function(r1,r2,g1,g2,b1,b2,a1,a2){return `#${r1}${r2}${g1}${g2}${b1}${b2}${a1}${a2}`},peg$c1228=peg$otherExpectation("color"),peg$c1229="arc_label",peg$c1230=peg$literalExpectation("arc_label",false),peg$c1231="head_label",peg$c1232=peg$literalExpectation("head_label",false),peg$c1233="tail_label",peg$c1234=peg$literalExpectation("tail_label",false),peg$c1235=":",peg$c1236=peg$literalExpectation(":",false),peg$c1237=";",peg$c1238=peg$literalExpectation(";",false),peg$c1239=function(key,value){const node={key:key,value:value};if(options.locations){node.loc=location();}return node},peg$c1240=peg$otherExpectation("single edge color"),peg$c1241="edge-color",peg$c1242=peg$literalExpectation("edge-color",false),peg$c1243=function(v){return options.locations?{__v:v,__loc:location()}:v},peg$c1244=function(value){const raw=options.locations?value.__v:value;const node={key:"single_edge_color",value:raw};if(options.locations){node.loc=location();node.value_loc=value.__loc;}return node},peg$c1245="edge_color",peg$c1246=peg$literalExpectation("edge_color",false),peg$c1247=peg$otherExpectation("transition line style"),peg$c1248="line-style",peg$c1249=peg$literalExpectation("line-style",false),peg$c1250=function(value){const node={key:"transition_line_style",value:value};if(options.locations){node.loc=location();}return node},peg$c1251="{",peg$c1252=peg$literalExpectation("{",false),peg$c1253="}",peg$c1254=peg$literalExpectation("}",false),peg$c1255=function(items){return items},peg$c1256="%",peg$c1257=peg$literalExpectation("%",false),peg$c1258=function(value){const node={key:"arrow probability",value:value};if(options.locations){node.loc=location();}return node},peg$c1259="milliseconds",peg$c1260=peg$literalExpectation("milliseconds",false),peg$c1261=function(){return 1},peg$c1262="millisecond",peg$c1263=peg$literalExpectation("millisecond",false),peg$c1264="msecs",peg$c1265=peg$literalExpectation("msecs",false),peg$c1266="msec",peg$c1267=peg$literalExpectation("msec",false),peg$c1268="ms",peg$c1269=peg$literalExpectation("ms",false),peg$c1270="seconds",peg$c1271=peg$literalExpectation("seconds",false),peg$c1272=function(){return 1e3},peg$c1273="second",peg$c1274=peg$literalExpectation("second",false),peg$c1275="secs",peg$c1276=peg$literalExpectation("secs",false),peg$c1277="sec",peg$c1278=peg$literalExpectation("sec",false),peg$c1279="s",peg$c1280=peg$literalExpectation("s",false),peg$c1281="minutes",peg$c1282=peg$literalExpectation("minutes",false),peg$c1283=function(){return 1e3*60},peg$c1284="minute",peg$c1285=peg$literalExpectation("minute",false),peg$c1286="mins",peg$c1287=peg$literalExpectation("mins",false),peg$c1288="min",peg$c1289=peg$literalExpectation("min",false),peg$c1290="m",peg$c1291=peg$literalExpectation("m",false),peg$c1292="hours",peg$c1293=peg$literalExpectation("hours",false),peg$c1294=function(){return 1e3*60*60},peg$c1295="hour",peg$c1296=peg$literalExpectation("hour",false),peg$c1297="hrs",peg$c1298=peg$literalExpectation("hrs",false),peg$c1299="hr",peg$c1300=peg$literalExpectation("hr",false),peg$c1301="h",peg$c1302=peg$literalExpectation("h",false),peg$c1303="days",peg$c1304=peg$literalExpectation("days",false),peg$c1305=function(){return 1e3*60*60*24},peg$c1306="day",peg$c1307=peg$literalExpectation("day",false),peg$c1308="d",peg$c1309=peg$literalExpectation("d",false),peg$c1310="weeks",peg$c1311=peg$literalExpectation("weeks",false),peg$c1312=function(){return 1e3*60*60*24*7},peg$c1313="week",peg$c1314=peg$literalExpectation("week",false),peg$c1315="wks",peg$c1316=peg$literalExpectation("wks",false),peg$c1317="wk",peg$c1318=peg$literalExpectation("wk",false),peg$c1319="w",peg$c1320=peg$literalExpectation("w",false),peg$c1321="after",peg$c1322=peg$literalExpectation("after",false),peg$c1323=function(value,timescale){return value*(timescale||1e3)},peg$c1324=function(names){return names.map(i=>i[0])},peg$c1325=peg$otherExpectation("group reference"),peg$c1326="&",peg$c1327=peg$literalExpectation("&",false),peg$c1328=function(name){return {key:"group_ref",name:name}},peg$c1329="...",peg$c1330=peg$literalExpectation("...",false),peg$c1331=function(name){const m={kind:"group",name:name,mode:"spread"};if(options.locations){m.__loc=location();}return m},peg$c1332=function(name){const m={kind:"group",name:name,mode:"nest"};if(options.locations){m.__loc=location();}return m},peg$c1333=function(name){const m={kind:"state",name:name};if(options.locations){m.__loc=location();}return m},peg$c1334=function(members){const items=members.map(m=>m[0]);const has_group=items.some(m=>m.kind==="group");const collapsed=has_group?items:items.map(m=>m.name);if(options.locations){collapsed.__member_locs=items.map(m=>m.__loc);}return collapsed},peg$c1335="+|",peg$c1336=peg$literalExpectation("+|",false),peg$c1337=function(n){const node={key:"stripe",value:parseInt(n,10)};if(options.locations){node.loc=location();}return node},peg$c1338="-|",peg$c1339=peg$literalExpectation("-|",false),peg$c1340=function(n){const node={key:"stripe",value:-1*parseInt(n,10)};if(options.locations){node.loc=location();}return node},peg$c1341="+",peg$c1342=peg$literalExpectation("+",false),peg$c1343=function(n){const node={key:"cycle",value:parseInt(n,10)};if(options.locations){node.loc=location();}return node},peg$c1344="-",peg$c1345=peg$literalExpectation("-",false),peg$c1346=function(n){const node={key:"cycle",value:-1*parseInt(n,10)};if(options.locations){node.loc=location();}return node},peg$c1347="+0",peg$c1348=peg$literalExpectation("+0",false),peg$c1349=function(){const node={key:"cycle",value:0};if(options.locations){node.loc=location();}return node},peg$c1350=function(v){return {_kind:"after",v:v}},peg$c1351=function(v){return {_kind:"action",v:v,loc:location()}},peg$c1352=function(v){return {_kind:"prob",v:v}},peg$c1353=function(v){return {_kind:"desc",v:v}},peg$c1354=function(d){return d},peg$c1355=function(pre,arrow,post,l){return options.locations?{__v:l,__loc:location()}:l},peg$c1356=function(pre,arrow,post,label,tail){const toVal=options.locations?label.__v:label;const base={kind:arrow,to:toVal};const seen={};for(const d of pre){if(seen["pre:"+d._kind]){error("duplicate "+d._kind+" decoration before arrow",location());}seen["pre:"+d._kind]=true;if(d._kind==="after"&&d.v!=null){base.r_after=d.v;}if(d._kind==="action"&&d.v!=null){base.r_action=d.v;if(options.locations){base.r_action_loc=d.loc;}}if(d._kind==="prob"&&d.v!=null){base.r_probability=d.v.value;}if(d._kind==="desc"&&d.v!=null){base.l_desc=d.v;}}for(const d of post){if(seen["post:"+d._kind]){error("duplicate "+d._kind+" decoration after arrow",location());}seen["post:"+d._kind]=true;if(d._kind==="after"&&d.v!=null){base.l_after=d.v;}if(d._kind==="action"&&d.v!=null){base.l_action=d.v;if(options.locations){base.l_action_loc=d.loc;}}if(d._kind==="prob"&&d.v!=null){base.l_probability=d.v.value;}if(d._kind==="desc"&&d.v!=null){base.r_desc=d.v;}}if(tail){base.se=tail;}if(options.locations){base.loc=location();base.to_loc=label.__loc;}return base},peg$c1357=function(l){return options.locations?{__v:l,__loc:location()}:l},peg$c1358=function(label,se){const fromVal=options.locations?label.__v:label;const base={key:"transition",from:fromVal};if(se){base.se=se;}if(options.locations){base.loc=location();base.from_loc=label.__loc;}return base},peg$c1359="dot",peg$c1360=peg$literalExpectation("dot",false),peg$c1361="circo",peg$c1362=peg$literalExpectation("circo",false),peg$c1363="fdp",peg$c1364=peg$literalExpectation("fdp",false),peg$c1365="neato",peg$c1366=peg$literalExpectation("neato",false),peg$c1367="twopi",peg$c1368=peg$literalExpectation("twopi",false),peg$c1369="state",peg$c1370=peg$literalExpectation("state",false),peg$c1371="};",peg$c1372=peg$literalExpectation("};",false),peg$c1373=function(state_items){const node={key:"default_state_config",value:state_items||[]};if(options.locations){node.loc=location();}return node},peg$c1374="start_state",peg$c1375=peg$literalExpectation("start_state",false),peg$c1376=function(state_items){const node={key:"default_start_state_config",value:state_items||[]};if(options.locations){node.loc=location();}return node},peg$c1377="end_state",peg$c1378=peg$literalExpectation("end_state",false),peg$c1379=function(state_items){const node={key:"default_end_state_config",value:state_items||[]};if(options.locations){node.loc=location();}return node},peg$c1380="active_state",peg$c1381=peg$literalExpectation("active_state",false),peg$c1382=function(state_items){const node={key:"default_active_state_config",value:state_items||[]};if(options.locations){node.loc=location();}return node},peg$c1383="terminal_state",peg$c1384=peg$literalExpectation("terminal_state",false),peg$c1385=function(state_items){const node={key:"default_terminal_state_config",value:state_items||[]};if(options.locations){node.loc=location();}return node},peg$c1386="hooked_state",peg$c1387=peg$literalExpectation("hooked_state",false),peg$c1388=function(state_items){const node={key:"default_hooked_state_config",value:state_items||[]};if(options.locations){node.loc=location();}return node},peg$c1389=peg$otherExpectation("graph default edge color"),peg$c1390=function(value){const raw=options.locations?value.__v:value;const node={key:"graph_default_edge_color",value:raw};if(options.locations){node.loc=location();node.value_loc=value.__loc;}return node},peg$c1391="transition",peg$c1392=peg$literalExpectation("transition",false),peg$c1393=function(items){const node={key:"default_transition_config",value:items||[]};if(options.locations){node.loc=location();}return node},peg$c1394="graph",peg$c1395=peg$literalExpectation("graph",false),peg$c1396=function(items){const node={key:"default_graph_config",value:items||[]};if(options.locations){node.loc=location();}return node},peg$c1397="editor",peg$c1398=peg$literalExpectation("editor",false),peg$c1399=function(items){const node={key:"editor_config",value:items};if(options.locations){node.loc=location();}return node},peg$c1400="stochastic_run_count",peg$c1401=peg$literalExpectation("stochastic_run_count",false),peg$c1402=function(value){const node={key:"stochastic_run_count",value:parseInt(value,10)};if(options.locations){node.loc=location();}return node},peg$c1403="panels",peg$c1404=peg$literalExpectation("panels",false),peg$c1405=function(value){const node={key:"panels",value:value};if(options.locations){node.loc=location();}return node},peg$c1406="graph_layout",peg$c1407=peg$literalExpectation("graph_layout",false),peg$c1408=function(value){const node={key:"graph_layout",value:value};if(options.locations){node.loc=location();}return node},peg$c1409="start_states",peg$c1410=peg$literalExpectation("start_states",false),peg$c1411=function(value){const node={key:"start_states",value:value};if(options.locations){node.loc=location();}return node},peg$c1412="end_states",peg$c1413=peg$literalExpectation("end_states",false),peg$c1414=function(value){const node={key:"end_states",value:value};if(options.locations){node.loc=location();}return node},peg$c1415="failed_outputs",peg$c1416=peg$literalExpectation("failed_outputs",false),peg$c1417=function(value){const raw=options.locations?value.__v:value;const node={key:"failed_outputs",value:typeof raw==="string"?[raw]:raw};if(options.locations){node.loc=location();node.value_loc=value.__loc;}return node},peg$c1418="graph_bg_color",peg$c1419=peg$literalExpectation("graph_bg_color",false),peg$c1420=function(value){const raw=options.locations?value.__v:value;const node={key:"graph_bg_color",value:raw};if(options.locations){node.loc=location();node.value_loc=value.__loc;}return node},peg$c1421="allows_override",peg$c1422=peg$literalExpectation("allows_override",false),peg$c1423=function(value){const node={key:"allows_override",value:value};if(options.locations){node.loc=location();}return node},peg$c1424="allow_islands",peg$c1425=peg$literalExpectation("allow_islands",false),peg$c1426=function(value){const raw=options.locations?value.__v:value;const node={key:"allow_islands",value:raw};if(options.locations){node.loc=location();node.value_loc=value.__loc;}return node},peg$c1427=function(){return true},peg$c1428=function(){return false},peg$c1429="with_start",peg$c1430=peg$literalExpectation("with_start",false),peg$c1431=function(){return "with_start"},peg$c1432=function(){return true},peg$c1433=function(){return false},peg$c1434=peg$otherExpectation("configuration"),peg$c1435="MIT",peg$c1436=peg$literalExpectation("MIT",false),peg$c1437="BSD 2-clause",peg$c1438=peg$literalExpectation("BSD 2-clause",false),peg$c1439="BSD 3-clause",peg$c1440=peg$literalExpectation("BSD 3-clause",false),peg$c1441="Apache 2.0",peg$c1442=peg$literalExpectation("Apache 2.0",false),peg$c1443="Mozilla 2.0",peg$c1444=peg$literalExpectation("Mozilla 2.0",false),peg$c1445="Public domain",peg$c1446=peg$literalExpectation("Public domain",false),peg$c1447="GPL v2",peg$c1448=peg$literalExpectation("GPL v2",false),peg$c1449="GPL v3",peg$c1450=peg$literalExpectation("GPL v3",false),peg$c1451="LGPL v2.1",peg$c1452=peg$literalExpectation("LGPL v2.1",false),peg$c1453="LGPL v3.0",peg$c1454=peg$literalExpectation("LGPL v3.0",false),peg$c1455="Unknown",peg$c1456=peg$literalExpectation("Unknown",false),peg$c1457=peg$otherExpectation("direction"),peg$c1458="up",peg$c1459=peg$literalExpectation("up",false),peg$c1460="right",peg$c1461=peg$literalExpectation("right",false),peg$c1462="down",peg$c1463=peg$literalExpectation("down",false),peg$c1464="left",peg$c1465=peg$literalExpectation("left",false),peg$c1466=peg$otherExpectation("hook definition (open/closed)"),peg$c1467="open",peg$c1468=peg$literalExpectation("open",false),peg$c1469="closed",peg$c1470=peg$literalExpectation("closed",false),peg$c1471="machine_author",peg$c1472=peg$literalExpectation("machine_author",false),peg$c1473=function(value){const raw=options.locations?value.__v:value;const node={key:"machine_author",value:raw};if(options.locations){node.loc=location();node.value_loc=value.__loc;}return node},peg$c1474="machine_contributor",peg$c1475=peg$literalExpectation("machine_contributor",false),peg$c1476=function(value){const raw=options.locations?value.__v:value;const node={key:"machine_contributor",value:raw};if(options.locations){node.loc=location();node.value_loc=value.__loc;}return node},peg$c1477="machine_comment",peg$c1478=peg$literalExpectation("machine_comment",false),peg$c1479=function(value){const raw=options.locations?value.__v:value;const node={key:"machine_comment",value:raw};if(options.locations){node.loc=location();node.value_loc=value.__loc;}return node},peg$c1480="machine_definition",peg$c1481=peg$literalExpectation("machine_definition",false),peg$c1482=function(value){const raw=options.locations?value.__v:value;const node={key:"machine_definition",value:raw};if(options.locations){node.loc=location();node.value_loc=value.__loc;}return node},peg$c1483="machine_name",peg$c1484=peg$literalExpectation("machine_name",false),peg$c1485=function(value){const raw=options.locations?value.__v:value;const node={key:"machine_name",value:raw};if(options.locations){node.loc=location();node.value_loc=value.__loc;}return node},peg$c1486="npm_name",peg$c1487=peg$literalExpectation("npm_name",false),peg$c1488=function(value){const raw=options.locations?value.__v:value;const node={key:"npm_name",value:raw};if(options.locations){node.loc=location();node.value_loc=value.__loc;}return node},peg$c1489="machine_reference",peg$c1490=peg$literalExpectation("machine_reference",false),peg$c1491=function(value){const raw=options.locations?value.__v:value;const node={key:"machine_reference",value:raw};if(options.locations){node.loc=location();node.value_loc=value.__loc;}return node},peg$c1492="machine_version",peg$c1493=peg$literalExpectation("machine_version",false),peg$c1494=function(value){const raw=options.locations?value.__v:value;const node={key:"machine_version",value:raw};if(options.locations){node.loc=location();node.value_loc=value.__loc;}return node},peg$c1495="machine_license",peg$c1496=peg$literalExpectation("machine_license",false),peg$c1497=function(value){const raw=options.locations?value.__v:value;const node={key:"machine_license",value:raw};if(options.locations){node.loc=location();node.value_loc=value.__loc;}return node},peg$c1498="machine_language",peg$c1499=peg$literalExpectation("machine_language",false),peg$c1500=function(value){const raw=options.locations?value.__v:value;const node={key:"machine_language",value:raw};if(options.locations){node.loc=location();node.value_loc=value.__loc;}return node},peg$c1501="fsl_version",peg$c1502=peg$literalExpectation("fsl_version",false),peg$c1503=function(value){const raw=options.locations?value.__v:value;const node={key:"fsl_version",value:raw};if(options.locations){node.loc=location();node.value_loc=value.__loc;}return node},peg$c1504="theme",peg$c1505=peg$literalExpectation("theme",false),peg$c1506=function(value){const raw=options.locations?value.__v:value;const node={key:"theme",value:raw};if(options.locations){node.loc=location();node.value_loc=value.__loc;}return node},peg$c1507="flow",peg$c1508=peg$literalExpectation("flow",false),peg$c1509=function(value){const raw=options.locations?value.__v:value;const node={key:"flow",value:raw};if(options.locations){node.loc=location();node.value_loc=value.__loc;}return node},peg$c1510="hooks",peg$c1511=peg$literalExpectation("hooks",false),peg$c1512=function(value){const raw=options.locations?value.__v:value;const node={key:"hook_definition",value:raw};if(options.locations){node.loc=location();node.value_loc=value.__loc;}return node},peg$c1513="dot_preamble",peg$c1514=peg$literalExpectation("dot_preamble",false),peg$c1515=function(value){const raw=options.locations?value.__v:value;const node={key:"dot_preamble",value:raw};if(options.locations){node.loc=location();node.value_loc=value.__loc;}return node},peg$c1516="height",peg$c1517=peg$literalExpectation("height",false),peg$c1518=function(n){return {height:n}},peg$c1519=function(w,h){return {width:w,height:h}},peg$c1520=function(w){return {width:w}},peg$c1521="default_size",peg$c1522=peg$literalExpectation("default_size",false),peg$c1523=function(value){const raw=options.locations?value.__v:value;const node={key:"default_size",value:raw};if(options.locations){node.loc=location();node.value_loc=value.__loc;}return node},peg$c1524=peg$otherExpectation("machine attribute"),peg$c1525="label",peg$c1526=peg$literalExpectation("label",false),peg$c1527=function(value){const node={key:"state-label",value:value};if(options.locations){node.loc=location();}return node},peg$c1528="color",peg$c1529=peg$literalExpectation("color",false),peg$c1530=function(value){const raw=options.locations?value.__v:value;const node={key:"color",value:raw};if(options.locations){node.loc=location();node.value_loc=value.__loc;}return node},peg$c1531=peg$otherExpectation("text color"),peg$c1532="text-color",peg$c1533=peg$literalExpectation("text-color",false),peg$c1534=function(value){const raw=options.locations?value.__v:value;const node={key:"text-color",value:raw};if(options.locations){node.loc=location();node.value_loc=value.__loc;}return node},peg$c1535=peg$otherExpectation("background color"),peg$c1536="background-color",peg$c1537=peg$literalExpectation("background-color",false),peg$c1538=function(value){const raw=options.locations?value.__v:value;const node={key:"background-color",value:raw};if(options.locations){node.loc=location();node.value_loc=value.__loc;}return node},peg$c1539=peg$otherExpectation("border color"),peg$c1540="border-color",peg$c1541=peg$literalExpectation("border-color",false),peg$c1542=function(value){const raw=options.locations?value.__v:value;const node={key:"border-color",value:raw};if(options.locations){node.loc=location();node.value_loc=value.__loc;}return node},peg$c1543=peg$otherExpectation("shape"),peg$c1544="shape",peg$c1545=peg$literalExpectation("shape",false),peg$c1546=function(value){const node={key:"shape",value:value};if(options.locations){node.loc=location();}return node},peg$c1547=peg$otherExpectation("corners"),peg$c1548="corners",peg$c1549=peg$literalExpectation("corners",false),peg$c1550=function(value){const node={key:"corners",value:value};if(options.locations){node.loc=location();}return node},peg$c1551=peg$otherExpectation("linestyle"),peg$c1552=function(value){const node={key:"line-style",value:value};if(options.locations){node.loc=location();}return node},peg$c1553="linestyle",peg$c1554=peg$literalExpectation("linestyle",false),peg$c1555=peg$otherExpectation("image"),peg$c1556="image",peg$c1557=peg$literalExpectation("image",false),peg$c1558=function(value){const node={key:"image",value:value};if(options.locations){node.loc=location();}return node},peg$c1559=peg$otherExpectation("url"),peg$c1560="url",peg$c1561=peg$literalExpectation("url",false),peg$c1562=function(value){const node={key:"url",value:value};if(options.locations){node.loc=location();}return node},peg$c1563=peg$otherExpectation("state property"),peg$c1564="property",peg$c1565=peg$literalExpectation("property",false),peg$c1566=function(name,value){const node={key:"state_property",name:name,value:value};if(options.locations){node.loc=location();}return node},peg$c1567="required",peg$c1568=peg$literalExpectation("required",false),peg$c1569=function(name,value){const node={key:"state_property",name:name,value:value,required:true};if(options.locations){node.loc=location();}return node},peg$c1570=function(n){return options.locations?{__v:n,__loc:location()}:n},peg$c1571=function(name,value){const raw=options.locations?name.__v:name;const node={key:"state_declaration",name:raw,value:value};if(options.locations){node.loc=location();node.name_loc=name.__loc;}return node},peg$c1572=function(name,value){const node={key:"named_list",name:name,value:value};if(options.locations){node.loc=location();node.value_locs=value.__member_locs;delete value.__member_locs;}return node},peg$c1573=function(name,value){const node={key:"named_list",name:name,value:value.name};if(options.locations){node.loc=location();node.value_locs=[value.__loc];}return node},peg$c1574=function(name){const m={name:name};if(options.locations){m.__loc=location();}return m},peg$c1575=peg$otherExpectation("hook event (enter/exit)"),peg$c1576="enter",peg$c1577=peg$literalExpectation("enter",false),peg$c1578="exit",peg$c1579=peg$literalExpectation("exit",false),peg$c1580=peg$otherExpectation("hook declaration"),peg$c1581="on",peg$c1582=peg$literalExpectation("on",false),peg$c1583="do",peg$c1584=peg$literalExpectation("do",false),peg$c1585=function(event,subject,action){const node={key:"hook_decl",event:event,subject:subject,action:action};if(subject.key==="hook_state_subject"){node.subject=subject.name;if(options.locations){node.subject_loc=subject.__loc;}}if(options.locations){node.loc=location();}return node},peg$c1586=function(name){const m={key:"hook_state_subject",name:name};if(options.locations){m.__loc=location();}return m},peg$c1587=function(name,default_value){const node={key:"property_definition",name:name,default_value:default_value,required:true};if(options.locations){node.loc=location();}return node},peg$c1588=function(name){const node={key:"property_definition",name:name,required:true};if(options.locations){node.loc=location();}return node},peg$c1589=function(name,default_value){const node={key:"property_definition",name:name,default_value:default_value};if(options.locations){node.loc=location();}return node},peg$c1590=function(name){const node={key:"property_definition",name:name};if(options.locations){node.loc=location();}return node},peg$c1591="val",peg$c1592=peg$literalExpectation("val",false),peg$c1593=function(name,vtype,dval){const node={key:"val_definition",name:name,val_type:vtype,default_value:dval,required:true};if(options.locations){node.loc=location();}return node},peg$c1594=function(name,vtype){const node={key:"val_definition",name:name,val_type:vtype,required:true};if(options.locations){node.loc=location();}return node},peg$c1595=function(name,vtype,dval){const node={key:"val_definition",name:name,val_type:vtype,default_value:dval};if(options.locations){node.loc=location();}return node},peg$c1596=function(name,vtype){const node={key:"val_definition",name:name,val_type:vtype};if(options.locations){node.loc=location();}return node},peg$c1597="boolean",peg$c1598=peg$literalExpectation("boolean",false),peg$c1599=function(){return {kind:"boolean"}},peg$c1600="string",peg$c1601=peg$literalExpectation("string",false),peg$c1602=function(){return {kind:"string"}},peg$c1603="int",peg$c1604=peg$literalExpectation("int",false),peg$c1605=function(range){return range===null?{kind:"int"}:{kind:"int",lo:range.lo,hi:range.hi}},peg$c1606="..",peg$c1607=peg$literalExpectation("..",false),peg$c1608=function(lo,hi){return {lo:lo,hi:hi}},peg$c1609=function(chars){return parseInt(chars,10)},peg$c1610="enum",peg$c1611=peg$literalExpectation("enum",false),peg$c1612="(",peg$c1613=peg$literalExpectation("(",false),peg$c1614=",",peg$c1615=peg$literalExpectation(",",false),peg$c1616=function(first,m){return m},peg$c1617=")",peg$c1618=peg$literalExpectation(")",false),peg$c1619=function(first,rest){return {kind:"enum",members:[first,...rest]}},peg$c1620=/^[0-9a-zA-Z._!$\^*?\x80-\uFFFF]/,peg$c1621=peg$classExpectation([["0","9"],["a","z"],["A","Z"],".","_","!","$","^","*","?",["","￿"]],false,false),peg$c1622=function(chars){return chars},peg$c1623=function(neg,num){return neg?-num:num},peg$c1624="arrange",peg$c1625=peg$literalExpectation("arrange",false),peg$c1626=function(value){const node={key:"arrange_declaration",value:value};if(options.locations){node.loc=location();}return node},peg$c1627="arrange-start",peg$c1628=peg$literalExpectation("arrange-start",false),peg$c1629=function(value){const node={key:"arrange_start_declaration",value:value};if(options.locations){node.loc=location();}return node},peg$c1630="arrange-end",peg$c1631=peg$literalExpectation("arrange-end",false),peg$c1632=function(value){const node={key:"arrange_end_declaration",value:value};if(options.locations){node.loc=location();}return node},peg$c1633=peg$otherExpectation("oarrange declaration"),peg$c1634="oarrange",peg$c1635=peg$literalExpectation("oarrange",false),peg$c1636=function(value){const node={key:"oarrange_declaration",value:value};if(options.locations){node.loc=location();}return node},peg$c1637=peg$otherExpectation("farrange declaration"),peg$c1638="farrange",peg$c1639=peg$literalExpectation("farrange",false),peg$c1640=function(value){const node={key:"farrange_declaration",value:value};if(options.locations){node.loc=location();}return node},peg$c1641=peg$otherExpectation("arrange declaration"),peg$currPos=0,peg$savedPos=0,peg$posDetailsCache=[{line:1,column:1}],peg$maxFailPos=0,peg$maxFailExpected=[],peg$silentFails=0,peg$result;if("startRule"in options){if(!(options.startRule in peg$startRuleFunctions)){throw new Error("Can't start parsing from rule \""+options.startRule+'".')}peg$startRuleFunction=peg$startRuleFunctions[options.startRule];}function text(){return input.substring(peg$savedPos,peg$currPos)}function location(){return peg$computeLocation(peg$savedPos,peg$currPos)}function error(message,location){location=location!==void 0?location:peg$computeLocation(peg$savedPos,peg$currPos);throw peg$buildSimpleError(message,location)}function peg$literalExpectation(text,ignoreCase){return {type:"literal",text:text,ignoreCase:ignoreCase}}function peg$classExpectation(parts,inverted,ignoreCase){return {type:"class",parts:parts,inverted:inverted,ignoreCase:ignoreCase}}function peg$anyExpectation(){return {type:"any"}}function peg$endExpectation(){return {type:"end"}}function peg$otherExpectation(description){return {type:"other",description:description}}function peg$computePosDetails(pos){var details=peg$posDetailsCache[pos],p;if(details){return details}else {p=pos-1;while(!peg$posDetailsCache[p]){p--;}details=peg$posDetailsCache[p];details={line:details.line,column:details.column};while(p<pos){if(input.charCodeAt(p)===10){details.line++;details.column=1;}else {details.column++;}p++;}peg$posDetailsCache[pos]=details;return details}}function peg$computeLocation(startPos,endPos){var startPosDetails=peg$computePosDetails(startPos),endPosDetails=peg$computePosDetails(endPos);return {start:{offset:startPos,line:startPosDetails.line,column:startPosDetails.column},end:{offset:endPos,line:endPosDetails.line,column:endPosDetails.column}}}function peg$fail(expected){if(peg$currPos<peg$maxFailPos){return}if(peg$currPos>peg$maxFailPos){peg$maxFailPos=peg$currPos;peg$maxFailExpected=[];}peg$maxFailExpected.push(expected);}function peg$buildSimpleError(message,location){return new peg$SyntaxError(message,null,null,location)}function peg$buildStructuredError(expected,found,location){return new peg$SyntaxError(peg$SyntaxError.buildMessage(expected,found),expected,found,location)}function peg$parseDocument(){var s0,s1,s2,s3;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){s2=peg$parseTermList();if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){peg$savedPos=s0;s1=peg$c0(s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseTheme(){var s0;if(input.substr(peg$currPos,7)===peg$c1){s0=peg$c1;peg$currPos+=7;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c2);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,5)===peg$c3){s0=peg$c3;peg$currPos+=5;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c4);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,6)===peg$c5){s0=peg$c5;peg$currPos+=6;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c6);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,5)===peg$c7){s0=peg$c7;peg$currPos+=5;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c8);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,4)===peg$c9){s0=peg$c9;peg$currPos+=4;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c10);}}}}}}return s0}function peg$parseThemeOrThemeList(){var s0,s1,s2,s3,s4,s5,s6;s0=peg$currPos;if(input.charCodeAt(peg$currPos)===91){s1=peg$c11;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c12);}}if(s1!==peg$FAILED){s2=peg$parseWS();if(s2===peg$FAILED){s2=null;}if(s2!==peg$FAILED){s3=[];s4=peg$currPos;s5=peg$parseTheme();if(s5!==peg$FAILED){s6=peg$parseWS();if(s6!==peg$FAILED){s5=[s5,s6];s4=s5;}else {peg$currPos=s4;s4=peg$FAILED;}}else {peg$currPos=s4;s4=peg$FAILED;}while(s4!==peg$FAILED){s3.push(s4);s4=peg$currPos;s5=peg$parseTheme();if(s5!==peg$FAILED){s6=peg$parseWS();if(s6!==peg$FAILED){s5=[s5,s6];s4=s5;}else {peg$currPos=s4;s4=peg$FAILED;}}else {peg$currPos=s4;s4=peg$FAILED;}}if(s3!==peg$FAILED){s4=peg$parseTheme();if(s4===peg$FAILED){s4=null;}if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===93){s5=peg$c13;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c14);}}if(s5!==peg$FAILED){peg$savedPos=s0;s1=peg$c15(s3,s4);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseTheme();if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c16(s1);}s0=s1;}return s0}function peg$parseGvizShape(){var s0;if(input.substr(peg$currPos,5)===peg$c17){s0=peg$c17;peg$currPos+=5;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c18);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,7)===peg$c19){s0=peg$c19;peg$currPos+=7;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c20);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,7)===peg$c21){s0=peg$c21;peg$currPos+=7;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c22);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,4)===peg$c23){s0=peg$c23;peg$currPos+=4;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c24);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,6)===peg$c25){s0=peg$c25;peg$currPos+=6;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c26);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,5)===peg$c27){s0=peg$c27;peg$currPos+=5;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c28);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,3)===peg$c29){s0=peg$c29;peg$currPos+=3;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c30);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,8)===peg$c31){s0=peg$c31;peg$currPos+=8;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c32);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,9)===peg$c33){s0=peg$c33;peg$currPos+=9;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c34);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,5)===peg$c7){s0=peg$c7;peg$currPos+=5;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c8);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,7)===peg$c35){s0=peg$c35;peg$currPos+=7;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c36);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,9)===peg$c37){s0=peg$c37;peg$currPos+=9;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c38);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,13)===peg$c39){s0=peg$c39;peg$currPos+=13;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c40);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,5)===peg$c41){s0=peg$c41;peg$currPos+=5;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c42);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,8)===peg$c43){s0=peg$c43;peg$currPos+=8;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c44);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,7)===peg$c45){s0=peg$c45;peg$currPos+=7;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c46);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,8)===peg$c47){s0=peg$c47;peg$currPos+=8;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c48);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,7)===peg$c49){s0=peg$c49;peg$currPos+=7;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c50);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,12)===peg$c51){s0=peg$c51;peg$currPos+=12;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c52);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,13)===peg$c53){s0=peg$c53;peg$currPos+=13;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c54);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,13)===peg$c55){s0=peg$c55;peg$currPos+=13;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c56);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,11)===peg$c57){s0=peg$c57;peg$currPos+=11;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c58);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,12)===peg$c59){s0=peg$c59;peg$currPos+=12;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c60);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,8)===peg$c61){s0=peg$c61;peg$currPos+=8;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c62);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,8)===peg$c63){s0=peg$c63;peg$currPos+=8;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c64);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,7)===peg$c65){s0=peg$c65;peg$currPos+=7;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c66);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,7)===peg$c67){s0=peg$c67;peg$currPos+=7;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c68);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,9)===peg$c69){s0=peg$c69;peg$currPos+=9;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c70);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,4)===peg$c71){s0=peg$c71;peg$currPos+=4;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c72);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,6)===peg$c73){s0=peg$c73;peg$currPos+=6;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c74);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,4)===peg$c75){s0=peg$c75;peg$currPos+=4;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c76);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,4)===peg$c77){s0=peg$c77;peg$currPos+=4;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c78);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,9)===peg$c79){s0=peg$c79;peg$currPos+=9;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c80);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,8)===peg$c81){s0=peg$c81;peg$currPos+=8;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c82);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,4)===peg$c83){s0=peg$c83;peg$currPos+=4;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c84);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,3)===peg$c85){s0=peg$c85;peg$currPos+=3;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c86);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,6)===peg$c87){s0=peg$c87;peg$currPos+=6;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c88);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,3)===peg$c89){s0=peg$c89;peg$currPos+=3;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c90);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,9)===peg$c91){s0=peg$c91;peg$currPos+=9;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c92);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,8)===peg$c93){s0=peg$c93;peg$currPos+=8;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c94);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,3)===peg$c95){s0=peg$c95;peg$currPos+=3;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c96);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,10)===peg$c97){s0=peg$c97;peg$currPos+=10;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c98);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,3)===peg$c99){s0=peg$c99;peg$currPos+=3;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c100);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,10)===peg$c101){s0=peg$c101;peg$currPos+=10;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c102);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,15)===peg$c103){s0=peg$c103;peg$currPos+=15;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c104);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,13)===peg$c105){s0=peg$c105;peg$currPos+=13;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c106);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,14)===peg$c107){s0=peg$c107;peg$currPos+=14;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c108);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,9)===peg$c109){s0=peg$c109;peg$currPos+=9;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c110);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,8)===peg$c111){s0=peg$c111;peg$currPos+=8;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c112);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,9)===peg$c113){s0=peg$c113;peg$currPos+=9;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c114);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,9)===peg$c115){s0=peg$c115;peg$currPos+=9;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c116);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,8)===peg$c117){s0=peg$c117;peg$currPos+=8;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c118);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,7)===peg$c119){s0=peg$c119;peg$currPos+=7;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c120);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,12)===peg$c121){s0=peg$c121;peg$currPos+=12;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c122);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,11)===peg$c123){s0=peg$c123;peg$currPos+=11;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c124);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,9)===peg$c125){s0=peg$c125;peg$currPos+=9;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c126);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,6)===peg$c127){s0=peg$c127;peg$currPos+=6;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c128);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,6)===peg$c129){s0=peg$c129;peg$currPos+=6;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c130);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,9)===peg$c131){s0=peg$c131;peg$currPos+=9;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c132);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,6)===peg$c133){s0=peg$c133;peg$currPos+=6;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c134);}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}return s0}function peg$parseForwardLightArrow(){var s0,s1;peg$silentFails++;if(input.substr(peg$currPos,2)===peg$c136){s0=peg$c136;peg$currPos+=2;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c137);}}if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===8594){s1=peg$c138;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c139);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c140();}s0=s1;}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c135);}}return s0}function peg$parseTwoWayLightArrow(){var s0,s1;peg$silentFails++;if(input.substr(peg$currPos,3)===peg$c142){s0=peg$c142;peg$currPos+=3;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c143);}}if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===8596){s1=peg$c144;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c145);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c146();}s0=s1;}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c141);}}return s0}function peg$parseBackLightArrow(){var s0,s1;peg$silentFails++;if(input.substr(peg$currPos,2)===peg$c148){s0=peg$c148;peg$currPos+=2;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c149);}}if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===8592){s1=peg$c150;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c151);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c152();}s0=s1;}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c147);}}return s0}function peg$parseForwardFatArrow(){var s0,s1;peg$silentFails++;if(input.substr(peg$currPos,2)===peg$c154){s0=peg$c154;peg$currPos+=2;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c155);}}if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===8658){s1=peg$c156;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c157);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c158();}s0=s1;}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c153);}}return s0}function peg$parseTwoWayFatArrow(){var s0,s1;peg$silentFails++;if(input.substr(peg$currPos,3)===peg$c160){s0=peg$c160;peg$currPos+=3;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c161);}}if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===8660){s1=peg$c162;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c163);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c164();}s0=s1;}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c159);}}return s0}function peg$parseBackFatArrow(){var s0,s1;peg$silentFails++;if(input.substr(peg$currPos,2)===peg$c166){s0=peg$c166;peg$currPos+=2;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c167);}}if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===8656){s1=peg$c168;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c169);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c170();}s0=s1;}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c165);}}return s0}function peg$parseForwardTildeArrow(){var s0,s1;peg$silentFails++;if(input.substr(peg$currPos,2)===peg$c172){s0=peg$c172;peg$currPos+=2;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c173);}}if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===8603){s1=peg$c174;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c175);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c176();}s0=s1;}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c171);}}return s0}function peg$parseTwoWayTildeArrow(){var s0,s1;peg$silentFails++;if(input.substr(peg$currPos,3)===peg$c178){s0=peg$c178;peg$currPos+=3;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c179);}}if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===8622){s1=peg$c180;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c181);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c182();}s0=s1;}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c177);}}return s0}function peg$parseBackTildeArrow(){var s0,s1;peg$silentFails++;if(input.substr(peg$currPos,2)===peg$c184){s0=peg$c184;peg$currPos+=2;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c185);}}if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===8602){s1=peg$c186;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c187);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c188();}s0=s1;}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c183);}}return s0}function peg$parseLightFatArrow(){var s0,s1;peg$silentFails++;if(input.substr(peg$currPos,4)===peg$c190){s0=peg$c190;peg$currPos+=4;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c191);}}if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,2)===peg$c192){s1=peg$c192;peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c193);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c194();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,3)===peg$c195){s1=peg$c195;peg$currPos+=3;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c196);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c194();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,3)===peg$c197){s1=peg$c197;peg$currPos+=3;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c198);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c194();}s0=s1;}}}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c189);}}return s0}function peg$parseLightTildeArrow(){var s0,s1;peg$silentFails++;if(input.substr(peg$currPos,4)===peg$c200){s0=peg$c200;peg$currPos+=4;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c201);}}if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,2)===peg$c202){s1=peg$c202;peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c203);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c204();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,3)===peg$c205){s1=peg$c205;peg$currPos+=3;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c206);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c204();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,3)===peg$c207){s1=peg$c207;peg$currPos+=3;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c208);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c204();}s0=s1;}}}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c199);}}return s0}function peg$parseFatLightArrow(){var s0,s1;peg$silentFails++;if(input.substr(peg$currPos,4)===peg$c210){s0=peg$c210;peg$currPos+=4;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c211);}}if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,2)===peg$c212){s1=peg$c212;peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c213);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c214();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,3)===peg$c215){s1=peg$c215;peg$currPos+=3;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c216);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c214();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,3)===peg$c217){s1=peg$c217;peg$currPos+=3;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c218);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c214();}s0=s1;}}}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c209);}}return s0}function peg$parseFatTildeArrow(){var s0,s1;peg$silentFails++;if(input.substr(peg$currPos,4)===peg$c220){s0=peg$c220;peg$currPos+=4;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c221);}}if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,2)===peg$c222){s1=peg$c222;peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c223);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c224();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,3)===peg$c225){s1=peg$c225;peg$currPos+=3;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c226);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c224();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,3)===peg$c227){s1=peg$c227;peg$currPos+=3;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c228);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c224();}s0=s1;}}}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c219);}}return s0}function peg$parseTildeLightArrow(){var s0,s1;peg$silentFails++;if(input.substr(peg$currPos,4)===peg$c230){s0=peg$c230;peg$currPos+=4;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c231);}}if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,2)===peg$c232){s1=peg$c232;peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c233);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c234();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,3)===peg$c235){s1=peg$c235;peg$currPos+=3;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c236);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c234();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,3)===peg$c237){s1=peg$c237;peg$currPos+=3;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c238);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c234();}s0=s1;}}}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c229);}}return s0}function peg$parseTildeFatArrow(){var s0,s1;peg$silentFails++;if(input.substr(peg$currPos,4)===peg$c240){s0=peg$c240;peg$currPos+=4;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c241);}}if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,2)===peg$c242){s1=peg$c242;peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c243);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c244();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,3)===peg$c245){s1=peg$c245;peg$currPos+=3;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c246);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c244();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,3)===peg$c247){s1=peg$c247;peg$currPos+=3;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c248);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c244();}s0=s1;}}}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c239);}}return s0}function peg$parseLightArrow(){var s0;peg$silentFails++;s0=peg$parseForwardLightArrow();if(s0===peg$FAILED){s0=peg$parseTwoWayLightArrow();if(s0===peg$FAILED){s0=peg$parseBackLightArrow();}}peg$silentFails--;if(s0===peg$FAILED){if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c249);}}return s0}function peg$parseFatArrow(){var s0;peg$silentFails++;s0=peg$parseForwardFatArrow();if(s0===peg$FAILED){s0=peg$parseTwoWayFatArrow();if(s0===peg$FAILED){s0=peg$parseBackFatArrow();}}peg$silentFails--;if(s0===peg$FAILED){if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c250);}}return s0}function peg$parseTildeArrow(){var s0;peg$silentFails++;s0=peg$parseForwardTildeArrow();if(s0===peg$FAILED){s0=peg$parseTwoWayTildeArrow();if(s0===peg$FAILED){s0=peg$parseBackTildeArrow();}}peg$silentFails--;if(s0===peg$FAILED){if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c251);}}return s0}function peg$parseMixedArrow(){var s0;peg$silentFails++;s0=peg$parseLightFatArrow();if(s0===peg$FAILED){s0=peg$parseLightTildeArrow();if(s0===peg$FAILED){s0=peg$parseFatLightArrow();if(s0===peg$FAILED){s0=peg$parseFatTildeArrow();if(s0===peg$FAILED){s0=peg$parseTildeLightArrow();if(s0===peg$FAILED){s0=peg$parseTildeFatArrow();}}}}}peg$silentFails--;if(s0===peg$FAILED){if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c252);}}return s0}function peg$parseArrow(){var s0;peg$silentFails++;s0=peg$parseMixedArrow();if(s0===peg$FAILED){s0=peg$parseLightArrow();if(s0===peg$FAILED){s0=peg$parseFatArrow();if(s0===peg$FAILED){s0=peg$parseTildeArrow();}}}peg$silentFails--;if(s0===peg$FAILED){if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c253);}}return s0}function peg$parseBoolean(){var s0,s1;s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c254){s1=peg$c254;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c255);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c256();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c257){s1=peg$c257;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c258);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c259();}s0=s1;}return s0}function peg$parseCorners(){var s0;if(input.substr(peg$currPos,7)===peg$c260){s0=peg$c260;peg$currPos+=7;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c261);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,7)===peg$c262){s0=peg$c262;peg$currPos+=7;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c263);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,5)===peg$c264){s0=peg$c264;peg$currPos+=5;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c265);}}}}return s0}function peg$parseLineStyle(){var s0;if(input.substr(peg$currPos,5)===peg$c266){s0=peg$c266;peg$currPos+=5;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c267);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,6)===peg$c268){s0=peg$c268;peg$currPos+=6;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c269);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,6)===peg$c270){s0=peg$c270;peg$currPos+=6;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c271);}}}}return s0}function peg$parseNull(){var s0,s1;s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c300){s1=peg$c300;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c301);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c302();}s0=s1;return s0}function peg$parseUndefined(){var s0,s1;s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c303){s1=peg$c303;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c304);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c305();}s0=s1;return s0}function peg$parseActionLabel(){var c,start,chunk,out,h,hv;peg$silentFails++;if(input.charCodeAt(peg$currPos)===39){start=peg$currPos;peg$currPos++;chunk=peg$currPos;out="";for(;;){c=input.charCodeAt(peg$currPos);if(c>=32&&c!==39&&c!==92){peg$currPos++;continue}if(c===39){out=out+input.substring(chunk,peg$currPos);peg$currPos++;peg$silentFails--;return out}if(c===92){out+=input.substring(chunk,peg$currPos);peg$currPos++;c=input.charCodeAt(peg$currPos);if(c===39){out+="'";peg$currPos++;}else if(c===92){out+="\\";peg$currPos++;}else if(c===47){out+="/";peg$currPos++;}else if(c===98){out+="\b";peg$currPos++;}else if(c===102){out+="\f";peg$currPos++;}else if(c===110){out+="\n";peg$currPos++;}else if(c===114){out+="\r";peg$currPos++;}else if(c===116){out+="\t";peg$currPos++;}else if(c===118){out+="\v";peg$currPos++;}else if(c===117){hv=0;for(h=1;h<=4;++h){c=input.charCodeAt(peg$currPos+h);if(c>=48&&c<=57){hv=hv*16+(c-48);}else if(c>=97&&c<=102){hv=hv*16+(c-87);}else if(c>=65&&c<=70){hv=hv*16+(c-55);}else {hv=-1;break}}if(hv<0){break}out+=String.fromCharCode(hv);peg$currPos+=5;}else {break}chunk=peg$currPos;continue}break}peg$currPos=start;}peg$silentFails--;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c312);}return peg$FAILED}function peg$parseLineTerminator(){var s0;if(peg$c314.test(input.charAt(peg$currPos))){s0=input.charAt(peg$currPos);peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c315);}}return s0}function peg$parseBlockComment(){var s0,s1,s2,s3,s4,s5;peg$silentFails++;s0=peg$currPos;if(input.substr(peg$currPos,2)===peg$c317){s1=peg$c317;peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c318);}}if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$currPos;peg$silentFails++;if(input.substr(peg$currPos,2)===peg$c319){s5=peg$c319;peg$currPos+=2;}else {s5=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c320);}}peg$silentFails--;if(s5===peg$FAILED){s4=void 0;}else {peg$currPos=s4;s4=peg$FAILED;}if(s4!==peg$FAILED){if(input.length>peg$currPos){s5=input.charAt(peg$currPos);peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c321);}}if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$currPos;peg$silentFails++;if(input.substr(peg$currPos,2)===peg$c319){s5=peg$c319;peg$currPos+=2;}else {s5=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c320);}}peg$silentFails--;if(s5===peg$FAILED){s4=void 0;}else {peg$currPos=s4;s4=peg$FAILED;}if(s4!==peg$FAILED){if(input.length>peg$currPos){s5=input.charAt(peg$currPos);peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c321);}}if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){if(input.substr(peg$currPos,2)===peg$c319){s3=peg$c319;peg$currPos+=2;}else {s3=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c320);}}if(s3!==peg$FAILED){s1=[s1,s2,s3];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c316);}}return s0}function peg$parseEOF(){var s0,s1;s0=peg$currPos;peg$silentFails++;if(input.length>peg$currPos){s1=input.charAt(peg$currPos);peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c321);}}peg$silentFails--;if(s1===peg$FAILED){s0=void 0;}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseLineComment(){var s0,s1,s2,s3,s4,s5;peg$silentFails++;s0=peg$currPos;if(input.substr(peg$currPos,2)===peg$c323){s1=peg$c323;peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c324);}}if(s1!==peg$FAILED){s2=[];s3=peg$currPos;s4=peg$currPos;peg$silentFails++;s5=peg$parseLineTerminator();peg$silentFails--;if(s5===peg$FAILED){s4=void 0;}else {peg$currPos=s4;s4=peg$FAILED;}if(s4!==peg$FAILED){if(input.length>peg$currPos){s5=input.charAt(peg$currPos);peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c321);}}if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}while(s3!==peg$FAILED){s2.push(s3);s3=peg$currPos;s4=peg$currPos;peg$silentFails++;s5=peg$parseLineTerminator();peg$silentFails--;if(s5===peg$FAILED){s4=void 0;}else {peg$currPos=s4;s4=peg$FAILED;}if(s4!==peg$FAILED){if(input.length>peg$currPos){s5=input.charAt(peg$currPos);peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c321);}}if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}}if(s2!==peg$FAILED){s3=peg$parseLineTerminator();if(s3===peg$FAILED){s3=peg$parseEOF();}if(s3!==peg$FAILED){s1=[s1,s2,s3];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c322);}}return s0}function peg$parseWS(){var c,r,matched;peg$silentFails++;matched=false;for(;;){c=input.charCodeAt(peg$currPos);if(c===32||c===9||c===13||c===10||c===11){peg$currPos++;matched=true;continue}if(c!==47){break}r=peg$parseBlockComment();if(r===peg$FAILED){r=peg$parseLineComment();}if(r===peg$FAILED){break}matched=true;}peg$silentFails--;if(matched){return null}if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c325);}return peg$FAILED}function peg$parseString(){var c,start,chunk,out,h,hv;peg$silentFails++;if(input.charCodeAt(peg$currPos)===34){start=peg$currPos;peg$currPos++;chunk=peg$currPos;out="";for(;;){c=input.charCodeAt(peg$currPos);if(c>=0&&c!==34&&c!==92){peg$currPos++;continue}if(c===34){out=out+input.substring(chunk,peg$currPos);peg$currPos++;peg$silentFails--;return out}if(c===92){out+=input.substring(chunk,peg$currPos);peg$currPos++;c=input.charCodeAt(peg$currPos);if(c===34){out+='"';peg$currPos++;}else if(c===92){out+="\\";peg$currPos++;}else if(c===47){out+="/";peg$currPos++;}else if(c===98){out+="\b";peg$currPos++;}else if(c===102){out+="\f";peg$currPos++;}else if(c===110){out+="\n";peg$currPos++;}else if(c===114){out+="\r";peg$currPos++;}else if(c===116){out+="\t";peg$currPos++;}else if(c===118){out+="\v";peg$currPos++;}else if(c===117){hv=0;for(h=1;h<=4;++h){c=input.charCodeAt(peg$currPos+h);if(c>=48&&c<=57){hv=hv*16+(c-48);}else if(c>=97&&c<=102){hv=hv*16+(c-87);}else if(c>=65&&c<=70){hv=hv*16+(c-55);}else {hv=-1;break}}if(hv<0){break}out+=String.fromCharCode(hv);peg$currPos+=5;}else {break}chunk=peg$currPos;continue}break}peg$currPos=start;}peg$silentFails--;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c328);}return peg$FAILED}function peg$parseAtomLetter(){var s0;if(peg$c331.test(input.charAt(peg$currPos))){s0=input.charAt(peg$currPos);peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c332);}}return s0}function peg$parseAtom(){var c,start;peg$silentFails++;c=input.charCodeAt(peg$currPos);if(c>=48&&c<=57||c>=97&&c<=122||c>=65&&c<=90||c===46||c===95||c===33||c===36||c===94||c===42||c===63||c===44||c>=128){start=peg$currPos;peg$currPos++;c=input.charCodeAt(peg$currPos);while(c>=48&&c<=57||c>=97&&c<=122||c>=65&&c<=90||c===46||c===95||c===33||c===36||c===94||c===42||c===63||c===44||c===43||c===40||c===41||c===38||c===35||c===64||c>=128){peg$currPos++;c=input.charCodeAt(peg$currPos);}peg$silentFails--;return input.substring(start,peg$currPos)}peg$silentFails--;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c333);}return peg$FAILED}function peg$parseLabel(){var s0;peg$silentFails++;s0=peg$parseAtom();if(s0===peg$FAILED){s0=peg$parseString();}peg$silentFails--;if(s0===peg$FAILED){if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c335);}}return s0}function peg$parseIntegerLiteral(){var c,start;c=input.charCodeAt(peg$currPos);if(c===48){peg$currPos++;return "0"}if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c337);}if(c>=49&&c<=57){start=peg$currPos;peg$currPos++;c=input.charCodeAt(peg$currPos);while(c>=48&&c<=57){peg$currPos++;c=input.charCodeAt(peg$currPos);}if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c339);}return input.substring(start,peg$currPos)}if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c341);}return peg$FAILED}function peg$parseDecimalDigit(){var s0;if(peg$c338.test(input.charAt(peg$currPos))){s0=input.charAt(peg$currPos);peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c339);}}return s0}function peg$parseNonZeroDigit(){var s0;if(peg$c340.test(input.charAt(peg$currPos))){s0=input.charAt(peg$currPos);peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c341);}}return s0}function peg$parseHexDigit(){var s0;if(peg$c342.test(input.charAt(peg$currPos))){s0=input.charAt(peg$currPos);peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c343);}}return s0}function peg$parseBinaryDigit(){var s0;if(peg$c344.test(input.charAt(peg$currPos))){s0=input.charAt(peg$currPos);peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c345);}}return s0}function peg$parseOctalDigit(){var s0;if(peg$c346.test(input.charAt(peg$currPos))){s0=input.charAt(peg$currPos);peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c347);}}return s0}function peg$parseNonNegNumber(){var s0,s1,s2,s3,s4;peg$silentFails++;s0=peg$currPos;s1=peg$parseIntegerLiteral();if(s1!==peg$FAILED){if(input.charCodeAt(peg$currPos)===46){s2=peg$c349;peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c350);}}if(s2!==peg$FAILED){s3=[];s4=peg$parseDecimalDigit();while(s4!==peg$FAILED){s3.push(s4);s4=peg$parseDecimalDigit();}if(s3!==peg$FAILED){s4=peg$parseWS();if(s4===peg$FAILED){s4=null;}if(s4!==peg$FAILED){peg$savedPos=s0;s1=peg$c351();s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseIntegerLiteral();if(s1!==peg$FAILED){s2=peg$parseWS();if(s2===peg$FAILED){s2=null;}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c351();s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c348);}}return s0}function peg$parseJsNumericLiteral(){var s0,s1;peg$silentFails++;s0=peg$currPos;s1=peg$parseJsHexIntegerLiteral();if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c353(s1);}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseJsBinaryIntegerLiteral();if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c353(s1);}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseNonJsOctalIntegerLiteral();if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c353(s1);}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseJsDecimalLiteral();if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c353(s1);}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,3)===peg$c354){s1=peg$c354;peg$currPos+=3;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c355);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c356();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,16)===peg$c357){s1=peg$c357;peg$currPos+=16;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c358);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c359();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,11)===peg$c360){s1=peg$c360;peg$currPos+=11;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c361);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c359();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,11)===peg$c362){s1=peg$c362;peg$currPos+=11;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c363);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c359();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c364){s1=peg$c364;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c365);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c359();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c366){s1=peg$c366;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c367);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c359();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c368){s1=peg$c368;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c369);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c359();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,2)===peg$c370){s1=peg$c370;peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c371);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c359();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c372){s1=peg$c372;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c373);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c374();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c375){s1=peg$c375;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c376);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c374();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c377){s1=peg$c377;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c378);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c374();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,3)===peg$c379){s1=peg$c379;peg$currPos+=3;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c380);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c374();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===8734){s1=peg$c381;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c382);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c374();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,7)===peg$c383){s1=peg$c383;peg$currPos+=7;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c384);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c385();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,2)===peg$c386){s1=peg$c386;peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c387);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c385();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===949){s1=peg$c388;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c389);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c385();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,2)===peg$c390){s1=peg$c390;peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c391);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c392();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,2)===peg$c393){s1=peg$c393;peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c394);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c392();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===960){s1=peg$c395;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c396);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c392();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,11)===peg$c397){s1=peg$c397;peg$currPos+=11;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c398);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c399();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===69){s1=peg$c400;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c401);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c399();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===101){s1=peg$c402;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c403);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c399();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===400){s1=peg$c404;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c405);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c399();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===8455){s1=peg$c406;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c407);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c399();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c408){s1=peg$c408;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c409);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c410();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c411){s1=peg$c411;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c412);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c413();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,3)===peg$c414){s1=peg$c414;peg$currPos+=3;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c415);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c416();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,7)===peg$c417){s1=peg$c417;peg$currPos+=7;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c418);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c416();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c419){s1=peg$c419;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c420);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c421();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c422){s1=peg$c422;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c423);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c421();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c424){s1=peg$c424;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c425);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c426();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c427){s1=peg$c427;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c428);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c429();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c430){s1=peg$c430;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c431);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c432();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c433){s1=peg$c433;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c434);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c435();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c436){s1=peg$c436;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c437);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c438();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c439){s1=peg$c439;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c440);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c441();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,3)===peg$c442){s1=peg$c442;peg$currPos+=3;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c443);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c444();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,2)===peg$c445){s1=peg$c445;peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c446);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c444();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,2)===peg$c447){s1=peg$c447;peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c448);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c444();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===981){s1=peg$c449;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c450);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c444();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===966){s1=peg$c451;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c452);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c444();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,13)===peg$c453){s1=peg$c453;peg$currPos+=13;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c454);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c455();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===947){s1=peg$c456;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c457);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c455();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,2)===peg$c458){s1=peg$c458;peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c459);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c455();}s0=s1;}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c352);}}return s0}function peg$parseJsDecimalLiteral(){var s0,s1,s2,s3,s4;s0=peg$currPos;s1=peg$parseJsDecimalIntegerLiteral();if(s1!==peg$FAILED){if(input.charCodeAt(peg$currPos)===46){s2=peg$c349;peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c350);}}if(s2!==peg$FAILED){s3=[];s4=peg$parseDecimalDigit();while(s4!==peg$FAILED){s3.push(s4);s4=peg$parseDecimalDigit();}if(s3!==peg$FAILED){s4=peg$parseJsNExponentPart();if(s4===peg$FAILED){s4=null;}if(s4!==peg$FAILED){peg$savedPos=s0;s1=peg$c351();s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===46){s1=peg$c349;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c350);}}if(s1!==peg$FAILED){s2=[];s3=peg$parseDecimalDigit();if(s3!==peg$FAILED){while(s3!==peg$FAILED){s2.push(s3);s3=peg$parseDecimalDigit();}}else {s2=peg$FAILED;}if(s2!==peg$FAILED){s3=peg$parseJsNExponentPart();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){peg$savedPos=s0;s1=peg$c351();s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseJsDecimalIntegerLiteral();if(s1!==peg$FAILED){s2=peg$parseJsNExponentPart();if(s2===peg$FAILED){s2=null;}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c351();s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}}return s0}function peg$parseJsDecimalIntegerLiteral(){var s0,s1,s2,s3;if(input.charCodeAt(peg$currPos)===48){s0=peg$c336;peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c337);}}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseNonZeroDigit();if(s1!==peg$FAILED){s2=[];s3=peg$parseDecimalDigit();while(s3!==peg$FAILED){s2.push(s3);s3=peg$parseDecimalDigit();}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}return s0}function peg$parseJsNExponentPart(){var s0,s1,s2;s0=peg$currPos;s1=peg$parseJsNExponentIndicator();if(s1!==peg$FAILED){s2=peg$parseJsNSignedInteger();if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseJsNExponentIndicator(){var s0;if(input.substr(peg$currPos,1).toLowerCase()===peg$c402){s0=input.charAt(peg$currPos);peg$currPos++;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c460);}}return s0}function peg$parseJsNSignedInteger(){var s0,s1,s2,s3;s0=peg$currPos;if(peg$c461.test(input.charAt(peg$currPos))){s1=input.charAt(peg$currPos);peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c462);}}if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){s2=[];s3=peg$parseDecimalDigit();if(s3!==peg$FAILED){while(s3!==peg$FAILED){s2.push(s3);s3=peg$parseDecimalDigit();}}else {s2=peg$FAILED;}if(s2!==peg$FAILED){s1=[s1,s2];s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseJsHexIntegerLiteral(){var s0,s1,s2,s3,s4;s0=peg$currPos;if(input.substr(peg$currPos,2).toLowerCase()===peg$c463){s1=input.substr(peg$currPos,2);peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c464);}}if(s1!==peg$FAILED){s2=peg$currPos;s3=[];s4=peg$parseHexDigit();if(s4!==peg$FAILED){while(s4!==peg$FAILED){s3.push(s4);s4=peg$parseHexDigit();}}else {s3=peg$FAILED;}if(s3!==peg$FAILED){s2=input.substring(s2,peg$currPos);}else {s2=s3;}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c465(s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseJsBinaryIntegerLiteral(){var s0,s1,s2,s3,s4;s0=peg$currPos;if(input.substr(peg$currPos,2).toLowerCase()===peg$c466){s1=input.substr(peg$currPos,2);peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c467);}}if(s1!==peg$FAILED){s2=peg$currPos;s3=[];s4=peg$parseBinaryDigit();if(s4!==peg$FAILED){while(s4!==peg$FAILED){s3.push(s4);s4=peg$parseBinaryDigit();}}else {s3=peg$FAILED;}if(s3!==peg$FAILED){s2=input.substring(s2,peg$currPos);}else {s2=s3;}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c468(s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseNonJsOctalIntegerLiteral(){var s0,s1,s2,s3,s4;s0=peg$currPos;if(input.substr(peg$currPos,2).toLowerCase()===peg$c469){s1=input.substr(peg$currPos,2);peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c470);}}if(s1!==peg$FAILED){s2=peg$currPos;s3=[];s4=peg$parseOctalDigit();if(s4!==peg$FAILED){while(s4!==peg$FAILED){s3.push(s4);s4=peg$parseOctalDigit();}}else {s3=peg$FAILED;}if(s3!==peg$FAILED){s2=input.substring(s2,peg$currPos);}else {s2=s3;}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c471(s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseSemVer(){var s0,s1,s2,s3,s4,s5;s0=peg$currPos;s1=peg$parseIntegerLiteral();if(s1!==peg$FAILED){if(input.charCodeAt(peg$currPos)===46){s2=peg$c349;peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c350);}}if(s2!==peg$FAILED){s3=peg$parseIntegerLiteral();if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===46){s4=peg$c349;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c350);}}if(s4!==peg$FAILED){s5=peg$parseIntegerLiteral();if(s5!==peg$FAILED){peg$savedPos=s0;s1=peg$c472(s1,s3,s5);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseUrlProtocol(){var s0;if(input.substr(peg$currPos,7)===peg$c483){s0=peg$c483;peg$currPos+=7;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c484);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,8)===peg$c485){s0=peg$c485;peg$currPos+=8;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c486);}}}return s0}function peg$parseURL(){var s0,s1,s2,s3;s0=peg$currPos;s1=peg$parseUrlProtocol();if(s1!==peg$FAILED){s2=[];if(peg$c487.test(input.charAt(peg$currPos))){s3=input.charAt(peg$currPos);peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c488);}}if(s3!==peg$FAILED){while(s3!==peg$FAILED){s2.push(s3);if(peg$c487.test(input.charAt(peg$currPos))){s3=input.charAt(peg$currPos);peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c488);}}}}else {s2=peg$FAILED;}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c489();s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseSvgColorLabel(){var s0,s1;s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c490){s1=peg$c490;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c491);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c492();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c493){s1=peg$c493;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c494);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c492();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,12)===peg$c495){s1=peg$c495;peg$currPos+=12;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c496);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c497();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,12)===peg$c498){s1=peg$c498;peg$currPos+=12;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c499);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c497();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c500){s1=peg$c500;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c501);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c502();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c503){s1=peg$c503;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c504);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c502();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c505){s1=peg$c505;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c506);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c507();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c508){s1=peg$c508;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c509);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c507();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c510){s1=peg$c510;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c511);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c512();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c513){s1=peg$c513;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c514);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c512();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c515){s1=peg$c515;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c516);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c517();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c518){s1=peg$c518;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c519);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c517();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c520){s1=peg$c520;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c521);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c522();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c523){s1=peg$c523;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c524);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c522();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c525){s1=peg$c525;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c526);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c527();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c528){s1=peg$c528;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c529);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c527();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,14)===peg$c530){s1=peg$c530;peg$currPos+=14;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c531);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c532();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,14)===peg$c533){s1=peg$c533;peg$currPos+=14;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c534);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c532();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c535){s1=peg$c535;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c536);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c537();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c538){s1=peg$c538;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c539);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c537();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c540){s1=peg$c540;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c541);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c542();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c543){s1=peg$c543;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c544);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c542();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c545){s1=peg$c545;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c546);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c547();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c548){s1=peg$c548;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c549);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c547();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c550){s1=peg$c550;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c551);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c552();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c553){s1=peg$c553;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c554);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c552();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c555){s1=peg$c555;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c556);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c557();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c558){s1=peg$c558;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c559);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c557();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c560){s1=peg$c560;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c561);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c562();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c563){s1=peg$c563;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c564);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c562();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c565){s1=peg$c565;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c566);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c567();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c568){s1=peg$c568;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c569);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c567();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c570){s1=peg$c570;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c571);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c572();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c573){s1=peg$c573;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c574);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c572();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,14)===peg$c575){s1=peg$c575;peg$currPos+=14;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c576);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c577();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,14)===peg$c578){s1=peg$c578;peg$currPos+=14;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c579);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c577();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c580){s1=peg$c580;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c581);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c582();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c583){s1=peg$c583;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c584);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c582();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,7)===peg$c585){s1=peg$c585;peg$currPos+=7;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c586);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c587();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,7)===peg$c588){s1=peg$c588;peg$currPos+=7;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c589);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c587();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c590){s1=peg$c590;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c591);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c507();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c592){s1=peg$c592;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c593);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c507();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c594){s1=peg$c594;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c595);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c596();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c597){s1=peg$c597;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c598);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c596();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c599){s1=peg$c599;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c600);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c601();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c602){s1=peg$c602;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c603);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c601();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,13)===peg$c604){s1=peg$c604;peg$currPos+=13;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c605);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c606();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,13)===peg$c607){s1=peg$c607;peg$currPos+=13;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c608);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c606();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c609){s1=peg$c609;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c610);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c611();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c612){s1=peg$c612;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c613);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c611();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c614){s1=peg$c614;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c615);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c611();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c616){s1=peg$c616;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c617);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c611();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c618){s1=peg$c618;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c619);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c620();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c621){s1=peg$c621;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c622);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c620();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c623){s1=peg$c623;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c624);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c625();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c626){s1=peg$c626;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c627);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c625();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,11)===peg$c628){s1=peg$c628;peg$currPos+=11;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c629);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c630();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,11)===peg$c631){s1=peg$c631;peg$currPos+=11;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c632);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c630();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,14)===peg$c633){s1=peg$c633;peg$currPos+=14;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c634);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c635();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,14)===peg$c636){s1=peg$c636;peg$currPos+=14;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c637);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c635();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c638){s1=peg$c638;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c639);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c640();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c641){s1=peg$c641;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c642);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c640();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c643){s1=peg$c643;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c644);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c645();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c646){s1=peg$c646;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c647);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c645();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,7)===peg$c648){s1=peg$c648;peg$currPos+=7;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c649);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c650();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,7)===peg$c651){s1=peg$c651;peg$currPos+=7;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c652);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c650();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c653){s1=peg$c653;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c654);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c655();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c656){s1=peg$c656;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c657);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c655();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,12)===peg$c658){s1=peg$c658;peg$currPos+=12;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c659);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c660();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,12)===peg$c661){s1=peg$c661;peg$currPos+=12;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c662);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c660();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,13)===peg$c663){s1=peg$c663;peg$currPos+=13;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c664);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c665();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,13)===peg$c666){s1=peg$c666;peg$currPos+=13;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c667);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c665();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,13)===peg$c668){s1=peg$c668;peg$currPos+=13;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c669);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c670();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,13)===peg$c671){s1=peg$c671;peg$currPos+=13;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c672);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c670();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,13)===peg$c673){s1=peg$c673;peg$currPos+=13;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c674);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c670();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,13)===peg$c675){s1=peg$c675;peg$currPos+=13;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c676);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c670();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,13)===peg$c677){s1=peg$c677;peg$currPos+=13;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c678);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c679();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,13)===peg$c680){s1=peg$c680;peg$currPos+=13;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c681);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c679();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c682){s1=peg$c682;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c683);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c684();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c685){s1=peg$c685;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c686);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c684();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c687){s1=peg$c687;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c688);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c689();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c690){s1=peg$c690;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c691);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c689();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,11)===peg$c692){s1=peg$c692;peg$currPos+=11;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c693);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c694();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,11)===peg$c695){s1=peg$c695;peg$currPos+=11;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c696);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c694();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,7)===peg$c697){s1=peg$c697;peg$currPos+=7;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c698);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c699();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,7)===peg$c700){s1=peg$c700;peg$currPos+=7;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c701);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c699();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,7)===peg$c702){s1=peg$c702;peg$currPos+=7;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c703);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c699();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,7)===peg$c704){s1=peg$c704;peg$currPos+=7;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c705);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c699();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c706){s1=peg$c706;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c707);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c708();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c709){s1=peg$c709;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c710);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c708();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c711){s1=peg$c711;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c712);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c713();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c714){s1=peg$c714;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c715);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c713();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,11)===peg$c716){s1=peg$c716;peg$currPos+=11;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c717);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c718();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,11)===peg$c719){s1=peg$c719;peg$currPos+=11;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c720);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c718();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,11)===peg$c721){s1=peg$c721;peg$currPos+=11;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c722);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c723();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,11)===peg$c724){s1=peg$c724;peg$currPos+=11;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c725);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c723();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,7)===peg$c726){s1=peg$c726;peg$currPos+=7;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c727);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c728();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,7)===peg$c729){s1=peg$c729;peg$currPos+=7;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c730);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c728();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c731){s1=peg$c731;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c732);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c733();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c734){s1=peg$c734;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c735);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c733();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c736){s1=peg$c736;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c737);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c738();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c739){s1=peg$c739;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c740);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c738();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c741){s1=peg$c741;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c742);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c743();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c744){s1=peg$c744;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c745);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c743();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c746){s1=peg$c746;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c747);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c748();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c749){s1=peg$c749;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c750);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c748();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c751){s1=peg$c751;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c752);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c753();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c754){s1=peg$c754;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c755);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c753();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c756){s1=peg$c756;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c757);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c753();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c758){s1=peg$c758;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c759);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c753();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,11)===peg$c760){s1=peg$c760;peg$currPos+=11;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c761);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c762();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,11)===peg$c763){s1=peg$c763;peg$currPos+=11;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c764);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c762();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c765){s1=peg$c765;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c766);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c767();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c768){s1=peg$c768;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c769);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c767();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c770){s1=peg$c770;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c771);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c772();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c773){s1=peg$c773;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c774);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c772();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,7)===peg$c775){s1=peg$c775;peg$currPos+=7;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c776);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c777();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,7)===peg$c778){s1=peg$c778;peg$currPos+=7;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c779);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c777();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c780){s1=peg$c780;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c781);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c782();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c783){s1=peg$c783;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c784);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c782();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c785){s1=peg$c785;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c786);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c787();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c788){s1=peg$c788;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c789);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c787();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c790){s1=peg$c790;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c791);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c792();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c793){s1=peg$c793;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c794);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c792();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c795){s1=peg$c795;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c796);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c797();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c798){s1=peg$c798;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c799);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c797();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,13)===peg$c800){s1=peg$c800;peg$currPos+=13;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c801);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c802();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,13)===peg$c803){s1=peg$c803;peg$currPos+=13;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c804);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c802();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c805){s1=peg$c805;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c806);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c807();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c808){s1=peg$c808;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c809);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c807();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c810){s1=peg$c810;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c811);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c812();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c813){s1=peg$c813;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c814);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c812();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,12)===peg$c815){s1=peg$c815;peg$currPos+=12;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c816);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c817();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,12)===peg$c818){s1=peg$c818;peg$currPos+=12;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c819);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c817();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c820){s1=peg$c820;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c821);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c822();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c823){s1=peg$c823;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c824);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c822();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c825){s1=peg$c825;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c826);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c827();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c828){s1=peg$c828;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c829);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c827();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c830){s1=peg$c830;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c831);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c832();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c833){s1=peg$c833;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c834);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c832();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,20)===peg$c835){s1=peg$c835;peg$currPos+=20;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c836);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c837();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,20)===peg$c838){s1=peg$c838;peg$currPos+=20;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c839);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c837();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c840){s1=peg$c840;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c841);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c842();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c843){s1=peg$c843;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c844);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c842();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c845){s1=peg$c845;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c846);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c842();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c847){s1=peg$c847;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c848);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c842();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c849){s1=peg$c849;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c850);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c851();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c852){s1=peg$c852;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c853);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c851();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c854){s1=peg$c854;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c855);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c856();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c857){s1=peg$c857;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c858);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c856();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,11)===peg$c859){s1=peg$c859;peg$currPos+=11;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c860);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c861();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,11)===peg$c862){s1=peg$c862;peg$currPos+=11;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c863);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c861();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,13)===peg$c864){s1=peg$c864;peg$currPos+=13;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c865);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c866();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,13)===peg$c867){s1=peg$c867;peg$currPos+=13;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c868);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c866();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,12)===peg$c869){s1=peg$c869;peg$currPos+=12;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c870);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c871();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,12)===peg$c872){s1=peg$c872;peg$currPos+=12;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c873);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c871();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,14)===peg$c874){s1=peg$c874;peg$currPos+=14;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c875);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c876();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,14)===peg$c877){s1=peg$c877;peg$currPos+=14;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c878);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c876();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,14)===peg$c879){s1=peg$c879;peg$currPos+=14;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c880);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c876();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,14)===peg$c881){s1=peg$c881;peg$currPos+=14;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c882);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c876();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,14)===peg$c883){s1=peg$c883;peg$currPos+=14;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c884);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c885();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,14)===peg$c886){s1=peg$c886;peg$currPos+=14;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c887);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c885();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,11)===peg$c888){s1=peg$c888;peg$currPos+=11;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c889);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c890();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,11)===peg$c891){s1=peg$c891;peg$currPos+=11;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c892);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c890();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c893){s1=peg$c893;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c894);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c895();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c896){s1=peg$c896;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c897);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c895();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c898){s1=peg$c898;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c899);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c900();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c901){s1=peg$c901;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c902);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c900();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c903){s1=peg$c903;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c904);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c905();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c906){s1=peg$c906;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c907);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c905();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,7)===peg$c908){s1=peg$c908;peg$currPos+=7;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c909);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c728();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,7)===peg$c910){s1=peg$c910;peg$currPos+=7;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c911);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c728();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c912){s1=peg$c912;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c913);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c914();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c915){s1=peg$c915;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c916);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c914();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,16)===peg$c917){s1=peg$c917;peg$currPos+=16;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c918);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c919();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,16)===peg$c920){s1=peg$c920;peg$currPos+=16;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c921);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c919();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c922){s1=peg$c922;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c923);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c924();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c925){s1=peg$c925;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c926);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c924();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,12)===peg$c927){s1=peg$c927;peg$currPos+=12;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c928);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c929();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,12)===peg$c930){s1=peg$c930;peg$currPos+=12;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c931);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c929();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,12)===peg$c932){s1=peg$c932;peg$currPos+=12;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c933);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c934();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,12)===peg$c935){s1=peg$c935;peg$currPos+=12;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c936);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c934();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,14)===peg$c937){s1=peg$c937;peg$currPos+=14;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c938);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c939();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,14)===peg$c940){s1=peg$c940;peg$currPos+=14;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c941);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c939();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,15)===peg$c942){s1=peg$c942;peg$currPos+=15;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c943);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c944();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,15)===peg$c945){s1=peg$c945;peg$currPos+=15;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c946);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c944();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,17)===peg$c947){s1=peg$c947;peg$currPos+=17;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c948);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c949();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,17)===peg$c950){s1=peg$c950;peg$currPos+=17;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c951);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c949();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,15)===peg$c952){s1=peg$c952;peg$currPos+=15;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c953);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c954();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,15)===peg$c955){s1=peg$c955;peg$currPos+=15;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c956);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c954();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,15)===peg$c957){s1=peg$c957;peg$currPos+=15;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c958);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c959();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,15)===peg$c960){s1=peg$c960;peg$currPos+=15;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c961);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c959();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,12)===peg$c962){s1=peg$c962;peg$currPos+=12;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c963);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c964();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,12)===peg$c965){s1=peg$c965;peg$currPos+=12;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c966);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c964();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c967){s1=peg$c967;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c968);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c969();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c970){s1=peg$c970;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c971);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c969();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c972){s1=peg$c972;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c973);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c974();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c975){s1=peg$c975;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c976);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c974();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c977){s1=peg$c977;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c978);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c979();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c980){s1=peg$c980;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c981);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c979();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,11)===peg$c982){s1=peg$c982;peg$currPos+=11;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c983);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c984();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,11)===peg$c985){s1=peg$c985;peg$currPos+=11;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c986);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c984();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c987){s1=peg$c987;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c988);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c989();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c990){s1=peg$c990;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c991);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c989();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,7)===peg$c992){s1=peg$c992;peg$currPos+=7;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c993);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c994();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,7)===peg$c995){s1=peg$c995;peg$currPos+=7;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c996);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c994();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c997){s1=peg$c997;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c998);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c999();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c1000){s1=peg$c1000;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1001);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c999();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c1002){s1=peg$c1002;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1003);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1004();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c1005){s1=peg$c1005;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1006);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1004();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c1007){s1=peg$c1007;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1008);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1009();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c1010){s1=peg$c1010;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1011);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1009();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c1012){s1=peg$c1012;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1013);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1014();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c1015){s1=peg$c1015;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1016);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1014();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c1017){s1=peg$c1017;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1018);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1019();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c1020){s1=peg$c1020;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1021);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1019();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,13)===peg$c1022){s1=peg$c1022;peg$currPos+=13;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1023);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1024();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,13)===peg$c1025){s1=peg$c1025;peg$currPos+=13;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1026);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1024();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c1027){s1=peg$c1027;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1028);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1029();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c1030){s1=peg$c1030;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1031);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1029();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,13)===peg$c1032){s1=peg$c1032;peg$currPos+=13;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1033);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1034();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,13)===peg$c1035){s1=peg$c1035;peg$currPos+=13;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1036);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1034();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,13)===peg$c1037){s1=peg$c1037;peg$currPos+=13;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1038);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1039();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,13)===peg$c1040){s1=peg$c1040;peg$currPos+=13;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1041);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1039();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c1042){s1=peg$c1042;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1043);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1044();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c1045){s1=peg$c1045;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1046);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1044();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c1047){s1=peg$c1047;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1048);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1049();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c1050){s1=peg$c1050;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1051);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1049();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c1052){s1=peg$c1052;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1053);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1054();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c1055){s1=peg$c1055;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1056);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1054();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c1057){s1=peg$c1057;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1058);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1059();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c1060){s1=peg$c1060;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1061);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1059();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c1062){s1=peg$c1062;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1063);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1064();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c1065){s1=peg$c1065;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1066);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1064();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c1067){s1=peg$c1067;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1068);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1069();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c1070){s1=peg$c1070;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1071);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1069();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c1072){s1=peg$c1072;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1073);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1074();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c1075){s1=peg$c1075;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1076);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1074();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,3)===peg$c1077){s1=peg$c1077;peg$currPos+=3;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1078);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1079();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,3)===peg$c1080){s1=peg$c1080;peg$currPos+=3;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1081);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1079();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c1082){s1=peg$c1082;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1083);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1084();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c1085){s1=peg$c1085;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1086);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1084();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c1087){s1=peg$c1087;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1088);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1089();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c1090){s1=peg$c1090;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1091);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1089();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,11)===peg$c1092){s1=peg$c1092;peg$currPos+=11;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1093);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1094();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,11)===peg$c1095){s1=peg$c1095;peg$currPos+=11;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1096);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1094();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c1097){s1=peg$c1097;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1098);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1099();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c1100){s1=peg$c1100;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1101);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1099();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c1102){s1=peg$c1102;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1103);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1104();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c1105){s1=peg$c1105;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1106);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1104();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c1107){s1=peg$c1107;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1108);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1109();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c1110){s1=peg$c1110;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1111);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1109();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c1112){s1=peg$c1112;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1113);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1114();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c1115){s1=peg$c1115;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1116);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1114();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c1117){s1=peg$c1117;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1118);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1119();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c1120){s1=peg$c1120;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1121);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1119();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c1122){s1=peg$c1122;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1123);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1124();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c1125){s1=peg$c1125;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1126);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1124();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,7)===peg$c1127){s1=peg$c1127;peg$currPos+=7;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1128);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1129();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,7)===peg$c1130){s1=peg$c1130;peg$currPos+=7;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1131);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1129();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c1132){s1=peg$c1132;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1133);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1134();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c1135){s1=peg$c1135;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1136);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1134();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c1137){s1=peg$c1137;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1138);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1139();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c1140){s1=peg$c1140;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1141);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1139();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c1142){s1=peg$c1142;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1143);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1139();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c1144){s1=peg$c1144;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1145);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1139();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c1146){s1=peg$c1146;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1147);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1148();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c1149){s1=peg$c1149;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1150);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1148();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,11)===peg$c1151){s1=peg$c1151;peg$currPos+=11;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1152);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1153();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,11)===peg$c1154){s1=peg$c1154;peg$currPos+=11;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1155);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1153();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c1156){s1=peg$c1156;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1157);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1158();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c1159){s1=peg$c1159;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1160);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1158();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,3)===peg$c1161){s1=peg$c1161;peg$currPos+=3;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1162);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1163();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,3)===peg$c1164){s1=peg$c1164;peg$currPos+=3;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1165);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1163();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c1166){s1=peg$c1166;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1167);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1168();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c1169){s1=peg$c1169;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1170);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1168();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,7)===peg$c1171){s1=peg$c1171;peg$currPos+=7;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1172);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1173();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,7)===peg$c1174){s1=peg$c1174;peg$currPos+=7;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1175);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1173();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c1176){s1=peg$c1176;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1177);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1178();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c1179){s1=peg$c1179;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1180);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1178();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,11)===peg$c1181){s1=peg$c1181;peg$currPos+=11;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1182);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1183();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,11)===peg$c1184){s1=peg$c1184;peg$currPos+=11;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1185);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1183();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c1186){s1=peg$c1186;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1187);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1188();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c1189){s1=peg$c1189;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1190);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1188();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c1191){s1=peg$c1191;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1192);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1193();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c1194){s1=peg$c1194;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1195);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1193();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c1196){s1=peg$c1196;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1197);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1198();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c1199){s1=peg$c1199;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1200);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1198();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c1201){s1=peg$c1201;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1202);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1203();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c1204){s1=peg$c1204;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1205);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1203();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c1206){s1=peg$c1206;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1207);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1208();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c1209){s1=peg$c1209;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1210);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1208();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,11)===peg$c1211){s1=peg$c1211;peg$currPos+=11;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1212);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1213();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,11)===peg$c1214){s1=peg$c1214;peg$currPos+=11;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1215);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1213();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c1216){s1=peg$c1216;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1217);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1218();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c1219){s1=peg$c1219;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1220);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1218();}s0=s1;}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}return s0}function peg$parseSvgColor(){var s0,s1,s2;s0=peg$currPos;s1=peg$parseSvgColorLabel();if(s1!==peg$FAILED){s2=peg$parseWS();if(s2===peg$FAILED){s2=null;}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c1221(s1);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseRgb3(){var s0,s1,s2,s3,s4,s5;s0=peg$currPos;if(input.charCodeAt(peg$currPos)===35){s1=peg$c1222;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1223);}}if(s1!==peg$FAILED){s2=peg$parseHexDigit();if(s2!==peg$FAILED){s3=peg$parseHexDigit();if(s3!==peg$FAILED){s4=peg$parseHexDigit();if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){peg$savedPos=s0;s1=peg$c1224(s2,s3,s4);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseRgb6(){var s0,s1,s2,s3,s4,s5,s6,s7,s8;s0=peg$currPos;if(input.charCodeAt(peg$currPos)===35){s1=peg$c1222;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1223);}}if(s1!==peg$FAILED){s2=peg$parseHexDigit();if(s2!==peg$FAILED){s3=peg$parseHexDigit();if(s3!==peg$FAILED){s4=peg$parseHexDigit();if(s4!==peg$FAILED){s5=peg$parseHexDigit();if(s5!==peg$FAILED){s6=peg$parseHexDigit();if(s6!==peg$FAILED){s7=peg$parseHexDigit();if(s7!==peg$FAILED){s8=peg$parseWS();if(s8===peg$FAILED){s8=null;}if(s8!==peg$FAILED){peg$savedPos=s0;s1=peg$c1225(s2,s3,s4,s5,s6,s7);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseRgba4(){var s0,s1,s2,s3,s4,s5,s6;s0=peg$currPos;if(input.charCodeAt(peg$currPos)===35){s1=peg$c1222;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1223);}}if(s1!==peg$FAILED){s2=peg$parseHexDigit();if(s2!==peg$FAILED){s3=peg$parseHexDigit();if(s3!==peg$FAILED){s4=peg$parseHexDigit();if(s4!==peg$FAILED){s5=peg$parseHexDigit();if(s5!==peg$FAILED){s6=peg$parseWS();if(s6===peg$FAILED){s6=null;}if(s6!==peg$FAILED){peg$savedPos=s0;s1=peg$c1226(s2,s3,s4,s5);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseRgba8(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9,s10;s0=peg$currPos;if(input.charCodeAt(peg$currPos)===35){s1=peg$c1222;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1223);}}if(s1!==peg$FAILED){s2=peg$parseHexDigit();if(s2!==peg$FAILED){s3=peg$parseHexDigit();if(s3!==peg$FAILED){s4=peg$parseHexDigit();if(s4!==peg$FAILED){s5=peg$parseHexDigit();if(s5!==peg$FAILED){s6=peg$parseHexDigit();if(s6!==peg$FAILED){s7=peg$parseHexDigit();if(s7!==peg$FAILED){s8=peg$parseHexDigit();if(s8!==peg$FAILED){s9=peg$parseHexDigit();if(s9!==peg$FAILED){s10=peg$parseWS();if(s10===peg$FAILED){s10=null;}if(s10!==peg$FAILED){peg$savedPos=s0;s1=peg$c1227(s2,s3,s4,s5,s6,s7,s8,s9);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseColor(){var s0;peg$silentFails++;s0=peg$parseSvgColor();if(s0===peg$FAILED){s0=peg$parseRgba8();if(s0===peg$FAILED){s0=peg$parseRgb6();if(s0===peg$FAILED){s0=peg$parseRgba4();if(s0===peg$FAILED){s0=peg$parseRgb3();}}}}peg$silentFails--;if(s0===peg$FAILED){if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1228);}}return s0}function peg$parseArrowItemKey(){var s0;if(input.substr(peg$currPos,9)===peg$c1229){s0=peg$c1229;peg$currPos+=9;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1230);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,10)===peg$c1231){s0=peg$c1231;peg$currPos+=10;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1232);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,10)===peg$c1233){s0=peg$c1233;peg$currPos+=10;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1234);}}}}return s0}function peg$parseArrowItem(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){s2=peg$parseArrowItemKey();if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$parseLabel();if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1239(s2,s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseSingleEdgeColor(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;peg$silentFails++;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,10)===peg$c1241){s2=peg$c1241;peg$currPos+=10;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1242);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parseColor();if(s7!==peg$FAILED){peg$savedPos=s6;s7=peg$c1243(s7);}s6=s7;if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1244(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,10)===peg$c1245){s2=peg$c1245;peg$currPos+=10;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1246);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parseColor();if(s7!==peg$FAILED){peg$savedPos=s6;s7=peg$c1243(s7);}s6=s7;if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1244(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1240);}}return s0}function peg$parseTransitionLineStyle(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;peg$silentFails++;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,10)===peg$c1248){s2=peg$c1248;peg$currPos+=10;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1249);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$parseLineStyle();if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1250(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1247);}}return s0}function peg$parseArrowItems(){var s0,s1;s0=peg$parseSingleEdgeColor();if(s0===peg$FAILED){s0=peg$parseTransitionLineStyle();if(s0===peg$FAILED){s0=[];s1=peg$parseArrowItem();if(s1!==peg$FAILED){while(s1!==peg$FAILED){s0.push(s1);s1=peg$parseArrowItem();}}else {s0=peg$FAILED;}}}return s0}function peg$parseArrowDesc(){var s0,s1,s2,s3,s4,s5;s0=peg$currPos;if(input.charCodeAt(peg$currPos)===123){s1=peg$c1251;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1252);}}if(s1!==peg$FAILED){s2=peg$parseWS();if(s2===peg$FAILED){s2=null;}if(s2!==peg$FAILED){s3=peg$parseArrowItems();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){s4=peg$parseWS();if(s4===peg$FAILED){s4=null;}if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===125){s5=peg$c1253;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1254);}}if(s5!==peg$FAILED){peg$savedPos=s0;s1=peg$c1255(s3);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseArrowProbability(){var s0,s1,s2;s0=peg$currPos;s1=peg$parseNonNegNumber();if(s1!==peg$FAILED){if(input.charCodeAt(peg$currPos)===37){s2=peg$c1256;peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1257);}}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c1258(s1);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}var peg$timetype_alts=[[12,peg$c1259,peg$c1260,peg$c1261,109],[11,peg$c1262,peg$c1263,peg$c1261,109],[5,peg$c1264,peg$c1265,peg$c1261,109],[4,peg$c1266,peg$c1267,peg$c1261,109],[2,peg$c1268,peg$c1269,peg$c1261,109],[7,peg$c1270,peg$c1271,peg$c1272,115],[6,peg$c1273,peg$c1274,peg$c1272,115],[4,peg$c1275,peg$c1276,peg$c1272,115],[3,peg$c1277,peg$c1278,peg$c1272,115],[1,peg$c1279,peg$c1280,peg$c1272,115],[7,peg$c1281,peg$c1282,peg$c1283,109],[6,peg$c1284,peg$c1285,peg$c1283,109],[4,peg$c1286,peg$c1287,peg$c1283,109],[3,peg$c1288,peg$c1289,peg$c1283,109],[1,peg$c1290,peg$c1291,peg$c1283,109],[5,peg$c1292,peg$c1293,peg$c1294,104],[4,peg$c1295,peg$c1296,peg$c1294,104],[3,peg$c1297,peg$c1298,peg$c1294,104],[2,peg$c1299,peg$c1300,peg$c1294,104],[1,peg$c1301,peg$c1302,peg$c1294,104],[4,peg$c1303,peg$c1304,peg$c1305,100],[3,peg$c1306,peg$c1307,peg$c1305,100],[1,peg$c1308,peg$c1309,peg$c1305,100],[5,peg$c1310,peg$c1311,peg$c1312,119],[4,peg$c1313,peg$c1314,peg$c1312,119],[3,peg$c1315,peg$c1316,peg$c1312,119],[2,peg$c1317,peg$c1318,peg$c1312,119],[1,peg$c1319,peg$c1320,peg$c1312,119]];function peg$parseTimeType(){var i,j,alt,start;var c=input.charCodeAt(peg$currPos);for(i=0;i<28;i++){alt=peg$timetype_alts[i];if(alt[4]!==c){continue}if(alt[0]!==1&&input.substr(peg$currPos,alt[0])!==alt[1]){continue}if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){for(j=0;j<i;j++){peg$fail(peg$timetype_alts[j][2]);}}start=peg$currPos;peg$currPos+=alt[0];peg$savedPos=start;return alt[3]()}if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){for(j=0;j<28;j++){peg$fail(peg$timetype_alts[j][2]);}}return peg$FAILED}function peg$parseArrowAfter(){var s0,s1,s2,s3,s4,s5;s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c1321){s1=peg$c1321;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1322);}}if(s1!==peg$FAILED){s2=peg$parseWS();if(s2!==peg$FAILED){s3=peg$parseNonNegNumber();if(s3!==peg$FAILED){s4=peg$parseWS();if(s4===peg$FAILED){s4=null;}if(s4!==peg$FAILED){s5=peg$parseTimeType();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){peg$savedPos=s0;s1=peg$c1323(s3,s5);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseLabelList(){var s0,s1,s2,s3,s4,s5,s6;s0=peg$currPos;if(input.charCodeAt(peg$currPos)===91){s1=peg$c11;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c12);}}if(s1!==peg$FAILED){s2=peg$parseWS();if(s2===peg$FAILED){s2=null;}if(s2!==peg$FAILED){s3=[];s4=peg$currPos;s5=peg$parseLabel();if(s5!==peg$FAILED){s6=peg$parseWS();if(s6===peg$FAILED){s6=null;}if(s6!==peg$FAILED){s5=[s5,s6];s4=s5;}else {peg$currPos=s4;s4=peg$FAILED;}}else {peg$currPos=s4;s4=peg$FAILED;}while(s4!==peg$FAILED){s3.push(s4);s4=peg$currPos;s5=peg$parseLabel();if(s5!==peg$FAILED){s6=peg$parseWS();if(s6===peg$FAILED){s6=null;}if(s6!==peg$FAILED){s5=[s5,s6];s4=s5;}else {peg$currPos=s4;s4=peg$FAILED;}}else {peg$currPos=s4;s4=peg$FAILED;}}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===93){s4=peg$c13;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c14);}}if(s4!==peg$FAILED){peg$savedPos=s0;s1=peg$c1324(s3);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseLabelOrLabelList(){var s0;s0=peg$parseLabelList();if(s0===peg$FAILED){s0=peg$parseLabel();}return s0}function peg$parseGroupRef(){var s0,s1,s2,s3;peg$silentFails++;s0=peg$currPos;if(input.charCodeAt(peg$currPos)===38){s1=peg$c1326;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1327);}}if(s1!==peg$FAILED){s2=peg$parseWS();if(s2===peg$FAILED){s2=null;}if(s2!==peg$FAILED){s3=peg$parseLabel();if(s3!==peg$FAILED){peg$savedPos=s0;s1=peg$c1328(s3);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1325);}}return s0}function peg$parseGroupMember(){var s0,s1,s2,s3,s4,s5;s0=peg$currPos;if(input.substr(peg$currPos,3)===peg$c1329){s1=peg$c1329;peg$currPos+=3;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1330);}}if(s1!==peg$FAILED){s2=peg$parseWS();if(s2===peg$FAILED){s2=null;}if(s2!==peg$FAILED){if(input.charCodeAt(peg$currPos)===38){s3=peg$c1326;peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1327);}}if(s3!==peg$FAILED){s4=peg$parseWS();if(s4===peg$FAILED){s4=null;}if(s4!==peg$FAILED){s5=peg$parseLabel();if(s5!==peg$FAILED){peg$savedPos=s0;s1=peg$c1331(s5);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===38){s1=peg$c1326;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1327);}}if(s1!==peg$FAILED){s2=peg$parseWS();if(s2===peg$FAILED){s2=null;}if(s2!==peg$FAILED){s3=peg$parseLabel();if(s3!==peg$FAILED){peg$savedPos=s0;s1=peg$c1332(s3);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseLabel();if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1333(s1);}s0=s1;}}return s0}function peg$parseGroupMemberList(){var s0,s1,s2,s3,s4,s5,s6;s0=peg$currPos;if(input.charCodeAt(peg$currPos)===91){s1=peg$c11;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c12);}}if(s1!==peg$FAILED){s2=peg$parseWS();if(s2===peg$FAILED){s2=null;}if(s2!==peg$FAILED){s3=[];s4=peg$currPos;s5=peg$parseGroupMember();if(s5!==peg$FAILED){s6=peg$parseWS();if(s6===peg$FAILED){s6=null;}if(s6!==peg$FAILED){s5=[s5,s6];s4=s5;}else {peg$currPos=s4;s4=peg$FAILED;}}else {peg$currPos=s4;s4=peg$FAILED;}while(s4!==peg$FAILED){s3.push(s4);s4=peg$currPos;s5=peg$parseGroupMember();if(s5!==peg$FAILED){s6=peg$parseWS();if(s6===peg$FAILED){s6=null;}if(s6!==peg$FAILED){s5=[s5,s6];s4=s5;}else {peg$currPos=s4;s4=peg$FAILED;}}else {peg$currPos=s4;s4=peg$FAILED;}}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===93){s4=peg$c13;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c14);}}if(s4!==peg$FAILED){peg$savedPos=s0;s1=peg$c1334(s3);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseStripe(){var s0,s1,s2,s3,s4,s5,s6;var cg=input.charCodeAt(peg$currPos);if(cg!==43&&cg!==45){if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1336);peg$fail(peg$c1339);}return peg$FAILED}s0=peg$currPos;if(input.substr(peg$currPos,2)===peg$c1335){s1=peg$c1335;peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1336);}}if(s1!==peg$FAILED){s2=peg$currPos;s3=peg$currPos;s4=peg$parseNonZeroDigit();if(s4!==peg$FAILED){s5=[];s6=peg$parseDecimalDigit();while(s6!==peg$FAILED){s5.push(s6);s6=peg$parseDecimalDigit();}if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=input.substring(s2,peg$currPos);}else {s2=s3;}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c1337(s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,2)===peg$c1338){s1=peg$c1338;peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1339);}}if(s1!==peg$FAILED){s2=peg$currPos;s3=peg$currPos;s4=peg$parseNonZeroDigit();if(s4!==peg$FAILED){s5=[];s6=peg$parseDecimalDigit();while(s6!==peg$FAILED){s5.push(s6);s6=peg$parseDecimalDigit();}if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=input.substring(s2,peg$currPos);}else {s2=s3;}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c1340(s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}return s0}function peg$parseCycle(){var s0,s1,s2,s3,s4,s5,s6;var cg=input.charCodeAt(peg$currPos);if(cg!==43&&cg!==45){if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1342);peg$fail(peg$c1345);peg$fail(peg$c1348);}return peg$FAILED}s0=peg$currPos;if(input.charCodeAt(peg$currPos)===43){s1=peg$c1341;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1342);}}if(s1!==peg$FAILED){s2=peg$currPos;s3=peg$currPos;s4=peg$parseNonZeroDigit();if(s4!==peg$FAILED){s5=[];s6=peg$parseDecimalDigit();while(s6!==peg$FAILED){s5.push(s6);s6=peg$parseDecimalDigit();}if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=input.substring(s2,peg$currPos);}else {s2=s3;}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c1343(s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===45){s1=peg$c1344;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1345);}}if(s1!==peg$FAILED){s2=peg$currPos;s3=peg$currPos;s4=peg$parseNonZeroDigit();if(s4!==peg$FAILED){s5=[];s6=peg$parseDecimalDigit();while(s6!==peg$FAILED){s5.push(s6);s6=peg$parseDecimalDigit();}if(s5!==peg$FAILED){s4=[s4,s5];s3=s4;}else {peg$currPos=s3;s3=peg$FAILED;}}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=input.substring(s2,peg$currPos);}else {s2=s3;}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c1346(s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,2)===peg$c1347){s1=peg$c1347;peg$currPos+=2;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1348);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1349();}s0=s1;}}return s0}function peg$parseArrowTarget(){var s0;s0=peg$parseStripe();if(s0===peg$FAILED){s0=peg$parseCycle();if(s0===peg$FAILED){s0=peg$parseLabelList();if(s0===peg$FAILED){s0=peg$parseGroupRef();if(s0===peg$FAILED){s0=peg$parseLabel();}}}}return s0}function peg$parseArrowDecoration(){var s0,s1;s0=peg$currPos;s1=peg$parseArrowAfter();if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1350(s1);}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseActionLabel();if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1351(s1);}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseArrowProbability();if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1352(s1);}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseArrowDesc();if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1353(s1);}s0=s1;}}}return s0}function peg$parseArrowDecorations(){var s0,s1,s2,s3;s0=[];s1=peg$currPos;s2=peg$parseArrowDecoration();if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){peg$savedPos=s1;s2=peg$c1354(s2);s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}while(s1!==peg$FAILED){s0.push(s1);s1=peg$currPos;s2=peg$parseArrowDecoration();if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){peg$savedPos=s1;s2=peg$c1354(s2);s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}}return s0}function peg$parseSubexp(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9,s10;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){s2=peg$parseArrowDecorations();if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){s4=peg$parseArrow();if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$parseArrowDecorations();if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){s8=peg$currPos;s9=peg$parseArrowTarget();if(s9!==peg$FAILED){peg$savedPos=s8;s9=peg$c1355(s2,s4,s6,s9);}s8=s9;if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){s10=peg$parseSubexp();if(s10===peg$FAILED){s10=null;}if(s10!==peg$FAILED){peg$savedPos=s0;s1=peg$c1356(s2,s4,s6,s8,s10);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseExp(){var s0,s1,s2,s3,s4,s5;s0=peg$currPos;s1=peg$currPos;s2=peg$parseArrowTarget();if(s2!==peg$FAILED){peg$savedPos=s1;s2=peg$c1357(s2);}s1=s2;if(s1!==peg$FAILED){s2=peg$parseSubexp();if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s4=peg$c1237;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){peg$savedPos=s0;s1=peg$c1358(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseGvizLayout(){var s0;if(input.substr(peg$currPos,3)===peg$c1359){s0=peg$c1359;peg$currPos+=3;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1360);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,5)===peg$c1361){s0=peg$c1361;peg$currPos+=5;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1362);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,3)===peg$c1363){s0=peg$c1363;peg$currPos+=3;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1364);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,5)===peg$c1365){s0=peg$c1365;peg$currPos+=5;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1366);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,5)===peg$c1367){s0=peg$c1367;peg$currPos+=5;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1368);}}}}}}return s0}function peg$parseStateItems(){var s0,s1;s0=[];s1=peg$parseStateDeclarationItem();if(s1!==peg$FAILED){while(s1!==peg$FAILED){s0.push(s1);s1=peg$parseStateDeclarationItem();}}else {s0=peg$FAILED;}return s0}function peg$parseConfigState(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,5)===peg$c1369){s2=peg$c1369;peg$currPos+=5;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1370);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){if(input.charCodeAt(peg$currPos)===123){s6=peg$c1251;peg$currPos++;}else {s6=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1252);}}if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){s8=peg$parseStateItems();if(s8===peg$FAILED){s8=null;}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){if(input.substr(peg$currPos,2)===peg$c1371){s10=peg$c1371;peg$currPos+=2;}else {s10=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1372);}}if(s10!==peg$FAILED){s11=peg$parseWS();if(s11===peg$FAILED){s11=null;}if(s11!==peg$FAILED){peg$savedPos=s0;s1=peg$c1373(s8);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseConfigStartState(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,11)===peg$c1374){s2=peg$c1374;peg$currPos+=11;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1375);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){if(input.charCodeAt(peg$currPos)===123){s6=peg$c1251;peg$currPos++;}else {s6=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1252);}}if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){s8=peg$parseStateItems();if(s8===peg$FAILED){s8=null;}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){if(input.substr(peg$currPos,2)===peg$c1371){s10=peg$c1371;peg$currPos+=2;}else {s10=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1372);}}if(s10!==peg$FAILED){s11=peg$parseWS();if(s11===peg$FAILED){s11=null;}if(s11!==peg$FAILED){peg$savedPos=s0;s1=peg$c1376(s8);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseConfigEndState(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,9)===peg$c1377){s2=peg$c1377;peg$currPos+=9;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1378);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){if(input.charCodeAt(peg$currPos)===123){s6=peg$c1251;peg$currPos++;}else {s6=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1252);}}if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){s8=peg$parseStateItems();if(s8===peg$FAILED){s8=null;}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){if(input.substr(peg$currPos,2)===peg$c1371){s10=peg$c1371;peg$currPos+=2;}else {s10=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1372);}}if(s10!==peg$FAILED){s11=peg$parseWS();if(s11===peg$FAILED){s11=null;}if(s11!==peg$FAILED){peg$savedPos=s0;s1=peg$c1379(s8);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseConfigActiveState(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,12)===peg$c1380){s2=peg$c1380;peg$currPos+=12;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1381);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){if(input.charCodeAt(peg$currPos)===123){s6=peg$c1251;peg$currPos++;}else {s6=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1252);}}if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){s8=peg$parseStateItems();if(s8===peg$FAILED){s8=null;}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){if(input.substr(peg$currPos,2)===peg$c1371){s10=peg$c1371;peg$currPos+=2;}else {s10=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1372);}}if(s10!==peg$FAILED){s11=peg$parseWS();if(s11===peg$FAILED){s11=null;}if(s11!==peg$FAILED){peg$savedPos=s0;s1=peg$c1382(s8);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseConfigTerminalState(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,14)===peg$c1383){s2=peg$c1383;peg$currPos+=14;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1384);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){if(input.charCodeAt(peg$currPos)===123){s6=peg$c1251;peg$currPos++;}else {s6=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1252);}}if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){s8=peg$parseStateItems();if(s8===peg$FAILED){s8=null;}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){if(input.substr(peg$currPos,2)===peg$c1371){s10=peg$c1371;peg$currPos+=2;}else {s10=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1372);}}if(s10!==peg$FAILED){s11=peg$parseWS();if(s11===peg$FAILED){s11=null;}if(s11!==peg$FAILED){peg$savedPos=s0;s1=peg$c1385(s8);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseConfigHookedState(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,12)===peg$c1386){s2=peg$c1386;peg$currPos+=12;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1387);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){if(input.charCodeAt(peg$currPos)===123){s6=peg$c1251;peg$currPos++;}else {s6=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1252);}}if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){s8=peg$parseStateItems();if(s8===peg$FAILED){s8=null;}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){if(input.substr(peg$currPos,2)===peg$c1371){s10=peg$c1371;peg$currPos+=2;}else {s10=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1372);}}if(s10!==peg$FAILED){s11=peg$parseWS();if(s11===peg$FAILED){s11=null;}if(s11!==peg$FAILED){peg$savedPos=s0;s1=peg$c1388(s8);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseConfigAnyState(){var s0;s0=peg$parseConfigState();if(s0===peg$FAILED){s0=peg$parseConfigStartState();if(s0===peg$FAILED){s0=peg$parseConfigEndState();if(s0===peg$FAILED){s0=peg$parseConfigActiveState();if(s0===peg$FAILED){s0=peg$parseConfigTerminalState();if(s0===peg$FAILED){s0=peg$parseConfigHookedState();}}}}}return s0}function peg$parseGraphDefaultEdgeColor(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;peg$silentFails++;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,10)===peg$c1241){s2=peg$c1241;peg$currPos+=10;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1242);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parseColor();if(s7!==peg$FAILED){peg$savedPos=s6;s7=peg$c1243(s7);}s6=s7;if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1390(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,10)===peg$c1245){s2=peg$c1245;peg$currPos+=10;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1246);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parseColor();if(s7!==peg$FAILED){peg$savedPos=s6;s7=peg$c1243(s7);}s6=s7;if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1390(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1389);}}return s0}function peg$parseConfigStyleItems(){var s0,s1,s2;s0=peg$parseGraphDefaultEdgeColor();if(s0===peg$FAILED){s0=peg$currPos;s1=[];s2=peg$parseStateDeclarationItem();if(s2!==peg$FAILED){while(s2!==peg$FAILED){s1.push(s2);s2=peg$parseStateDeclarationItem();}}else {s1=peg$FAILED;}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1255(s1);}s0=s1;}return s0}function peg$parseConfigTransition(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,10)===peg$c1391){s2=peg$c1391;peg$currPos+=10;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1392);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){if(input.charCodeAt(peg$currPos)===123){s6=peg$c1251;peg$currPos++;}else {s6=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1252);}}if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){s8=peg$parseConfigStyleItems();if(s8===peg$FAILED){s8=null;}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){if(input.substr(peg$currPos,2)===peg$c1371){s10=peg$c1371;peg$currPos+=2;}else {s10=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1372);}}if(s10!==peg$FAILED){s11=peg$parseWS();if(s11===peg$FAILED){s11=null;}if(s11!==peg$FAILED){peg$savedPos=s0;s1=peg$c1393(s8);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseConfigGraph(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,5)===peg$c1394){s2=peg$c1394;peg$currPos+=5;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1395);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){if(input.charCodeAt(peg$currPos)===123){s6=peg$c1251;peg$currPos++;}else {s6=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1252);}}if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){s8=peg$parseConfigStyleItems();if(s8===peg$FAILED){s8=null;}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){if(input.substr(peg$currPos,2)===peg$c1371){s10=peg$c1371;peg$currPos+=2;}else {s10=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1372);}}if(s10!==peg$FAILED){s11=peg$parseWS();if(s11===peg$FAILED){s11=null;}if(s11!==peg$FAILED){peg$savedPos=s0;s1=peg$c1396(s8);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseConfigEditor(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,6)===peg$c1397){s2=peg$c1397;peg$currPos+=6;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1398);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){if(input.charCodeAt(peg$currPos)===123){s6=peg$c1251;peg$currPos++;}else {s6=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1252);}}if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){s8=[];s9=peg$parseEditorConfigItem();while(s9!==peg$FAILED){s8.push(s9);s9=peg$parseEditorConfigItem();}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){if(input.substr(peg$currPos,2)===peg$c1371){s10=peg$c1371;peg$currPos+=2;}else {s10=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1372);}}if(s10!==peg$FAILED){s11=peg$parseWS();if(s11===peg$FAILED){s11=null;}if(s11!==peg$FAILED){peg$savedPos=s0;s1=peg$c1399(s8);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseEditorConfigItem(){var s0;s0=peg$parseEditorStochasticRunCount();if(s0===peg$FAILED){s0=peg$parseEditorPanels();}return s0}function peg$parseEditorStochasticRunCount(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,20)===peg$c1400){s2=peg$c1400;peg$currPos+=20;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1401);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$parseIntegerLiteral();if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1402(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseEditorPanels(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,6)===peg$c1403){s2=peg$c1403;peg$currPos+=6;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1404);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$parseLabelList();if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1405(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseConfigGraphLayout(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,12)===peg$c1406){s2=peg$c1406;peg$currPos+=12;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1407);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$parseGvizLayout();if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1408(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseConfigStartNodes(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,12)===peg$c1409){s2=peg$c1409;peg$currPos+=12;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1410);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$parseLabelList();if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1411(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseConfigEndNodes(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,10)===peg$c1412){s2=peg$c1412;peg$currPos+=10;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1413);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$parseLabelList();if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1414(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseConfigFailedOutputs(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,14)===peg$c1415){s2=peg$c1415;peg$currPos+=14;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1416);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parseLabelOrLabelList();if(s7!==peg$FAILED){peg$savedPos=s6;s7=peg$c1243(s7);}s6=s7;if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1417(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseConfigGraphBgColor(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,14)===peg$c1418){s2=peg$c1418;peg$currPos+=14;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1419);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parseColor();if(s7!==peg$FAILED){peg$savedPos=s6;s7=peg$c1243(s7);}s6=s7;if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1420(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseConfigAllowsOverride(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,15)===peg$c1421){s2=peg$c1421;peg$currPos+=15;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1422);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$parseOverrideT();if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1423(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseConfigAllowIslands(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,13)===peg$c1424){s2=peg$c1424;peg$currPos+=13;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1425);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parseIslandsT();if(s7!==peg$FAILED){peg$savedPos=s6;s7=peg$c1243(s7);}s6=s7;if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1426(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseOverrideT(){var s0,s1;s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c254){s1=peg$c254;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c255);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1427();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c257){s1=peg$c257;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c258);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1428();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,9)===peg$c303){s1=peg$c303;peg$currPos+=9;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c304);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c305();}s0=s1;}}return s0}function peg$parseIslandsT(){var s0,s1;s0=peg$currPos;if(input.substr(peg$currPos,10)===peg$c1429){s1=peg$c1429;peg$currPos+=10;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1430);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1431();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c254){s1=peg$c254;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c255);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1432();}s0=s1;if(s0===peg$FAILED){s0=peg$currPos;if(input.substr(peg$currPos,5)===peg$c257){s1=peg$c257;peg$currPos+=5;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c258);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1433();}s0=s1;}}return s0}function peg$parseConfig(){var s0;peg$silentFails++;s0=peg$parseConfigGraphLayout();if(s0===peg$FAILED){s0=peg$parseConfigStartNodes();if(s0===peg$FAILED){s0=peg$parseConfigEndNodes();if(s0===peg$FAILED){s0=peg$parseConfigFailedOutputs();if(s0===peg$FAILED){s0=peg$parseConfigTransition();if(s0===peg$FAILED){s0=peg$parseConfigGraph();if(s0===peg$FAILED){s0=peg$parseConfigEditor();if(s0===peg$FAILED){s0=peg$parseConfigAnyState();if(s0===peg$FAILED){s0=peg$parseConfigGraphBgColor();if(s0===peg$FAILED){s0=peg$parseConfigAllowsOverride();if(s0===peg$FAILED){s0=peg$parseConfigAllowIslands();}}}}}}}}}}peg$silentFails--;if(s0===peg$FAILED){if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1434);}}return s0}function peg$parseLicenseOrLabelOrList(){var s0,s1,s2,s3,s4;s0=peg$currPos;s1=peg$currPos;if(input.substr(peg$currPos,3)===peg$c1435){s2=peg$c1435;peg$currPos+=3;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1436);}}if(s2!==peg$FAILED){s3=peg$currPos;peg$silentFails++;s4=peg$parseAtomLetter();peg$silentFails--;if(s4===peg$FAILED){s3=void 0;}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=[s2,s3];s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$currPos;if(input.substr(peg$currPos,12)===peg$c1437){s2=peg$c1437;peg$currPos+=12;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1438);}}if(s2!==peg$FAILED){s3=peg$currPos;peg$silentFails++;s4=peg$parseAtomLetter();peg$silentFails--;if(s4===peg$FAILED){s3=void 0;}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=[s2,s3];s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$currPos;if(input.substr(peg$currPos,12)===peg$c1439){s2=peg$c1439;peg$currPos+=12;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1440);}}if(s2!==peg$FAILED){s3=peg$currPos;peg$silentFails++;s4=peg$parseAtomLetter();peg$silentFails--;if(s4===peg$FAILED){s3=void 0;}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=[s2,s3];s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$currPos;if(input.substr(peg$currPos,10)===peg$c1441){s2=peg$c1441;peg$currPos+=10;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1442);}}if(s2!==peg$FAILED){s3=peg$currPos;peg$silentFails++;s4=peg$parseAtomLetter();peg$silentFails--;if(s4===peg$FAILED){s3=void 0;}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=[s2,s3];s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$currPos;if(input.substr(peg$currPos,11)===peg$c1443){s2=peg$c1443;peg$currPos+=11;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1444);}}if(s2!==peg$FAILED){s3=peg$currPos;peg$silentFails++;s4=peg$parseAtomLetter();peg$silentFails--;if(s4===peg$FAILED){s3=void 0;}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=[s2,s3];s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$currPos;if(input.substr(peg$currPos,13)===peg$c1445){s2=peg$c1445;peg$currPos+=13;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1446);}}if(s2!==peg$FAILED){s3=peg$currPos;peg$silentFails++;s4=peg$parseAtomLetter();peg$silentFails--;if(s4===peg$FAILED){s3=void 0;}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=[s2,s3];s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$currPos;if(input.substr(peg$currPos,6)===peg$c1447){s2=peg$c1447;peg$currPos+=6;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1448);}}if(s2!==peg$FAILED){s3=peg$currPos;peg$silentFails++;s4=peg$parseAtomLetter();peg$silentFails--;if(s4===peg$FAILED){s3=void 0;}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=[s2,s3];s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$currPos;if(input.substr(peg$currPos,6)===peg$c1449){s2=peg$c1449;peg$currPos+=6;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1450);}}if(s2!==peg$FAILED){s3=peg$currPos;peg$silentFails++;s4=peg$parseAtomLetter();peg$silentFails--;if(s4===peg$FAILED){s3=void 0;}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=[s2,s3];s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$currPos;if(input.substr(peg$currPos,9)===peg$c1451){s2=peg$c1451;peg$currPos+=9;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1452);}}if(s2!==peg$FAILED){s3=peg$currPos;peg$silentFails++;s4=peg$parseAtomLetter();peg$silentFails--;if(s4===peg$FAILED){s3=void 0;}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=[s2,s3];s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$currPos;if(input.substr(peg$currPos,9)===peg$c1453){s2=peg$c1453;peg$currPos+=9;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1454);}}if(s2!==peg$FAILED){s3=peg$currPos;peg$silentFails++;s4=peg$parseAtomLetter();peg$silentFails--;if(s4===peg$FAILED){s3=void 0;}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=[s2,s3];s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$currPos;if(input.substr(peg$currPos,7)===peg$c1455){s2=peg$c1455;peg$currPos+=7;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1456);}}if(s2!==peg$FAILED){s3=peg$currPos;peg$silentFails++;s4=peg$parseAtomLetter();peg$silentFails--;if(s4===peg$FAILED){s3=void 0;}else {peg$currPos=s3;s3=peg$FAILED;}if(s3!==peg$FAILED){s2=[s2,s3];s1=s2;}else {peg$currPos=s1;s1=peg$FAILED;}}else {peg$currPos=s1;s1=peg$FAILED;}if(s1!==peg$FAILED){s0=input.substring(s0,peg$currPos);}else {s0=s1;}if(s0===peg$FAILED){s0=peg$parseLabel();if(s0===peg$FAILED){s0=peg$parseLabelList();}}}}}}}}}}}}return s0}function peg$parseDirection(){var s0;peg$silentFails++;if(input.substr(peg$currPos,2)===peg$c1458){s0=peg$c1458;peg$currPos+=2;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1459);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,5)===peg$c1460){s0=peg$c1460;peg$currPos+=5;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1461);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,4)===peg$c1462){s0=peg$c1462;peg$currPos+=4;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1463);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,4)===peg$c1464){s0=peg$c1464;peg$currPos+=4;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1465);}}}}}peg$silentFails--;if(s0===peg$FAILED){if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1457);}}return s0}function peg$parseHookDefinition(){var s0;peg$silentFails++;if(input.substr(peg$currPos,4)===peg$c1467){s0=peg$c1467;peg$currPos+=4;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1468);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,6)===peg$c1469){s0=peg$c1469;peg$currPos+=6;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1470);}}}peg$silentFails--;if(s0===peg$FAILED){if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1466);}}return s0}function peg$parseMachineAuthor(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,14)===peg$c1471){s2=peg$c1471;peg$currPos+=14;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1472);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parseLabelOrLabelList();if(s7!==peg$FAILED){peg$savedPos=s6;s7=peg$c1243(s7);}s6=s7;if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1473(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseMachineContributor(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,19)===peg$c1474){s2=peg$c1474;peg$currPos+=19;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1475);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parseLabelOrLabelList();if(s7!==peg$FAILED){peg$savedPos=s6;s7=peg$c1243(s7);}s6=s7;if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1476(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseMachineComment(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,15)===peg$c1477){s2=peg$c1477;peg$currPos+=15;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1478);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parseLabelOrLabelList();if(s7!==peg$FAILED){peg$savedPos=s6;s7=peg$c1243(s7);}s6=s7;if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1479(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseMachineDefinition(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,18)===peg$c1480){s2=peg$c1480;peg$currPos+=18;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1481);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parseURL();if(s7!==peg$FAILED){peg$savedPos=s6;s7=peg$c1243(s7);}s6=s7;if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1482(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseMachineName(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,12)===peg$c1483){s2=peg$c1483;peg$currPos+=12;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1484);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parseLabel();if(s7!==peg$FAILED){peg$savedPos=s6;s7=peg$c1243(s7);}s6=s7;if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1485(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseNpmName(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,8)===peg$c1486){s2=peg$c1486;peg$currPos+=8;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1487);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parseLabel();if(s7!==peg$FAILED){peg$savedPos=s6;s7=peg$c1243(s7);}s6=s7;if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1488(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseMachineReference(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,17)===peg$c1489){s2=peg$c1489;peg$currPos+=17;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1490);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parseLabelOrLabelList();if(s7!==peg$FAILED){peg$savedPos=s6;s7=peg$c1243(s7);}s6=s7;if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1491(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseMachineVersion(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,15)===peg$c1492){s2=peg$c1492;peg$currPos+=15;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1493);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parseSemVer();if(s7!==peg$FAILED){peg$savedPos=s6;s7=peg$c1243(s7);}s6=s7;if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1494(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseMachineLicense(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,15)===peg$c1495){s2=peg$c1495;peg$currPos+=15;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1496);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parseLicenseOrLabelOrList();if(s7!==peg$FAILED){peg$savedPos=s6;s7=peg$c1243(s7);}s6=s7;if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1497(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseMachineLanguage(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,16)===peg$c1498){s2=peg$c1498;peg$currPos+=16;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1499);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parseLabel();if(s7!==peg$FAILED){peg$savedPos=s6;s7=peg$c1243(s7);}s6=s7;if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1500(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseFslVersion(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,11)===peg$c1501){s2=peg$c1501;peg$currPos+=11;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1502);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parseSemVer();if(s7!==peg$FAILED){peg$savedPos=s6;s7=peg$c1243(s7);}s6=s7;if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1503(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseMachineTheme(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,5)===peg$c1504){s2=peg$c1504;peg$currPos+=5;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1505);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parseThemeOrThemeList();if(s7!==peg$FAILED){peg$savedPos=s6;s7=peg$c1243(s7);}s6=s7;if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1506(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseMachineFlow(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,4)===peg$c1507){s2=peg$c1507;peg$currPos+=4;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1508);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parseDirection();if(s7!==peg$FAILED){peg$savedPos=s6;s7=peg$c1243(s7);}s6=s7;if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1509(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseMachineHookDefinition(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,5)===peg$c1510){s2=peg$c1510;peg$currPos+=5;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1511);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parseHookDefinition();if(s7!==peg$FAILED){peg$savedPos=s6;s7=peg$c1243(s7);}s6=s7;if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1512(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseDotPreamble(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,12)===peg$c1513){s2=peg$c1513;peg$currPos+=12;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1514);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parseString();if(s7!==peg$FAILED){peg$savedPos=s6;s7=peg$c1243(s7);}s6=s7;if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1515(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseDefaultSizeVal(){var s0,s1,s2,s3;s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c1516){s1=peg$c1516;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1517);}}if(s1!==peg$FAILED){s2=peg$parseWS();if(s2!==peg$FAILED){s3=peg$parseNonNegNumber();if(s3!==peg$FAILED){peg$savedPos=s0;s1=peg$c1518(s3);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseNonNegNumber();if(s1!==peg$FAILED){s2=peg$parseNonNegNumber();if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c1519(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseNonNegNumber();if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1520(s1);}s0=s1;}}return s0}function peg$parseDefaultSize(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,12)===peg$c1521){s2=peg$c1521;peg$currPos+=12;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1522);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parseDefaultSizeVal();if(s7!==peg$FAILED){peg$savedPos=s6;s7=peg$c1243(s7);}s6=s7;if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1523(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseMachineAttribute(){var s0;peg$silentFails++;s0=peg$parseFslVersion();if(s0===peg$FAILED){s0=peg$parseMachineName();if(s0===peg$FAILED){s0=peg$parseNpmName();if(s0===peg$FAILED){s0=peg$parseMachineAuthor();if(s0===peg$FAILED){s0=peg$parseMachineContributor();if(s0===peg$FAILED){s0=peg$parseMachineComment();if(s0===peg$FAILED){s0=peg$parseMachineDefinition();if(s0===peg$FAILED){s0=peg$parseMachineReference();if(s0===peg$FAILED){s0=peg$parseMachineVersion();if(s0===peg$FAILED){s0=peg$parseMachineLicense();if(s0===peg$FAILED){s0=peg$parseMachineLanguage();if(s0===peg$FAILED){s0=peg$parseMachineTheme();if(s0===peg$FAILED){s0=peg$parseDotPreamble();if(s0===peg$FAILED){s0=peg$parseMachineFlow();if(s0===peg$FAILED){s0=peg$parseMachineHookDefinition();if(s0===peg$FAILED){s0=peg$parseDefaultSize();}}}}}}}}}}}}}}}peg$silentFails--;if(s0===peg$FAILED){if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1524);}}return s0}function peg$parsePropertyVal(){var s0;s0=peg$parseString();if(s0===peg$FAILED){s0=peg$parseBoolean();if(s0===peg$FAILED){s0=peg$parseJsNumericLiteral();if(s0===peg$FAILED){s0=peg$parseNull();if(s0===peg$FAILED){s0=peg$parseUndefined();}}}}return s0}function peg$parseSdStateLabel(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;peg$silentFails++;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,5)===peg$c1525){s2=peg$c1525;peg$currPos+=5;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1526);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$parseLabel();if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1527(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c335);}}return s0}function peg$parseSdStateColor(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;peg$silentFails++;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,5)===peg$c1528){s2=peg$c1528;peg$currPos+=5;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1529);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parseColor();if(s7!==peg$FAILED){peg$savedPos=s6;s7=peg$c1243(s7);}s6=s7;if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1530(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1228);}}return s0}function peg$parseSdStateTextColor(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;peg$silentFails++;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,10)===peg$c1532){s2=peg$c1532;peg$currPos+=10;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1533);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parseColor();if(s7!==peg$FAILED){peg$savedPos=s6;s7=peg$c1243(s7);}s6=s7;if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1534(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1531);}}return s0}function peg$parseSdStateBackgroundColor(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;peg$silentFails++;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,16)===peg$c1536){s2=peg$c1536;peg$currPos+=16;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1537);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parseColor();if(s7!==peg$FAILED){peg$savedPos=s6;s7=peg$c1243(s7);}s6=s7;if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1538(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1535);}}return s0}function peg$parseSdStateBorderColor(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;peg$silentFails++;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,12)===peg$c1540){s2=peg$c1540;peg$currPos+=12;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1541);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$currPos;s7=peg$parseColor();if(s7!==peg$FAILED){peg$savedPos=s6;s7=peg$c1243(s7);}s6=s7;if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1542(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1539);}}return s0}function peg$parseSdStateShape(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;peg$silentFails++;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,5)===peg$c1544){s2=peg$c1544;peg$currPos+=5;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1545);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$parseGvizShape();if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1546(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1543);}}return s0}function peg$parseSdStateCorners(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;peg$silentFails++;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,7)===peg$c1548){s2=peg$c1548;peg$currPos+=7;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1549);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$parseCorners();if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1550(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1547);}}return s0}function peg$parseSdStateLineStyle(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;peg$silentFails++;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,10)===peg$c1248){s2=peg$c1248;peg$currPos+=10;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1249);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$parseLineStyle();if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1552(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,9)===peg$c1553){s2=peg$c1553;peg$currPos+=9;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1554);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$parseLineStyle();if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1552(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1551);}}return s0}function peg$parseSdStateImage(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;peg$silentFails++;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,5)===peg$c1556){s2=peg$c1556;peg$currPos+=5;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1557);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$parseString();if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1558(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1555);}}return s0}function peg$parseSdStateUrl(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9;peg$silentFails++;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,3)===peg$c1560){s2=peg$c1560;peg$currPos+=3;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1561);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$parseString();if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1562(s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1559);}}return s0}function peg$parseSdStateProperty(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11,s12,s13;peg$silentFails++;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,8)===peg$c1564){s2=peg$c1564;peg$currPos+=8;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1565);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$parseAtom();if(s6!==peg$FAILED){s7=peg$parseWS();if(s7!==peg$FAILED){s8=peg$parsePropertyVal();if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s10=peg$c1237;peg$currPos++;}else {s10=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s10!==peg$FAILED){s11=peg$parseWS();if(s11===peg$FAILED){s11=null;}if(s11!==peg$FAILED){peg$savedPos=s0;s1=peg$c1566(s6,s8);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,8)===peg$c1564){s2=peg$c1564;peg$currPos+=8;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1565);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s4=peg$c1235;peg$currPos++;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$parseAtom();if(s6!==peg$FAILED){s7=peg$parseWS();if(s7!==peg$FAILED){s8=peg$parsePropertyVal();if(s8!==peg$FAILED){s9=peg$parseWS();if(s9!==peg$FAILED){if(input.substr(peg$currPos,8)===peg$c1567){s10=peg$c1567;peg$currPos+=8;}else {s10=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1568);}}if(s10!==peg$FAILED){s11=peg$parseWS();if(s11===peg$FAILED){s11=null;}if(s11!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s12=peg$c1237;peg$currPos++;}else {s12=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s12!==peg$FAILED){s13=peg$parseWS();if(s13===peg$FAILED){s13=null;}if(s13!==peg$FAILED){peg$savedPos=s0;s1=peg$c1569(s6,s8);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1563);}}return s0}function peg$parseStateDeclarationItem(){var s0;s0=peg$parseSdStateLabel();if(s0===peg$FAILED){s0=peg$parseSdStateColor();if(s0===peg$FAILED){s0=peg$parseSdStateTextColor();if(s0===peg$FAILED){s0=peg$parseSdStateBackgroundColor();if(s0===peg$FAILED){s0=peg$parseSdStateBorderColor();if(s0===peg$FAILED){s0=peg$parseSdStateShape();if(s0===peg$FAILED){s0=peg$parseSdStateCorners();if(s0===peg$FAILED){s0=peg$parseSdStateLineStyle();if(s0===peg$FAILED){s0=peg$parseSdStateImage();if(s0===peg$FAILED){s0=peg$parseSdStateUrl();if(s0===peg$FAILED){s0=peg$parseSdStateProperty();}}}}}}}}}}return s0}function peg$parseStateDeclarationDesc(){var s0,s1,s2,s3,s4,s5;s0=peg$currPos;if(input.charCodeAt(peg$currPos)===123){s1=peg$c1251;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1252);}}if(s1!==peg$FAILED){s2=peg$parseWS();if(s2===peg$FAILED){s2=null;}if(s2!==peg$FAILED){s3=[];s4=peg$parseStateDeclarationItem();while(s4!==peg$FAILED){s3.push(s4);s4=peg$parseStateDeclarationItem();}if(s3!==peg$FAILED){s4=peg$parseWS();if(s4===peg$FAILED){s4=null;}if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===125){s5=peg$c1253;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1254);}}if(s5!==peg$FAILED){peg$savedPos=s0;s1=peg$c1255(s3);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseStateDeclaration(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,5)===peg$c1369){s2=peg$c1369;peg$currPos+=5;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1370);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3!==peg$FAILED){s4=peg$currPos;s5=peg$parseGroupRef();if(s5!==peg$FAILED){peg$savedPos=s4;s5=peg$c1570(s5);}s4=s5;if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s6=peg$c1235;peg$currPos++;}else {s6=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){s8=peg$parseStateDeclarationDesc();if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s10=peg$c1237;peg$currPos++;}else {s10=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s10!==peg$FAILED){s11=peg$parseWS();if(s11===peg$FAILED){s11=null;}if(s11!==peg$FAILED){peg$savedPos=s0;s1=peg$c1571(s4,s8);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,5)===peg$c1369){s2=peg$c1369;peg$currPos+=5;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1370);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3!==peg$FAILED){s4=peg$currPos;s5=peg$parseLabel();if(s5!==peg$FAILED){peg$savedPos=s4;s5=peg$c1570(s5);}s4=s5;if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s6=peg$c1235;peg$currPos++;}else {s6=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){s8=peg$parseStateDeclarationDesc();if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s10=peg$c1237;peg$currPos++;}else {s10=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s10!==peg$FAILED){s11=peg$parseWS();if(s11===peg$FAILED){s11=null;}if(s11!==peg$FAILED){peg$savedPos=s0;s1=peg$c1571(s4,s8);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}return s0}function peg$parseNamedList(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.charCodeAt(peg$currPos)===38){s2=peg$c1326;peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1327);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){s4=peg$parseLabel();if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s6=peg$c1235;peg$currPos++;}else {s6=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){s8=peg$parseGroupMemberList();if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s10=peg$c1237;peg$currPos++;}else {s10=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s10!==peg$FAILED){s11=peg$parseWS();if(s11===peg$FAILED){s11=null;}if(s11!==peg$FAILED){peg$savedPos=s0;s1=peg$c1572(s4,s8);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.charCodeAt(peg$currPos)===38){s2=peg$c1326;peg$currPos++;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1327);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){s4=peg$parseLabel();if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s6=peg$c1235;peg$currPos++;}else {s6=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){s8=peg$parseGroupAliasMember();if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s10=peg$c1237;peg$currPos++;}else {s10=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s10!==peg$FAILED){s11=peg$parseWS();if(s11===peg$FAILED){s11=null;}if(s11!==peg$FAILED){peg$savedPos=s0;s1=peg$c1573(s4,s8);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}return s0}function peg$parseGroupAliasMember(){var s0,s1;s0=peg$currPos;s1=peg$parseLabel();if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1574(s1);}s0=s1;return s0}function peg$parseHookEvent(){var s0;peg$silentFails++;if(input.substr(peg$currPos,5)===peg$c1576){s0=peg$c1576;peg$currPos+=5;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1577);}}if(s0===peg$FAILED){if(input.substr(peg$currPos,4)===peg$c1578){s0=peg$c1578;peg$currPos+=4;}else {s0=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1579);}}}peg$silentFails--;if(s0===peg$FAILED){if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1575);}}return s0}function peg$parseHookDeclaration(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11,s12,s13;peg$silentFails++;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,2)===peg$c1581){s2=peg$c1581;peg$currPos+=2;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1582);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3!==peg$FAILED){s4=peg$parseHookEvent();if(s4!==peg$FAILED){s5=peg$parseWS();if(s5!==peg$FAILED){s6=peg$parseGroupRef();if(s6===peg$FAILED){s6=peg$parseHookStateSubject();}if(s6!==peg$FAILED){s7=peg$parseWS();if(s7!==peg$FAILED){if(input.substr(peg$currPos,2)===peg$c1583){s8=peg$c1583;peg$currPos+=2;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1584);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9!==peg$FAILED){s10=peg$parseActionLabel();if(s10!==peg$FAILED){s11=peg$parseWS();if(s11===peg$FAILED){s11=null;}if(s11!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s12=peg$c1237;peg$currPos++;}else {s12=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s12!==peg$FAILED){s13=peg$parseWS();if(s13===peg$FAILED){s13=null;}if(s13!==peg$FAILED){peg$savedPos=s0;s1=peg$c1585(s4,s6,s10);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1580);}}return s0}function peg$parseHookStateSubject(){var s0,s1;s0=peg$currPos;s1=peg$parseLabel();if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1586(s1);}s0=s1;return s0}function peg$parseMachineProperty(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11,s12,s13;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,8)===peg$c1564){s2=peg$c1564;peg$currPos+=8;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1565);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3!==peg$FAILED){s4=peg$parseLabel();if(s4!==peg$FAILED){s5=peg$parseWS();if(s5!==peg$FAILED){if(input.substr(peg$currPos,7)===peg$c1){s6=peg$c1;peg$currPos+=7;}else {s6=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c2);}}if(s6!==peg$FAILED){s7=peg$parseWS();if(s7!==peg$FAILED){s8=peg$parsePropertyVal();if(s8!==peg$FAILED){s9=peg$parseWS();if(s9!==peg$FAILED){if(input.substr(peg$currPos,8)===peg$c1567){s10=peg$c1567;peg$currPos+=8;}else {s10=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1568);}}if(s10!==peg$FAILED){s11=peg$parseWS();if(s11===peg$FAILED){s11=null;}if(s11!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s12=peg$c1237;peg$currPos++;}else {s12=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s12!==peg$FAILED){s13=peg$parseWS();if(s13===peg$FAILED){s13=null;}if(s13!==peg$FAILED){peg$savedPos=s0;s1=peg$c1587(s4,s8);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,8)===peg$c1564){s2=peg$c1564;peg$currPos+=8;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1565);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3!==peg$FAILED){s4=peg$parseLabel();if(s4!==peg$FAILED){s5=peg$parseWS();if(s5!==peg$FAILED){if(input.substr(peg$currPos,8)===peg$c1567){s6=peg$c1567;peg$currPos+=8;}else {s6=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1568);}}if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s8=peg$c1237;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){peg$savedPos=s0;s1=peg$c1588(s4);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,8)===peg$c1564){s2=peg$c1564;peg$currPos+=8;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1565);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3!==peg$FAILED){s4=peg$parseLabel();if(s4!==peg$FAILED){s5=peg$parseWS();if(s5!==peg$FAILED){if(input.substr(peg$currPos,7)===peg$c1){s6=peg$c1;peg$currPos+=7;}else {s6=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c2);}}if(s6!==peg$FAILED){s7=peg$parseWS();if(s7!==peg$FAILED){s8=peg$parsePropertyVal();if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s10=peg$c1237;peg$currPos++;}else {s10=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s10!==peg$FAILED){s11=peg$parseWS();if(s11===peg$FAILED){s11=null;}if(s11!==peg$FAILED){peg$savedPos=s0;s1=peg$c1589(s4,s8);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,8)===peg$c1564){s2=peg$c1564;peg$currPos+=8;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1565);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3!==peg$FAILED){s4=peg$parseLabel();if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s6=peg$c1237;peg$currPos++;}else {s6=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){peg$savedPos=s0;s1=peg$c1590(s4);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}}}return s0}function peg$parseMachineVal(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11,s12,s13,s14,s15,s16,s17;s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,3)===peg$c1591){s2=peg$c1591;peg$currPos+=3;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1592);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3!==peg$FAILED){s4=peg$parseLabel();if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s6=peg$c1235;peg$currPos++;}else {s6=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){s8=peg$parseValType();if(s8!==peg$FAILED){s9=peg$parseWS();if(s9!==peg$FAILED){if(input.substr(peg$currPos,7)===peg$c1){s10=peg$c1;peg$currPos+=7;}else {s10=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c2);}}if(s10!==peg$FAILED){s11=peg$parseWS();if(s11!==peg$FAILED){s12=peg$parseValVal();if(s12!==peg$FAILED){s13=peg$parseWS();if(s13!==peg$FAILED){if(input.substr(peg$currPos,8)===peg$c1567){s14=peg$c1567;peg$currPos+=8;}else {s14=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1568);}}if(s14!==peg$FAILED){s15=peg$parseWS();if(s15===peg$FAILED){s15=null;}if(s15!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s16=peg$c1237;peg$currPos++;}else {s16=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s16!==peg$FAILED){s17=peg$parseWS();if(s17===peg$FAILED){s17=null;}if(s17!==peg$FAILED){peg$savedPos=s0;s1=peg$c1593(s4,s8,s12);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,3)===peg$c1591){s2=peg$c1591;peg$currPos+=3;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1592);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3!==peg$FAILED){s4=peg$parseLabel();if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s6=peg$c1235;peg$currPos++;}else {s6=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){s8=peg$parseValType();if(s8!==peg$FAILED){s9=peg$parseWS();if(s9!==peg$FAILED){if(input.substr(peg$currPos,8)===peg$c1567){s10=peg$c1567;peg$currPos+=8;}else {s10=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1568);}}if(s10!==peg$FAILED){s11=peg$parseWS();if(s11===peg$FAILED){s11=null;}if(s11!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s12=peg$c1237;peg$currPos++;}else {s12=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s12!==peg$FAILED){s13=peg$parseWS();if(s13===peg$FAILED){s13=null;}if(s13!==peg$FAILED){peg$savedPos=s0;s1=peg$c1594(s4,s8);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,3)===peg$c1591){s2=peg$c1591;peg$currPos+=3;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1592);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3!==peg$FAILED){s4=peg$parseLabel();if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s6=peg$c1235;peg$currPos++;}else {s6=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){s8=peg$parseValType();if(s8!==peg$FAILED){s9=peg$parseWS();if(s9!==peg$FAILED){if(input.substr(peg$currPos,7)===peg$c1){s10=peg$c1;peg$currPos+=7;}else {s10=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c2);}}if(s10!==peg$FAILED){s11=peg$parseWS();if(s11!==peg$FAILED){s12=peg$parseValVal();if(s12!==peg$FAILED){s13=peg$parseWS();if(s13===peg$FAILED){s13=null;}if(s13!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s14=peg$c1237;peg$currPos++;}else {s14=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s14!==peg$FAILED){s15=peg$parseWS();if(s15===peg$FAILED){s15=null;}if(s15!==peg$FAILED){peg$savedPos=s0;s1=peg$c1595(s4,s8,s12);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$currPos;s1=peg$parseWS();if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){if(input.substr(peg$currPos,3)===peg$c1591){s2=peg$c1591;peg$currPos+=3;}else {s2=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1592);}}if(s2!==peg$FAILED){s3=peg$parseWS();if(s3!==peg$FAILED){s4=peg$parseLabel();if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){if(input.charCodeAt(peg$currPos)===58){s6=peg$c1235;peg$currPos++;}else {s6=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1236);}}if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){s8=peg$parseValType();if(s8!==peg$FAILED){s9=peg$parseWS();if(s9===peg$FAILED){s9=null;}if(s9!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s10=peg$c1237;peg$currPos++;}else {s10=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s10!==peg$FAILED){s11=peg$parseWS();if(s11===peg$FAILED){s11=null;}if(s11!==peg$FAILED){peg$savedPos=s0;s1=peg$c1596(s4,s8);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}}}return s0}function peg$parseValType(){var s0;s0=peg$parseValTypeInt();if(s0===peg$FAILED){s0=peg$parseValTypeBoolean();if(s0===peg$FAILED){s0=peg$parseValTypeString();if(s0===peg$FAILED){s0=peg$parseValTypeEnum();}}}return s0}function peg$parseValTypeBoolean(){var s0,s1;s0=peg$currPos;if(input.substr(peg$currPos,7)===peg$c1597){s1=peg$c1597;peg$currPos+=7;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1598);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1599();}s0=s1;return s0}function peg$parseValTypeString(){var s0,s1;s0=peg$currPos;if(input.substr(peg$currPos,6)===peg$c1600){s1=peg$c1600;peg$currPos+=6;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1601);}}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1602();}s0=s1;return s0}function peg$parseValTypeInt(){var s0,s1,s2;s0=peg$currPos;if(input.substr(peg$currPos,3)===peg$c1603){s1=peg$c1603;peg$currPos+=3;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1604);}}if(s1!==peg$FAILED){s2=peg$parseValIntRange();if(s2===peg$FAILED){s2=null;}if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c1605(s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseValIntRange(){var s0,s1,s2,s3,s4,s5,s6;s0=peg$currPos;s1=peg$parseWS();if(s1!==peg$FAILED){s2=peg$parseValSignedInt();if(s2!==peg$FAILED){s3=peg$parseWS();if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){if(input.substr(peg$currPos,2)===peg$c1606){s4=peg$c1606;peg$currPos+=2;}else {s4=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1607);}}if(s4!==peg$FAILED){s5=peg$parseWS();if(s5===peg$FAILED){s5=null;}if(s5!==peg$FAILED){s6=peg$parseValSignedInt();if(s6!==peg$FAILED){peg$savedPos=s0;s1=peg$c1608(s2,s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseValSignedInt(){var s0,s1,s2,s3,s4,s5;s0=peg$currPos;s1=peg$currPos;s2=peg$currPos;if(input.charCodeAt(peg$currPos)===45){s3=peg$c1344;peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1345);}}if(s3===peg$FAILED){s3=null;}if(s3!==peg$FAILED){s4=[];if(peg$c338.test(input.charAt(peg$currPos))){s5=input.charAt(peg$currPos);peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c339);}}if(s5!==peg$FAILED){while(s5!==peg$FAILED){s4.push(s5);if(peg$c338.test(input.charAt(peg$currPos))){s5=input.charAt(peg$currPos);peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c339);}}}}else {s4=peg$FAILED;}if(s4!==peg$FAILED){s3=[s3,s4];s2=s3;}else {peg$currPos=s2;s2=peg$FAILED;}}else {peg$currPos=s2;s2=peg$FAILED;}if(s2!==peg$FAILED){s1=input.substring(s1,peg$currPos);}else {s1=s2;}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1609(s1);}s0=s1;return s0}function peg$parseValTypeEnum(){var s0,s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11;s0=peg$currPos;if(input.substr(peg$currPos,4)===peg$c1610){s1=peg$c1610;peg$currPos+=4;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1611);}}if(s1!==peg$FAILED){s2=peg$parseWS();if(s2===peg$FAILED){s2=null;}if(s2!==peg$FAILED){if(input.charCodeAt(peg$currPos)===40){s3=peg$c1612;peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1613);}}if(s3!==peg$FAILED){s4=peg$parseWS();if(s4===peg$FAILED){s4=null;}if(s4!==peg$FAILED){s5=peg$parseValEnumMember();if(s5!==peg$FAILED){s6=[];s7=peg$currPos;s8=peg$parseWS();if(s8===peg$FAILED){s8=null;}if(s8!==peg$FAILED){if(input.charCodeAt(peg$currPos)===44){s9=peg$c1614;peg$currPos++;}else {s9=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1615);}}if(s9!==peg$FAILED){s10=peg$parseWS();if(s10===peg$FAILED){s10=null;}if(s10!==peg$FAILED){s11=peg$parseValEnumMember();if(s11!==peg$FAILED){peg$savedPos=s7;s8=peg$c1616(s5,s11);s7=s8;}else {peg$currPos=s7;s7=peg$FAILED;}}else {peg$currPos=s7;s7=peg$FAILED;}}else {peg$currPos=s7;s7=peg$FAILED;}}else {peg$currPos=s7;s7=peg$FAILED;}while(s7!==peg$FAILED){s6.push(s7);s7=peg$currPos;s8=peg$parseWS();if(s8===peg$FAILED){s8=null;}if(s8!==peg$FAILED){if(input.charCodeAt(peg$currPos)===44){s9=peg$c1614;peg$currPos++;}else {s9=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1615);}}if(s9!==peg$FAILED){s10=peg$parseWS();if(s10===peg$FAILED){s10=null;}if(s10!==peg$FAILED){s11=peg$parseValEnumMember();if(s11!==peg$FAILED){peg$savedPos=s7;s8=peg$c1616(s5,s11);s7=s8;}else {peg$currPos=s7;s7=peg$FAILED;}}else {peg$currPos=s7;s7=peg$FAILED;}}else {peg$currPos=s7;s7=peg$FAILED;}}else {peg$currPos=s7;s7=peg$FAILED;}}if(s6!==peg$FAILED){s7=peg$parseWS();if(s7===peg$FAILED){s7=null;}if(s7!==peg$FAILED){if(input.charCodeAt(peg$currPos)===41){s8=peg$c1617;peg$currPos++;}else {s8=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1618);}}if(s8!==peg$FAILED){peg$savedPos=s0;s1=peg$c1619(s5,s6);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseValEnumMember(){var s0,s1,s2,s3;s0=peg$currPos;s1=peg$currPos;s2=[];if(peg$c1620.test(input.charAt(peg$currPos))){s3=input.charAt(peg$currPos);peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1621);}}if(s3!==peg$FAILED){while(s3!==peg$FAILED){s2.push(s3);if(peg$c1620.test(input.charAt(peg$currPos))){s3=input.charAt(peg$currPos);peg$currPos++;}else {s3=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1621);}}}}else {s2=peg$FAILED;}if(s2!==peg$FAILED){s1=input.substring(s1,peg$currPos);}else {s1=s2;}if(s1!==peg$FAILED){peg$savedPos=s0;s1=peg$c1622(s1);}s0=s1;return s0}function peg$parseValVal(){var s0,s1,s2;s0=peg$parseString();if(s0===peg$FAILED){s0=peg$parseBoolean();if(s0===peg$FAILED){s0=peg$currPos;if(input.charCodeAt(peg$currPos)===45){s1=peg$c1344;peg$currPos++;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1345);}}if(s1===peg$FAILED){s1=null;}if(s1!==peg$FAILED){s2=peg$parseJsNumericLiteral();if(s2!==peg$FAILED){peg$savedPos=s0;s1=peg$c1623(s1,s2);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}if(s0===peg$FAILED){s0=peg$parseAtom();}}}return s0}function peg$parseRegularArrangeDeclaration(){var s0,s1,s2,s3,s4,s5,s6;s0=peg$currPos;if(input.substr(peg$currPos,7)===peg$c1624){s1=peg$c1624;peg$currPos+=7;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1625);}}if(s1!==peg$FAILED){s2=peg$parseWS();if(s2===peg$FAILED){s2=null;}if(s2!==peg$FAILED){s3=peg$parseLabelOrLabelList();if(s3!==peg$FAILED){s4=peg$parseWS();if(s4===peg$FAILED){s4=null;}if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s5=peg$c1237;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s5!==peg$FAILED){s6=peg$parseWS();if(s6===peg$FAILED){s6=null;}if(s6!==peg$FAILED){peg$savedPos=s0;s1=peg$c1626(s3);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseArrangeStartDeclaration(){var s0,s1,s2,s3,s4,s5,s6;s0=peg$currPos;if(input.substr(peg$currPos,13)===peg$c1627){s1=peg$c1627;peg$currPos+=13;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1628);}}if(s1!==peg$FAILED){s2=peg$parseWS();if(s2===peg$FAILED){s2=null;}if(s2!==peg$FAILED){s3=peg$parseLabelOrLabelList();if(s3!==peg$FAILED){s4=peg$parseWS();if(s4===peg$FAILED){s4=null;}if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s5=peg$c1237;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s5!==peg$FAILED){s6=peg$parseWS();if(s6===peg$FAILED){s6=null;}if(s6!==peg$FAILED){peg$savedPos=s0;s1=peg$c1629(s3);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseArrangeEndDeclaration(){var s0,s1,s2,s3,s4,s5,s6;s0=peg$currPos;if(input.substr(peg$currPos,11)===peg$c1630){s1=peg$c1630;peg$currPos+=11;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1631);}}if(s1!==peg$FAILED){s2=peg$parseWS();if(s2===peg$FAILED){s2=null;}if(s2!==peg$FAILED){s3=peg$parseLabelOrLabelList();if(s3!==peg$FAILED){s4=peg$parseWS();if(s4===peg$FAILED){s4=null;}if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s5=peg$c1237;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s5!==peg$FAILED){s6=peg$parseWS();if(s6===peg$FAILED){s6=null;}if(s6!==peg$FAILED){peg$savedPos=s0;s1=peg$c1632(s3);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}return s0}function peg$parseOArrangeDeclaration(){var s0,s1,s2,s3,s4,s5,s6;peg$silentFails++;s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c1634){s1=peg$c1634;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1635);}}if(s1!==peg$FAILED){s2=peg$parseWS();if(s2===peg$FAILED){s2=null;}if(s2!==peg$FAILED){s3=peg$parseLabelOrLabelList();if(s3!==peg$FAILED){s4=peg$parseWS();if(s4===peg$FAILED){s4=null;}if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s5=peg$c1237;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s5!==peg$FAILED){s6=peg$parseWS();if(s6===peg$FAILED){s6=null;}if(s6!==peg$FAILED){peg$savedPos=s0;s1=peg$c1636(s3);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1633);}}return s0}function peg$parseFArrangeDeclaration(){var s0,s1,s2,s3,s4,s5,s6;peg$silentFails++;s0=peg$currPos;if(input.substr(peg$currPos,8)===peg$c1638){s1=peg$c1638;peg$currPos+=8;}else {s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1639);}}if(s1!==peg$FAILED){s2=peg$parseWS();if(s2===peg$FAILED){s2=null;}if(s2!==peg$FAILED){s3=peg$parseLabelOrLabelList();if(s3!==peg$FAILED){s4=peg$parseWS();if(s4===peg$FAILED){s4=null;}if(s4!==peg$FAILED){if(input.charCodeAt(peg$currPos)===59){s5=peg$c1237;peg$currPos++;}else {s5=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1238);}}if(s5!==peg$FAILED){s6=peg$parseWS();if(s6===peg$FAILED){s6=null;}if(s6!==peg$FAILED){peg$savedPos=s0;s1=peg$c1640(s3);s0=s1;}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}}else {peg$currPos=s0;s0=peg$FAILED;}peg$silentFails--;if(s0===peg$FAILED){s1=peg$FAILED;if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1637);}}return s0}function peg$parseArrangeDeclaration(){var s0;peg$silentFails++;s0=peg$parseArrangeStartDeclaration();if(s0===peg$FAILED){s0=peg$parseArrangeEndDeclaration();if(s0===peg$FAILED){s0=peg$parseOArrangeDeclaration();if(s0===peg$FAILED){s0=peg$parseFArrangeDeclaration();if(s0===peg$FAILED){s0=peg$parseRegularArrangeDeclaration();}}}}peg$silentFails--;if(s0===peg$FAILED){if(peg$silentFails===0&&peg$currPos>=peg$maxFailPos){peg$fail(peg$c1641);}}return s0}function peg$parseTerm(){var s0;s0=peg$parseHookDeclaration();if(s0===peg$FAILED){s0=peg$parseExp();if(s0===peg$FAILED){s0=peg$parseStateDeclaration();if(s0===peg$FAILED){s0=peg$parseArrangeDeclaration();if(s0===peg$FAILED){s0=peg$parseNamedList();if(s0===peg$FAILED){s0=peg$parseMachineAttribute();if(s0===peg$FAILED){s0=peg$parseMachineProperty();if(s0===peg$FAILED){s0=peg$parseMachineVal();if(s0===peg$FAILED){s0=peg$parseConfig();}}}}}}}}return s0}function peg$parseTermList(){var s0,s1;s0=[];s1=peg$parseTerm();while(s1!==peg$FAILED){s0.push(s1);s1=peg$parseTerm();}return s0}peg$result=peg$startRuleFunction();if(peg$result!==peg$FAILED&&peg$currPos===input.length){return peg$result}else {if(peg$result!==peg$FAILED&&peg$currPos<input.length){peg$fail(peg$endExpectation());}throw peg$buildStructuredError(peg$maxFailExpected,peg$maxFailPos<input.length?input.charAt(peg$maxFailPos):null,peg$maxFailPos<input.length?peg$computeLocation(peg$maxFailPos,peg$maxFailPos+1):peg$computeLocation(peg$maxFailPos,peg$maxFailPos))}}

    /*********
     *
     *  Return the direction of an arrow - `right`, `left`, or `both`.
     *
     *  ```typescript
     *  import { arrow_direction } from 'jssm';
     *
     *  arrow_direction('->');    // 'right'
     *  arrow_direction('<~=>');  // 'both'
     *  ```
     *
     *  @param arrow The arrow to be evaluated
     *
     */
    function arrow_direction(arrow) {
        switch (arrow) {
            case '->':
            case '→':
            case '=>':
            case '⇒':
            case '~>':
            case '↛': {
                return 'right';
            }
            case '<-':
            case '←':
            case '<=':
            case '⇐':
            case '<~':
            case '↚': {
                return 'left';
            }
            case '<->':
            case '↔':
            case '<-=>':
            case '←⇒':
            case '←=>':
            case '<-⇒':
            case '<-~>':
            case '←↛':
            case '←~>':
            case '<-↛':
            case '<=>':
            case '⇔':
            case '<=->':
            case '⇐→':
            case '⇐->':
            case '<=→':
            case '<=~>':
            case '⇐↛':
            case '⇐~>':
            case '<=↛':
            case '<~>':
            case '↮':
            case '<~->':
            case '↚→':
            case '↚->':
            case '<~→':
            case '<~=>':
            case '↚⇒':
            case '↚=>':
            case '<~⇒': {
                return 'both';
            }
            default: {
                throw new JssmError(undefined, `arrow_direction: unknown arrow type ${arrow}`);
            }
        }
    }
    /*********
     *
     *  Return the direction of an arrow - `right`, `left`, or `both`.
     *
     *  ```typescript
     *  import { arrow_left_kind } from 'jssm';
     *
     *  arrow_left_kind('<-');    // 'legal'
     *  arrow_left_kind('<=');    // 'main'
     *  arrow_left_kind('<~');    // 'forced'
     *  arrow_left_kind('<->');   // 'legal'
     *  arrow_left_kind('->');    // 'none'
     *  ```
     *
     *  @param arrow The arrow to be evaluated
     *
     */
    function arrow_left_kind(arrow) {
        switch (arrow) {
            case '->':
            case '→':
            case '=>':
            case '⇒':
            case '~>':
            case '↛': {
                return 'none';
            }
            case '<-':
            case '←':
            case '<->':
            case '↔':
            case '<-=>':
            case '←⇒':
            case '←=>':
            case '<-⇒':
            case '<-~>':
            case '←↛':
            case '←~>':
            case '<-↛': {
                return 'legal';
            }
            case '<=':
            case '⇐':
            case '<=>':
            case '⇔':
            case '<=->':
            case '⇐→':
            case '⇐->':
            case '<=→':
            case '<=~>':
            case '⇐↛':
            case '⇐~>':
            case '<=↛': {
                return 'main';
            }
            case '<~':
            case '↚':
            case '<~>':
            case '↮':
            case '<~->':
            case '↚→':
            case '↚->':
            case '<~→':
            case '<~=>':
            case '↚⇒':
            case '↚=>':
            case '<~⇒': {
                return 'forced';
            }
            default: {
                throw new JssmError(undefined, `arrow_direction: unknown arrow type ${arrow}`);
            }
        }
    }
    /*********
     *
     *  Return the direction of an arrow - `right`, `left`, or `both`.
     *
     *  ```typescript
     *  import { arrow_left_kind } from 'jssm';
     *
     *  arrow_left_kind('->');    // 'legal'
     *  arrow_left_kind('=>');    // 'main'
     *  arrow_left_kind('~>');    // 'forced'
     *  arrow_left_kind('<->');   // 'legal'
     *  arrow_left_kind('<-');    // 'none'
     *  ```
     *
     *  @param arrow The arrow to be evaluated
     *
     */
    function arrow_right_kind(arrow) {
        switch (arrow) {
            case '<-':
            case '←':
            case '<=':
            case '⇐':
            case '<~':
            case '↚': {
                return 'none';
            }
            case '->':
            case '→':
            case '<->':
            case '↔':
            case '<=->':
            case '⇐→':
            case '⇐->':
            case '<=→':
            case '<~->':
            case '↚→':
            case '↚->':
            case '<~→': {
                return 'legal';
            }
            case '=>':
            case '⇒':
            case '<=>':
            case '⇔':
            case '<-=>':
            case '←⇒':
            case '←=>':
            case '<-⇒':
            case '<~=>':
            case '↚⇒':
            case '↚=>':
            case '<~⇒': {
                return 'main';
            }
            case '~>':
            case '↛':
            case '<~>':
            case '↮':
            case '<-~>':
            case '←↛':
            case '←~>':
            case '<-↛':
            case '<=~>':
            case '⇐↛':
            case '⇐~>':
            case '<=↛': {
                return 'forced';
            }
            default: {
                throw new JssmError(undefined, `arrow_direction: unknown arrow type ${arrow}`);
            }
        }
    }

    /*******
     *
     *  Wraps a string in an array, or passes through if already non-string.
     *  Used to normalize arguments that accept either a single state name or
     *  an array of state names.
     *
     *  ```typescript
     *  array_box_if_string('hello');    // ['hello']
     *  array_box_if_string(['a','b']); // ['a','b']
     *  ```
     *
     *  @param n - A string to box, or a value to pass through unchanged.
     *
     *  @returns The input wrapped in an array if it was a string, otherwise the
     *           input unchanged.
     *
     */
    const array_box_if_string = n => typeof n === 'string' ? [n] : n;
    /*******
     *
     *  Selects a single item from a weighted array of objects using cumulative
     *  probability.  Each object in the array should have a numeric property
     *  indicating its relative weight (defaults to `'probability'`).  Objects
     *  missing the property are treated as weight 1.
     *
     *  ```typescript
     *  const opts = [
     *    { value: 'common',  probability: 0.8 },
     *    { value: 'rare',    probability: 0.2 }
     *  ];
     *
     *  weighted_rand_select(opts);  // most often { value: 'common', ... }
     *  ```
     *
     *  @param options              - Non-empty array of objects to choose from.
     *  @param probability_property - Name of the numeric weight property on each
     *                                object.  Defaults to `'probability'`.
     *  @param rng                  - Optional random number generator `() => number`
     *                                in `[0, 1)`.  Defaults to `Math.random`.
     *
     *  @returns One element from `options`, chosen by weighted random selection.
     *
     *  @throws {TypeError} If `options` is not a non-empty array of objects.
     *
     */
    // this is explicitly about other peoples' data, so it has to be weakly typed
    const weighted_rand_select = (options, probability_property = 'probability', rng) => {
        if (!Array.isArray(options)) {
            throw new TypeError('options must be a non-empty array of objects');
        }
        if (options.length === 0) {
            throw new TypeError('options must be a non-empty array of objects');
        }
        if (typeof options[0] !== 'object') {
            throw new TypeError('options must be a non-empty array of objects');
        }
        // called once per probabilistic walk step: plain loops, no per-call closure
        // allocations (previously frand, or_one, and a reduce callback each call).
        // undefined weights count as 1, as before.  Every internal caller uses the
        // default 'probability' key, so that case reads the property by name — a
        // monomorphic named-load IC — instead of a dynamic keyed load.
        const named = probability_property === 'probability';
        let prob_sum = 0;
        for (const opt of options) {
            const p = named ? opt.probability : opt[probability_property];
            prob_sum += (p === undefined) ? 1 : p;
        }
        const rnd = (rng ? rng() : Math.random()) * prob_sum;
        let cursor = 0, cursor_sum = 0;
        // advance past each element whose running sum is <= rnd; the element that
        // pushes the sum over rnd is the selection
        while (cursor < options.length) {
            const p = named ? options[cursor].probability : options[cursor][probability_property];
            cursor_sum += (p === undefined) ? 1 : p;
            ++cursor;
            if (cursor_sum > rnd) {
                break;
            }
        }
        return options[cursor - 1];
    };
    /*******
     *
     *  Returns, for a non-negative integer argument `n`, the series `[0 .. n]`.
     *
     *  ```typescript
     *  import { seq } from './jssm.js';
     *
     *  seq(5);  // [0, 1, 2, 3, 4]
     *  seq(0);  // []
     *  ```
     *
     */
    function seq(n) {
        if (!(Number.isSafeInteger(n))) {
            throw new TypeError('seq/1 takes a non-negative integer n as an argument');
        }
        if (n < 0) {
            throw new TypeError('seq/1 takes a non-negative integer n as an argument');
        }
        // single-allocation form; the old new Array(n).fill().map() chain built
        // three arrays per call, and seq runs per probabilistic walk / sample
        return Array.from({ length: n }, (_, i) => i);
    }
    /*******
     *
     *  Comparator reproducing `Array.prototype.sort`'s default ordering (compare
     *  as strings), so histogram key order stays byte-identical to the historic
     *  comparator-free sort — that ordering is observable to every iterating
     *  caller.
     *
     *  ```typescript
     *  [10, 9, 1].sort(default_lexicographic);  // [1, 10, 9], as with plain .sort()
     *  ```
     *
     */
    const default_lexicographic = (a, b) => {
        const sa = String(a), sb = String(b);
        return sa < sb ? -1 : (sa > sb ? 1 : 0);
    };
    /*******
     *
     *  Returns the histograph of an array as a `Map`.  Makes no attempt to cope
     *  with deep equality; will fail for complex contents, as such.
     *
     *  ```typescript
     *  import { histograph } from './jssm.js';
     *
     *  histograph( [0, 0, 1, 1, 2, 2, 1] );  // Map()
     *  ```
     *
     */
    const histograph = (ar) => {
        // one counting pass, then a sort over only the k distinct keys — previously
        // this copied and sorted all n elements (O(n log n) plus a transient array)
        // before counting.  Map insertion order (sorted keys, default lexicographic
        // comparator, exactly as before) is preserved because it is observable to
        // every iterating caller.
        const counts = new Map();
        for (const v of ar) {
            const c = counts.get(v);
            counts.set(v, c === undefined ? 1 : c + 1);
        }
        const out = new Map();
        const sorted_keys = [...counts.keys()].sort(default_lexicographic);
        for (const k of sorted_keys) {
            out.set(k, counts.get(k));
        }
        return out;
    };
    /*******
     *
     *  Draws `n` weighted random samples from an array of objects.  Each draw is
     *  independent (with replacement), delegating to {@link weighted_rand_select}.
     *
     *  ```typescript
     *  const opts = [
     *    { value: 'a', probability: 0.9 },
     *    { value: 'b', probability: 0.1 }
     *  ];
     *
     *  weighted_sample_select(3, opts, 'probability');
     *  // e.g. [ { value: 'a', ... }, { value: 'a', ... }, { value: 'b', ... } ]
     *  ```
     *
     *  @param n                    - Number of samples to draw.
     *  @param options              - Non-empty array of weighted objects.
     *  @param probability_property - Name of the numeric weight property.
     *  @param rng                  - Optional random number generator.
     *
     *  @returns An array of `n` independently selected items.
     *
     */
    const weighted_sample_select = (n, options, probability_property, rng) => // TODO FIXME no any
     seq(n)
        .map((_i) => // TODO FIXME
     weighted_rand_select(options, probability_property, rng));
    /*******
     *
     *  Draws `n` weighted random samples, extracts a named key from each, and
     *  returns a histograph (`Map`) of how often each key value appeared.  Useful
     *  for validating that a probabilistic transition distribution is roughly
     *  correct over many trials.
     *
     *  ```typescript
     *  const opts = [
     *    { to: 'a', probability: 0.7 },
     *    { to: 'b', probability: 0.3 }
     *  ];
     *
     *  weighted_histo_key(1000, opts, 'probability', 'to');
     *  // Map { 'a' => ~700, 'b' => ~300 }
     *  ```
     *
     *  @param n         - Number of samples to draw.
     *  @param opts      - Non-empty array of weighted objects.
     *  @param prob_prop - Name of the numeric weight property.
     *  @param extract   - Name of the property to extract from each sample for
     *                     histogramming.
     *  @param rng       - Optional random number generator.
     *
     *  @returns A `Map` from extracted key values to their occurrence counts.
     *
     */
    const weighted_histo_key = (n, opts, prob_prop, extract, rng) => {
        // draw and count in one loop: previously this built four n-length transient
        // arrays (seq, the sample map, the extract map, and histograph's sort copy).
        // RNG draw order is identical — n sequential weighted_rand_select calls —
        // and the sorted-key Map ordering matches histograph's output exactly.
        const counts = new Map();
        for (let i = 0; i < n; i++) {
            const key = weighted_rand_select(opts, prob_prop, rng)[extract];
            const c = counts.get(key);
            counts.set(key, c === undefined ? 1 : c + 1);
        }
        const out = new Map();
        const sorted_keys = [...counts.keys()].sort(default_lexicographic);
        for (const k of sorted_keys) {
            out.set(k, counts.get(k));
        }
        return out;
    };
    /*******
     *
     *  Internal method generating composite keys for the hook lookup map by
     *  JSON-serializing a `[property, state]` pair.  Not meant for external use.
     *
     *  ```typescript
     *  name_bind_prop_and_state('color', 'Red');  // '["color","Red"]'
     *  ```
     *
     *  @param prop  - The property name (e.g. a data key or hook category).
     *  @param state - The state name to bind to.
     *
     *  @returns A deterministic JSON string key for the `[prop, state]` pair.
     *
     *  @throws {JssmError} If either argument is not a string.
     *
     */
    function name_bind_prop_and_state(prop, state) {
        if (typeof prop !== 'string') {
            throw new JssmError(undefined, `Name of property must be a string; got ${prop}`);
        }
        if (typeof state !== 'string') {
            throw new JssmError(undefined, `Name of state must be a string; got ${state}`);
        }
        return JSON.stringify([prop, state]);
    }
    /*******
     *
     *  Creates a SplitMix32 random generator.  Used by the randomness test suite.
     *
     *  Sourced from `bryc`: https://github.com/bryc/code/blob/master/jshash/PRNGs.md#splitmix32
     *
     *  Replaces the Mulberry generator, which was found to have problems
     *
     */
    function gen_splitmix32(a) {
        if (a === undefined) {
            a = Date.now();
        }
        return function () {
            a = Math.trunc(a);
            // eslint-disable-next-line unicorn/prefer-math-trunc -- | 0 is the PRNG's 32-bit wrap; Math.trunc breaks SplitMix32
            a = a + 2654435769 | 0;
            let t = a ^ a >>> 16;
            t = Math.imul(t, 569420461);
            t ^= t >>> 15;
            t = Math.imul(t, 1935289751);
            return ((t ^ (t >>> 15)) >>> 0) / 4294967296;
        };
    }
    /*******
     *
     *  Reduces an array to its unique contents.  Compares with `===` and makes no
     *  effort to deep-compare contents; two matching arrays or objects contained
     *  will be treated as distinct, according to javascript rules.  This also means
     *  that `NaNs` will be ***dropped***, because they do not self-compare.
     *
     *  ```typescript
     *  unique( [] );                     // []
     *  unique( [0,0] );                  // [0]
     *  unique( [0,1,2, 0,1,2, 0,1,2] );  // [0,1,2]
     *  unique( [ [1], [1] ] );           // [ [1], [1] ] because arrays don't match
     *  unique( [0,NaN,2] );              // [0,2]
     *  ```
     *
     */
    const unique = (arr) => {
        // Set membership makes this O(n); the old indexOf-per-element filter was
        // O(n^2).  NaN is dropped *explicitly* here because Sets self-match NaN
        // (SameValueZero) where the documented indexOf behavior (===) never did.
        const seen = new Set();
        return arr.filter((v) => {
            if (v !== v) {
                return false;
            } // NaN: preserve documented dropping
            if (seen.has(v)) {
                return false;
            }
            seen.add(v);
            return true;
        });
    };
    /*******
     *
     *  Lists all repeated items in an array along with their counts.  Subject to
     *  matching rules of Map.  `NaN` is manually removed because of conflict rules
     *  around {@link unique}.  Because these are compared with `===` and because
     *  arrays and objects never match that way unless they're the same object,
     *  arrays and objects are never considered repeats.
     *
     *  ```typescript
     *  find_repeated<string>([ ]);                     // []
     *  find_repeated<string>([ "one" ]);               // []
     *  find_repeated<string>([ "one", "two" ]);        // []
     *  find_repeated<string>([ "one", "one" ]);        // [ ["one", 2] ]
     *  find_repeated<string>([ "one", "two", "one" ]); // [ ["one", 2] ]
     *  find_repeated<number>([ 0, NaN, 0, NaN ]);      // [ [0,     2] ]
     *  ```
     *
     */
    function find_repeated(arr) {
        const uniqued = unique(arr);
        if (uniqued.length === arr.length) {
            return [];
        }
        const residue_keys = new Map();
        for (const k of arr)
            residue_keys.set(k, residue_keys.has(k)
                ? (residue_keys.get(k) + 1)
                : 1);
        for (const k of uniqued)
            residue_keys.set(k, residue_keys.get(k) - 1);
        return [...residue_keys]
            .filter((e) => ((e[1] > 0) && (!(Number.isNaN(e[0])))))
            .map((e) => [e[0], e[1] + 1]);
    }
    /*******
     *
     *  Returns a `Promise` that resolves after `ms` milliseconds.  Useful for
     *  inserting delays in async test flows or demos.
     *
     *  ```typescript
     *  await sleep(100);  // pauses execution for 100ms
     *  ```
     *
     *  @param ms - Number of milliseconds to wait before resolving.
     *
     *  @returns A `Promise<void>` that resolves after the timeout.
     *
     */
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    var reductions = {
      "abkhazian" : "ab",
      "аҧсуа бызшәа, аҧсшәа" : "ab",
      "ab" : "ab",
      "abk" : "ab",
      "аҧсуа бызшәа" : "ab",
      "аҧсшәа" : "ab",
      "afar" : "aa",
      "afaraf" : "aa",
      "aa" : "aa",
      "aar" : "aa",
      "afrikaans" : "af",
      "af" : "af",
      "afr" : "af",
      "akan" : "ak",
      "ak" : "ak",
      "aka" : "ak",
      "aka + 2" : "ak",
      "albanian" : "sq",
      "shqip" : "sq",
      "sq" : "sq",
      "sqi" : "sq",
      "alb" : "sq",
      "sqi + 4" : "sq",
      "amharic" : "am",
      "አማርኛ" : "am",
      "am" : "am",
      "amh" : "am",
      "arabic" : "ar",
      "العربية" : "ar",
      "ar" : "ar",
      "ara" : "ar",
      "ara + 30" : "ar",
      "aragonese" : "an",
      "aragonés" : "an",
      "an" : "an",
      "arg" : "an",
      "armenian" : "hy",
      "հայերեն" : "hy",
      "hy" : "hy",
      "hye" : "hy",
      "arm" : "hy",
      "assamese" : "as",
      "অসমীয়া" : "as",
      "as" : "as",
      "asm" : "as",
      "avaric" : "av",
      "авар мацӏ, магӏарул мацӏ" : "av",
      "av" : "av",
      "ava" : "av",
      "авар мацӏ" : "av",
      "магӏарул мацӏ" : "av",
      "avestan" : "ae",
      "avesta" : "ae",
      "ae" : "ae",
      "ave" : "ae",
      "aymara" : "ay",
      "aymar aru" : "ay",
      "ay" : "ay",
      "aym" : "ay",
      "aym + 2" : "ay",
      "azerbaijani" : "az",
      "azərbaycan dili" : "az",
      "az" : "az",
      "aze" : "az",
      "aze + 2" : "az",
      "bambara" : "bm",
      "bamanankan" : "bm",
      "bm" : "bm",
      "bam" : "bm",
      "bashkir" : "ba",
      "башҡорт теле" : "ba",
      "ba" : "ba",
      "bak" : "ba",
      "basque" : "eu",
      "euskara, euskera" : "eu",
      "eu" : "eu",
      "eus" : "eu",
      "baq" : "eu",
      "euskara" : "eu",
      "euskera" : "eu",
      "belarusian" : "be",
      "беларуская мова" : "be",
      "be" : "be",
      "bel" : "be",
      "bengali" : "bn",
      "বাংলা" : "bn",
      "bn" : "bn",
      "ben" : "bn",
      "bihari languages" : "bh",
      "भोजपुरी" : "bh",
      "bh" : "bh",
      "bih" : "bh",
      "bislama" : "bi",
      "bi" : "bi",
      "bis" : "bi",
      "bosnian" : "bs",
      "bosanski jezik" : "bs",
      "bs" : "bs",
      "bos" : "bs",
      "breton" : "br",
      "brezhoneg" : "br",
      "br" : "br",
      "bre" : "br",
      "bulgarian" : "bg",
      "български език" : "bg",
      "bg" : "bg",
      "bul" : "bg",
      "burmese" : "my",
      "ဗမာစာ" : "my",
      "my" : "my",
      "mya" : "my",
      "bur" : "my",
      "catalan, valencian" : "ca",
      "català, valencià" : "ca",
      "ca" : "ca",
      "cat" : "ca",
      "català" : "ca",
      "valencià" : "ca",
      "chamorro" : "ch",
      "chamoru" : "ch",
      "ch" : "ch",
      "cha" : "ch",
      "chechen" : "ce",
      "нохчийн мотт" : "ce",
      "ce" : "ce",
      "che" : "ce",
      "chichewa, chewa, nyanja" : "ny",
      "chicheŵa, chinyanja" : "ny",
      "ny" : "ny",
      "nya" : "ny",
      "chicheŵa" : "ny",
      "chinyanja" : "ny",
      "chinese" : "zh",
      "中文 (zhōngwén), 汉语, 漢語" : "zh",
      "zh" : "zh",
      "zho" : "zh",
      "chi" : "zh",
      "zho + 13" : "zh",
      "中文 (zhōngwén)" : "zh",
      "汉语" : "zh",
      "漢語" : "zh",
      "chuvash" : "cv",
      "чӑваш чӗлхи" : "cv",
      "cv" : "cv",
      "chv" : "cv",
      "cornish" : "kw",
      "kernewek" : "kw",
      "kw" : "kw",
      "cor" : "kw",
      "corsican" : "co",
      "corsu, lingua corsa" : "co",
      "co" : "co",
      "cos" : "co",
      "corsu" : "co",
      "lingua corsa" : "co",
      "cree" : "cr",
      "ᓀᐦᐃᔭᐍᐏᐣ" : "cr",
      "cr" : "cr",
      "cre" : "cr",
      "cre + 6" : "cr",
      "croatian" : "hr",
      "hrvatski jezik" : "hr",
      "hr" : "hr",
      "hrv" : "hr",
      "czech" : "cs",
      "čeština, český jazyk" : "cs",
      "cs" : "cs",
      "ces" : "cs",
      "cze" : "cs",
      "čeština" : "cs",
      "český jazyk" : "cs",
      "danish" : "da",
      "dansk" : "da",
      "da" : "da",
      "dan" : "da",
      "divehi, dhivehi, maldivian" : "dv",
      "ދިވެހި" : "dv",
      "dv" : "dv",
      "div" : "dv",
      "dutch, flemish" : "nl",
      "nederlands, vlaams" : "nl",
      "nl" : "nl",
      "nld" : "nl",
      "dut" : "nl",
      "nederlands" : "nl",
      "vlaams" : "nl",
      "dzongkha" : "dz",
      "རྫོང་ཁ" : "dz",
      "dz" : "dz",
      "dzo" : "dz",
      "english" : "en",
      "en" : "en",
      "eng" : "en",
      "esperanto" : "eo",
      "eo" : "eo",
      "epo" : "eo",
      "estonian" : "et",
      "eesti, eesti keel" : "et",
      "et" : "et",
      "est" : "et",
      "est + 2" : "et",
      "eesti" : "et",
      "eesti keel" : "et",
      "ewe" : "ee",
      "eʋegbe" : "ee",
      "ee" : "ee",
      "faroese" : "fo",
      "føroyskt" : "fo",
      "fo" : "fo",
      "fao" : "fo",
      "fijian" : "fj",
      "vosa vakaviti" : "fj",
      "fj" : "fj",
      "fij" : "fj",
      "finnish" : "fi",
      "suomi, suomen kieli" : "fi",
      "fi" : "fi",
      "fin" : "fi",
      "suomi" : "fi",
      "suomen kieli" : "fi",
      "french" : "fr",
      "français, langue française" : "fr",
      "fr" : "fr",
      "fra" : "fr",
      "fre" : "fr",
      "français" : "fr",
      "langue française" : "fr",
      "fulah" : "ff",
      "fulfulde, pulaar, pular" : "ff",
      "ff" : "ff",
      "ful" : "ff",
      "ful + 9" : "ff",
      "fulfulde" : "ff",
      "pulaar" : "ff",
      "pular" : "ff",
      "galician" : "gl",
      "galego" : "gl",
      "gl" : "gl",
      "glg" : "gl",
      "georgian" : "ka",
      "ქართული" : "ka",
      "ka" : "ka",
      "kat" : "ka",
      "geo" : "ka",
      "german" : "de",
      "deutsch" : "de",
      "de" : "de",
      "deu" : "de",
      "ger" : "de",
      "greek (modern)" : "el",
      "ελληνικά" : "el",
      "el" : "el",
      "ell" : "el",
      "gre" : "el",
      "guaraní" : "gn",
      "avañe'ẽ" : "gn",
      "gn" : "gn",
      "grn" : "gn",
      "grn + 5" : "gn",
      "gujarati" : "gu",
      "ગુજરાતી" : "gu",
      "gu" : "gu",
      "guj" : "gu",
      "haitian, haitian creole" : "ht",
      "kreyòl ayisyen" : "ht",
      "ht" : "ht",
      "hat" : "ht",
      "hausa" : "ha",
      "(hausa) هَوُسَ" : "ha",
      "ha" : "ha",
      "hau" : "ha",
      "hebrew (modern)" : "he",
      "עברית" : "he",
      "he" : "he",
      "heb" : "he",
      "herero" : "hz",
      "otjiherero" : "hz",
      "hz" : "hz",
      "her" : "hz",
      "hindi" : "hi",
      "हिन्दी, हिंदी" : "hi",
      "hi" : "hi",
      "hin" : "hi",
      "हिन्दी" : "hi",
      "हिंदी" : "hi",
      "hiri motu" : "ho",
      "ho" : "ho",
      "hmo" : "ho",
      "hungarian" : "hu",
      "magyar" : "hu",
      "hu" : "hu",
      "hun" : "hu",
      "interlingua" : "ia",
      "ia" : "ia",
      "ina" : "ia",
      "indonesian" : "id",
      "bahasa indonesia" : "id",
      "id" : "id",
      "ind" : "id",
      "interlingue" : "ie",
      "originally called occidental; then interlingue after wwii" : "ie",
      "ie" : "ie",
      "ile" : "ie",
      "irish" : "ga",
      "gaeilge" : "ga",
      "ga" : "ga",
      "gle" : "ga",
      "igbo" : "ig",
      "asụsụ igbo" : "ig",
      "ig" : "ig",
      "ibo" : "ig",
      "inupiaq" : "ik",
      "iñupiaq, iñupiatun" : "ik",
      "ik" : "ik",
      "ipk" : "ik",
      "ipk + 2" : "ik",
      "iñupiaq" : "ik",
      "iñupiatun" : "ik",
      "ido" : "io",
      "io" : "io",
      "icelandic" : "is",
      "íslenska" : "is",
      "is" : "is",
      "isl" : "is",
      "ice" : "is",
      "italian" : "it",
      "italiano" : "it",
      "it" : "it",
      "ita" : "it",
      "inuktitut" : "iu",
      "ᐃᓄᒃᑎᑐᑦ" : "iu",
      "iu" : "iu",
      "iku" : "iu",
      "iku + 2" : "iu",
      "japanese" : "ja",
      "日本語 (にほんご)" : "ja",
      "ja" : "ja",
      "jpn" : "ja",
      "javanese" : "jv",
      "ꦧꦱꦗꦮ, basa jawa" : "jv",
      "jv" : "jv",
      "jav" : "jv",
      "ꦧꦱꦗꦮ" : "jv",
      "basa jawa" : "jv",
      "kalaallisut, greenlandic" : "kl",
      "kalaallisut, kalaallit oqaasii" : "kl",
      "kl" : "kl",
      "kal" : "kl",
      "kalaallisut" : "kl",
      "kalaallit oqaasii" : "kl",
      "kannada" : "kn",
      "ಕನ್ನಡ" : "kn",
      "kn" : "kn",
      "kan" : "kn",
      "kanuri" : "kr",
      "kr" : "kr",
      "kau" : "kr",
      "kau + 3" : "kr",
      "kashmiri" : "ks",
      "कश्मीरी, كشميري‎" : "ks",
      "ks" : "ks",
      "kas" : "ks",
      "कश्मीरी" : "ks",
      "كشميري‎" : "ks",
      "kazakh" : "kk",
      "қазақ тілі" : "kk",
      "kk" : "kk",
      "kaz" : "kk",
      "central khmer" : "km",
      "ខ្មែរ, ខេមរភាសា, ភាសាខ្មែរ" : "km",
      "km" : "km",
      "khm" : "km",
      "ខ្មែរ" : "km",
      "ខេមរភាសា" : "km",
      "ភាសាខ្មែរ" : "km",
      "kikuyu, gikuyu" : "ki",
      "gĩkũyũ" : "ki",
      "ki" : "ki",
      "kik" : "ki",
      "kinyarwanda" : "rw",
      "ikinyarwanda" : "rw",
      "rw" : "rw",
      "kin" : "rw",
      "kirghiz, kyrgyz" : "ky",
      "кыргызча, кыргыз тили" : "ky",
      "ky" : "ky",
      "kir" : "ky",
      "кыргызча" : "ky",
      "кыргыз тили" : "ky",
      "komi" : "kv",
      "коми кыв" : "kv",
      "kv" : "kv",
      "kom" : "kv",
      "kom + 2" : "kv",
      "kongo" : "kg",
      "kikongo" : "kg",
      "kg" : "kg",
      "kon" : "kg",
      "kon + 3" : "kg",
      "korean" : "ko",
      "한국어" : "ko",
      "ko" : "ko",
      "kor" : "ko",
      "kurdish" : "ku",
      "kurdî, كوردی‎" : "ku",
      "ku" : "ku",
      "kur" : "ku",
      "kur + 3" : "ku",
      "kurdî" : "ku",
      "كوردی‎" : "ku",
      "kuanyama, kwanyama" : "kj",
      "kuanyama" : "kj",
      "kj" : "kj",
      "kua" : "kj",
      "latin" : "la",
      "latine, lingua latina" : "la",
      "la" : "la",
      "lat" : "la",
      "latine" : "la",
      "lingua latina" : "la",
      "luxembourgish, letzeburgesch" : "lb",
      "lëtzebuergesch" : "lb",
      "lb" : "lb",
      "ltz" : "lb",
      "ganda" : "lg",
      "luganda" : "lg",
      "lg" : "lg",
      "lug" : "lg",
      "limburgan, limburger, limburgish" : "li",
      "limburgs" : "li",
      "li" : "li",
      "lim" : "li",
      "lingala" : "ln",
      "lingála" : "ln",
      "ln" : "ln",
      "lin" : "ln",
      "lao" : "lo",
      "ພາສາລາວ" : "lo",
      "lo" : "lo",
      "lithuanian" : "lt",
      "lietuvių kalba" : "lt",
      "lt" : "lt",
      "lit" : "lt",
      "luba-katanga" : "lu",
      "kiluba" : "lu",
      "lu" : "lu",
      "lub" : "lu",
      "latvian" : "lv",
      "latviešu valoda" : "lv",
      "lv" : "lv",
      "lav" : "lv",
      "lav + 2" : "lv",
      "manx" : "gv",
      "gaelg, gailck" : "gv",
      "gv" : "gv",
      "glv" : "gv",
      "gaelg" : "gv",
      "gailck" : "gv",
      "macedonian" : "mk",
      "македонски јазик" : "mk",
      "mk" : "mk",
      "mkd" : "mk",
      "mac" : "mk",
      "malagasy" : "mg",
      "fiteny malagasy" : "mg",
      "mg" : "mg",
      "mlg" : "mg",
      "mlg + 10" : "mg",
      "malay" : "ms",
      "bahasa melayu, بهاس ملايو‎" : "ms",
      "ms" : "ms",
      "msa" : "ms",
      "may" : "ms",
      "msa + 13" : "ms",
      "bahasa melayu" : "ms",
      "بهاس ملايو‎" : "ms",
      "malayalam" : "ml",
      "മലയാളം" : "ml",
      "ml" : "ml",
      "mal" : "ml",
      "maltese" : "mt",
      "malti" : "mt",
      "mt" : "mt",
      "mlt" : "mt",
      "maori" : "mi",
      "te reo māori" : "mi",
      "mi" : "mi",
      "mri" : "mi",
      "mao" : "mi",
      "marathi" : "mr",
      "मराठी" : "mr",
      "mr" : "mr",
      "mar" : "mr",
      "marshallese" : "mh",
      "kajin m̧ajeļ" : "mh",
      "mh" : "mh",
      "mah" : "mh",
      "mongolian" : "mn",
      "монгол хэл" : "mn",
      "mn" : "mn",
      "mon" : "mn",
      "mon + 2" : "mn",
      "nauru" : "na",
      "dorerin naoero" : "na",
      "na" : "na",
      "nau" : "na",
      "navajo, navaho" : "nv",
      "diné bizaad" : "nv",
      "nv" : "nv",
      "nav" : "nv",
      "north ndebele" : "nd",
      "isindebele" : "nr",
      "nd" : "nd",
      "nde" : "nd",
      "nepali" : "ne",
      "नेपाली" : "ne",
      "ne" : "ne",
      "nep" : "ne",
      "ndonga" : "ng",
      "owambo" : "ng",
      "ng" : "ng",
      "ndo" : "ng",
      "norwegian bokmål" : "nb",
      "norsk bokmål" : "nb",
      "nb" : "nb",
      "nob" : "nb",
      "norwegian nynorsk" : "nn",
      "norsk nynorsk" : "nn",
      "nn" : "nn",
      "nno" : "nn",
      "norwegian" : "no",
      "norsk" : "no",
      "no" : "no",
      "nor" : "no",
      "nor + 2" : "no",
      "sichuan yi, nuosu" : "ii",
      "ꆈꌠ꒿ nuosuhxop" : "ii",
      "ii" : "ii",
      "iii" : "ii",
      "south ndebele" : "nr",
      "nr" : "nr",
      "nbl" : "nr",
      "occitan" : "oc",
      "occitan, lenga d'òc" : "oc",
      "oc" : "oc",
      "oci" : "oc",
      "lenga d'òc" : "oc",
      "ojibwa" : "oj",
      "ᐊᓂᔑᓈᐯᒧᐎᓐ" : "oj",
      "oj" : "oj",
      "oji" : "oj",
      "oji + 7" : "oj",
      "church slavic, church slavonic, old church slavonic, old slavonic, old bulgarian" : "cu",
      "ѩзыкъ словѣньскъ" : "cu",
      "cu" : "cu",
      "chu" : "cu",
      "oromo" : "om",
      "afaan oromoo" : "om",
      "om" : "om",
      "orm" : "om",
      "orm + 4" : "om",
      "oriya" : "or",
      "ଓଡ଼ିଆ" : "or",
      "or" : "or",
      "ori" : "or",
      "ossetian, ossetic" : "os",
      "ирон æвзаг" : "os",
      "os" : "os",
      "oss" : "os",
      "panjabi, punjabi" : "pa",
      "ਪੰਜਾਬੀ" : "pa",
      "pa" : "pa",
      "pan" : "pa",
      "pali" : "pi",
      "पाऴि" : "pi",
      "pi" : "pi",
      "pli" : "pi",
      "persian" : "fa",
      "فارسی" : "fa",
      "fa" : "fa",
      "fas" : "fa",
      "per" : "fa",
      "fas + 2" : "fa",
      "polish" : "pl",
      "język polski, polszczyzna" : "pl",
      "pl" : "pl",
      "pol" : "pl",
      "język polski" : "pl",
      "polszczyzna" : "pl",
      "pashto, pushto" : "ps",
      "پښتو" : "ps",
      "ps" : "ps",
      "pus" : "ps",
      "pus + 3" : "ps",
      "portuguese" : "pt",
      "português" : "pt",
      "pt" : "pt",
      "por" : "pt",
      "quechua" : "qu",
      "runa simi, kichwa" : "qu",
      "qu" : "qu",
      "que" : "qu",
      "que + 44" : "qu",
      "runa simi" : "qu",
      "kichwa" : "qu",
      "romansh" : "rm",
      "rumantsch grischun" : "rm",
      "rm" : "rm",
      "roh" : "rm",
      "rundi" : "rn",
      "ikirundi" : "rn",
      "rn" : "rn",
      "run" : "rn",
      "romanian, moldavian, moldovan" : "ro",
      "română" : "ro",
      "ro" : "ro",
      "ron" : "ro",
      "rum" : "ro",
      "russian" : "ru",
      "русский" : "ru",
      "ru" : "ru",
      "rus" : "ru",
      "sanskrit" : "sa",
      "संस्कृतम्" : "sa",
      "sa" : "sa",
      "san" : "sa",
      "sardinian" : "sc",
      "sardu" : "sc",
      "sc" : "sc",
      "srd" : "sc",
      "srd + 4" : "sc",
      "sindhi" : "sd",
      "सिन्धी, سنڌي، سندھی‎" : "sd",
      "sd" : "sd",
      "snd" : "sd",
      "सिन्धी" : "sd",
      "سنڌي، سندھی‎" : "sd",
      "northern sami" : "se",
      "davvisámegiella" : "se",
      "se" : "se",
      "sme" : "se",
      "samoan" : "sm",
      "gagana fa'a samoa" : "sm",
      "sm" : "sm",
      "smo" : "sm",
      "sango" : "sg",
      "yângâ tî sängö" : "sg",
      "sg" : "sg",
      "sag" : "sg",
      "serbian" : "sr",
      "српски језик" : "sr",
      "sr" : "sr",
      "srp" : "sr",
      "gaelic, scottish gaelic" : "gd",
      "gàidhlig" : "gd",
      "gd" : "gd",
      "gla" : "gd",
      "shona" : "sn",
      "chishona" : "sn",
      "sn" : "sn",
      "sna" : "sn",
      "sinhala, sinhalese" : "si",
      "සිංහල" : "si",
      "si" : "si",
      "sin" : "si",
      "slovak" : "sk",
      "slovenčina, slovenský jazyk" : "sk",
      "sk" : "sk",
      "slk" : "sk",
      "slo" : "sk",
      "slovenčina" : "sk",
      "slovenský jazyk" : "sk",
      "slovenian" : "sl",
      "slovenski jezik, slovenščina" : "sl",
      "sl" : "sl",
      "slv" : "sl",
      "slovenski jezik" : "sl",
      "slovenščina" : "sl",
      "somali" : "so",
      "soomaaliga, af soomaali" : "so",
      "so" : "so",
      "som" : "so",
      "soomaaliga" : "so",
      "af soomaali" : "so",
      "southern sotho" : "st",
      "sesotho" : "st",
      "st" : "st",
      "sot" : "st",
      "spanish, castilian" : "es",
      "español" : "es",
      "es" : "es",
      "spa" : "es",
      "sundanese" : "su",
      "basa sunda" : "su",
      "su" : "su",
      "sun" : "su",
      "swahili" : "sw",
      "kiswahili" : "sw",
      "sw" : "sw",
      "swa" : "sw",
      "swa + 2" : "sw",
      "swati" : "ss",
      "siswati" : "ss",
      "ss" : "ss",
      "ssw" : "ss",
      "swedish" : "sv",
      "svenska" : "sv",
      "sv" : "sv",
      "swe" : "sv",
      "tamil" : "ta",
      "தமிழ்" : "ta",
      "ta" : "ta",
      "tam" : "ta",
      "telugu" : "te",
      "తెలుగు" : "te",
      "te" : "te",
      "tel" : "te",
      "tajik" : "tg",
      "тоҷикӣ, toçikī, تاجیکی‎" : "tg",
      "tg" : "tg",
      "tgk" : "tg",
      "тоҷикӣ" : "tg",
      "toçikī" : "tg",
      "تاجیکی‎" : "tg",
      "thai" : "th",
      "ไทย" : "th",
      "th" : "th",
      "tha" : "th",
      "tigrinya" : "ti",
      "ትግርኛ" : "ti",
      "ti" : "ti",
      "tir" : "ti",
      "tibetan" : "bo",
      "བོད་ཡིག" : "bo",
      "bo" : "bo",
      "bod" : "bo",
      "tib" : "bo",
      "turkmen" : "tk",
      "türkmen, түркмен" : "tk",
      "tk" : "tk",
      "tuk" : "tk",
      "türkmen" : "tk",
      "түркмен" : "tk",
      "tagalog" : "tl",
      "wikang tagalog" : "tl",
      "tl" : "tl",
      "tgl" : "tl",
      "tswana" : "tn",
      "setswana" : "tn",
      "tn" : "tn",
      "tsn" : "tn",
      "tonga (tonga islands)" : "to",
      "faka tonga" : "to",
      "to" : "to",
      "ton" : "to",
      "turkish" : "tr",
      "türkçe" : "tr",
      "tr" : "tr",
      "tur" : "tr",
      "tsonga" : "ts",
      "xitsonga" : "ts",
      "ts" : "ts",
      "tso" : "ts",
      "tatar" : "tt",
      "татар теле, tatar tele" : "tt",
      "tt" : "tt",
      "tat" : "tt",
      "татар теле" : "tt",
      "tatar tele" : "tt",
      "twi" : "tw",
      "tw" : "tw",
      "tahitian" : "ty",
      "reo tahiti" : "ty",
      "ty" : "ty",
      "tah" : "ty",
      "uighur, uyghur" : "ug",
      "ئۇيغۇرچە‎, uyghurche" : "ug",
      "ug" : "ug",
      "uig" : "ug",
      "ئۇيغۇرچە‎" : "ug",
      "uyghurche" : "ug",
      "ukrainian" : "uk",
      "українська" : "uk",
      "uk" : "uk",
      "ukr" : "uk",
      "urdu" : "ur",
      "اردو" : "ur",
      "ur" : "ur",
      "urd" : "ur",
      "uzbek" : "uz",
      "oʻzbek, ўзбек, أۇزبېك‎" : "uz",
      "uz" : "uz",
      "uzb" : "uz",
      "uzb + 2" : "uz",
      "oʻzbek" : "uz",
      "ўзбек" : "uz",
      "أۇزبېك‎" : "uz",
      "venda" : "ve",
      "tshivenḓa" : "ve",
      "ve" : "ve",
      "ven" : "ve",
      "vietnamese" : "vi",
      "tiếng việt" : "vi",
      "vi" : "vi",
      "vie" : "vi",
      "volapük" : "vo",
      "vo" : "vo",
      "vol" : "vo",
      "walloon" : "wa",
      "walon" : "wa",
      "wa" : "wa",
      "wln" : "wa",
      "welsh" : "cy",
      "cymraeg" : "cy",
      "cy" : "cy",
      "cym" : "cy",
      "wel" : "cy",
      "wolof" : "wo",
      "wollof" : "wo",
      "wo" : "wo",
      "wol" : "wo",
      "western frisian" : "fy",
      "frysk" : "fy",
      "fy" : "fy",
      "fry" : "fy",
      "xhosa" : "xh",
      "isixhosa" : "xh",
      "xh" : "xh",
      "xho" : "xh",
      "yiddish" : "yi",
      "ייִדיש" : "yi",
      "yi" : "yi",
      "yid" : "yi",
      "yid + 2" : "yi",
      "yoruba" : "yo",
      "yorùbá" : "yo",
      "yo" : "yo",
      "yor" : "yo",
      "zhuang, chuang" : "za",
      "saɯ cueŋƅ, saw cuengh" : "za",
      "za" : "za",
      "zha" : "za",
      "zha + 16" : "za",
      "saɯ cueŋƅ" : "za",
      "saw cuengh" : "za",
      "zulu" : "zu",
      "isizulu" : "zu",
      "zu" : "zu",
      "zul" : "zu"
    };





    function reduce(from) {
      return reductions[from.toLowerCase()];
    }

    /*********
     *
     *  Returns the source span of the `n`-th parse-tree node (1-based) matching
     *  `predicate`, or `undefined` if there are fewer than `n` matches or the
     *  matched node carries no location.  Used to point semantic compile errors
     *  at the offending statement when the tree was produced with
     *  `parse(input, { locations: true })`.
     *
     *  @internal
     *
     *  @param tree      The parse tree to scan.
     *  @param predicate Node test.
     *  @param n         1-based ordinal of the matching node to return.
     *
     *  @returns The matching node's `loc`, or `undefined`.
     *
     */
    function nth_matching_loc(tree, predicate, n) {
        let count = 0;
        for (const node of tree) {
            if (!predicate(node)) {
                continue;
            }
            count++;
            if (count === n) {
                return node.loc;
            }
        }
        return undefined;
    }
    /*********
     *
     *  Internal method meant to perform factory assembly of an edge.  Not meant for
     *  external use.  Constructs a {@link JssmTransition} from a parsed
     *  semi-edge (`this_se`), a source state, a target state, and directionality.
     *
     *  @internal
     *
     *  @typeParam StateType The type of state names (usually `string`).
     *  @typeParam mDT       The type of the machine data member; usually omitted.
     *
     *  @param this_se    - The parsed semi-edge containing kind, action, and
     *                      probability metadata.
     *  @param from       - The source state of the transition.
     *  @param to         - The target state of the transition.
     *  @param isRight    - `true` if this is a left-to-right transition, `false`
     *                      for right-to-left.  Determines which arrow kind
     *                      extraction function is used.
     *  @param _wasList   - If the transition was expanded from a list (e.g.
     *                      `[A B C] -> D`), the original list of states.
     *  @param _wasIndex  - The index of `from` within `_wasList`, if applicable.
     *
     *  @returns A fully assembled {@link JssmTransition} edge object.
     *
     */
    function makeTransition(this_se, from, to, isRight, _wasList, _wasIndex) {
        // the explicit quotation syntax lets `""` through the grammar; a nameless
        // state can never be addressed, so reject at edge assembly (fsl#653)
        if (from === '') {
            throw new JssmError(undefined, 'A state name may not be the empty string (transition source)');
        }
        if (to === '') {
            throw new JssmError(undefined, 'A state name may not be the empty string (transition target)');
        }
        // `this_se.kind` is typed `string` rather than JssmArrow — see the field's own
        // note in jssm_types.ts.  The classifiers reject anything that isn't a real
        // arrow, so an unsound value throws here rather than passing silently.
        const arrow = this_se.kind, kind = isRight
            ? arrow_right_kind(arrow)
            : arrow_left_kind(arrow), 
        // action and probability are pre-declared (as after_time always was)
        // so every compiled edge shares ONE hidden class regardless of which
        // optional fields its declaration carries.  The conditional assigns
        // below then overwrite a value instead of adding a property, keeping
        // the runtime _edges array monomorphic for the dispatch-path loads
        // (.kind / .to / .forced_only) that run on every transition.
        edge = {
            from,
            to,
            kind,
            after_time: isRight ? this_se.r_after : this_se.l_after,
            forced_only: kind === 'forced',
            main_path: kind === 'main',
            action: undefined,
            probability: undefined
        };
        //  if ((wasList  !== undefined) && (wasIndex === undefined)) { throw new JssmError(undefined, `Must have an index if transition was in a list"); }
        //  if ((wasIndex !== undefined) && (wasList  === undefined)) { throw new JssmError(undefined, `Must be in a list if transition has an index");   }
        /*
          if (typeof edge.to === 'object') {
      
            if (edge.to.key === 'cycle') {
              if (wasList === undefined) { throw new JssmError(undefined, "Must have a waslist if a to is type cycle"); }
              const nextIndex = wrapBy(wasIndex, edge.to.value, wasList.length);
              edge.to = wasList[nextIndex];
            }
      
          }
        */
        const action = isRight ? 'r_action' : 'l_action', probability = isRight ? 'r_probability' : 'l_probability';
        if (this_se[action] != null) {
            edge.action = this_se[action];
        }
        if (this_se[probability] != null) {
            edge.probability = this_se[probability];
        }
        // same rejection for `''` action quotation — an action nobody can name
        // can never be dispatched (fsl#653)
        if (edge.action === '') {
            throw new JssmError(undefined, 'An action name may not be the empty string');
        }
        return edge;
    }
    /*********
     *
     *  This method wraps the parser call that comes from the peg grammar,
     *  {@link parse}.  Generally neither this nor that should be used directly
     *  unless you mean to develop plugins or extensions for the machine.
     *
     *  Parses the intermediate representation of a compiled string down to a
     *  machine configuration object.  If you're using this (probably don't,) you're
     *  probably also using {@link compile} and {@link Machine.constructor}.
     *
     *  ```typescript
     *  import { parse, compile, Machine } from 'jssm';
     *
     *  const intermediate = wrap_parse('a -> b;', {});
     *  // [ {key:'transition', from:'a', se:{kind:'->',to:'b'}} ]
     *
     *  const cfg = compile(intermediate);
     *  // { start_states:['a'], transitions: [{ from:'a', to:'b', kind:'legal', forced_only:false, main_path:false }] }
     *
     *  const machine = new Machine(cfg);
     *  // Machine { _instance_name: undefined, _state: 'a', ...
     *  ```
     *
     *  This method is mostly for plugin and intermediate tool authors, or people
     *  who need to work with the machine's intermediate representation.
     *
     *  ## Opt-in source locations
     *
     *  Pass `{ locations: true }` to attach source-span information to every
     *  object node in the AST.  Each node gains a `loc` field of type
     *  {@link FslSourceLocation} covering its full statement span.  Selected nodes
     *  also gain curated sub-span fields that pinpoint individual tokens within the
     *  statement:
     *
     *  - Transition nodes: `from_loc` (source state), `to_loc` (target state, on
     *    the nested `se` object), `l_action_loc` / `r_action_loc` (action labels).
     *  - State-declaration nodes: `name_loc` (state name), plus `value_loc` on
     *    each color-bearing item inside the declaration block.
     *  - Machine-attribute nodes (`machine_name`, `fsl_version`, etc.): `value_loc`
     *    (the attribute value token).
     *
     *  Without `{ locations: true }` the AST is byte-for-byte identical to the
     *  default output; no `loc` or `*_loc` fields are present.
     *
     *  ```typescript
     *  const tree = wrap_parse('a -> b;', { locations: true });
     *  // tree[0].loc  === { start: { offset: 0, line: 1, column: 1 },
     *  //                    end:   { offset: 7, line: 1, column: 8 } }
     *  // tree[0].from_loc.start.offset === 0   // 'a'
     *  // tree[0].se.to_loc.start.offset === 5  // 'b'
     *  ```
     *
     *  @see {@link FslSourceLocation}
     *
     *  # Hey!
     *
     *  Most people looking at this want either the `sm` operator or method `from`,
     *  which perform all the steps in the chain.  The library's author mostly uses
     *  operator `sm`, and mostly falls back to `.from` when needing to parse
     *  strings dynamically instead of from template literals.
     *
     *  Operator {@link sm}:
     *
     *  ```typescript
     *  import { sm } from 'jssm';
     *
     *  const lswitch = sm`on <=> off;`;
     *  ```
     *
     *  Method {@link from}:
     *
     *  ```typescript
     *  import * as jssm from 'jssm';
     *
     *  const toggle = jssm.from('up <=> down;');
     *  ```
     *
     *  `wrap_parse` itself is an internal convenience method for alting out an
     *  object as the options call.  Not generally meant for external use.
     *
     *  @typeParam StateType The type of state names in the resulting tree; the
     *                       grammar itself always produces `string`s, so only
     *                       override this when threading a caller's own state
     *                       naming through to {@link compile}.
     *  @typeParam mDT       The type of the machine data member; usually omitted.
     *
     *  @param input The FSL code to be evaluated
     *
     *  @param options Things to control about the parse.  Pass
     *                 `{ locations: true }` to enable opt-in source location
     *                 tracking on every AST node.  When omitted, an empty options
     *                 object is passed through to the parser.
     *
     *  @returns The machine's intermediate representation: a flat
     *           {@link JssmParseTree} with one node per top-level FSL statement.
     *
     *  @throws {SyntaxError} The generated PEG.js parser's `SyntaxError` when
     *                        `input` is not valid FSL.
     *
     *  @see {@link compile}
     *  @see {@link make}
     *  @see {@link JssmParseOptions}
     *
     */
    function wrap_parse(input, options) {
        return peg$parse(input, options || {});
    }
    /*********
     *
     *  Normalizes a single parsed `named_list` value into an ordered array of
     *  {@link JssmGroupMemberRef}.  The grammar returns a bare `string[]` when a
     *  list contains only plain labels (the historical NamedList shape), and an
     *  array of member objects as soon as any `&`/`...&` group member appears.
     *  This collapses both forms into the uniform member-object shape used by
     *  the {@link JssmGroupRegistry}.
     *
     *  ```typescript
     *  normalize_group_members(['a', 'b']);
     *  // [ { kind: 'state', name: 'a' }, { kind: 'state', name: 'b' } ]
     *  ```
     *
     *  @param value The `value` field of a parsed `named_list` node — either a
     *               `string[]` of plain labels or an array of member objects.
     *
     *  @returns The ordered direct members as {@link JssmGroupMemberRef} objects.
     *
     *  @internal
     */
    function normalize_group_members(value) {
        return value.map((member) => (typeof member === 'string')
            ? { kind: 'state', name: member }
            : member);
    }
    /*********
     *
     *  Builds the ordered {@link JssmGroupRegistry} from every `named_list` node
     *  in a parse tree, preserving declaration order of each group's direct
     *  members.  Only direct members are stored; transitive (flattened)
     *  membership is resolved separately by {@link transitive_members} so the
     *  group→group graph survives for later precedence/viz work.
     *
     *  ```typescript
     *  build_group_registry(parse('&g : [a b];'));
     *  // Map { 'g' => [ { kind:'state', name:'a' }, { kind:'state', name:'b' } ] }
     *  ```
     *
     *  @param tree The parse tree to scan for group declarations.
     *
     *  @returns A `Map` from group name to its ordered direct members.
     *
     *  @throws {JssmError} If two `named_list` nodes declare the same group name.
     *
     *  @see transitive_members
     *  @see group_registry_cycle_check
     */
    function build_group_registry(tree) {
        const registry = new Map();
        for (const node of tree) { // TODO FIXME no any
            if (node.key !== 'named_list') {
                continue;
            }
            if (registry.has(node.name)) {
                throw new JssmError(undefined, `Cannot redeclare group: &${node.name}`);
            }
            registry.set(node.name, normalize_group_members(node.value));
        }
        return registry;
    }
    /*********
     *
     *  Walks the group→group edges of a {@link JssmGroupRegistry} (both `nest`
     *  and `spread` members count as edges) and throws on a cycle.  A cycle
     *  would make transitive membership non-terminating, so it is rejected at
     *  compile time.
     *
     *  ```typescript
     *  group_registry_cycle_check(build_group_registry(parse('&a:[&b]; &b:[&a];')));
     *  // throws JssmError: Group membership cycle detected: &a -> &b -> &a
     *  ```
     *
     *  @param registry The ordered group registry to validate.
     *
     *  @throws {JssmError} If any group transitively contains itself.
     *
     *  @see build_group_registry
     */
    function group_registry_cycle_check(registry) {
        const visiting = new Set(); // on the current DFS stack
        const visited = new Set(); // fully explored, known acyclic
        const walk = (group, path) => {
            var _a;
            if (visiting.has(group)) {
                const cycle = [...path, group].map((g) => `&${g}`).join(' -> ');
                throw new JssmError(undefined, `Group membership cycle detected: ${cycle}`);
            }
            if (visited.has(group)) {
                return;
            }
            visiting.add(group);
            const group_members = (_a = registry.get(group)) !== null && _a !== void 0 ? _a : [];
            for (const member of group_members) {
                if (member.kind === 'group') {
                    walk(member.name, [...path, group]);
                }
            }
            visiting.delete(group);
            visited.add(group);
        };
        for (const group of registry.keys()) {
            walk(group, []);
        }
    }
    /*********
     *
     *  Resolves a group to its ordered, flat list of member STATE names,
     *  splicing each nested or spread sub-group's resolved members in at the
     *  position the sub-group occupies.  `nest` and `spread` produce the same
     *  state set here; their structural distinction is retained only in the
     *  registry for later viz/precedence.  Results are cached in `memo` so a
     *  group shared by several parents resolves once.
     *
     *  Assumes the registry is acyclic — run {@link group_registry_cycle_check}
     *  first.
     *
     *  ```typescript
     *  const reg = build_group_registry(parse('&inner:[a b]; &outer:[&inner c];'));
     *  transitive_members(reg, 'outer', new Map());  // [ 'a', 'b', 'c' ]
     *  ```
     *
     *  @param registry The ordered group registry.
     *  @param group    The group name to flatten.
     *  @param memo     A cache from group name to its already-resolved state
     *                  list; shared across calls to memoize overlapping work.
     *
     *  @returns The ordered member state names.
     *
     *  @see build_group_registry
     */
    function transitive_members(registry, group, memo) {
        var _a;
        const cached = memo.get(group);
        if (cached !== undefined) {
            return cached;
        }
        const out = [];
        const group_members = (_a = registry.get(group)) !== null && _a !== void 0 ? _a : [];
        for (const member of group_members) {
            if (member.kind === 'state') {
                out.push(member.name);
            }
            else {
                for (const s of transitive_members(registry, member.name, memo)) {
                    out.push(s);
                }
            }
        }
        memo.set(group, out);
        return out;
    }
    /*********
     *
     *  Validates that every `group`-kind member of every group in the registry
     *  names a group that is itself declared.  A `&outer : [&missing]` whose
     *  `missing` group is never declared is a compile error — the analogue, on
     *  the membership side, of the unresolved transition/target reference rejected
     *  by {@link resolve_group_refs}.  Plain `state`-kind members are NOT checked:
     *  states are never pre-declared in FSL, so any label is acceptable there.
     *
     *  ```typescript
     *  // `&outer : [&missing];` throws:
     *  //   JssmError: Unresolved group reference: &missing
     *  ```
     *
     *  @param registry The compiled group registry to validate.
     *
     *  @throws {JssmError} If any group member references an undeclared group,
     *                      naming the unresolved member.
     *
     *  @see resolve_group_refs
     *  @see build_group_registry
     *  @internal
     */
    function validate_group_members(registry) {
        for (const members of registry.values()) {
            for (const member of members) {
                if ((member.kind === 'group') && (!registry.has(member.name))) {
                    throw new JssmError(undefined, `Unresolved group reference: &${member.name}`);
                }
            }
        }
    }
    /*********
     *
     *  Computes the minimum membership distance from a source `state` up to a
     *  containing `group` — the specificity metric that drives group-vs-group
     *  conflict resolution.  Distance 1 means `state` is a direct member of
     *  `group`; distance 2 means `state` belongs to some sub-group nested (or
     *  spread) one hop inside `group`; and so on.  A smaller distance means the
     *  group is "nearer"/"more specific" to the state, so it wins.
     *
     *  The walk is a breadth-first descent over the group→group membership edges
     *  starting at `group`: a group dequeued at hop-count `h` contributes its
     *  direct `state` members at distance `h + 1`, and enqueues its `group`
     *  members at hop-count `h + 1`.  BFS guarantees the first time `state` is
     *  seen is via a shortest path; cycles cannot occur because the registry is
     *  validated acyclic by {@link group_registry_cycle_check} first, but a
     *  `visited` set guards against re-expansion regardless.
     *
     *  ```typescript
     *  // for `&Playing:[normal]; &Active:[&Playing];`
     *  // membership_distance(reg, 'normal', 'Playing') === 1
     *  // membership_distance(reg, 'normal', 'Active')  === 2
     *  ```
     *
     *  @param registry The compiled group registry.
     *  @param state    The source state whose distance is measured.
     *  @param group    The containing group to measure the distance to.
     *
     *  @returns The minimum membership distance (>= 1), or `Infinity` if `state`
     *           is not a transitive member of `group`.
     *
     *  @see transitive_members
     *  @internal
     */
    function membership_distance(registry, state, group) {
        var _a;
        const visited = new Set([group]);
        let frontier = [{ group, hops: 0 }];
        while (frontier.length > 0) {
            const next = [];
            for (const { group: g, hops } of frontier) {
                const members = (_a = registry.get(g)) !== null && _a !== void 0 ? _a : [];
                for (const member of members) {
                    if (member.kind === 'state') {
                        if (member.name === state) {
                            return hops + 1;
                        }
                    }
                    else if (!visited.has(member.name)) {
                        visited.add(member.name);
                        next.push({ group: member.name, hops: hops + 1 });
                    }
                }
            }
            frontier = next;
        }
        return Infinity;
    }
    // Carried in a side table rather than as `__decl_id`/`__source_group`/
    // `__specificity` properties on the edges: the old stamp-then-`delete`
    // pipeline forced a hidden-class transition per edge, and for group-sourced
    // edges the delete (not last-added property) demoted the very objects that
    // become the runtime `_edges` array into V8 dictionary mode for the machine's
    // whole life, taxing every dispatch-path `.kind`/`.to`/`.forced_only` load.
    // WeakMap keys are per-compile edge objects, so entries cannot leak across
    // compiles and are collected with the edges.
    const edge_decl_meta = new WeakMap();
    /*********
     *
     *  Arbitrates transitions that compete for the same `(source_state, action)`
     *  pair after group-as-source expansion, returning a new edge list in which
     *  each such pair keeps exactly one winner.  The transient conflict-resolution
     *  metadata lives in {@link edge_decl_meta}, never on the edges themselves.
     *  Edges without an `action`, and `(from, action)` pairs claimed
     *  by a single edge, pass through untouched (so a genuine user-authored
     *  duplicate like `a 'x' -> b; a 'x' -> c;` still reaches — and is rejected
     *  by — the Machine constructor's one-action-per-origin check).
     *
     *  The winner for a contested pair is chosen by the inner-overrides-outer
     *  (statechart) rule:
     *
     *  1. A **state-specific** edge (one with no `__source_group`, i.e. authored
     *     directly rather than via a group source) always beats every
     *     group-sourced edge for that pair.  All state-specific edges survive
     *     (any duplication among them is the user's own and is left for the
     *     runtime to reject); all group-sourced edges are dropped silently —
     *     overriding a group with a state is the documented, expected case.
     *  2. Otherwise the contest is among group-sourced edges: the one with the
     *     SMALLEST `__specificity` (nearest / innermost group) wins.
     *  3. An equal-specificity tie breaks by **declaration order** — the edge
     *     appearing later in the source (later array index) wins.
     *
     *  Whenever a group-sourced edge is dropped in favor of another group-sourced
     *  edge, a `console.warn` names the overridden group, the overriding group,
     *  and the shared source state.
     *
     *  ```typescript
     *  // `&Playing:[normal]; &Active:[&Playing];
     *  //  &Playing 'error' -> buffering; &Active 'error' -> stopped;`
     *  // for `normal`: Playing (distance 1) beats Active (distance 2), so the
     *  // surviving edge is `normal 'error' -> buffering`.
     *  ```
     *
     *  @param edges The assembled, post-expansion edge list.
     *  @param has_group_sources Whether the machine declared any groups at all;
     *         when `false` no edge can carry a source group, the arbitration is a
     *         provable pass-through, and the bucketing work (one JSON key per
     *         actioned edge) is skipped entirely.
     *
     *  @returns The edge list with contested pairs resolved; surviving edges keep
     *           their original relative order.
     *
     *  @see resolve_group_refs
     *  @see membership_distance
     *  @internal
     */
    function resolve_transition_conflicts(edges, has_group_sources = true) {
        var _a;
        if (!has_group_sources) {
            return edges;
        }
        // Group edge indices by (from, action), then by declaration within each, so
        // sibling edges of one fan-out (shared decl_id) never override each other.
        // Reverse-direction edges (`<-` halves) carry no metadata and share the
        // `undefined` declaration bucket, exactly as the untagged edges did before.
        const buckets = new Map();
        for (const [index, edge] of edges.entries()) {
            if (edge.action == null) {
                continue;
            } // actionless edges never contest on action
            const key = JSON.stringify([String(edge.from), String(edge.action)]);
            let by_decl = buckets.get(key);
            if (by_decl === undefined) {
                by_decl = new Map();
                buckets.set(key, by_decl);
            }
            const meta = edge_decl_meta.get(edge);
            const decl_id = meta === undefined ? undefined : meta.decl_id;
            const entry = by_decl.get(decl_id);
            if (entry === undefined) {
                by_decl.set(decl_id, {
                    decl_id,
                    indices: [index],
                    source_group: meta === undefined ? undefined : meta.source_group,
                    specificity: (_a = (meta === undefined ? undefined : meta.specificity)) !== null && _a !== void 0 ? _a : Infinity
                });
            }
            else {
                entry.indices.push(index);
            }
        }
        const dropped = new Set();
        // Arbitrates one (from, action) bucket of competing declarations, adding
        // each losing declaration's edge indices to `dropped`.
        const arbitrate_bucket = (by_decl) => {
            const decls = [...by_decl.values()];
            if (decls.length < 2) {
                return;
            } // a single declaration cannot conflict
            const state_decls = decls.filter((d) => d.source_group === undefined);
            const group_decls = decls.filter((d) => d.source_group !== undefined);
            // Rule 1: any state-specific declaration wins — drop every group-sourced
            // edge silently, keep every state-specific edge (runtime rejects genuine
            // user dupes among the state declarations).
            if (state_decls.length > 0) {
                for (const d of group_decls) {
                    for (const i of d.indices) {
                        dropped.add(i);
                    }
                }
                return;
            }
            // Rule 2 + 3: among group-sourced declarations, smallest specificity wins;
            // ties break by later declaration order (larger decl_id).
            let winner = group_decls[0];
            for (const d of group_decls) {
                const nearer = d.specificity < winner.specificity;
                const tie_later = (d.specificity === winner.specificity) && (d.decl_id > winner.decl_id);
                if (nearer || tie_later) {
                    winner = d;
                }
            }
            for (const d of group_decls) {
                if (d.decl_id === winner.decl_id) {
                    continue;
                }
                for (const i of d.indices) {
                    dropped.add(i);
                }
                console.warn(`jssm: group &${d.source_group} transition for state '${String(edges[d.indices[0]].from)}' `
                    + `on action '${String(edges[d.indices[0]].action)}' is overridden by nearer group `
                    + `&${winner.source_group}`);
            }
        };
        for (const by_decl of buckets.values()) {
            arbitrate_bucket(by_decl);
        }
        // Emit survivors in original order.  No stripping: the metadata never
        // touched the edge objects, so their hidden classes are intact for the
        // runtime dispatch paths that will load from them for the machine's life.
        const out = [];
        for (const [index, edge] of edges.entries()) {
            if (dropped.has(index)) {
                continue;
            }
            out.push(edge);
        }
        return out;
    }
    /*********
     *
     *  Reports whether a parsed transition endpoint is a group reference
     *  (`&Name`), i.e. a `{ key: 'group_ref', name }` node.  Used to drive
     *  reference resolution and fan-out-target rewriting.
     *
     *  A plain label is a `string` (rejected by the `typeof` test), a list
     *  target is an `Array` (an object whose `.key` is `undefined`), and a
     *  cycle/stripe marker is an object with a different `.key` — all three
     *  return `false`.  The parser never emits a `null` endpoint, so the
     *  `typeof === 'object'` guard alone is sufficient.
     *
     *  @param endpoint A transition `from` or `to` value from the parse tree.
     *
     *  @returns `true` for a group-reference node, `false` for a plain label,
     *           a label list, or a cycle/stripe marker.
     *
     *  @internal
     */
    function is_group_ref(endpoint) {
        return (typeof endpoint === 'object')
            && (endpoint.key === 'group_ref');
    }
    /*********
     *
     *  Resolves every `group_ref` used as a transition source/target or hook
     *  subject against the registry, throwing on an unresolved name, and produces
     *  a parse tree in which:
     *
     *  - every group-reference TARGET (any `to` position in an arrow chain) is
     *    rewritten in place to the ordered state array produced by
     *    {@link transitive_members}, so the existing list-target fan-out in
     *    {@link compile_rule_transition_step} expands it to one edge per member;
     *  - every group-reference SOURCE (a `from` position) is FANNED OUT to one
     *    transition node per transitive member, each carrying a transient
     *    `__source_group` (the declared group name) and `__specificity` (that
     *    member's {@link membership_distance} from the declared group) used only
     *    by {@link resolve_transition_conflicts} and stripped before emission.
     *
     *  Forward references resolve because the registry is built from the whole
     *  tree before this pass runs.  Non-transition nodes (state declarations,
     *  hook declarations, ...) pass through untouched, except that hook subjects
     *  are validated.
     *
     *  ```typescript
     *  // `&g : [a b]; foo -> &g;` rewrites the target to `['a','b']`, which
     *  // then fans out to `foo -> a; foo -> b;`.
     *  // `&g : [a b]; &g 'x' -> y;` fans the source out to two transition nodes
     *  // `a 'x' -> y;` and `b 'x' -> y;`.
     *  ```
     *
     *  @param tree     The parse tree to resolve; target/hook validation mutates
     *                  transition `to` links in place, but source fan-out is
     *                  returned as a NEW node array (the input is not reordered).
     *  @param registry The compiled group registry.
     *
     *  @returns The resolved parse tree, with group sources fanned out.
     *
     *  @throws {JssmError} If a `group_ref` (source, target, or hook subject)
     *                      names a group not present in the registry.
     *
     *  @see transitive_members
     *  @see membership_distance
     *  @see resolve_transition_conflicts
     *  @see compile_rule_transition_step
     */
    function resolve_group_refs(tree, registry) {
        const memo = new Map();
        const require_resolvable = (name) => {
            if (!registry.has(name)) {
                throw new JssmError(undefined, `Unresolved group reference: &${name}`);
            }
        };
        // Rewrites every group-ref `to` along one transition's arrow chain, in
        // place, to its ordered member-state array.
        const rewrite_group_targets = (node) => {
            for (let link = node.se; link; link = link.se) {
                if (!is_group_ref(link.to)) {
                    continue;
                }
                require_resolvable(link.to.name);
                link.to = transitive_members(registry, link.to.name, memo);
            }
        };
        const resolved = []; // TODO FIXME no any
        let decl_id = 0; // one id per source declaration
        for (const node of tree) { // TODO FIXME no any
            // Hook subjects that are group refs are validated here (state subjects
            // need no validation — states are never pre-declared).
            if ((node.key === 'hook_decl') && is_group_ref(node.subject)) {
                require_resolvable(node.subject.name);
            }
            if (node.key !== 'transition') {
                resolved.push(node);
                continue;
            }
            // Every transition declaration gets one id so conflict resolution can
            // tell distinct declarations apart from the sibling edges of a single
            // declaration's list/group fan-out (which must never override each other).
            const this_decl = decl_id++;
            // Every `to` along the arrow chain is a target; a group ref there is
            // rewritten in place to its ordered member-state array.
            rewrite_group_targets(node);
            // A group-ref SOURCE fans out to one transition node per transitive
            // member, each tagged with the originating group and that member's
            // membership distance (its specificity) for later conflict resolution.
            if (is_group_ref(node.from)) {
                const group_name = node.from.name;
                require_resolvable(group_name);
                for (const member of transitive_members(registry, group_name, memo)) {
                    resolved.push(Object.assign(Object.assign({}, node), { from: member, __decl_id: this_decl, __source_group: group_name, __specificity: membership_distance(registry, member, group_name) }));
                }
            }
            else if (registry.size === 0) {
                // No groups declared anywhere: the decl tag is only ever read by group
                // conflict arbitration, which cannot trigger, so skip the per-statement
                // node copy — a full shallow spread of every transition parse node
                // (5,000 copies on messy-5000) purely to carry an unread tag.
                resolved.push(node);
            }
            else {
                resolved.push(Object.assign(Object.assign({}, node), { __decl_id: this_decl }));
            }
        }
        return resolved;
    }
    /*********
     *
     *  Internal method performing one step in compiling rules for transitions.  Not
     *  generally meant for external use.
     *
     *  @internal
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     */
    function compile_rule_transition_step(acc, from, to, this_se, next_se) {
        const uFrom = (Array.isArray(from) ? from : [from]), uTo = (Array.isArray(to) ? to : [to]);
        for (const f of uFrom) {
            for (const t of uTo) {
                const right = makeTransition(this_se, f, t, true);
                if (right.kind !== 'none') {
                    acc.push(right);
                }
                const left = makeTransition(this_se, t, f, false);
                if (left.kind === 'none') {
                    // A one-way arrow has no reverse edge, so a probability/action/after
                    // written AFTER the arrow ("a -> 40% b") lands in the reverse-edge slots
                    // and used to be silently dropped.  Reject it loudly; the decoration
                    // belongs before the arrow ("a 40% -> b").  The parser omits these
                    // fields when absent (despite the non-optional type), so a loose view
                    // lets `!= null` mean "was decorated".  StoneCypher/fsl#1950
                    const rev = this_se;
                    if (rev.l_probability != null || rev.l_action != null || rev.l_after != null) {
                        throw new JssmError(undefined, `A one-way arrow has no reverse edge, so a decoration written after it ("${String(from)} ${this_se.kind} 40% ${String(to)}") is discarded; write it before the arrow instead ("${String(from)} 40% ${this_se.kind} ${String(to)}").`);
                    }
                }
                else {
                    acc.push(left);
                }
            }
        }
        return next_se ? compile_rule_transition_step(acc, to, next_se.to, next_se, next_se.se) : acc;
    }
    /*********
     *
     *  Internal method performing one step in compiling rules for transitions.  Not
     *  generally meant for external use.
     *
     *  @internal
     *
     */
    function compile_rule_handle_transition(rule) {
        return compile_rule_transition_step([], rule.from, rule.se.to, rule.se, rule.se.se);
    }
    /*********
     *
     *  Internal method performing one step in compiling rules for transitions.  Not
     *  generally meant for external use.
     *
     *  @internal
     *
     */
    function compile_rule_handler(rule) {
        if (rule.key === 'transition') {
            const edges = compile_rule_handle_transition(rule);
            // Every transition node carries a transient `__decl_id` (assigned per
            // source declaration by resolve_group_refs); a group-sourced node also
            // carries `__source_group` / `__specificity`.  Record these in the
            // edge_decl_meta side table — NEVER as properties on the edges, which
            // would churn their hidden classes (see the note at edge_decl_meta) — so
            // resolve_transition_conflicts can arbitrate competing (from, action)
            // pairs across DISTINCT declarations.  The right-direction edges are the
            // source-driven ones, so only edges whose `from` is the declaration's
            // source state get an entry.
            const decl_id = rule.__decl_id; // TODO FIXME no any
            const source_group = rule.__source_group; // TODO FIXME no any
            const specificity = rule.__specificity; // TODO FIXME no any
            // Group-free machines (registry.size === 0) reach here with UNTAGGED
            // nodes — resolve_group_refs passes them through untouched — and their
            // conflict arbitration is skipped outright, so the metadata would never
            // be read.  Skipping the per-edge WeakMap.set removes the one remaining
            // unconditional per-edge construction cost the side-table refactor added
            // (the week-over-week trail showed construct paying for it).
            if (decl_id !== undefined) {
                for (const edge of edges) {
                    if (edge.from === rule.from) {
                        edge_decl_meta.set(edge, { decl_id, source_group, specificity });
                    }
                }
            }
            return { agg_as: 'transition', val: edges };
        }
        if (rule.key === 'machine_language') {
            // Accept BCP-47 language tags (e.g. `en-us`, `zh-Hant`) by reducing to the
            // primary language subtag before the ISO 639-1 lookup, so a regional tag
            // resolves to its base language (`en-us` -> `en`) instead of failing.
            // the grammar guarantees machine_language carries a string value; the cast
            // narrows away the state-declaration array arm for no-base-to-string
            const language_value = rule.value;
            const primary_subtag = String(language_value).split(/[-_]/, 1)[0];
            return { agg_as: 'machine_language', val: reduce(primary_subtag) };
        }
        // manually rehandled to make `undefined` as a property safe
        if (rule.key === 'property_definition') {
            const ret = { agg_as: 'property_definition', val: { name: rule.name } };
            if (Object.prototype.hasOwnProperty.call(rule, 'default_value')) {
                ret.val.default_value = rule.default_value;
            }
            if (Object.prototype.hasOwnProperty.call(rule, 'required')) {
                ret.val.required = rule.required;
            }
            return ret;
        }
        // manually rehandled to carry the val type descriptor through
        if (rule.key === 'val_definition') {
            // numeric-looking enum members would type-mismatch their own defaults: an
            // enum member parses as a string, but a numeric default parses as a number,
            // so they never compare equal.  Reject them at compile time (jssm#759).
            if (rule.val_type.kind === 'enum') {
                const numeric_members = rule.val_type.members.filter((m) => /^\d/.test(m));
                if (numeric_members.length > 0) {
                    throw new JssmError(undefined, `Enum val "${rule.name}" has numeric-looking members ${JSON.stringify(numeric_members)}; `
                        + 'enum members must not begin with a digit (a numeric default parses as a number and never '
                        + 'matches the string member) — quote or rename them', { source_location: rule.loc });
                }
            }
            const ret = { agg_as: 'val_definition', val: { name: rule.name, val_type: rule.val_type } };
            if (Object.prototype.hasOwnProperty.call(rule, 'default_value')) {
                ret.val.default_value = rule.default_value;
            }
            if (Object.prototype.hasOwnProperty.call(rule, 'required')) {
                ret.val.required = rule.required;
            }
            return ret;
        }
        // Group declarations are collected into the registry in a separate pass
        // (see build_group_registry); here we only need them to stop falling
        // through to the "Unknown rule" throw.  The aggregated value is unused.
        if (rule.key === 'named_list') {
            return { agg_as: 'named_list', val: [] };
        }
        // A boundary-hook declaration (`on enter|exit <subject> do 'action';`) is
        // collected raw; the compile pass routes it into group_hooks or state_hooks
        // by subject kind.  Runtime firing is a later task.
        if (rule.key === 'hook_decl') {
            return { agg_as: 'hook_decl', val: [rule] };
        }
        // state properties are in here
        if (rule.key === 'state_declaration') {
            if (!rule.name) {
                throw new JssmError(undefined, 'State declarations must have a name', { source_location: rule.loc });
            }
            // `state &g : { … }` (a group-ref subject) registers GROUP metadata keyed
            // by group name — NOT fanned out to per-member states — so the runtime
            // cascade can preserve depth.  A plain `state foo : { … }` keeps its
            // existing per-state behavior.
            if (is_group_ref(rule.name)) {
                return { agg_as: 'group_metadata', val: [{ group: rule.name.name, declarations: rule.value }] }; // TODO FIXME no any
            }
            return { agg_as: 'state_declaration', val: { state: rule.name, declarations: rule.value } };
        }
        if (['arrange_declaration', 'arrange_start_declaration',
            'arrange_end_declaration', 'oarrange_declaration',
            'farrange_declaration'].includes(rule.key)) {
            return { agg_as: rule.key, val: [rule.value] };
        }
        // things that can only exist once and are just a value under their own name
        const tautologies = [
            'graph_layout', 'graph_bg_color', 'start_states', 'end_states', 'failed_outputs',
            'machine_name', 'machine_version', 'machine_comment', 'machine_author',
            'machine_contributor', 'machine_definition', 'machine_reference', 'machine_license',
            'fsl_version', 'state_config', 'theme', 'flow', 'dot_preamble', 'allows_override',
            'allow_islands', 'default_state_config', 'default_transition_config', 'default_graph_config',
            'default_start_state_config', 'default_end_state_config',
            'default_hooked_state_config', 'default_active_state_config',
            'default_terminal_state_config', 'npm_name', 'default_size', 'editor_config'
        ];
        if (tautologies.includes(rule.key)) {
            return { agg_as: rule.key, val: rule.value };
        }
        throw new JssmError(undefined, `compile_rule_handler: Unknown rule: ${JSON.stringify(rule)}`);
    }
    /*********
     *
     *  Maps a deprecated top-level graph keyword to the canonical key it occupies
     *  inside a consolidated `graph: {}` config block.  Aliases whose canonical key
     *  coincides with a `graph: {}` style item (currently only `graph_bg_color` →
     *  `background-color`) let an explicit block override the legacy form; the rest
     *  keep their own key because the block has no equivalent.
     *
     *  @param alias_key The deprecated top-level keyword, e.g. `graph_bg_color`
     *
     *  @returns The canonical key the value should carry inside `default_graph_config`
     *
     *  @see fold_graph_config
     */
    function canonical_graph_alias_key(alias_key) {
        if (alias_key === 'graph_bg_color') {
            return 'background-color';
        }
        return alias_key;
    }
    /*********
     *
     *  Folds the deprecated top-level graph keywords (`graph_layout`,
     *  `graph_bg_color`, `dot_preamble`, `theme`, `flow`) into the consolidated
     *  `default_graph_config` list, then appends the items from an explicit
     *  `graph: {}` block so that, on a canonical-key conflict, the explicit block
     *  wins.
     *
     *  Only `graph_bg_color` emits a `console.warn` deprecation notice, because
     *  it is the only alias that has a direct `graph: {}` block replacement today
     *  (`graph: { background-color: … }`).  The other aliases (`graph_layout`,
     *  `theme`, `flow`, `dot_preamble`) fold silently — they have no block-level
     *  equivalent yet, so warning on them would be misleading spam.  The warning
     *  fires once per compile (the key can only appear once in a valid FSL source).
     *
     *  The result is de-duplicated by canonical key, last-wins, preserving the
     *  position of the first occurrence of each key (so a `graph: {}` override
     *  updates the value in place rather than reordering).
     *
     *  ```typescript
     *  fold_graph_config({ graph_bg_color: ['#fff'] }, []);
     *  // [ { key: 'background-color', value: '#fff' } ]
     *  ```
     *
     *  @param aliases       The collected values for each deprecated alias keyword
     *  @param explicit_block The items parsed from an explicit `graph: {}` block
     *
     *  @returns The consolidated, conflict-resolved graph-config item list
     *
     *  @see canonical_graph_alias_key
     */
    const WARN_DEPRECATED_GRAPH_ALIASES = new Set(['graph_bg_color']);
    function fold_graph_config(aliases, explicit_block) {
        const folded = [];
        for (const [alias_key, values] of Object.entries(aliases)) {
            for (const value of values) {
                if (WARN_DEPRECATED_GRAPH_ALIASES.has(alias_key)) {
                    console.warn(`jssm: top-level \`${alias_key}\` is deprecated; prefer a \`graph: {}\` config block`);
                }
                folded.push({ key: canonical_graph_alias_key(alias_key), value });
            }
        }
        for (const item of explicit_block) {
            folded.push(item);
        }
        // De-duplicate by canonical key, last-wins, holding first-seen position.
        const seen_at = new Map();
        const result = [];
        for (const item of folded) {
            const existing_index = seen_at.get(item.key);
            if (existing_index === undefined) {
                seen_at.set(item.key, result.length);
                result.push(item);
            }
            else {
                result[existing_index] = item;
            }
        }
        return result;
    }
    /*********
     *
     *  Compile a machine's JSON intermediate representation to a config object.  If
     *  you're using this (probably don't,) you're probably also using
     *  {@link parse} to get the IR, and the object constructor
     *  {@link Machine.constructor} to turn the config object into a workable machine.
     *
     *  ```typescript
     *  import { parse, compile, Machine } from 'jssm';
     *
     *  const intermediate = parse('a -> b;');
     *  // [ {key:'transition', from:'a', se:{kind:'->',to:'b'}} ]
     *
     *  const cfg = compile(intermediate);
     *  // { start_states:['a'], transitions: [{ from:'a', to:'b', kind:'legal', forced_only:false, main_path:false }] }
     *
     *  const machine = new Machine(cfg);
     *  // Machine { _instance_name: undefined, _state: 'a', ...
     *  ```
     *
     *  This method is mostly for plugin and intermediate tool authors, or people
     *  who need to work with the machine's intermediate representation.
     *
     *  ## Source-location-aware error reporting
     *
     *  `compile()` ignores `loc` and `*_loc` fields during machine construction —
     *  the resulting config is identical whether or not the tree was parsed with
     *  `{ locations: true }`.  However, when those fields are present, `compile()`
     *  attaches the offending node's source span to any semantic {@link JssmError}
     *  it throws, via the error's `source_location` field
     *  (type {@link FslSourceLocation}).  This lets downstream tooling (e.g. a
     *  CodeMirror 6 linter) map the error to a precise editor range without any
     *  additional source-scanning.
     *
     *  ```typescript
     *  import { parse, compile } from 'jssm';
     *
     *  try {
     *    compile(parse('fsl_version: 1.0.0;\nfsl_version: 2.0.0;\na -> b;',
     *                  { locations: true }));
     *  } catch (err) {
     *    // err.source_location.start.offset points at the second fsl_version line
     *    console.log(err.source_location);
     *  }
     *  ```
     *
     *  @see {@link FslSourceLocation}
     *
     *  # Hey!
     *
     *  Most people looking at this want either the `sm` operator or method `from`,
     *  which perform all the steps in the chain.  The library's author mostly uses
     *  operator `sm`, and mostly falls back to `.from` when needing to parse
     *  strings dynamically instead of from template literals.
     *
     *  Operator {@link sm}:
     *
     *  ```typescript
     *  import { sm } from 'jssm';
     *
     *  const lswitch = sm`on <=> off;`;
     *  ```
     *
     *  Method {@link from}:
     *
     *  ```typescript
     *  import * as jssm from 'jssm';
     *
     *  const toggle = jssm.from('up <=> down;');
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param tree The parse tree to be boiled down into a machine config.  If the
     *              tree was produced with `parse(input, { locations: true })`, any
     *              semantic error thrown will carry a `source_location` span
     *              pointing at the offending statement.
     *
     *  @throws {JssmError} If the document declares no transitions (for example a
     *                      states-first document of only `state` blocks) — a
     *                      machine requires at least one transition; also for
     *                      repeated property definitions, group errors, and other
     *                      semantic problems noted throughout.
     *
     */
    function compile(tree) {
        const results = {
            graph_layout: [],
            graph_bg_color: [],
            transition: [],
            start_states: [],
            end_states: [],
            failed_outputs: [],
            state_config: [],
            state_declaration: [],
            fsl_version: [],
            machine_author: [],
            machine_comment: [],
            machine_contributor: [],
            machine_definition: [],
            machine_language: [],
            machine_license: [],
            machine_name: [],
            machine_reference: [],
            npm_name: [],
            default_size: [],
            property_definition: [],
            val_definition: [],
            state_property: {},
            theme: [],
            flow: [],
            dot_preamble: [],
            arrange_declaration: [],
            arrange_start_declaration: [],
            arrange_end_declaration: [],
            oarrange_declaration: [],
            farrange_declaration: [],
            machine_version: [],
            default_state_config: [],
            default_active_state_config: [],
            default_hooked_state_config: [],
            default_terminal_state_config: [],
            default_start_state_config: [],
            default_end_state_config: [],
            default_transition_config: [],
            default_graph_config: [],
            named_list: [],
            group_metadata: [],
            hook_decl: [],
            allows_override: [],
            allow_islands: [],
            editor_config: []
        };
        // Build the ordered group registry, reject membership cycles and undeclared
        // sub-group members, then resolve/rewrite group references — group targets
        // fan out through the existing list-target machinery and group sources fan
        // out into per-member transition nodes (tagged for conflict resolution).
        // All before the main rule walk, so forward references resolve.
        const group_registry = build_group_registry(tree);
        group_registry_cycle_check(group_registry);
        validate_group_members(group_registry);
        const resolved_tree = resolve_group_refs(tree, group_registry);
        // Accumulate by in-place push, not `results[agg_as].concat(val)`: concat
        // recopies and reallocates the whole bucket per rule, which made this loop
        // O(n^2) over edge-heavy machines — two-thirds of construct() self-time
        // (#700).  Array-valued rules spread one level, matching concat's behavior.
        for (const tr of resolved_tree) {
            const rule = compile_rule_handler(tr), val = rule.val, // TODO FIXME no any
            bucket = results[rule.agg_as];
            if (Array.isArray(val)) {
                for (const v of val) {
                    bucket.push(v);
                }
            }
            else {
                bucket.push(val);
            }
        }
        const property_keys = results['property_definition'].map(pd => pd.name), repeat_props = find_repeated(property_keys);
        if (repeat_props.length > 0) {
            const dup = repeat_props[0][0];
            throw new JssmError(undefined, `Cannot repeat property definitions.  Saw ${JSON.stringify(repeat_props)}`, { source_location: nth_matching_loc(tree, (n) => n.key === 'property_definition' && n.name === dup, 2) });
        }
        const val_keys = results['val_definition'].map(vd => vd.name), repeat_vals = find_repeated(val_keys);
        if (repeat_vals.length > 0) {
            const dup = repeat_vals[0][0];
            throw new JssmError(undefined, `Cannot redefine val names.  Saw ${JSON.stringify(repeat_vals)}`, { source_location: nth_matching_loc(tree, (n) => n.key === 'val_definition' && n.name === dup, 2) });
        }
        // a val and a property may not share a name (megaspec §5; jssm#757)
        const val_prop_collisions = val_keys.filter(name => property_keys.includes(name));
        if (val_prop_collisions.length > 0) {
            const dup = val_prop_collisions[0];
            throw new JssmError(undefined, `A val and a property cannot share the name ${JSON.stringify(dup)}.  Saw collisions ${JSON.stringify(val_prop_collisions)}`, { source_location: nth_matching_loc(tree, (n) => n.key === 'val_definition' && n.name === dup, 1) });
        }
        // The accumulator is already flat (#700's per-rule push spreads one level)
        // and function-local, so it is passed straight to conflict arbitration —
        // never via `[].concat(...)`, whose argument-list spread is bounded by the
        // engine's maximum argument count and threw RangeError near 65k transition
        // statements (#703).  Arbitration settles group-expanded edges competing
        // for the same (source_state, action) by depth-specificity before any
        // further processing (the runtime would otherwise reject the duplicates).
        const assembled_transitions = resolve_transition_conflicts(results['transition'], group_registry.size > 0);
        // A machine with no transitions cannot be constructed (and previously
        // crashed right here with a raw TypeError reading `[0].from`).  This is a
        // natural mid-authoring document shape — state blocks first, wiring later —
        // and the editor's lint shows this message verbatim, so name the actual
        // problem instead of leaking an internal error.
        if (assembled_transitions.length === 0) {
            throw new JssmError(undefined, 'This machine has no transitions, only declarations; a machine requires at least one transition (like `a -> b;`)');
        }
        const result_cfg = {
            start_states: results.start_states.length > 0 ? results.start_states : [assembled_transitions[0].from],
            end_states: results.end_states,
            failed_outputs: results.failed_outputs,
            transitions: assembled_transitions,
            state_property: [],
        };
        // Carry the ordered group registry through to the machine config, but only
        // when groups were actually declared, so group-free machines are unchanged.
        if (group_registry.size > 0) {
            result_cfg.group_registry = group_registry;
        }
        // Group metadata: each `state &g : { … }` block becomes one per-group
        // JssmStateConfig entry, keyed by group name and NOT fanned out to members,
        // so the runtime cascade can resolve it with depth-specificity later.
        if (results.group_metadata.length > 0) {
            const group_metadata = new Map();
            for (const gm of results.group_metadata) { // TODO FIXME no any
                group_metadata.set(gm.group, { declarations: gm.declarations });
            }
            result_cfg.group_metadata = group_metadata;
        }
        // Boundary hooks: route each `on enter|exit <subject> do '<action>';` into
        // group_hooks (group subject) or state_hooks (plain-state subject), merging
        // an enter and an exit declaration for the same subject into one entry.
        if (results.hook_decl.length > 0) {
            const group_hooks = new Map();
            const state_hooks = new Map();
            const merge_hook = (table, subject, event, action) => {
                var _a;
                const existing = (_a = table.get(subject)) !== null && _a !== void 0 ? _a : {};
                if (event === 'enter') {
                    existing.onEnter = action;
                }
                else {
                    existing.onExit = action;
                }
                table.set(subject, existing);
            };
            for (const decl of results.hook_decl) { // TODO FIXME no any
                if (is_group_ref(decl.subject)) {
                    merge_hook(group_hooks, decl.subject.name, decl.event, decl.action);
                }
                else {
                    merge_hook(state_hooks, decl.subject, decl.event, decl.action);
                }
            }
            if (group_hooks.size > 0) {
                result_cfg.group_hooks = group_hooks;
            }
            if (state_hooks.size > 0) {
                result_cfg.state_hooks = state_hooks;
            }
        }
        const oneOnlyKeys = [
            'graph_layout', 'graph_bg_color', 'machine_name', 'machine_version',
            'machine_comment', 'fsl_version', 'machine_license', 'machine_definition',
            'machine_language', 'flow', 'dot_preamble', 'allows_override', 'allow_islands',
            'npm_name', 'default_size'
        ];
        for (const oneOnlyKey of oneOnlyKeys) {
            if (results[oneOnlyKey].length > 1) {
                throw new JssmError(undefined, `May only have one ${oneOnlyKey} statement maximum: ${JSON.stringify(results[oneOnlyKey])}`, { source_location: nth_matching_loc(tree, (n) => n.key === oneOnlyKey, 2) });
            }
            if (results[oneOnlyKey].length > 0) {
                result_cfg[oneOnlyKey] = results[oneOnlyKey][0];
            }
        }
        const multiKeys = [
            'arrange_declaration', 'arrange_start_declaration', 'arrange_end_declaration',
            'oarrange_declaration', 'farrange_declaration',
            'machine_author', 'machine_contributor', 'machine_reference', 'theme',
            'state_declaration', 'property_definition', 'val_definition', 'default_state_config',
            'default_start_state_config', 'default_end_state_config',
            'default_hooked_state_config', 'default_terminal_state_config',
            'default_active_state_config', 'default_transition_config'
        ];
        for (const multiKey of multiKeys) {
            if (results[multiKey].length > 0) {
                result_cfg[multiKey] = results[multiKey];
            }
        }
        result_cfg.default_graph_config = fold_graph_config({
            graph_layout: results.graph_layout,
            graph_bg_color: results.graph_bg_color,
            dot_preamble: results.dot_preamble,
            theme: results.theme,
            flow: results.flow
        }, results.default_graph_config);
        if (result_cfg.default_graph_config.length === 0) {
            delete result_cfg.default_graph_config;
        }
        // Fold the `editor: {}` block's flat items into one object the web control
        // reads (fsl#1334). The grammar only emits the two whitelisted keys, so the
        // `else` is `panels`.
        if (results.editor_config.length > 0) {
            const ec = {};
            for (const item of results.editor_config) {
                if (item.key === 'stochastic_run_count') {
                    ec.stochastic_run_count = item.value;
                }
                else {
                    ec.panels = item.value;
                }
            }
            result_cfg.editor_config = ec;
        }
        // re-walk state declarations, already wrapped up, to get state properties,
        // which go out in a different datastructure
        // Registers one state block declaration as a state property binding, when
        // it is one; throws on a duplicate (state, property) pair.
        const register_state_property = (sd, decl) => {
            if (decl.key !== 'state_property') {
                return;
            }
            const label = name_bind_prop_and_state(decl.name, sd.state);
            if (result_cfg.state_property.some(c => c.name === label)) {
                throw new JssmError(undefined, `A state may only bind a property once (${sd.state} re-binds ${decl.name})`, { source_location: nth_matching_loc(tree, (n) => n.key === 'state_declaration' && n.name === sd.state, 1) });
            }
            // property/state carry the unserialized pair so the constructor can
            // validate bindings without JSON.parse-ing label back apart (#734)
            result_cfg.state_property.push({ name: label, default_value: decl.value, property: decl.name, state: sd.state });
        };
        for (const sd of results.state_declaration) {
            for (const decl of sd.declarations) {
                register_state_property(sd, decl);
            }
        }
        return result_cfg;
    }
    /*********
     *
     *  An internal convenience wrapper for parsing then compiling a machine string.
     *  Not generally meant for external use.  Please see {@link compile} or
     *  {@link sm}.
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param plan The FSL code to be evaluated and built into a machine config
     *
     */
    function make(plan) {
        return compile(wrap_parse(plan));
    }

    /**
     * Canonical (RFC 8785 / JCS) serialization — the byte-stable string that makes
     * hashing a config or tape well-defined. Locale-independent by construction:
     * object keys are sorted by UTF-16 code unit, never via locale-aware APIs.
     * @see https://www.rfc-editor.org/rfc/rfc8785
     */
    const CANONICAL_FORMAT_VERSION = 1;
    /**
     * UTF-16 code-unit key comparator — RFC 8785's exact key order, identical to
     * the default comparator-less `Array.prototype.sort` over an all-string array.
     * Locale-aware APIs (`localeCompare`, `Intl`) are deliberately never used, so
     * the canonical output can never depend on the host locale.
     * @param a - The left key.
     * @param b - The right key.
     * @returns `-1`, `0`, or `1` as `a` sorts before, equal to, or after `b`.
     * @example
     *   ['b', 'a', 'Z'].sort(code_unit_compare);   // ['Z', 'a', 'b']
     */
    function code_unit_compare(a, b) {
        if (a < b) {
            return -1;
        }
        if (a > b) {
            return 1;
        }
        return 0;
    }
    /**
     * Serialize `value` to RFC 8785 canonical JSON.
     * @param value - Any JSON-serializable value (object keys are sorted; arrays
     *   keep order; `undefined` object values are omitted).
     * @returns The canonical JSON string (no insignificant whitespace).
     * @example
     *   canonicalize({ b: 1, a: 2 });   // '{"a":2,"b":1}'
     */
    function canonicalize(value) {
        if (value === null || typeof value !== 'object') {
            return JSON.stringify(value); // RFC 8785 number/string/bool/null formatting = JSON.stringify in ES
        }
        if (Array.isArray(value)) {
            return '[' + value.map(v => canonicalize(v === undefined ? null : v)).join(',') + ']';
        }
        const obj = value;
        // code_unit_compare orders by UTF-16 code unit per the ECMAScript spec —
        // locale-independent and exactly RFC 8785's rule. localeCompare/Intl are
        // deliberately NOT used, so the output never depends on the host locale.
        const keys = Object.keys(obj).filter(k => obj[k] !== undefined).sort(code_unit_compare);
        return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
    }
    /**
     * The canonical config-identity string of a run's final configuration: the
     * version tag, state, and data. Replay-derivable; the unit M6 will hash.
     * @param state - The machine's final state.
     * @param data - The machine's final extended data.
     * @returns The canonical `{v, state, data}` string.
     * @example
     *   canonical_config('Locked', { n: 1 }); // '{"data":{"n":1},"state":"Locked","v":1}'
     */
    function canonical_config(state, data) {
        return canonicalize({ v: CANONICAL_FORMAT_VERSION, state, data });
    }

    const base_state_style$5 = {
        shape: 'rectangle',
        backgroundColor: 'white',
        textColor: 'black',
        borderColor: 'black'
    };
    const base_active_state_style$5 = {
        textColor: 'white',
        backgroundColor: 'dodgerblue4'
    };
    const base_hooked_state_style$5 = {
        shape: 'component'
    };
    const base_terminal_state_style$5 = {
        textColor: 'white',
        backgroundColor: 'crimson'
    };
    const base_active_terminal_state_style$4 = {
        textColor: 'white',
        backgroundColor: 'indigo'
    };
    const base_start_state_style$5 = {
        backgroundColor: 'yellow'
    };
    const base_active_start_state_style$4 = {
        backgroundColor: 'yellowgreen'
    };
    const base_active_hooked_state_style$4 = {
        backgroundColor: 'yellowgreen'
    };
    const base_end_state_style$5 = {
        textColor: 'white',
        backgroundColor: 'darkolivegreen'
    };
    const base_active_end_state_style$4 = {
        textColor: 'white',
        backgroundColor: 'darkgreen'
    };
    const default_theme = {
        name: 'default',
        state: base_state_style$5,
        start: base_start_state_style$5,
        end: base_end_state_style$5,
        terminal: base_terminal_state_style$5,
        hooked: base_hooked_state_style$5,
        active: base_active_state_style$5,
        active_start: base_active_start_state_style$4,
        active_end: base_active_end_state_style$4,
        active_terminal: base_active_terminal_state_style$4,
        active_hooked: base_active_hooked_state_style$4,
        legal: undefined, // TODO FIXME
        main: undefined, // TODO FIXME
        forced: undefined, // TODO FIXME
        action: undefined, // TODO FIXME
        graph: undefined, // TODO FIXME
        title: undefined // TODO FIXME
    };

    const base_state_style$4 = {
        shape: 'rectangle',
        backgroundColor: 'khaki',
        textColor: 'black',
        borderColor: 'black'
    };
    const base_active_state_style$4 = {
        textColor: 'white',
        backgroundColor: 'dodgerblue4'
    };
    const base_hooked_state_style$4 = {
        shape: 'component'
    };
    const base_terminal_state_style$4 = {
        textColor: 'white',
        backgroundColor: 'crimson'
    };
    const base_active_terminal_state_style$3 = {
        textColor: 'white',
        backgroundColor: 'indigo'
    };
    const base_start_state_style$4 = {
        backgroundColor: 'yellow'
    };
    const base_active_start_state_style$3 = {
        backgroundColor: 'yellowgreen'
    };
    const base_active_hooked_state_style$3 = {
        backgroundColor: 'yellowgreen'
    };
    const base_end_state_style$4 = {
        textColor: 'white',
        backgroundColor: 'darkolivegreen'
    };
    const base_active_end_state_style$3 = {
        textColor: 'white',
        backgroundColor: 'darkgreen'
    };
    const modern_theme = {
        name: 'modern',
        state: base_state_style$4,
        start: base_start_state_style$4,
        end: base_end_state_style$4,
        terminal: base_terminal_state_style$4,
        hooked: base_hooked_state_style$4,
        active: base_active_state_style$4,
        active_start: base_active_start_state_style$3,
        active_end: base_active_end_state_style$3,
        active_terminal: base_active_terminal_state_style$3,
        active_hooked: base_active_hooked_state_style$3,
        legal: undefined, // TODO FIXME
        main: undefined, // TODO FIXME
        forced: undefined, // TODO FIXME
        action: undefined, // TODO FIXME
        graph: undefined, // TODO FIXME
        title: undefined // TODO FIXME
    };

    const base_state_style$3 = {
        backgroundColor: 'cadetblue1',
    };
    const base_active_state_style$3 = {
        textColor: 'white',
        backgroundColor: 'deepskyblue'
    };
    const base_hooked_state_style$3 = {
        shape: 'component',
        backgroundColor: 'mediumaquamarine'
    };
    const base_terminal_state_style$3 = {
        textColor: 'white',
        backgroundColor: 'darkviolet'
    };
    const base_active_terminal_state_style$2 = {
        textColor: 'white',
        backgroundColor: 'deeppink'
    };
    const base_start_state_style$3 = {
        backgroundColor: 'darkseagreen1'
    };
    const base_active_start_state_style$2 = {
        backgroundColor: 'aquamarine'
    };
    const base_active_hooked_state_style$2 = {
        backgroundColor: 'aquamarine'
    };
    const base_end_state_style$3 = {
        textColor: 'white',
        backgroundColor: 'chartreuse1'
    };
    const base_active_end_state_style$2 = {
        textColor: 'white',
        backgroundColor: 'darkgreen'
    };
    const ocean_theme = {
        name: 'ocean',
        state: base_state_style$3,
        start: base_start_state_style$3,
        end: base_end_state_style$3,
        terminal: base_terminal_state_style$3,
        hooked: base_hooked_state_style$3,
        active: base_active_state_style$3,
        active_start: base_active_start_state_style$2,
        active_end: base_active_end_state_style$2,
        active_terminal: base_active_terminal_state_style$2,
        active_hooked: base_active_hooked_state_style$2,
        legal: undefined, // TODO FIXME
        main: undefined, // TODO FIXME
        forced: undefined, // TODO FIXME
        action: undefined, // TODO FIXME
        graph: undefined, // TODO FIXME
        title: undefined // TODO FIXME
    };

    const base_state_style$2 = {
        textColor: 'black',
        backgroundColor: 'transparent',
        shape: 'plaintext'
    };
    const base_active_state_style$2 = {
        textColor: 'black',
        backgroundColor: 'transparent',
        shape: 'plaintext'
    };
    const base_hooked_state_style$2 = {
        textColor: 'black',
        backgroundColor: 'transparent',
        shape: 'plaintext'
    };
    const base_terminal_state_style$2 = {
        textColor: 'black',
        backgroundColor: 'transparent',
        shape: 'plaintext'
    };
    const base_active_terminal_state_style$1 = {
        textColor: 'black',
        backgroundColor: 'transparent',
        shape: 'plaintext'
    };
    const base_start_state_style$2 = {
        textColor: 'black',
        backgroundColor: 'transparent',
        shape: 'plaintext'
    };
    const base_active_start_state_style$1 = {
        textColor: 'black',
        backgroundColor: 'transparent',
        shape: 'plaintext'
    };
    const base_active_hooked_state_style$1 = {
        textColor: 'black',
        backgroundColor: 'transparent',
        shape: 'plaintext'
    };
    const base_end_state_style$2 = {
        textColor: 'black',
        backgroundColor: 'transparent',
        shape: 'plaintext'
    };
    const base_active_end_state_style$1 = {
        textColor: 'black',
        backgroundColor: 'transparent',
        shape: 'plaintext'
    };
    const plain_theme = {
        name: 'plain',
        state: base_state_style$2,
        start: base_start_state_style$2,
        end: base_end_state_style$2,
        terminal: base_terminal_state_style$2,
        hooked: base_hooked_state_style$2,
        active: base_active_state_style$2,
        active_start: base_active_start_state_style$1,
        active_end: base_active_end_state_style$1,
        active_terminal: base_active_terminal_state_style$1,
        active_hooked: base_active_hooked_state_style$1,
        legal: undefined, // TODO FIXME
        main: undefined, // TODO FIXME
        forced: undefined, // TODO FIXME
        action: undefined, // TODO FIXME
        graph: undefined, // TODO FIXME
        title: undefined // TODO FIXME
    };

    const base_state_style$1 = {
        shape: 'rectangle',
        backgroundColor: 'khaki',
        textColor: 'black',
        borderColor: 'black'
    };
    const base_active_state_style$1 = {
        textColor: 'white',
        backgroundColor: 'dodgerblue4'
    };
    const base_hooked_state_style$1 = {
        shape: 'component'
    };
    const base_terminal_state_style$1 = {
        textColor: 'white',
        backgroundColor: 'crimson'
    };
    const base_active_terminal_state_style = {
        textColor: 'white',
        backgroundColor: 'indigo'
    };
    const base_start_state_style$1 = {
        backgroundColor: 'yellow'
    };
    const base_active_start_state_style = {
        backgroundColor: 'yellowgreen'
    };
    const base_active_hooked_state_style = {
        backgroundColor: 'yellowgreen'
    };
    const base_end_state_style$1 = {
        textColor: 'white',
        backgroundColor: 'darkolivegreen'
    };
    const base_active_end_state_style = {
        textColor: 'white',
        backgroundColor: 'darkgreen'
    };
    const bold_theme = {
        name: 'bold',
        state: base_state_style$1,
        start: base_start_state_style$1,
        end: base_end_state_style$1,
        terminal: base_terminal_state_style$1,
        hooked: base_hooked_state_style$1,
        active: base_active_state_style$1,
        active_start: base_active_start_state_style,
        active_end: base_active_end_state_style,
        active_terminal: base_active_terminal_state_style,
        active_hooked: base_active_hooked_state_style,
        legal: undefined, // TODO FIXME
        main: undefined, // TODO FIXME
        forced: undefined, // TODO FIXME
        action: undefined, // TODO FIXME
        graph: undefined, // TODO FIXME
        title: undefined // TODO FIXME
    };

    const base_state_style = {
        shape: 'rectangle',
        backgroundColor: 'white',
        textColor: 'black',
        borderColor: 'black'
    };
    const base_active_state_style = {
        textColor: 'white',
        backgroundColor: 'dodgerblue4'
    };
    const base_hooked_state_style = {
        shape: 'component'
    };
    const base_terminal_state_style = {
        textColor: 'white',
        backgroundColor: 'crimson'
    };
    const base_start_state_style = {
        backgroundColor: 'yellow'
    };
    const base_end_state_style = {
        textColor: 'white',
        backgroundColor: 'darkolivegreen'
    };
    const base_theme = {
        state: base_state_style,
        start: base_start_state_style,
        end: base_end_state_style,
        terminal: base_terminal_state_style,
        hooked: base_hooked_state_style,
        active: base_active_state_style};

    /*******
     *
     *  Registry mapping theme names to their stylesheet definitions.  Each entry
     *  maps an {@link FslTheme} string (e.g. `'default'`, `'ocean'`) to a
     *  {@link JssmBaseTheme} object containing colors, shapes, and other visual
     *  defaults used by jssm-viz when rendering state machine diagrams.
     *
     *  Add new themes by importing their definition and calling
     *  `theme_mapping.set(name, theme)`.
     *
     */
    const theme_mapping = new Map([['default', default_theme], ['modern', modern_theme], ['ocean', ocean_theme], ['plain', plain_theme], ['bold', bold_theme]]);

    /**
     * String interning support for the jssm machine internals.
     *
     * State and action names are interned to dense integer ids at machine
     * construction so that per-transition dispatch can use numeric map keys
     * (integer hashing) instead of repeated string-keyed lookups.  Internal
     * machinery only — deliberately not re-exported from the `jssm` public
     * surface, so the public API is unchanged.
     * @internal
     */
    /**
     * A string↔integer bimap.  Assigns dense ids (0, 1, 2, …) in first-seen
     * order; lookups are O(1) both directions.  Grows monotonically — there is
     * no removal, matching machine semantics (states and actions are fixed
     * after construction; late interning only happens for never-matching
     * lookups such as hook registrations naming unknown states).
     * @example
     *   const i = new Interner();
     *   i.intern('red');     // 0
     *   i.intern('green');   // 1
     *   i.intern('red');     // 0  (idempotent)
     *   i.id_of('green');    // 1
     *   i.name_of(0);        // 'red'
     * @see pair_key
     */
    class Interner {
        constructor() {
            this.ids = new Map();
            this.names = [];
        }
        /**
         * Return the id for `name`, assigning the next dense id if the name has
         * not been seen before.
         * @param name - The string to intern.
         * @returns The (possibly newly assigned) integer id.
         * @example
         *   interner.intern('red');  // 0 on first call, 0 on every later call
         */
        intern(name) {
            const existing = this.ids.get(name);
            if (existing !== undefined) {
                return existing;
            }
            const id = this.names.length;
            this.ids.set(name, id);
            this.names.push(name);
            return id;
        }
        /**
         * Return the id for `name` without interning, or `undefined` when the
         * name has never been interned.  This is the hot-path probe for
         * user-supplied names.
         * @param name - The string to look up.
         * @example
         *   interner.id_of('mauve');  // undefined — never interned
         */
        id_of(name) {
            return this.ids.get(name);
        }
        /**
         * Return the name for `id`, or `undefined` for an id never assigned.
         * @param id - The integer id to invert.
         * @example
         *   interner.name_of(0);  // 'red'
         */
        name_of(id) {
            return this.names[id];
        }
        /** The count of distinct interned names. */
        get size() {
            return this.names.length;
        }
    }
    /**
     * Szudzik pairing: packs two non-negative integers into one unique number,
     * order-sensitively, with no dependence on a fixed table size — so interners
     * may keep growing without invalidating existing keys.  Values stay exact
     * for ids below 2^26 (the result is bounded by roughly max(a,b)^2), far
     * beyond any real machine's state count.
     *
     * NaN deliberately propagates: probing with an unknown name's id
     * (`id_of(...) ?? NaN`) yields a NaN key, which can never match a stored
     * key, so the lookup misses — exactly the behavior of the string-keyed maps
     * it replaces.  Do NOT use a negative sentinel instead: Szudzik is only
     * injective over the naturals, and a negative input can collide with a real
     * stored key (e.g. szudzik(-1, 2) === szudzik(1, 1) === 3), which would make
     * lookups from an unknown state falsely succeed.
     * @param a - First non-negative integer (or NaN as a deliberate miss).
     * @param b - Second non-negative integer (or NaN as a deliberate miss).
     * @returns A number unique to the ordered pair `(a, b)` over the naturals.
     * @example
     *   pair_key(2, 5);  // 27
     *   pair_key(5, 2);  // 32 — order-sensitive
     * @see Interner
     */
    function pair_key(a, b) {
        return (a >= b)
            ? (a * a) + a + b
            : (b * b) + a;
    }
    /**
     * Inverse of {@link pair_key}: recovers the ordered pair `(a, b)` that was
     * packed into a Szudzik key.  Exact for any key produced by `pair_key` over
     * non-negative integer inputs, so `un_pair_key(pair_key(a, b))` round-trips
     * to `[a, b]`.  Used to walk interned, pair-keyed maps (e.g. the hook tables)
     * back to their original `(from_id, to_id)` ids for {@link Interner.name_of}.
     *
     * Behavior is only defined for keys `pair_key` actually emits; a NaN key (the
     * unknown-name sentinel) yields `[NaN, NaN]`, never a spurious real pair.
     * @param z - A key produced by `pair_key`.
     * @returns The ordered pair `[a, b]` such that `pair_key(a, b) === z`.
     * @example
     *   un_pair_key(27);  // [2, 5]
     *   un_pair_key(32);  // [5, 2] — order preserved
     * @see pair_key
     */
    function un_pair_key(z) {
        const s = Math.floor(Math.sqrt(z));
        const l = z - (s * s);
        return (l < s) ? [l, s] : [s, l - s];
    }

    /*******
     *
     *  Convenience aliases for common mathematical and numeric constants from
     *  `Number` and `Math`.  Re-exported so that FSL data expressions and tests
     *  can reference them without importing `Math` directly.
     *
     *  Includes: `NegInfinity`, `PosInfinity`, `Epsilon`, `Pi`, `E`, `Root2`,
     *  `RootHalf`, `Ln2`, `Ln10`, `Log2E`, `Log10E`, `MaxSafeInt`, `MinSafeInt`,
     *  `MaxPosNum`, `MinPosNum`, `Phi` (golden ratio), `EulerC` (Euler–Mascheroni).
     *
     */
    const NegInfinity = -Infinity, PosInfinity = Infinity, Epsilon = Number.EPSILON, Pi = Math.PI, E = Math.E, Root2 = Math.SQRT2, RootHalf = Math.SQRT1_2, Ln2 = Math.LN2, Ln10 = Math.LN10, Log2E = Math.LOG2E, Log10E = Math.LOG10E, MaxSafeInt = Number.MAX_SAFE_INTEGER, MinSafeInt = Number.MIN_SAFE_INTEGER, MaxPosNum = Number.MAX_VALUE, MinPosNum = Number.MIN_VALUE, 
    // written as the exact double each historic longer literal
    // already rounded to — same bits at runtime
    Phi = 1.618033988749895, EulerC = 0.5772156649015329;
    /*******
     *
     *  Complete list of node shapes supported by Graphviz.  Used by jssm-viz to
     *  validate and render state shapes in FSL `state ... : { shape: ... }` blocks.
     *
     *  `shapes` is an alias for `gviz_shapes`.
     *
     */
    const gviz_shapes$1 = [
        "box3d",
        "polygon",
        "ellipse",
        "oval",
        "circle",
        "point",
        "egg",
        "triangle",
        "plaintext",
        "plain",
        "diamond",
        "trapezium",
        "parallelogram",
        "house",
        "pentagon",
        "hexagon",
        "septagon",
        "octagon",
        "doublecircle",
        "doubleoctagon",
        "tripleoctagon",
        "invtriangle",
        "invtrapezium",
        "invhouse",
        "Mdiamond",
        "Msquare",
        "Mcircle",
        "rectangle",
        "rect",
        "square",
        "star",
        "none",
        "underline",
        "cylinder",
        "note",
        "tab",
        "folder",
        "box",
        "component",
        "promoter",
        "cds",
        "terminator",
        "utr",
        "primersite",
        "restrictionsite",
        "fivepoverhang",
        "threepoverhang",
        "noverhang",
        "assembly",
        "signature",
        "insulator",
        "ribosite",
        "rnastab",
        "proteasesite",
        "proteinstab",
        "rpromoter",
        "rarrow",
        "larrow",
        "lpromoter",
        "record"
    ];
    /**
     *  Public alias for {@link gviz_shapes}.  The list of node shapes supported
     *  by Graphviz that jssm-viz accepts in FSL `state ... : { shape: ... }`
     *  declarations.
     */
    const shapes$1 = gviz_shapes$1;
    /*******
     *
     *  List of CSS/SVG named colors accepted by jssm-viz for state styling
     *  properties like `background-color` and `text-color`.  Case-insensitive
     *  matching is done at parse time; the canonical casing here follows the
     *  CSS specification.
     *
     */
    const named_colors$1 = [
        "AliceBlue", "AntiqueWhite", "Aqua", "Aquamarine", "Azure", "Beige",
        "Bisque", "Black", "BlanchedAlmond", "Blue", "BlueViolet", "Brown",
        "BurlyWood", "CadetBlue", "Chartreuse", "Chocolate", "Coral",
        "CornflowerBlue", "Cornsilk", "Crimson", "Cyan", "DarkBlue", "DarkCyan",
        "DarkGoldenRod", "DarkGray", "DarkGrey", "DarkGreen", "DarkKhaki",
        "DarkMagenta", "DarkOliveGreen", "Darkorange", "DarkOrchid", "DarkRed",
        "DarkSalmon", "DarkSeaGreen", "DarkSlateBlue", "DarkSlateGray",
        "DarkSlateGrey", "DarkTurquoise", "DarkViolet", "DeepPink", "DeepSkyBlue",
        "DimGray", "DimGrey", "DodgerBlue", "FireBrick", "FloralWhite", "ForestGreen",
        "Fuchsia", "Gainsboro", "GhostWhite", "Gold", "GoldenRod", "Gray", "Grey",
        "Green", "GreenYellow", "HoneyDew", "HotPink", "IndianRed", "Indigo", "Ivory",
        "Khaki", "Lavender", "LavenderBlush", "LawnGreen", "LemonChiffon",
        "LightBlue", "LightCoral", "LightCyan", "LightGoldenRodYellow", "LightGray",
        "LightGrey", "LightGreen", "LightPink", "LightSalmon", "LightSeaGreen",
        "LightSkyBlue", "LightSlateGray", "LightSlateGrey", "LightSteelBlue",
        "LightYellow", "Lime", "LimeGreen", "Linen", "Magenta", "Maroon",
        "MediumAquaMarine", "MediumBlue", "MediumOrchid", "MediumPurple",
        "MediumSeaGreen", "MediumSlateBlue", "MediumSpringGreen", "MediumTurquoise",
        "MediumVioletRed", "MidnightBlue", "MintCream", "MistyRose", "Moccasin",
        "NavajoWhite", "Navy", "OldLace", "Olive", "OliveDrab", "Orange", "OrangeRed",
        "Orchid", "PaleGoldenRod", "PaleGreen", "PaleTurquoise", "PaleVioletRed",
        "PapayaWhip", "PeachPuff", "Peru", "Pink", "Plum", "PowderBlue", "Purple",
        "Red", "RosyBrown", "RoyalBlue", "SaddleBrown", "Salmon", "SandyBrown",
        "SeaGreen", "SeaShell", "Sienna", "Silver", "SkyBlue", "SlateBlue",
        "SlateGray", "SlateGrey", "Snow", "SpringGreen", "SteelBlue", "Tan", "Teal",
        "Thistle", "Tomato", "Transparent", "Turquoise", "Violet", "Wheat", "White", "WhiteSmoke",
        "Yellow", "YellowGreen"
    ];
    /*******
     *
     *  Character ranges accepted by the FSL grammar for identifier and label
     *  tokens.  Each entry is an inclusive `{from, to}` range of single Unicode
     *  characters.  Single-character entries (e.g. `.`) appear with `from === to`.
     *
     *  These are intended for tooling, validators, and editors that need to know
     *  which characters are legal in a given FSL token position without re-parsing
     *  the PEG grammar.
     *
     */
    /**
     *  Inclusive character ranges accepted by `AtomLetter` — i.e., the characters
     *  legal in any but the first position of an FSL state name (atom).
     *
     *  Includes ASCII digits/letters and the symbols
     *  `.`, `+`, `_`, `^`, `(`, `)`, `*`, `&`, `$`, `#`, `@`, `!`, `?`, `,`,
     *  plus the high-Unicode range `U+0080`–`U+FFFF`.
     *  @example
     *  import { state_name_chars } from 'jssm';
     *  state_name_chars.some(r => 'A' >= r.from && 'A' <= r.to);  // => true
     */
    // keep in sync with src/ts/fsl_parser.peg:267
    const state_name_chars$1 = Object.freeze([
        { from: '0', to: '9' },
        { from: 'a', to: 'z' },
        { from: 'A', to: 'Z' },
        { from: '.', to: '.' },
        { from: '+', to: '+' },
        { from: '_', to: '_' },
        { from: '^', to: '^' },
        { from: '(', to: '(' },
        { from: ')', to: ')' },
        { from: '*', to: '*' },
        { from: '&', to: '&' },
        { from: '$', to: '$' },
        { from: '#', to: '#' },
        { from: '@', to: '@' },
        { from: '!', to: '!' },
        { from: '?', to: '?' },
        { from: ',', to: ',' },
        { from: '\u{80}', to: '\u{FFFF}' },
    ]);
    /**
     *  Inclusive character ranges accepted by `AtomFirstLetter` — i.e., the
     *  characters legal in the first position of an FSL state name (atom).
     *
     *  Notably narrower than {@link state_name_chars}: omits `+`, `(`, `)`, `&`,
     *  `#`, `@`.  Includes ASCII digits/letters, `.`, `_`, `!`, `$`, `^`, `*`,
     *  `?`, `,`, and the high-Unicode range `U+0080`–`U+FFFF`.
     *  @example
     *  import { state_name_first_chars } from 'jssm';
     *  state_name_first_chars.some(r => '+' >= r.from && '+' <= r.to);  // => false
     */
    // keep in sync with src/ts/fsl_parser.peg:264
    const state_name_first_chars$1 = Object.freeze([
        { from: '0', to: '9' },
        { from: 'a', to: 'z' },
        { from: 'A', to: 'Z' },
        { from: '.', to: '.' },
        { from: '_', to: '_' },
        { from: '!', to: '!' },
        { from: '$', to: '$' },
        { from: '^', to: '^' },
        { from: '*', to: '*' },
        { from: '?', to: '?' },
        { from: ',', to: ',' },
        { from: '\u{80}', to: '\u{FFFF}' },
    ]);
    /**
     *  Inclusive character ranges accepted by `ActionLabelUnescaped` — i.e., the
     *  characters legal inside a single-quoted action label without escaping.
     *  Space (`U+0020`) is included; the apostrophe `'` (`U+0027`) is explicitly
     *  excluded since it terminates the label.
     *
     *  Three ranges: `U+0020`–`U+0026`, `U+0028`–`U+005B`, `U+005D`–`U+FFFF`.
     *  @example
     *  import { action_label_chars } from 'jssm';
     *  action_label_chars.some(r => ' ' >= r.from && ' ' <= r.to);   // => true
     *  action_label_chars.some(r => "'" >= r.from && "'" <= r.to);   // => false
     */
    // keep in sync with src/ts/fsl_parser.peg:240
    const action_label_chars$1 = Object.freeze([
        { from: ' ', to: '&' },
        { from: '(', to: '[' },
        { from: ']', to: '\u{FFFF}' },
    ]);

    var constants = /*#__PURE__*/Object.freeze({
        __proto__: null,
        E: E,
        Epsilon: Epsilon,
        EulerC: EulerC,
        Ln10: Ln10,
        Ln2: Ln2,
        Log10E: Log10E,
        Log2E: Log2E,
        MaxPosNum: MaxPosNum,
        MaxSafeInt: MaxSafeInt,
        MinPosNum: MinPosNum,
        MinSafeInt: MinSafeInt,
        NegInfinity: NegInfinity,
        Phi: Phi,
        Pi: Pi,
        PosInfinity: PosInfinity,
        Root2: Root2,
        RootHalf: RootHalf,
        action_label_chars: action_label_chars$1,
        gviz_shapes: gviz_shapes$1,
        named_colors: named_colors$1,
        shapes: shapes$1,
        state_name_chars: state_name_chars$1,
        state_name_first_chars: state_name_first_chars$1
    });

    /**
     * Editor-agnostic FSL diagnostics: parse then compile, reporting problems as
     * neutral {@link Diagnostic}s. Adapters map these to CodeMirror lint diagnostics,
     * VS Code markers, or LSP `Diagnostic`s.
     *
     * Parse errors (peg.js) carry `.location`; compile errors carry
     * `.source_location` *when they reference a parsed node* — but machine-level
     * compile errors (e.g. an empty machine, an unknown machine rule) have none, so
     * the location is treated as optional and falls back to the whole document.
     *
     * Some validity checks (e.g. a `required` property that no state defines) live
     * in the {@link Machine} constructor, a stage past `compile`. We therefore also
     * construct the machine so the editor surfaces those construction-time errors
     * instead of calling such a machine valid. The `Machine` import closes a cycle
     * (`jssm` re-exports this module), but it is only referenced at call time inside
     * {@link fslDiagnostics}, never during module initialization, so the cycle is
     * benign.
     */
    /** A clamped range from a parser/compiler location, or the whole document. */
    function range_from(loc, text) {
        if (!loc) {
            return { from: 0, to: Math.max(text.length, 1) };
        }
        const from = loc.start.offset;
        return { from, to: Math.max(loc.end.offset, from + 1) };
    }
    /**
     * Parse then compile `text`, returning a list of diagnostics — empty when the
     * machine parses and compiles cleanly.
     * @example
     *   fslDiagnostics('a -> b;');            // => []
     *   fslDiagnostics('a -> ;')[0].severity; // => 'error'
     *   // a `required` property no state defines is a construction-time error:
     *   fslDiagnostics('property p required; a -> b;')[0].severity; // => 'error'
     */
    function fslDiagnostics(text) {
        let tree;
        try {
            tree = wrap_parse(text, { locations: true });
        }
        catch (error) {
            const e = error;
            return [{ range: range_from(e.location, text), severity: 'error', message: e.message }];
        }
        try {
            const config = compile(tree);
            // Construct the machine so constructor-stage validity checks (e.g. a
            // `required` property missing on some state) are reported, not silently
            // accepted as valid.
            new Machine(config);
        }
        catch (error) {
            const e = error;
            return [{ range: range_from(e.source_location, text), severity: 'error', message: e.message }];
        }
        return [];
    }

    /**
     *  Runtime-iterable list of valid `flow` directions for FSL diagrams.
     *  Use this when you need to enumerate directions; for the type itself
     *  see {@link FslDirection}.
     */
    const FslDirections = ['up', 'right', 'down', 'left'];

    /**
     * Context-aware, editor-agnostic FSL completions. Value suggestions after a
     * `key:`, key suggestions at a statement start (top-level vs inside a `{ }`
     * block, by brace depth). Adapters convert {@link CompletionItem}s to their own
     * completion type. Value vocab is jssm's own (`gviz_shapes`, `named_colors`,
     * `FslDirections`), so it cannot drift from the renderer.
     */
    /** Keys whose value is a color (offered the full SVG color list). */
    const COLOR_KEYS = new Set(['color', 'text-color', 'background-color', 'border-color', 'edge-color']);
    /** Small value enumerations, keyed by property. Mirrors `fsl_parser.peg`. */
    const SMALL_VALUE_ENUMS = {
        corners: ['regular', 'rounded', 'lined'],
        'line-style': ['solid', 'dotted', 'dashed'],
        linestyle: ['solid', 'dotted', 'dashed'],
        flow: [...FslDirections],
        graph_layout: ['dot', 'circo', 'fdp', 'neato', 'twopi'],
        theme: ['default', 'ocean', 'modern', 'plain', 'bold'],
        hooks: ['open', 'closed'],
        allows_override: ['true', 'false', 'undefined'],
        allow_islands: ['with_start', 'true', 'false'],
        machine_license: ['MIT', 'BSD 2-clause', 'BSD 3-clause', 'Apache 2.0', 'Mozilla 2.0',
            'Public domain', 'GPL v2', 'GPL v3', 'LGPL v2.1', 'LGPL v3.0'],
    };
    /** Statement starters legal at the top level (machine attrs + config + structural). */
    const TOP_LEVEL_KEYS = [
        'machine_name', 'machine_version', 'machine_author', 'machine_contributor',
        'machine_comment', 'machine_definition', 'machine_reference', 'machine_license',
        'machine_language', 'npm_name', 'fsl_version',
        'theme', 'flow', 'graph_layout', 'default_size', 'dot_preamble', 'hooks',
        'start_states', 'end_states', 'failed_outputs', 'allows_override', 'allow_islands',
        'graph', 'state', 'start_state', 'end_state', 'active_state', 'terminal_state',
        'hooked_state', 'transition',
        'property', 'arrange', 'arrange-start', 'arrange-end', 'on',
    ];
    /** Keys legal inside a `{ }` style block (per-state styling + edge desc items). */
    const BLOCK_KEYS = [
        'label', 'color', 'text-color', 'background-color', 'border-color',
        'shape', 'corners', 'line-style', 'image', 'url', 'property',
        'edge-color', 'arc_label', 'head_label', 'tail_label',
    ];
    const item = (label, kind, detail) => detail === undefined ? { label, kind } : { label, kind, detail };
    const enumItems = (vals) => vals.map(v => item(v, 'value-enum'));
    /** Values for a given key, or null if the key takes no enumerable value. */
    function valueItemsFor(key) {
        if (COLOR_KEYS.has(key)) {
            return named_colors$1.map((c) => item(c, 'value-color', c));
        }
        if (key === 'shape') {
            return gviz_shapes$1.map((s) => item(s, 'value-shape'));
        }
        const small = SMALL_VALUE_ENUMS[key];
        return small ? enumItems(small) : null;
    }
    /**
     * Completions for the caret at `offset` in `text`.
     * @example
     *   fslCompletions('state x : { color: ', 19)[0].kind;  // => 'value-color'
     */
    function fslCompletions(text, offset) {
        var _a;
        const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
        const before = text.slice(lineStart, offset);
        // VALUE position: `<key> : <typed>`
        const valueMatch = /([A-Z_][\w-]*)\s*:\s*[\w-]*$/i.exec(before);
        if (valueMatch) {
            return (_a = valueItemsFor(valueMatch[1])) !== null && _a !== void 0 ? _a : [];
        }
        // KEY position: line start (or after `{`/`;`), then an optional partial word.
        const keyMatch = /(?:^|[{;])\s*(?:[A-Z_][\w-]*)?$/i.exec(before);
        if (keyMatch) {
            const pre = text.slice(0, offset);
            const depth = (pre.match(/\{/g) || []).length - (pre.match(/\}/g) || []).length;
            const keys = depth > 0 ? BLOCK_KEYS : TOP_LEVEL_KEYS;
            return keys.map(k => item(k, 'key'));
        }
        return [];
    }

    /**
     * Parser-derived semantic spans for FSL: color values (with resolved hex),
     * state names, and shape-enum values. Returns `[]` if the document does not
     * parse. Editor-agnostic — adapters map spans to decorations or semantic
     * tokens. Logic is a verified port of the sketch's `semantic_overlay.mjs`.
     */
    /** Grammar-normalized color value shape (`#rrggbbaa`). */
    const HEX8 = /^#[0-9a-f]{8}$/i;
    /** AST keys that hold source locations, not child nodes to recurse into. */
    const LOC_KEYS = new Set(['loc', 'value_loc', 'name_loc', 'from_loc', 'to_loc',
        'r_action_loc', 'l_action_loc', 'value_locs',
        'subject_loc', '__loc']);
    /** State-declaration item keys whose value is an enum lacking a value-precise loc. */
    const ENUM_VALUE_KEYS = new Set(['shape']);
    /**
     * Locate a value substring inside a node's full-statement `loc` span. The
     *  value always appears in its own declaration, so the search always hits.
     */
    function valueSpanWithin(text, loc, value) {
        const idx = text.slice(loc.start.offset, loc.end.offset).lastIndexOf(value);
        const from = loc.start.offset + idx;
        return { from, to: from + value.length };
    }
    /** Recursively collect semantic spans from a located AST node. */
    function collect(node, text, out) {
        if (Array.isArray(node)) {
            for (const c of node) {
                collect(c, text, out);
            }
            return;
        }
        if (!node || typeof node !== 'object') {
            return;
        }
        const n = node;
        if (n.value_loc && typeof n.value === 'string' && HEX8.test(n.value)) {
            out.push({ from: n.value_loc.start.offset, to: n.value_loc.end.offset, kind: 'color', value: n.value });
        }
        if (n.from_loc && typeof n.from === 'string') {
            out.push({ from: n.from_loc.start.offset, to: n.from_loc.end.offset, kind: 'state', value: n.from });
        }
        if (n.to_loc && typeof n.to === 'string') {
            out.push({ from: n.to_loc.start.offset, to: n.to_loc.end.offset, kind: 'state', value: n.to });
        }
        if (n.name_loc && typeof n.name === 'string') {
            out.push({ from: n.name_loc.start.offset, to: n.name_loc.end.offset, kind: 'state', value: n.name });
        }
        if (ENUM_VALUE_KEYS.has(n.key) && typeof n.value === 'string' && n.loc && !n.value_loc) {
            out.push(Object.assign(Object.assign({}, valueSpanWithin(text, n.loc, n.value)), { kind: 'enum' }));
        }
        // group declarations (`&G : [a b c];` / `&G : a;`): every plain member is a
        // state reference. The grammar supplies value_locs parallel to value, so
        // positions come from the parser, never from text search. Nest/spread
        // entries (`&child` / `...&child`) are group references, not states, and
        // the group's own NAME is deliberately not a state span either.
        if (n.key === 'named_list') {
            const members = Array.isArray(n.value) ? n.value : [n.value];
            for (const [i, member] of members.entries()) {
                const m = member;
                const name = typeof m === 'string' ? m
                    : (m.kind === 'state' ? m.name
                        : null);
                if (name !== null) {
                    const at = n.value_locs[i];
                    out.push({ from: at.start.offset, to: at.end.offset, kind: 'state', value: name });
                }
            }
        }
        // hook declarations (`on enter x do 'act';`): a plain-label subject is a
        // state reference and carries a grammar-supplied subject_loc. Group-ref
        // subjects (`on exit &G …`) are group references, not states — no
        // subject_loc, no span.
        if (n.key === 'hook_decl' && n.subject_loc) {
            out.push({ from: n.subject_loc.start.offset, to: n.subject_loc.end.offset, kind: 'state', value: n.subject });
        }
        for (const [key, child] of Object.entries(n)) {
            if (!LOC_KEYS.has(key)) {
                collect(child, text, out);
            }
        }
    }
    /**
     * Collect color / state / shape-enum semantic spans from `text`. State spans
     * cover transition endpoints, state-declaration subjects, group-list members
     * (`&G : [a b c];` — but not the group's own name, nor `&`/`...&` nested
     * group references), and plain-label hook subjects (`on enter x do 'act';` —
     * but not `&group` subjects). Every state span's `value` is the parser's
     * resolved name (unquoted, unescaped), while `from`/`to` cover the source
     * spelling including any quotes.
     * @example
     *   fslSemanticSpans('state s : { color: crimson; };')
     *     .find(s => s.kind === 'color')?.value;   // => '#dc143cff'
     * @example
     *   fslSemanticSpans('&G : [a b];\na -> b;')
     *     .filter(s => s.kind === 'state').length;   // => 4 (two members + two endpoints)
     */
    function fslSemanticSpans(text) {
        let tree;
        try {
            tree = wrap_parse(text, { locations: true });
        }
        catch (_a) {
            return [];
        }
        const out = [];
        collect(tree, text, out);
        return out;
    }

    /**
     *  The published semantic version of the jssm package this build was cut from.
     *  Mirrored from `package.json` by `src/buildjs/makever.cjs` at build time.
     *  Useful for runtime diagnostics and for embedding in serialized machine
     *  snapshots so that deserializers can detect version-skew.
     */
    const version = "6.0.0-alpha.12";
    /**
     *  The Unix epoch timestamp (in milliseconds) at which this build was produced,
     *  written by `src/buildjs/makever.cjs`.  Useful for distinguishing builds
     *  with the same `version` string during development, and for diagnostic logs.
     */
    const build_time = 1785017173018;

    /**
     *  The FSL Markdown fence convention parser — pure, host-agnostic logic that
     *  turns a fenced-code-block info string into a {@link FenceDescriptor}.  Hosts
     *  (a VS Code preview plugin, a static-site generator, …) each interpret the
     *  descriptor according to their capabilities.
     *  @see notes/superpowers/specs/2026-06-23-fsl-markdown-fence-convention-design.md
     */
    /**
     *  Canonical fence language for an info string, or `null` if the block is not
     *  an FSL fence.  Reads only the first whitespace-delimited token,
     *  case-insensitively.
     *  @param info The full fence info string (everything after the opening fence).
     *  @returns `'fsl'` or `'jssm'` for our fences; `null` otherwise.
     *  @example fsl_fence_lang('fsl image code') // => 'fsl'
     *  @example fsl_fence_lang('JSSM')           // => 'jssm'
     *  @example fsl_fence_lang('mermaid')        // => null
     */
    function fsl_fence_lang(info) {
        var _a;
        const first = (_a = info.trim().split(/\s+/, 1)[0]) === null || _a === void 0 ? void 0 : _a.toLowerCase();
        if (first === 'fsl') {
            return 'fsl';
        }
        if (first === 'jssm') {
            return 'jssm';
        }
        return null;
    }
    const PART_TOKENS = new Set([
        'image', 'code', 'dot', 'editor',
        'actions', 'info-panel', 'toolbar', 'title', 'footer'
    ]);
    function is_part(token) {
        return PART_TOKENS.has(token);
    }
    const FORMAT_TOKENS = new Set(['svg', 'png', 'jpeg', 'gif']);
    function is_format(token) {
        return FORMAT_TOKENS.has(token);
    }
    /** Parts whose presence promotes the whole block to a live, interactive instance. */
    const INTERACTIVE_PARTS = new Set(['editor', 'actions', 'toolbar', 'info-panel']);
    /**
     *  Parse a dimension value like `300`, `120px`, or `100%` into a
     *  {@link FenceDimension}.  A bare number is pixels.
     *  @param raw The value portion of a `width=`/`height=`/`max-width=`/`max-height=` token.
     *  @returns The parsed dimension, or `null` if malformed.
     *  @example parse_dimension('300')  // => { value: 300, unit: 'px' }
     *  @example parse_dimension('100%') // => { value: 100, unit: 'percent' }
     *  @example parse_dimension('xyz')  // => null
     */
    function parse_dimension(raw) {
        const m = /^(\d+)(px|%)?$/.exec(raw);
        if (!m) {
            return null;
        }
        return { value: Number(m[1]), unit: m[2] === '%' ? 'percent' : 'px' };
    }
    /** The curated full layout the `ide` macro expands to, in render order. */
    const IDE_LAYOUT = ['title', 'image', 'actions', 'info-panel', 'toolbar', 'editor', 'footer'];
    /**
     *  Parse a fence info string into a {@link FenceDescriptor}.  The first token is
     *  the (already-validated) language and is ignored; remaining tokens are
     *  classified as parts, image formats, the `ide` macro, or the dimension
     *  options `width`/`height` (exact size) and `max-width`/`max-height`
     *  (upper bounds on natural size — see {@link FenceDescriptor} for the
     *  precedence rule when both appear on one axis).  All four dimension tokens
     *  share one value syntax: a bare number (pixels), `<n>px`, or `<n>%`.
     *  Unrecognized or conflicting tokens are dropped and recorded in
     *  `notes` rather than throwing, so a host can render forward-compatibly.
     *  @param info The full fence info string, e.g. `'fsl image code width=300'`.
     *  @returns The validated descriptor; `notes` lists anything ignored or overridden.
     *  @example parse_fence_info('fsl').parts // => ['image', 'code']
     *  @example parse_fence_info('fsl code image').parts // => ['code', 'image']
     *  @example parse_fence_info('fsl image max-width=300 max-height=50%').max_width // => { value: 300, unit: 'px' }
     */
    function parse_fence_info(info) {
        const tokens = info.trim().split(/\s+/).filter(Boolean);
        const args = tokens.slice(1).map(t => t.toLowerCase());
        const parts = [];
        const notes = [];
        let format = 'svg';
        let format_set = false;
        let ide = false;
        // the four dimension tokens share one assignment path, keyed by token name
        const dims = {
            'width': null,
            'height': null,
            'max-width': null,
            'max-height': null,
        };
        for (const arg of args) {
            if (arg === 'ide') {
                ide = true;
                continue;
            }
            if (is_part(arg)) {
                if (parts.includes(arg)) {
                    notes.push(`duplicate token "${arg}" ignored`);
                }
                else {
                    parts.push(arg);
                }
                continue;
            }
            if (is_format(arg)) {
                if (format_set) {
                    notes.push(`format "${format}" overridden by "${arg}"`);
                }
                format = arg;
                format_set = true;
                if (!parts.includes('image')) {
                    parts.push('image');
                }
                continue;
            }
            if (arg.startsWith('width=') || arg.startsWith('height=') || arg.startsWith('max-width=') || arg.startsWith('max-height=')) {
                const eq = arg.indexOf('=');
                const key = arg.slice(0, eq);
                const raw = arg.slice(eq + 1);
                const dim = parse_dimension(raw);
                if (dim === null) {
                    notes.push(`invalid ${key} value "${raw}" ignored`);
                }
                else {
                    dims[key] = dim;
                }
                continue;
            }
            notes.push(`unknown token "${arg}" ignored`);
        }
        if (ide) {
            if (parts.length > 0) {
                notes.push('ide overrides individual part tokens');
            }
            parts.length = 0;
            parts.push(...IDE_LAYOUT);
        }
        if (parts.length === 0) {
            parts.push('image', 'code');
        }
        const interactive = ide || parts.some(p => INTERACTIVE_PARTS.has(p));
        if (interactive && format !== 'svg') {
            notes.push(`raster format "${format}" overridden to svg for an interactive block`);
            format = 'svg';
        }
        return {
            parts,
            ide,
            format,
            width: dims.width,
            height: dims.height,
            max_width: dims['max-width'],
            max_height: dims['max-height'],
            interactive,
            notes
        };
    }

    /**
     * Provisional content hash of FSL source — the binding between a tape and its
     * machine (M3, brainstorm Q4). Deterministic, synchronous, dependency-free
     * (two-lane FNV-1a 32-bit via `Math.imul`, no BigInt so it down-levels below
     * ES2020), tagged `provisional:`.
     *
     * THE M1 SEAM: M1 replaces this single function with the canonical pinned
     * SHA-256 over normalized source (and a `sha256:` tag). M3 makes no security
     * claim — this only answers "does this tape's machine match the doc given".
     */
    const FNV_PRIME_32 = 16777619;
    // One 32-bit FNV-1a lane (kept inside uint32 via `>>> 0` and `Math.imul`).
    function fnv32(text, seed) {
        let h = seed >>> 0;
        for (let i = 0; i < text.length; i++) {
            h ^= text.charCodeAt(i);
            h = Math.imul(h, FNV_PRIME_32) >>> 0;
        }
        return h >>> 0;
    }
    /**
     * @param text - FSL source.
     * @returns `"provisional:" + 16 hex digits` (two decorrelated FNV-1a-32 lanes).
     * @example
     *   source_hash('a -> b;'); // e.g. 'provisional:9f1c4e2a3b7d0061'
     */
    function source_hash(text) {
        const a = fnv32(text, 2166136261); // standard FNV offset basis
        const b = fnv32(text, 2654435761); // golden-ratio seed, to decorrelate the lanes
        return 'provisional:' + a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
    }

    /**
     * The JSONL stimulus-tape format for the M3 replayer: one header line, then one
     * stimulus per line. Pure data + (de)serialization, zero Node deps.
     */
    const SUPPORTED_TAPE_VERSION = 1;
    /** Typed error for the tape/replay layer (kind-discriminated, like FslError). */
    class ReplayError extends Error {
        constructor(kind, message, step) {
            super(message);
            this.name = 'ReplayError';
            this.kind = kind;
            this.step = step;
            Object.setPrototypeOf(this, ReplayError.prototype);
        }
    }
    /**
     * Parse JSONL tape text into a {@link StimulusTape}.
     * @param text - JSONL: a header object line, then stimulus lines.
     * @returns The parsed header + stimuli.
     * @throws ReplayError kind `malformed_tape` / `unsupported_format_version` / `unknown_op`.
     * @example
     *   parse_tape('{"fsl_tape":1,"machine":{}}\n{"op":"timer"}');
     */
    function parse_tape(text) {
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        if (lines.length === 0)
            throw new ReplayError('malformed_tape', 'empty tape (no header)');
        let header;
        try {
            header = JSON.parse(lines[0]);
        }
        catch (_a) {
            throw new ReplayError('malformed_tape', 'header line is not valid JSON');
        }
        if (typeof header.fsl_tape !== 'number' || typeof header.machine !== 'object' || header.machine === null) {
            throw new ReplayError('malformed_tape', 'header missing fsl_tape/machine');
        }
        if (header.fsl_tape > SUPPORTED_TAPE_VERSION) {
            throw new ReplayError('unsupported_format_version', `tape format ${header.fsl_tape} > supported ${SUPPORTED_TAPE_VERSION}`);
        }
        const stimuli = [];
        for (let i = 1; i < lines.length; i++) {
            const step = i - 1;
            let s;
            try {
                s = JSON.parse(lines[i]);
            }
            catch (_b) {
                throw new ReplayError('malformed_tape', 'stimulus line is not valid JSON', step);
            }
            if (s.op === 'action' || s.op === 'transition') {
                if (typeof s.name !== 'string')
                    throw new ReplayError('malformed_tape', `${s.op} missing name`, step);
                stimuli.push('data' in s ? { op: s.op, name: s.name, data: s.data } : { op: s.op, name: s.name });
            }
            else if (s.op === 'timer') {
                stimuli.push({ op: 'timer' });
            }
            else {
                throw new ReplayError('unknown_op', `unknown stimulus op ${JSON.stringify(s.op)}`, step);
            }
        }
        return { header, stimuli };
    }
    /**
     * Serialize a {@link StimulusTape} back to canonical JSONL (stable key order
     * per line, so the bytes are deterministic).
     * @param tape - The tape to serialize.
     * @returns JSONL text.
     * @example
     *   serialize_tape({ header: { fsl_tape: 1, machine: {} }, stimuli: [{ op: 'timer' }] });
     */
    function serialize_tape(tape) {
        return [canonicalize(tape.header), ...tape.stimuli.map(s => canonicalize(s))].join('\n');
    }

    /**
     * Deterministic stimulus-tape replayer (M3). Given FSL source and a tape,
     * reconstructs the run bit-identically by feeding stimuli through the runtime
     * with an injected logical clock and a controlled timer queue (no wall-clock,
     * no real setTimeout, no host hooks). Zero Node deps.
     */
    /**
     * Replay `tape` against the machine compiled from `source`.
     * @param source - FSL source text.
     * @param tape - The parsed stimulus tape.
     * @returns The deterministic {@link ReplayResult}.
     * @throws ReplayError `source_hash_mismatch` / `no_pending_timer`.
     * @example
     *   replay("a 'go' -> b;", parse_tape('{"fsl_tape":1,"machine":{}}\n{"op":"action","name":"go"}'));
     */
    function replay(source, tape) {
        const computed = source_hash(source);
        const declared = tape.header.machine.source_hash;
        if (declared !== undefined && declared !== computed) {
            throw new ReplayError('source_hash_mismatch', `tape source_hash ${declared} != source ${computed}`);
        }
        // Controlled, deterministic time + timers: one pending callback at a time.
        let pending = null;
        const machine = new Machine(Object.assign(Object.assign({}, make(source)), { time_source: () => 0, timeout_source: (f, _ms) => { pending = f; return 1; }, clear_timeout_source: (_h) => { pending = null; } }));
        const steps = [];
        for (const [index, s] of tape.stimuli.entries()) {
            let accepted;
            if (s.op === 'action') {
                accepted = machine.action(s.name, s.data);
            }
            else if (s.op === 'transition') {
                accepted = machine.transition(s.name, s.data);
            }
            else { // timer
                if (pending === null) {
                    throw new ReplayError('no_pending_timer', 'timer with no pending timeout', index);
                }
                const cb = pending;
                pending = null;
                cb();
                accepted = true;
            }
            steps.push(s.op === 'timer'
                ? { index, op: 'timer', accepted }
                : { index, op: s.op, name: s.name, accepted });
        }
        const final_state = machine.state();
        const final_data = machine.data();
        return {
            final_state, final_data, steps,
            source_hash: computed,
            canonical: canonical_config(final_state, final_data),
        };
    }

    // whargarbl lots of these return arrays could/should be sets
    var __classPrivateFieldGet = (undefined && undefined.__classPrivateFieldGet) || function (receiver, state, kind, f) {
        if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
        if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
        return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
    };
    var _Machine_instances, _Machine_unsubscribe_entry, _Machine_subscribe, _Machine_validate_hook_description, _Machine_recompute_hook_flags, _Machine_resolved_themes, _Machine_individual_state_config, _Machine_groups_by_depth, _Machine_compose_state_config;
    const { shapes, gviz_shapes, named_colors, state_name_chars, state_name_first_chars, action_label_chars } = constants;
    const empty_string_set = new Set();
    // The spatial fields (besides `handler`, which every hook needs) that each
    // hook kind requires, mirroring exactly what `set_hook` reads per case.  Used
    // to validate a HookDescription so a mis-shaped one is rejected rather than
    // silently registering a dead hook — e.g. an `exit` hook given `to` instead of
    // `from` would otherwise intern `undefined` and never fire (#734).  Typed as a
    // `Record` over the kind union so the table is exhaustive at compile time:
    // adding a hook kind without listing its fields is a build error.
    const hook_required_fields = {
        'hook': ['from', 'to'],
        'named': ['from', 'to', 'action'],
        'global action': ['action'],
        'any action': [],
        'standard transition': [],
        'main transition': [],
        'forced transition': [],
        'any transition': [],
        'entry': ['to'],
        'exit': ['from'],
        'after': ['from'],
        'after any': [],
        'post hook': ['from', 'to'],
        'post named': ['from', 'to', 'action'],
        'post global action': ['action'],
        'post any action': [],
        'post standard transition': [],
        'post main transition': [],
        'post forced transition': [],
        'post any transition': [],
        'post entry': ['to'],
        'post exit': ['from'],
        'pre everything': [],
        'everything': [],
        'pre post everything': [],
        'post everything': [],
    };
    // The spatial fields a hook descriptor can carry, checked against the per-kind
    // requirements above.
    const hook_spatial_fields = ['from', 'to', 'action'];
    /*********
     *
     *  An internal method meant to take a series of declarations and fold them into
     *  a single multi-faceted declaration, in the process of building a state.  Not
     *  generally meant for external use.
     *
     *  @internal
     *
     */
    /*********
     *
     *  Validate a candidate `value` against a val's declared `JssmValType`, throwing
     *  a {@link JssmError} on a type or range violation.  Used both at construction
     *  (initial values) and on every `set_val` write.
     *
     */
    function validate_val_value(name, vtype, value, machine) {
        switch (vtype.kind) {
            case 'boolean': {
                if (typeof value !== 'boolean') {
                    throw new JssmError(machine, `val "${name}" expects boolean, got ${JSON.stringify(value)}`);
                }
                break;
            }
            case 'string': {
                if (typeof value !== 'string') {
                    throw new JssmError(machine, `val "${name}" expects string, got ${JSON.stringify(value)}`);
                }
                break;
            }
            case 'int': {
                // eslint-disable-next-line unicorn/prefer-number-is-safe-integer -- an `int` val is user data, not a count; isSafeInteger would reject legal integers >= 2^53, a public-contract change
                if (!Number.isInteger(value)) {
                    throw new JssmError(machine, `val "${name}" expects an integer, got ${JSON.stringify(value)}`);
                }
                if (Object.prototype.hasOwnProperty.call(vtype, 'lo') && value < vtype.lo) {
                    throw new JssmError(machine, `val "${name}" value ${value} is below the minimum ${vtype.lo}`);
                }
                if (Object.prototype.hasOwnProperty.call(vtype, 'hi') && value > vtype.hi) {
                    throw new JssmError(machine, `val "${name}" value ${value} is above the maximum ${vtype.hi}`);
                }
                break;
            }
            case 'enum': {
                if (!vtype.members.includes(value)) {
                    throw new JssmError(machine, `val "${name}" expects one of [${vtype.members.join(', ')}], got ${JSON.stringify(value)}`);
                }
                break;
            }
            // defense-in-depth (jssm#758): JssmValType is a closed union the grammar
            // only ever emits four kinds of, so this default is unreachable at runtime;
            // the `never` assignment turns an unhandled future kind into a compile error.
            /* v8 ignore start */
            default: {
                const _exhaustive = vtype;
                throw new JssmError(machine, `val "${name}" has an unhandled type kind: ${JSON.stringify(_exhaustive)}`);
            }
            /* v8 ignore stop */
        }
    }
    function transfer_state_properties(state_decl) {
        state_decl.declarations.map((d) => {
            switch (d.key) {
                case 'shape': {
                    state_decl.shape = d.value;
                    break;
                }
                case 'color': {
                    state_decl.color = d.value;
                    break;
                }
                case 'corners': {
                    state_decl.corners = d.value;
                    break;
                }
                case 'line-style': {
                    state_decl.lineStyle = d.value;
                    break;
                }
                case 'text-color': {
                    state_decl.textColor = d.value;
                    break;
                }
                case 'background-color': {
                    state_decl.backgroundColor = d.value;
                    break;
                }
                case 'state-label': {
                    state_decl.stateLabel = d.value;
                    break;
                }
                case 'border-color': {
                    state_decl.borderColor = d.value;
                    break;
                }
                case 'image': {
                    state_decl.image = d.value;
                    break;
                }
                case 'url': {
                    state_decl.url = d.value;
                    break;
                }
                case 'state_property': {
                    state_decl.property = { name: d.name, value: d.value };
                    break;
                }
                default: {
                    throw new JssmError(undefined, `Unknown state property: '${JSON.stringify(d)}'`);
                }
            }
        });
        return state_decl;
    }
    /**
     *
     *  Collapse a list of individual state-style key/value pairs into a single
     *  {@link JssmStateConfig} object, remapping FSL-style kebab-case keys to the
     *  camelCase field names the runtime uses.
     *
     *  The parser emits state styling as a flat array like
     *  `[{ key: 'color', value: 'red' }, { key: 'line-style', value: 'dashed' }]`
     *  because that is the most natural shape for the grammar to produce.  This
     *  helper runs once per style bucket during `Machine` construction to turn
     *  those arrays into the compact `{ color, lineStyle, ... }` objects the
     *  graph-rendering code expects.
     *
     *  ```typescript
     *  state_style_condense([
     *    { key: 'color',      value: 'red' },
     *    { key: 'shape',      value: 'oval' },
     *    { key: 'line-style', value: 'dashed' }
     *  ]);
     *  // => { color: 'red', shape: 'oval', lineStyle: 'dashed' }
     *
     *  state_style_condense(undefined);
     *  // => {}
     *  ```
     *  @param jssk The list of style keys to condense.  `undefined` is accepted
     *  and yields an empty config.
     *  @param machine Optional `Machine` reference, used only so that any
     *  {@link JssmError} thrown can point at the offending machine in its
     *  diagnostic message.
     *  @returns A `JssmStateConfig` object containing every key from `jssk`
     *  remapped into its camelCase field.
     *  @throws {JssmError} If `jssk` is neither an array nor `undefined`, if any
     *  element is not an object, if the same key appears more than once, or if a
     *  key is not one of the recognized style names.
     *  @internal
     */
    /**
     *
     *  Applies one parsed state-style key/value pair onto a condensing
     *  {@link JssmStateConfig}, remapping the kebab-case FSL key to its camelCase
     *  field and rejecting redefinition.  Exists as the switch body of
     *  {@link state_style_condense}, one call per list element.
     *
     *  ```typescript
     *  const cfg = {};
     *  apply_state_style_key(cfg, { key: 'color', value: 'red' });  // cfg.color === 'red'
     *  ```
     *  @throws {JssmError} If the key was already set, or is not a recognized
     *  style name.
     *  @see state_style_condense
     *  @internal
     */
    function apply_state_style_key(state_style, key, machine) {
        switch (key.key) {
            case 'shape': {
                if (state_style.shape !== undefined) {
                    throw new JssmError(machine, `cannot redefine 'shape' in state_style_condense, already defined`);
                }
                state_style.shape = key.value;
                return;
            }
            case 'color': {
                if (state_style.color !== undefined) {
                    throw new JssmError(machine, `cannot redefine 'color' in state_style_condense, already defined`);
                }
                state_style.color = key.value;
                return;
            }
            case 'text-color': {
                if (state_style.textColor !== undefined) {
                    throw new JssmError(machine, `cannot redefine 'text-color' in state_style_condense, already defined`);
                }
                state_style.textColor = key.value;
                return;
            }
            case 'corners': {
                if (state_style.corners !== undefined) {
                    throw new JssmError(machine, `cannot redefine 'corners' in state_style_condense, already defined`);
                }
                state_style.corners = key.value;
                return;
            }
            case 'line-style': {
                if (state_style.lineStyle !== undefined) {
                    throw new JssmError(machine, `cannot redefine 'line-style' in state_style_condense, already defined`);
                }
                state_style.lineStyle = key.value;
                return;
            }
            case 'background-color': {
                if (state_style.backgroundColor !== undefined) {
                    throw new JssmError(machine, `cannot redefine 'background-color' in state_style_condense, already defined`);
                }
                state_style.backgroundColor = key.value;
                return;
            }
            case 'state-label': {
                if (state_style.stateLabel !== undefined) {
                    throw new JssmError(machine, `cannot redefine 'state-label' in state_style_condense, already defined`);
                }
                state_style.stateLabel = key.value;
                return;
            }
            case 'border-color': {
                if (state_style.borderColor !== undefined) {
                    throw new JssmError(machine, `cannot redefine 'border-color' in state_style_condense, already defined`);
                }
                state_style.borderColor = key.value;
                return;
            }
            case 'url': {
                if (state_style.url !== undefined) {
                    throw new JssmError(machine, `cannot redefine 'url' in state_style_condense, already defined`);
                }
                state_style.url = key.value;
                return;
            }
            default: {
                // TODO do that <never> trick to assert this list is complete
                throw new JssmError(machine, `unknown state style key in condense: ${key.key}`);
            }
        }
    }
    function state_style_condense(jssk, machine) {
        const state_style = {};
        if (Array.isArray(jssk)) {
            for (const [i, key] of jssk.entries()) {
                if (typeof key !== 'object') {
                    throw new JssmError(machine, `invalid state item ${i} in state_style_condense list: ${JSON.stringify(key)}`);
                }
                apply_state_style_key(state_style, key, machine);
            }
        }
        else if (jssk === undefined) ;
        else {
            throw new JssmError(machine, 'state_style_condense received a non-array');
        }
        return state_style;
    }
    /*********
     *
     *  Shallow-merges one {@link JssmStateConfig} style tier over another, with
     *  later-wins, undefined-skipping semantics — the across-tier folding primitive
     *  for the unified config cascade in {@link Machine.resolve_state_config}.
     *
     *  Every defined key in `over` replaces the corresponding key in the result;
     *  keys whose `over` value is `undefined` leave the `base` value untouched.
     *  Unlike {@link state_style_condense} — which throws when a key is redefined
     *  *within a single declaration block* — this NEVER throws on a key collision,
     *  because the cascade deliberately layers more-specific tiers (group, per-state,
     *  active) over less-specific ones (theme, kind defaults) and the later tier is
     *  meant to win.  Neither input is mutated; a fresh object is returned.
     *
     *  ```typescript
     *  merge_state_config({ color: 'red', shape: 'box' }, { color: 'blue' });
     *  // => { color: 'blue', shape: 'box' }
     *
     *  merge_state_config({ color: 'red' }, { color: undefined, shape: 'oval' });
     *  // => { color: 'red', shape: 'oval' }  (undefined `over` keys are ignored)
     *  ```
     *
     *  @param base The lower-precedence style tier (the accumulator so far).
     *  @param over The higher-precedence style tier; its defined keys win.
     *
     *  @returns A new {@link JssmStateConfig} with `over`'s defined keys layered
     *  over `base`.
     *
     *  @internal
     *
     */
    function merge_state_config(base, over) {
        const merged = Object.assign({}, base);
        for (const [key, value] of Object.entries(over)) {
            if (value !== undefined) {
                merged[key] = value;
            }
        }
        return merged;
    }
    /*******
     *
     *  Core finite state machine class.  Holds the full graph of states and
     *  transitions, the current state, hooks, data, properties, and all runtime
     *  behavior.  Typically created via the {@link sm} tagged template literal
     *  rather than constructed directly.
     *
     *  ```typescript
     *  import { sm } from 'jssm';
     *
     *  const light = sm`Red 'next' => Green 'next' => Yellow 'next' => Red;`;
     *  light.state();       // 'Red'
     *  light.action('next'); // true
     *  light.state();       // 'Green'
     *  ```
     *
     *  @typeParam mDT The machine data type — the type of the value stored in
     *  `.data()`.  Defaults to `undefined` when no data is used.
     *
     */
    /*********
     *
     *  Partition a state graph into its connected components using an undirected
     *  BFS over state names.  Each edge (from, to) is treated as bidirectional so
     *  that island membership is topology-based rather than flow-based.
     *
     *  Used at construction time to enforce the `allow_islands` constraint.
     *
     *  @param states  The machine's state map (keys are state names).
     *  @param edges   The machine's edge list; only `from` and `to` are used.
     *  @returns       An array of components, each component an array of state names.
     *
     */
    function find_connected_components(states, edges) {
        // Build undirected adjacency list
        const adj = new Map();
        for (const name of states.keys()) {
            adj.set(name, new Set());
        }
        for (const edge of edges) {
            adj.get(edge.from).add(edge.to);
            adj.get(edge.to).add(edge.from);
        }
        const visited = new Set();
        const result = [];
        for (const start of states.keys()) {
            if (visited.has(start)) {
                continue;
            }
            // BFS to collect this component
            const component = [];
            const queue = [start];
            visited.add(start);
            const enqueue_unvisited = (neighbor) => {
                if (visited.has(neighbor)) {
                    return;
                }
                visited.add(neighbor);
                queue.push(neighbor);
            };
            // index-pointer pop: Array.shift is O(n) per pop, making the BFS O(V²)
            // worst case; reading by cursor keeps it O(V + E)
            let head = 0;
            while (head < queue.length) {
                const node = queue[head++];
                component.push(node);
                for (const neighbor of adj.get(node)) {
                    enqueue_unvisited(neighbor);
                }
            }
            result.push(component);
        }
        return result;
    }
    /** Default number of independent Monte-Carlo runs when none is declared. */
    const STOCHASTIC_DEFAULT_RUNS = 1000;
    /** Default per-run step cap (montecarlo) / walk length (steady_state). */
    const STOCHASTIC_DEFAULT_MAX_STEPS = 1000;
    /**
     *  Default time / timeout sources, hoisted to module scope so machines that
     *  don't override them (nearly all) share three singletons instead of
     *  allocating three fresh closures per construction.
     *  @internal
     */
    const DEFAULT_TIME_SOURCE = () => Date.now();
    const DEFAULT_TIMEOUT_SOURCE = (f, a) => {
        const handle = setTimeout(f, a);
        // In Node, setTimeout returns a Timeout with .unref(), so a pending `after`
        // timer does NOT by itself keep the process alive -- an abandoned machine can
        // be collected and the process can exit instead of hanging until the timer
        // fires go() on it.  The browser returns a plain number with no such method.
        // A consumer who wants the timer to hold the loop open can supply their own
        // timeout_source.  StoneCypher/fsl#1952
        const maybe_unref = handle;
        // The no-unref path is the browser's numeric handle; it can't be reached in
        // the node-only coverage environment, so the false branch is ignored here.
        /* v8 ignore next */
        if (typeof maybe_unref.unref === 'function') {
            maybe_unref.unref();
        }
        return handle;
    };
    const DEFAULT_CLEAR_TIMEOUT_SOURCE = (h) => clearTimeout(h);
    class Machine {
        // whargarbl this badly needs to be broken up, monolith master
        constructor({ start_states, end_states = [], failed_outputs = [], initial_state, start_states_no_enforce, complete = [], transitions, machine_author, machine_comment, machine_contributor, machine_definition, machine_language, machine_license, machine_name, machine_version, npm_name, default_size, state_declaration, property_definition, val_definition, vals, state_property, fsl_version, dot_preamble, arrange_declaration = [], arrange_start_declaration = [], arrange_end_declaration = [], oarrange_declaration = [], farrange_declaration = [], theme = ['default'], flow = 'down', graph_layout = 'dot', instance_name, history, boundary_depth_limit, data, default_state_config, default_active_state_config, default_hooked_state_config, default_terminal_state_config, default_start_state_config, default_end_state_config, default_transition_config, default_graph_config, group_registry, group_metadata, group_hooks, state_hooks, allows_override, config_allows_override, allow_islands, editor_config, rng_seed, time_source, timeout_source, clear_timeout_source }) {
            _Machine_instances.add(this);
            this._time_source = time_source !== null && time_source !== void 0 ? time_source : DEFAULT_TIME_SOURCE;
            this._create_started = this._time_source();
            this._instance_name = instance_name;
            this._states = new Map();
            this._state_declarations = new Map();
            this._edges = [];
            this._edge_map = new Map();
            this._outbound_edge_ids = new Map();
            this._named_transitions = new Map();
            this._actions = new Map();
            this._reverse_actions = new Map();
            this._reverse_action_targets = new Map(); // todo
            this._state_interner = new Interner();
            this._action_interner = new Interner();
            this._state_id = NaN;
            this._edge_id_by_pair = new Map();
            this._edge_id_by_action_pair = new Map();
            this._edge_to_ids = [];
            this._start_states = new Set(start_states);
            this._end_states = new Set(end_states); // todo consider what to do about incorporating complete too
            this._failed_outputs = new Set(failed_outputs);
            this._machine_author = array_box_if_string(machine_author);
            this._machine_comment = machine_comment;
            this._machine_contributor = array_box_if_string(machine_contributor);
            this._machine_definition = machine_definition;
            this._machine_language = machine_language;
            this._machine_license = machine_license;
            this._machine_name = machine_name;
            this._machine_version = machine_version;
            this._npm_name = npm_name;
            this._default_size = default_size;
            this._raw_state_declaration = state_declaration || [];
            this._fsl_version = fsl_version;
            this._arrange_declaration = arrange_declaration;
            this._arrange_start_declaration = arrange_start_declaration;
            this._arrange_end_declaration = arrange_end_declaration;
            this._oarrange_declaration = oarrange_declaration;
            this._farrange_declaration = farrange_declaration;
            this._dot_preamble = dot_preamble;
            this._themes = theme;
            this._flow = flow;
            this._graph_layout = graph_layout;
            this._has_hooks = false;
            this._has_basic_hooks = false;
            this._has_named_hooks = false;
            this._has_entry_hooks = false;
            this._has_exit_hooks = false;
            this._has_after_hooks = false;
            this._has_global_action_hooks = false;
            this._has_transition_hooks = false;
            // no need for a boolean for single hooks, just test for undefinedness
            this._has_forced_transitions = false;
            this._hooks = new Map();
            this._named_hooks = new Map();
            this._entry_hooks = new Map();
            this._exit_hooks = new Map();
            this._after_hooks = new Map();
            this._after_any_hook = undefined;
            this._global_action_hooks = new Map();
            this._any_action_hook = undefined;
            this._standard_transition_hook = undefined;
            this._main_transition_hook = undefined;
            this._forced_transition_hook = undefined;
            this._any_transition_hook = undefined;
            this._has_post_hooks = false;
            this._has_post_basic_hooks = false;
            this._has_post_named_hooks = false;
            this._has_post_entry_hooks = false;
            this._has_post_exit_hooks = false;
            this._has_post_global_action_hooks = false;
            this._has_post_transition_hooks = false;
            // no need for a boolean for single hooks, just test for undefinedness
            this._code_allows_override = allows_override;
            this._config_allows_override = config_allows_override;
            this._allow_islands = allow_islands !== null && allow_islands !== void 0 ? allow_islands : true;
            this._editor_config = editor_config;
            // tri-state: undefined is a legal, distinct value here — do not truthy-collapse
            if ((allows_override === false) && (config_allows_override === true)) {
                throw new JssmError(undefined, "Code specifies no override, but config tries to permit; config may not be less strict than code");
            }
            this._post_hooks = new Map();
            this._post_named_hooks = new Map();
            this._post_entry_hooks = new Map();
            this._post_exit_hooks = new Map();
            this._post_global_action_hooks = new Map();
            this._post_any_action_hook = undefined;
            this._post_standard_transition_hook = undefined;
            this._post_main_transition_hook = undefined;
            this._post_forced_transition_hook = undefined;
            this._post_any_transition_hook = undefined;
            this._pre_everything_hook = undefined;
            this._everything_hook = undefined;
            this._pre_post_everything_hook = undefined;
            this._post_everything_hook = undefined;
            this._data = data;
            this._property_keys = new Set();
            this._default_properties = new Map();
            this._state_properties = new Map();
            this._required_properties = new Set();
            this._state_property_first_state = new Map();
            this._val_keys = new Set();
            this._val_types = new Map();
            this._val_values = new Map();
            this._required_vals = new Set();
            this._state_style = state_style_condense(default_state_config, this);
            this._active_state_style = state_style_condense(default_active_state_config, this);
            this._hooked_state_style = state_style_condense(default_hooked_state_config, this);
            this._terminal_state_style = state_style_condense(default_terminal_state_config, this);
            this._start_state_style = state_style_condense(default_start_state_config, this);
            this._end_state_style = state_style_condense(default_end_state_config, this);
            // Consolidated `transition: {}` and `graph: {}` default-config blocks,
            // stored verbatim so the viz layer can project them onto Graphviz `edge [ … ]`
            // defaults and graph-scope attributes respectively.  Both are kept as the
            // compiler's de-duplicated `{ key, value }[]` lists (last-wins already
            // applied, so iterating in order yields the winning value per key).
            this._default_transition_config = default_transition_config;
            this._default_graph_config = default_graph_config;
            // Overlapping-state-group tables.  The registry/hooks are stored as-is; the
            // raw per-group `{ declarations }` blocks are condensed once into style
            // configs here (a single declaration block, so the intra-block redefine
            // guard in `state_style_condense` still applies), while depth-ordered
            // merging across groups happens later in `resolve_state_config`.
            this._group_registry = group_registry !== null && group_registry !== void 0 ? group_registry : new Map();
            this._group_hooks = group_hooks !== null && group_hooks !== void 0 ? group_hooks : new Map();
            this._state_hooks = state_hooks !== null && state_hooks !== void 0 ? state_hooks : new Map();
            this._group_metadata = new Map();
            if (group_metadata) { // group-free machines skip a throwaway Map allocation
                group_metadata.forEach((raw, group_name) => 
                // `raw.declarations` is the parser's raw style-item list — structurally
                // a JssmStateStyleKeyList, but typed as JssmStateDeclarationRule[] on
                // JssmStateConfig — so it condenses through the same path as the
                // `default_*_state_config` blocks (intra-block redefine still throws).
                this._group_metadata.set(group_name, state_style_condense(raw.declarations, this)));
            }
            this._group_order = [...this._group_registry.keys()];
            // Deep/transitive inverse index: for each declared group, flatten its
            // transitive member states (reusing the compiler's `transitive_members`)
            // and record that group against every one of them.  A `memo` shared across
            // groups memoizes overlapping sub-group resolution.
            this._state_to_groups = new Map();
            {
                const memo = new Map();
                for (const group_name of this._group_order) {
                    for (const member of transitive_members(this._group_registry, group_name, memo)) {
                        let bucket = this._state_to_groups.get(member);
                        if (bucket === undefined) {
                            bucket = new Set();
                            this._state_to_groups.set(member, bucket);
                        }
                        bucket.add(group_name);
                    }
                }
            }
            this._static_state_config_cache = new Map();
            this._history_length = history || 0;
            this._history = new circular_buffer(this._history_length);
            this._state_labels = new Map();
            this._rng_seed = rng_seed !== null && rng_seed !== void 0 ? rng_seed : Date.now();
            this._rng = gen_splitmix32(this._rng_seed);
            this._timeout_source = timeout_source !== null && timeout_source !== void 0 ? timeout_source : DEFAULT_TIMEOUT_SOURCE;
            this._clear_timeout_source = clear_timeout_source !== null && clear_timeout_source !== void 0 ? clear_timeout_source : DEFAULT_CLEAR_TIMEOUT_SOURCE;
            this._timeout_handle = undefined;
            this._timeout_target = undefined;
            this._timeout_target_time = undefined;
            this._after_mapping = new Map();
            this._event_handlers = new Map();
            this._event_listener_count = 0;
            this._firing_error = false;
            this._committing_transition = false;
            // Boundary-hook action cascade guard.  Limit defaults to 100 but is
            // configurable via the `boundary_depth_limit` constructor option so tests
            // can tighten the cap and deep pipelines can raise it.
            this._boundary_depth = 0;
            this._boundary_depth_limit = boundary_depth_limit !== null && boundary_depth_limit !== void 0 ? boundary_depth_limit : 100;
            // consolidate the state declarations
            if (state_declaration) {
                for (const state_decl of state_declaration) {
                    if (this._state_declarations.has(state_decl.state)) { // no repeats
                        throw new JssmError(this, `Added the same state declaration twice: ${JSON.stringify(state_decl.state)}`);
                    }
                    this._state_declarations.set(state_decl.state, transfer_state_properties(state_decl));
                }
            }
            // walk the decls for labels; aggregate them when found
            for (const [key, decl] of this._state_declarations) {
                const labelled = decl.declarations.filter(d => d.key === 'state-label');
                if (labelled.length > 1) {
                    throw new JssmError(this, `state ${key} may only have one state-label; has ${labelled.length}`);
                }
                if (labelled.length === 1) {
                    this._state_labels.set(key, labelled[0].value);
                }
            }
            // Duplicate-edge guard for the construction loop below, keyed
            // from -> (to -> Set<slot>).  A "slot" distinguishes edges that share a
            // (from, to) pair: an action's name for an actioned edge, or '' for the one
            // permitted plain action-less edge.  Multiple edges between the same pair
            // are allowed when they carry distinct actions (#325; the self-loop case is
            // #531), since they dispatch unambiguously through `action(name)`.  A
            // probability-bearing action-less edge is exempt from the guard entirely,
            // so a weighted fan-out may name the same target more than once.  The
            // nested Map+Set keeps the check O(1) per edge rather than an O(out-degree)
            // scan (which made construction O(V*E) on dense graphs).  #673
            const seen_edges = new Map();
            // complete.includes was an O(|complete|) array scan per newly-created
            // state — O(V·C) overall; one Set turns it into O(V)
            const complete_set = new Set(complete);
            // walk the transitions.  single-lookup cursor fetches: each endpoint was
            // previously a get followed by a has on the same key (four hashes per
            // edge); the undefined check on the get's result carries the same
            // information.  #706
            for (const tr of transitions) {
                if (tr.from === undefined) {
                    throw new JssmError(this, `transition must define 'from': ${JSON.stringify(tr)}`);
                }
                if (tr.to === undefined) {
                    throw new JssmError(this, `transition must define 'to': ${JSON.stringify(tr)}`);
                }
                // get the cursors.  what a mess
                let cursor_from = this._states.get(tr.from);
                if (cursor_from === undefined) {
                    cursor_from = { name: tr.from, from: [], to: [], complete: complete_set.has(tr.from) };
                    this._new_state(cursor_from);
                }
                let cursor_to = this._states.get(tr.to);
                if (cursor_to === undefined) {
                    cursor_to = { name: tr.to, from: [], to: [], complete: complete_set.has(tr.to) };
                    this._new_state(cursor_to);
                }
                // record (from -> to) adjacency once per distinct target, even when
                // several edges connect the pair, so the `to`/`from` arrays stay sets of
                // state names.  #673
                let to_slots = seen_edges.get(tr.from);
                if (to_slots === undefined) {
                    to_slots = new Map();
                    seen_edges.set(tr.from, to_slots);
                }
                let slots = to_slots.get(tr.to);
                if (slots === undefined) {
                    slots = new Set();
                    to_slots.set(tr.to, slots);
                    cursor_from.to.push(tr.to);
                    cursor_to.from.push(tr.from);
                }
                // duplicate-edge guard.  A probability-bearing action-less edge is exempt
                // (a weighted fan-out may repeat a target); every other edge claims a slot
                // — its action name, or '' for the one plain action-less edge — and a
                // repeated slot throws.  Distinct actions between the same pair coexist
                // (#325/#531).
                const edge_exempt = (!tr.action) && (tr.probability !== undefined);
                if (!edge_exempt) {
                    const slot = tr.action || '';
                    if (slots.has(slot)) {
                        throw new JssmError(this, `already has ${JSON.stringify(tr.from)} to ${JSON.stringify(tr.to)}`
                            + (tr.action ? ` on action ${JSON.stringify(tr.action)}` : ''));
                    }
                    slots.add(slot);
                }
                // add the edge; note its id
                this._edges.push(tr);
                const thisEdgeId = this._edges.length - 1;
                if (tr.forced_only) {
                    this._has_forced_transitions = true;
                }
                // guard against repeating a transition name
                if (tr.name) {
                    if (this._named_transitions.has(tr.name)) {
                        throw new JssmError(this, `named transition "${JSON.stringify(tr.name)}" already created`);
                    }
                    this._named_transitions.set(tr.name, thisEdgeId);
                }
                // set up the after mapping, if any
                if (tr.after_time) {
                    this._after_mapping.set(tr.from, [tr.to, tr.after_time]);
                }
                // set up the mapping, so that edges can be looked up by endpoint pairs
                let from_mapping = this._edge_map.get(tr.from);
                if (from_mapping === undefined) {
                    from_mapping = new Map();
                    this._edge_map.set(tr.from, from_mapping);
                }
                // first-declared wins: when several edges share a (from, to) pair (parallel
                // action edges, #325), lookup_transition_for resolves to the first one
                // declared, so it agrees with edges_between(...)[0].
                if (!from_mapping.has(tr.to)) {
                    from_mapping.set(tr.to, thisEdgeId);
                }
                // numeric mirror of the (from, to) endpoint mapping.  intern() rather
                // than id_of(): idempotent, and returns number (not number|undefined)
                // since both endpoints were just created above if missing.
                const from_id = this._state_interner.intern(tr.from);
                const to_id = this._state_interner.intern(tr.to);
                // first-declared wins (see _edge_map above): the transition fast-path that
                // reads this index resolves parallel (from, to) pairs to the first edge.
                const pair = pair_key(from_id, to_id);
                if (!this._edge_id_by_pair.has(pair)) {
                    this._edge_id_by_pair.set(pair, thisEdgeId);
                }
                this._edge_to_ids[thisEdgeId] = to_id;
                // outbound adjacency: every edge originating at tr.from, regardless of action/target.
                // _edge_map above keys a single edge per (from, to) and overwrites on collision, which
                // is fine for lookup_transition_for but loses information for edges_between when several
                // edges share endpoints across distinct actions.  This index preserves every edge id and
                // lets edges_between scan only one state's exits, not all of _edges.
                let outbound = this._outbound_edge_ids.get(tr.from);
                if (!outbound) {
                    outbound = [];
                    this._outbound_edge_ids.set(tr.from, outbound);
                }
                outbound.push(thisEdgeId);
                // set up the action mapping, so that actions can be looked up by origin
                if (tr.action) {
                    // forward mapping first by action name
                    let actionMap = this._actions.get(tr.action);
                    if (!(actionMap)) {
                        actionMap = new Map();
                        this._actions.set(tr.action, actionMap);
                    }
                    if (actionMap.has(tr.from)) {
                        throw new JssmError(this, `action ${JSON.stringify(tr.action)} already attached to origin ${JSON.stringify(tr.from)}`);
                    }
                    actionMap.set(tr.from, thisEdgeId);
                    // reverse mapping first by state origin name
                    let rActionMap = this._reverse_actions.get(tr.from);
                    if (!(rActionMap)) {
                        rActionMap = new Map();
                        this._reverse_actions.set(tr.from, rActionMap);
                    }
                    // no need to test for reverse mapping pre-presence;
                    // forward mapping already covers collisions
                    rActionMap.set(tr.action, thisEdgeId);
                    // numeric mirror of the (action, from) dispatch mapping
                    const action_id = this._action_interner.intern(tr.action);
                    this._edge_id_by_action_pair.set(pair_key(action_id, from_id), thisEdgeId);
                    // reverse mapping first by state target name
                    if (!(this._reverse_action_targets.has(tr.to))) {
                        this._reverse_action_targets.set(tr.to, new Map());
                    }
                    /* todo comeback
                       fundamental problem is roActionMap needs to be a multimap
                            const roActionMap = this._reverse_action_targets.get(tr.to);  // wasteful - already did has - refactor
                            if (roActionMap) {
                              if (roActionMap.has(tr.action)) {
                                throw new JssmError(this, `ro-action ${tr.to} already attached to action ${tr.action}`);
                              } else {
                                roActionMap.set(tr.action, thisEdgeId);
                              }
                            } else {
                              throw new JssmError(this, `should be impossible - flow doesn\'t know .set precedes .get yet again.  severe error?');
                            }
                    */
                }
            }
            if (Array.isArray(property_definition)) {
                for (const pr of property_definition) {
                    this._property_keys.add(pr.name);
                    if (Object.prototype.hasOwnProperty.call(pr, 'default_value')) {
                        this._default_properties.set(pr.name, pr.default_value);
                    }
                    if (Object.prototype.hasOwnProperty.call(pr, 'required') && (pr.required === true)) {
                        this._required_properties.add(pr.name);
                    }
                }
            }
            if (Array.isArray(val_definition)) {
                for (const vd of val_definition) {
                    this._val_keys.add(vd.name);
                    this._val_types.set(vd.name, vd.val_type);
                    if (Object.prototype.hasOwnProperty.call(vd, 'required') && (vd.required === true)) {
                        if (Object.prototype.hasOwnProperty.call(vd, 'default_value')) {
                            throw new JssmError(this, `The val "${vd.name}" is required, but also has a default; these conflict`);
                        }
                        this._required_vals.add(vd.name);
                    }
                }
                const supplied = (vals && (typeof vals === 'object')) ? vals : {};
                for (const name of Object.keys(supplied)) {
                    if (!this._val_keys.has(name)) {
                        throw new JssmError(this, `Cannot supply value for undeclared val "${name}"`);
                    }
                }
                this._val_keys.forEach(name => {
                    const vtype = this._val_types.get(name);
                    let value;
                    if (Object.prototype.hasOwnProperty.call(supplied, name)) {
                        value = supplied[name];
                    }
                    else {
                        const vd = val_definition.find(d => d.name === name);
                        if (vd && Object.prototype.hasOwnProperty.call(vd, 'default_value')) {
                            value = vd.default_value;
                        }
                        else if (this._required_vals.has(name)) {
                            throw new JssmError(this, `The val "${name}" is required, but no value was supplied`);
                        }
                        else {
                            // vals are non-null by default (megaspec §4.4): a val that is
                            // neither supplied, defaulted, nor required has no value of its
                            // declared type, so it is a construction error rather than undefined.
                            throw new JssmError(this, `The val "${name}" has no value: give it a default, declare it required, or supply it at construction (vals are non-null by default)`);
                        }
                    }
                    validate_val_value(name, vtype, value, this);
                    this._val_values.set(name, value);
                });
            }
            if (Array.isArray(state_property)) {
                for (const sp of state_property) {
                    this._state_properties.set(sp.name, sp.default_value);
                    // Record the unserialized (property, state) pair for post-build
                    // validation.  The compiler writes both fields; a hand-built config
                    // that carries only the serialized name pays one JSON.parse here,
                    // which is what every binding used to pay at validation time (#734).
                    let j_property = sp.property, j_state = sp.state;
                    if ((j_property === undefined) || (j_state === undefined)) {
                        const inside = JSON.parse(sp.name);
                        j_property = inside[0];
                        j_state = inside[1];
                    }
                    if (!(this._state_property_first_state.has(j_property))) {
                        this._state_property_first_state.set(j_property, j_state);
                    }
                }
            }
            // set initial state either from the specified or the start state list.  validate admission behavior.
            if (initial_state) {
                if (!(this._states.has(initial_state))) {
                    throw new JssmError(this, `requested start state ${initial_state} does not exist`);
                }
                if ((!(start_states_no_enforce)) && (!(start_states.includes(initial_state)))) {
                    throw new JssmError(this, `requested start state ${initial_state} is not in start state list; add {start_states_no_enforce:true} to constructor options if desired`);
                }
                this._state = initial_state;
            }
            else {
                this._state = start_states[0];
            }
            this._state_id = this._state_interner.intern(this._state);
            // done building, do checks
            // assert all props are valid
            // provenance pairs were recorded at insertion — first state per property,
            // in first-binding order — replacing the old JSON.parse of every
            // serialized key; the error fires for the same binding it always did,
            // because the first property in first-binding order whose name is
            // undeclared owns the earliest undeclared binding.
            this._state_property_first_state.forEach((j_state, j_property) => {
                if (!(this.known_prop(j_property))) {
                    throw new JssmError(this, `State "${j_state}" has property "${j_property}" which is not globally declared`);
                }
            });
            // assert all required properties are serviced
            // states() allocates a fresh array per call, so take it once rather than
            // once per required property
            const all_states_for_props = this.states();
            this._required_properties.forEach(dp_key => {
                if (this._default_properties.has(dp_key)) {
                    throw new JssmError(this, `The property "${dp_key}" is required, but also has a default; these conflict`);
                }
                for (const s of all_states_for_props) {
                    const bound_name = name_bind_prop_and_state(dp_key, s);
                    if (!(this._state_properties.has(bound_name))) {
                        throw new JssmError(this, `State "${s}" is missing required property "${dp_key}"`);
                    }
                }
            });
            // assert chosen starting state is valid
            if (!(this.has_state(this.state()))) {
                throw new JssmError(this, `Current start state "${this.state()}" does not exist`);
            }
            // assert all starting states are valid
            for (const [ssi, ss] of start_states.entries()) {
                if (!(this.has_state(ss))) {
                    throw new JssmError(this, `Start state ${ssi} "${ss}" does not exist`);
                }
            }
            // assert chosen starting state is valid
            if (start_states.length !== this._start_states.size) {
                throw new JssmError(this, `Start states cannot be repeated`);
            }
            // assert connectivity constraints imposed by allow_islands
            if (this._allow_islands !== true) {
                const components = find_connected_components(this._states, this._edges);
                if (this._allow_islands === false) {
                    if (components.length > 1) {
                        throw new JssmError(this, `allow_islands is false but the state graph has ${components.length} disconnected components`);
                    }
                }
                else {
                    // 'with_start': every component must contain at least one start state
                    for (const component of components) {
                        const has_start = component.some(s => this._start_states.has(s));
                        if (!has_start) {
                            throw new JssmError(this, `allow_islands is 'with_start' but a connected component has no start state: [${[...component].join(', ')}]`);
                        }
                    }
                }
            }
            this._created = this._time_source();
            this.auto_set_state_timeout();
            for (const declaration of [this._arrange_declaration, this._oarrange_declaration, this._farrange_declaration]) {
                for (const arrange_pair of declaration) {
                    for (const possibleState of arrange_pair) {
                        if (!(this._states.has(possibleState))) {
                            throw new JssmError(this, `Cannot arrange state that does not exist "${possibleState}"`);
                        }
                    }
                }
            }
        }
        /********
         *
         *  Internal method for fabricating states.  Not meant for external use.
         *
         *  @internal
         *
         */
        _new_state(state_config) {
            if (this._states.has(state_config.name)) {
                throw new JssmError(this, `state ${JSON.stringify(state_config.name)} already exists`);
            }
            this._states.set(state_config.name, state_config);
            this._state_interner.intern(state_config.name);
            return state_config.name;
        }
        /*********
         *
         *  Get the current state of a machine.
         *
         *  ```typescript
         *  import * as jssm from 'jssm';
         *
         *  const lswitch = jssm.from('on <=> off;');
         *  console.log( lswitch.state() );             // 'on'
         *
         *  lswitch.transition('off');
         *  console.log( lswitch.state() );             // 'off'
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @returns The current state name.
         *
         */
        state() {
            return this._state;
        }
        /*********
         *
         *  Get the label for a given state, if any; return `undefined` otherwise.
         *
         *  ```typescript
         *  import * as jssm from 'jssm';
         *
         *  const lswitch = jssm.from('a -> b; state a: { label: "Foo!"; };');
         *  console.log( lswitch.label_for('a') );              // 'Foo!'
         *  console.log( lswitch.label_for('b') );              // undefined
         *  ```
         *
         *  See also {@link display_text}.
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @param state The state to get the label for.
         *
         *  @returns The label string, or `undefined` if no label is set.
         *
         */
        label_for(state) {
            return this._state_labels.get(state);
        }
        /*********
         *
         *  Get whatever the node should show as text.
         *
         *  Currently, this means to get the label for a given state, if any;
         *  otherwise to return the node's name.  However, this definition is expected
         *  to grow with time, and it is currently considered ill-advised to manually
         *  parse this text.
         *
         *  See also {@link label_for}.
         *
         *  ```typescript
         *  import * as jssm from 'jssm';
         *
         *  const lswitch = jssm.from('a -> b; state a: { label: "Foo!"; };');
         *  console.log( lswitch.display_text('a') );              // 'Foo!'
         *  console.log( lswitch.display_text('b') );              // 'b'
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @param state The state to get display text for.
         *
         *  @returns The label if one exists, otherwise the state's name.
         *
         */
        display_text(state) {
            var _a;
            return (_a = this._state_labels.get(state)) !== null && _a !== void 0 ? _a : state;
        }
        /*********
         *
         *  Get the current data of a machine.
         *
         *  ```typescript
         *  import * as jssm from 'jssm';
         *
         *  const lswitch = jssm.from('on <=> off;', {data: 1});
         *  console.log( lswitch.data() );              // 1
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @returns A deep clone of the machine's current data value.
         *
         */
        data() {
            return structuredClone(this._data);
        }
        /*********
         *
         *  Replace the machine's data in place, without a transition.  This is the
         *  practical way to assign any value — including `undefined`, `null`, or
         *  `false` — outside a hook's complex return, closing the gap where an
         *  `undefined` assignment had no direct API (StoneCypher/fsl#1264).  Fires
         *  a `data-change` event with cause `'set_data'` when the value actually
         *  changes; unlike {@link override} it requires no `allows_override`
         *  config, because it never moves the state.
         *
         *  ```typescript
         *  import * as jssm from 'jssm';
         *
         *  const lswitch = jssm.from('on <=> off;', {data: 1});
         *  console.log( lswitch.data() );              // 1
         *
         *  lswitch.set_data(2);
         *  console.log( lswitch.data() );              // 2
         *
         *  lswitch.set_data(undefined);
         *  console.log( lswitch.data() );              // undefined
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @param newData The value to install as the machine's data.
         *
         *  @returns The machine, for chaining.
         *
         *  @see Machine.data
         *  @see override
         *
         */
        set_data(newData) {
            const oldData = this._data;
            this._data = newData;
            if (oldData !== newData) {
                this._fire('data-change', {
                    from: this._state,
                    to: this._state,
                    old_data: oldData,
                    new_data: newData,
                    cause: 'set_data'
                });
            }
            return this;
        }
        /**
         *  The machine's current data by REFERENCE — no clone.  The public
         *  {@link Machine.data} contract is a deep clone per call (a mutation
         *  boundary for external consumers, and deliberately untouched); that clone
         *  is `structuredClone` of the whole data value, which same-package
         *  read-only consumers — the fsl-bind and fsl-data-inspector panels, which
         *  read one dotted path or serialize per transition — should not pay on
         *  every event.  Callers MUST NOT mutate the returned value or store it
         *  beyond the current tick; anything crossing a trust boundary must use
         *  {@link Machine.data} instead.
         *
         *  ```typescript
         *  const m = jssm.from('on <=> off;', { data: { a: { b: 1 } } });
         *  m._data_ref().a.b;   // 1, zero-copy
         *  ```
         *  @returns The live data value; treat as read-only.
         *  @see Machine.data
         *  @internal
         */
        _data_ref() {
            return this._data;
        }
        /*********
         *
         *  Get the current value of a given property name.  Checks the current
         *  state's properties first, then falls back to the global default.
         *  Returns `undefined` if neither exists.  For a throwing variant, see
         *  {@link strict_prop}.
         *
         *  ```typescript
         *  const m = sm`property color default "grey"; a -> b;
         *               state b: { property color "blue"; };`;
         *
         *  m.prop('color');  // 'grey'  (default, because state is 'a')
         *  m.go('b');
         *  m.prop('color');  // 'blue'  (state 'b' overrides the default)
         *  m.prop('size');   // undefined (no such property)
         *  ```
         *
         *  @param name The relevant property name to look up.
         *
         *  @returns The value behind the prop name, or `undefined` if not defined.
         *
         */
        prop(name) {
            const bound_name = name_bind_prop_and_state(name, this.state());
            if (this._state_properties.has(bound_name)) {
                return this._state_properties.get(bound_name);
            }
            return this._default_properties.has(name) ? this._default_properties.get(name) : undefined;
        }
        /*********
         *
         *  Get the current value of a given property name.  If missing on the state
         *  and without a global default, throws a {@link JssmError}, unlike
         *  {@link prop}, which would return `undefined` instead.
         *
         *  ```typescript
         *  const m = sm`property color default "grey"; a -> b;`;
         *
         *  m.strict_prop('color');  // 'grey'
         *  m.strict_prop('size');   // throws JssmError
         *  ```
         *
         *  @param name The relevant property name to look up.
         *
         *  @returns The value behind the prop name.
         *
         *  @throws {JssmError} If the property is not defined on the current state
         *  and has no default.
         *
         */
        strict_prop(name) {
            const bound_name = name_bind_prop_and_state(name, this.state());
            if (this._state_properties.has(bound_name)) {
                return this._state_properties.get(bound_name);
            }
            if (this._default_properties.has(name)) {
                return this._default_properties.get(name);
            }
            throw new JssmError(this, `Strictly requested a prop '${name}' which doesn't exist on current state '${this.state()}' and has no default`);
        }
        /*********
         *
         *  Get the current value of every prop, as an object.  If no current definition
         *  exists for a prop — that is, if the prop was defined without a default and
         *  the current state also doesn't define the prop — then that prop will be listed
         *  in the returned object with a value of `undefined`.
         *
         *  ```typescript
         *  const traffic_light = sm`
         *
         *    property can_go     default true;
         *    property hesitate   default true;
         *    property stop_first default false;
         *
         *    Off -> Red => Green => Yellow => Red;
         *    [Red Yellow Green] ~> [Off FlashingRed];
         *    FlashingRed -> Red;
         *
         *    state Red:         { property: stop_first true;  property: can_go false; };
         *    state Off:         { property: stop_first true;  };
         *    state FlashingRed: { property: stop_first true;  };
         *    state Green:       { property: hesitate   false; };
         *
         *  `;
         *
         *  traffic_light.state();  // Off
         *  traffic_light.props();  // { can_go: true,  hesitate: true,  stop_first: true  }
         *
         *  traffic_light.go('Red');
         *  traffic_light.props();  // { can_go: false, hesitate: true,  stop_first: true  }
         *
         *  traffic_light.go('Green');
         *  traffic_light.props();  // { can_go: true,  hesitate: false, stop_first: false }
         *  ```
         *
         *  @returns An object mapping every known property name to its current value
         *  (or `undefined` if the property has no default and the current state
         *  doesn't define it).
         *
         */
        props() {
            const ret = {};
            for (const p of this.known_props())
                ret[p] = this.prop(p);
            return ret;
        }
        // TODO: sparse_props — like props() but omits undefined entries
        // sparse_props(name: string): object { }
        // TODO: strict_props — like props() but throws on any undefined entry
        // strict_props(name: string): object { }
        /*********
         *
         *  Check whether a given string is a known property's name.
         *
         *  ```typescript
         *  const example = sm`property foo default 1; a->b;`;
         *
         *  example.known_prop('foo');  // true
         *  example.known_prop('bar');  // false
         *  ```
         *
         *  @param prop_name The relevant property name to look up
         *
         */
        known_prop(prop_name) {
            return this._property_keys.has(prop_name);
        }
        /*********
         *
         *  List all known property names.  If you'd also like values, use
         *  {@link props} instead.  The order of the properties is not defined, and
         *  the properties generally will not be sorted.
         *
         *  ```typescript
         *  const m = sm`property color default "grey"; property size default 1; a -> b;`;
         *
         *  m.known_props();  // ['color', 'size']
         *  ```
         *
         *  @returns An array of all property name strings defined on this machine.
         *
         */
        known_props() {
            return [...this._property_keys];
        }
        /*********
         *
         *  Read the current value of a declared machine `val`.
         *
         *  ```typescript
         *  const m = sm`val ok : boolean default true; a -> b;`;
         *
         *  m.val('ok');   // true
         *  ```
         *
         *  @param name The declared val name to read.
         *  @returns The val's current value (or `undefined` if it has no default and was not supplied).
         *  @throws {JssmError} If `name` is not a declared val.
         *
         */
        val(name) {
            if (!this._val_keys.has(name)) {
                throw new JssmError(this, `No such val "${name}"`);
            }
            return this._val_values.get(name);
        }
        /*********
         *
         *  Set the value of a declared machine `val`, validating it against the val's
         *  declared type.  This is the runtime mutation surface; source-level `assign`
         *  arrives in a later phase.
         *
         *  ```typescript
         *  const m = sm`val n : int default 0; a -> b;`;
         *
         *  m.set_val('n', 5);
         *  m.val('n');   // 5
         *  ```
         *
         *  @param name  The declared val name to write.
         *  @param value The new value; must satisfy the val's declared type.
         *  @throws {JssmError} If `name` is not a declared val, or `value` violates the type.
         *
         */
        set_val(name, value) {
            if (!this._val_keys.has(name)) {
                throw new JssmError(this, `No such val "${name}"`);
            }
            validate_val_value(name, this._val_types.get(name), value, this);
            this._val_values.set(name, value);
        }
        /*********
         *
         *  Return a plain object mapping every declared val name to its current value.
         *
         *  ```typescript
         *  const m = sm`val a : int default 1; val b : boolean default false; x -> y;`;
         *
         *  m.vals();   // { a: 1, b: false }
         *  ```
         *
         *  @returns An object of every declared val name to its current value.
         *
         */
        vals() {
            const result = {};
            this._val_keys.forEach(name => { result[name] = this._val_values.get(name); });
            return result;
        }
        /*********
         *
         *  Check whether a string is the name of a declared `val`.
         *
         *  ```typescript
         *  const m = sm`val a : int default 1; x -> y;`;
         *
         *  m.known_val('a');   // true
         *  m.known_val('z');   // false
         *  ```
         *
         *  @param name The candidate val name.
         *  @returns Whether the name is a declared val.
         *
         */
        known_val(name) {
            return this._val_keys.has(name);
        }
        /*********
         *
         *  List every declared `val` name, in declaration order.
         *
         *  ```typescript
         *  const m = sm`val a : int default 1; val b : int default 2; x -> y;`;
         *
         *  m.known_vals();   // ['a', 'b']
         *  ```
         *
         *  @returns The declared val names in declaration order.
         *
         */
        known_vals() {
            return [...this._val_keys];
        }
        /*********
         *
         *  Return the declared type descriptor of a `val`.
         *
         *  ```typescript
         *  const m = sm`val n : int 0..3 default 0; x -> y;`;
         *
         *  m.val_type('n');   // { kind: 'int', lo: 0, hi: 3 }
         *  ```
         *
         *  @param name The declared val name.
         *  @returns The val's declared type descriptor.
         *  @throws {JssmError} If `name` is not a declared val.
         *
         */
        val_type(name) {
            if (!this._val_keys.has(name)) {
                throw new JssmError(this, `No such val "${name}"`);
            }
            return this._val_types.get(name);
        }
        /********
         *
         *  Check whether a given state is a valid start state (either because it was
         *  explicitly named as such, or because it was the first mentioned state.)
         *
         *  ```typescript
         *  import { sm, is_start_state } from 'jssm';
         *
         *  const example = sm`a -> b;`;
         *
         *  console.log( final_test.is_start_state('a') );   // true
         *  console.log( final_test.is_start_state('b') );   // false
         *
         *  const example = sm`start_states: [a b]; a -> b;`;
         *
         *  console.log( final_test.is_start_state('a') );   // true
         *  console.log( final_test.is_start_state('b') );   // true
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @param whichState The name of the state to check
         *
         */
        is_start_state(whichState) {
            return this._start_states.has(whichState);
        }
        /********
         *
         *  Check whether a given state is a valid start state (either because it was
         *  explicitly named as such, or because it was the first mentioned state.)
         *
         *  ```typescript
         *  import { sm, is_end_state } from 'jssm';
         *
         *  const example = sm`a -> b;`;
         *
         *  console.log( final_test.is_start_state('a') );   // false
         *  console.log( final_test.is_start_state('b') );   // true
         *
         *  const example = sm`end_states: [a b]; a -> b;`;
         *
         *  console.log( final_test.is_start_state('a') );   // true
         *  console.log( final_test.is_start_state('b') );   // true
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @param whichState The name of the state to check
         *
         */
        is_end_state(whichState) {
            return this._end_states.has(whichState);
        }
        /********
         *
         *  Get the set of states declared as failure outputs for this machine.
         *  Returns an array of state labels, or an empty array when none were
         *  declared.  A state in this list means the machine is in a failure
         *  condition when it occupies that state.
         *
         *  @see {@link is_failed_output} to test a single state
         *  @see {@link is_failed} to test the current state
         *
         */
        failed_outputs() {
            return [...this._failed_outputs];
        }
        /********
         *
         *  Check whether a given state is declared as a failure output.
         *
         *  @param whichState The name of the state to check
         *
         *  @see {@link failed_outputs} for the full failure-output set
         *  @see {@link is_failed} to test the current state
         *
         */
        is_failed_output(whichState) {
            return this._failed_outputs.has(whichState);
        }
        /********
         *
         *  Check whether the machine is currently in a failure state — that is,
         *  whether its current state is one of the declared `failed_outputs`.
         *
         *  @see {@link failed_outputs} for the full failure-output set
         *  @see {@link is_failed_output} to test an arbitrary state
         *
         */
        is_failed() {
            return this._failed_outputs.has(this._state);
        }
        /********
         *
         *  Check whether a given state is final (either has no exits or is marked
         *  `complete`.)
         *
         *  ```typescript
         *  import { sm, state_is_final } from 'jssm';
         *
         *  const final_test = sm`first -> second;`;
         *
         *  console.log( final_test.state_is_final('first') );   // false
         *  console.log( final_test.state_is_final('second') );  // true
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @param whichState The name of the state to check for finality
         *
         */
        state_is_final(whichState) {
            return ((this.state_is_terminal(whichState)) || (this.state_is_complete(whichState)));
        }
        /********
         *
         *  Check whether the current state is final (either has no exits or is marked
         *  `complete`.)
         *
         *  ```typescript
         *  import { sm, is_final } from 'jssm';
         *
         *  const final_test = sm`first -> second;`;
         *
         *  console.log( final_test.is_final() );   // false
         *  state.transition('second');
         *  console.log( final_test.is_final() );   // true
         *  ```
         *
         */
        is_final() {
            //  return ((!this.is_changing()) && this.state_is_final(this.state()));
            return this.state_is_final(this.state());
        }
        /********
         *
         *  Serialize the current machine, including all defining state but not the
         *  machine string, to a structure.  This means you will need the machine
         *  string to recreate (to not waste repeated space;) if you want the machine
         *  string embedded, call `serialize_with_string` instead.
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @param comment An optional comment string to embed in the serialized
         *  output for identification or debugging.
         *
         *  @returns A {@link JssmSerialization} object containing the machine's
         *  current state, data, and timestamp.
         *
         */
        serialize(comment) {
            return {
                comment,
                state: this._state,
                data: this._data,
                jssm_version: version,
                history: this._history.toArray(),
                history_capacity: this._history.capacity,
                timestamp: this._time_source(),
            };
        }
        /**
         *  The RFC 8785 canonical-config identity of the current configuration
         *  (`{v, state, data}`) — the byte-stable, replay-derivable core used for
         *  hashing.  Excludes envelope fields (timestamp/comment/history).
         *  @returns The canonical config string.
         *  @example
         *    import { sm } from 'jssm';
         *    sm`a -> b;`.canonical().includes('"state":"a"');  // => true
         */
        canonical() {
            return canonical_config(this._state, this._data);
        }
        /**
         * Get the graph layout direction (e.g. `'LR'`, `'TB'`).  Set via the
         *  FSL `graph_layout` directive.
         *  @returns The layout string, or the default if not set.
         */
        graph_layout() {
            return this._graph_layout;
        }
        /**
         * Get the Graphviz DOT preamble string, injected before the graph body
         *  during visualization.  Set via the FSL `dot_preamble` directive.
         *  @returns The preamble string.
         */
        dot_preamble() {
            return this._dot_preamble;
        }
        /**
         * Get the consolidated `transition: {}` default-config block: the ordered,
         *  de-duplicated `{ key, value }[]` list of edge-default style items compiled
         *  from a `transition: {}` block (e.g. `transition: { color: blue; }`).  The
         *  viz layer projects this onto a Graphviz `edge [ … ]` default statement so
         *  every edge inherits it.
         *
         *  ```typescript
         *  import { sm } from 'jssm';
         *  sm`a -> b; transition: { color: blue; };`.default_transition_config();
         *  // [ { key: 'color', value: '#0000ffff' } ]
         *  ```
         *  @returns The transition-config item list, or `undefined` if the machine
         *  declared no `transition: {}` block.
         *  @see default_graph_config
         */
        default_transition_config() {
            return this._default_transition_config;
        }
        /**
         * Get the consolidated `graph: {}` default-config block: the ordered,
         *  de-duplicated `{ key, value }[]` list of graph-scope style items.  The
         *  compiler folds the deprecated top-level graph keywords
         *  (`graph_bg_color` → `background-color`, plus `graph_layout`, `theme`,
         *  `flow`, `dot_preamble`) into this list first, then lets an explicit
         *  `graph: {}` block win on key conflict.  The viz layer projects the
         *  graph-meaningful keys onto graph-scope Graphviz attributes (e.g.
         *  `background-color` → `bgcolor`).
         *
         *  ```typescript
         *  import { sm } from 'jssm';
         *  sm`a -> b; graph: { background-color: #ffffff; };`.default_graph_config();
         *  // [ { key: 'background-color', value: '#ffffffff' } ]
         *  ```
         *  @returns The graph-config item list, or `undefined` if the machine has no
         *  graph config (no `graph: {}` block and no deprecated graph keyword).
         *  @see default_transition_config
         */
        default_graph_config() {
            return this._default_graph_config;
        }
        /**
         * Get the machine's author list.  Set via the FSL `machine_author` directive.
         *  @returns An array of author name strings.
         */
        machine_author() {
            return this._machine_author;
        }
        /**
         * Get the machine's comment string.  Set via the FSL `machine_comment` directive.
         *  @returns The comment string.
         */
        machine_comment() {
            return this._machine_comment;
        }
        /**
         * Get the machine's contributor list.  Set via the FSL `machine_contributor` directive.
         *  @returns An array of contributor name strings.
         */
        machine_contributor() {
            return this._machine_contributor;
        }
        /**
         * Get the machine's definition string.  Set via the FSL `machine_definition` directive.
         *  @returns The definition string.
         */
        machine_definition() {
            return this._machine_definition;
        }
        /**
         * Get the machine's natural language as an ISO 639-1 code.  Set via the FSL
         *  `machine_language` directive, which accepts a language name or code, or a
         *  BCP-47 tag whose region subtag is dropped (`en-us` -> `en`).  Unrecognized
         *  values resolve to `undefined`.
         *  @returns The ISO 639-1 language code (e.g. `'en'`), or `undefined` if the
         *           supplied value did not resolve to a known language.
         */
        machine_language() {
            return this._machine_language;
        }
        /**
         * Get the machine's license string.  Set via the FSL `machine_license` directive.
         *  @returns The license string.
         */
        machine_license() {
            return this._machine_license;
        }
        /**
         * Get the machine's name.  Set via the FSL `machine_name` directive.
         *  @returns The machine name string.
         */
        machine_name() {
            return this._machine_name;
        }
        /**
         * The editor/panel defaults declared in the FSL `editor: {}` block, or
         *  `undefined` when none was given.  Read by the all-widgets web control
         *  (fsl#1334) — `panels` drives `request` panel mode.
         *  @returns `{ stochastic_run_count?, panels? }`, or `undefined`.
         *  @example
         *    const m = sm`editor: { panels: [history]; }; a -> b;`;
         *    m.editor_config();  // => { panels: ['history'] }
         */
        editor_config() {
            return this._editor_config;
        }
        /**
         * Get the npm package name associated with the machine.  Set via the FSL `npm_name` directive.
         *  Returns `undefined` when not present.
         *  @returns The npm package name string, or `undefined`.
         *  @see machine_name
         */
        npm_name() {
            return this._npm_name;
        }
        /**
         * Get the render-size hint for the machine's visualization.  Set via the
         *  FSL `default_size` directive.  Returns `undefined` when not present.
         *
         *  The three FSL forms each produce a different subset of fields:
         *
         *  - `default_size: 800;`       → `{ width: 800 }`
         *  - `default_size: 800 600;`   → `{ width: 800, height: 600 }`
         *  - `default_size: height 600;` → `{ height: 600 }`
         *
         *  This is a hint, not a hard constraint.  Renderers may ignore it.
         *  @returns The size-hint object, or `undefined` if not set.
         *  @see npm_name
         */
        default_size() {
            return this._default_size;
        }
        /**
         * Get the machine's declared version, parsed.  Set via the FSL
         *  `machine_version` directive, which takes a semver triple; the parser
         *  breaks it into numeric `major`/`minor`/`patch` fields and keeps the
         *  exact source text in `full`.  Returns `undefined` when the directive
         *  was not given.
         *  @returns The parsed {@link JssmParsedSemver}, or `undefined` if unset.
         *  @example
         *    const m = sm`machine_version: 1.2.3; a -> b;`;
         *    m.machine_version();  // => { major: 1, minor: 2, patch: 3, full: '1.2.3' }
         *  @see fsl_version
         */
        machine_version() {
            return this._machine_version;
        }
        /**
         * Get the raw state declaration objects as parsed from the FSL source.
         *  @returns An array of raw state declaration objects.
         */
        raw_state_declarations() {
            return this._raw_state_declaration;
        }
        /**
         * Get the processed state declaration for a specific state.
         *  @param which - The state to look up.
         *  @returns The {@link JssmStateDeclaration} for the given state.
         */
        state_declaration(which) {
            return this._state_declarations.get(which);
        }
        /**
         * Get all processed state declarations as a Map.
         *  @returns A `Map` from state name to {@link JssmStateDeclaration}.
         */
        state_declarations() {
            return this._state_declarations;
        }
        /**
         * Get the FSL language version this machine declares, parsed.  Set via
         *  the FSL `fsl_version` directive, which takes a semver triple; the
         *  parser breaks it into numeric `major`/`minor`/`patch` fields and keeps
         *  the exact source text in `full`.  Returns `undefined` when the
         *  directive was not given.
         *  @returns The parsed {@link JssmParsedSemver}, or `undefined` if unset.
         *  @example
         *    const m = sm`fsl_version: 1.0.0; a -> b;`;
         *    m.fsl_version();  // => { major: 1, minor: 0, patch: 0, full: '1.0.0' }
         *  @see machine_version
         */
        fsl_version() {
            return this._fsl_version;
        }
        /**
         * Get the complete internal state of the machine as a serializable
         *  structure.  Includes actions, edges, edge map, named transitions,
         *  reverse actions, current state, and states map.
         *  @returns A {@link JssmMachineInternalState} snapshot.
         */
        machine_state() {
            return {
                internal_state_impl_version: 1,
                actions: this._actions,
                edge_map: this._edge_map,
                edges: this._edges,
                named_transitions: this._named_transitions,
                reverse_actions: this._reverse_actions,
                // reverse_action_targets : this._reverse_action_targets,
                state: this._state,
                states: this._states
            };
        }
        /*********
         *
         *  List all the states known by the machine.  Please note that the order of
         *  these states is not guaranteed.
         *
         *  ```typescript
         *  import * as jssm from 'jssm';
         *
         *  const lswitch = jssm.from('on <=> off;');
         *  console.log( lswitch.states() );             // ['on', 'off']
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @returns An array of all state names in the machine.
         *
         */
        states() {
            return [...this._states.keys()];
        }
        /**
         * Get the internal state descriptor for a given state name.
         *  @param whichState - The state to look up.
         *  @returns The {@link JssmGenericState} descriptor.
         *  @throws {JssmError} If the state does not exist.
         */
        state_for(whichState) {
            const state = this._states.get(whichState);
            if (state) {
                return state;
            }
            throw new JssmError(this, 'No such state', { requested_state: whichState });
        }
        /*********
         *
         *  Check whether the machine knows a given state.
         *
         *  ```typescript
         *  import * as jssm from 'jssm';
         *
         *  const lswitch = jssm.from('on <=> off;');
         *
         *  console.log( lswitch.has_state('off') );     // true
         *  console.log( lswitch.has_state('dance') );   // false
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @param whichState The state to be checked for existence.
         *
         *  @returns `true` if the state exists, `false` otherwise.
         *
         */
        has_state(whichState) {
            return this._states.has(whichState);
        }
        /*********
         *
         *  Lists all edges of a machine.
         *
         *  ```typescript
         *  import { sm } from 'jssm';
         *
         *  const lswitch = sm`on 'toggle' <=> 'toggle' off;`;
         *
         *  lswitch.list_edges();
         *  [
         *    {
         *      from: 'on',
         *      to: 'off',
         *      kind: 'main',
         *      forced_only: false,
         *      main_path: true,
         *      action: 'toggle'
         *    },
         *    {
         *      from: 'off',
         *      to: 'on',
         *      kind: 'main',
         *      forced_only: false,
         *      main_path: true,
         *      action: 'toggle'
         *    }
         *  ]
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @returns An array of all {@link JssmTransition} edge objects.
         *
         */
        list_edges() {
            return this._edges;
        }
        /**
         * Get the map of named transitions (transitions with explicit names).
         *  @returns A `Map` from transition name to edge index.
         */
        list_named_transitions() {
            return this._named_transitions;
        }
        /**
         * List all distinct action names defined anywhere in the machine.
         *  @returns An array of action name strings.
         */
        list_actions() {
            return [...this._actions.keys()];
        }
        /**
         * Whether any actions are defined on this machine.
         *  @returns `true` if the machine has at least one action.
         */
        get uses_actions() {
            // Map.size answers emptiness without materializing the key list
            return this._actions.size > 0;
        }
        /**
         * Whether any forced (`~>`) transitions exist in this machine.
         *  @returns `true` if at least one forced transition is defined.
         */
        get uses_forced_transitions() {
            return this._has_forced_transitions;
        }
        /*********
         *
         *  Check if the code that built the machine allows overriding state and data.
         *
         *  @returns The override permission from the FSL source code.
         *
         */
        get code_allows_override() {
            return this._code_allows_override;
        }
        /*********
         *
         *  Check if the machine config allows overriding state and data.
         *
         *  @returns The override permission from the runtime config.
         *
         */
        get config_allows_override() {
            return this._config_allows_override;
        }
        /*********
         *
         *  Check if a machine allows overriding state and data.  Resolves the
         *  combined effect of code and config permissions — config may not be
         *  less strict than code.
         *
         *  @returns The effective override permission.
         *
         */
        get allows_override() {
            // tri-state throughout: undefined is a legal, distinct value for both
            // fields — literal comparisons are semantics, not style
            // code false?  config true, throw.  config false, false.  config undefined, false.
            if (this._code_allows_override === false) {
                /* istanbul ignore next */
                if (this._config_allows_override === true) {
                    /* istanbul ignore next */
                    throw new JssmError(this, "Code specifies no override, but config tries to permit; config may not be less strict than code; should be unreachable");
                }
                return false;
            }
            // code true?  config true, true.  config false, false.  config undefined, true.
            if (this._code_allows_override === true) {
                return this._config_allows_override !== false;
            }
            // code must be undefined.  config false, false.  config true, true.  config undefined, false.
            return this._config_allows_override === true;
        }
        /*********
         *
         *  Return the effective island policy for this machine.  `true` means
         *  disconnected components are allowed (the default), `false` requires a
         *  single connected component, and `'with_start'` allows islands only when
         *  every component contains at least one start state.
         *
         *  @returns The island policy stored in the machine.
         *
         */
        get allow_islands() {
            return this._allow_islands;
        }
        /**
         * List all available theme names.
         *  @returns An array of theme name strings.
         */
        all_themes() {
            return [...theme_mapping.keys()]; // constructor sets this to "default" otherwise
        }
        /**
         * List the character ranges accepted by the FSL grammar in any but the
         *  first position of a state name (atom).  Each entry is an inclusive
         *  `{from, to}` range of single Unicode characters.
         *  @returns An array of `{from, to}` inclusive character ranges.
         *  @example
         *  import { sm } from 'jssm';
         *  const m = sm`a -> b;`;
         *  m.all_state_name_chars().some(r => '+' >= r.from && '+' <= r.to);  // => true
         */
        all_state_name_chars() {
            return state_name_chars;
        }
        /**
         * List the character ranges accepted by the FSL grammar in the first
         *  position of a state name (atom).  Narrower than
         *  {@link all_state_name_chars}: notably omits `+`, `(`, `)`, `&`, `#`, `@`.
         *  @returns An array of `{from, to}` inclusive character ranges.
         *  @example
         *  import { sm } from 'jssm';
         *  const m = sm`a -> b;`;
         *  m.all_state_name_first_chars().some(r => '+' >= r.from && '+' <= r.to);  // => false
         */
        all_state_name_first_chars() {
            return state_name_first_chars;
        }
        /**
         * List the character ranges accepted inside a single-quoted FSL action
         *  label without escaping.  Space is allowed; the apostrophe `'` is
         *  explicitly excluded since it terminates the label.
         *  @returns An array of `{from, to}` inclusive character ranges.
         *  @example
         *  import { sm } from 'jssm';
         *  const m = sm`a -> b;`;
         *  m.all_action_label_chars().some(r => ' ' >= r.from && ' ' <= r.to);   // => true
         *  m.all_action_label_chars().some(r => "'" >= r.from && "'" <= r.to);   // => false
         */
        all_action_label_chars() {
            return action_label_chars;
        }
        /**
         * Get the active theme(s) for this machine.  Always stored as an array
         *  internally; the union return type exists for setter compatibility.
         *  @returns The current theme or array of themes.
         */
        get themes() {
            return this._themes; // constructor sets this to "default" otherwise
        }
        /**
         * Set the active theme(s).  Accepts a single theme name or an array.
         *  Also drops every memoized static state config, so styles resolved
         *  before the change re-resolve under the new theme stack.
         *
         *  ```typescript
         *  const m = sm`a -> b;`;
         *  m.style_for('b');                 // resolved under the default theme
         *  m.themes = 'ocean';
         *  m.style_for('b').backgroundColor; // 'cadetblue1' — ocean, not a stale default
         *  ```
         *  @param to - A theme name or array of theme names to apply.
         *  @see resolve_state_config
         */
        set themes(to) {
            this._themes = typeof to === 'string' ? [to] : to;
            // Themes feed tier 1 (and the per-kind/hooked theme layers) of
            // resolve_state_config's cascade, whose static resolution is memoized
            // per state.  Invalidate the memo so a theme assigned after a style has
            // been computed is not shadowed by the old theme's cached resolution —
            // the same rule set_hook / remove_hook apply for the hooked layer.
            this._static_state_config_cache.clear();
        }
        /**
         * Get the flow direction for graph layout (e.g. `'right'`, `'down'`).
         *  Set via the FSL `flow` directive.
         *  @returns The current flow direction.
         */
        flow() {
            return this._flow;
        }
        /**
         * Look up a transition's edge index by source and target state names.
         *  @param from - Source state name.
         *  @param to   - Target state name.
         *  @returns The edge index in the edges array, or `undefined` if no
         *  such transition exists.
         */
        get_transition_by_state_names(from, to) {
            const emg = this._edge_map.get(from);
            return emg ? emg.get(to) : undefined;
        }
        /**
         * Look up the full transition object for a given source→target pair.
         *  @param from - Source state name.
         *  @param to   - Target state name.
         *  @returns The {@link JssmTransition} object, or `undefined` if none exists.
         */
        lookup_transition_for(from, to) {
            const id = this.get_transition_by_state_names(from, to);
            return ((id === undefined) || (id === null)) ? undefined : this._edges[id];
        }
        /********
         *
         *  List all transitions attached to the current state, sorted by entrance and
         *  exit.  The order of each sublist is not defined.  A node could appear in
         *  both lists.
         *
         *  ```typescript
         *  import { sm } from 'jssm';
         *
         *  const light = sm`red 'next' -> green 'next' -> yellow 'next' -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
         *
         *  light.state();               // 'red'
         *  light.list_transitions();    // { entrances: [ 'yellow', 'off' ], exits: [ 'green', 'off' ] }
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @param whichState The state whose transitions to have listed
         *
         */
        list_transitions(whichState = this.state()) {
            return { entrances: this.list_entrances(whichState), exits: this.list_exits(whichState) };
        }
        /********
         *
         *  List all entrances attached to the current state.  Please note that the
         *  order of the list is not defined.  This list includes both unforced and
         *  forced entrances; if this isn't desired, consider
         *  `list_unforced_entrances` or `list_forced_entrances` as
         *  appropriate.
         *
         *  ```typescript
         *  import { sm } from 'jssm';
         *
         *  const light = sm`red 'next' -> green 'next' -> yellow 'next' -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
         *
         *  light.state();               // 'red'
         *  light.list_entrances();      // [ 'yellow', 'off' ]
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @param whichState The state whose entrances to have listed
         *
         */
        list_entrances(whichState = this.state()) {
            var _a, _b;
            const guaranteed = ((_a = this._states.get(whichState)) !== null && _a !== void 0 ? _a : { from: undefined });
            return (_b = guaranteed.from) !== null && _b !== void 0 ? _b : [];
        }
        /********
         *
         *  List all exits attached to the current state.  Please note that the order
         *  of the list is not defined.  This list includes both unforced and forced
         *  exits; if this isn't desired, consider `list_unforced_exits` or
         *  `list_forced_exits` as appropriate.
         *
         *  ```typescript
         *  import { sm } from 'jssm';
         *
         *  const light = sm`red 'next' -> green 'next' -> yellow 'next' -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
         *
         *  light.state();               // 'red'
         *  light.list_exits();          // [ 'green', 'off' ]
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @param whichState The state whose exits to have listed
         *
         */
        list_exits(whichState = this.state()) {
            var _a, _b;
            const guaranteed = ((_a = this._states.get(whichState)) !== null && _a !== void 0 ? _a : { to: undefined });
            return (_b = guaranteed.to) !== null && _b !== void 0 ? _b : [];
        }
        /**
         * Get the transitions available from a state for use by the probabilistic
         *  walk system.
         *
         *  If any exit declares a `probability`, only those probability-bearing
         *  exits are returned, so that non-probability peers cannot dilute the
         *  declared distribution.  If no exit declares a `probability`, every
         *  legal (non-forced) exit is returned, which `weighted_rand_select`
         *  treats as equal weight.  Forced-only exits (`~>`) are always excluded,
         *  since they cannot be taken by an ordinary `transition()` call.
         *
         *  Fixes StoneCypher/fsl#1325, in which the function previously returned
         *  every exit unconditionally — including forced-only exits and exits
         *  with no `probability`, which distorted the weighted distribution.
         *  @param whichState - The state to inspect.
         *  @returns An array of {@link JssmTransition} edges exiting the state,
         *  filtered as described above.  May be empty.
         *  @throws {JssmError} If the state does not exist.
         */
        probable_exits_for(whichState) {
            const wstate = this._states.get(whichState);
            if (!(wstate)) {
                throw new JssmError(this, `No such state ${JSON.stringify(whichState)} in probable_exits_for`);
            }
            // single pass over the state's exits, replacing the old map -> filter ->
            // filter -> filter chain and its three intermediate arrays; selection and
            // ordering semantics are unchanged
            const legal_exits = [], probability_bearing = [];
            // hoisted: every exit shares whichState, so probe _edge_map for the
            // from-side once instead of re-hashing the same key per exit inside
            // lookup_transition_for.  wstate.to is non-empty only when at least one
            // outbound edge exists, and every outbound edge creates the from-side
            // mapping at construction — so emg is defined whenever the loop runs.
            const emg = this._edge_map.get(whichState);
            for (const ws of wstate.to) {
                // wstate.to is built from the same edge set _edge_map indexes, so the
                // per-target get cannot miss; the guard mirrors the old defensive
                // .filter(Boolean) and is equally unreachable.
                const edge = this._edges[emg.get(ws)];
                /* v8 ignore next */
                if (!edge) {
                    continue;
                }
                // forced-only exits cannot be reached by transition(), so they are
                // never legal probabilistic outcomes
                if (edge.forced_only) {
                    continue;
                }
                legal_exits.push(edge);
                // if any legal exit declares a probability, only those are returned, so
                // that probability-bearing edges are not diluted by their peers
                if (edge.probability !== undefined) {
                    probability_bearing.push(edge);
                }
            }
            return (probability_bearing.length > 0) ? probability_bearing : legal_exits;
        }
        /**
         * Guard for the random-selection paths ({@link Machine.probabilistic_transition},
         *  {@link Machine.stochastic_runs}): rejects a candidate pool whose total
         *  selectable weight is zero, because weighted selection over an all-zero
         *  pool has no meaningful answer (StoneCypher/fsl#1248).  Undeclared
         *  probabilities count as weight 1, matching {@link weighted_rand_select}.
         *  An empty pool is not this guard's concern (terminality is handled by the
         *  callers) and passes through untouched.
         *
         *  ```typescript
         *  const m = sm`a 0% -> b; a 0% -> c;`;
         *  m.probabilistic_transition();  // throws JssmError — every exit is 0%
         *  ```
         *  @param whichState - The state the pool exits from, named in the error.
         *  @param exits - The candidate pool, as built by {@link Machine.probable_exits_for}.
         *  @throws {JssmError} If the pool is non-empty and every candidate edge
         *  has probability 0 — including the case where explicit `0%` edges
         *  excluded their unweighted sibling edges from the candidate pool.
         *  @see probable_exits_for
         */
        _assert_selectable_exit_pool(whichState, exits) {
            if (exits.length === 0) {
                return;
            }
            let total = 0;
            for (const e of exits) {
                total += (e.probability === undefined) ? 1 : e.probability;
            }
            if (total > 0) {
                return;
            }
            throw new JssmError(this, `Cannot randomly select an exit from state ${JSON.stringify(whichState)}: every candidate edge has probability 0%.  Note that an explicit 0% edge excludes unweighted sibling edges from the candidate pool (StoneCypher/fsl#1248)`);
        }
        /**
         * Take a single random transition from the current state, weighted by
         *  edge probabilities.
         *  @returns `true` if a transition was taken, `false` otherwise.
         *  @throws {JssmError} If the candidate exit pool is non-empty but its
         *  total weight is zero — every candidate declares `0%` — per
         *  StoneCypher/fsl#1248.
         */
        probabilistic_transition() {
            const exits = this.probable_exits_for(this.state());
            this._assert_selectable_exit_pool(this.state(), exits);
            const selected = weighted_rand_select(exits, undefined, this._rng);
            return this.transition(selected.to);
        }
        /**
         * Take `n` consecutive probabilistic transitions and return the sequence
         *  of states visited (before each transition).
         *  @param n - Number of steps to walk.
         *  @returns An array of state names visited during the walk.
         *  @throws {JssmError} If a visited state's candidate exit pool is
         *  non-empty but all-zero-weight (StoneCypher/fsl#1248).
         */
        probabilistic_walk(n) {
            return [...seq(n)
                    .map(() => {
                    const state_was = this.state();
                    this.probabilistic_transition();
                    return state_was;
                }), this.state()];
        }
        /**
         * Take `n` probabilistic steps and return a histograph of how many times
         *  each state was visited.
         *  @param n - Number of steps to walk.
         *  @returns A `Map` from state name to visit count.
         *  @throws {JssmError} If a visited state's candidate exit pool is
         *  non-empty but all-zero-weight (StoneCypher/fsl#1248).
         */
        probabilistic_histo_walk(n) {
            return histograph(this.probabilistic_walk(n));
        }
        /**
         * One non-destructive weighted-random walk over the graph from `start`.
         *
         *  Reads the graph and advances the PRNG only — it never calls
         *  {@link Machine.transition}, so it fires no hooks, mutates no machine
         *  state, and touches no `data`.  A state with no probabilistic exits
         *  (a terminal, or a forced-only `~>` state) ends the walk.
         *
         *  Terminality is checked before the first transition and after every
         *  transition.  A terminal start therefore completes with length zero even
         *  when `max_steps` is zero, and a terminal reached on the final permitted
         *  transition is completed rather than step-capped.
         *  @param start - State to begin the walk from.
         *  @param max_steps - Maximum transitions before the walk is step-capped.
         *  @param exit_memo - Per-run-set cache of {@link Machine.probable_exits_for}
         *    results.  The graph is immutable after construction, so a state's
         *    probable exits never change; sharing one memo across a generator's
         *    runs collapses runs×steps re-derivations (two array allocations and an
         *    exit rescan per step) to one per distinct state.  The memo only reuses
         *    the derived arrays — RNG draw order is untouched, so seeded walks
         *    reproduce exactly.
         *  @returns The {@link JssmStochasticRun} for this walk.
         *  @throws {JssmError} If a visited state's candidate exit pool is
         *  non-empty but all-zero-weight — see
         *  {@link Machine._assert_selectable_exit_pool} (StoneCypher/fsl#1248).
         */
        _stochastic_one_walk(start, max_steps, exit_memo) {
            const states = [start];
            const edges = [];
            let cur = start;
            let exits = exit_memo.get(cur);
            if (exits === undefined) {
                exits = this.probable_exits_for(cur);
                this._assert_selectable_exit_pool(cur, exits);
                exit_memo.set(cur, exits);
            }
            let terminated = exits.length === 0;
            for (let step = 0; step < max_steps && !terminated; step++) {
                const selected = weighted_rand_select(exits, undefined, this._rng);
                edges.push(`${cur}→${selected.to}`);
                cur = selected.to;
                states.push(cur);
                exits = exit_memo.get(cur);
                if (exits === undefined) {
                    exits = this.probable_exits_for(cur);
                    this._assert_selectable_exit_pool(cur, exits);
                    exit_memo.set(cur, exits);
                }
                terminated = exits.length === 0;
            }
            return { states, edges, length: states.length - 1, terminated };
        }
        /**
         * Lazily yield one {@link JssmStochasticRun} at a time.
         *
         *  In `montecarlo` mode (default) yields `runs` independent walks from the
         *  current state, each ending at a terminal or after `max_steps`.  In
         *  `steady_state` mode yields exactly one walk of `max_steps` steps.  This
         *  is the lazy engine behind {@link Machine.stochastic_summary}; the
         *  fsl-stochastic panel drives it across animation frames.  A walk already
         *  at a terminal is reported as terminated with length zero, including when
         *  `max_steps` is zero.
         *
         *  Passing `seed` reseeds the machine for reproducible runs.  Unlike
         *  {@link Machine.stochastic_summary}, the generator does NOT restore the
         *  prior seed afterward — a direct caller's machine is left reseeded.
         *  @param opts - {@link JssmStochasticOptions}.
         *  @yields One {@link JssmStochasticRun} per completed walk.
         *  @returns A generator of per-run results.
         *  @example
         *  const m = sm`a 'go' -> b 'go' -> c;`;
         *  [...m.stochastic_runs({ runs: 2, seed: 1 })].length;  // => 2
         */
        *stochastic_runs(opts = {}) {
            var _a, _b, _c, _d, _e;
            if (opts.seed !== undefined) {
                this.rng_seed = opts.seed;
            }
            const mode = (_a = opts.mode) !== null && _a !== void 0 ? _a : 'montecarlo';
            const max_steps = (_b = opts.max_steps) !== null && _b !== void 0 ? _b : STOCHASTIC_DEFAULT_MAX_STEPS;
            const runs = (mode === 'steady_state')
                ? 1
                : ((_e = (_c = opts.runs) !== null && _c !== void 0 ? _c : (_d = this.editor_config()) === null || _d === void 0 ? void 0 : _d.stochastic_run_count) !== null && _e !== void 0 ? _e : STOCHASTIC_DEFAULT_RUNS);
            const start = this.state();
            // one probable-exits memo for the whole run set; see _stochastic_one_walk
            const exit_memo = new Map();
            for (let i = 0; i < runs; i++) {
                yield this._stochastic_one_walk(start, max_steps, exit_memo);
            }
        }
        /**
         * Run many weighted-random walks and return aggregate statistics.
         *
         *  Honors `%` transition probabilities (via the existing probabilistic
         *  machinery).  Non-destructive: the machine's current state and
         *  {@link Machine.rng_seed} are restored before returning, so calling this
         *  never perturbs the live machine.  `montecarlo` mode (default) reports
         *  per-run `path_lengths`, `terminal_reached`, and `capped`; `steady_state`
         *  mode runs one long walk and omits those fields.
         *
         *  Monte-Carlo runs count as `terminal_reached` when they start at a
         *  terminal or reach one on the final permitted transition.  Terminal
         *  starts contribute zero to `path_lengths`, even when `max_steps` is zero.
         *
         *  Timing (`after`) decorations and data-guard conditions are not modeled
         *  by this sampler; it walks the probabilistic graph topology.
         *  @param opts - {@link JssmStochasticOptions}.  `runs` defaults to the
         *  machine's declared `editor: { stochastic_run_count }` (fsl#1334) when
         *  present, otherwise {@link STOCHASTIC_DEFAULT_RUNS}.
         *  @returns A {@link JssmStochasticSummary}.
         *  @see Machine.stochastic_runs
         *  @see Machine.probabilistic_walk
         *  @see Machine.editor_config
         *  @example
         *  const m = sm`a 'go' -> b 'go' -> c;`;
         *  const s = m.stochastic_summary({ runs: 100, seed: 1 });
         *  s.terminal_reached;  // => 100
         */
        stochastic_summary(opts = {}) {
            var _a, _b, _c;
            const mode = (_a = opts.mode) !== null && _a !== void 0 ? _a : 'montecarlo';
            const saved_seed = this._rng_seed;
            if (opts.seed !== undefined) {
                this.rng_seed = opts.seed;
            }
            const effective_seed = this._rng_seed;
            const state_visits = new Map();
            const edge_traversals = new Map();
            const path_lengths = [];
            let terminal_reached = 0, capped = 0, runs = 0;
            try {
                const run_stream = this.stochastic_runs(Object.assign(Object.assign({}, opts), { mode }));
                for (const run of run_stream) {
                    runs += 1;
                    for (const s of run.states) {
                        state_visits.set(s, ((_b = state_visits.get(s)) !== null && _b !== void 0 ? _b : 0) + 1);
                    }
                    for (const e of run.edges) {
                        edge_traversals.set(e, ((_c = edge_traversals.get(e)) !== null && _c !== void 0 ? _c : 0) + 1);
                    }
                    if (mode === 'montecarlo') {
                        if (run.terminated) {
                            terminal_reached += 1;
                            path_lengths.push(run.length);
                        }
                        else {
                            capped += 1;
                        }
                    }
                }
            }
            finally {
                // restore the PRNG so the call is non-destructive even when the loop throws
                this.rng_seed = saved_seed;
            }
            const total_visits = [...state_visits.values()].reduce((a, b) => a + b, 0);
            const state_visit_fraction = new Map();
            for (const [s, c] of state_visits) {
                state_visit_fraction.set(s, c / total_visits);
            }
            const summary = {
                mode, runs, seed: effective_seed,
                state_visits, state_visit_fraction, edge_traversals,
            };
            if (mode === 'montecarlo') {
                summary.path_lengths = path_lengths;
                summary.terminal_reached = terminal_reached;
                summary.capped = capped;
            }
            return summary;
        }
        /********
         *
         *  List all actions available from this state.  Please note that the order of
         *  the actions is not guaranteed.
         *
         *  ```typescript
         *  import { sm } from 'jssm';
         *
         *  const machine = sm`
         *    red 'next' -> green 'next' -> yellow 'next' -> red;
         *    [red yellow green] 'shutdown' ~> off 'start' -> red;
         *  `;
         *
         *  console.log( machine.state() );    // logs 'red'
         *  console.log( machine.actions() );  // logs ['next', 'shutdown']
         *
         *  machine.action('next');            // true
         *  console.log( machine.state() );    // logs 'green'
         *  console.log( machine.actions() );  // logs ['next', 'shutdown']
         *
         *  machine.action('shutdown');        // true
         *  console.log( machine.state() );    // logs 'off'
         *  console.log( machine.actions() );  // logs ['start']
         *
         *  machine.action('start');           // true
         *  console.log( machine.state() );    // logs 'red'
         *  console.log( machine.actions() );  // logs ['next', 'shutdown']
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @param whichState The state whose actions to list.  Defaults to the
         *  current state.
         *
         *  @returns An array of action names available from the given state.
         *
         */
        actions(whichState = this.state()) {
            const wstate = this._reverse_actions.get(whichState);
            if (wstate) {
                return [...wstate.keys()];
            }
            if (this.has_state(whichState)) {
                return [];
            }
            throw new JssmError(this, `No such state ${JSON.stringify(whichState)}`);
        }
        /********
         *
         *  List all states that have a specific action attached.  Please note that
         *  the order of the states is not guaranteed.
         *
         *  ```typescript
         *  import { sm } from 'jssm';
         *
         *  const machine = sm`
         *    red 'next' -> green 'next' -> yellow 'next' -> red;
         *    [red yellow green] 'shutdown' ~> off 'start' -> red;
         *  `;
         *
         *  console.log( machine.list_states_having_action('next') );    // ['red', 'green', 'yellow']
         *  console.log( machine.list_states_having_action('start') );   // ['off']
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @param whichState The action to be checked for associated states
         *
         */
        list_states_having_action(whichState) {
            const wstate = this._actions.get(whichState);
            if (wstate) {
                return [...wstate.keys()];
            }
            throw new JssmError(this, `No such state ${JSON.stringify(whichState)}`);
        }
        // comeback
        /*
          list_entrance_actions(whichState: mNT = this.state() ) : Array<mNT> {
            return [... (this._reverse_action_targets.get(whichState) || new Map()).values()] // wasteful
                   .map( (edgeId:any) => (this._edges[edgeId] : any)) // whargarbl burn out any
                   .filter( (o:any) => o.to === whichState)
                   .map( filtered => filtered.from );
          }
        */
        /**
         * List all action names available as exits from a given state.
         *
         *  Returns the empty array (does not throw) when `whichState` exists but has
         *  no action-named exits — including terminal states, states whose only
         *  exits are plain `->` transitions, and states in machines that use no
         *  actions at all.  Only nonexistent states cause a throw.
         *  @param whichState - The state to inspect.  Defaults to the current state.
         *  @returns An array of action name strings, possibly empty.
         *  @throws {JssmError} If the state does not exist.
         *  @example
         *    const m = sm`a 'go' -> b; b -> c;`;
         *    m.list_exit_actions('a');  // => ['go']
         *    m.list_exit_actions('b');  // => []
         *    m.list_exit_actions('c');  // => []
         *    expect(() => m.list_exit_actions('z')).toThrow();
         */
        list_exit_actions(whichState = this.state()) {
            const ra_base = this._reverse_actions.get(whichState);
            if (!(ra_base)) {
                if (this.has_state(whichState)) {
                    return [];
                }
                throw new JssmError(this, `No such state ${JSON.stringify(whichState)}`);
            }
            // `_reverse_actions` is keyed by edge.from (see its population), so every
            // action stored under whichState belongs to whichState by construction — no
            // from-filter is needed, and the keys are exactly the exit actions.
            return [...ra_base.keys()];
        }
        /**
         * List all action exits from a state with their probabilities.
         *  @param whichState - The state to inspect.  Defaults to the current state.
         *  @returns An array of `{ action, probability }` objects.
         *  @throws {JssmError} If the state does not exist.
         */
        probable_action_exits(whichState = this.state()) {
            const ra_base = this._reverse_actions.get(whichState);
            if (!(ra_base)) {
                if (this.has_state(whichState)) {
                    return [];
                }
                throw new JssmError(this, `No such state ${JSON.stringify(whichState)}`);
            }
            const exits = []; // TODO FIXME no any
            // `_reverse_actions` is keyed by edge.from, so every entry belongs to
            // whichState by construction; no from-filter is needed.
            ra_base.forEach((edgeId, action) => {
                exits.push({
                    action,
                    probability: this._edges[edgeId].probability
                });
            });
            return exits;
        }
        /**
         * Check whether a state has no incoming transitions (unreachable after start).
         *  @param whichState - The state to check.
         *  @returns `true` if the state has zero entrances.
         *  @throws {JssmError} If the state does not exist.
         */
        is_unenterable(whichState) {
            if (!(this.has_state(whichState))) {
                throw new JssmError(this, `No such state ${whichState}`);
            }
            return this.list_entrances(whichState).length === 0;
        }
        /**
         * Check whether any state in the machine is unenterable.
         *  @returns `true` if at least one state has no incoming transitions.
         */
        has_unenterables() {
            return this.states().some((x) => this.is_unenterable(x));
        }
        /**
         * Check whether the current state is terminal (has no exits).
         *  @returns `true` if the current state has zero exits.
         */
        is_terminal() {
            return this.state_is_terminal(this.state());
        }
        /**
         * Check whether a specific state is terminal (has no exits).
         *  @param whichState - The state to check.
         *  @returns `true` if the state has zero exits.
         *  @throws {JssmError} If the state does not exist.
         */
        state_is_terminal(whichState) {
            if (!(this.has_state(whichState))) {
                throw new JssmError(this, `No such state ${whichState}`);
            }
            return this.list_exits(whichState).length === 0;
        }
        /**
         * Check whether any state in the machine is terminal.
         *  @returns `true` if at least one state has no exits.
         */
        has_terminals() {
            return this.states().some((x) => this.state_is_terminal(x));
        }
        /********
         *
         *  Reports whether the machine's CURRENT state is a transitive member of a
         *  named group.  Membership is deep: a state counts as in `groupName` if it
         *  belongs to that group directly, or via any nested (`&child`) or spread
         *  (`...&child`) sub-group, at any depth.  An undeclared group simply has no
         *  members, so this returns `false` rather than throwing.
         *
         *  ```typescript
         *  import { sm } from 'jssm';
         *
         *  const m = sm`&busy : [working]; idle 'go' -> working;`;
         *  m.isIn('busy');     // false — current state is 'idle'
         *  m.action('go');
         *  m.isIn('busy');     // true  — current state is now 'working'
         *  m.isIn('nonesuch'); // false — undeclared group has no members
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @param groupName The group to test the current state against.
         *
         *  @returns `true` if the current state is a transitive member of `groupName`.
         *
         *  @see groupsOf
         *  @see statesIn
         *
         */
        isIn(groupName) {
            return this.groupsOf(this.state()).has(groupName);
        }
        /********
         *
         *  Lists every group that transitively contains a given state.  Membership is
         *  deep — direct, nested, and spread sub-group containment all count — and the
         *  result is the precomputed inverse-index entry for the state, so the lookup
         *  is constant-time.  A state that belongs to no group (or a state name that
         *  appears in no group) yields an empty `Set`.
         *
         *  ```typescript
         *  import { sm } from 'jssm';
         *
         *  const m = sm`&inner : [a]; &outer : [&inner b]; a -> b;`;
         *  m.groupsOf('a');     // Set { 'inner', 'outer' }  — deep through &inner
         *  m.groupsOf('b');     // Set { 'outer' }
         *  m.groupsOf('z');     // Set {}                    — not in any group
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @param state The state whose containing groups are wanted.
         *
         *  @returns A `Set` of every group name transitively containing `state`;
         *  empty when `state` belongs to no group.
         *
         *  @see isIn
         *  @see groups
         *
         */
        groupsOf(state) {
            return new Set(this._state_to_groups.get(state));
        }
        /********
         *
         *  Lists all declared group names, in source declaration order.  The order
         *  matches the order the `&group : [ … ];` declarations appear in the FSL, and
         *  is the same order used to break depth-specificity ties in the config
         *  cascade.  Machines that declare no groups return an empty array.
         *
         *  ```typescript
         *  import { sm } from 'jssm';
         *
         *  const m = sm`&first : [a]; &second : [b]; a -> b;`;
         *  m.groups();  // [ 'first', 'second' ]
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @returns The declared group names, in declaration order.
         *
         *  @see groupsOf
         *  @see statesIn
         *
         */
        groups() {
            return [...this._group_order];
        }
        /********
         *
         *  Lists every state that is a transitive member of a named group — the
         *  flattened membership of the group, descending through nested and spread
         *  sub-groups, in member-declaration order.
         *
         *  ```typescript
         *  import { sm } from 'jssm';
         *
         *  const m = sm`&inner : [a b]; &outer : [&inner c]; a -> b -> c;`;
         *  m.statesIn('outer');  // [ 'a', 'b', 'c' ]
         *  m.statesIn('inner');  // [ 'a', 'b' ]
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @param groupName The group whose transitive member states are wanted.
         *
         *  @returns The transitive member states of `groupName`, in declaration order.
         *
         *  @throws {JssmError} If `groupName` is not a declared group.
         *
         *  @see groups
         *  @see groupsOf
         *
         */
        statesIn(groupName) {
            if (!(this._group_registry.has(groupName))) {
                throw new JssmError(this, `No such group ${JSON.stringify(groupName)}`);
            }
            return transitive_members(this._group_registry, groupName, new Map());
        }
        /**
         * Check whether the current state is complete (every exit has an action).
         *  @returns `true` if the current state is complete.
         */
        is_complete() {
            return this.state_is_complete(this.state());
        }
        /**
         * Check whether a specific state is complete (every exit has an action).
         *  @param whichState - The state to check.
         *  @returns `true` if the state is complete.
         *  @throws {JssmError} If the state does not exist.
         */
        state_is_complete(whichState) {
            const wstate = this._states.get(whichState);
            if (wstate) {
                return wstate.complete;
            }
            throw new JssmError(this, `No such state ${JSON.stringify(whichState)}`);
        }
        /**
         * Check whether any state in the machine is complete.
         *  @returns `true` if at least one state is complete.
         */
        has_completes() {
            return this.states().some((x) => this.state_is_complete(x));
        }
        on(name, filterOrFn, maybeFn) {
            return __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_subscribe).call(this, name, filterOrFn, maybeFn, false);
        }
        once(name, filterOrFn, maybeFn) {
            return __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_subscribe).call(this, name, filterOrFn, maybeFn, true);
        }
        /**
         *  Remove a previously-registered event handler.  Match is by reference —
         *  the same function value passed to {@link Machine.on} or
         *  {@link Machine.once}.  Returns `true` if a subscription was found and
         *  removed, `false` otherwise.
         *
         *  ```typescript
         *  const fn = (e: any) => console.log(e);
         *  m.on('transition', fn);
         *  m.off('transition', fn);  // true
         *  m.off('transition', fn);  // false
         *  ```
         *  @param name    The event name.
         *  @param handler The handler reference to remove.
         *  @returns `true` if removed, `false` if no match was registered.
         */
        off(name, handler) {
            const set = this._event_handlers.get(name);
            if (set === undefined) {
                return false;
            }
            for (const entry of set) {
                if (entry.handler === handler) {
                    __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_unsubscribe_entry).call(this, set, entry);
                    return true;
                }
            }
            return false;
        }
        /**
         *  Invoke a single event-handler entry, respecting its filter, once-removal
         *  semantics, and the error re-fire / recursion-guard logic.  Extracted so
         *  {@link _fire} can share identical behavior between the size-1 fast-path
         *  and the general snapshotted loop.
         *  @param entry  - The subscriber descriptor to invoke.
         *  @param set    - The live Set that owns `entry`; needed for once-removal.
         *  @param name   - The event name being dispatched (used in error re-fires).
         *  @param detail - The event payload forwarded to the handler.
         *  @internal
         */
        // PERF: this and the sibling dispatch methods (_fire, _fire_boundary_actions,
        // _fire_hook_rejection, _has_subscribers) are intentionally underscore-
        // convention, NOT `#`-private.  They are called on the per-transition hot
        // path (_fire_boundary_actions runs on every transition), and a `#`-private
        // method cannot be inlined the way its `_` twin can (brand check), so
        // privatizing them in 5.162.8 cost ~20-25% on transition/action dispatch.
        // Do not re-privatize.  StoneCypher/fsl#1959
        _fire_one(entry, set, name, detail) {
            // filter check
            if (entry.filter !== undefined) {
                for (const [k, v] of Object.entries(entry.filter)) {
                    if (v !== detail[k]) {
                        return;
                    }
                }
            }
            // once removal happens BEFORE invocation so a throwing handler still
            // gets removed and so re-entrant `on` calls during the handler see
            // the post-removal state.
            if (entry.once) {
                __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_unsubscribe_entry).call(this, set, entry);
            }
            try {
                entry.handler(detail);
            }
            catch (error) {
                if (name === 'error' || this._firing_error) {
                    // surface to stderr as a last resort but never recurse;
                    // `console` is in the JS standard library and present in every
                    // supported runtime, so guarding it would just add an untestable
                    // branch.  See #638.
                    console.error(error);
                }
                else {
                    this._firing_error = true;
                    try {
                        this._fire('error', {
                            error: error,
                            source_event: name,
                            source_detail: detail,
                            handler: entry.handler
                        });
                    }
                    finally {
                        this._firing_error = false;
                    }
                }
            }
        }
        /**
         *  Dispatch an event to every registered subscriber in registration
         *  order.  Filters are checked first; non-matching handlers are skipped
         *  without invoking the handler.  Exceptions thrown by a handler are
         *  caught and re-emitted as an `error` event so subsequent handlers
         *  still run.
         *
         *  Re-entry into the `error` event itself is guarded — if an `error`
         *  handler throws, the new exception is swallowed rather than rebroadcast
         *  to avoid an infinite loop.
         *
         *  When exactly one subscriber is registered the common case avoids the
         *  `Array.from(set)` snapshot allocation by capturing the lone entry into a
         *  local first — equivalent to a 1-element snapshot but allocation-free.
         *  The general path still snapshots for re-entrancy safety.
         *  @internal
         */
        /**
         *  Whether at least one live subscriber is registered for `name`.  Used by
         *  the transition-commit observation block to skip building a detail
         *  literal that {@link Machine._fire} would immediately discard — a panel
         *  listening only to `'transition'` (fsl-bind, fsl-viz, fsl-info-panel)
         *  previously paid for the exit/entry/data-change detail allocations on
         *  every transition.  Read at fire time, so a listener installed by a
         *  pre-hook is still seen (#671).
         *  @param name The event name to probe.
         *  @returns `true` when a subsequent `_fire(name, ...)` would reach at
         *  least one handler.
         *
         *  ```typescript
         *  machine.on('transition', () => {});
         *  machine._has_subscribers('transition');  // true
         *  machine._has_subscribers('exit');        // false
         *  ```
         *  @see Machine._fire
         *  @internal
         */
        _has_subscribers(name) {
            const set = this._event_handlers.get(name);
            return (set !== undefined) && (set.size > 0);
        }
        _fire(name, detail) {
            const set = this._event_handlers.get(name);
            if (set === undefined || set.size === 0) {
                return;
            }
            // Fast-path: single subscriber — capture entry before invoking so that
            // even if the handler mutates `set` (via off/once auto-removal) we hold a
            // stable reference.  Behaviorally identical to a 1-element snapshot.
            if (set.size === 1) {
                const only = set.values().next().value;
                this._fire_one(only, set, name, detail);
                return;
            }
            // General path: snapshot so handlers can `off()` mid-loop without
            // disturbing iteration.
            const entries = [...set];
            for (const entry of entries) {
                this._fire_one(entry, set, name, detail);
            }
        }
        set_hook(HookDesc) {
            __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_validate_hook_description).call(this, HookDesc);
            switch (HookDesc.kind) {
                case 'hook': {
                    // Numeric pair key (#729).  intern() rather than id_of(): a hook may
                    // name a state the machine doesn't have — it gets an id no live state
                    // can match, so it registers silently and never fires, as before.
                    this._hooks.set(pair_key(this._state_interner.intern(HookDesc.from), this._state_interner.intern(HookDesc.to)), HookDesc.handler);
                    this._has_hooks = true;
                    this._has_basic_hooks = true;
                    break;
                }
                case 'named': {
                    // Numeric pair key, then action id; the per-pair action map stays a
                    // map because the action interner may keep growing (#729).
                    const pk = pair_key(this._state_interner.intern(HookDesc.from), this._state_interner.intern(HookDesc.to));
                    let inner = this._named_hooks.get(pk);
                    if (inner === undefined) {
                        inner = new Map();
                        this._named_hooks.set(pk, inner);
                    }
                    inner.set(this._action_interner.intern(HookDesc.action), HookDesc.handler);
                    this._has_hooks = true;
                    this._has_named_hooks = true;
                    break;
                }
                case 'global action': {
                    this._global_action_hooks.set(this._action_interner.intern(HookDesc.action), HookDesc.handler);
                    this._has_hooks = true;
                    this._has_global_action_hooks = true;
                    break;
                }
                case 'any action': {
                    this._any_action_hook = HookDesc.handler;
                    this._has_hooks = true;
                    break;
                }
                case 'standard transition': {
                    this._standard_transition_hook = HookDesc.handler;
                    this._has_transition_hooks = true;
                    this._has_hooks = true;
                    break;
                }
                case 'main transition': {
                    this._main_transition_hook = HookDesc.handler;
                    this._has_transition_hooks = true;
                    this._has_hooks = true;
                    break;
                }
                case 'forced transition': {
                    this._forced_transition_hook = HookDesc.handler;
                    this._has_transition_hooks = true;
                    this._has_hooks = true;
                    break;
                }
                case 'any transition': {
                    this._any_transition_hook = HookDesc.handler;
                    this._has_hooks = true;
                    break;
                }
                case 'entry': {
                    this._entry_hooks.set(this._state_interner.intern(HookDesc.to), HookDesc.handler);
                    this._has_hooks = true;
                    this._has_entry_hooks = true;
                    break;
                }
                case 'exit': {
                    this._exit_hooks.set(this._state_interner.intern(HookDesc.from), HookDesc.handler);
                    this._has_hooks = true;
                    this._has_exit_hooks = true;
                    break;
                }
                case 'after': {
                    this._after_hooks.set(HookDesc.from, HookDesc.handler);
                    this._has_hooks = true;
                    this._has_after_hooks = true;
                    break;
                }
                case 'after any': {
                    this._after_any_hook = HookDesc.handler;
                    this._has_hooks = true;
                    this._has_after_hooks = true;
                    break;
                }
                case 'post hook': {
                    // Numeric pair key; same rationale as 'hook' (#729).
                    this._post_hooks.set(pair_key(this._state_interner.intern(HookDesc.from), this._state_interner.intern(HookDesc.to)), HookDesc.handler);
                    this._has_post_hooks = true;
                    this._has_post_basic_hooks = true;
                    break;
                }
                case 'post named': {
                    // Numeric pair key, then action id; same rationale as 'named' (#729).
                    const pk = pair_key(this._state_interner.intern(HookDesc.from), this._state_interner.intern(HookDesc.to));
                    let inner = this._post_named_hooks.get(pk);
                    if (inner === undefined) {
                        inner = new Map();
                        this._post_named_hooks.set(pk, inner);
                    }
                    inner.set(this._action_interner.intern(HookDesc.action), HookDesc.handler);
                    this._has_post_hooks = true;
                    this._has_post_named_hooks = true;
                    break;
                }
                case 'post global action': {
                    this._post_global_action_hooks.set(this._action_interner.intern(HookDesc.action), HookDesc.handler);
                    this._has_post_hooks = true;
                    this._has_post_global_action_hooks = true;
                    break;
                }
                case 'post any action': {
                    this._post_any_action_hook = HookDesc.handler;
                    this._has_post_hooks = true;
                    break;
                }
                case 'post standard transition': {
                    this._post_standard_transition_hook = HookDesc.handler;
                    this._has_post_transition_hooks = true;
                    this._has_post_hooks = true;
                    break;
                }
                case 'post main transition': {
                    this._post_main_transition_hook = HookDesc.handler;
                    this._has_post_transition_hooks = true;
                    this._has_post_hooks = true;
                    break;
                }
                case 'post forced transition': {
                    this._post_forced_transition_hook = HookDesc.handler;
                    this._has_post_transition_hooks = true;
                    this._has_post_hooks = true;
                    break;
                }
                case 'post any transition': {
                    this._post_any_transition_hook = HookDesc.handler;
                    this._has_post_hooks = true;
                    break;
                }
                case 'post entry': {
                    this._post_entry_hooks.set(this._state_interner.intern(HookDesc.to), HookDesc.handler);
                    this._has_post_entry_hooks = true;
                    this._has_post_hooks = true;
                    break;
                }
                case 'post exit': {
                    this._post_exit_hooks.set(this._state_interner.intern(HookDesc.from), HookDesc.handler);
                    this._has_post_exit_hooks = true;
                    this._has_post_hooks = true;
                    break;
                }
                case 'pre everything': {
                    this._pre_everything_hook = HookDesc.handler;
                    this._has_hooks = true;
                    break;
                }
                case 'everything': {
                    this._everything_hook = HookDesc.handler;
                    this._has_hooks = true;
                    break;
                }
                case 'pre post everything': {
                    this._pre_post_everything_hook = HookDesc.handler;
                    this._has_post_hooks = true;
                    break;
                }
                case 'post everything': {
                    this._post_everything_hook = HookDesc.handler;
                    this._has_post_hooks = true;
                    break;
                }
                // No default: `_validate_hook_description` above rejects any unknown kind
                // before we reach here, so the switch is exhaustive over the known kinds.
            }
            // The hooked-state styling layer (tier 2.5 of resolve_state_config) depends
            // on which states carry hooks, so registering a hook can change the composed
            // style of a state.  The static config cache assumes tiers 1–5 are fixed
            // after construction; invalidate it so styling stays correct when a hook is
            // added after a style has already been computed and memoized.
            this._static_state_config_cache.clear();
            // fire the registration event for inspector tools (#638)
            this._fire('hook-registration', { description: HookDesc });
        }
        /**
         *  Remove a previously-registered hook described by a
         *  {@link HookDescription}.  Match is by `kind` + identifying keys
         *  (`from`/`to`/`action`/etc.), not by handler reference — there is one
         *  hook per slot in the registry, so the description uniquely identifies
         *  which one to clear.  Fires a `hook-removal` event for inspector tools.
         *
         *  This is the symmetric counterpart of {@link Machine.set_hook} for the
         *  event-bridging use case (#638).  Reasoning about hooks via observation
         *  events requires being able to observe their disappearance too.
         *
         *  ```typescript
         *  const m = sm`a -> b;`;
         *  const fn = () => true;
         *  m.set_hook({ kind: 'hook', from: 'a', to: 'b', handler: fn });
         *  m.remove_hook({ kind: 'hook', from: 'a', to: 'b', handler: fn });
         *  ```
         *  @param HookDesc - A hook descriptor identifying the hook to remove.
         *  @returns `true` if a hook was removed, `false` otherwise.
         */
        remove_hook(HookDesc) {
            let removed = false;
            switch (HookDesc.kind) {
                case 'hook': {
                    // id_of, not intern: removal of an unknown name reports false and
                    // must not grow the interner tables (#729).
                    const fid = this._state_interner.id_of(HookDesc.from), tid = this._state_interner.id_of(HookDesc.to);
                    removed = (fid !== undefined) && (tid !== undefined) && this._hooks.delete(pair_key(fid, tid));
                    break;
                }
                case 'named': {
                    const fid = this._state_interner.id_of(HookDesc.from), tid = this._state_interner.id_of(HookDesc.to), aid = this._action_interner.id_of(HookDesc.action);
                    const inner = ((fid === undefined) || (tid === undefined)) ? undefined : this._named_hooks.get(pair_key(fid, tid));
                    removed = (inner !== undefined) && (aid !== undefined) && inner.delete(aid);
                    break;
                }
                case 'global action': {
                    const aid = this._action_interner.id_of(HookDesc.action);
                    removed = (aid !== undefined) && this._global_action_hooks.delete(aid);
                    break;
                }
                case 'any action': {
                    if (this._any_action_hook !== undefined) {
                        this._any_action_hook = undefined;
                        removed = true;
                    }
                    break;
                }
                case 'standard transition': {
                    if (this._standard_transition_hook !== undefined) {
                        this._standard_transition_hook = undefined;
                        removed = true;
                    }
                    break;
                }
                case 'main transition': {
                    if (this._main_transition_hook !== undefined) {
                        this._main_transition_hook = undefined;
                        removed = true;
                    }
                    break;
                }
                case 'forced transition': {
                    if (this._forced_transition_hook !== undefined) {
                        this._forced_transition_hook = undefined;
                        removed = true;
                    }
                    break;
                }
                case 'any transition': {
                    if (this._any_transition_hook !== undefined) {
                        this._any_transition_hook = undefined;
                        removed = true;
                    }
                    break;
                }
                case 'entry': {
                    const tid = this._state_interner.id_of(HookDesc.to);
                    removed = (tid !== undefined) && this._entry_hooks.delete(tid);
                    break;
                }
                case 'exit': {
                    const fid = this._state_interner.id_of(HookDesc.from);
                    removed = (fid !== undefined) && this._exit_hooks.delete(fid);
                    break;
                }
                case 'after': {
                    removed = this._after_hooks.delete(HookDesc.from);
                    break;
                }
                case 'after any': {
                    if (this._after_any_hook !== undefined) {
                        this._after_any_hook = undefined;
                        removed = true;
                    }
                    break;
                }
                case 'post hook': {
                    const fid = this._state_interner.id_of(HookDesc.from), tid = this._state_interner.id_of(HookDesc.to);
                    removed = (fid !== undefined) && (tid !== undefined) && this._post_hooks.delete(pair_key(fid, tid));
                    break;
                }
                case 'post named': {
                    const fid = this._state_interner.id_of(HookDesc.from), tid = this._state_interner.id_of(HookDesc.to), aid = this._action_interner.id_of(HookDesc.action);
                    const inner = ((fid === undefined) || (tid === undefined)) ? undefined : this._post_named_hooks.get(pair_key(fid, tid));
                    removed = (inner !== undefined) && (aid !== undefined) && inner.delete(aid);
                    break;
                }
                case 'post global action': {
                    const aid = this._action_interner.id_of(HookDesc.action);
                    removed = (aid !== undefined) && this._post_global_action_hooks.delete(aid);
                    break;
                }
                case 'post any action': {
                    if (this._post_any_action_hook !== undefined) {
                        this._post_any_action_hook = undefined;
                        removed = true;
                    }
                    break;
                }
                case 'post standard transition': {
                    if (this._post_standard_transition_hook !== undefined) {
                        this._post_standard_transition_hook = undefined;
                        removed = true;
                    }
                    break;
                }
                case 'post main transition': {
                    if (this._post_main_transition_hook !== undefined) {
                        this._post_main_transition_hook = undefined;
                        removed = true;
                    }
                    break;
                }
                case 'post forced transition': {
                    if (this._post_forced_transition_hook !== undefined) {
                        this._post_forced_transition_hook = undefined;
                        removed = true;
                    }
                    break;
                }
                case 'post any transition': {
                    if (this._post_any_transition_hook !== undefined) {
                        this._post_any_transition_hook = undefined;
                        removed = true;
                    }
                    break;
                }
                case 'post entry': {
                    const tid = this._state_interner.id_of(HookDesc.to);
                    removed = (tid !== undefined) && this._post_entry_hooks.delete(tid);
                    break;
                }
                case 'post exit': {
                    const fid = this._state_interner.id_of(HookDesc.from);
                    removed = (fid !== undefined) && this._post_exit_hooks.delete(fid);
                    break;
                }
                case 'pre everything': {
                    if (this._pre_everything_hook !== undefined) {
                        this._pre_everything_hook = undefined;
                        removed = true;
                    }
                    break;
                }
                case 'everything': {
                    if (this._everything_hook !== undefined) {
                        this._everything_hook = undefined;
                        removed = true;
                    }
                    break;
                }
                case 'pre post everything': {
                    if (this._pre_post_everything_hook !== undefined) {
                        this._pre_post_everything_hook = undefined;
                        removed = true;
                    }
                    break;
                }
                case 'post everything': {
                    if (this._post_everything_hook !== undefined) {
                        this._post_everything_hook = undefined;
                        removed = true;
                    }
                    break;
                }
                default: {
                    throw new JssmError(this, `Unknown hook type ${HookDesc.kind}, should be impossible`);
                }
            }
            if (removed) {
                // set_hook only ever turns the _has_* fast-path flags ON; they summarize
                // whole families, not counts, so a removal can't simply turn one off.
                // Rederive them all now, or a stale flag keeps the fast path doing work
                // whose last hook is gone -- most visibly _has_transition_hooks, which
                // would otherwise keep resolving trans_type and leaking it into every
                // hook context after the last transition-kind hook was removed.  #1954
                __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_recompute_hook_flags).call(this);
                // See set_hook: the hooked-state styling layer depends on which states
                // carry hooks, so removing one can change a state's composed style.
                this._static_state_config_cache.clear();
                this._fire('hook-removal', { description: HookDesc });
            }
            return removed;
        }
        /**
         * Register a pre-transition hook on a specific edge.  Fires before
         *  transitioning from `from` to `to`.  If the handler returns `false`, the
         *  transition is blocked.
         *
         *  ```typescript
         *  const m = sm`a -> b -> c;`;
         *  m.hook('a', 'b', () => console.log('a->b'));
         *  ```
         *  @param from    - Source state name.
         *  @param to      - Target state name.
         *  @param handler - Callback invoked before the transition.
         *  @returns `this` for chaining.
         */
        hook(from, to, handler) {
            this.set_hook({ kind: 'hook', from, to, handler });
            return this;
        }
        /**
         * Register a pre-transition hook on a specific action-labeled edge.
         *  @param from    - Source state name.
         *  @param to      - Target state name.
         *  @param action  - The action label that triggers this hook.
         *  @param handler - Callback invoked before the transition.
         *  @returns `this` for chaining.
         */
        hook_action(from, to, action, handler) {
            this.set_hook({ kind: 'named', from, to, action, handler });
            return this;
        }
        /**
         * Register a pre-transition hook on any edge triggered by a specific action.
         *  @param action  - The action name to hook.
         *  @param handler - Callback invoked before any transition with this action.
         *  @returns `this` for chaining.
         */
        hook_global_action(action, handler) {
            this.set_hook({ kind: 'global action', action, handler });
            return this;
        }
        /**
         * Register a pre-transition hook on any action-driven transition.
         *  @param handler - Callback invoked before any action transition.
         *  @returns `this` for chaining.
         */
        hook_any_action(handler) {
            this.set_hook({ kind: 'any action', handler });
            return this;
        }
        /**
         * Register a pre-transition hook on any standard (`->`) transition.
         *  @param handler - Callback invoked before any legal transition.
         *  @returns `this` for chaining.
         */
        hook_standard_transition(handler) {
            this.set_hook({ kind: 'standard transition', handler });
            return this;
        }
        /**
         * Register a pre-transition hook on any main-path (`=>`) transition.
         *  @param handler - Callback invoked before any main transition.
         *  @returns `this` for chaining.
         */
        hook_main_transition(handler) {
            this.set_hook({ kind: 'main transition', handler });
            return this;
        }
        /**
         * Register a pre-transition hook on any forced (`~>`) transition.
         *  @param handler - Callback invoked before any forced transition.
         *  @returns `this` for chaining.
         */
        hook_forced_transition(handler) {
            this.set_hook({ kind: 'forced transition', handler });
            return this;
        }
        /**
         * Register a pre-transition hook on any transition regardless of kind.
         *  @param handler - Callback invoked before every transition.
         *  @returns `this` for chaining.
         */
        hook_any_transition(handler) {
            this.set_hook({ kind: 'any transition', handler });
            return this;
        }
        /**
         * Register a hook that fires when entering a specific state.
         *  @param to      - The state being entered.
         *  @param handler - Callback invoked on entry.
         *  @returns `this` for chaining.
         */
        hook_entry(to, handler) {
            this.set_hook({ kind: 'entry', to, handler });
            return this;
        }
        /**
         * Register a hook that fires when leaving a specific state.
         *  @param from    - The state being exited.
         *  @param handler - Callback invoked on exit.
         *  @returns `this` for chaining.
         */
        hook_exit(from, handler) {
            this.set_hook({ kind: 'exit', from, handler });
            return this;
        }
        /**
         * Register a hook that fires when a state's `after` timer elapses — the
         *  delay-over companion to `a after 5s -> b;` style time transitions.  It
         *  does NOT fire when the state is entered or left by ordinary dispatch;
         *  use {@link hook_entry} / {@link hook_exit} for those.  (Versions through
         *  5.143.28 also spuriously fired it on entering the state, the jssm side
         *  of StoneCypher/fsl#1327.)
         *  @param from    - The state whose `after` timer is being watched.
         *  @param handler - Callback invoked when the timer fires, just before the
         *                   timed transition is taken; informational — its outcome
         *                   cannot reject the transition.
         *  @returns `this` for chaining.
         *  @example
         *    const m = sm`a after 1000 -> b; a -> c; c -> a;`;
         *    let calls = 0;
         *    m.hook_after('a', () => { calls += 1; });
         *    m.go('c');
         *    m.go('a');
         *    // ordinary dispatch never fires it; only the timer elapsing does:
         *    calls;  // => 0
         *    m.clear_state_timeout();
         *  @see hook_entry
         *  @see hook_exit
         *  @see set_state_timeout
         */
        hook_after(from, handler) {
            this.set_hook({ kind: 'after', from, handler });
            return this;
        }
        /**
         * Register a hook that fires when ANY state's `after` timer elapses — the
         *  whole-machine companion to {@link hook_after}, mirroring how
         *  {@link hook_any_transition} companions {@link hook}.  When the elapsing
         *  state also has a specific {@link hook_after}, the specific hook fires
         *  first and this one fires second; a specific after hook firing always
         *  implies the any-after hook fires too (StoneCypher/fsl#1299).  Like
         *  `hook_after` it is informational — its outcome cannot reject the timed
         *  transition — and it does NOT fire on ordinary dispatch.
         *  @param handler - Callback invoked whenever any `after` timer fires, just
         *                   before the timed transition is taken.
         *  @returns `this` for chaining.
         *  @example
         *    const m = sm`a after 1000 -> b; a -> c; c -> a;`;
         *    let calls = 0;
         *    m.hook_after_any(() => { calls += 1; });
         *    m.go('c');
         *    m.go('a');
         *    // ordinary dispatch never fires it; only a timer elapsing does:
         *    calls;  // => 0
         *    m.clear_state_timeout();
         *  @see hook_after
         *  @see hook_any_transition
         *  @see set_state_timeout
         */
        hook_after_any(handler) {
            this.set_hook({ kind: 'after any', handler });
            return this;
        }
        /**
         * Post-transition hook on a specific edge.  Fires after the transition
         *  from `from` to `to` has completed.  Cannot block the transition.
         *  @param from    - Source state name.
         *  @param to      - Target state name.
         *  @param handler - Callback invoked after the transition.
         *  @returns `this` for chaining.
         */
        post_hook(from, to, handler) {
            this.set_hook({ kind: 'post hook', from, to, handler });
            return this;
        }
        /**
         * Post-transition hook on a specific action-labeled edge.
         *  @param from    - Source state name.
         *  @param to      - Target state name.
         *  @param action  - The action label.
         *  @param handler - Callback invoked after the transition.
         *  @returns `this` for chaining.
         */
        post_hook_action(from, to, action, handler) {
            this.set_hook({ kind: 'post named', from, to, action, handler });
            return this;
        }
        /**
         * Post-transition hook on any edge triggered by a specific action.
         *  @param action  - The action name.
         *  @param handler - Callback invoked after any transition with this action.
         *  @returns `this` for chaining.
         */
        post_hook_global_action(action, handler) {
            this.set_hook({ kind: 'post global action', action, handler });
            return this;
        }
        /**
         * Post-transition hook on any action-driven transition.
         *  @param handler - Callback invoked after any action transition.
         *  @returns `this` for chaining.
         */
        post_hook_any_action(handler) {
            this.set_hook({ kind: 'post any action', handler });
            return this;
        }
        /**
         * Post-transition hook on any standard (`->`) transition.
         *  @param handler - Callback invoked after any legal transition.
         *  @returns `this` for chaining.
         */
        post_hook_standard_transition(handler) {
            this.set_hook({ kind: 'post standard transition', handler });
            return this;
        }
        /**
         * Post-transition hook on any main-path (`=>`) transition.
         *  @param handler - Callback invoked after any main transition.
         *  @returns `this` for chaining.
         */
        post_hook_main_transition(handler) {
            this.set_hook({ kind: 'post main transition', handler });
            return this;
        }
        /**
         * Post-transition hook on any forced (`~>`) transition.
         *  @param handler - Callback invoked after any forced transition.
         *  @returns `this` for chaining.
         */
        post_hook_forced_transition(handler) {
            this.set_hook({ kind: 'post forced transition', handler });
            return this;
        }
        /**
         * Post-transition hook on any transition regardless of kind.
         *  @param handler - Callback invoked after every transition.
         *  @returns `this` for chaining.
         */
        post_hook_any_transition(handler) {
            this.set_hook({ kind: 'post any transition', handler });
            return this;
        }
        /**
         * Post-transition hook that fires after entering a specific state.
         *  @param to      - The state that was entered.
         *  @param handler - Callback invoked after entry.
         *  @returns `this` for chaining.
         */
        post_hook_entry(to, handler) {
            this.set_hook({ kind: 'post entry', to, handler });
            return this;
        }
        /**
         * Post-transition hook that fires after leaving a specific state.
         *  @param from    - The state that was exited.
         *  @param handler - Callback invoked after exit.
         *  @returns `this` for chaining.
         */
        post_hook_exit(from, handler) {
            this.set_hook({ kind: 'post exit', from, handler });
            return this;
        }
        /**
         * Register a pre-transition hook that fires **before** all other pre-hooks
         *  on every transition.  If the handler returns `false`, the transition is
         *  blocked.  The handler receives an {@link EverythingHookContext} whose
         *  `hook_name` is `'pre everything'`.
         *
         *  ```typescript
         *  const m = sm`a -> b -> c;`;
         *  m.hook_pre_everything(({ hook_name }) => {
         *    console.log(`${hook_name} fired`);
         *    return true;
         *  });
         *  ```
         *  @param handler - Callback invoked before all other pre-hooks.
         *  @returns `this` for chaining.
         */
        hook_pre_everything(handler) {
            this.set_hook({ kind: 'pre everything', handler });
            return this;
        }
        /**
         * Register a pre-transition hook that fires **after** all other pre-hooks
         *  on every transition.  If the handler returns `false`, the transition is
         *  blocked.  The handler receives an {@link EverythingHookContext} whose
         *  `hook_name` is `'everything'`.
         *
         *  ```typescript
         *  const m = sm`a -> b -> c;`;
         *  m.hook_everything(({ hook_name }) => {
         *    console.log(`${hook_name} fired`);
         *    return true;
         *  });
         *  ```
         *  @param handler - Callback invoked after all other pre-hooks.
         *  @returns `this` for chaining.
         */
        hook_everything(handler) {
            this.set_hook({ kind: 'everything', handler });
            return this;
        }
        /**
         * Register a post-transition hook that fires **after** all other
         *  post-hooks on every transition.  Cannot block the transition.  The
         *  handler receives an {@link EverythingHookContext} whose `hook_name` is
         *  `'post everything'`.
         *
         *  ```typescript
         *  const m = sm`a -> b -> c;`;
         *  m.hook_post_everything(({ hook_name }) => {
         *    console.log(`${hook_name} fired`);
         *  });
         *  ```
         *  @param handler - Callback invoked after all other post-hooks.
         *  @returns `this` for chaining.
         */
        hook_post_everything(handler) {
            this.set_hook({ kind: 'post everything', handler });
            return this;
        }
        /**
         * Register a post-transition hook that fires **before** all other
         *  post-hooks on every transition.  Cannot block the transition.  The
         *  handler receives an {@link EverythingHookContext} whose `hook_name` is
         *  `'pre post everything'`.
         *
         *  ```typescript
         *  const m = sm`a -> b -> c;`;
         *  m.hook_pre_post_everything(({ hook_name }) => {
         *    console.log(`${hook_name} fired`);
         *  });
         *  ```
         *  @param handler - Callback invoked before all other post-hooks.
         *  @returns `this` for chaining.
         */
        hook_pre_post_everything(handler) {
            this.set_hook({ kind: 'pre post everything', handler });
            return this;
        }
        /**
         * Get the current RNG seed used for probabilistic transitions.
         *  @returns The numeric seed value.
         */
        get rng_seed() {
            return this._rng_seed;
        }
        /**
         * Set the RNG seed.  Pass `undefined` to reseed from the current time.
         *  Resets the internal PRNG so subsequent probabilistic operations use the
         *  new seed.
         *  @param to - The seed value, or `undefined` for time-based seeding.
         */
        set rng_seed(to) {
            this._rng_seed = to === undefined ? Date.now() : to;
            this._rng = gen_splitmix32(this._rng_seed);
        }
        // remove_hook(HookDesc: HookDescription) {
        //   throw new JssmError(this, 'TODO: Should remove hook here');
        // }
        /**
         * Get all edges between two states (there can be multiple with
         *  different actions).
         *  @param from - Source state name.
         *  @param to   - Target state name.
         *  @returns An array of matching {@link JssmTransition} objects.
         */
        edges_between(from, to) {
            var _a;
            // Filter only this state's outbound edges instead of the full _edges array.
            // For machines with E total edges and average out-degree d, this is O(d)
            // instead of O(E) — a large win on dense graphs where d << E.  The `?? []`
            // covers from-states that have no outgoing edges (terminal states) and
            // states that don't exist at all, both of which return [] without iterating.
            //
            // The match itself compares interned numeric state ids against the packed
            // _edge_to_ids array rather than dereferencing each edge object for a
            // string compare: non-matching edges never touch an edge object, which is
            // most of the cost on dense shapes (heavier edge objects degrade a deref
            // loop — the 5.142/5.143 regression mechanism).  Every state named by any
            // edge is interned at construction, so an unknown `to` provably has no
            // edges and returns [] immediately.
            const to_id = this._state_interner.id_of(to);
            if (to_id === undefined) {
                return [];
            }
            const outbound = (_a = this._outbound_edge_ids.get(from)) !== null && _a !== void 0 ? _a : [];
            const result = [];
            for (const edgeId of outbound) {
                if (this._edge_to_ids[edgeId] === to_id) {
                    result.push(this._edges[edgeId]);
                }
            }
            return result;
        }
        /*********
         *
         *  Replace the current state — and, when a data argument is provided, the
         *  data — with no regard to the graph.
         *
         *  The data argument is arity-detected: omitting it preserves the current
         *  data, while explicitly passing `undefined` really sets the data to
         *  `undefined` (StoneCypher/fsl#1264).  Before 5.163 an omitted data
         *  argument silently cleared the data.
         *
         *  ```typescript
         *  import { sm } from 'jssm';
         *
         *  const machine = sm`a -> b -> c;`;
         *  console.log( machine.state() );    // 'a'
         *
         *  machine.go('b');
         *  machine.go('c');
         *  console.log( machine.state() );    // 'c'
         *
         *  machine.override('a');
         *  console.log( machine.state() );    // 'a'
         *  ```
         *
         *  @param newState The state to teleport to; must exist in the graph.
         *
         *  @param newData Replacement data.  Omit to keep the current data; pass
         *  `undefined` explicitly to clear it.
         *
         *  @throws {JssmError} If the machine's config does not set
         *  `allows_override: true`, or if `newState` does not exist.
         *
         *  @see set_data
         *
         */
        override(newState, newData) {
            // arity, not undefined-comparison: an omitted argument preserves the
            // data, an explicit `undefined` clears it (StoneCypher/fsl#1264)
            const dataProvided = arguments.length >= 2;
            if (this.allows_override) {
                if (this._states.has(newState)) {
                    const fromState = this._state;
                    const oldData = this._data;
                    this._state = newState;
                    this._state_id = this._state_interner.intern(newState);
                    if (dataProvided) {
                        this._data = newData;
                    }
                    this._fire('override', {
                        from: fromState,
                        to: newState,
                        old_data: oldData,
                        new_data: this._data
                    });
                    if (dataProvided && (oldData !== newData)) {
                        this._fire('data-change', {
                            from: fromState,
                            to: newState,
                            old_data: oldData,
                            new_data: newData,
                            cause: 'override'
                        });
                    }
                    // An override is still a real state change that may cross group/state
                    // boundaries, so its boundary-hook actions fire too (depth-bounded).
                    this._fire_boundary_actions(fromState, newState);
                }
                else {
                    throw new JssmError(this, `Cannot override state to "${newState}", a state that does not exist`);
                }
            }
            else {
                throw new JssmError(this, "Code specifies no override, but config tries to permit; config may not be less strict than code");
            }
        }
        /*********
         *
         *  Fire a `'rejection'` event caused by a hook vetoing a pending transition.
         *  Extracted from the per-call closures inside {@link transition_impl} so
         *  that it is allocated once at class-definition time rather than on every
         *  hooked transition.
         *
         *  @param hook_name  Name of the hook that rejected (e.g. `'exit'`).
         *  @param fromState  State the machine was in when the transition was
         *    attempted; used as the `from` field of the rejection event.
         *  @param newState   State that would have been entered had the hook
         *    passed; used as the `to` field of the rejection event.
         *  @param fromAction Action name when the transition was initiated by an
         *    action call; `undefined` for plain state transitions.
         *  @param oldData    Machine data at the moment the transition was
         *    attempted, before any hook mutations.
         *  @param newData    The `next_data` value passed to the transition call.
         *  @param wasForced  Whether the transition was attempted via
         *    `force_transition`.
         *
         *  @see transition_impl
         *  @see _fire
         *
         *  @internal
         *
         */
        _fire_hook_rejection(hook_name, fromState, newState, fromAction, oldData, newData, wasForced) {
            // Every hook veto in transition_impl's pre-commit pipeline exits through
            // here, so this is the single close point for the reentrancy guard on the
            // rejection path: clear it before firing the event so a `rejection` listener
            // may itself transition (the outer transition is abandoned, not reverted).
            // #1953
            this._committing_transition = false;
            this._fire('rejection', {
                from: fromState,
                to: newState,
                action: fromAction,
                data: oldData,
                next_data: newData,
                reason: 'hook',
                hook_name,
                forced: wasForced
            });
        }
        /*********
         *
         *  Fire the FSL boundary-hook actions for a single, already-committed state
         *  change.  In FSL, `do` is a synonym for `action`, so `on enter &g do 'X';`
         *  means "when the machine crosses INTO group `g`, dispatch machine action
         *  `X`" — and likewise `on exit` / plain-state subjects.  This is the runtime
         *  that fires those parked hooks.
         *
         *  Crossing semantics (statechart convention — exits before enters):
         *
         *  1. `prev_groups` / `next_groups` are the deep (transitive) group sets of
         *     the old and new states, from `_state_to_groups`.
         *  2. **Exits** fire first: every group in `prev_groups \ next_groups` with an
         *     `onExit`, plus the plain `prev_state`'s `onExit` (when the state name
         *     actually changed).
         *  3. **Enters** fire next: every group in `next_groups \ prev_groups` with an
         *     `onEnter`, plus the plain `next_state`'s `onEnter` (when the state name
         *     changed).
         *  4. A group present in BOTH sets is a transition *within* that group and
         *     fires neither of its boundary hooks.  `prev_state === next_state` fires
         *     nothing at all.
         *  5. "Fire its action" is `this.action(label)`.  If that action is not valid
         *     from the current state, `action` is a safe no-op (returns `false`) — an
         *     inapplicable boundary action never throws.
         *  6. Multi-membership and nesting both fan out naturally: a state in groups
         *     A and B fires both; crossing an inner and an outer boundary fires both
         *     levels.
         *
         *  Because firing an action can drive a further transition (which crosses
         *  more boundaries, which fires more actions), this is a bounded
         *  run-to-completion: `_boundary_depth` tracks the live cascade depth and a
         *  cascade deeper than `_boundary_depth_limit` throws a {@link JssmError}
         *  rather than overflowing the stack or hanging.  The limit defaults to 100
         *  and is configurable via the `boundary_depth_limit` constructor option.
         *
         *  @param prev_state The state the machine was in before this commit.
         *  @param next_state The state the machine is in now (already committed).
         *
         *  @throws {JssmError} If cascaded boundary firing exceeds `_boundary_depth_limit`
         *    (a probable infinite loop).
         *
         *  @see action
         *  @see transition_impl
         *
         *  @internal
         *
         */
        _fire_boundary_actions(prev_state, next_state) {
            var _a, _b, _c, _d, _e, _f;
            // Nothing crosses a boundary when the state name is unchanged.
            if (prev_state === next_state) {
                return;
            }
            // Skip entirely for machines that declared no boundary hooks at all — the
            // overwhelming common case, and it keeps the hot transition path free of
            // set arithmetic.
            if (this._group_hooks.size === 0 && this._state_hooks.size === 0) {
                return;
            }
            if (this._boundary_depth >= this._boundary_depth_limit) {
                throw new JssmError(this, `boundary-hook action cascade exceeded depth limit (${this._boundary_depth_limit}) `
                    + `crossing from ${JSON.stringify(prev_state)} to ${JSON.stringify(next_state)} `
                    + `(possible infinite loop)`);
            }
            const prev_groups = (_a = this._state_to_groups.get(prev_state)) !== null && _a !== void 0 ? _a : empty_string_set;
            const next_groups = (_b = this._state_to_groups.get(next_state)) !== null && _b !== void 0 ? _b : empty_string_set;
            // The labels to dispatch, gathered before any firing so that re-entrant
            // transitions caused by an early action cannot perturb which boundaries the
            // *current* crossing fires.  Exits precede enters (statechart convention).
            const labels = [];
            // Exits: groups left (in prev but not next), then the plain prev state.
            for (const group of prev_groups) {
                if (next_groups.has(group)) {
                    continue;
                }
                const label = (_c = this._group_hooks.get(group)) === null || _c === void 0 ? void 0 : _c.onExit;
                if (label !== undefined) {
                    labels.push(label);
                }
            }
            const prev_state_exit = (_d = this._state_hooks.get(prev_state)) === null || _d === void 0 ? void 0 : _d.onExit;
            if (prev_state_exit !== undefined) {
                labels.push(prev_state_exit);
            }
            // Enters: groups entered (in next but not prev), then the plain next state.
            for (const group of next_groups) {
                if (prev_groups.has(group)) {
                    continue;
                }
                const label = (_e = this._group_hooks.get(group)) === null || _e === void 0 ? void 0 : _e.onEnter;
                if (label !== undefined) {
                    labels.push(label);
                }
            }
            const next_state_enter = (_f = this._state_hooks.get(next_state)) === null || _f === void 0 ? void 0 : _f.onEnter;
            if (next_state_enter !== undefined) {
                labels.push(next_state_enter);
            }
            if (labels.length === 0) {
                return;
            }
            // Each dispatched action re-enters transition_impl, which (on success) calls
            // back here for the boundary it just crossed.  The depth counter brackets
            // the whole fan-out so a self-perpetuating cascade is bounded, not infinite.
            this._boundary_depth += 1;
            try {
                for (const label of labels) {
                    this.action(label); // safe no-op (returns false) if inapplicable here
                }
            }
            finally {
                this._boundary_depth -= 1;
            }
        }
        /*********
         *
         *  Shared transition core used by {@link transition}, {@link force_transition},
         *  and {@link action}.  Runs validation, fires the full hook pipeline (pre-
         *  everything, any-action, after, any-transition, exit, named, basic,
         *  edge-type, entry, everything), commits the new state if nothing
         *  rejected, and returns whether the transition succeeded.
         *
         *  Not meant for external use.  Call one of the public wrappers instead:
         *  - `transition` for an ordinary legal transition
         *  - `force_transition` to bypass the legality check
         *  - `action` to dispatch by action name rather than target state
         *
         *  @remarks
         *  Known sharp edges, carried over from the original `// TODO` comments:
         *  - The forced-ness behavior needs to be cleaned up a lot here.
         *  - The callbacks are not fully correct across the forced / action / plain
         *    cases and should be revisited.
         *  - When multiple edges exist between two states with different `kind`
         *    values, only the first edge's kind is used to pick the edge-type hook.
         *
         *  @typeParam mDT The type of the machine data member; usually omitted.
         *
         *  @param newStateOrAction The target state name (for a plain or forced
         *  transition) or the action name (when `wasAction` is true).
         *
         *  @param newData Optional replacement machine data to install alongside
         *  the transition.  Hooks may further override this via complex results.
         *
         *  @param wasForced `true` if the caller invoked `force_transition`, in
         *  which case legality is checked against `valid_force_transition` rather
         *  than `valid_transition`.
         *
         *  @param wasAction `true` if the caller invoked `action`, in which case
         *  `newStateOrAction` is an action name and the target state is looked up
         *  via the current action edge.
         *
         *  @param dataProvided `true` when the caller explicitly supplied a data
         *  argument — even an explicitly-`undefined` one, which commits `undefined`
         *  as the new data (StoneCypher/fsl#1264).  When `false` the current data
         *  is preserved.  The public wrappers derive this from call arity; the
         *  default reproduces the old `!== undefined` inference for any direct
         *  callers.
         *
         *  @returns `true` if the transition was valid and every hook passed;
         *  `false` if the transition was invalid or any hook rejected.
         *
         *  @throws {JssmError} If called reentrantly from inside a hook that is still
         *  running in the enclosing transition's pre-commit pipeline — a hook that
         *  calls `transition`/`go`/`do`/`action`.  Committing the inner transition
         *  and then the outer one would silently discard the inner result, so the
         *  reentry is rejected instead (StoneCypher/fsl#1953).  Post-commit reentry
         *  (from a post-hook or the boundary-action cascade) is permitted.
         *
         *  @internal
         *
         */
        transition_impl(newStateOrAction, newData, wasForced, wasAction, dataProvided = newData !== undefined) {
            // Reject reentry from inside the pre-commit hook pipeline.  Without this, a
            // hook that itself transitions the machine would commit an inner transition
            // that this outer, not-yet-committed frame then silently overwrites.  Post-
            // commit reentry (post-hooks, the boundary-action cascade) is fine: the flag
            // is already cleared by then.  StoneCypher/fsl#1953
            if (this._committing_transition) {
                throw new JssmError(this, 'cannot start a transition from within a transition hook: the enclosing transition has not committed yet, so the inner result would be silently discarded');
            }
            let valid = false, 
            // deliberately `string`, not `JssmArrowKind`, though only arrow kinds are
            // ever assigned: declaring this local as the 4-member union makes tsc's
            // control-flow analysis narrow it across the whole of this (very large)
            // function, which overflows the checker's stack under `npm run make`.
            // The union is recovered at the hook boundary below -- see hook_args_obj.
            trans_type, newState, newStateId = NaN, actionId = NaN, fromAction;
            if (wasForced) {
                // numeric inline of valid_force_transition: any existing edge
                // qualifies, forced or not.  one string probe (the user's target name)
                // plus one numeric probe, replacing two string probes.
                const to_id = this._state_interner.id_of(newStateOrAction);
                const edgeId = (to_id === undefined) ? undefined : this._edge_id_by_pair.get(pair_key(this._state_id, to_id));
                if (edgeId !== undefined) {
                    valid = true;
                    trans_type = 'forced';
                    newState = newStateOrAction;
                    newStateId = to_id;
                }
            }
            else if (wasAction) {
                // single numeric resolution: the old path looked the action up twice,
                // once inside valid_action and again inside current_action_edge_for.
                // aid is captured for the numeric hook probes below (#729).
                const aid = this._action_interner.id_of(newStateOrAction);
                const edgeId = (aid === undefined) ? undefined : this._edge_id_by_action_pair.get(pair_key(aid, this._state_id));
                if (edgeId !== undefined) {
                    const edge = this._edges[edgeId];
                    valid = true;
                    trans_type = edge.kind;
                    newState = edge.to;
                    newStateId = this._edge_to_ids[edgeId];
                    fromAction = newStateOrAction;
                    actionId = aid;
                }
            }
            else {
                // numeric inline of valid_transition: the edge must exist and must not
                // be forced_only (truthiness, matching the old refusal exactly)
                const to_id = this._state_interner.id_of(newStateOrAction);
                const edgeId = (to_id === undefined) ? undefined : this._edge_id_by_pair.get(pair_key(this._state_id, to_id));
                if ((edgeId !== undefined) && (!(this._edges[edgeId].forced_only))) {
                    if (this._has_transition_hooks || this._has_post_transition_hooks) {
                        // kind of the dispatched edge.  _edge_id_by_pair and _edge_map are
                        // both first-declared-wins for parallel (from, to) pairs (see the
                        // constructor around _edge_map / _edge_id_by_pair), and
                        // _outbound_edge_ids fills in declaration order — so the old
                        // first-match outbound scan always resolved to this same edgeId.
                        // Direct read replaces the O(out-degree) object-deref scan; the
                        // first-declared-kind semantics are pinned by the parallel-edge
                        // transition-kind hook spec.  #735
                        trans_type = this._edges[edgeId].kind;
                    }
                    valid = true;
                    newState = newStateOrAction;
                    newStateId = to_id;
                }
            }
            // hook_args is read only inside the `_has_hooks` / `_has_post_hooks`
            // blocks below.  Skip building it for hook-free machines (every
            // chain/dense/hub/messy benchmark shape) so the hot path stops allocating
            // a 7-field object it never reads.  The NonNullable cast keeps the type
            // unchanged for all downstream uses without introducing an impossible
            // (uncoverable) branch; the value is only dereferenced under the guards
            // that imply it was built.  #670
            // NOTE (#735): the { ...hook_args, hook_name } spreads at the four
            // everything-hook sites are contractual, not waste — handlers may capture
            // their context, and each captured context must durably carry its own
            // hook_name (pinned by the simultaneous-everything-hook specs).  A shared
            // mutated object cannot satisfy that; do not "optimize" the spreads away.
            const hook_args_obj = (this._has_hooks || this._has_post_hooks)
                ? {
                    data: this._data,
                    action: fromAction,
                    from: this._state,
                    to: newState,
                    next_data: newData,
                    forced: wasForced,
                    // sound: the only values ever assigned to trans_type are an edge's
                    // `kind` and the literal 'forced'.  The local is typed `string` only
                    // to keep tsc's flow analysis off it (see its declaration above).
                    trans_type: trans_type
                }
                : undefined;
            const hook_args = hook_args_obj;
            // 'action' event fires when an action is attempted, regardless of whether
            // it ultimately succeeds — matches the issue spec for observation events.
            // Gated on live listener count so we skip the detail-object allocation
            // when nothing is subscribed.  Gate is read at fire time, so a listener
            // registered inside a pre-hook still receives the event.  #671
            if (wasAction && this._event_listener_count !== 0) {
                this._fire('action', {
                    action: newStateOrAction,
                    from: this._state,
                    to: newState,
                    data: this._data,
                    next_data: newData
                });
            }
            // Captured pre-transition source state so 'data-change' detail and similar
            // events can name where we came from.  fromStateId mirrors it for the
            // numeric post-hook probes: by the time they run, _state_id is already
            // the destination (#729).
            const fromState = this._state;
            const fromStateId = this._state_id;
            const oldData = this._data;
            if (valid) {
                if (this._has_hooks) {
                    // Open the pre-commit window: from here until the commit below, any
                    // reentrant transition_impl call (a hook transitioning the machine)
                    // throws instead of being silently reverted.  The `finally` below closes
                    // it on every exit path; _fire_hook_rejection additionally clears it
                    // before firing the rejection event so a rejection listener may itself
                    // transition.  The pipeline body is intentionally left at its original
                    // indentation to keep this fix's diff focused.  #1953
                    this._committing_transition = true;
                    try {
                        let data_changed = false;
                        // 0. pre everything hook (fires before all other pre-hooks)
                        if (this._pre_everything_hook !== undefined) {
                            const outcome = abstract_everything_hook_step(this._pre_everything_hook, Object.assign(Object.assign({}, hook_args), { hook_name: 'pre everything' }));
                            if (!outcome.pass) {
                                this._fire_hook_rejection('pre everything', fromState, newState, fromAction, oldData, newData, wasForced);
                                return false;
                            }
                            if (_update_hook_fields(hook_args, outcome)) {
                                data_changed = true;
                            }
                        }
                        if (wasAction) {
                            // 1a. any action hook
                            const outcome = abstract_hook_step(this._any_action_hook, hook_args);
                            if (!outcome.pass) {
                                this._fire_hook_rejection('any action', fromState, newState, fromAction, oldData, newData, wasForced);
                                return false;
                            }
                            if (_update_hook_fields(hook_args, outcome)) {
                                data_changed = true;
                            }
                            // 1b. global specific action hook
                            const outcome2 = abstract_hook_step(this._global_action_hooks.get(actionId), hook_args);
                            if (!outcome2.pass) {
                                this._fire_hook_rejection('global action', fromState, newState, fromAction, oldData, newData, wasForced);
                                return false;
                            }
                            if (_update_hook_fields(hook_args, outcome2)) {
                                data_changed = true;
                            }
                        }
                        // 2. (removed) After hooks do NOT fire on dispatch.  They are the
                        // `after`-timer's companion (fsl#698: "delay over!") and fire only from
                        // the state-timeout path.  Through v5.143.28 a probe here keyed on
                        // newStateOrAction spuriously fired them on entering the hooked state —
                        // or on a same-named action — making one timer elapse read as two
                        // handler calls (StoneCypher/fsl#1327).
                        // 3. any transition hook
                        if (this._any_transition_hook !== undefined) {
                            const outcome = abstract_hook_step(this._any_transition_hook, hook_args);
                            if (!outcome.pass) {
                                this._fire_hook_rejection('any transition', fromState, newState, fromAction, oldData, newData, wasForced);
                                return false;
                            }
                            if (_update_hook_fields(hook_args, outcome)) {
                                data_changed = true;
                            }
                        }
                        // 4. exit hook
                        if (this._has_exit_hooks) {
                            const outcome = abstract_hook_step(this._exit_hooks.get(this._state_id), hook_args);
                            if (!outcome.pass) {
                                this._fire_hook_rejection('exit', fromState, newState, fromAction, oldData, newData, wasForced);
                                return false;
                            }
                            if (_update_hook_fields(hook_args, outcome)) {
                                data_changed = true;
                            }
                        }
                        // shared by steps 5 and 6: pre-commit, this._state_id is still the
                        // from-state, so both probes key on the same pair; compute it once
                        const pre_pair_id = pair_key(this._state_id, newStateId);
                        // 5. named transition / action hook
                        if (this._has_named_hooks && wasAction) {
                            // Numeric pair probe, then the action id captured at dispatch (#729).
                            const byPair = this._named_hooks.get(pre_pair_id);
                            const nh = byPair === undefined ? undefined : byPair.get(actionId);
                            const outcome = abstract_hook_step(nh, hook_args);
                            if (!outcome.pass) {
                                this._fire_hook_rejection('named', fromState, newState, fromAction, oldData, newData, wasForced);
                                return false;
                            }
                            if (_update_hook_fields(hook_args, outcome)) {
                                data_changed = true;
                            }
                        }
                        // 6. regular hook
                        if (this._has_basic_hooks) {
                            // Numeric pair probe (#729); one integer hash replaces two string maps.
                            const h = this._hooks.get(pre_pair_id);
                            const outcome = abstract_hook_step(h, hook_args);
                            if (!outcome.pass) {
                                this._fire_hook_rejection('hook', fromState, newState, fromAction, oldData, newData, wasForced);
                                return false;
                            }
                            if (_update_hook_fields(hook_args, outcome)) {
                                data_changed = true;
                            }
                        }
                        // 7. edge type hook
                        // 7a. standard transition hook
                        if (trans_type === 'legal') {
                            const outcome = abstract_hook_step(this._standard_transition_hook, hook_args);
                            if (!outcome.pass) {
                                this._fire_hook_rejection('standard transition', fromState, newState, fromAction, oldData, newData, wasForced);
                                return false;
                            }
                            if (_update_hook_fields(hook_args, outcome)) {
                                data_changed = true;
                            }
                            // 7b. main type hook
                        }
                        else if (trans_type === 'main') {
                            const outcome = abstract_hook_step(this._main_transition_hook, hook_args);
                            if (!outcome.pass) {
                                this._fire_hook_rejection('main transition', fromState, newState, fromAction, oldData, newData, wasForced);
                                return false;
                            }
                            if (_update_hook_fields(hook_args, outcome)) {
                                data_changed = true;
                            }
                            // 7c. forced transition hook
                        }
                        else if (trans_type === 'forced') {
                            const outcome = abstract_hook_step(this._forced_transition_hook, hook_args);
                            if (!outcome.pass) {
                                this._fire_hook_rejection('forced transition', fromState, newState, fromAction, oldData, newData, wasForced);
                                return false;
                            }
                            if (_update_hook_fields(hook_args, outcome)) {
                                data_changed = true;
                            }
                        }
                        // 8. entry hook
                        if (this._has_entry_hooks) {
                            const outcome = abstract_hook_step(this._entry_hooks.get(newStateId), hook_args);
                            if (!outcome.pass) {
                                this._fire_hook_rejection('entry', fromState, newState, fromAction, oldData, newData, wasForced);
                                return false;
                            }
                            if (_update_hook_fields(hook_args, outcome)) {
                                data_changed = true;
                            }
                        }
                        // 9. everything hook (fires after all other pre-hooks)
                        if (this._everything_hook !== undefined) {
                            const outcome = abstract_everything_hook_step(this._everything_hook, Object.assign(Object.assign({}, hook_args), { hook_name: 'everything' }));
                            if (!outcome.pass) {
                                this._fire_hook_rejection('everything', fromState, newState, fromAction, oldData, newData, wasForced);
                                return false;
                            }
                            if (_update_hook_fields(hook_args, outcome)) {
                                data_changed = true;
                            }
                        }
                        // all hooks passed!  let's now establish the result
                        // a hook may have redirected the destination via a complex result's
                        // `state` (carried on hook_args.to).  Apply it now, validating it names
                        // a real state.  Pre-transition hooks (including entry/exit) fired for
                        // the original edge; the committed state and the post-hooks, observation
                        // events, and after-timer all reflect the override.  Last writer wins.
                        // StoneCypher/fsl#1947
                        if (hook_args.to !== newState) {
                            const override_id = this._state_interner.id_of(hook_args.to);
                            if (override_id === undefined) {
                                throw new JssmError(this, `A hook overrode the transition destination to '${hook_args.to}', which is not a state in this machine`);
                            }
                            newState = hook_args.to;
                            newStateId = override_id;
                        }
                        if (this._history_length) {
                            this._history.shove([this._state, this._data]);
                        }
                        this._state = newState;
                        this._state_id = newStateId;
                        if (data_changed) {
                            this._data = hook_args.next_data;
                        }
                        else if (dataProvided) {
                            this._data = newData;
                        }
                        // success fallthrough to posthooks; intentionally no return here
                        // look for "posthooks begin here"
                    }
                    finally {
                        // Close the pre-commit window on EVERY exit from the pipeline: normal
                        // fallthrough after commit, a hook veto's `return false`, the
                        // destination-override throw, or a user hook throwing.  Post-hooks and
                        // the boundary-action cascade run after this and may re-enter the
                        // machine coherently from the committed state.  #1953
                        this._committing_transition = false;
                    }
                    // or without hooks
                }
                else {
                    if (this._history_length) {
                        this._history.shove([this._state, this._data]);
                    }
                    this._state = newState;
                    this._state_id = newStateId;
                    // provision is detected by caller arity, so an explicit `undefined`
                    // commits while an omitted argument preserves (StoneCypher/fsl#1264)
                    if (dataProvided) {
                        this._data = newData;
                    }
                    // success fallthrough to posthooks; intentionally no return here
                    // look for "posthooks begin here"
                }
                // not valid
            }
            else {
                // Gated on live listener count so we skip the detail-object allocation
                // when nothing is subscribed.  A listener still receives the event
                // because the gate is read at fire time.  #671
                if (this._event_listener_count !== 0) {
                    this._fire('rejection', {
                        from: fromState,
                        to: newStateOrAction, // we never resolved a real target
                        action: fromAction,
                        data: oldData,
                        next_data: newData,
                        reason: 'invalid',
                        forced: wasForced
                    });
                }
                return false;
            }
            // posthooks begin here
            if (this._has_post_hooks) {
                // 0. pre post everything hook (fires before all other post-hooks)
                if (this._pre_post_everything_hook !== undefined) {
                    this._pre_post_everything_hook(Object.assign(Object.assign({}, hook_args), { hook_name: 'pre post everything' }));
                }
                if (wasAction) {
                    // 1. any action posthook
                    if (this._post_any_action_hook !== undefined) {
                        this._post_any_action_hook(hook_args);
                    }
                    // 2. global specific action hook
                    const pgah = this._post_global_action_hooks.get(actionId);
                    if (pgah !== undefined) {
                        pgah(hook_args);
                    }
                }
                // 3. any transition hook
                if (this._post_any_transition_hook !== undefined) {
                    this._post_any_transition_hook(hook_args);
                }
                // 4. exit hook
                if (this._has_post_exit_hooks) {
                    const peh = this._post_exit_hooks.get(fromStateId);
                    if (peh !== undefined) {
                        peh(hook_args);
                    }
                }
                // shared by steps 5 and 6: post-commit this._state_id has moved on, so
                // the from-side of the pair comes from the captured fromStateId;
                // compute it once
                const post_pair_id = pair_key(fromStateId, newStateId);
                // 5. named transition / action hook
                if (this._has_post_named_hooks && wasAction) {
                    // Numeric pair probe, then the action id captured at dispatch (#729).
                    const byPair = this._post_named_hooks.get(post_pair_id);
                    const pnh = byPair === undefined ? undefined : byPair.get(actionId);
                    if (pnh !== undefined) {
                        pnh(hook_args);
                    }
                }
                // 6. regular hook
                if (this._has_post_basic_hooks) {
                    // Numeric pair probe (#729).
                    const hook = this._post_hooks.get(post_pair_id);
                    if (hook !== undefined) {
                        hook(hook_args);
                    }
                }
                // 7. edge type hook
                // 7a. standard transition hook
                if (trans_type === 'legal' && this._post_standard_transition_hook !== undefined) {
                    this._post_standard_transition_hook(hook_args);
                }
                // 7b. main type hook
                if (trans_type === 'main' && this._post_main_transition_hook !== undefined) {
                    this._post_main_transition_hook(hook_args);
                }
                // 7c. forced transition hook
                if (trans_type === 'forced' && this._post_forced_transition_hook !== undefined) {
                    this._post_forced_transition_hook(hook_args);
                }
                // 8. entry hook
                if (this._has_post_entry_hooks) {
                    const hook = this._post_entry_hooks.get(newStateId);
                    if (hook !== undefined) {
                        hook(hook_args);
                    }
                }
                // 9. post everything hook (fires after all other post-hooks)
                if (this._post_everything_hook !== undefined) {
                    this._post_everything_hook(Object.assign(Object.assign({}, hook_args), { hook_name: 'post everything' }));
                }
            }
            // Observation events (#638) fire after the state is committed.  Each call
            // builds a detail literal at the call site, so guard the whole block on a
            // live subscription count: with zero listeners (the common hot-path case,
            // and every benchmark shape) we skip all of these allocations entirely.
            // Read after pre-hooks, so a listener a pre-hook installed is still seen.
            // ('action' above and 'rejection' on the invalid path are intentionally
            // NOT under this gate — they fire regardless, and `_fire` itself no-ops
            // cheaply when that specific event has no subscribers.)  #670
            if (this._event_listener_count !== 0) {
                const newData_after = this._data;
                // per-name gates: each detail literal below is only built when that
                // specific event has a live subscriber — a single-purpose panel
                // listening only to 'transition' previously paid for the exit/entry/
                // data-change/terminal/complete allocations _fire then discarded.
                // Gates read at fire time, like the outer count, preserving #671.
                if (this._has_subscribers('exit')) {
                    this._fire('exit', {
                        state: fromState,
                        to: newState,
                        action: fromAction,
                        data: newData_after
                    });
                }
                if (this._has_subscribers('transition')) {
                    this._fire('transition', {
                        from: fromState,
                        to: newState,
                        action: fromAction,
                        data: newData_after,
                        next_data: newData,
                        trans_type,
                        forced: wasForced
                    });
                }
                if (this._has_subscribers('entry')) {
                    this._fire('entry', {
                        state: newState,
                        from: fromState,
                        action: fromAction,
                        data: newData_after
                    });
                }
                if ((oldData !== newData_after) && this._has_subscribers('data-change')) {
                    this._fire('data-change', {
                        from: fromState,
                        to: newState,
                        action: fromAction,
                        old_data: oldData,
                        new_data: newData_after,
                        cause: 'transition'
                    });
                }
                // one state-record fetch answers both checks; newState is known-valid
                // here, and the public state_is_terminal / state_is_complete pair would
                // each redo has_state plus its own map walk.  Same predicates:
                // terminal = no exits, complete = the constructor-set flag.  #735
                const new_state_rec = this._states.get(newState);
                if ((new_state_rec.to.length === 0) && this._has_subscribers('terminal')) {
                    this._fire('terminal', { state: newState, data: newData_after });
                }
                if (new_state_rec.complete && this._has_subscribers('complete')) {
                    this._fire('complete', { state: newState, data: newData_after });
                }
            }
            // FSL boundary-hook actions (`on enter/exit &g do 'X'`) fire after the
            // state is committed and after the observation events, matching the
            // statechart "exits before enters" convention.  Cascades are depth-bounded
            // inside the helper.
            this._fire_boundary_actions(fromState, newState);
            // Clear the departed state's `after` timer and re-establish the new state's,
            // now that the transition has actually committed.  This clear runs only on a
            // successful commit -- a hook that VETOES the transition returns above, so
            // the machine stays put and its pending `after` timer is preserved
            // (StoneCypher/fsl#1945).  It still runs for hook-free machines, so a manual
            // transition away cannot leave a ghost timer to fire a stray go() later
            // (the fsl#1327 guarantee).  The clear must precede the arm because
            // set_state_timeout throws if a timer is already pending.
            this.clear_state_timeout();
            this.auto_set_state_timeout();
            return true;
        }
        /**
         * If the current state has an `after` timeout configured, schedule it.
         *  Called internally after each transition.
         */
        auto_set_state_timeout() {
            // called on every successful transition-commit.  Machines with no `after`
            // clauses at all (the overwhelmingly common case) previously still paid a
            // string hash + map probe here per transition; one integer size read
            // short-circuits that.
            if (this._after_mapping.size === 0) {
                return;
            }
            const after_res = this._after_mapping.get(this._state);
            if (after_res !== undefined) {
                const [next_state, after_time] = after_res;
                this.set_state_timeout(next_state, after_time);
            }
        }
        /*********
         *
         *  Get a truncated history of the recent states and data of the machine.
         *  Turned off by default; configure with `.from('...', {data: 5})` by length,
         *  or set `.history_length` at runtime.
         *
         *  History *does not contain the current state*.  If you want that, call
         *  `.history_inclusive` instead.
         *
         *  ```typescript
         *  const foo = jssm.from(
         *    "a 'next' -> b 'next' -> c 'next' -> d 'next' -> e;",
         *    { history: 3 }
         *  );
         *
         *  foo.action('next');
         *  foo.action('next');
         *  foo.action('next');
         *  foo.action('next');
         *
         *  foo.history;  // [ ['b',undefined], ['c',undefined], ['d',undefined] ]
         *  ```
         *
         *  Notice that the machine's current state, `e`, is not in the returned list.
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         */
        get history() {
            return this._history.toArray();
        }
        /*********
         *
         *  Get a truncated history of the recent states and data of the machine,
         *  including the current state.  Turned off by default; configure with
         *  `.from('...', {data: 5})` by length, or set `.history_length` at runtime.
         *
         *  History inclusive contains the current state.  If you only want past
         *  states, call `.history` instead.
         *
         *  The list returned will be one longer than the history buffer kept, as the
         *  history buffer kept gets the current state added to it to produce this
         *  list.
         *
         *  ```typescript
         *  const foo = jssm.from(
         *    "a 'next' -> b 'next' -> c 'next' -> d 'next' -> e;",
         *    { history: 3 }
         *  );
         *
         *  foo.action('next');
         *  foo.action('next');
         *  foo.action('next');
         *  foo.action('next');
         *
         *  foo.history_inclusive;  // [ ['b',undefined], ['c',undefined], ['d',undefined], ['e',undefined] ]
         *  ```
         *
         *  Notice that the machine's current state, `e`, is in the returned list.
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         */
        get history_inclusive() {
            const ret = this._history.toArray();
            ret.push([this.state(), this.data()]);
            return ret;
        }
        /*********
         *
         *  Find out how long a history this machine is keeping.  Defaults to zero.
         *  Settable directly.
         *
         *  ```typescript
         *  const foo = jssm.from("a -> b;");
         *  foo.history_length;                                  // 0
         *
         *  const bar = jssm.from("a -> b;", { history: 3 });
         *  foo.history_length;                                  // 3
         *  foo.history_length = 5;
         *  foo.history_length;                                  // 5
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         */
        get history_length() {
            return this._history_length;
        }
        set history_length(to) {
            this._history_length = to;
            this._history.resize(to, true);
        }
        /********
         *
         *  Instruct the machine to complete an action.  Synonym for {@link do}.
         *
         *  ```typescript
         *  const light = sm`red 'next' -> green 'next' -> yellow 'next' -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
         *
         *  light.state();               // 'red'
         *  light.action('next');        // true
         *  light.state();               // 'green'
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @param actionName The action to engage
         *
         *  @param newData The data change to insert during the action
         *
         *  @returns `true` if the action was valid and the transition occurred,
         *  `false` otherwise.
         *
         */
        action(actionName, newData) {
            // arity, not undefined-comparison: an explicit `undefined` is a real
            // data assignment (StoneCypher/fsl#1264)
            return this.transition_impl(actionName, newData, false, true, arguments.length >= 2);
        }
        /********
         *
         *  Get the standard style for a single state.  ***Does not*** include
         *  composition from an applied theme, or things from the underlying base
         *  stylesheet; only the modifications applied by this machine.
         *
         *  ```typescript
         *  const light = sm`a -> b;`;
         *  console.log(light.standard_state_style);
         *  // {}
         *
         *  const light = sm`a -> b; state: { shape: circle; };`;
         *  console.log(light.standard_state_style);
         *  // { shape: 'circle' }
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @returns The {@link JssmStateConfig} for standard states.
         *
         */
        get standard_state_style() {
            return this._state_style;
        }
        /********
         *
         *  Get the hooked state style.  ***Does not*** include
         *  composition from an applied theme, or things from the underlying base
         *  stylesheet; only the modifications applied by this machine.
         *
         *  The hooked style is only applied to nodes which have a named hook in the
         *  graph.  Open hooks set through the external API aren't graphed, because
         *  that would be literally every node.
         *
         *  ```typescript
         *  const light = sm`a -> b;`;
         *  console.log(light.hooked_state_style);
         *  // {}
         *
         *  const light = sm`a -> b; hooked_state: { shape: circle; };`;
         *  console.log(light.hooked_state_style);
         *  // { shape: 'circle' }
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @returns The {@link JssmStateConfig} for hooked states.
         *
         */
        get hooked_state_style() {
            return this._hooked_state_style;
        }
        /********
         *
         *  Get the start state style.  ***Does not*** include composition from an
         *  applied theme, or things from the underlying base stylesheet; only the
         *  modifications applied by this machine.
         *
         *  Start states are defined by the directive `start_states`, or in absentia,
         *  are the first mentioned state.
         *
         *  ```typescript
         *  const light = sm`a -> b;`;
         *  console.log(light.start_state_style);
         *  // {}
         *
         *  const light = sm`a -> b; start_state: { shape: circle; };`;
         *  console.log(light.start_state_style);
         *  // { shape: 'circle' }
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @returns The {@link JssmStateConfig} for start states.
         *
         */
        get start_state_style() {
            return this._start_state_style;
        }
        /********
         *
         *  Get the end state style.  ***Does not*** include
         *  composition from an applied theme, or things from the underlying base
         *  stylesheet; only the modifications applied by this machine.
         *
         *  End states are defined in the directive `end_states`, and are distinct
         *  from terminal states.  End states are voluntary successful endpoints for a
         *  process.  Terminal states are states that cannot be exited.  By example,
         *  most error states are terminal states, but not end states.  Also, since
         *  some end states can be exited and are determined by hooks, such as
         *  recursive or iterative nodes, there is such a thing as an end state that
         *  is not a terminal state.
         *
         *  ```typescript
         *  const light = sm`a -> b;`;
         *  console.log(light.standard_state_style);
         *  // {}
         *
         *  const light = sm`a -> b; end_state: { shape: circle; };`;
         *  console.log(light.standard_state_style);
         *  // { shape: 'circle' }
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @returns The {@link JssmStateConfig} for end states.
         *
         */
        get end_state_style() {
            return this._end_state_style;
        }
        /********
         *
         *  Get the terminal state style.  ***Does not*** include
         *  composition from an applied theme, or things from the underlying base
         *  stylesheet; only the modifications applied by this machine.
         *
         *  Terminal state styles are automatically determined by the machine.  Any
         *  state without a valid exit transition is terminal.
         *
         *  ```typescript
         *  const light = sm`a -> b;`;
         *  console.log(light.terminal_state_style);
         *  // {}
         *
         *  const light = sm`a -> b; terminal_state: { shape: circle; };`;
         *  console.log(light.terminal_state_style);
         *  // { shape: 'circle' }
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @returns The {@link JssmStateConfig} for terminal states.
         *
         */
        get terminal_state_style() {
            return this._terminal_state_style;
        }
        /********
         *
         *  Get the style for the active state.  ***Does not*** include
         *  composition from an applied theme, or things from the underlying base
         *  stylesheet; only the modifications applied by this machine.
         *
         *  ```typescript
         *  const light = sm`a -> b;`;
         *  console.log(light.active_state_style);
         *  // {}
         *
         *  const light = sm`a -> b; active_state: { shape: circle; };`;
         *  console.log(light.active_state_style);
         *  // { shape: 'circle' }
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @returns The {@link JssmStateConfig} for the active state.
         *
         */
        get active_state_style() {
            return this._active_state_style;
        }
        /********
         *
         *  Generate the uniform observational-hook registry — every currently
         *  registered hook projected onto a normalized `(kind, target, phase)` row
         *  (megaspec §12, → #1357).  The registry is *generated* on demand by
         *  walking the concrete per-kind storage tables rather than maintained as a
         *  second copy, so it can never drift from the tables {@link Machine.set_hook}
         *  actually dispatches into.  It is the single source of truth behind the
         *  introspection accessors ({@link Machine.has_hook}, {@link Machine.hooks_on})
         *  and the `hooked_state` viz styling.
         *
         *  Targets are normalized: edge hooks become `{ scope: 'edge', from, to }`
         *  (named hooks add `action`), entry/exit/after become `{ scope: 'state' }`,
         *  global-action hooks become `{ scope: 'action' }`, and the `any-*`,
         *  transition-class, and `everything` observers become `{ scope: 'global' }`.
         *
         *  ```typescript
         *  const m = sm`a 'go' -> b;`;
         *  m.hook_entry('b', () => true);
         *  m.hook_registry();
         *  // => [ { kind: 'entry', phase: 'pre', target: { scope: 'state', state: 'b' } } ]
         *  ```
         *
         *  @returns Every registered hook as a {@link HookRegistryEntry}, in a stable
         *  table-walk order (pre-phase tables first, then post-phase).
         *
         */
        hook_registry() {
            const entries = [];
            // The hot-path hook tables are keyed by interned integer ids (states and
            // actions) and, for edges, by `pair_key(from_id, to_id)`.  Decode each key
            // back to its original name so the registry speaks states/actions, never
            // ids.  The lone exception is `_after_hooks`, deliberately string-keyed.
            const state_name = (id) => this._state_interner.name_of(id);
            const action_name = (id) => this._action_interner.name_of(id);
            // edge tables: pair_key(from_id, to_id) -> handler
            const push_edges = (table, kind, phase) => {
                table.forEach((_handler, pk) => {
                    const [fid, tid] = un_pair_key(pk);
                    entries.push({ kind, phase, target: { scope: 'edge', from: state_name(fid), to: state_name(tid) } });
                });
            };
            // named-edge tables: pair_key(from_id, to_id) -> action_id -> handler
            const push_named = (table, kind, phase) => {
                table.forEach((byAction, pk) => {
                    const [fid, tid] = un_pair_key(pk);
                    const from = state_name(fid), to = state_name(tid);
                    byAction.forEach((_handler, aid) => {
                        entries.push({ kind, phase, target: { scope: 'edge', from, to, action: action_name(aid) } });
                    });
                });
            };
            // entry/exit tables: interned state_id -> handler
            const push_states = (table, kind, phase) => {
                table.forEach((_handler, sid) => {
                    entries.push({ kind, phase, target: { scope: 'state', state: state_name(sid) } });
                });
            };
            // the `after` table is the lone string-keyed exception: state name -> handler
            const push_states_by_name = (table, kind, phase) => {
                table.forEach((_handler, state) => {
                    entries.push({ kind, phase, target: { scope: 'state', state: state } });
                });
            };
            // global-action tables: interned action_id -> handler
            const push_actions = (table, kind, phase) => {
                table.forEach((_handler, aid) => {
                    entries.push({ kind, phase, target: { scope: 'action', action: action_name(aid) } });
                });
            };
            const push_global = (handler, kind, phase) => {
                if (handler !== undefined) {
                    entries.push({ kind, phase, target: { scope: 'global' } });
                }
            };
            // FSL boundary hooks: subject name -> { onEnter?, onExit? }, fired post-
            // commit.  Each present direction becomes its own row, all phase 'post'.
            const push_boundary = (table, enterKind, exitKind, target_of) => {
                table.forEach((bh, subject) => {
                    if (bh.onEnter !== undefined) {
                        entries.push({ kind: enterKind, phase: 'post', target: target_of(subject) });
                    }
                    if (bh.onExit !== undefined) {
                        entries.push({ kind: exitKind, phase: 'post', target: target_of(subject) });
                    }
                });
            };
            // pre-phase, edge- and state-keyed tables
            push_edges(this._hooks, 'hook', 'pre');
            push_named(this._named_hooks, 'named', 'pre');
            push_states(this._entry_hooks, 'entry', 'pre');
            push_states(this._exit_hooks, 'exit', 'pre');
            push_states_by_name(this._after_hooks, 'after', 'pre');
            push_actions(this._global_action_hooks, 'global action', 'pre');
            // pre-phase, global singletons
            push_global(this._any_action_hook, 'any action', 'pre');
            push_global(this._standard_transition_hook, 'standard transition', 'pre');
            push_global(this._main_transition_hook, 'main transition', 'pre');
            push_global(this._forced_transition_hook, 'forced transition', 'pre');
            push_global(this._any_transition_hook, 'any transition', 'pre');
            push_global(this._after_any_hook, 'after any', 'pre');
            push_global(this._pre_everything_hook, 'pre everything', 'pre');
            push_global(this._everything_hook, 'everything', 'pre');
            // post-phase, edge- and state-keyed tables
            push_edges(this._post_hooks, 'post hook', 'post');
            push_named(this._post_named_hooks, 'post named', 'post');
            push_states(this._post_entry_hooks, 'post entry', 'post');
            push_states(this._post_exit_hooks, 'post exit', 'post');
            push_actions(this._post_global_action_hooks, 'post global action', 'post');
            // post-phase, global singletons
            push_global(this._post_any_action_hook, 'post any action', 'post');
            push_global(this._post_standard_transition_hook, 'post standard transition', 'post');
            push_global(this._post_main_transition_hook, 'post main transition', 'post');
            push_global(this._post_forced_transition_hook, 'post forced transition', 'post');
            push_global(this._post_any_transition_hook, 'post any transition', 'post');
            push_global(this._pre_post_everything_hook, 'pre post everything', 'post');
            push_global(this._post_everything_hook, 'post everything', 'post');
            // FSL boundary hooks (post-commit): group and plain-state subjects
            push_boundary(this._group_hooks, 'group enter', 'group exit', (group) => ({ scope: 'group', group }));
            push_boundary(this._state_hooks, 'state enter', 'state exit', (state) => ({ scope: 'state', state: state }));
            return entries;
        }
        /********
         *
         *  Does a single registry entry reference the state `state`?  An entry
         *  references a state when it is a `'state'`-scoped hook on that state, or an
         *  `'edge'`-scoped hook whose `from` or `to` is that state.  `'action'`- and
         *  `'global'`-scoped entries reference no particular state.  This is the
         *  predicate behind both per-state introspection and the `hooked_state`
         *  styling layer.
         *
         *  @param entry The registry entry to test.
         *  @param state The state name to test membership of.
         *  @returns `true` when the entry observes that state.
         *
         */
        static _entry_touches_state(entry, state) {
            const t = entry.target;
            if (t.scope === 'state') {
                return t.state === state;
            }
            if (t.scope === 'edge') {
                return t.from === state || t.to === state;
            }
            return false;
        }
        /********
         *
         *  Does a single registry entry match a `{ from, to, action? }` edge query?
         *  Only `'edge'`-scoped entries can match.  When the query omits `action`
         *  the entry's action (if any) is ignored; when the query supplies `action`
         *  it must match exactly.
         *
         *  @param entry The registry entry to test.
         *  @param from  The edge origin to match.
         *  @param to    The edge destination to match.
         *  @param action Optional named action to match exactly.
         *  @returns `true` when the entry observes that edge.
         *
         */
        static _entry_matches_edge(entry, from, to, action) {
            const t = entry.target;
            if (t.scope !== 'edge') {
                return false;
            }
            if (t.from !== from || t.to !== to) {
                return false;
            }
            if (action !== undefined) {
                return t.action === action;
            }
            return true;
        }
        /********
         *
         *  Does a single registry entry match an action name?  Both `'action'`-scoped
         *  hooks (global-action hooks) and named-edge hooks carrying that action
         *  count as matches.
         *
         *  @param entry  The registry entry to test.
         *  @param action The action name to match.
         *  @returns `true` when the entry observes that action.
         *
         */
        static _entry_matches_action(entry, action) {
            const t = entry.target;
            if (t.scope === 'action') {
                return t.action === action;
            }
            if (t.scope === 'edge') {
                return t.action === action;
            }
            return false;
        }
        /********
         *
         *  Does a single registry entry match a named state group?  Only
         *  `'group'`-scoped entries (FSL group-boundary hooks) match.  Group hooks
         *  are matched by group name only — they deliberately do not propagate to
         *  member states, so a member-state query never returns them.
         *
         *  @param entry The registry entry to test.
         *  @param group The group name to match.
         *  @returns `true` when the entry observes that group's boundary.
         *
         */
        static _entry_matches_group(entry, group) {
            const t = entry.target;
            if (t.scope === 'group') {
                return t.group === group;
            }
            return false;
        }
        /********
         *
         *  Return every registry entry observing the given target (megaspec §12).
         *  The `query` selects the target shape:
         *
         *  - a bare **state name** matches entry/exit/after hooks on that state, its
         *    state-boundary hooks, and every edge hook touching it (`from` or `to`),
         *  - a `{ from, to, action? }` **edge** matches edge hooks on that
         *    transition (optionally narrowed to the named action),
         *  - a `{ action }` **action** matches global-action and named-edge hooks
         *    carrying that action,
         *  - a `{ group }` **group** matches that group's boundary hooks (group hooks
         *    are matched by name only and do not propagate to member states).
         *
         *  ```typescript
         *  const m = sm`a 'go' -> b;`;
         *  m.hook_entry('b', () => true);
         *  m.hooks_on('b').length;             // 1
         *  m.hooks_on({ from: 'a', to: 'b' }); // []  (no edge hook registered)
         *  ```
         *
         *  @param query The {@link HookQuery} naming the target to inspect.
         *  @returns The matching {@link HookRegistryEntry} rows (possibly empty).
         *
         */
        hooks_on(query) {
            const registry = this.hook_registry();
            if (typeof query === 'string') {
                return registry.filter(e => Machine._entry_touches_state(e, query));
            }
            // An edge query is distinguished by carrying `from` (it may *also* carry
            // `action`, which narrows the edge — so this must be tested before the
            // action-only case, whose discriminator `action` an edge query can share).
            if ('from' in query) {
                return registry.filter(e => Machine._entry_matches_edge(e, query.from, query.to, query.action));
            }
            if ('group' in query) {
                return registry.filter(e => Machine._entry_matches_group(e, query.group));
            }
            return registry.filter(e => Machine._entry_matches_action(e, query.action));
        }
        /********
         *
         *  Is at least one observational hook bound to the given target (megaspec
         *  §12)?  The `query` is read exactly as in {@link Machine.hooks_on}.  An
         *  optional `phase` narrows the test to pre- or post-transition hooks only;
         *  omitted, either phase satisfies it.
         *
         *  ```typescript
         *  const m = sm`a -> b;`;
         *  m.has_hook('b');                 // false
         *  m.hook_entry('b', () => true);
         *  m.has_hook('b');                 // true
         *  m.has_hook('b', 'post');         // false  (the entry hook is pre-phase)
         *  ```
         *
         *  @param query The {@link HookQuery} naming the target to inspect.
         *  @param phase Optional {@link HookPhase} to restrict the test to.
         *  @returns `true` when a matching hook exists.
         *
         */
        has_hook(query, phase) {
            const matches = this.hooks_on(query);
            if (phase === undefined) {
                return matches.length > 0;
            }
            return matches.some(e => e.phase === phase);
        }
        /********
         *
         *  Does the given state carry any observational hook — i.e. should it receive
         *  the `hooked_state` viz styling?  True when an entry/exit/after hook is
         *  bound to the state, any edge hook touches it, or the state has its own
         *  boundary hook.  Group-boundary hooks do *not* count here — they are
         *  matched by group only and never propagate to member states.  Powers the
         *  `hooked` styling layer in {@link Machine.resolve_state_config}; replaces
         *  the long-stubbed `has_hooks` placeholder (megaspec §12).
         *
         *  ```typescript
         *  const m = sm`a -> b;`;
         *  m.state_has_hooks('a');          // false
         *  m.hook_exit('a', () => true);
         *  m.state_has_hooks('a');          // true
         *  ```
         *
         *  @param state The state to test.
         *  @returns `true` when the state is observed by at least one hook.
         *
         */
        state_has_hooks(state) {
            // Boundary hooks are a separate mechanism that sets neither _has_hooks nor
            // _has_post_hooks, so the fast-out must also consult the boundary tables —
            // otherwise a state whose only hook is a boundary hook reports unhooked.
            if (!this._has_hooks
                && !this._has_post_hooks
                && (this._state_hooks.size === 0)
                && (this._group_hooks.size === 0)) {
                return false;
            }
            return this.hook_registry().some(e => Machine._entry_touches_state(e, state));
        }
        /********
         *
         *  Resolves the full unified style/config cascade for a state — the runtime
         *  successor to the ad-hoc layer merge {@link style_for} used to perform.
         *
         *  For any state OTHER than the current one, this returns the memoized static
         *  resolution (tiers 1–5; see `_compose_state_config`) — theme →
         *  `default_state_config` → per-kind defaults → depth-ordered group metadata →
         *  per-state config.  The cache is keyed by state; those tiers do not depend
         *  on which state is current, so it survives transitions, but the mutable
         *  cascade inputs each clear it when they change — hook registration and
         *  removal ({@link Machine.set_hook}, {@link Machine.remove_hook}; the
         *  hooked layer) and theme assignment (the `themes` setter; tier 1 and the
         *  per-kind theme layers).
         *
         *  For the machine's CURRENTLY-occupied state the result is recomputed each
         *  call (never cached) and additionally carries the dynamic `active_state`
         *  layers: the active-state THEME layers fold in just below the per-state
         *  config (tier 3-active), and the user `active_state : { … }` overlay folds
         *  in LAST (tier 6), on top of everything, so it wins over per-state config.
         *  Every fold uses `merge_state_config`, so a key set at a lower tier is
         *  overridden — never rejected — by a higher one.
         *
         *  ```typescript
         *  import { sm } from 'jssm';
         *
         *  const m = sm`&busy : [working]; idle 'go' -> working; state &busy : { color: orange; };`;
         *  m.resolve_state_config('working').color;  // '#ffa500ff' — from group &busy
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @param state The state to compute the composite config for.
         *
         *  @returns The fully composited {@link JssmStateConfig} for the state,
         *  including the active overlay when the state is current.
         *
         *  @see style_for
         *
         */
        resolve_state_config(state) {
            // The current state carries the dynamic active layers and is recomputed
            // each call so the overlay tracks transitions; it is never memoized.
            if (this.state() === state) {
                const acc = __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_compose_state_config).call(this, state, true);
                // tier 6 — user active_state overlay, on top of per-state config.
                return merge_state_config(acc, this._active_state_style);
            }
            // Non-current states: tiers 1–5 only, memoized.
            const cached = this._static_state_config_cache.get(state);
            if (cached !== undefined) {
                return cached;
            }
            const resolved = __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_compose_state_config).call(this, state, false);
            this._static_state_config_cache.set(state, resolved);
            return resolved;
        }
        /********
         *
         *  Gets the composite style for a specific node — the public viz entry point,
         *  now a thin wrapper over the unified config cascade in
         *  {@link resolve_state_config}.
         *
         *  The order of composition runs least-specific to most-specific: theme
         *  defaults, then the `default_state_config` root, then per-kind defaults
         *  (terminal, start, end), then depth-ordered group metadata (inner groups
         *  winning over outer), then the per-state config, and finally — for the
         *  current state only — the active overlay.  Last wins at every tier.
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @param state The state to compute the composite style for.
         *
         *  @returns The fully composited {@link JssmStateConfig} for the given state.
         *
         *  @see resolve_state_config
         *
         */
        style_for(state) {
            return this.resolve_state_config(state);
        }
        /********
         *
         *  Instruct the machine to complete an action.  Synonym for {@link action}.
         *
         *  ```typescript
         *  const light = sm`
         *    off 'start' -> red;
         *    red 'next' -> green 'next' -> yellow 'next' -> red;
         *    [red yellow green] 'shutdown' ~> off;
         *  `;
         *
         *  light.state();       // 'off'
         *  light.do('start');   // true
         *  light.state();       // 'red'
         *  light.do('next');    // true
         *  light.state();       // 'green'
         *  light.do('next');    // true
         *  light.state();       // 'yellow'
         *  light.do('dance');   // !! false - no such action
         *  light.state();       // 'yellow'
         *  light.do('start');   // !! false - yellow does not have the action start
         *  light.state();       // 'yellow'
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @param actionName The action to engage
         *
         *  @param newData The data change to insert during the action
         *
         *  @returns `true` if the action was valid and the transition occurred,
         *  `false` otherwise.
         *
         */
        do(actionName, newData) {
            return this.transition_impl(actionName, newData, false, true, arguments.length >= 2);
        }
        /********
         *
         *  Instruct the machine to complete a transition.  Synonym for {@link go}.
         *
         *  ```typescript
         *  const light = sm`
         *    off 'start' -> red;
         *    red 'next' -> green 'next' -> yellow 'next' -> red;
         *    [red yellow green] 'shutdown' ~> off;
         *  `;
         *
         *  light.state();       // 'off'
         *  light.go('red');     // true
         *  light.state();       // 'red'
         *  light.go('green');   // true
         *  light.state();       // 'green'
         *  light.go('blue');    // !! false - no such state
         *  light.state();       // 'green'
         *  light.go('red');     // !! false - green may not go directly to red, only to yellow
         *  light.state();       // 'green'
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @param newState The state to switch to
         *
         *  @param newData The data change to insert during the transition
         *
         *  @returns `true` if the transition was legal and occurred, `false` otherwise.
         *
         */
        transition(newState, newData) {
            return this.transition_impl(newState, newData, false, false, arguments.length >= 2);
        }
        /********
         *
         *  Instruct the machine to complete a transition.  Synonym for {@link transition}.
         *
         *  ```typescript
         *  const light = sm`red -> green -> yellow -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
         *
         *  light.state();       // 'red'
         *  light.go('green');   // true
         *  light.state();       // 'green'
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @param newState The state to switch to
         *
         *  @param newData The data change to insert during the transition
         *
         *  @returns `true` if the transition was legal and occurred, `false` otherwise.
         *
         */
        go(newState, newData) {
            return this.transition_impl(newState, newData, false, false, arguments.length >= 2);
        }
        /********
         *
         *  Instruct the machine to complete a forced transition (which will reject if
         *  called with a normal {@link transition} call.)
         *
         *  ```typescript
         *  const light = sm`red -> green -> yellow -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
         *
         *  light.state();                     // 'red'
         *  light.transition('off');           // false
         *  light.state();                     // 'red'
         *  light.force_transition('off');     // true
         *  light.state();                     // 'off'
         *  ```
         *
         *  @typeParam mDT The type of the machine data member; usually omitted
         *
         *  @param newState The state to switch to
         *
         *  @param newData The data change to insert during the transition
         *
         *  @returns `true` if a transition (forced or otherwise) existed and occurred,
         *  `false` otherwise.
         *
         */
        force_transition(newState, newData) {
            return this.transition_impl(newState, newData, true, false, arguments.length >= 2);
        }
        /**
         * Get the edge index for an action from the current state.
         *  Interned dispatch: resolves via the numeric (action, from) index —
         *  unknown action names miss without throwing.
         *  @param action - The action name.
         *  @returns The edge index, or `undefined` if the action is not available.
         */
        current_action_for(action) {
            const action_id = this._action_interner.id_of(action);
            return (action_id === undefined)
                ? undefined
                : this._edge_id_by_action_pair.get(pair_key(action_id, this._state_id));
        }
        /**
         * Get the full transition object for an action from the current state.
         *  @param action - The action name.
         *  @returns The {@link JssmTransition} object.
         *  @throws {JssmError} If the action is not available from the current state.
         */
        current_action_edge_for(action) {
            const idx = this.current_action_for(action);
            if ((idx === undefined) || (idx === null)) {
                throw new JssmError(this, `No such action ${JSON.stringify(action)}`);
            }
            return this._edges[idx];
        }
        /**
         * Check whether an action is available from the current state.
         *  @param action   - The action name to check.
         *  @param _newData - Reserved for future data validation.
         *  @returns `true` if the action can be taken.
         */
        valid_action(action, _newData) {
            // todo whargarbl implement data stuff
            // todo major incomplete whargarbl comeback
            return this.current_action_for(action) !== undefined;
        }
        /**
         * Check whether a transition to a given state is legal (non-forced) from
         *  the current state.
         *  @param newState - The target state.
         *  @param _newData - Reserved for future data validation.
         *  @returns `true` if the transition is legal.
         */
        valid_transition(newState, _newData) {
            // todo whargarbl implement data stuff
            // todo major incomplete whargarbl comeback
            const transition_for = this.lookup_transition_for(this.state(), newState);
            if (!(transition_for)) {
                return false;
            }
            if (transition_for.forced_only) {
                return false;
            }
            return true;
        }
        /**
         * Check whether a forced transition to a given state exists from the
         *  current state.
         *  @param newState - The target state.
         *  @param _newData - Reserved for future data validation.
         *  @returns `true` if a forced (or any) transition exists.
         */
        valid_force_transition(newState, _newData) {
            // todo whargarbl implement data stuff
            // todo major incomplete whargarbl comeback
            return (this.lookup_transition_for(this.state(), newState) !== undefined);
        }
        /**
         * Get the instance name of this machine, if one was assigned at creation.
         *  @returns The instance name string, or `undefined`.
         */
        instance_name() {
            return this._instance_name;
        }
        /**
         * Get the creation date of this machine as a `Date` object.
         *  @returns A `Date` representing when the machine was created.
         */
        get creation_date() {
            return new Date(Math.floor(this.creation_timestamp));
        }
        /**
         * Get the creation timestamp (milliseconds since epoch).
         *  @returns The timestamp as a number.
         */
        get creation_timestamp() {
            return this._created;
        }
        /**
         * Get the timestamp when construction began (before parsing).
         *  @returns The start-of-construction timestamp as a number.
         */
        get create_start_time() {
            return this._create_started;
        }
        /**
         * Schedule an automatic transition to `next_state` after `after_time`
         *  milliseconds.  Only one timeout may be active at a time.
         *  @param next_state - The state to transition to when the timer fires.
         *  @param after_time - Delay in milliseconds.
         *  @throws {JssmError} If a timeout is already pending.
         */
        set_state_timeout(next_state, after_time) {
            if (this._timeout_handle !== undefined) {
                throw new JssmError(this, `Asked to set a state timeout to ${next_state}:${after_time}, but already timing out to ${this._timeout_target}:${this._timeout_target_time}`);
            }
            this._timeout_handle = this._timeout_source(
            // it seems like istanbul can't see this line being followed, even though it is, actively
            // this is enforced by the "after mapping runs normally with very short time" tests in after_mapping.spec
            // we'll mark it no-check so that our coverage numbers aren't wrecked
            /* istanbul ignore next */
            /* v8 ignore next 10 */
            () => {
                const from_state = this.state();
                this.clear_state_timeout();
                if (this._has_after_hooks) {
                    const ah = this._after_hooks.get(from_state);
                    if (ah !== undefined) {
                        ah({ data: this._data, next_data: this._data });
                    }
                    // a specific after hook firing implies the any-after hook fires too,
                    // afterward; and it also fires alone (StoneCypher/fsl#1299)
                    if (this._after_any_hook !== undefined) {
                        this._after_any_hook({ data: this._data, next_data: this._data });
                    }
                }
                this._fire('timeout', { from: from_state, to: next_state, after_time });
                this.go(next_state);
            }, after_time);
            this._timeout_target = next_state;
            this._timeout_target_time = after_time;
        }
        /**
          Cancel any pending state timeout.  Safe to call when no timeout is active.
         */
        clear_state_timeout() {
            if (this._timeout_handle === undefined) {
                return; // calling with no timeout is a no-op, means it can be called glad-handedly
            }
            this._clear_timeout_source(this._timeout_handle);
            this._timeout_handle = undefined;
            this._timeout_target = undefined;
            this._timeout_target_time = undefined;
        }
        /**
         * Get the configured `after` timeout for a given state, if any.
         *  @param which_state - The state to look up.
         *  @returns A `[targetState, delayMs]` tuple, or `undefined` if no timeout
         *  is configured for that state.
         */
        state_timeout_for(which_state) {
            return this._after_mapping.get(which_state);
        }
        /**
         * Get the configured `after` timeout for the current state, if any.
         *  @returns A `[targetState, delayMs]` tuple, or `undefined`.
         */
        current_state_timeout() {
            return (this._timeout_target === undefined)
                ? undefined
                : [this._timeout_target, this._timeout_target_time];
        }
        /**
         * Convenience method to create a new machine from a tagged template literal.
         *  Equivalent to calling the top-level `sm` function.
         *  @param template_strings - The template string array.
         *  @param remainder        - Interpolated values.
         *  @returns A new {@link Machine} instance.
         */
        sm(template_strings, ...remainder /* , arguments */) {
            return sm(template_strings, ...remainder);
        }
    }
    _Machine_instances = new WeakSet(), _Machine_unsubscribe_entry = function _Machine_unsubscribe_entry(set, entry) {
        if (set.delete(entry)) {
            this._event_listener_count--;
        }
    }, _Machine_subscribe = function _Machine_subscribe(name, filterOrFn, maybeFn, once) {
        let filter;
        let handler;
        if (typeof filterOrFn === 'function') {
            filter = undefined;
            handler = filterOrFn;
        }
        else {
            filter = filterOrFn;
            handler = maybeFn;
        }
        if (typeof handler !== 'function') {
            throw new JssmError(this, `event handler for "${name}" must be a function`);
        }
        let set = this._event_handlers.get(name);
        if (set === undefined) {
            set = new Set();
            this._event_handlers.set(name, set);
        }
        const entry = { handler, filter, once };
        set.add(entry);
        this._event_listener_count++;
        return () => { __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_unsubscribe_entry).call(this, set, entry); };
    }, _Machine_validate_hook_description = function _Machine_validate_hook_description(HookDesc) {
        const required = hook_required_fields[HookDesc.kind];
        if (required === undefined) {
            throw new JssmError(this, `unknown hook kind ${JSON.stringify(HookDesc.kind)}`);
        }
        if (typeof HookDesc.handler !== 'function') {
            throw new JssmError(this, `${HookDesc.kind} hook requires a handler function`);
        }
        for (const field of hook_spatial_fields) {
            const needed = required.includes(field);
            const value = HookDesc[field];
            // a required spatial field must be a usable key: a non-empty string.
            // presence alone isn't enough — `action: false` or `from: ''` would
            // register a hook nothing can ever fire (fsl#653, fsl#659)
            if (needed && ((typeof value !== 'string') || (value === ''))) {
                throw new JssmError(this, `${HookDesc.kind} hook requires '${field}' to be a non-empty string`);
            }
            if (!needed && (value !== undefined)) {
                throw new JssmError(this, `${HookDesc.kind} hook does not take '${field}'`);
            }
        }
    }, _Machine_recompute_hook_flags = function _Machine_recompute_hook_flags() {
        const nested_has = (m) => [...m.values()].some(inner => inner.size > 0);
        // pre-hook family flags
        this._has_basic_hooks = this._hooks.size > 0;
        this._has_named_hooks = nested_has(this._named_hooks);
        this._has_entry_hooks = this._entry_hooks.size > 0;
        this._has_exit_hooks = this._exit_hooks.size > 0;
        this._has_after_hooks = [this._after_hooks.size > 0, this._after_any_hook !== undefined].includes(true);
        this._has_global_action_hooks = this._global_action_hooks.size > 0;
        this._has_transition_hooks = [
            this._standard_transition_hook !== undefined,
            this._main_transition_hook !== undefined,
            this._forced_transition_hook !== undefined,
        ].includes(true);
        this._has_hooks = [
            this._has_basic_hooks,
            this._has_named_hooks,
            this._has_entry_hooks,
            this._has_exit_hooks,
            this._has_after_hooks,
            this._has_global_action_hooks,
            this._has_transition_hooks,
            this._any_action_hook !== undefined,
            this._any_transition_hook !== undefined,
            this._pre_everything_hook !== undefined,
            this._everything_hook !== undefined,
        ].includes(true);
        // post-hook family flags (mirror of the above)
        this._has_post_basic_hooks = this._post_hooks.size > 0;
        this._has_post_named_hooks = nested_has(this._post_named_hooks);
        this._has_post_entry_hooks = this._post_entry_hooks.size > 0;
        this._has_post_exit_hooks = this._post_exit_hooks.size > 0;
        this._has_post_global_action_hooks = this._post_global_action_hooks.size > 0;
        this._has_post_transition_hooks = [
            this._post_standard_transition_hook !== undefined,
            this._post_main_transition_hook !== undefined,
            this._post_forced_transition_hook !== undefined,
        ].includes(true);
        this._has_post_hooks = [
            this._has_post_basic_hooks,
            this._has_post_named_hooks,
            this._has_post_entry_hooks,
            this._has_post_exit_hooks,
            this._has_post_global_action_hooks,
            this._has_post_transition_hooks,
            this._post_any_action_hook !== undefined,
            this._post_any_transition_hook !== undefined,
            this._pre_post_everything_hook !== undefined,
            this._post_everything_hook !== undefined,
        ].includes(true);
    }, _Machine_resolved_themes = function _Machine_resolved_themes() {
        const themes = [];
        for (const th of this._themes) {
            const theme_impl = theme_mapping.get(th);
            if (theme_impl !== undefined) {
                themes.push(theme_impl);
            }
        }
        return themes.reverse();
    }, _Machine_individual_state_config = function _Machine_individual_state_config(state) {
        const decl = this._state_declarations.get(state);
        return {
            color: decl === null || decl === void 0 ? void 0 : decl.color,
            textColor: decl === null || decl === void 0 ? void 0 : decl.textColor,
            borderColor: decl === null || decl === void 0 ? void 0 : decl.borderColor,
            backgroundColor: decl === null || decl === void 0 ? void 0 : decl.backgroundColor,
            lineStyle: decl === null || decl === void 0 ? void 0 : decl.lineStyle,
            corners: decl === null || decl === void 0 ? void 0 : decl.corners,
            shape: decl === null || decl === void 0 ? void 0 : decl.shape,
            image: decl === null || decl === void 0 ? void 0 : decl.image,
            url: decl === null || decl === void 0 ? void 0 : decl.url
        };
    }, _Machine_groups_by_depth = function _Machine_groups_by_depth(state) {
        const containing = [...this.groupsOf(state)];
        if (containing.length < 2) {
            return containing;
        }
        return containing.sort((ga, gb) => {
            const da = membership_distance(this._group_registry, state, ga), db = membership_distance(this._group_registry, state, gb);
            // Larger distance (more "outer") sorts earlier so it is applied first and
            // overridden by nearer groups.
            if (da !== db) {
                return db - da;
            }
            // Equal depth: earlier-declared group sorts earlier (applied first), so
            // the later-declared group of the same depth wins the tie.
            return this._group_order.indexOf(ga) - this._group_order.indexOf(gb);
        });
    }, _Machine_compose_state_config = function _Machine_compose_state_config(state, active) {
        const themes = __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_resolved_themes).call(this);
        let acc = {};
        // tier 1 — theme defaults (base, then selected themes)
        acc = merge_state_config(acc, base_theme.state);
        for (const theme of themes) {
            if (theme.state) {
                acc = merge_state_config(acc, theme.state);
            }
        }
        // tier 2 — default_state_config (implicit root over all states)
        acc = merge_state_config(acc, this._state_style);
        // tier 2.5 — hooked-state styling, applied when the state carries any
        // observational or boundary hook.  Sits above the root default and below
        // the per-kind/group/per-state tiers, preserving the historical layer
        // order the pre-cascade `style_for` used.  See {@link state_has_hooks}.
        if (this.state_has_hooks(state)) {
            acc = merge_state_config(acc, base_theme.hooked);
            for (const theme of themes) {
                if (theme.hooked) {
                    acc = merge_state_config(acc, theme.hooked);
                }
            }
            acc = merge_state_config(acc, this._hooked_state_style);
        }
        // tier 3 — static per-kind defaults, selected by structural kind
        if (this.state_is_terminal(state)) {
            acc = merge_state_config(acc, base_theme.terminal);
            for (const theme of themes) {
                if (theme.terminal) {
                    acc = merge_state_config(acc, theme.terminal);
                }
            }
            acc = merge_state_config(acc, this._terminal_state_style);
        }
        if (this.is_start_state(state)) {
            acc = merge_state_config(acc, base_theme.start);
            for (const theme of themes) {
                if (theme.start) {
                    acc = merge_state_config(acc, theme.start);
                }
            }
            acc = merge_state_config(acc, this._start_state_style);
        }
        if (this.is_end_state(state)) {
            acc = merge_state_config(acc, base_theme.end);
            for (const theme of themes) {
                if (theme.end) {
                    acc = merge_state_config(acc, theme.end);
                }
            }
            acc = merge_state_config(acc, this._end_state_style);
        }
        // tier 3 (active kind) — active-state THEME layers, below per-state so a
        // per-state block still wins (preserving the historical layer order).
        if (active) {
            acc = merge_state_config(acc, base_theme.active);
            for (const theme of themes) {
                if (theme.active) {
                    acc = merge_state_config(acc, theme.active);
                }
            }
        }
        // tier 4 — group metadata, outer→inner (inner / nearest group wins)
        for (const group_name of __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_groups_by_depth).call(this, state)) {
            const group_cfg = this._group_metadata.get(group_name);
            if (group_cfg !== undefined) {
                acc = merge_state_config(acc, group_cfg);
            }
        }
        // tier 5 — per-state `state foo : { … }`
        acc = merge_state_config(acc, __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_individual_state_config).call(this, state));
        return acc;
    };
    /*********
     *
     *  Create a state machine from a template string.  This is one of the two main
     *  paths for working with JSSM, alongside {@link from}.
     *
     *  Use this method when you want to work directly and conveniently with a
     *  constant template expression.  Use `.from` when you want to pull from
     *  dynamic strings.
     *
     *
     *  ```typescript
     *  import * as jssm from 'jssm';
     *
     *  const lswitch = jssm.from('on <=> off;');
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param template_strings The assembled code
     *
     *  @param remainder The mechanic for template argument insertion
     *
     */
    function sm(template_strings, ...remainder /* , arguments */) {
        // foo`a${1}b${2}c` will come in as (['a','b','c'],1,2)
        // this includes when a and c are empty strings
        // therefore template_strings will always have one more el than template_args
        // therefore map the smaller container and toss the last one on on the way out
        return new Machine(make(template_strings.reduce(
        // in general avoiding `arguments` is smart.  however with the template
        // string notation, as designed, it's not really worth the hassle
        (acc, val, idx) => `${acc}${remainder[idx - 1]}${val}` // arguments[0] is never loaded, so args doesn't need to be gated
        )));
    }
    /*********
     *
     *  Create a state machine from an implementation string.  This is one of the
     *  two main paths for working with JSSM, alongside {@link sm}.
     *
     *  Use this method when you want to conveniently pull a state machine from a
     *  string dynamically.  Use operator `sm` when you just want to work with a
     *  template expression.
     *
     *  ```typescript
     *  import * as jssm from 'jssm';
     *
     *  const lswitch = jssm.from('on <=> off;');
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param MachineAsString The FSL code to evaluate
     *
     *  @param ExtraConstructorFields Extra non-code configuration to pass at creation time
     *
     */
    function from(MachineAsString, ExtraConstructorFields) {
        const to_decorate = make(MachineAsString);
        if (ExtraConstructorFields !== undefined) {
            for (const [key, value] of Object.entries(ExtraConstructorFields)) {
                if (key === 'allows_override') {
                    to_decorate['config_allows_override'] = ExtraConstructorFields.allows_override;
                }
                else {
                    to_decorate[key] = value;
                }
            }
        }
        return new Machine(to_decorate);
    }
    /**
     *
     *  Type guard that narrows an unknown value to a {@link HookComplexResult}.
     *
     *  A hook complex result is an object with at minimum a boolean `pass` field,
     *  and may optionally also carry replacement `data` / `next_data` fields that
     *  the machine should adopt if the hook passes.  This helper is used by the
     *  hook-dispatch machinery to tell "hook returned a complex object" from
     *  "hook returned a bare boolean / null / undefined".
     *
     *  ```typescript
     *  is_hook_complex_result({ pass: true });                 // true
     *  is_hook_complex_result({ pass: false, data: { x: 1 }}); // true
     *  is_hook_complex_result(true);                           // false
     *  is_hook_complex_result(null);                           // false
     *  is_hook_complex_result({ other: 'thing' });             // false
     *  ```
     *  @template mDT The type of the machine data member; usually omitted.
     *  @param hr The value to test.
     *  @returns `true` if `hr` is a non-null object with a boolean `pass` field;
     *  `false` otherwise.  When `true`, TypeScript narrows `hr` to
     *  `HookComplexResult<mDT>`.
     */
    function is_hook_complex_result(hr) {
        return hr !== null && typeof hr === 'object' && typeof hr.pass === 'boolean';
    }
    /**
     *
     *  Apply any data-field updates from a hook's complex result into `hook_args`,
     *  and return whether data actually changed.
     *
     *  This is the hoisted, allocation-free replacement for the `update_fields`
     *  inner function that used to be re-created on every hooked transition inside
     *  {@link Machine.transition_impl}.  By moving it to module scope the function
     *  object is allocated once at module load time.
     *
     *  When the result does not carry a `data` property (the common case —
     *  most hooks return `true` or `undefined`) the function returns `false`
     *  immediately without touching `hook_args`.
     *
     *  ```typescript
     *  const args = { data: 'old', next_data: undefined, ... };
     *  const changed = _update_hook_fields(args, { pass: true, data: 'new', next_data: undefined });
     *  // changed === true, args.data === 'new'
     *  ```
     *  @param hook_args  The shared hook-argument object for the current
     *    transition.  Mutated in-place when the result carries `data`.
     *  @param res        The normalised complex result returned by
     *    {@link abstract_hook_step} or {@link abstract_everything_hook_step}.
     *  @returns `true` if `res` contained a `data` property (i.e. the hook
     *    mutated the machine's data); `false` otherwise.
     *  @see Machine.transition_impl
     *  @see abstract_hook_step
     */
    function _update_hook_fields(hook_args, res) {
        // HOOK_PASSED is the shared frozen outcome for "no hook installed" and for
        // hooks returning true/undefined — the overwhelming majority of the up-to-
        // ~10 steps per hooked transition.  It can never carry `data`/`state` (frozen,
        // built without them), so one pointer compare replaces the hasOwnProperty
        // reflection call for the common case.
        if (res === HOOK_PASSED) {
            return false;
        }
        // a complex result's `state` redirects the transition's destination; carry it
        // on hook_args.to (the destination field), which transition_impl applies at
        // commit (last writer wins).  An explicit `state: undefined` is not a
        // redirect.  StoneCypher/fsl#1947
        if (Object.prototype.hasOwnProperty.call(res, 'state') && res.state !== undefined) {
            hook_args.to = res.state;
        }
        // Two channels (StoneCypher/fsl#1948): `data` overrides the value observed by
        // later hooks in this chain AND is the default committed value; `next_data`
        // overrides only the committed value.  So `data` sets both, then an explicit
        // `next_data` overrides the commit channel.  transition_impl commits
        // hook_args.next_data.  hasOwnProperty (not truthiness) so a falsy override
        // (false/null/0/''/undefined) still commits (fsl#1264/#935).
        let changed = false;
        if (Object.prototype.hasOwnProperty.call(res, 'data')) {
            hook_args.data = res.data;
            hook_args.next_data = res.data;
            changed = true;
        }
        if (Object.prototype.hasOwnProperty.call(res, 'next_data')) {
            hook_args.next_data = res.next_data;
            changed = true;
        }
        return changed;
    }
    /**
     *
     *  Normalize any legal hook return value to a single "did it reject?" boolean.
     *
     *  Hooks in jssm may return any of the following to indicate success:
     *  `true`, `undefined`, or a complex result whose `pass` field is `true`.
     *  They may return any of the following to indicate rejection:
     *  `false`, or a complex result whose `pass` field is `false`.  This helper
     *  collapses all of those shapes into one boolean so callers don't have to
     *  re-implement the matrix.
     *
     *  ```typescript
     *  is_hook_rejection(true);            // false (pass)
     *  is_hook_rejection(undefined);       // false (pass)
     *  is_hook_rejection(false);           // true  (reject)
     *  is_hook_rejection({ pass: true });  // false (pass)
     *  is_hook_rejection({ pass: false }); // true  (reject)
     *  ```
     *  @template mDT The type of the machine data member; usually omitted.
     *  @param hr A hook result of any legal shape.
     *  @returns `true` if the hook rejected the transition; `false` if it passed.
     *  @throws {TypeError} If `hr` is not a recognized hook result shape (for
     *  example, a number or a plain object without a `pass` field).
     */
    function is_hook_rejection(hr) {
        if (hr === true) {
            return false;
        }
        if (hr === undefined) {
            return false;
        }
        if (hr === false) {
            return true;
        }
        if (is_hook_complex_result(hr)) {
            return (!(hr.pass));
        }
        throw new TypeError('unknown hook rejection type result');
    }
    /**
     *
     *  Shared, frozen outcomes for the simple hook results.  The transition
     *  cascade runs up to ~10 hook steps per transition, and the overwhelmingly
     *  common results — no hook installed, or a hook returning `undefined` /
     *  `true` / `false` — previously allocated a fresh one-field object each
     *  time, just to have `.pass` read once and be discarded.  Callers only read
     *  `pass` and probe for an own `data` property ({@link _update_hook_fields}),
     *  so a shared instance is observationally identical; freezing turns that
     *  read-only contract from incidental into enforced.  Complex results (hooks
     *  returning `{ pass, data, ... }`) still pass through untouched.  #705
     *  _update_hook_fields additionally identity-checks HOOK_PASSED to skip its
     *  own-property probe on the common no-op outcome.
     *  @see abstract_hook_step
     *  @see abstract_everything_hook_step
     *  @internal
     */
    const HOOK_PASSED = Object.freeze({ pass: true });
    const HOOK_REJECTED = Object.freeze({ pass: false });
    /**
     *
     *  Invoke an optional transition/action hook and normalize its return value
     *  into a {@link HookComplexResult}.
     *
     *  This is the central adapter the transition pipeline uses to run every
     *  non-"everything" hook kind (basic, named, entry, exit, after, action, etc).
     *  It accepts `undefined` for the hook slot because most hooks are not set on
     *  most machines; when no hook is installed the step is a no-op pass.
     *
     *  The valid return shapes from a hook and their normalized meanings are:
     *  - `undefined` → `{ pass: true }`
     *  - `true`      → `{ pass: true }`
     *  - `false`     → `{ pass: false }`
     *  - `null`      → `{ pass: false }`
     *  - a complex result object → returned as-is
     *
     *  Anything else is a programmer error and throws.
     *  @template mDT The type of the machine data member; usually omitted.
     *  @param maybe_hook The hook handler to call, or `undefined` for the
     *  "no hook installed" case.
     *  @param hook_args The context object passed to the hook.  Includes the
     *  current and proposed state, current and proposed data, action name, and
     *  transition kind.
     *  @returns A {@link HookComplexResult} describing whether the hook passed
     *  and, optionally, any data replacements it requested.
     *  @throws {TypeError} If the hook returns a value that is not one of the
     *  legal shapes listed above.
     *  @internal
     */
    function abstract_hook_step(maybe_hook, hook_args) {
        if (maybe_hook === undefined) {
            return HOOK_PASSED;
        }
        const result = maybe_hook(hook_args);
        if (result === undefined) {
            return HOOK_PASSED;
        }
        if (result === true) {
            return HOOK_PASSED;
        }
        if (result === false) {
            return HOOK_REJECTED;
        }
        if (result === null) {
            return HOOK_REJECTED;
        }
        if (is_hook_complex_result(result)) {
            return result;
        }
        throw new TypeError(`Unknown hook result type ${String(result)}`);
    }
    /**
     *
     *  Invoke an optional "everything" hook and normalize its return value into
     *  a {@link HookComplexResult}.
     *
     *  Mechanically identical to {@link abstract_hook_step}, but typed for the
     *  everything-hook family (`pre_everything_hook` and `everything_hook`),
     *  whose context object carries an extra `hook_name` field identifying which
     *  bracket of the pipeline is firing.  Separated from `abstract_hook_step`
     *  so TypeScript can enforce that the hook handler and the context object
     *  agree on shape.
     *
     *  The valid return shapes and their meanings are the same as for
     *  `abstract_hook_step`:
     *  - `undefined` or `true` → `{ pass: true }`
     *  - `false` or `null`     → `{ pass: false }`
     *  - a complex result      → returned as-is
     *  @template mDT The type of the machine data member; usually omitted.
     *  @param maybe_hook The everything-hook handler, or `undefined` when none
     *  is installed.
     *  @param hook_args The everything-hook context object.  Differs from a
     *  normal hook context in that it also includes `hook_name`.
     *  @returns A {@link HookComplexResult} describing whether the hook passed
     *  and any data replacements it requested.
     *  @throws {TypeError} If the hook returns a value outside the legal shapes.
     *  @internal
     */
    function abstract_everything_hook_step(maybe_hook, hook_args) {
        if (maybe_hook === undefined) {
            return HOOK_PASSED;
        }
        const result = maybe_hook(hook_args);
        if (result === undefined) {
            return HOOK_PASSED;
        }
        if (result === true) {
            return HOOK_PASSED;
        }
        if (result === false) {
            return HOOK_REJECTED;
        }
        if (result === null) {
            return HOOK_REJECTED;
        }
        if (is_hook_complex_result(result)) {
            return result;
        }
        throw new TypeError(`Unknown hook result type ${String(result)}`);
    }
    /**
     * Compares two semantic version strings, including prerelease versions.
     *
     * The numeric (`major.minor.patch`) parts compare numerically, with missing
     * segments treated as zero.  Prerelease parts (everything after the first
     * `-`) follow semver precedence: a version *with* a prerelease precedes the
     * same version *without* one; prerelease identifiers compare dot-by-dot,
     * numeric identifiers numerically and below alphanumeric ones, alphanumeric
     * identifiers in ASCII order, and a shorter identifier set precedes a longer
     * one that it prefixes.
     * @param {string} v1 - First version string (e.g., "5.104.2" or "6.0.0-alpha.1")
     * @param {string} v2 - Second version string (e.g., "5.103.1")
     * @returns {number} - Negative if v1 < v2, 0 if equal, positive if v1 > v2
     * @example
     * import { compareVersions } from 'jssm';
     * compareVersions("5.104.2", "5.103.1");  // => 1
     * @example
     * import { compareVersions } from 'jssm';
     * compareVersions("5.104.2", "6.0.0");  // => -1
     * @example
     * import { compareVersions } from 'jssm';
     * compareVersions("5.104.2", "5.104.2");  // => 0
     * @example
     * import { compareVersions } from 'jssm';
     * compareVersions("6.0.0-alpha.1", "6.0.0");  // => -1
     * @example
     * import { compareVersions } from 'jssm';
     * compareVersions("6.0.0-alpha.1", "6.0.0-alpha.2");  // => -1
     * @example
     * import { compareVersions } from 'jssm';
     * compareVersions("6.0.0-beta.1", "6.0.0-alpha.1");  // => 1
     */
    function compareVersions(v1, v2) {
        var _a, _b;
        const hyphen1 = v1.indexOf('-'), hyphen2 = v2.indexOf('-');
        const main1 = (hyphen1 === -1) ? v1 : v1.slice(0, hyphen1), main2 = (hyphen2 === -1) ? v2 : v2.slice(0, hyphen2), pre1 = (hyphen1 === -1) ? undefined : v1.slice(hyphen1 + 1), pre2 = (hyphen2 === -1) ? undefined : v2.slice(hyphen2 + 1);
        const parts1 = main1.split('.').map(Number);
        const parts2 = main2.split('.').map(Number);
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const num1 = (_a = parts1[i]) !== null && _a !== void 0 ? _a : 0;
            const num2 = (_b = parts2[i]) !== null && _b !== void 0 ? _b : 0;
            if (num1 !== num2) {
                return num1 - num2;
            }
        }
        // numeric parts equal; a version with a prerelease precedes one without
        if (pre1 === undefined && pre2 === undefined) {
            return 0;
        }
        if (pre1 === undefined) {
            return 1;
        }
        if (pre2 === undefined) {
            return -1;
        }
        // both have prereleases: compare dot-separated identifiers per semver
        const ids1 = pre1.split('.'), ids2 = pre2.split('.');
        for (let i = 0; i < Math.max(ids1.length, ids2.length); i++) {
            const id1 = ids1[i];
            if (id1 === undefined) {
                return -1;
            } // shorter identifier set precedes
            const id2 = ids2[i];
            if (id2 === undefined) {
                return 1;
            }
            const n1 = /^\d+$/.test(id1) ? Number(id1) : undefined, n2 = /^\d+$/.test(id2) ? Number(id2) : undefined;
            if (n1 !== undefined && n2 !== undefined) {
                if (n1 !== n2) {
                    return n1 - n2;
                }
            }
            else if (n1 !== undefined) {
                return -1;
            } // numeric below alphanumeric
            else if (n2 !== undefined) {
                return 1;
            }
            else if (id1 !== id2) {
                return (id1 < id2) ? -1 : 1;
            }
        }
        return 0;
    }
    /**
     * Deserializes a previously serialized machine state.
     *
     * This function recreates a machine from a serialization object, restoring its
     * state, data, and history. For security and compatibility reasons, it will
     * refuse to deserialize data from future versions of the library.
     * @template mDT - The type of the machine data member
     * @param {string} machine_string - The FSL string defining the machine structure
     * @param {JssmSerialization<mDT>} ser - The serialization object to restore from
     * @returns {Machine<mDT>} - The restored machine instance
     * @throws {Error} If the serialization is from a future version
     * @example
     * import { from, deserialize } from 'jssm';
     * const machine    = from("a -> b;");
     * const serialized = machine.serialize();
     * const restored   = deserialize("a -> b;", serialized);
     * restored.state();  // => 'a'
     */
    function deserialize(machine_string, ser) {
        var _a;
        // Refuse to deserialize data from future versions
        if (compareVersions(ser.jssm_version, version) > 0) {
            throw new Error(`Cannot deserialize from future version ${ser.jssm_version} ` +
                `(current version is ${version}). Please upgrade jssm to deserialize this data.`);
        }
        const machine = from(machine_string, { data: ser.data, history: ser.history_capacity });
        machine._state = ser.state;
        machine._state_id = (_a = machine._state_interner.id_of(ser.state)) !== null && _a !== void 0 ? _a : NaN;
        // `from()` armed the *initial* state's `after` timer; the restored state may
        // differ, so that timer is both a ghost (it targets the wrong state) and a
        // gap (the restored state's own `after` was never armed).  Clear it and arm
        // the restored state's timer instead.  clear must precede arm because
        // set_state_timeout throws if a timer is already pending.  StoneCypher/fsl#1946
        machine.clear_state_timeout();
        machine.auto_set_state_timeout();
        for (const history_item of ser.history)
            machine._history.push(history_item);
        return machine;
    }

    exports.FslDirections = FslDirections;
    exports.JssmError = JssmError;
    exports.Machine = Machine;
    exports.ReplayError = ReplayError;
    exports.STOCHASTIC_DEFAULT_MAX_STEPS = STOCHASTIC_DEFAULT_MAX_STEPS;
    exports.STOCHASTIC_DEFAULT_RUNS = STOCHASTIC_DEFAULT_RUNS;
    exports.SUPPORTED_TAPE_VERSION = SUPPORTED_TAPE_VERSION;
    exports.abstract_everything_hook_step = abstract_everything_hook_step;
    exports.abstract_hook_step = abstract_hook_step;
    exports.action_label_chars = action_label_chars;
    exports.arrow_direction = arrow_direction;
    exports.arrow_left_kind = arrow_left_kind;
    exports.arrow_right_kind = arrow_right_kind;
    exports.build_time = build_time;
    exports.compareVersions = compareVersions;
    exports.compile = compile;
    exports.constants = constants;
    exports.deserialize = deserialize;
    exports.find_repeated = find_repeated;
    exports.from = from;
    exports.fslCompletions = fslCompletions;
    exports.fslDiagnostics = fslDiagnostics;
    exports.fslSemanticSpans = fslSemanticSpans;
    exports.fsl_fence_lang = fsl_fence_lang;
    exports.gen_splitmix32 = gen_splitmix32;
    exports.gviz_shapes = gviz_shapes;
    exports.histograph = histograph;
    exports.is_hook_complex_result = is_hook_complex_result;
    exports.is_hook_rejection = is_hook_rejection;
    exports.make = make;
    exports.membership_distance = membership_distance;
    exports.name_bind_prop_and_state = name_bind_prop_and_state;
    exports.named_colors = named_colors;
    exports.parse = wrap_parse;
    exports.parse_fence_info = parse_fence_info;
    exports.parse_tape = parse_tape;
    exports.replay = replay;
    exports.seq = seq;
    exports.serialize_tape = serialize_tape;
    exports.shapes = shapes;
    exports.sleep = sleep;
    exports.sm = sm;
    exports.state_name_chars = state_name_chars;
    exports.state_name_first_chars = state_name_first_chars;
    exports.state_style_condense = state_style_condense;
    exports.transfer_state_properties = transfer_state_properties;
    exports.unique = unique;
    exports.version = version;
    exports.weighted_histo_key = weighted_histo_key;
    exports.weighted_rand_select = weighted_rand_select;
    exports.weighted_sample_select = weighted_sample_select;

    return exports;

})({});

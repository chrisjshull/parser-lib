//This file will likely change a lot! Very experimental!
/*global Properties, Validation, ValidationError, PropertyValueIterator, console*/
var ValidationTypes = {

    isLiteral: function (part, literals) {
        var text = part.text.toString().toLowerCase(),
            args = literals.split(" | "),
            i, len, found = false;
        
        for (i=0,len=args.length; i < len && !found; i++){
            if (text == args[i]){
                found = true;
            }
        }
        
        return found;    
    },
    
    isSimple: function(type) {
        return !!this.simple[type];
    },
    
    isComplex: function(type) {
        return !!this.complex[type];
    },
    
    /**
     * Determines if the next part(s) of the given expression
     * are any of the given types.
     */
    isAny: function (expression, types) {
        var args = types.split(" | "),
            i, len, found = false;
        
        for (i=0,len=args.length; i < len && !found && expression.hasNext(); i++){
            found = this.isType(expression, args[i]);
        }
        
        return found;    
    },
    
    /**
     * Determines if the next part(s) of the given expresion
     * are one of a group.
     */
    isAnyOfGroup: function(expression, types) {
        var args = types.split(" || "),
            i, len, found = false;
        
        for (i=0,len=args.length; i < len && !found; i++){
            found = this.isType(expression, args[i]);
        }
        
        return found ? args[i-1] : false;
    },
    
    /**
     * Determines if the next part(s) of the given expression
     * are of a given type.
     */
    isType: function (expression, type) {
        var part = expression.peek(),
            result = false;
            
        if (type.charAt(0) != "<") {
            result = this.isLiteral(part, type);
            if (result) {
                expression.next();
            }
        } else if (this.simple[type]) {
            result = this.simple[type](part);
            if (result) {
                expression.next();
            }
        } else {
            result = this.complex[type](expression);
        }
        
        return result;
    },
    
    
    
    simple: {

        "<absolute-size>": function(part){
            return ValidationTypes.isLiteral(part, "xx-small | x-small | small | medium | large | x-large | xx-large");
        },
        
        "<attachment>": function(part){
            return ValidationTypes.isLiteral(part, "scroll | fixed | local");
        },
        
        "<attr>": function(part){
            return part.type == "function" && part.name == "attr";
        },
                
        "<bg-image>": function(part){
            return this["<image>"](part) || part == "none";
        },        
        
        "<box>": function(part){
            return ValidationTypes.isLiteral(part, "padding-box | border-box | content-box");
        },
        
        "<content>": function(part){
            return part.type == "function" && part.name == "content";
        },        
        
        "<relative-size>": function(part){
            return ValidationTypes.isLiteral(part, "smaller | larger");
        },
        
        //any identifier
        "<ident>": function(part){
            return part.type == "identifier";
        },
        
        "<length>": function(part){
            return part.type == "length" || part.type == "number" || part.type == "integer" || part == "0";
        },
        
        "<color>": function(part){
            return part.type == "color" || part == "transparent";
        },
        
        "<number>": function(part){
            return part.type == "number" || this["<integer>"](part);
        },
        
        "<integer>": function(part){
            return part.type == "integer";
        },
        
        "<line>": function(part){
            return part.type == "integer";
        },
        
        "<angle>": function(part){
            return part.type == "angle";
        },        
        
        "<uri>": function(part){
            return part.type == "uri";
        },
        
        "<image>": function(part){
            return this["<uri>"](part);
        },
        
        "<percentage>": function(part){
            return part.type == "percentage" || part == "0";
        },

        "<border-width>": function(part){
            return this["<length>"](part) || ValidationTypes.isLiteral(part, "thin | medium | thick");
        },
        
        "<border-style>": function(part){
            return ValidationTypes.isLiteral(part, "none | hidden | dotted | dashed | solid | double | groove | ridge | inset | outset");
        },
        
        "<margin-width>": function(part){
            return this["<length>"](part) || this["<percentage>"](part) || ValidationTypes.isLiteral(part, "auto");
        },
        
        "<padding-width>": function(part){
            return this["<length>"](part) || this["<percentage>"](part);
        },
        
        "<shape>": function(part){
            return part.type == "function" && (part.name == "rect" || part.name == "inset-rect");
        }
    },
    
    complex: {

        "<bg-position>": function(expression){
            var types   = this,
                result  = false,
                numeric = "<percentage> | <length>",
                xDir    = "left | center | right",
                yDir    = "top | center | bottom",
                part,
                i, len;
            
                
            if (ValidationTypes.isAny(expression, "top | bottom")) {
                result = true;
            } else {
                
                //must be two-part
                if (ValidationTypes.isAny(expression, numeric)){
                    if (expression.hasNext()){
                        result = ValidationTypes.isAny(expression, numeric + " | " + yDir);
                    }
                } else if (ValidationTypes.isAny(expression, xDir)){
                    if (expression.hasNext()){
                        
                        //two- or three-part
                        if (ValidationTypes.isAny(expression, yDir)){
                            result = true;
                      
                            ValidationTypes.isAny(expression, numeric);
                            
                        } else if (ValidationTypes.isAny(expression, numeric)){
                        
                            //could also be two-part, so check the next part
                            if (ValidationTypes.isAny(expression, yDir)){                                    
                                ValidationTypes.isAny(expression, numeric);                               
                            }
                            
                            result = true;
                        }
                    }
                }                                 
            }            

            
            return result;
        },

        "<bg-size>": function(expression){
            //<bg-size> = [ <length> | <percentage> | auto ]{1,2} | cover | contain
            var types   = this,
                result  = false,
                numeric = "<percentage> | <length> | auto",
                part,
                i, len;      
      
            if (ValidationTypes.isAny(expression, "cover | contain")) {
                result = true;
            } else if (ValidationTypes.isAny(expression, numeric)) {
                result = true;                
                ValidationTypes.isAny(expression, numeric);
            }
            
            return result;
        },
        
        "<repeat-style>": function(expression){
            //repeat-x | repeat-y | [repeat | space | round | no-repeat]{1,2}
            var result  = false,
                values  = "repeat | space | round | no-repeat",
                part;
            
            if (expression.hasNext()){
                part = expression.next();
                
                if (ValidationTypes.isLiteral(part, "repeat-x | repeat-y")) {
                    result = true;                    
                } else if (ValidationTypes.isLiteral(part, values)) {
                    result = true;

                    if (expression.hasNext() && ValidationTypes.isLiteral(expression.peek(), values)) {
                        expression.next();
                    }
                }
            }
            
            return result;
            
        },
        
        "<shadow>": function(expression) {
            //inset? && [ <length>{2,4} && <color>? ]
            var result  = false,
                count   = 0,
                inset   = false,
                color   = false,
                part;
                
            if (expression.hasNext()) {            
                
                if (ValidationTypes.isAny(expression, "inset")){
                    inset = true;
                }
                
                if (ValidationTypes.isAny(expression, "<color>")) {
                    color = true;
                }                
                
                while (ValidationTypes.isAny(expression, "<length>") && count < 4) {
                    count++;
                }
                
                
                if (expression.hasNext()) {
                    if (!color) {
                        ValidationTypes.isAny(expression, "<color>");
                    }
                    
                    if (!inset) {
                        ValidationTypes.isAny(expression, "inset");
                    }

                }
                
                result = (count >= 2 && count <= 4);
            
            }
            
            return result;
        },
        
        "<x-one-radius>": function(expression) {
            //[ <length> | <percentage> ] [ <length> | <percentage> ]?
            var result  = false,
                count   = 0,
                numeric = "<length> | <percentage>",
                part;
                
            if (ValidationTypes.isAny(expression, numeric)){
                result = true;
                
                ValidationTypes.isAny(expression, numeric);
            }                
            
            return result;
        }
    }
};
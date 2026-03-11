;; Definitions
(function_definition declarator: (function_declarator declarator: (identifier) @definition.function)) @function.body
(function_definition declarator: (function_declarator declarator: (qualified_identifier name: (identifier) @definition.method))) @method.body
(class_specifier name: (type_identifier) @definition.class) @class.body
(struct_specifier name: (type_identifier) @definition.class) @struct.body

;; Call references
(call_expression function: (identifier) @reference.call)
(call_expression function: (qualified_identifier name: (identifier) @reference.call))

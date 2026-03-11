;; Definitions
(function_definition declarator: (function_declarator declarator: (identifier) @definition.function)) @function.body
(struct_specifier name: (type_identifier) @definition.class) @struct.body
(enum_specifier name: (type_identifier) @definition.enum) @enum.body

;; Call references
(call_expression function: (identifier) @reference.call)

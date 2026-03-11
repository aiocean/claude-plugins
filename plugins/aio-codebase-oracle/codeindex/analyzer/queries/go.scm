;; Definitions
(function_declaration name: (identifier) @definition.function) @function.body
(method_declaration name: (field_identifier) @definition.method) @method.body
(type_declaration (type_spec name: (type_identifier) @definition.class)) @type.body

;; Call references
(call_expression function: (identifier) @reference.call)
(call_expression function: (selector_expression field: (field_identifier) @reference.call))

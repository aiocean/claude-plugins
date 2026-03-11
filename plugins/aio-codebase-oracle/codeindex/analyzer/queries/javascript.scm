;; Definitions
(class_declaration name: (identifier) @definition.class) @class.body
(function_declaration name: (identifier) @definition.function) @function.body
(method_definition name: (property_identifier) @definition.method) @method.body

;; Call references
(call_expression function: (identifier) @reference.call)
(call_expression function: (member_expression property: (property_identifier) @reference.call))
(new_expression constructor: (identifier) @reference.call)

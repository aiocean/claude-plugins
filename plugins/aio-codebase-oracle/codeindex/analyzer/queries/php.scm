;; Definitions
(class_declaration name: (name) @definition.class) @class.body
(interface_declaration name: (name) @definition.interface) @interface.body
(function_definition name: (name) @definition.function) @function.body
(method_declaration name: (name) @definition.method) @method.body

;; Call references
(function_call_expression function: (name) @reference.call)
(member_call_expression name: (name) @reference.call)

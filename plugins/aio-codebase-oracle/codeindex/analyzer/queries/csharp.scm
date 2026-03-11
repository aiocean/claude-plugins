;; Definitions
(class_declaration name: (identifier) @definition.class) @class.body
(interface_declaration name: (identifier) @definition.interface) @interface.body
(struct_declaration name: (identifier) @definition.class) @class.body
(enum_declaration name: (identifier) @definition.enum) @enum.body
(record_declaration name: (identifier) @definition.class) @class.body
(method_declaration name: (identifier) @definition.method) @method.body

;; Call references
(invocation_expression function: (identifier) @reference.call)
(object_creation_expression type: (identifier) @reference.call)

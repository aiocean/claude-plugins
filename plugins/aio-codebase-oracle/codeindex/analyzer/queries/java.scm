;; Definitions
(class_declaration name: (identifier) @definition.class) @class.body
(interface_declaration name: (identifier) @definition.interface) @interface.body
(enum_declaration name: (identifier) @definition.enum) @enum.body
(record_declaration name: (identifier) @definition.class) @class.body
(method_declaration name: (identifier) @definition.method) @method.body

;; Call references
(method_invocation name: (identifier) @reference.call)
(object_creation_expression type: (type_identifier) @reference.call)

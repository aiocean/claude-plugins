;; Definitions
(class_declaration name: (type_identifier) @definition.class) @class.body
(abstract_class_declaration name: (type_identifier) @definition.class) @class.body
(function_declaration name: (identifier) @definition.function) @function.body
(interface_declaration name: (type_identifier) @definition.interface) @interface.body
(method_definition name: (property_identifier) @definition.method) @method.body
(enum_declaration name: (identifier) @definition.enum) @enum.body
(type_alias_declaration name: (type_identifier) @definition.type_alias) @type.body

;; Call references
(call_expression function: (identifier) @reference.call)
(call_expression function: (member_expression property: (property_identifier) @reference.call))
(new_expression constructor: (identifier) @reference.call)

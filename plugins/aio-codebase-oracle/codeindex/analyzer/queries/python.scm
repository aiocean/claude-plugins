;; Definitions
(class_definition name: (identifier) @definition.class) @class.body
(function_definition name: (identifier) @definition.function) @function.body

;; Call references
(call function: (identifier) @reference.call)
(call function: (attribute attribute: (identifier) @reference.call))

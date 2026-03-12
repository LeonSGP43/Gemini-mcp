/**
 * Lightweight JSON schema validator for MCP tool inputs.
 * Supports the subset used by this server's public tool definitions.
 */
function schemaImpliesObject(schema) {
    return schema.type === 'object'
        || !!schema.properties
        || !!schema.required
        || schema.additionalProperties === false
        || !!schema.oneOf;
}
function validateEnum(value, schema, path) {
    if (!schema.enum) {
        return;
    }
    if (!schema.enum.includes(value)) {
        throw new Error(`${path} must be one of: ${schema.enum.join(', ')}`);
    }
}
export function validateValueAgainstSchema(value, schema, path = 'arguments') {
    if (schema.oneOf && schema.oneOf.length > 0) {
        const matchedVariants = [];
        let firstError = null;
        schema.oneOf.forEach((variant, index) => {
            try {
                validateValueAgainstSchema(value, variant, path);
                matchedVariants.push(index);
            }
            catch (error) {
                if (!firstError) {
                    firstError = error;
                }
            }
        });
        if (matchedVariants.length !== 1) {
            throw new Error(`${path} must match exactly one allowed input shape`);
        }
    }
    if (schema.type === 'string') {
        if (typeof value !== 'string') {
            throw new Error(`${path} must be a string`);
        }
        validateEnum(value, schema, path);
        return;
    }
    if (schema.type === 'integer') {
        if (typeof value !== 'number' || !Number.isInteger(value)) {
            throw new Error(`${path} must be an integer`);
        }
        if (schema.minimum !== undefined && value < schema.minimum) {
            throw new Error(`${path} must be at least ${schema.minimum}`);
        }
        if (schema.maximum !== undefined && value > schema.maximum) {
            throw new Error(`${path} must be at most ${schema.maximum}`);
        }
        validateEnum(value, schema, path);
        return;
    }
    if (schema.type === 'number') {
        if (typeof value !== 'number' || Number.isNaN(value)) {
            throw new Error(`${path} must be a number`);
        }
        if (schema.minimum !== undefined && value < schema.minimum) {
            throw new Error(`${path} must be at least ${schema.minimum}`);
        }
        if (schema.maximum !== undefined && value > schema.maximum) {
            throw new Error(`${path} must be at most ${schema.maximum}`);
        }
        validateEnum(value, schema, path);
        return;
    }
    if (schema.type === 'boolean') {
        if (typeof value !== 'boolean') {
            throw new Error(`${path} must be a boolean`);
        }
        validateEnum(value, schema, path);
        return;
    }
    if (schema.type === 'array') {
        if (!Array.isArray(value)) {
            throw new Error(`${path} must be an array`);
        }
        if (schema.items) {
            value.forEach((item, index) => {
                validateValueAgainstSchema(item, schema.items, `${path}[${index}]`);
            });
        }
        return;
    }
    if (schemaImpliesObject(schema)) {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            throw new Error(`${path} must be an object`);
        }
        const objectValue = value;
        const properties = schema.properties || {};
        const required = schema.required || [];
        for (const field of required) {
            if (!(field in objectValue) || objectValue[field] === undefined) {
                throw new Error(`${path}.${field} is required`);
            }
        }
        if (schema.additionalProperties === false) {
            for (const key of Object.keys(objectValue)) {
                if (!(key in properties)) {
                    throw new Error(`${path}.${key} is not allowed`);
                }
            }
        }
        for (const [key, propertySchema] of Object.entries(properties)) {
            if (objectValue[key] === undefined) {
                continue;
            }
            validateValueAgainstSchema(objectValue[key], propertySchema, `${path}.${key}`);
        }
        return;
    }
    validateEnum(value, schema, path);
}
//# sourceMappingURL=schema-validator.js.map
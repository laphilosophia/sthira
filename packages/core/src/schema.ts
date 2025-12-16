import type { ZodError, ZodType } from 'zod'
import type { ValidationResult } from './types'

/**
 * Schema validator using Zod
 */
export class SchemaValidator<TState> {
  constructor(private schema?: ZodType<TState>) {}

  /**
   * Validate data against schema
   */
  validate(data: unknown): TState {
    if (!this.schema) {
      return data as TState
    }
    return this.schema.parse(data)
  }

  /**
   * Safe validation that returns result object
   */
  safeParse(data: unknown): ValidationResult<TState> {
    if (!this.schema) {
      return { success: true, data: data as TState }
    }
    const result = this.schema.safeParse(data)

    if (result.success) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error }
  }

  /**
   * Validate partial data (for updates)
   */
  validatePartial(data: unknown): Partial<TState> {
    if (!this.schema) {
      return data as Partial<TState>
    }
    // If schema is an object, use partial()
    if ('partial' in this.schema && typeof this.schema.partial === 'function') {
      const partialSchema = (this.schema as { partial: () => ZodType<Partial<TState>> }).partial()
      return partialSchema.parse(data)
    }

    // Otherwise, just validate as-is
    return data as Partial<TState>
  }

  /**
   * Safe partial validation
   */
  safeParsePartial(data: unknown): ValidationResult<Partial<TState>> {
    try {
      const validated = this.validatePartial(data)
      return { success: true, data: validated }
    } catch (error) {
      return { success: false, error: error as ZodError }
    }
  }

  /**
   * Get the underlying schema
   */
  getSchema(): ZodType<TState> | undefined {
    return this.schema
  }
}

/**
 * Create a schema validator
 */
export function createSchemaValidator<TState>(schema: ZodType<TState>): SchemaValidator<TState> {
  return new SchemaValidator(schema)
}

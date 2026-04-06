import { Injectable, Logger, BadRequestException } from '@nestjs/common';

// Condition operators
export type Operator = 
  | '==' 
  | '!=' 
  | '>' 
  | '<' 
  | '>=' 
  | '<=' 
  | 'contains' 
  | 'in' 
  | 'startsWith' 
  | 'endsWith' 
  | 'regex';

// Simple condition
export interface SimpleCondition {
  field: string;
  operator: Operator;
  value: any;
}

// Compound conditions
export interface AndCondition {
  all: (SimpleCondition | AndCondition | OrCondition | NotCondition)[];
}

export interface OrCondition {
  any: (SimpleCondition | AndCondition | OrCondition | NotCondition)[];
}

export interface NotCondition {
  not: SimpleCondition | AndCondition | OrCondition | NotCondition;
}

export type Condition = SimpleCondition | AndCondition | OrCondition | NotCondition;

// Evaluation result with details
export interface EvaluationResult {
  result: boolean;
  details: {
    condition: Condition;
    matched: boolean;
    message: string;
    subResults?: EvaluationResult[];
  };
}

@Injectable()
export class RuleEngineService {
  private readonly logger = new Logger(RuleEngineService.name);

  /**
   * Validate condition structure
   */
  validateConditionStructure(condition: any): void {
    if (!condition || typeof condition !== 'object') {
      throw new BadRequestException('Condition must be an object');
    }

    // Check for compound conditions
    if ('all' in condition) {
      if (!Array.isArray(condition.all)) {
        throw new BadRequestException('Condition "all" must be an array');
      }
      condition.all.forEach((c: any, i: number) => {
        try {
          this.validateConditionStructure(c);
        } catch (error) {
          throw new BadRequestException(`Invalid condition at index ${i} in "all": ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      });
      return;
    }

    if ('any' in condition) {
      if (!Array.isArray(condition.any)) {
        throw new BadRequestException('Condition "any" must be an array');
      }
      condition.any.forEach((c: any, i: number) => {
        try {
          this.validateConditionStructure(c);
        } catch (error) {
          throw new BadRequestException(`Invalid condition at index ${i} in "any": ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      });
      return;
    }

    if ('not' in condition) {
      this.validateConditionStructure(condition.not);
      return;
    }

    // Simple condition validation
    if (!('field' in condition)) {
      throw new BadRequestException('Simple condition must have "field" property');
    }
    if (!('operator' in condition)) {
      throw new BadRequestException('Simple condition must have "operator" property');
    }
    if (!('value' in condition)) {
      throw new BadRequestException('Simple condition must have "value" property');
    }

    const validOperators: Operator[] = [
      '==', '!=', '>', '<', '>=', '<=', 
      'contains', 'in', 'startsWith', 'endsWith', 'regex'
    ];

    if (!validOperators.includes(condition.operator)) {
      throw new BadRequestException(`Invalid operator: ${condition.operator}. Valid operators: ${validOperators.join(', ')}`);
    }
  }

  /**
   * Evaluate conditions against a payload
   * @param conditions - The condition structure
   * @param payload - The data to evaluate against
   * @param detailed - Whether to return detailed results
   * @returns boolean or EvaluationResult
   */
  async evaluateConditions(
    conditions: Condition,
    payload: Record<string, any>,
    detailed: boolean = false,
  ): Promise<boolean | EvaluationResult> {
    try {
      const result = this.evaluateConditionInternal(conditions, payload, detailed);
      return detailed ? result : result.result;
    } catch (error) {
      this.logger.error(
        `Error evaluating conditions: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
      throw error;
    }
  }

  /**
   * Internal evaluation method
   */
  private evaluateConditionInternal(
    condition: Condition,
    payload: Record<string, any>,
    detailed: boolean,
  ): EvaluationResult {
    // AND condition
    if ('all' in condition) {
      const subResults = (condition as AndCondition).all.map(c =>
        this.evaluateConditionInternal(c, payload, detailed),
      );

      const allMatch = subResults.every(r => r.result);

      return {
        result: allMatch,
        details: {
          condition,
          matched: allMatch,
          message: allMatch ? 'All conditions matched' : 'Not all conditions matched',
          ...(detailed && { subResults }),
        },
      };
    }

    // OR condition
    if ('any' in condition) {
      const subResults = (condition as OrCondition).any.map(c =>
        this.evaluateConditionInternal(c, payload, detailed),
      );

      const anyMatch = subResults.some(r => r.result);

      return {
        result: anyMatch,
        details: {
          condition,
          matched: anyMatch,
          message: anyMatch ? 'At least one condition matched' : 'No conditions matched',
          ...(detailed && { subResults }),
        },
      };
    }

    // NOT condition
    if ('not' in condition) {
      const subResult = this.evaluateConditionInternal(
        (condition as NotCondition).not,
        payload,
        detailed,
      );

      return {
        result: !subResult.result,
        details: {
          condition,
          matched: !subResult.result,
          message: !subResult.result ? 'Negation condition matched' : 'Negation condition did not match',
          ...(detailed && { subResults: [subResult] }),
        },
      };
    }

    // Simple condition
    return this.evaluateSimpleCondition(condition as SimpleCondition, payload);
  }

  /**
   * Evaluate a simple condition
   */
  private evaluateSimpleCondition(
    condition: SimpleCondition,
    payload: Record<string, any>,
  ): EvaluationResult {
    const fieldValue = this.getFieldValue(payload, condition.field);
    const { operator, value } = condition;

    let result: boolean;

    switch (operator) {
      case '==':
        result = this.looseEquals(fieldValue, value);
        break;
      case '!=':
        result = !this.looseEquals(fieldValue, value);
        break;
      case '>':
        result = this.compare(fieldValue, value) > 0;
        break;
      case '<':
        result = this.compare(fieldValue, value) < 0;
        break;
      case '>=':
        result = this.compare(fieldValue, value) >= 0;
        break;
      case '<=':
        result = this.compare(fieldValue, value) <= 0;
        break;
      case 'contains':
        result = this.contains(fieldValue, value);
        break;
      case 'in':
        result = this.inArray(fieldValue, value);
        break;
      case 'startsWith':
        result = String(fieldValue).startsWith(String(value));
        break;
      case 'endsWith':
        result = String(fieldValue).endsWith(String(value));
        break;
      case 'regex':
        result = new RegExp(value).test(String(fieldValue));
        break;
      default:
        throw new BadRequestException(`Unknown operator: ${operator}`);
    }

    return {
      result,
      details: {
        condition,
        matched: result,
        message: result 
          ? `${condition.field} ${operator} ${JSON.stringify(value)} is TRUE (value: ${JSON.stringify(fieldValue)})`
          : `${condition.field} ${operator} ${JSON.stringify(value)} is FALSE (value: ${JSON.stringify(fieldValue)})`,
      },
    };
  }

  /**
   * Get field value from payload using dot notation
   */
  private getFieldValue(payload: Record<string, any>, field: string): any {
    const parts = field.split('.');
    let value = payload;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }

  /**
   * Loose equality check
   */
  private looseEquals(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;

    // Type coercion for common cases
    if (typeof a === 'number' || typeof b === 'number') {
      return Number(a) === Number(b);
    }

    return String(a) === String(b);
  }

  /**
   * Compare two values
   */
  private compare(a: any, b: any): number {
    const numA = Number(a);
    const numB = Number(b);

    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }

    return String(a).localeCompare(String(b));
  }

  /**
   * Check if fieldValue contains value
   */
  private contains(fieldValue: any, value: any): boolean {
    if (Array.isArray(fieldValue)) {
      return fieldValue.some(item => this.looseEquals(item, value));
    }
    if (typeof fieldValue === 'string') {
      return fieldValue.includes(String(value));
    }
    if (typeof fieldValue === 'object' && fieldValue !== null) {
      return Object.values(fieldValue).some(v => this.looseEquals(v, value));
    }
    return false;
  }

  /**
   * Check if fieldValue is in array
   */
  private inArray(fieldValue: any, value: any): boolean {
    if (!Array.isArray(value)) {
      return this.looseEquals(fieldValue, value);
    }
    return value.some(item => this.looseEquals(fieldValue, item));
  }

  /**
   * Generate human-readable description of conditions
   */
  generateConditionDescription(condition: Condition): string {
    if ('all' in condition) {
      const subs = (condition as AndCondition).all.map(c => this.generateConditionDescription(c));
      return `(${subs.join(' AND ')})`;
    }

    if ('any' in condition) {
      const subs = (condition as OrCondition).any.map(c => this.generateConditionDescription(c));
      return `(${subs.join(' OR ')})`;
    }

    if ('not' in condition) {
      const sub = this.generateConditionDescription((condition as NotCondition).not);
      return `NOT (${sub})`;
    }

    const simple = condition as SimpleCondition;
    return `${simple.field} ${simple.operator} ${JSON.stringify(simple.value)}`;
  }

  /**
   * Get detailed evaluation info
   */
  async getEvaluationDetails(
    conditions: Condition,
    payload: Record<string, any>,
  ): Promise<{ matched: string[]; failed: string[] }> {
    const result = await this.evaluateConditions(conditions, payload, true) as EvaluationResult;
    
    const matched: string[] = [];
    const failed: string[] = [];

    this.extractDetails(result, matched, failed);

    return { matched, failed };
  }

  private extractDetails(
    result: EvaluationResult,
    matched: string[],
    failed: string[],
  ): void {
    const message = result.details.message;

    if (result.details.subResults) {
      result.details.subResults.forEach(sub => this.extractDetails(sub, matched, failed));
    } else {
      // Simple condition
      if (result.result) {
        matched.push(message);
      } else {
        failed.push(message);
      }
    }
  }
}

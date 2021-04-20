/**
 * Base class for route and body parameters and
 */
abstract class RequestParameter {
  name: string;
  required: boolean;
  additionalTests: Array<RequestParameterTestFunction>;
  description: string;

  /**
   * runs test functions in the additional tests Array and returns an array of errors, or an empty arrays if no errors.
   * @param value - parameter value
   */
  runTests(value: any): Array<string> {
    const errors: Array<string> = [];
    this.additionalTests.forEach((paramTest, index) => {
      let result = paramTest.test(value);
      if (!result) {
        errors.push(`Parameter '${this.name}' did not pass test '${paramTest.description ? paramTest.description : index}'`)
      }
    });
    return errors;
  }
}

/**
 * Defines a parameter expected to be present in the request's body
 */
export class BodyParameter extends RequestParameter {
  type: ParameterType;

  /**
   * Constructs a BodyParameter instance
   * @constructor
   * @param name - property name
   * @param type - the expected type of the parameter. if defined, will throw an error if the parameter's type doesn't match
   * @param required - if true, will throw an error when the property is missing
   * @param description - text that will be displayed in the rendered help output
   * @param additionalTests - an array of additional test functions and their description
   */
  constructor(name: string,
              type: ParameterType = 'any',
              description: string = '',
              required: boolean = true,
              additionalTests: Array<RequestParameterTestFunction> = []) {
    super();
    this.name = name;
    this.type = type;
    this.required = required;
    this.description = description;
    this.additionalTests = additionalTests;
  }
}

/**
 * Defines a parameter expected to be present in the request's route
 */
export class RouteParameter extends RequestParameter {
  /**
   * Constructs a BodyParameter instance
   * @constructor
   * @param name - property name
   * @param required - if true, will throw an error when the property is missing
   * @param description - text that will be displayed in the rendered help output
   * @param additionalTests - an array of additional test functions and their description
   */
  constructor(name: string,
              description: string = '',
              required: boolean = true,
              additionalTests: Array<RequestParameterTestFunction> = []) {
    super();
    this.name = name;
    this.required = required;
    this.description = description;
    this.additionalTests = additionalTests;
  }
}

/**
 * An object containing:
 * test: a test function that receives the parameter value as an argument and returns a boolean
 * description: an optional description of the test that will be displayed in the error output in case the function returns false
 */
export interface RequestParameterTestFunction {
  /**
   * a test function that receives the parameter value as an argument and returns a boolean
   * @param value - parameter value passed by the test routine
   */
  test(value: any): boolean;
  /**
   * test description - will appear in error messages and dcumentation
   */
  description: string;
}

/**
 * Optional types for a body parameter
 */
export type ParameterType =
  'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'parsableDateString'
  | 'null'
  | 'any';

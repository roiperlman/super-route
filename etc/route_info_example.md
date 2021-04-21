## Create or upsert user
###### POST users/new/:upsert
Creates or updates an existing user
___
Creates a new user. if the user exists and upsert is set to true, will update the user. if set to false and user exists, will return an error

### Route Details:

* Authenticated: ✅

* Has Access Control: ✅

* Response content type: application/json

* Response Format: `{
  createdUser: User
  }
  `

* Redirect on error:

### Access Control:
___
|  Equal or Greater than | Specific permissions | Merge rule  |
|  --- | --- | ---  |
| admin  |  awesomePerson  |  and |
### Route Parameters:
___
|  Name | Description | Required | AdditionalTests  |
|  --- | --- | --- | ---  |
| upsert  |  set upsert true or false to update user if it exists  |  `true`  |  <li> Value must be either "true" or "false" |
### Body Parameters:
___
|  Name | Description | Type | Required | AdditionalTests  |
|  --- | --- | --- | --- | ---  |
| firstName  |  user first name  |  `string`  |  `true`  |   |
| lastName  |  user last name  |  `string`  |  `true`  |   |
| isAdmin  |  is the user an admin  |  `boolean`  |  `true`  |   |
| mobilePhone  |  user mobile phone  |  `string`  |  `true`  |  <li> checks if mobile phone has 10 digits |
| age  |  user age  |  `number`  |  `false`  |  <li> age must be greater or equal to 18<br><li> age must be smaller or equal to 25 |




---
## Source

___


```typescript
new AuthenticatedRoute({
  path: 'users/new/:upsert',
  verb: 'post',
  name: 'Create or upsert user',
  description: 'Creates or updates an existing user',
  comments: 'Creates a new user. if the user exists and upsert is set to true, will update the user. if set to false and user exists, will return an error',
  responseFormat: `{
      createdUser: User
    }
    `,
  responseContentType: 'application/json',
  permissions: {
    equalOrGreaterThan: 'admin',
    specific: ['awesomePerson'],
    merge: 'and'
  },
  authenticate: true,
  showHelp: true,
  bodyParams: [
    new BodyParameter('firstName', 'string', 'user first name', true),
    new BodyParameter('lastName', 'string', 'user last name', true),
    new BodyParameter('isAdmin', 'boolean', 'is the user an admin', true),
    new BodyParameter('mobilePhone',
            'string',
            'user mobile phone',
            true,
            [
              {
                test: (value: string) => {
                  return value.length === 10
                },
                description: 'checks if mobile phone has 10 digits'
              }
            ]
    ),
    new BodyParameter(
            'age',
            'number',
            'user age',
            false,
            [
              {
                test: (value: number) => {
                  return value >= 18
                },
                description: 'age must be greater or equal to 18'
              },
              {
                test: (value: number) => {
                  return value <= 25
                },
                description: 'age must be smaller or equal to 25'
              }
            ]
    ),
  ],
  routeParams: [
    new RouteParameter('upsert', 'set upsert true or false to update user if it exists', true, [
      {
        test: (value) => value === 'true' || value === false,
        description: 'Value must be either "true" or "false"'
      }
    ])
  ],
  middleware: [
    (req: Request, res: Response, next: NextFunction) => {
      // TODO implement logic
      res.status(200).send(req.body)
    }
  ]
}),
```

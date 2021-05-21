## test route
    
###### GET test



___



### Route Details:

* Authenticated: ❌

* Has Access Control: ❌

* Response content type: 

* Response Format: ''

* Redirect on error: 

###Access Control:

___

None

### Route Parameters:

___

None

### Body Parameters:

___

None





___



## required route param
    
###### GET required/:route/*



___



### Route Details:

* Authenticated: ❌

* Has Access Control: ❌

* Response content type: 

* Response Format: ''

* Redirect on error: 

###Access Control:

___

None

### Route Parameters:

___

|  Name | Description | Required | AdditionalTests  |
|  --- | --- | --- | ---  |
| route  |  ---  |  `true`  |  <li> user role is admin or super |
| param  |  ---  |  `true`  |  <li> checks if age is above 10 |

### Body Parameters:

___

None





___



## authenticated route
    
###### GET limited



___



### Route Details:

* Authenticated: ✅

* Has Access Control: ❌

* Response content type: 

* Response Format: ''

* Redirect on error: 

###Access Control:

___

None

### Route Parameters:

___

None

### Body Parameters:

___

None





___



## new user
    
###### POST users/new

creates a new user

___



### Route Details:

* Authenticated: ✅

* Has Access Control: ❌

* Response content type: 

* Response Format: ''

* Redirect on error: 

###Access Control:

___

None

### Route Parameters:

___

None

### Body Parameters:

___

|  Name | Description | Type | Required | AdditionalTests  |
|  --- | --- | --- | --- | ---  |
| firstName  |  user first name  |  `string`  |  `true`  |   |
| lastName  |  user last name  |  `string`  |  `true`  |   |
| isAdmin  |  is the user an admin  |  `boolean`  |  `true`  |   |
| mobilePhone  |  user mobile phone  |  `string`  |  `true`  |  <li> checks if mobile phone has 10 digits |
| age  |  user age  |  `number`  |  `false`  |  <li> checks if age is above 18<br><li> checks if age is below 25 |





___



## get some
    
###### POST users/getSome/:role/:age?

get some users

___



### Route Details:

* Authenticated: ✅

* Has Access Control: ❌

* Response content type: 

* Response Format: ''

* Redirect on error: 

###Access Control:

___

None

### Route Parameters:

___

|  Name | Description | Required | AdditionalTests  |
|  --- | --- | --- | ---  |
| role  |  user role  |  `true`  |  <li> user role is admin or super |
| age  |  user age  |  `false`  |  <li> checks if age is above 10 |

### Body Parameters:

___

None





___



## get some 2
    
###### POST users/getSome2/:role/:age?

get some users

___



### Route Details:

* Authenticated: ✅

* Has Access Control: ❌

* Response content type: 

* Response Format: ''

* Redirect on error: 

###Access Control:

___

None

### Route Parameters:

___

|  Name | Description | Required | AdditionalTests  |
|  --- | --- | --- | ---  |
| role  |  user role  |  `true`  |  <li> undefined |
| age  |  user age  |  `false`  |  <li> undefined |

### Body Parameters:

___

None





___



## get some 3
    
###### POST users/getSome3/:miss/:age?

get some users

___



### Route Details:

* Authenticated: ✅

* Has Access Control: ❌

* Response content type: 

* Response Format: ''

* Redirect on error: 

###Access Control:

___

None

### Route Parameters:

___

|  Name | Description | Required | AdditionalTests  |
|  --- | --- | --- | ---  |
| role  |  user role  |  `true`  |  <li> undefined |
| age  |  user age  |  `false`  |  <li> undefined |

### Body Parameters:

___

None





___



## get some 4
    
###### POST users/getSome4/:role/:age?

get some users

___



### Route Details:

* Authenticated: ✅

* Has Access Control: ❌

* Response content type: 

* Response Format: ''

* Redirect on error: 

###Access Control:

___

None

### Route Parameters:

___

|  Name | Description | Required | AdditionalTests  |
|  --- | --- | --- | ---  |
| role  |  user role  |  `true`  |   |
| age  |  user age  |  `false`  |   |

### Body Parameters:

___

None





___



## handle with static
    
###### POST handleWithStatic

handles error with the static method

___



### Route Details:

* Authenticated: ✅

* Has Access Control: ❌

* Response content type: 

* Response Format: ''

* Redirect on error: 

###Access Control:

___

None

### Route Parameters:

___

None

### Body Parameters:

___

|  Name | Description | Type | Required | AdditionalTests  |
|  --- | --- | --- | --- | ---  |
| throwError  |  will throw error if true  |  `boolean`  |  `true`  |   |





___



## handle with static redirect
    
###### POST handleWithStaticRedirect

handles error with the static method and redirect

___



### Route Details:

* Authenticated: ✅

* Has Access Control: ❌

* Response content type: 

* Response Format: ''

* Redirect on error: `/login`

###Access Control:

___

None

### Route Parameters:

___

None

### Body Parameters:

___

|  Name | Description | Type | Required | AdditionalTests  |
|  --- | --- | --- | --- | ---  |
| throwError  |  will throw error if true  |  `boolean`  |  `true`  |   |





___



## handle with route error
    
###### POST handleWithRouteError

handles error with a route error object

___



### Route Details:

* Authenticated: ✅

* Has Access Control: ❌

* Response content type: 

* Response Format: ''

* Redirect on error: 

###Access Control:

___

None

### Route Parameters:

___

None

### Body Parameters:

___

|  Name | Description | Type | Required | AdditionalTests  |
|  --- | --- | --- | --- | ---  |
| throwError  |  will throw error if true  |  `boolean`  |  `true`  |   |





___



## handle with this.handle
    
###### POST handleWithThisHandle

handles error with this.handle

___



### Route Details:

* Authenticated: ✅

* Has Access Control: ❌

* Response content type: 

* Response Format: ''

* Redirect on error: 

###Access Control:

___

None

### Route Parameters:

___

None

### Body Parameters:

___

|  Name | Description | Type | Required | AdditionalTests  |
|  --- | --- | --- | --- | ---  |
| throwError  |  will throw error if true  |  `boolean`  |  `true`  |   |





___



## handle with this.handle default
    
###### POST handleWithThisHandleDefault

handles error with this.handle

___



### Route Details:

* Authenticated: ✅

* Has Access Control: ❌

* Response content type: 

* Response Format: ''

* Redirect on error: 

###Access Control:

___

None

### Route Parameters:

___

None

### Body Parameters:

___

|  Name | Description | Type | Required | AdditionalTests  |
|  --- | --- | --- | --- | ---  |
| throwError  |  will throw error if true  |  `boolean`  |  `true`  |   |





___



## versioned route 1
    
###### POST versioned1



___



### Route Details:

* Authenticated: ❌

* Has Access Control: ❌

* Response content type: 

* Response Format: ''

* Redirect on error: 

###Access Control:

___

None

### Route Parameters:

___

None

### Body Parameters:

___

|  Name | Description | Type | Required | AdditionalTests  |
|  --- | --- | --- | --- | ---  |
| sum  |    |  `number`  |  `true`  |   |





___



## admin only
    
###### GET adminOnly



___



### Route Details:

* Authenticated: ✅

* Has Access Control: ✅

* Response content type: 

* Response Format: 

* Redirect on error: 

###Access Control:

___

|  Equal or Greater than | Specific permissions | Merge rule  |
|  --- | --- | ---  |
|   |  admin  |   |

### Route Parameters:

___

None

### Body Parameters:

___

None





___



## admin or gt
    
###### GET adminOrGt



___



### Route Details:

* Authenticated: ✅

* Has Access Control: ✅

* Response content type: 

* Response Format: 

* Redirect on error: 

###Access Control:

___

|  Equal or Greater than | Specific permissions | Merge rule  |
|  --- | --- | ---  |
| admin  |    |   |

### Route Parameters:

___

None

### Body Parameters:

___

None





___



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

###Access Control:

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





___



## specificErrorHandler
    
###### GET specificErrorHandler



___



### Route Details:

* Authenticated: ❌

* Has Access Control: ❌

* Response content type: 

* Response Format: ''

* Redirect on error: 

###Access Control:

___

None

### Route Parameters:

___

None

### Body Parameters:

___

None





___



## d_error
    
###### POST d_error/:status?



___



### Route Details:

* Authenticated: ❌

* Has Access Control: ❌

* Response content type: 

* Response Format: ''

* Redirect on error: 

###Access Control:

___

None

### Route Parameters:

___

None

### Body Parameters:

___

None





___



## help test
    
###### GET helpTest



___



### Route Details:

* Authenticated: ❌

* Has Access Control: ❌

* Response content type: 

* Response Format: ''

* Redirect on error: 

###Access Control:

___

None

### Route Parameters:

___

None

### Body Parameters:

___

None





___


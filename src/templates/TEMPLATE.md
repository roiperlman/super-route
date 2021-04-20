## new user
###### POST users/new
creates a new user
___

###**Route Details**:

* Authenticated: ✅

* Has Access Control: ❌

* Response content type:

* Response Format: ''

* Redirect on error: ''

###Access Control:
___
None
###Route Parameters:
___
None
###Body Parameters:
___
|  Name | Description | Type | Required | AdditionalTests  |
|  --- | --- | --- | --- | ---  |
| firstName  |  user first name  |  string  |   |
| lastName  |  user last name  |  string  |   |
| isAdmin  |  is the user an admin  |  boolean  |   |
| mobilePhone  |  user mobile phone  |  string  |  <li> checks if mobile phone has 10 digits |
| age  |  user age  |  number  |  <li> checks if age is above 18<br><li> checks if age is below 25 |

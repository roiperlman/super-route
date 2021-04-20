export class Templates {
  static routeInfoMarkdown =
`## <%= route.name %>>
###### <%= route.method.toUpperCase() %> <%= route.path %>
<%= route.description %>
___

###**Route Details**:

* Authenticated: <% if(route.authenticate){ %>
    ✅
<% } %>
<% if(!route.authenticate) { %>
    ❌
<% } %>

* Has Access Control: <% if(route.permissions){ %>
    ✅
<% } %>
<% if(!route.permissions){ %>
    ❌
<% } %>

* Response content type: <%= route.responseContentType %>

* Response Format: \`<%= route.responseFormat || '' %>\`

* Redirect on error: \`<%= route.redirectOnError || '' %>\`

###Access Control:
___
<%= tables.permissionsTable %>
###Route Parameters:
___
<%= tables.routeParamsTable %>
###Body Parameters:
___
<%= tables.bodyParamsTable %>

`
}

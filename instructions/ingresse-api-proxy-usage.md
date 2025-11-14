# important - environment
add to env - INGRESSE_API_PROXY_URL=https://api-proxy.backstagemirante.com


## methods

identify = api_url as INGRESSE_API_PROXY_URL

# 1 - login - POST
url: {{api_url}}/api/ingresse/auth/login
body:
```
{
    "email": "{{ingresse_email}}",
    "password": "{{ingresse_password}}"
}
```

response success, can return:
`/home/docks/Documents/projects/fastify-oauth-api/instructions/outputs/login-needs-mfa.json`
or:
`/home/docks/Documents/projects/fastify-oauth-api/instructions/outputs/login.json`

if returns

# 2 - mfa - verify - POST
url: {{api_url}}/api/ingresse/auth/mfa/verify?usertoken={{ingresse_user_token}}

body:
```
{
    "OTP": 852945
}
```

response success:
`/home/docks/Documents/projects/fastify-oauth-api/instructions/outputs/mfa-verify.json`

# 3 - user Info - GET
url: {{api_url}}/api/ingresse/users/{{ingresse_user_id}}?usertoken={{ingresse_user_token}}

response success:
`/home/docks/Documents/projects/fastify-oauth-api/instructions/outputs/userinfo.json`

# IngresseUserDocument
```
type
digits or number or something else -> needs to be encrypted
```
# IngresseUserAddress
```
street
number
complement
district
zipcode
city
state
country
```
# IngresseUserPhone
```
ddi
number
```
# IngresseUser
```
id_ingresse (login -> response.responseData.data.userId)
token (login -> response.responseData.data.token)
name (getUserInfo -> response.responseData.name)
birthdate (getUserInfo -> response.responseData.birthdate)
nationality (getUserInfo -> response.responseData.nationality)
phone (relation IngresseUserPhone) (getUserInfo -> response.responseData.phone)
address (relation IngresseUserAddress) (getUserInfo -> response.responseData.address)
document (relation IngresseUserDocument) (getUserInfo -> response.responseData.document)
user (relation Users)
```
module.exports =
{
	server:
	{
		port: 3000
	},
	auth:
	{
		signup: true,
		verification: false,
		reputation: false,
		limits: false,
	},
	session:
	{
		secret: "secret"
	},
	crypto:
	{
		salt: "salt"
	},
	database:
	{
		// "sqlite" for light development, otherwise use "postgres"
		dialect: "sqlite",
		host: "localhost",
		name: "raesonic",
		user: "user",
		password: "password",
		logging: true
	}
}

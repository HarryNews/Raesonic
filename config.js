module.exports =
{
	server:
	{
		port: 3000
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

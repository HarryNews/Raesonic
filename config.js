module.exports =
{
	server:
	{
		url: "http://localhost:3000",
		port: 3000,
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
		secret: "secret",
	},
	crypto:
	{
		salt: "salt",
	},
	smtp:
	{
		host: "hostname",
		port: 465,
		secure: true,
		auth:
		{
			user: "no-reply@hostname",
			pass: "password",
		},
	},
	database:
	{
		// "sqlite" for light development, otherwise use "postgres"
		dialect: "sqlite",
		host: "localhost",
		name: "raesonic",
		user: "user",
		password: "password",
		logging: true,
	},
}

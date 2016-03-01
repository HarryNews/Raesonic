module.exports =
{
	server:
	{
		port: 3000
	},
	database:
	{
		// "sqlite" for light development, otherwise use "mysql"
		dialect: "sqlite",
		host: "localhost",
		name: "raesonic",
		user: "user",
		password: "password"
	}
}

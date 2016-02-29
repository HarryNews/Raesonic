var Sequelize = require("sequelize");

module.exports = function(config)
{
	var db = config.database;

	var sequelize = new Sequelize(db.name, db.user, db.password,
	{
		host: db.host,
		dialect: "mysql",
		pool:
		{
			max: 5,
			min: 0,
			idle: 10000
		},
		define:
		{
			timestamps: false
		}
	});

	var models = require("./ModelController.js")(sequelize);

	var data =
	{
		connection: sequelize,
		models: models
	};

	return data;
}

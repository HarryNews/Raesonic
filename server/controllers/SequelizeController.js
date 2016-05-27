module.exports = function(config)
{
	var Sequelize = require("sequelize");

	var db = config.database;

	var sequelize = new Sequelize(db.name, db.user, db.password,
	{
		host: db.host,
		dialect: db.dialect,
		storage: db.name + ".db",
		pool:
		{
			max: 5,
			min: 0,
			idle: 10000
		},
		define:
		{
			timestamps: false
		},
		logging: db.logging
			? console.log
			: false,
	});

	require("./ModelController.js")(sequelize);

	return sequelize;
}

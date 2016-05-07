var Sequelize = require("sequelize");

module.exports = function(sequelize)
{
	// User is the account of a registered user
	var User = sequelize.define("User",
	{
		userId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
		nickname: Sequelize.STRING(30),
		password: Sequelize.STRING(50),
		email: Sequelize.STRING,
		reputation: { type: Sequelize.INTEGER, defaultValue: 0 },
	});
	
	return User;
}

var Sequelize = require("sequelize");

module.exports = function(sequelize)
{
	// User is the account of a registered user
	var User = sequelize.define("User",
	{
		userId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
		nickname: Sequelize.STRING(30),
		password: Sequelize.STRING,
		email: Sequelize.STRING,
		reputation: Sequelize.INTEGER,
	});
	
	return User;
}

var Sequelize = require("sequelize");

module.exports = function(sequelize)
{
	// User is the account of a registered user
	var User = sequelize.define("User",
	{
		userId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
		username: Sequelize.STRING(30),
		password: Sequelize.STRING(50),
		email: Sequelize.STRING,
		emailToken: Sequelize.STRING(20),
		reputation: { type: Sequelize.INTEGER, defaultValue: -1 },
		reputationToday: { type: Sequelize.INTEGER, defaultValue: 0 },
		activityToday: { type: Sequelize.INTEGER, defaultValue: 0 },
		signupDate: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
		visitDate: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
	});
	
	return User;
}

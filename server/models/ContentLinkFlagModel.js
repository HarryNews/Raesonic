var Sequelize = require("sequelize");

module.exports = function(sequelize)
{
	// ContentLinkFlag is created when a User flags ContentLink as inappropriate
	var ContentLinkFlag = sequelize.define("ContentLinkFlag",
	{
		flagId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
		reasonId: Sequelize.INTEGER(2),
		date: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
		resolved: { type: Sequelize.INTEGER(1), defaultValue: 0 },
	});

	var ContentLink = sequelize.models.ContentLink;
	ContentLink.hasMany(ContentLinkFlag, { foreignKey: "linkId", onDelete: "cascade" });
	ContentLinkFlag.belongsTo(ContentLink, { foreignKey: "linkId" });
	
	var User = sequelize.models.User;
	User.hasMany(ContentLinkFlag, { foreignKey: "userId" });
	ContentLinkFlag.belongsTo(User, { foreignKey: "userId" });
	
	return ContentLinkFlag;
}

var Sequelize = require("sequelize");

module.exports = function(sequelize)
{
	// RelationFlag is created when a User flags Relation as inappropriate
	var RelationFlag = sequelize.define("RelationFlag",
	{
		flagId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
		reasonId: Sequelize.INTEGER(2),
		date: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
		resolved: { type: Sequelize.INTEGER(1), defaultValue: 0 },
	});

	var Relation = sequelize.models.Relation;
	Relation.hasMany(RelationFlag, { foreignKey: "relationId", onDelete: "cascade" });
	RelationFlag.belongsTo(Relation, { foreignKey: "relationId" });
	
	var User = sequelize.models.User;

	User.hasMany(RelationFlag, { foreignKey: "userId", as: "User" });
	RelationFlag.belongsTo(User, { foreignKey: "userId", as: "User" });
	
	User.hasMany(RelationFlag, { foreignKey: "reviewerId", as: "Reviewer" });
	RelationFlag.belongsTo(User, { foreignKey: "reviewerId", as: "Reviewer" });
	
	return RelationFlag;
}

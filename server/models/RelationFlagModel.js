var Sequelize = require("sequelize");

module.exports = function(sequelize)
{
	// RelationFlag is created when a User flags Relation as inappropriate
	var RelationFlag = sequelize.define("RelationFlag",
	{
		flagId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
		date: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
	});

	var Relation = sequelize.models.Relation;
	Relation.hasMany(RelationFlag, { foreignKey: "relationId" });
	RelationFlag.belongsTo(Relation, { foreignKey: "relationId" });
	
	var User = sequelize.models.User;
	User.hasMany(RelationFlag, { foreignKey: "userId" });
	RelationFlag.belongsTo(User, { foreignKey: "userId" });
	
	return RelationFlag;
}

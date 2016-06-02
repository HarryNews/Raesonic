var Sequelize = require("sequelize");

module.exports = function(sequelize)
{
	// RelationVote stores User vote on a Relation
	var RelationVote = sequelize.define("RelationVote",
	{
		voteId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
		value: Sequelize.INTEGER(1),
		date: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
	});

	var Relation = sequelize.models.Relation;
	Relation.hasMany(RelationVote, { foreignKey: "relationId", onDelete: "cascade" });
	RelationVote.belongsTo(Relation, { foreignKey: "relationId" });
	
	var User = sequelize.models.User;
	User.hasMany(RelationVote, { foreignKey: "userId" });
	RelationVote.belongsTo(User, { foreignKey: "userId" });
	
	return RelationVote;
}

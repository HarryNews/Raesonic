var Sequelize = require("sequelize");

module.exports = function(sequelize)
{
	// RelationVote stores User vote on a Relation
	var RelationVote = sequelize.define("RelationVote",
	{
		voteId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
		userId: Sequelize.INTEGER,
		value: Sequelize.INTEGER(1),
		date: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
	});

	var Relation = sequelize.models.Relation;
	Relation.hasMany(RelationVote, { foreignKey: "relationId" });
	RelationVote.belongsTo(Relation, { foreignKey: "relationId" });
	
	return RelationVote;
}

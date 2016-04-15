var Sequelize = require("sequelize");

module.exports = function(sequelize)
{
	// Relation is a connection between two similar Tracks
	var Relation = sequelize.define("Relation",
	{
		relationId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
		trust: { type: Sequelize.INTEGER, defaultValue: 1 },
		doubt: { type: Sequelize.INTEGER, defaultValue: 0 }
	});

	var Track = sequelize.models.Track;

	Track.hasMany(Relation, { foreignKey: "trackId" });
	Relation.belongsTo(Track, { foreignKey: "trackId", as: "Track" });

	Track.hasMany(Relation, { foreignKey: "linkedId"});
	Relation.belongsTo(Track, { foreignKey: "linkedId", as: "Linked" });
	
	return Relation;
}

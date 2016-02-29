var Sequelize = require("sequelize");

module.exports = function(sequelize)
{
	// TrackEdit is created when Track information is changed
	var TrackEdit = sequelize.define("TrackEdit",
	{
		editId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
		artist: Sequelize.STRING(50),
		title: Sequelize.STRING(50),
		userId: Sequelize.INTEGER,
		date: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
	});
	
	var Track = sequelize.models.Track;
	Track.hasMany(TrackEdit, { foreignKey: "trackId" });
	TrackEdit.belongsTo(Track, { foreignKey: "trackId" });
	
	return TrackEdit;
}

var Sequelize = require("sequelize");

module.exports = function(sequelize)
{
	// TrackEdit is created when Track information is changed
	var TrackEdit = sequelize.define("TrackEdit",
	{
		editId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
		artist: Sequelize.STRING(50),
		title: Sequelize.STRING(50),
		date: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
	});
	
	var Track = sequelize.models.Track;
	Track.hasMany(TrackEdit, { foreignKey: "trackId" });
	TrackEdit.belongsTo(Track, { foreignKey: "trackId" });
	
	var User = sequelize.models.User;
	User.hasMany(TrackEdit, { foreignKey: "userId" });
	TrackEdit.belongsTo(User, { foreignKey: "userId" });
	
	return TrackEdit;
}

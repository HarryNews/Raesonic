var Sequelize = require("sequelize");

module.exports = function(sequelize)
{
	// Content is an audio or video content, linked to a Track
	var Content = sequelize.define("Content",
	{
		contentId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
		sourceId: Sequelize.INTEGER(1),
		externalId: Sequelize.STRING(20),
	});
	
	var Track = sequelize.models.Track;
	Track.hasMany(Content, { foreignKey: "trackId" });
	Content.belongsTo(Track, { foreignKey: "trackId" });
	
	return Content;
}

var Sequelize = require("sequelize");

module.exports = function(sequelize)
{
	// ContentLink is created when a Content is linked to a Track
	var ContentLink = sequelize.define("ContentLink",
	{
		linkId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
		date: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
	});

	var Track = sequelize.models.Track;
	Track.hasMany(ContentLink, { foreignKey: "trackId", onDelete: "cascade" });
	ContentLink.belongsTo(Track, { foreignKey: "trackId" });
	
	var Content = sequelize.models.Content;
	Content.hasMany(ContentLink, { foreignKey: "contentId", onDelete: "cascade" });
	ContentLink.belongsTo(Content, { foreignKey: "contentId" });
	
	var User = sequelize.models.User;
	User.hasMany(ContentLink, { foreignKey: "userId" });
	ContentLink.belongsTo(User, { foreignKey: "userId" });
	
	return ContentLink;
}

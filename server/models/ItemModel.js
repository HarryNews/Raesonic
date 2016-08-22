var Sequelize = require("sequelize");

module.exports = function(sequelize)
{
	// Item is a reference to Content
	var Item = sequelize.define("Item",
	{
		itemId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
		position: { type: Sequelize.INTEGER },
	});
	
	var Content = sequelize.models.Content;
	Content.hasMany(Item, { foreignKey: "contentId" });
	Item.belongsTo(Content, { foreignKey: "contentId" });

	var Playlist = sequelize.models.Playlist;
	Playlist.hasMany(Item, { foreignKey: "playlistId", onDelete: "cascade" });
	Item.belongsTo(Playlist, { foreignKey: "playlistId" });
	
	return Item;
}

var Sequelize = require("sequelize");

module.exports = function(sequelize)
{
	// FavoritePlaylist is a connection between User and a Playlist
	var FavoritePlaylist = sequelize.define("FavoritePlaylist",
	{
		favoriteId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
	});
	
	var Playlist = sequelize.models.Playlist;
	Playlist.hasMany(FavoritePlaylist, { foreignKey: "playlistId" });
	FavoritePlaylist.belongsTo(Playlist, { foreignKey: "playlistId" });
	
	var User = sequelize.models.User;
	User.hasMany(FavoritePlaylist, { foreignKey: "userId" });
	FavoritePlaylist.belongsTo(User, { foreignKey: "userId" });
	
	return FavoritePlaylist;
}

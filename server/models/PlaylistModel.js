var Sequelize = require("sequelize");

module.exports = function(sequelize)
{
	// Playlist is a collection of Items, owned by a User
	var Playlist = sequelize.define("Playlist",
	{
		playlistId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
		userId: Sequelize.INTEGER,
		name: Sequelize.STRING(50),
		access: { type: Sequelize.INTEGER(1), defaultValue: 1 }
	});
	
	return Playlist;
}
